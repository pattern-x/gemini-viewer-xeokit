/* eslint-disable @typescript-eslint/no-explicit-any */
interface FullScreenConfig {
    active?: boolean;
    element?: HTMLElement;
}

export class FullScreenPlugin {
    private _active = false;
    private _element?: HTMLElement;
    private _fullScreenChangeListener?: any;

    constructor(cfg?: FullScreenConfig) {
        if (cfg) {
            this._active = cfg.active !== true;
            this._element = cfg.element;
        }

        //TODO.Other operations control full screen.
        document.addEventListener(
            "fullscreenchange",
            (this._fullScreenChangeListener = () => {
                this._active = !!document.fullscreenElement;
                console.log("[FullScreen] fullscreenchange:", this._active);
            })
        );
    }

    setElement(element: HTMLElement) {
        if (this._element && this._active) {
            console.log(`[FullScreen] When in full screen, element can't be switched`);
            return;
        }
        if (!this._element || this._element.id !== element.id) {
            this._element = element;
        }
    }

    setActive(active = false) {
        if (this._active === active) {
            return;
        }

        if (!this._element) {
            console.error(`[FullScreen] element is undefined`);
            return;
        }
        this._active = active;

        if (this._active) {
            this.enterFullScreen();
        } else {
            this.exitFullScreen();
        }
    }

    getActive() {
        return this._active;
    }

    private enterFullScreen() {
        if (!document.fullscreenElement && this._active) {
            this._element?.requestFullscreen();
        }
    }

    private exitFullScreen() {
        if (!this._active && document.fullscreenElement) {
            document.exitFullscreen();
        }
    }

    destroy() {
        if (this._fullScreenChangeListener) {
            document.removeEventListener("fullscreenchange", this._fullScreenChangeListener);
            this._fullScreenChangeListener = undefined;
        }
    }
}
