import { BimViewer } from "../core/BimViewer";
import { CommonUtils } from "../utils/CommonUtils";
import { Mesh } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { Tooltip } from "./Tooltip";
import { ICON_FONT_CLASS } from "../utils/Consts";

const STATISTICS_TOOLTIP_ID = "statistic-tooltip";
const CAMERAINFO_TOOLTIP_ID = "camerainfo-tooltip";
const BOTTOM_BAR_ID = "bottomBar";

interface BottomBarItem {
    icon: HTMLElement;
    content: HTMLSpanElement;
    active: boolean;
}

export class BottomBar {
    private _bimViewer?: BimViewer;
    private _subIds: { camera: number[]; scene: number[]; input: number[] } = { camera: [], scene: [], input: [] }; // event subscription ids, used to un-register events
    private _fps: BottomBarItem;
    private _statistics: BottomBarItem;
    private _cameraInfo: BottomBarItem;
    private _location: BottomBarItem;
    private _cameraInfoTooltip: Tooltip;
    private _statisticsTooltip: Tooltip;

    constructor(bimViewer: BimViewer) {
        this._bimViewer = bimViewer;

        this._statistics = this.createBottomBarItem("icon-info-filled", this.toggleActiveStatistics);
        this._statisticsTooltip = new Tooltip(STATISTICS_TOOLTIP_ID, this._statistics.content, {
            parentNode: this._bimViewer.rootHtmlElement,
        });

        this._cameraInfo = this.createBottomBarItem("icon-view-filled", this.toggleActiveCameraInfo);
        this._cameraInfoTooltip = new Tooltip(CAMERAINFO_TOOLTIP_ID, this._cameraInfo.content, {
            parentNode: this._bimViewer.rootHtmlElement,
        });

        this._fps = this.createBottomBarItem();
        this._fps.content.classList.add("fps");

        this._location = this.createBottomBarItem("icon-location-filled", this.toggleActivePickLocation);

        this.createBottomBar();

        const camera = bimViewer.viewer.camera;
        // "up" event seems useless for now, so no borther
        this._subIds.camera.push(camera.on("eye", this.updateCameraInfo));
        this._subIds.camera.push(camera.on("look", this.updateCameraInfo));

        const scene = bimViewer.viewer.scene;
        this._subIds.scene.push(scene.on("tick", this.updateFps())); // eslint-disable-line
        // detect "mousedown" rather than "mousemove" because the later has a performance degrade!
        this._subIds.input.push(scene.input.on("mousedown", this.updateMouseLocation)); // eslint-disable-line
    }

    private createBottomBarItem = (iconClass?: string, clickHandler?: () => void) => {
        const item = {
            icon: document.createElement("i"),
            content: document.createElement("span"),
            active: false,
        };
        item.icon.classList.add(ICON_FONT_CLASS);
        iconClass && item.icon.classList.add(iconClass);
        clickHandler && (item.icon.onclick = () => clickHandler());

        return item;
    };

    private changeIconStyle = (item: BottomBarItem) => {
        item.active ? item.icon.classList.add("item-active") : item.icon.classList.remove("item-active");
    };

    private createBottomBar = () => {
        const myBottomBar: HTMLElement = document.createElement("div");
        myBottomBar.id = BOTTOM_BAR_ID;
        myBottomBar.classList.add("gemini-bottom-bar");

        const bottomBarElement: HTMLElement[] = [
            this._statistics.icon,
            this._cameraInfo.icon,
            this._fps.content,
            this._location.icon,
            this._location.content,
        ];

        bottomBarElement.forEach((element) => myBottomBar.appendChild(element));
        this._bimViewer?.rootHtmlElement.appendChild(myBottomBar);
    };

    private toggleActiveStatistics = (active?: boolean) => {
        this._statistics.active = active !== undefined ? active : !this._statistics.active;
        this._statistics.active && this.toggleActiveCameraInfo(false);
        this.changeIconStyle(this._statistics);

        if (this._statistics.active) {
            this._statisticsTooltip.show();
            this.updateStatistics();
        } else {
            this._statisticsTooltip.hide();
        }
    };

    private updateStatistics = () => {
        if (!this._bimViewer || !this._bimViewer.viewer) {
            return;
        }
        const {
            scene,
            scene: { numObjects },
        } = this._bimViewer.viewer;

        let numMeshes = 0;
        let numTriangles = 0;
        // eslint-disable-next-line
        Object.values(scene.objects).forEach((object: any) => {
            // function to statistic a mesh
            // eslint-disable-next-line
            const countMesh = (mesh: any) => {
                numMeshes++;
                numTriangles += mesh.numTriangles || 0;
            };
            if (object instanceof Mesh) {
                countMesh(object);
            }
            if (Array.isArray(object.meshes)) {
                object.meshes.forEach((mesh: any) => countMesh(mesh)); // eslint-disable-line
            }
        });

        this._statistics.content.innerHTML = `
            <p><span>Objects:</span>${numObjects}</p>
            <p><span>Meshes:</span>${numMeshes}</p>
            <p><span>Triangles:</span>${numTriangles}</p>
        `;
    };

    private toggleActiveCameraInfo = (enable?: boolean) => {
        this._cameraInfo.active = enable !== undefined ? enable : !this._cameraInfo.active;
        this._cameraInfo.active && this.toggleActiveStatistics(false);
        this.changeIconStyle(this._cameraInfo);
        this._cameraInfo.active ? this._cameraInfoTooltip.show() : this._cameraInfoTooltip.hide();
    };

    private updateCameraInfo = () => {
        if (!this._bimViewer || !this._bimViewer.viewer) {
            return;
        }
        const {
            camera: { eye, look, up },
        } = this._bimViewer.viewer;

        const f = (num: number) => num.toFixed(2); // function
        const p2t = (p: number[]) => `(${f(p[0])}, ${f(p[1])}, ${f(p[2])})`; // function: point to text
        this._cameraInfo.content.innerHTML = `
            <p><span>eye:</span>${p2t(eye)}</p>
            <p><span>look:</span>${p2t(look)}</p>
            <p><span>up:</span>${p2t(up)}</p>
        `;
    };

    // reference to code: https://github.com/xeokit/xeokit-sdk/blob/master/src/viewer/scene/core.js
    private updateFps = () => {
        let lastTime = 0; // used to calculate fps
        const fpsSamples: number[] = [];
        const numFPSSamples = 30;
        let totalFPS = 0;

        // eslint-disable-next-line
        return (tickEvent: any) => {
            const time = tickEvent.time;
            if (lastTime > 0) {
                // Log FPS stats
                const elapsedTime = time - lastTime;
                const newFPS = 1000 / elapsedTime; // Moving average of FPS
                totalFPS += newFPS;
                fpsSamples.push(newFPS);
                if (fpsSamples.length >= numFPSSamples) {
                    const oldestFps = fpsSamples.shift();
                    if (oldestFps) {
                        totalFPS -= oldestFps;
                    }
                }
                const fps = Math.round(totalFPS / fpsSamples.length);
                this._fps.content.innerHTML = `${fps} fps`;
            }
            lastTime = time;
        };
    };

    private toggleActivePickLocation = () => {
        this._location.active = !this._location.active;
        this.changeIconStyle(this._location);
        this._location.content.innerHTML = this._location.active ? "--" : "";
    };

    private updateMouseLocation = (canvasPos: [number, number]) => {
        const { scene } = (this._bimViewer as BimViewer).viewer;
        if (!scene || !this._location.active) {
            return;
        }
        const hit = scene.pick({ pickSurface: true, canvasPos });
        this._location.content.innerHTML = hit && hit.worldPos ? `pos: (${CommonUtils.numbersToString(hit.worldPos)})` : "--"; // mouse is not hovered on any entity
    };

    destroy = () => {
        if (!this._bimViewer) {
            return;
        }
        const { viewer } = this._bimViewer;
        this._subIds.camera.forEach((subId: number) => viewer.camera.off(subId));
        this._subIds.scene.forEach((subId: number) => viewer.scene.off(subId));
        this._subIds.input.forEach((subId: number) => viewer.scene.input.off(subId));
        this._bimViewer = undefined;
        this.removeTooltip();
        this.removeBottomBar();
    };

    private removeBottomBar = () => {
        document.getElementById(BOTTOM_BAR_ID)?.remove();
    };

    private removeTooltip = () => {
        this._statisticsTooltip.destroy();
        this._cameraInfoTooltip.destroy();
    };
}
