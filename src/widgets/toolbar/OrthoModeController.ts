import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * OrthoModeController
 */
export class OrthoModeController extends ToolbarMenuBaseController {
    protected onClick(event: Event) {
        super.onClick(event);
        this.bimViewer.activeOrthoMode(this._active);
    }
}
