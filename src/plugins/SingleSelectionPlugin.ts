import { Plugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

type PickCallback = (pickResult: any) => void; // eslint-disable-line

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyCallBack: PickCallback = () => {};

export interface SingleSelectionConfig {
    active: boolean;
    callback?: PickCallback;
}

/**
 * wrap single selection tool
 */
export class SingleSelectionPlugin extends Plugin {
    private _lastEntity: any; // eslint-disable-line
    private _cameraControlSubIds: number[] = [];
    private _pickCallback: PickCallback;
    private _active: boolean;

    constructor(viewer: any, cfg?: SingleSelectionConfig) { // eslint-disable-line
        super("SingleSelectionTool", viewer, cfg);

        this._active = cfg ? cfg.active : false;

        this._pickCallback = cfg && cfg.callback ? cfg.callback : emptyCallBack; // customize pick callback event

        this._lastEntity = null;

        if (this._active) {
            this.onPickEvent();
        }

        this.on("active", (active: boolean) => {
            if (active) {
                this.onPickEvent();
            } else {
                this.destroyEvent();
            }
        });
    }

    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        this._active = active;
        if (this._lastEntity) {
            this._lastEntity.selected = false;
        }
        this.fire("active", this._active);
    }

    getActive(): boolean {
        return this._active;
    }

    destroy(): void {
        this.destroyEvent();
        super.destroy();
    }

    private onPickEvent(): void {
        const cameraControl = this.viewer.cameraControl;
        const picked = cameraControl.on("picked", (pickResult: any) => { // eslint-disable-line
                if (!this._active) {
                    return;
                }
                this._pickCallback(pickResult);

                if (!pickResult.entity) {
                    return;
                }

                console.log(`[SingleSelection] picked ID: ${pickResult.entity.id}`);
                if (!this._lastEntity || pickResult.entity.id !== this._lastEntity.id) {
                    if (this._lastEntity) {
                        this._lastEntity.selected = false;
                    }

                    this._lastEntity = pickResult.entity;

                    // TODO: highlighted or selected
                    pickResult.entity.selected = true;
                    //pickResult.entity.highlighted=true;
                    this.fire("picked", pickResult.entity);
                } else {
                    pickResult.entity.selected = !pickResult.entity.selected;
                    if (!pickResult.entity.selected) {
                        this._lastEntity = undefined;
                        this.fire("pickedNothing");
                    }
                }
            },
            this
        );

        const pickNone = cameraControl.on(
            "pickedNothing",
            () => {
                if (!this._active) {
                    return;
                }
                if (this._lastEntity) {
                    this._lastEntity.selected = false;
                }

                this.fire("pickedNothing");
            },
            this
        );

        this._cameraControlSubIds.push(picked, pickNone);
    }

    private destroyEvent(): void {
        this._cameraControlSubIds.forEach((subId: number) => this.viewer.cameraControl.off(subId));
        this._cameraControlSubIds = [];

        if (this._lastEntity) {
            this._lastEntity.selected = false;
        }
    }
}
