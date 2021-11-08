import { Plugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

export interface BackgroundColorConfig {
    transparent?: boolean;
    backgroundColor?: number[];
}

/**
 * Background color modifier
 * Note that background color only work when transparent is false!
 */
export class BackgroundColorPlugin extends Plugin {
    private _canvas: any; // eslint-disable-line

    constructor(viewer: any, cfg?: BackgroundColorConfig) { // eslint-disable-line
        super("BackgroundColorPlugin", viewer, cfg);

        this._canvas = this.viewer.scene.canvas;

        if (cfg) {
            if (cfg.transparent !== undefined) {
                this.setTransparent(cfg.transparent);
            }
            if (cfg.backgroundColor) {
                this.setBackgroundColor(cfg.backgroundColor);
            }
        }
    }

    setTransparent(transparent: boolean) {
        // this doesn't work yet, don't know why! (TODO: fix it)
        this._canvas.transparent = transparent;
        this.viewer.scene.render(true);
    }

    getTransparent(): boolean {
        return this._canvas.transparent;
    }

    setBackgroundColor(color: number[]) {
        this._canvas.backgroundColor = color;
        this.viewer.scene.render(true);
    }

    getBackgroundColor(): number[] | undefined {
        return this._canvas.backgroundColor;
    }

    destroy() {
        super.destroy();
        this._canvas = undefined;
    }
}
