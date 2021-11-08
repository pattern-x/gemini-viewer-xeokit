import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * MeasureClearController
 */
export class MeasureClearController extends ToolbarMenuBaseController {
    protected onActive(active: boolean) {
        super.onActive(active);
        setTimeout(() => this.setActive(false), 300); // de-active it after 0.3s
    }

    protected onClick(event: Event) {
        super.onClick(event);
        this.bimViewer.distanceMeasurementsPlugin.clear();
    }
}
