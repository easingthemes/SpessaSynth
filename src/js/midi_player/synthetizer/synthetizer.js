import {MidiChannel} from "./midi_channel.js";
import {SoundFont2} from "../../soundfont/soundfont_parser.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";

const VOICES_CAP = 1815;

export class Synthetizer {
    /**
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2}
     */
    constructor(targetNode, soundFont) {
        this.outputNode = targetNode;
        this.soundFont = soundFont;

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this.highPerformanceMode = false;

        console.log("Preparing channels");
        /**
         * @type {MidiChannel[]}
         */
        this.midiChannels = [];

        const defaultPreset = this.soundFont.getPreset(0, 0);
        const percussionPreset = this.soundFont.getPreset(128, 0);

        // create 16 channels
        for (let j = 0; j < 16; j++) {
            // default to the first preset
            this.midiChannels[j] = new MidiChannel(this.outputNode, defaultPreset, j + 1, false);
        }

        // change percussion channel to the percussion preset
        this.midiChannels[9].percussionChannel = true;
        this.midiChannels[9].changePreset(percussionPreset);
        this.midiChannels[9].bank = 128;

        // // set reverb
        // fetch("other/reverb_impulse.wav").then(async r => {
        //     const buff = await this.outputNode.context.decodeAudioData(await r.arrayBuffer());
        //     for(const chan of this.midiChannels)
        //     {
        //         chan.setReverbBuffer(buff);
        //     }
        // });
    }

    /**
     * MIDI NoteOn Event
     * @param channel {number} 0-15
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param enableDebugging {boolean} set to true to log stuff to console
     */
    NoteOn(channel, midiNote, velocity, enableDebugging = false) {
        if (velocity === 0) {
            this.NoteOff(channel, midiNote);
            return;
        }

        if(this.voicesAmount > VOICES_CAP)
        {
            return;
        }

        let chan = this.midiChannels[channel];
        chan.playNote(midiNote, velocity, enableDebugging, this.highPerformanceMode);
        this.onNoteOn(midiNote, channel, velocity, chan.channelVolume, chan.channelExpression);
    }

    /**
     * MIDI NoteOff event
     * @param channel {number} 0-15
     * @param midiNote {number} 0-127
     */
    NoteOff(channel, midiNote) {
        this.onNoteOff(midiNote);
        if(this.highPerformanceMode)
        {
            this.midiChannels[channel].stopNote(midiNote, true);
            return;
        }
        this.midiChannels[channel].stopNote(midiNote);
    }

    /**
     * Plays when the midi note goes on
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15
     * @param velocty {number} 0-127
     * @param volume {number} 0-1
     * @param expression {number} 0-1
     */
    onNoteOn;

    /**
     * Plays when the midi note goes off
     * @param midiNote {number} 0-127
     */
    onNoteOff;

    stopAll() {
        for (let channel of this.midiChannels) {
            channel.stopAll();
        }
        for(let i = 0; i < 128; i++)
        {
            this.onNoteOff(i);
        }
    }

    /**
     * Changes the given controller
     * @param channel {number} 0-15
     * @param controllerName {controllerNames}
     * @param controllerValue {number} 0-127
     */
    controllerChange(channel, controllerName, controllerValue)
    {
        switch (controllerName) {
            case "Main Volume":
                this.midiChannels[channel].setVolume(controllerValue);
                break;

            case "LSB for Control 7 (Main Volume)":
                let nevVol = (this.midiChannels[channel].channelVolume << 7) | controllerValue;
                this.midiChannels[channel].setVolume(nevVol);
                break;

            case "Sustain Pedal":
                if(controllerValue < 64) {
                    this.midiChannels[channel].releaseHoldPedal();
                }
                else
                {
                    this.midiChannels[channel].pressHoldPedal();
                }
                break;

            case "Pan":
                let pan = (controllerValue - 64) / 64;
                this.midiChannels[channel].changePan(pan);
                break;

            case "All Notes Off":
            case "All Sound Off":
                this.stopAll();
                break;

            case "Expression Controller":
                this.midiChannels[channel]
                    .setExpression(controllerValue / 127);
                break;


            case "LSB for Control 11 (Expression Controller)":
                const expression = (this.midiChannels[channel].channelExpression << 7 ) | controllerValue;
                this.midiChannels[channel].setExpression(expression);
                break;

            case "Bank Select":
                let bankNr = controllerValue;
                const channelObject = this.midiChannels[channel];
                if(channelObject.percussionChannel)
                {
                    // 128 for percussion channel
                    bankNr = 128
                }
                if(bankNr === 128 && !channelObject.percussionChannel)
                {
                    // if channel is not for percussion, default to bank current
                    bankNr = channelObject.bank;
                }

                channelObject.bank = bankNr;
                break;

            case "Non-Registered Parameter Number MSB":
                this.midiChannels[channel].setNRPCoarse(controllerValue);
                break;

            case "Non-Registered Parameter Number LSB":
                this.midiChannels[channel].setNRPFine(controllerValue);
                break;

            case "Registered Parameter Number MSB":
                this.midiChannels[channel].setRPCoarse(controllerValue);
                break;

            case "Registered Parameter Number LSB":
                this.midiChannels[channel].setRPFine(controllerValue);
                break;

            case "Data Entry MSB":
                this.midiChannels[channel].dataEntryCoarse(controllerValue);
                break;


            case "Reset All Controllers":
                this.midiChannels[channel].resetControllers();
                break;

            default:
                break;
        }
    }

    /**
     * Resets all controllers
     */
    resetControllers()
    {
        for(const ch of this.midiChannels)
        {
            ch.resetControllers();
        }
    }

    /**
     * Sets the pitch
     * @param channel {number} 0-126
     * @param MSB {number} SECOND byte
     * @param LSB {number} FIRST byte
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.midiChannels[channel].setPitchBend(MSB, LSB);
    }

    /**
     * Calls on program change(channel number, preset name)
     * @type {function(number, string)}
     */
    onProgramChange;

    /**
     * @param channel {number} 0-15
     * @param programNumber {number} 0-127
     */
    programChange(channel, programNumber)
    {
        const channelObj = this.midiChannels[channel];
        // always 128 for channel 10
        const bank = (channel === 9 ? 128 : channelObj.bank);

        let preset = this.soundFont.getPreset(bank, programNumber);
        channelObj.changePreset(preset);
        console.log("changing channel", channel, "to bank:", channelObj.bank,
            "preset:", programNumber, preset.presetName);
        this.onProgramChange(channel, preset.presetName);
    }

    /**
     * Sends a sysex
     * @param messageData {ShiftableByteArray} the message's data (after F0)
     */
    systemExclusive(messageData)
    {
        const type = messageData[0];
        switch (type)
        {
            default:
                break;

            // roland
            // http://www.bandtrax.com.au/sysex.htm
            case 0x41:
                // gs
                if(messageData[2] === 0x42 && messageData[3] === 0x12 && messageData[4] === 0x40)
                {
                    // 0 means channel 10 (default), 1 means 1 etc.
                    const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F]; // for example 1A means A = 11
                    if(messageData[6] === 0x15) // drum channel
                    {
                        this.midiChannels[channel].percussionChannel = messageData[7] > 0;
                        console.log("Drum channel", channel, messageData[7] > 0);
                    }
                }

        }
    }

    /**
     * @returns {number}
     */
    get currentTime()
    {
        return this.outputNode.context.currentTime;
    }

    get voicesAmount()
    {
        let v = 0;
        this.midiChannels.forEach(c => v += c.voicesAmount);
        return v;
    }
}