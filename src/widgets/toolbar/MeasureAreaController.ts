import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * MeasureAreaController
 */
export class MeasureAreaController extends ToolbarMenuBaseController {
    protected onClick(event: Event) {
        if (!this.getEnabled()) {
            return;
        }
        super.onClick(event);
        this.onActive(this._active);
    }

    /**
     * onActive can be triggered by 'click' event, also can be triggered by other events, e.g. anohter conflicted button is clicked.
     */
    protected onActive(active: boolean) {
        super.onActive(active);
        // this.bimViewer.activeAreaMeasurement(active);
        if (this.parent) {
            this.parent.setActive(active); // also update parent's status
        }
    }
}
