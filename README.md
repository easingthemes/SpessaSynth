<p align='center'>
<img src="src/website/spessasynth_logo_rounded.png" width='300' alt='SpessaSynth logo'>
</p>

SoundFont2 based realtime synthetizer and MIDI player written in JavaScript using Web Audio API. Can also be used as a synthesis library.

![SpessaSynth Promotional Image](https://github.com/spessasus/SpessaSynth/assets/95608008/e2e6c4c6-0762-4c11-8887-a2318d431854)

## Exporting modified MIDIs now available!

# [Live demo](https://spessasus.github.io/SpessaSynth/)

## Youtube video
[<img width='500' alt="Watch the YouTube video" src="https://github.com/spessasus/SpessaSynth/assets/95608008/0fade923-1ed6-4565-8300-1f57ef70bc89">](https://youtu.be/6rUjjVcMXu8)


This repo is essentially 2 programs in one:
# spessasynth_lib
A flexible, powerful, and feature-packed soundfont synthesizer library for the WebAudio API.
> [!TIP]
> Looking for a Node.js version? try [spessasynth_core](https://www.npmjs.com/package/spessasynth_core)

[Documentation](../../wiki/Home)
## Features
- SoundFont2 Generator Support
- SoundFont2 Modulator Support
- SoundFont3 (vorbis compressed sf2) Support (thanks to [stbvorbis.js](https://github.com/hajimehoshi/stbvorbis.js))
- - Can provide very hiqh quality audio while being relatively light on file size thanks to sf3 support
- Reverb and chorus support
- Render audio to file
- Read and write .mid files
- A few custom modulators to support some additional controllers (see `modulators.js`)
- Written using AudioWorklets (Firefox and Chrome both work perfectly)
- Can load really large soundfonts (4GB!) (but only on Firefox, Chromium has a memory limit)
- [Multi Port MIDIs support](../../wiki/About-Multi-Port) (more than 16 channels)
- MIDI Controller Support (Default supported controllers can be found [here](../../wiki/Synthetizer-Class#supported-controllers)).
- Supports some Roland GS and Yamaha XG sysex messages
- High performance mode for playing black MIDIs (Don't go too crazy with the amount of notes though)
- Can be used as a library ([learn more here](../../wiki/Usage-As-Library))
- Modular design allows easy integrations into other projects
- Written in pure JavaScript using WebAudio API (Every modern browser supports it)
- No dependencies

## Limitations
- The performance is questionable, especially on mobile devices.

### Installation
1. Clone this repository.
2. copy `src/spessasynth_lib` to your project.
3. [Use the library](../../wiki/Home)

# Web app / Local Edition
The complete GUI for spessasynth_lib, allowing remixing experimenting and playing MIDIs in the coolest way possible.

[How to use](../../wiki/How-To-Use-App)
## Features
- Visualization of the played sequence with effects like visual pitch bend and note on effects
- Playable keyboard with various sizes
- Integrated controller for the synthetizer with a lot of options
- Mobile friendly ~the ui, not the synthesizer~
- Mutliple languages support, currently: english, polish, japanese
- `Web MIDI API` support (Enables physical MIDI devices to be used with the program)
- [WebMidiLink](https://www.g200kg.com/en/docs/webmidilink/) support
- Play around with the MIDI file, edit instruments controllers and more!
- Render the MIDI file (either modified or unmodified) to wav
- Export the modified MIDI file to .mid
- Comes bundled with a compressed [SGM](https://musical-artifacts.com/artifacts/855) SoundFont to get you started
- Also no dependencies!

### Still not convinced? Here are some more screenshots:
<img src="https://github.com/user-attachments/assets/b0c9a1f3-3278-4208-8d35-f63b0943ae39" width="45%"></img> 
<img src="https://github.com/user-attachments/assets/3bfd9de0-ed13-4667-b843-47c956454136" width="45%"></img>
<img src="https://github.com/user-attachments/assets/7499503e-9dec-4f7c-8c58-b4960f63bc39" width="45%"></img>
<img src="https://github.com/user-attachments/assets/688b4ecc-0ba5-4990-92a5-8b567e08d7d6" width="45%"></img> 



### Installation
> [!IMPORTANT]
> Firefox is recommended, due to unconstrained memory size.
> Also a decent computer for large soundfonts.

[Recommended high quality soundfont (better than the built-in one)](https://musical-artifacts.com/artifacts/1176)

**Requires node.js to be installed**
#### Windows
1. Download the code as zip and extract or use `git clone https://github.com/spessasus/SpessaSynth`
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Double click the `start.bat`
4. Enjoy!

#### Linux
1. ```shell
   git clone https://github.com/spessasus/SpessaSynth
   cd SpessaSynth
   node src/website/server.js
   ```
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Enjoy!

#### todo
- make the worklet system perform good
- port the worklet system to emscripten (maybe) (not really)
- improve the built-in chorus and reverb effects
- fix release during attack


### Special thanks
 - [Fluidsynth](https://github.com/FluidSynth/fluidsynth) - the source code really helped me understand and implement a lot of functionality and fixes
 - [Polyphone](https://www.polyphone-soundfonts.com/) - a wonderful testing tool for soundfonts and how they should sound
 - [Meltysynth](https://github.com/sinshu/meltysynth) - for the initial low-pass filter implementation
 - [RecordingBlogs](https://www.recordingblogs.com/) - for the detailed explanations on MIDI messages
 - **And You!** - for checking out this project. I hope you like it :)

### License
Copyright © 2024 Spessasus. Licensed under the MIT License.

> [!IMPORTANT]
> Please note that bundled [stbvorbis_sync.js](https://github.com/spessasus/stbvorbis_sync.js) licensed under the Apache-2.0 license.
