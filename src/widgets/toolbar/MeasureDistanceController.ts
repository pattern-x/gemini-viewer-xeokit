import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";
import { ESC_KEY, KEYUP_EVENT } from "../../utils/Consts";

enum MeasurementState {
    HOVERING,
    FINDING_ORIGIN,
    FINDING_TARGET,
}

/**
 * MeasureDistanceController
 */
export class MeasureDistanceController extends ToolbarMenuBaseController {
    /**
     * onActive can be triggered by 'click' event, also can be triggered by other events, e.g. anohter conflicted button is clicked.
     */
    protected onActive(active: boolean) {
        super.onActive(active);
        this.bimViewer.suppressSingleSelection(active);
        this.bimViewer.activeDistanceMeasurement(active);
        if (this.parent) {
            this.parent.setActive(active); // also update parent's status
        }
        active
            ? document.addEventListener(KEYUP_EVENT, this.handleKeyUp)
            : document.removeEventListener(KEYUP_EVENT, this.handleKeyUp);
    }

    private handleKeyUp = (event: KeyboardEvent) => {
        const { key } = event;
        const control = this.bimViewer.distanceMeasurementsPlugin.control;
        if (key === ESC_KEY) {
            if (control._state === MeasurementState.FINDING_TARGET) {
                control._currentDistMeasurement.destroy();
                control._currentDistMeasurement = null;
                control._state = MeasurementState.HOVERING;
            } else {
                this.onClick(event);
            }
        }
    };
}
