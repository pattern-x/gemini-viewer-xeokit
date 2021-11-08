import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * PropertyController
 */
export class PropertyController extends ToolbarMenuBaseController {
    /**
     * onActive can be triggered by 'click' event, also can be triggered by other events, e.g. anohter conflicted button is clicked.
     */
    protected onActive(active: boolean) {
        super.onActive(active);
        this.bimViewer.suppressSingleSelection(!active);
        this.bimViewer.activeProperty(active);
    }
}
