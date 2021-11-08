import { Plugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

export type NoParamCallback = () => void;

export interface OrthoModeConfig {
    active: boolean;
    done?: NoParamCallback;
}

/**
 * Wraps single selection tool
 */
export class OrthoModePlugin extends Plugin {
    private _active: boolean;

    constructor(viewer: any, cfg?: OrthoModeConfig) { // eslint-disable-line
        super("OrthoModePlugin", viewer, cfg);

        this._active = cfg ? cfg.active : false;

        if (this._active) {
            if (cfg && cfg.done) {
                this._enterOrthoMode(cfg.done);
            } else {
                this._enterOrthoMode();
            }
        }
    }

    setActive(active: boolean, done?: NoParamCallback) {
        if (this._active === active) {
            if (done) {
                done();
            }
            return;
        }
        this._active = active;
        if (active) {
            this._enterOthoMode(done);
        } else {
            this._exitOthoMode(done);
        }
    }

    getActive(): boolean {
        return this._active;
    }

    destroy(): void {
        super.destroy();
    }

    private _enterOthoMode(done?: NoParamCallback) {
        this._flyToEnterOrthoMode(() => {
            this.fire("active", this._active);
            done && done();
        });
    }

    private _exitOthoMode(done?: NoParamCallback) {
        this._flyToExitOrthoMode(() => {
            this.fire("active", this._active);
            done && done();
        });
    }

    private _flyToEnterOrthoMode(done?: NoParamCallback) {
        this.viewer.cameraFlight.flyTo({ projection: "ortho", duration: 0.5, aabb: this.viewer.scene.aabb }, done);
    }

    private _flyToExitOrthoMode(done?: NoParamCallback) {
        this.viewer.cameraFlight.flyTo(
            {
                projection: "perspective",
                duration: 0.5,
                aabb: this.viewer.scene.aabb,
            },
            done
        );
    }
}
