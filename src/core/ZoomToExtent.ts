/* eslint-disable @typescript-eslint/no-explicit-any */
import { math, Mesh, PhongMaterial, ReadableGeometry } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

const TOLERANCE = 1;
/**
 * Realizes 2d box zoomIn by mouse right on the plan view.
 */
export class ZoomToExtent {
    private _viewer: any;
    private _active = false;
    private _inputSubIds: number[] = [];

    private _mesh: any = undefined;
    private _extent = new Float32Array(12); // 2d box line has 4 point

    constructor(viewer: any) {
        this._viewer = viewer;

        // this.on("active", (active: boolean) => {
        //     if (active) {
        //         this._onMouseEvent();
        //     } else {
        //         this._destroyEvents();
        //     }
        // });
    }

    destroy() {
        this._destroyEvents();
    }

    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        // 2d mode
        if (active && this._viewer.cameraControl.navMode !== "planView") {
            console.log("[Zoom] The navmode of cameraControl is not planView");
            return;
        }
        this._active = active;
        //this.fire("active", this.activeInternal);
        if (active) {
            this._onMouseEvent();
        } else {
            this._destroyEvents();
        }
    }

    getActive(): boolean {
        return this._active;
    }

    private _onMouseEvent() {
        const startCanvasPos: number[] = [];

        let isMouseDown = false;
        const startWorldPos: number[] = [];
        const currentWorldPos: number[] = [];
        const screenPos: number[] = [];
        const viewPos: number[] = [];
        const input = this._viewer.scene.input;
        const cameraControl = this._viewer.cameraControl;
        const pointerEnabled = cameraControl.pointerEnabled;
        const sceneAABB = this._viewer.scene.getAABB(this._viewer.scene.visibleObjectIds);
        const maxY = sceneAABB[4];
        //const canvas = this.viewer.scene.canvas.canvas;
        //const cursor = canvas.style.cursor;
        //mouse left
        let subId = input.on(
            "mousedown",
            (coords: number[]) => {
                if (!(input.mouseDownLeft && this._active)) {
                    return;
                }
                startCanvasPos[0] = coords[0];
                startCanvasPos[1] = coords[1];

                isMouseDown = true;
                //canvas.style.cursor = "zoom-in";
                cameraControl.pointerEnabled = false;

                camera.project.unproject(startCanvasPos, 0, screenPos, viewPos, startWorldPos);
                startWorldPos[1] = maxY; //only consider 2d
            },
            this
        );

        this._inputSubIds.push(subId);

        const camera = this._viewer.scene.camera;
        subId = input.on(
            "mouseup",
            (coords: number[]) => {
                if (!(isMouseDown && this._active)) {
                    return;
                }
                cameraControl.pointerEnabled = pointerEnabled;
                //canvas.style.cursor = cursor;
                //zoom to box
                if (
                    Math.abs(startCanvasPos[0] - coords[0]) >= TOLERANCE &&
                    Math.abs(startCanvasPos[1] - coords[1]) >= TOLERANCE
                ) {
                    camera.project.unproject(coords, 0, screenPos, viewPos, currentWorldPos);
                    currentWorldPos[1] = maxY;
                    const aabb = math.positions3ToAABB3([...startWorldPos.slice(0, 3), ...currentWorldPos.slice(0, 3)]);
                    this._viewer.cameraFlight.flyTo({ aabb });
                }

                if (this._mesh) {
                    this._mesh.visible = false;
                }
                isMouseDown = false;
            },
            this
        );

        this._inputSubIds.push(subId);

        subId = input.on(
            "mousemove",
            (coords: number[]) => {
                if (!(isMouseDown && this._active)) {
                    return;
                }
                //Coords-startCanvasPos is greater than a threshold
                if (
                    Math.abs(startCanvasPos[0] - coords[0]) >= TOLERANCE &&
                    Math.abs(startCanvasPos[1] - coords[1]) >= TOLERANCE
                ) {
                    //draw box
                    camera.project.unproject(coords, 0, screenPos, viewPos, currentWorldPos);
                    currentWorldPos[1] = maxY;
                    const aabb = math.positions3ToAABB3([...startWorldPos.slice(0, 3), ...currentWorldPos.slice(0, 3)]);
                    this._drawBoxLine(aabb);
                }
            },
            this
        );

        this._inputSubIds.push(subId);
    }

    private _buildExtent(aabb: number[]) {
        const positions = this._extent;
        //four points have the same y.
        //first point
        positions[0] = aabb[0];
        positions[1] = aabb[1];
        positions[2] = aabb[2];
        //second point
        positions[3] = aabb[0];
        positions[4] = aabb[1];
        positions[5] = aabb[5];
        //third point
        positions[6] = aabb[3];
        positions[7] = aabb[1];
        positions[8] = aabb[5];
        //fourth point
        positions[9] = aabb[3];
        positions[10] = aabb[1];
        positions[11] = aabb[2];
    }

    private _drawBoxLine(aabb: number[]) {
        // positions.push(aabb[0], aabb[1], aabb[2]);
        // positions.push(aabb[0], aabb[1], aabb[5]);
        // positions.push(aabb[3], aabb[1], aabb[5]);
        // positions.push(aabb[3], aabb[1], aabb[2]);
        this._buildExtent(aabb);
        if (this._mesh) {
            this._mesh.geometry.positions = this._extent;
            if (!this._mesh.visible) {
                this._mesh.visible = true;
            }
        } else {
            this._mesh = new Mesh(this._viewer.scene, {
                geometry: new ReadableGeometry(this._viewer.scene, {
                    primitive: "lines",
                    positions: this._extent,
                    indices: [0, 1, 1, 2, 2, 3, 3, 0],
                }),
                material: new PhongMaterial(this._viewer.scene, {
                    emissive: [0.0, 0.5, 0.5],
                    lineWidth: 2,
                }),
                collidable: false,
            });
        }
    }

    private _destroyEvents() {
        const input = this._viewer.scene.input;
        this._inputSubIds.forEach((subId: number) => input.off(subId));
        this._inputSubIds = [];

        if (this._mesh !== undefined) {
            this._mesh.geometry.destroy();
            this._mesh.material.destroy();
            this._mesh.destroy();
            this._mesh = undefined;
        }

        this._active = false;
    }
}
