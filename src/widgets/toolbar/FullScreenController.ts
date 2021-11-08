import { Controller } from "../../core/Controller";
import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";
import { ToolbarMenuConfig } from "./ToolbarConfig";

/**
 * FullScreenController
 */
export class FullScreenController extends ToolbarMenuBaseController {
    constructor(parent: Controller, cfg: ToolbarMenuConfig, node: HTMLElement) {
        super(parent, cfg, node);
        document.addEventListener("fullscreenchange", () => {
            this._active = !!document.fullscreenElement;
            this.fire("active", this._active); // trigger it to add/remove corresponding css class in base class
        });
    }

    protected onClick(event: Event) {
        super.onClick(event);
        this.bimViewer.activeFullScreen(this._active);
    }
}
