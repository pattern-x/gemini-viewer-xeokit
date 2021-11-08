/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin, SectionPlane } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { BoxControl, BoxSectionPlaneType } from "../widgets/section/BoxControl";
import { MathUtil } from "../utils/MathUtil";

interface SectionBoxConfig {
    active: boolean;
    aabb?: number[];
}

const AABB_MAGNIFICATAION = 1.1;

/**
 * An axis-aligned world-space clipping box. Don't consider rotation and translation of box.
 * Sectionplane's dir must be normalized
 */
export class SectionBoxPlugin extends Plugin {
    private _active: boolean;
    private _aabb?: number[];
    private _sectionPlaneMap = new Map<BoxSectionPlaneType, any>();
    private _control: BoxControl;

    constructor(viewer: any, cfg?: SectionBoxConfig) {
        super("SectionBox", viewer);

        this._active = !!(cfg && cfg.active);
        this._aabb = cfg && cfg.aabb?.slice();

        this._control = new BoxControl(this);

        this.initSectionBox();

        this.on("active", (active: boolean) => this.activeSectionBox(active));
    }

    set active(value: boolean) {
        if (this._active === value) {
            return;
        }
        this._active = value !== false;
        if (!this._active) {
            this.visible = false; // when not active, make sure to hide controls
        }

        this.fire("active", this._active);
    }

    get active() {
        return this._active;
    }

    // Controls the visibility of box
    set visible(value: boolean) {
        if (this._sectionPlaneMap.size === 0) {
            console.warn(`[SectionBox] These is no section planes`);
            return;
        }
        this._control.setVisible(value);
    }

    get visible() {
        return this._control.getVisible();
    }

    private activeSectionBox(active: boolean) {
        for (const plane of this._sectionPlaneMap.values()) {
            plane.active = active;
        }
    }

    private rebuildSectionBox() {
        const sectionPlaneMap = this._sectionPlaneMap;
        if (sectionPlaneMap.size === 0) {
            this.buildSectionPlanes();
        }

        const aabb = this._aabb as number[];

        for (const [key, sectionPlane] of sectionPlaneMap) {
            switch (key) {
                case BoxSectionPlaneType.RIGHT:
                case BoxSectionPlaneType.TOP:
                case BoxSectionPlaneType.FRONT:
                    sectionPlane.pos = [aabb[3], aabb[4], aabb[5]];
                    break;
                case BoxSectionPlaneType.LEFT:
                case BoxSectionPlaneType.BOTTOM:
                case BoxSectionPlaneType.BACK:
                    sectionPlane.pos = [aabb[0], aabb[1], aabb[2]];
                    break;
                default:
                    break;
            }
        }

        this._control.rebuildBoxMesh(aabb);
    }

    get aabb() {
        return this._aabb as number[];
    }

    // Changes the aabb range of box
    set aabb(value: number[]) {
        if (value[3] < value[0] || value[4] < value[1] || value[5] < value[2]) {
            return;
        }
        this._aabb = [...value];
        MathUtil.expandAABB(this._aabb, AABB_MAGNIFICATAION);
        this.rebuildSectionBox();
    }

    reset() {
        const scene = this._viewer && this._viewer.scene;
        if (scene) {
            this.aabb = scene.getAABB(scene.visibleObjectIds);
        }
    }

    private initSectionBox() {
        if (this._sectionPlaneMap.size > 0) {
            return;
        }

        if (!this._aabb) {
            this._aabb = [...this.viewer.scene.aabb];
        }
    }

    private buildSectionPlanes() {
        if (this._sectionPlaneMap.size > 0) {
            return;
        }
        const active = this._active;
        const aabb = this._aabb as number[];

        const createSectionPlane = (id: BoxSectionPlaneType, pos: number[], dir: number[]) => {
            const plane = new SectionPlane(this.viewer.scene, { id, pos, dir, active });
            this._sectionPlaneMap.set(id, plane);
        };
        createSectionPlane(BoxSectionPlaneType.RIGHT, [aabb[3], aabb[4], aabb[5]], [-1, 0, 0]); // positive x axis
        createSectionPlane(BoxSectionPlaneType.TOP, [aabb[3], aabb[4], aabb[5]], [0, -1, 0]); // positive y axis
        createSectionPlane(BoxSectionPlaneType.FRONT, [aabb[3], aabb[4], aabb[5]], [0, 0, -1]); // positive z axis
        createSectionPlane(BoxSectionPlaneType.LEFT, [aabb[0], aabb[1], aabb[2]], [1, 0, 0]); // negative x axis
        createSectionPlane(BoxSectionPlaneType.BOTTOM, [aabb[0], aabb[1], aabb[2]], [0, 1, 0]); // negative y axis
        createSectionPlane(BoxSectionPlaneType.BACK, [aabb[0], aabb[1], aabb[2]], [0, 0, 1]); // negative z axis

        this._control.initSectionPlanes(this._sectionPlaneMap, aabb);
        this.visible = active;
    }

    private destroySectionPlane() {
        for (const plane of this._sectionPlaneMap.values()) {
            plane.destroy();
        }

        this._sectionPlaneMap.clear();
    }

    destroy() {
        this.destroySectionPlane();
        if (this._control) {
            this._control.destroy();
        }
        super.destroy();
    }
}
