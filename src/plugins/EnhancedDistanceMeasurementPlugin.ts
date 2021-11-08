import { DistanceMeasurementsPlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { MOUSEMOVE_EVENT, MOUSEUP_EVENT } from "../utils/Consts";
import { Tooltip } from "../components/Tooltip";

const DISTANCE_MEASUREMENT_TOOLTIP_ID = "distance-measurement-tooltip";

export class EnhancedDistanceMeasurementPlugin extends DistanceMeasurementsPlugin {
    private _active = false;
    private _tooltip: Tooltip | undefined;

    // eslint-disable-next-line
    constructor(viewer: any, cfg: any = {}) {
        super(viewer, cfg);

        this.on("active", (active: boolean) => (active ? this.onActive() : this.onDeactive()));
    }

    get active(): boolean {
        return this._active;
    }

    set active(active: boolean) {
        if (this._active === active) {
            return;
        }
        this._active = active;

        this.fire("active", this._active);
    }

    private onActive = () => {
        this._control.activate();
        this.showAllmeasurements();
        this.attachEvents();
        this.createTooltip();
    };

    private onDeactive = () => {
        this._control.deactivate();
        this.hideAllmeasurements();
        this.destroyEvents();
        this.removeTooltip();
    };

    private changeCursor = () => {
        document.body.style.cursor = this._active ? "crosshair" : "default";
    };

    private changeStyle = () => {
        // eslint-disable-next-line
        Object.values(this._measurements).map((measurement: any) => {
            measurement._lengthWire._wire.classList.add("length-wire");
            measurement._xAxisWire._wire.classList.add("x-axis-wire");
            measurement._yAxisWire._wire.classList.add("y-axis-wire");
            measurement._zAxisWire._wire.classList.add("z-axis-wire");

            measurement._lengthLabel._label.classList.add("length-label");
            measurement._xAxisLabel._label.classList.add("x-axis-label");
            measurement._yAxisLabel._label.classList.add("y-axis-label");
            measurement._zAxisLabel._label.classList.add("z-axis-label");
        });
    };

    private attachEvents = () => {
        document.addEventListener(MOUSEMOVE_EVENT, this.changeCursor);
        document.addEventListener(MOUSEUP_EVENT, this.changeStyle);
    };

    private createTooltip = () => {
        this._tooltip = new Tooltip(DISTANCE_MEASUREMENT_TOOLTIP_ID, this.viewer.localeService.translate("Tooltip.measure"), {
            followPointer: true,
            parentNode: this._container,
            target: this.viewer.scene.canvas.canvas,
        });
    };

    private removeTooltip = () => {
        this._tooltip?.destroy();
        this._tooltip = undefined;
    };

    private hideAllmeasurements = () => {
        // eslint-disable-next-line
        Object.values(this._measurements).map((measurement: any) => {
            measurement.visible = false;
        });
    };

    private showAllmeasurements = () => {
        // eslint-disable-next-line
        Object.values(this._measurements).map((measurement: any) => {
            measurement.visible = true;
        });
    };

    private destroyEvents = () => {
        document.removeEventListener(MOUSEMOVE_EVENT, this.changeCursor);
        document.removeEventListener(MOUSEUP_EVENT, this.changeStyle);
        console.warn("[Measure] The plugin base class does not provide an off method.");
    };

    destroy = () => {
        this.destroyEvents();
        this.removeTooltip();
        super.destroy();
    };
}
