import { getDoubleNoteSvg } from '../utils/icons.js'
import { formatTime } from '../../../spessasynth_lib/utils/other.js'
import { ANIMATION_REFLOW_TIME } from '../utils/animation_utils.js'

/**
 * music_mode_ui.js
 * purpose: manages the music mode gui, hiding keyboard and renderer from view
 */


const TRANSITION_TIME = 0.5;

export class MusicModeUI {
    /**
     * Creates a new class for displaying information about the current file.
     * @param element {HTMLElement}
     * @param localeManager {LocaleManager}
     */
    constructor(element, localeManager) {
        this.mainDiv = element;
        // load html
        this.mainDiv.innerHTML = `
        <div class='player_info_wrapper'>
            <div class="player_info_note_icon">
                ${getDoubleNoteSvg("100%")}
            </div>
            <div class='player_info_details'>
                <p style='font-size: small'><i translate-path='locale.musicPlayerMode.currentlyPlaying'></i></p>
                <h1 id='player_info_title' translate-path='locale.musicPlayerMode.nothingPlaying'></h1>
                <h3><i id='player_info_detail' translate-path='locale.musicPlayerMode.nothingPlayingCopyright'></i></h3>
                <h3 id='player_info_time'></h3>
            </div>
        </div>`;

        // apply locale bindings
        for (const el of this.mainDiv.querySelectorAll("*[translate-path]"))
        {
            localeManager.bindObjectProperty(el, "textContent", el.getAttribute("translate-path"));
        }
        this.timeoutId = -1;
        this.visible = false;
    }

    /**
     * @param title {string}
     */
    setTitle(title)
    {
        // get the title
        document.getElementById("player_info_title").textContent = title;
    }

    /**
     * @param seq {Sequencer}
     */
    connectSequencer(seq)
    {
        this.seq = seq;
        this.seq.addOnSongChangeEvent(mid => {
            // use file name if no copyright detected
            if(mid.copyright.replaceAll("\n", "").length > 0)
            {
                document.getElementById("player_info_detail").textContent = mid.copyright + mid.fileName;
            }
            else
            {
                document.getElementById("player_info_detail").textContent = mid.fileName;
            }
            document.getElementById("player_info_time").textContent = formatTime(this.seq.duration).time;
        }, "player-js-song-change");
    }

    /**
     * @param visible {boolean}
     * @param keyboardCanvasWrapper {HTMLDivElement}
     */
    setVisibility(visible, keyboardCanvasWrapper)
    {
        if(visible === this.visible)
        {
            return;
        }
        this.visible = visible;
        if(this.timeoutId)
        {
            clearTimeout(this.timeoutId);
        }
        const playerDiv = this.mainDiv;
        if(visible)
        {
            // PREPARATION
            // renderer and keyboard
            keyboardCanvasWrapper.classList.add("out_animation");
            this.savedCKWrapperHeight = keyboardCanvasWrapper.clientHeight;

            // music mode
            // hacky: get position of the wrapper and temporarily set to absolute (set to normal after finish)
            const playerHeight = keyboardCanvasWrapper.clientHeight;
            const playerTop = keyboardCanvasWrapper.getBoundingClientRect().top;
            playerDiv.style.position = "absolute";
            playerDiv.style.top = `${playerTop}px`;
            playerDiv.style.height = `${playerHeight}px`;
            playerDiv.style.display = "flex";

            // START
            setTimeout(() => {
                playerDiv.classList.add("player_info_show");
                document.body.style.overflow = "hidden";
            }, ANIMATION_REFLOW_TIME);

            // FINISH
            this.timeoutId = setTimeout(() => {
                keyboardCanvasWrapper.style.display = "none";

                playerDiv.style.position = "";
                playerDiv.style.top = "";
                playerDiv.style.height = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000)
        }
        else
        {
            // PREPARATION
            // wrapper
            // hacky: get position of the music mode and temporarily set to absolute (set to normal after finish)
            const rootTop = playerDiv.getBoundingClientRect().top;
            keyboardCanvasWrapper.style.display = "";
            keyboardCanvasWrapper.style.position = "absolute";
            keyboardCanvasWrapper.style.top = `${rootTop}px`;
            keyboardCanvasWrapper.style.height = `${this.savedCKWrapperHeight}px`;

            // music mode
            playerDiv.classList.remove("player_info_show");

            // START
            setTimeout(() => {
                keyboardCanvasWrapper.classList.remove("out_animation");
                document.body.style.overflow = "hidden";
            }, ANIMATION_REFLOW_TIME);

            // FINISH
            this.timeoutId = setTimeout(() => {
                playerDiv.style.display = "none";

                keyboardCanvasWrapper.style.position = "";
                keyboardCanvasWrapper.style.top = "";
                keyboardCanvasWrapper.style.height = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000);
        }
    }
}