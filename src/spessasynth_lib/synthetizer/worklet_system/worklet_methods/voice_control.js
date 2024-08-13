import { generatorTypes } from '../../../soundfont/read_sf2/generators.js'
import { absCentsToHz, decibelAttenuationToGain, timecentsToSeconds } from '../worklet_utilities/unit_converter.js'
import { getLFOValue } from '../worklet_utilities/lfo.js'
import { customControllers } from '../worklet_utilities/worklet_processor_channel.js'
import { getModEnvValue } from '../worklet_utilities/modulation_envelope.js'
import { getOscillatorData } from '../worklet_utilities/wavetable_oscillator.js'
import { panVoice } from '../worklet_utilities/stereo_panner.js'
import { applyVolumeEnvelope, recalculateVolumeEnvelope } from '../worklet_utilities/volume_envelope.js'
import { applyLowpassFilter } from '../worklet_utilities/lowpass_filter.js'
import { MIN_NOTE_LENGTH } from '../main_processor.js'


const HALF_PI = Math.PI / 2;
export const PAN_SMOOTHING_FACTOR = 0.01;
/**
 * Renders a voice to the stereo output buffer
 * @param channel {WorkletProcessorChannel} the voice's channel
 * @param voice {WorkletVoice} the voice to render
 * @param outputLeft {Float32Array} the left output buffer
 * @param outputRight {Float32Array} the right output buffer
 * @param reverbOutput {Float32Array[]} output for reverb
 * @param chorusOutput {Float32Array[]} output for chorus
 * @this {SpessaSynthProcessor}
 */
export function renderVoice(
    channel,
    voice,
    outputLeft, outputRight,
    reverbOutput,
    chorusOutput
)
{
    // check if release
    if(!voice.isInRelease)
    {
        // if not in release, check if the release time is
        if (currentTime >= voice.releaseStartTime)
        {
            voice.releaseStartModEnv = voice.currentModEnvValue;
            voice.isInRelease = true;
            recalculateVolumeEnvelope(voice);
            voice.volumeEnvelope.currentReleaseGain = decibelAttenuationToGain(voice.volumeEnvelope.currentAttenuationDb);
        }
    }


    // if the initial attenuation is more than 100dB, skip the voice (it's silent anyways)
    if(voice.modulatedGenerators[generatorTypes.initialAttenuation] > 2500)
    {
        if(voice.isInRelease)
        {
            voice.finished = true;
        }
        return;
    }

    // TUNING
    let targetKey = voice.targetKey;

    // calculate tuning
    let cents = voice.modulatedGenerators[generatorTypes.fineTune]             // soundfont fine tune
        + channel.customControllers[customControllers.channelTuning]           // RPN channel fine tuning
        + channel.customControllers[customControllers.channelTransposeFine]    // custom tuning (synth.transpose)
        + channel.customControllers[customControllers.masterTuning]            // master tuning, set by sysEx
        + channel.channelOctaveTuning[voice.midiNote % 12];                    // MTS octave tuning
    let semitones = voice.modulatedGenerators[generatorTypes.coarseTune]       // soundfont coarse tuning
        + channel.customControllers[customControllers.channelTuningSemitones]; // RPN channel coarse tuning

    // midi tuning standard
    const tuning = this.tunings[channel.preset.program]?.[targetKey];
    if(tuning?.midiNote >= 0)
    {
        // override key
        targetKey = tuning.midiNote;
        // add microtonal tuning
        cents += tuning.centTuning;
    }

    // calculate tuning by key using soundfont's scale tuning
    cents += (targetKey - voice.sample.rootKey) * voice.modulatedGenerators[generatorTypes.scaleTuning];

    // vibrato LFO
    const vibratoDepth = voice.modulatedGenerators[generatorTypes.vibLfoToPitch];
    if(vibratoDepth !== 0)
    {
        // calculate start time and lfo value
        const vibStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVibLFO]);
        const vibFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqVibLFO]);
        const lfoVal = getLFOValue(vibStart, vibFreqHz, currentTime);
        // use modulation multiplier (RPN modulation depth)
        cents += lfoVal * (vibratoDepth * channel.customControllers[customControllers.modulationMultiplier]);
    }

    // lowpass frequency
    let lowpassCents = voice.modulatedGenerators[generatorTypes.initialFilterFc];

    // mod LFO
    const modPitchDepth = voice.modulatedGenerators[generatorTypes.modLfoToPitch];
    const modVolDepth = voice.modulatedGenerators[generatorTypes.modLfoToVolume];
    const modFilterDepth = voice.modulatedGenerators[generatorTypes.modLfoToFilterFc];
    let modLfoCentibels = 0;
    if(modPitchDepth + modFilterDepth + modVolDepth !== 0)
    {
        // calculate start time and lfo value
        const modStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModLFO]);
        const modFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqModLFO]);
        const modLfoValue = getLFOValue(modStart, modFreqHz, currentTime);
        // use modulation multiplier (RPN modulation depth)
        cents += modLfoValue * (modPitchDepth * channel.customControllers[customControllers.modulationMultiplier]);
        // volenv volume offset
        modLfoCentibels = modLfoValue * modVolDepth;
        // lowpass frequency
        lowpassCents += modLfoValue * modFilterDepth;
    }

    // channel vibrato (GS NRPN)
    if(channel.channelVibrato.depth > 0)
    {
        // same as others
        const channelVibrato = getLFOValue(voice.startTime + channel.channelVibrato.delay, channel.channelVibrato.rate, currentTime);
        if(channelVibrato)
        {
            cents += channelVibrato * channel.channelVibrato.depth;
        }
    }

    // mod env
    const modEnvPitchDepth = voice.modulatedGenerators[generatorTypes.modEnvToPitch];
    const modEnvFilterDepth = voice.modulatedGenerators[generatorTypes.modEnvToFilterFc];
    const modEnv = getModEnvValue(voice, currentTime);
    // apply values
    lowpassCents += modEnv * modEnvFilterDepth;
    cents += modEnv * modEnvPitchDepth;

    // finally calculate the playback rate
    const centsTotal = ~~(cents + semitones * 100);
    if(centsTotal !== voice.currentTuningCents)
    {
        voice.currentTuningCents = centsTotal;
        voice.currentTuningCalculated = Math.pow(2, centsTotal / 1200);
    }

    // PANNING
    const pan = ((Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan] )) + 500) / 1000) ; // 0 to 1

    // SYNTHESIS
    const bufferOut = new Float32Array(outputLeft.length);

    // wavetable oscillator
    getOscillatorData(voice, this.workletDumpedSamplesList[voice.sample.sampleID], bufferOut);

    // lowpass filter
    applyLowpassFilter(voice, bufferOut, lowpassCents);

    // volenv
    applyVolumeEnvelope(voice, bufferOut, currentTime, modLfoCentibels, this.sampleTime, this.volumeEnvelopeSmoothingFactor);

    // pan the voice and write out
    voice.currentPan += (pan - voice.currentPan) * this.panSmoothingFactor; // smooth out pan to prevent clicking
    const panLeft = Math.cos(HALF_PI * voice.currentPan) * this.panLeft;
    const panRight = Math.sin(HALF_PI * voice.currentPan) *  this.panRight;
    // disable reverb and chorus in one output mode
    const reverb = this.oneOutputMode ? 0 : voice.modulatedGenerators[generatorTypes.reverbEffectsSend];
    const chorus = this.oneOutputMode ? 0 : voice.modulatedGenerators[generatorTypes.chorusEffectsSend];
    panVoice(
        panLeft,
        panRight,
        bufferOut,
        outputLeft, outputRight,
        reverbOutput, reverb,
        chorusOutput, chorus);
}


/**
 * @param channel {WorkletProcessorChannel}
 * @param voice {WorkletVoice}
 * @return {number}
 */
function getPriority(channel, voice)
{
    let priority = 0;
    if(channel.drumChannel)
    {
        // important
        priority += 5;
    }
    if(voice.isInRelease)
    {
        // not important
        priority -= 5;
    }
    // less velocity = less important
    priority += voice.velocity / 25; // map to 0-5
    // the newer, more important
    priority -= voice.volumeEnvelope.state;
    if(voice.isInRelease)
    {
        priority -= 5;
    }
    priority -= voice.volumeEnvelope.currentAttenuationDb / 50;
    return priority;
}

/**
 * @this {SpessaSynthProcessor}
 * @param amount {number}
 */
export function voiceKilling(amount)
{
    let allVoices = [];
    for (const channel of this.workletProcessorChannels)
    {
        for (const voice of channel.voices)
        {
            if (!voice.finished)
            {
                const priority = getPriority(channel, voice);
                allVoices.push({ channel, voice, priority });
            }
        }
    }

    // Step 2: Sort voices by priority (ascending order)
    allVoices.sort((a, b) => a.priority - b.priority);
    const voicesToRemove = allVoices.slice(0, amount);

    for (const { channel, voice } of voicesToRemove)
    {
        const index = channel.voices.indexOf(voice);
        if (index > -1)
        {
            channel.voices.splice(index, 1);
        }
    }
}

/**
 * Stops the voice
 * @param voice {WorkletVoice} the voice to stop
 * @this {SpessaSynthProcessor}
 */
export function releaseVoice(voice)
{
    voice.releaseStartTime = currentTime;
    // check if the note is shorter than the min note time, if so, extend it
    if(voice.releaseStartTime - voice.startTime < MIN_NOTE_LENGTH)
    {
        voice.releaseStartTime = voice.startTime + MIN_NOTE_LENGTH;
    }
}