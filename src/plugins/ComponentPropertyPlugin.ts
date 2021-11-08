/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

import { SingleSelectionPlugin } from "./SingleSelectionPlugin";

export interface ComponentPropertyConfig {
    active?: boolean;
    singleSelectionControl: SingleSelectionPlugin;
}

export class ComponentPropertyPlugin extends Plugin {
    private _active = false;
    private _singleSelectionControl: SingleSelectionPlugin;
    private _lastEntity: any = undefined;

    constructor(viewer: any, cfg: ComponentPropertyConfig) { // eslint-disable-line
        super("ComponentProperty", viewer, cfg);

        this._active = !!cfg.active;
        this._singleSelectionControl = cfg.singleSelectionControl;

        this.attachEvent();
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

    private attachEvent(): void {
        const scope = this;
        this._singleSelectionControl.on("picked", (entity: any) => {
            if (!scope._active) {
                return;
            }
            scope._lastEntity = entity;
            this.fire("picked", entity);
            console.log(`[ComponentPropertyPlugin] entity:${entity}`);
        });
        this._singleSelectionControl.on("pickedNothing", () => {
            if (!scope._active) {
                return;
            }
            this.fire("pickedNothing");
        });
    }

    private destroyEvent(): void {
        console.warn("[ComponentPropertyPlugin] The plugin base class does not provide an off method.");
    }
}
