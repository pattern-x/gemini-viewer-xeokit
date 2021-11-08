/* eslint-disable @typescript-eslint/no-explicit-any */
import { math, Plugin, SectionPlane } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { PlaneControl } from "../widgets/section/PlaneControl";
import { SECTION_PLANE_CONTROL_ID, SECTION_PLANE_ID } from "../utils/Consts";
import { SectionPlanePopPanel } from "../components/SectionPlanePopPanel";
import { Tooltip } from "../components/Tooltip";

interface SectionPlaneConfig {
    active: boolean;
}

interface CreateSectionPlaneParams {
    id?: string;
    pos: number[];
    dir: number[];
    active?: boolean;
}

export class SectionPlanePlugin extends Plugin {
    private _active = false;
    private _sectionPlane: any = undefined;
    private _control: PlaneControl;
    private _needChangeSectionPlane = true;
    private _inputSubIds: string[] = []; // event subscription ids of the input class, used to un-register events
    private _tooltip: Tooltip | undefined;
    private _popPanel: SectionPlanePopPanel | undefined;

    constructor(viewer: any, cfg?: SectionPlaneConfig) {
        super("SectionPlane", viewer);

        this._active = !!(cfg && cfg.active);

        this._control = new PlaneControl(SECTION_PLANE_CONTROL_ID, this);

        this.initSectionPlane();

        this.on("active", (active: boolean) => {
            this.activeSectionPlane(active);
            this.activeTooltip(active);
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
        // activeItem's order was defined by config
        // activeItem's active means hiding section plane
        this._popPanel?.setActiveSelectItem(0, !value);
    }

    get visible() {
        return this._control.getVisible();
    }

    reset() {
        this._needChangeSectionPlane = true;
        this.activeAndVisble(false);
        this._control.reset();
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

    private initSectionPlane() {
        const scene = this.viewer.scene;
        this._inputSubIds.push(
            scene.input.on(
                "mouseclicked",
                (coords: number[]) => {
                    if (!this._active || !this._needChangeSectionPlane) {
                        return;
                    }

                    const pickResult = scene.pick({
                        canvasPos: coords,
                        pickSurface: true, // This causes picking to find the intersection point on the entity
                    });

                    if (pickResult && pickResult.worldPos && pickResult.worldNormal) {
                        if (this._sectionPlane) {
                            this._sectionPlane.pos = pickResult.worldPos;
                            this._sectionPlane.dir = math.mulVec3Scalar(pickResult.worldNormal, -1);
                        } else {
                            this._sectionPlane = this.createSectionPlane({
                                id: SECTION_PLANE_ID,
                                pos: pickResult.worldPos,
                                dir: math.mulVec3Scalar(pickResult.worldNormal, -1),
                            });

                            this._control.setSectionPlane(this._sectionPlane);
                        }
                        this.activeAndVisble(true);
                        this._needChangeSectionPlane = false;
                        if (!this._popPanel) {
                            this.activePopPanel(true);
                        } else {
                            this._popPanel?.enableActiveSelectItems();
                        }
                        this.removeTooltip();
                    }
                },
                this
            )
        );
    }

    private activeTooltip(active: boolean) {
        active ? this.createTooltip() : this.removeTooltip();
    }

    private createTooltip() {
        if (this._tooltip) {
            return;
        }
        this._tooltip = new Tooltip("section-panel-tooltip", this.viewer.localeService.translate("Tooltip.section"), {
            followPointer: true,
            target: this.viewer.scene.canvas.canvas,
        });
    }

    private removeTooltip() {
        this._tooltip?.destroy();
        this._tooltip = undefined;
    }

    private activePopPanel(active: boolean) {
        active ? this.createPopPanel() : this.removePopPanel();
    }

    private createPopPanel() {
        const config = {
            activeSelectItems: [
                {
                    itemName: "togglePlaneVisible",
                    iconClass: "icon-hidesectionplane",
                    iconActiveClass: "icon-showsectionplane",
                    hoverTitle: this.viewer.localeService.translate("ContextMenu.hideSectionPlane"),
                    hoverActiveTitle: this.viewer.localeService.translate("ContextMenu.showSectionPlane"),
                    canDisable: true,
                    onActive: () => {
                        if (this._needChangeSectionPlane) {
                            return false;
                        }
                        this.visible = false;
                        return true;
                    },
                    onDeactive: () => {
                        if (this._needChangeSectionPlane) {
                            return false;
                        }
                        this.visible = true;
                        return true;
                    },
                },
                {
                    itemName: "refreshPlaneVisible",
                    iconClass: "icon-reset",
                    hoverTitle: this.viewer.localeService.translate("Toolbar.axisSection"),
                    isClickable: true,
                    isResetAll: true,
                    onClick: () => {
                        this.reset();
                        this.activeTooltip(true);
                        this._popPanel?.disableActiveSelectItems();
                    },
                },
            ],
        };
        this._popPanel = new SectionPlanePopPanel(
            "section-panel-poppanel",
            this.viewer.localeService.translate("Toolbar.pickSectionPlane"),
            config
        );
    }

    private removePopPanel() {
        this._popPanel?.destroy();
        this._popPanel = undefined;
    }

    destroy() {
        this._inputSubIds.forEach((subId: string) => this.viewer.scene.input.off(subId));

        if (this._sectionPlane) {
            this._sectionPlane.destroy();
        }
        if (this._control) {
            this._control.setSectionPlane(undefined);
            this._control.destroy();
        }

        this.removeTooltip();

        super.destroy();
    }
}
