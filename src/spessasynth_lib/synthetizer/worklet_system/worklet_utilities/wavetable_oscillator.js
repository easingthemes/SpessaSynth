/**
 * Fills the output buffer with raw sample data
 * @param voice {WorkletVoice} the voice we're working on
 * @param sampleData {Float32Array} the sample data to write with
 * @param outputBuffer {Float32Array} the output buffer to write to
 */
export function getOscillatorData(voice, sampleData, outputBuffer)
{
    let cur = voice.sample.cursor;
    const loop = (voice.sample.loopingMode === 1) || (voice.sample.loopingMode === 3 && !voice.isInRelease);
    const loopLength = voice.sample.loopEnd - voice.sample.loopStart;

    if(loop)
    {
        for (let i = 0; i < outputBuffer.length; i++) {
            // check for loop
            while(cur > voice.sample.loopEnd) {
                cur -= loopLength;
            }

            // grab the 2 nearest points
            const floor = ~~cur;
            let ceil = floor + 1;

            while(ceil >= voice.sample.loopEnd) {
                ceil -= loopLength;
            }

            const fraction = cur - floor;

            // grab the samples and interpolate
            const upper = sampleData[ceil];
            const lower = sampleData[floor];
            outputBuffer[i] = (lower + (upper - lower) * fraction);

            cur += voice.sample.playbackStep * voice.currentTuningCalculated;
        }
    }
    else
    {
        for (let i = 0; i < outputBuffer.length; i++) {

            // linear interpolation
            const floor = ~~cur;
            const ceil = floor + 1;

            // flag the voice as finished if needed
            if(ceil >= voice.sample.end)
            {
                voice.finished = true;
                return;
            }

            const fraction = cur - floor;

            // grab the samples and interpolate
            const upper = sampleData[ceil];
            const lower = sampleData[floor];
            outputBuffer[i] = (lower + (upper - lower) * fraction);

            cur += voice.sample.playbackStep * voice.currentTuningCalculated;
        }
    }
    voice.sample.cursor = cur;
}