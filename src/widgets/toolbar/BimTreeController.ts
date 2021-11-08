import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * BimTreeController
 */
export class BimTreeController extends ToolbarMenuBaseController {
    protected onClick(event: Event) {
        super.onClick(event);
        this.bimViewer.activeBimTree(this._active);
    }
}
