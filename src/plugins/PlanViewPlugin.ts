import { math, Plugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { ZoomToExtent } from "../core/ZoomToExtent";
import { CameraConfig } from "../core/Configs";

/**
 * 2d plan view plugin
 */
export class PlanViewPlugin extends Plugin {
    private _active = false;
    private _zoomToExtent: ZoomToExtent;
    private _originalSettings: {
        navMode?: string;
        projection?: string;
        cameraCfg?: CameraConfig;
        navCubeVisible?: boolean;
    } = {};

    constructor(viewer: any) { // eslint-disable-line
        super("PlanViewPlugin", viewer, {});

        this._zoomToExtent = new ZoomToExtent(viewer);
    }

    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        active ? this.enter2dMode() : this.exit2dMode();
        this._active = active;
        this.fire("active", active);
    }

    getActive(): boolean {
        return this._active;
    }

    // reference to: https://github.com/xeokit/xeokit-bim-viewer/blob/master/src/toolbar/ThreeDMode.js
    enter2dMode() {
        const os = this._originalSettings;
        os.navMode = this.viewer.cameraControl.navMode;
        if (os.navMode !== "planView") {
            this.viewer.cameraControl.navMode = "planView";
        }
        os.projection = this.viewer.camera.projection;

        const tempVec3a = math.vec3();
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const aabb = scene.getAABB(scene.visibleObjectIds);
        const look2 = math.getAABB3Center(aabb);
        const diag = math.getAABB3Diag(aabb);
        const fitFOV = 45; // fitFOV;
        const sca = Math.abs(diag / Math.tan(fitFOV * math.DEGTORAD));
        const orthoScale2 = diag * 1.3;
        const eye2 = tempVec3a;

        eye2[0] = look2[0] + camera.worldUp[0] * sca;
        eye2[1] = look2[1] + camera.worldUp[1] * sca;
        eye2[2] = look2[2] + camera.worldUp[2] * sca;

        const up2 = math.mulVec3Scalar(camera.worldForward, -1, []);

        viewer.cameraFlight.flyTo(
            {
                eye: eye2,
                look: look2,
                up: up2,
                orthoScale: orthoScale2,
                projection: "ortho",
            },
            () => {
                const navCubePlugin = this.viewer._plugins.find((plugin: any) => plugin.id === "NavCube"); // eslint-disable-line
                if (navCubePlugin && navCubePlugin.getVisible() === true) {
                    os.navCubeVisible = true;
                    navCubePlugin.setVisible(false);
                }
            }
        );

        this._zoomToExtent.setActive(true);
    }

    exit2dMode() {
        const os = this._originalSettings;
        this.viewer.cameraControl.navMode = os.navMode;

        const tempVec3a = math.vec3();
        const viewer = this.viewer;
        const scene = viewer.scene;
        const aabb = scene.getAABB(scene.visibleObjectIds);
        const diag = math.getAABB3Diag(aabb);
        const center = math.getAABB3Center(aabb, tempVec3a);
        const dist = Math.abs(diag / Math.tan(65.0 / 2));
        const camera = scene.camera;
        const dir = camera.yUp ? [-1, -1, -1] : [1, 1, 1];
        const up = camera.yUp ? [-1, 1, -1] : [-1, 1, 1];

        viewer.cameraControl.pivotPos = center;

        if (os.navCubeVisible) {
            const navCubePlugin = this.viewer._plugins.find((plugin: any) => plugin.id === "NavCube"); // eslint-disable-line
            if (navCubePlugin) {
                navCubePlugin.setVisible(true);
            }
        }

        viewer.cameraFlight.flyTo({
            look: center,
            eye: [center[0] - dist * dir[0], center[1] - dist * dir[1], center[2] - dist * dir[2]],
            up: up,
            orthoScale: diag * 1.3,
            duration: 1,
            projection: os.projection,
        });

        this._zoomToExtent.setActive(false);
    }

    destroy(): void {
        super.destroy();
        this._zoomToExtent.destroy();
    }
}
