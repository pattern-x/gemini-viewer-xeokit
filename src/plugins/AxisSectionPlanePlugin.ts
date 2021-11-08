/* eslint-disable @typescript-eslint/no-explicit-any */
import { AXIS_SECTION_PLANE_CONTROL_ID, AXIS_SECTION_PLANE_ID } from "../utils/Consts";
import { math, Plugin, SectionPlane } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { PlaneControl } from "../widgets/section/PlaneControl";
import { SectionPlanePopPanel } from "../components/SectionPlanePopPanel";

interface SectionPlaneConfig {
    active: boolean;
    swapYZ: boolean;
}

interface CreateSectionPlaneParams {
    id?: string;
    pos: number[];
    dir: number[];
    active?: boolean;
}

export enum AxisType {
    X = "x",
    Y = "y",
    Z = "z",
}

export class AxisSectionPlanePlugin extends Plugin {
    private _active = false;
    private _axisType = AxisType.X;
    private _control: PlaneControl;
    private _popPanel: SectionPlanePopPanel | undefined;
    private _sectionPlane: any;
    private _axisInfoMap: { [key in AxisType]: { normal: number[]; pos: number[] } };

    constructor(viewer: any, cfg?: SectionPlaneConfig) {
        super("SectionPlane", viewer);

        this._active = !!(cfg && cfg.active);

        this._control = new PlaneControl(AXIS_SECTION_PLANE_CONTROL_ID, this);

        const aabb = this.viewer.scene.aabb;
        const aabbCenter = [(aabb[0] + aabb[3]) / 2, (aabb[1] + aabb[4]) / 2, (aabb[2] + aabb[5]) / 2];

        this._axisInfoMap = {
            [AxisType.X]: {
                normal: [-1, 0, 0],
                pos: aabbCenter,
            },
            [AxisType.Y]: {
                normal: cfg?.swapYZ ? [0, 0, -1] : [0, -1, 0],
                pos: aabbCenter,
            },
            [AxisType.Z]: {
                normal: cfg?.swapYZ ? [0, -1, 0] : [0, 0, -1],
                pos: aabbCenter,
            },
        };

        this.on("active", (active: boolean) => {
            this.activePopPanel(active);
            this.updateSectionPlane();
        });
    }

    set active(value: boolean) {
        if (this._active === value) {
            return;
        }
        this._active = value !== false;
        if (!this._active) {
            this.visible = false; // when not active, make sure to hide controls
            this.activePopPanel(this._active);
        }

        this.fire("active", this._active);
    }

    get active() {
        return this._active;
    }

    set visible(value: boolean) {
        this._control.setVisible(value);
        // activeItem's active means hiding section plane
        this._popPanel?.setActiveSelectItem(0, !value);
    }

    get visible() {
        return this._control.getVisible();
    }

    private activePopPanel(active: boolean) {
        active ? this.createPopPanel() : this.removePopPanel();
    }

    private createPopPanel() {
        const config = {
            groupSelectItems: [
                {
                    itemName: "axisX",
                    content: "X",
                    isGroupSelect: true,
                    isActive: true,
                    onActive: () => {
                        this._axisType = AxisType.X;
                        this.updateSectionPlane();
                        return true;
                    },
                },
                {
                    itemName: "axisY",
                    content: "Y",
                    isGroupSelect: true,
                    onActive: () => {
                        this._axisType = AxisType.Y;
                        this.updateSectionPlane();
                        return true;
                    },
                },
                {
                    itemName: "axisZ",
                    content: "Z",
                    isGroupSelect: true,
                    onActive: () => {
                        this._axisType = AxisType.Z;
                        this.updateSectionPlane();
                        return true;
                    },
                },
            ],
            activeSelectItems: [
                {
                    itemName: "togglePlaneVisible",
                    iconClass: "icon-hidesectionplane",
                    iconActiveClass: "icon-showsectionplane",
                    hoverTitle: this.viewer.localeService.translate("ContextMenu.hideSectionPlane"),
                    hoverActiveTitle: this.viewer.localeService.translate("ContextMenu.showSectionPlane"),
                    isGroupSelect: false,
                    onActive: () => {
                        this.visible = false;
                        return true;
                    },
                    onDeactive: () => {
                        this.visible = true;
                        return true;
                    },
                },
            ],
        };
        this._popPanel = new SectionPlanePopPanel(
            "section-panel-poppanel",
            this.viewer.localeService.translate("Toolbar.axisSection"),
            config
        );
    }

    private removePopPanel() {
        this._popPanel?.destroy();
        this._popPanel = undefined;
    }

    private activeAndVisble(active: boolean) {
        this.activeSectionPlane(active);
        this._control.setVisible(active);
    }

    private activeSectionPlane(active: boolean) {
        if (this._sectionPlane) {
            this._sectionPlane.active = active;
        }
    }

    private createSectionPlane(params: CreateSectionPlaneParams) {
        if (params.id !== undefined && params.id !== null && this.viewer.scene.components[params.id]) {
            console.error("[SectionPlane] Viewer component with this ID already exists: " + params.id);
            params.id = undefined;
        }

        // Note that SectionPlane constructor fires "sectionPlaneCreated" on the Scene,
        // which SectionPlanesPlugin handles and calls #_sectionPlaneCreated to create gizmo and add to overview canvas.
        const sectionPlane = new SectionPlane(this.viewer.scene, {
            id: params.id,
            pos: params.pos,
            dir: params.dir,
            active: true || params.active,
        });
        return sectionPlane;
    }

    private updateSectionPlane() {
        if (!this._active) {
            return;
        }

        const axisInfo = this._axisInfoMap[this._axisType];

        if (this._sectionPlane) {
            this._sectionPlane.pos = axisInfo.pos;
            this._sectionPlane.dir = math.mulVec3Scalar(axisInfo.normal, 1);
        } else {
            this._sectionPlane = this.createSectionPlane({
                id: AXIS_SECTION_PLANE_ID,
                pos: axisInfo.pos,
                dir: math.mulVec3Scalar(axisInfo.normal, 1),
            });

            this._control.setSectionPlane(this._sectionPlane);
        }
        this.activeSectionPlane(true);
        this._control.setVisible(this.visible);
    }
    reset() {
        this.activeAndVisble(false);
        this._control.reset();
    }
    destroy() {
        if (this._sectionPlane) {
            this._sectionPlane.destroy();
        }
        if (this._control) {
            this._control.setSectionPlane(undefined);
            this._control.destroy();
        }

        super.destroy();
    }
}
