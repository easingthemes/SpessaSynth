import {MidiKeyboard} from "./ui/midi_keyboard.js";
import {Synthetizer} from "../spessasynth_lib/synthetizer/synthetizer.js";
import {Renderer} from "./ui/renderer.js";
import {Sequencer} from "../spessasynth_lib/sequencer/sequencer.js";
import {MIDI} from "../spessasynth_lib/midi_parser/midi_loader.js";

import {SoundFont2} from "../spessasynth_lib/soundfont/soundfont_parser.js";
import {SequencerUI} from "./ui/sequencer_ui.js";
import {SynthetizerUI} from "./ui/synthetizer_ui.js";
import { MIDIDeviceHandler } from '../spessasynth_lib/midi_handler/midi_handler.js'
import { WebMidiLinkHandler } from '../spessasynth_lib/midi_handler/web_midi_link.js'

export class Manager
{
    channelColors = [
        'rgba(255, 99, 71, 1)',   // tomato
        'rgba(255, 165, 0, 1)',   // orange
        'rgba(255, 215, 0, 1)',   // gold
        'rgba(50, 205, 50, 1)',   // limegreen
        'rgba(60, 179, 113, 1)',  // mediumseagreen
        'rgba(0, 128, 0, 1)',     // green
        'rgba(0, 191, 255, 1)',   // deepskyblue
        'rgba(65, 105, 225, 1)',  // royalblue
        'rgba(138, 43, 226, 1)',  // blueviolet
        'rgba(50, 120, 125, 1)', //'rgba(218, 112, 214, 1)', // percission color
        'rgba(255, 0, 255, 1)',   // magenta
        'rgba(255, 20, 147, 1)',  // deeppink
        'rgba(218, 112, 214, 1)', // orchid
        'rgba(240, 128, 128, 1)', // lightcoral
        'rgba(255, 192, 203, 1)', // pink
        'rgba(255, 255, 0, 1)'    // yellow
    ];

    /**
     * Creates a new midi user interface.
     * @param context {BaseAudioContext}
     * @param soundFont {SoundFont2}
     */
    constructor(context, soundFont) {
        //context.audioWorklet.addModule("/spessasynth_lib/synthetizer/worklet_channel/channel_processor.js").then(() => {
            // set up soundfont
            this.soundFont = soundFont;

            // set up synthetizer
            this.synth = new Synthetizer(context.destination, this.soundFont);

            // set up midi access
            this.midHandler = new MIDIDeviceHandler();

            // set up web midi link
            this.wml = new WebMidiLinkHandler(this.synth);

            // set up keyboard
            this.keyboard = new MidiKeyboard(this.channelColors, this.synth, this.midHandler);

            // set up renderer
            const canvas = document.getElementById("note_canvas");

            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;

            window.addEventListener("resize", () => {
                canvas.width = window.innerWidth * window.devicePixelRatio;
                canvas.height = window.innerHeight * window.devicePixelRatio;
            });

            this.renderer = new Renderer(this.channelColors, this.synth, canvas);
            this.renderer.render(true);

            // connect the synth to keyboard
            this.synth.onNoteOn = (note, chan, vel, vol, exp) => this.keyboard.pressNote(note, chan, vel, vol, exp);
            this.synth.onNoteOff = note => this.keyboard.releaseNote(note);

            // set up synth UI
            this.synthUI = new SynthetizerUI(this.channelColors);
            this.synthUI.connectSynth(this.synth);

            // create an UI for sequencer
            this.seqUI = new SequencerUI();

            document.addEventListener("keypress", e => {
                switch (e.key.toLowerCase()) {
                    case "c":
                        e.preventDefault();
                        const response = window.prompt("Cinematic mode activated!\n Paste the link to the image for canvas (leave blank to disable)", "");

                        if (response === null) {
                            return;
                        }
                        canvas.style.background = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), center center / cover url("${response}")`;
                        document.getElementsByClassName("top_part")[0].style.display = "none";
                        document.getElementsByClassName("bottom_part")[0].style.display = "none";
                        document.body.requestFullscreen().then();
                        break;

                    case "n":
                        // secret
                        for (let i = 0; i < 16; i++) {
                            this.synth.midiChannels[i].lockPreset = false;
                            this.synth.programChange(i, (this.synth.midiChannels[i].preset.program + 1) % 127);
                            this.synth.midiChannels[i].lockPreset = true;
                        }
                        break;
                }
            });
        //});
    }

    /**
     * starts playing and rendering the midi file
     * @param parsedMidi {MIDI}
     */
    play(parsedMidi)
    {
        if (!this.synth)
        {
            return;
        }
        // create a new sequencer
        this.seq = new Sequencer(parsedMidi, this.synth);

        // connect to the UI
        this.seqUI.connectSequencer(this.seq);

        // connect to the renderer;
        this.seq.connectRenderer(this.renderer);

        // play the midi
        this.seq.play(true);
        this.keyboard.createMIDIOutputSelector(this.seq);
    }
}