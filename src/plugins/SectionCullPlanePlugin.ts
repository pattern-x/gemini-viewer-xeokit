import { SectionPlanesPlugin, math } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

export interface SectionOverviewConfig {
    overviewCanvasId?: string; // show cull plane overview
    overviewVisible?: boolean;
}

export interface SectionCullPlaneConfig {
    active: boolean;
    overviewCfg?: SectionOverviewConfig;
}

/**
 * This is a wrapper of section cull plane.
 * TODO
 */
export class SectionCullPlanePlugin extends SectionPlanesPlugin {
    private _onMouseClicked: any; // eslint-disable-line
    private _active: boolean;

    constructor(viewer: any, cfg?: SectionCullPlaneConfig) { // eslint-disable-line
        const active = cfg ? cfg.active : false;
        const overviewCfg = { overviewCanvasId: "", overviewVisible: active };
        if (cfg && cfg.overviewCfg) {
            if (cfg.overviewCfg.overviewCanvasId !== undefined) {
                overviewCfg.overviewCanvasId = cfg.overviewCfg.overviewCanvasId;
            }
            if (cfg.overviewCfg.overviewVisible !== undefined) {
                overviewCfg.overviewVisible = cfg.overviewCfg.overviewVisible;
            }
        }
        super(viewer, overviewCfg);

        this.setOverviewVisible(active);

        this._active = active;

        this.initSectionMode();
    }

    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        this._active = active;

        this.setOverviewVisible(this._active);
        if (!this._active) {
            this.hideControl();
            this.clear();
        }
    }

    getActive(): boolean {
        return this._active;
    }

    destroy(): void {
        this.destroyEvent();
        super.destroy();
    }

    private initSectionMode(): void {
        if (this._onMouseClicked) {
            return;
        }
        this._onMouseClicked = this.viewer.scene.input.on("mouseclicked", (coords: any) => { // eslint-disable-line
            if (!this.getActive()) {
                return;
            }

            const pickResult = this.viewer.scene.pick({
                canvasPos: coords,
                pickSurface: true, // <<------ This causes picking to find the intersection point on the entity
            });

            if (pickResult) {
                const sectionPlane = this.createSectionPlane({
                    pos: pickResult.worldPos,
                    dir: math.mulVec3Scalar(pickResult.worldNormal, -1),
                });

                this.showControl(sectionPlane.id);
            }
        });
    }

    private destroyEvent(): void {
        if (this._onMouseClicked) {
            this.viewer.scene.input.off(this._onMouseClicked);
            this._onMouseClicked = undefined;
        }
    }
}
