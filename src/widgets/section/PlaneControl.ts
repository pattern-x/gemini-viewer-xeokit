/**
 * Reference to: https://github.com/xeokit/xeokit-sdk/blob/master/src/plugins/SectionPlanesPlugin/Control.js
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BuildPlanePositionConfig, GeometryUtils } from "../../utils/GeometryUtils";
import { CommonUtils } from "../../utils/CommonUtils";

import {
    buildCylinderGeometry,
    buildSphereGeometry,
    buildTorusGeometry,
    EdgeMaterial,
    EmphasisMaterial,
    math,
    Mesh,
    Node,
    PhongMaterial,
    ReadableGeometry,
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

enum Axis {
    X = "x",
    Y = "y",
    Z = "z",
}

enum PlaneScaleType {
    LEFT = "Left",
    RIGHT = "Right",
    TOP = "Top",
    BOTTOM = "Bottom",
}

const zeroVec = new Float64Array([0, 0, 1]);
const quat = new Float64Array(4);
const NO_STATE_INHERIT = false;
const EPSILON2 = 0.01;
const SCALE_RADIO = 0.08;
const MIN_DISTANCE = 5; // Minimum distance from center point
const GEOMETRY_RADIUS = 0.5; // Geometric default initial size
const ARROW_RADIUS = (7 * GEOMETRY_RADIUS) / 50.0;
const HOOP_RADIUS = 2 * GEOMETRY_RADIUS - 0.2;
const DEFAULT_COLOR = [0.0, 0.855, 0.718];
const ARROW_TYPE = "_Arrow";
const CURVE_TYPE = "_Curve";
const HANDLE_TYPE = "_Handle";
const PLANE_TYPE = "_Plane";
const HOOP_TYPE = "_Hoop";
const HIGHLIGHTED_TYPE = "_Highlighted";
const SPHERE_TYPE = "Sphere";

export class PlaneControl {
    private _id: string;
    private _viewer: any;
    private _visible = false;
    private _rootNode: any; // Root of Node graph that represents this control in the 3D scene
    private _visibleMeshes: Map<string, any> = new Map(); // Meshes that are always visible
    private _hoverVisibleMeshes: Map<string, any> = new Map(); // Meshes displayed momentarily for affordance

    private _sectionPlane: any = undefined;
    private _ignoreNextSectionPlaneDirUpdate = false;

    private _sceneSubIds: number[] = []; // event subscription ids of the scene class, used to un-register events
    private _cameraControlSubIds: number[] = []; // event subscription ids of the cameraControl class, used to un-register events
    private _inputSubIds: number[] = []; // event subscription ids of the input class, used to un-register events
    private _sectionPlaneSubIds: number[] = []; // event subscription ids of the sectionPlane class, used to un-register events

    constructor(id: string, owner: any) {
        this._viewer = owner.viewer;
        this._id = id;
        this.createNodes();
        this.bindEvents();
    }

    setSectionPlane(sectionPlane: any) {
        if (this._sectionPlane) {
            this._sectionPlaneSubIds.forEach((subId: number) => this._sectionPlane.off(subId));
            this._sectionPlane = undefined;
        }
        if (sectionPlane) {
            this.setPosition(sectionPlane.pos);
            this.setDirection(sectionPlane.dir);
            this.reset();
            this._sectionPlane = sectionPlane;
            this._sectionPlaneSubIds.push(sectionPlane.on("pos", () => this.setPosition(this._sectionPlane.pos)));
            this._sectionPlaneSubIds.push(
                sectionPlane.on("dir", () => {
                    if (!this._ignoreNextSectionPlaneDirUpdate) {
                        this.setDirection(this._sectionPlane.dir);
                    }
                    this._ignoreNextSectionPlaneDirUpdate = false;
                })
            );
        }
    }

    setVisible(visible = true) {
        if (this._visible === visible) {
            return;
        }
        this._visible = visible;
        this._visibleMeshes.forEach((mesh: any) => (mesh.visible = visible));
        this._hoverVisibleMeshes.forEach((mesh: any) => (mesh.visible = false));
    }

    getVisible() {
        return this._visible;
    }

    /**
     * Sets if this Control is culled. This is called by SectionPlanesPlugin to
     * temporarily hide the Control while a snapshot is being taken by Viewer#getSnapshot().
     */
    setCulled(culled: boolean) {
        this._visibleMeshes.forEach((mesh: any) => (mesh.culled = culled));
    }

    reset() {
        this._ignoreNextSectionPlaneDirUpdate = false;

        const aabb = this._viewer.scene.getAABB(this._viewer.scene.visibleObjectIds);
        let length = math.getAABB3Diag(aabb);
        length /= 2.0;
        length = Math.max(length, MIN_DISTANCE);
        this.setPlanePosition({
            left: -length,
            right: length,
            bottom: -length,
            top: length,
        });
    }

    //Set four points on the plane.left\right\bottom\top
    private setPlanePosition(cfg: BuildPlanePositionConfig) {
        const mesh = this._visibleMeshes.get(PLANE_TYPE);
        mesh.geometry.positions = GeometryUtils.buildPlanePosition(cfg);
        const hoverVisibleMeshes = this._hoverVisibleMeshes;
        hoverVisibleMeshes.get(PlaneScaleType.LEFT).position = [cfg.left, 0, 0];
        hoverVisibleMeshes.get(PlaneScaleType.RIGHT).position = [cfg.right, 0, 0];
        hoverVisibleMeshes.get(PlaneScaleType.BOTTOM).position = [0, cfg.bottom, 0];
        hoverVisibleMeshes.get(PlaneScaleType.TOP).position = [0, cfg.top, 0];
    }

    private setPosition(value: number[]) {
        this._rootNode.position = [...value];
    }

    private setDirection(value: number[]) {
        this._rootNode.quaternion = math.vec3PairToQuaternion(zeroVec, value, quat);
    }

    private setSectionPlaneDir(value: number[]) {
        if (this._sectionPlane) {
            this._ignoreNextSectionPlaneDirUpdate = true;
            this._sectionPlane.dir = value;
        }
    }

    private createMeshes(shapes: { [key: string]: any }, materials: { [key: string]: any }) {
        const entityParams = {
            collidable: false, // Don't participate in the calculation of the scene aabb when collidable is false.
            clippable: false,
            visible: false,
        };

        const rootNode = this._rootNode;
        const childNode = new Node(rootNode, {
            collidable: false,
        });
        rootNode.addChild(childNode, NO_STATE_INHERIT);
        this.createHoverVisibleMesh(shapes, materials, childNode);

        //The plane corresponding to sectionPlane
        const planeParams = {
            id: this._id,
            geometry: shapes.plane,
            material: materials.pickable,
            edges: true,
            edgeMaterial: materials.planeEdge,
            highlightMaterial: materials.planeHighlighted,
            pickable: true,
            layer: 1,
            ...entityParams,
        };

        this._visibleMeshes.set(PLANE_TYPE, rootNode.addChild(new Mesh(rootNode, planeParams), NO_STATE_INHERIT));
    }

    private createHoverVisibleMesh(shapes: { [key: string]: any }, materials: { [key: string]: any }, parentNode: any) {
        const auxiliaryControlNode = new Node(parentNode, {
            collidable: false,
        });
        parentNode.addChild(auxiliaryControlNode, NO_STATE_INHERIT);

        const createMesh = (
            id: string,
            geometry: any,
            material: any,
            matrix?: any,
            pickable = false,
            rotation = [0, 0, 0],
            highlighted = false,
            highlightMaterial = materials.highlightRed,
            node = auxiliaryControlNode
        ) => {
            const cfg = {
                geometry,
                material,
                matrix,
                pickable,
                rotation,
                highlighted,
                highlightMaterial,
                collidable: false,
                clippable: false,
                visible: false,
            };
            const mesh = new Mesh(node, cfg);
            this._hoverVisibleMeshes.set(id, node.addChild(mesh, NO_STATE_INHERIT));
        };
        const scale = math.scaleMat4v([0.6, 0.6, 0.6], math.identityMat4());
        const rotate = (degree: number, vec3: number[]) =>
            math.rotationMat4v(degree * math.DEGTORAD, vec3, math.identityMat4());
        const translate = (x: number, y: number, z: number) => math.translateMat4c(x, y, z, math.identityMat4());
        const mulMat4 = (a: any, b = scale) => math.mulMat4(a, b, math.identityMat4());

        const createAuxiliaryRotateMeshes = (
            type: Axis,
            curveMatrix: any,
            arrow1Matrix: any,
            arrow2Matrix: any,
            material: any,
            highlightMaterial: any
        ) => {
            createMesh(CommonUtils.joinStrings(type, CURVE_TYPE), shapes.curve, material, curveMatrix);
            createMesh(
                CommonUtils.joinStrings(type, CURVE_TYPE, HANDLE_TYPE),
                shapes.curveHandle,
                materials.pickable,
                curveMatrix,
                true
            );
            createMesh(
                CommonUtils.joinStrings(type, HOOP_TYPE),
                shapes.hoop,
                material,
                curveMatrix,
                false,
                undefined,
                true,
                highlightMaterial,
                parentNode
            );

            createMesh(
                CommonUtils.joinStrings(type, CURVE_TYPE, ARROW_TYPE, "1"),
                shapes.arrowHead,
                material,
                arrow1Matrix,
                true
            );
            createMesh(
                CommonUtils.joinStrings(type, CURVE_TYPE, ARROW_TYPE, "2"),
                shapes.arrowHead,
                material,
                arrow2Matrix,
                true
            );
        };

        // Auxiliary mesh that rotate around the x axis
        let matrix = mulMat4(rotate(270, [1, 0, 0]), rotate(90, [0, 1, 0]));
        let arrowMatrix = mulMat4(translate(0, -ARROW_RADIUS, -HOOP_RADIUS));
        let arrowMatrix2 = mulMat4(mulMat4(translate(0.0, -HOOP_RADIUS, -ARROW_RADIUS)), rotate(90, [1, 0, 0]));
        createAuxiliaryRotateMeshes(Axis.X, matrix, arrowMatrix, arrowMatrix2, materials.red, materials.highlightRed);

        // Auxiliary mesh that rotate around the y axis
        matrix = rotate(-90, [1, 0, 0]);
        arrowMatrix = mulMat4(mulMat4(translate(ARROW_RADIUS, 0, -HOOP_RADIUS)), rotate(90, [0, 0, 1]));
        arrowMatrix2 = mulMat4(mulMat4(translate(HOOP_RADIUS, 0.0, -ARROW_RADIUS)), rotate(90, [1, 0, 0]));
        createAuxiliaryRotateMeshes(Axis.Y, matrix, arrowMatrix, arrowMatrix2, materials.green, materials.highlightGreen);

        // Auxiliary mesh that rotate around the z axis
        matrix = math.rotationMat4v(180 * math.DEGTORAD, [1, 0, 0]);
        arrowMatrix = mulMat4(translate(HOOP_RADIUS, -ARROW_RADIUS, 0));
        arrowMatrix2 = mulMat4(mulMat4(translate(ARROW_RADIUS, -HOOP_RADIUS, 0)), rotate(90, [0, 0, 1]));
        createAuxiliaryRotateMeshes(Axis.Z, matrix, arrowMatrix, arrowMatrix2, materials.blue, materials.highlightBlue);

        const createAuxiliaryTranslateMeshes = (
            type: Axis,
            axisMatrix: any,
            arrowMatrix: any,
            material: any,
            highlightMaterial: any
        ) => {
            createMesh(CommonUtils.joinStrings(type, ARROW_TYPE), shapes.arrowHead, material, arrowMatrix);
            createMesh(
                CommonUtils.joinStrings(type, ARROW_TYPE, HANDLE_TYPE),
                shapes.arrowHeadHandle,
                materials.pickable,
                arrowMatrix,
                true
            );
            createMesh(
                CommonUtils.joinStrings(type, ARROW_TYPE, HIGHLIGHTED_TYPE),
                shapes.arrowHeadBig,
                material,
                arrowMatrix,
                false,
                undefined,
                true,
                highlightMaterial,
                parentNode
            );

            createMesh(type, shapes.axis, material, axisMatrix);
            createMesh(CommonUtils.joinStrings(type, HANDLE_TYPE), shapes.axisHandle, materials.pickable, axisMatrix, true);
        };
        // Auxiliary mesh that translate on the x axis
        arrowMatrix = mulMat4(rotate(-90, [0, 0, 1]), translate(0, 2 * GEOMETRY_RADIUS + 0.1, 0));
        matrix = mulMat4(rotate(-90, [0, 0, 1]), translate(0, GEOMETRY_RADIUS, 0));
        createAuxiliaryTranslateMeshes(Axis.X, matrix, arrowMatrix, materials.red, materials.highlightRed);

        // Auxiliary mesh that translate on the y axis
        arrowMatrix = mulMat4(rotate(180, [1, 0, 0]), translate(0, 2 * GEOMETRY_RADIUS + 0.1, 0));
        matrix = translate(0, -GEOMETRY_RADIUS, 0);
        createAuxiliaryTranslateMeshes(Axis.Y, matrix, arrowMatrix, materials.green, materials.highlightGreen);

        // Auxiliary mesh that translate on the z axis
        arrowMatrix = mulMat4(rotate(-90, [1, 0, 0]), translate(0, 2 * GEOMETRY_RADIUS + 0.1, 0));
        matrix = mulMat4(rotate(-90, [1, 0, 0]), translate(0, GEOMETRY_RADIUS, 0));
        createAuxiliaryTranslateMeshes(Axis.Z, matrix, arrowMatrix, materials.blue, materials.highlightBlue);

        // Center ball
        createMesh(SPHERE_TYPE, shapes.sphere, materials.center);

        // Auxiliary plane zoom
        const rootNode = this._rootNode;
        const scaleAuxiliaryNode = new Node(rootNode, {
            collidable: false,
        });
        rootNode.addChild(scaleAuxiliaryNode, NO_STATE_INHERIT);
        // const sphereScaleParams = {
        //     geometry: shapes.sphere,
        //     material: materials.center,
        //     pickable: true,
        //     ...entityParams,
        // };
        Object.values(PlaneScaleType).forEach((type) => {
            // this._visibleMeshes.set(
            //     type,
            //     scaleAuxiliaryNode.addChild(new Mesh(scaleAuxiliaryNode, sphereScaleParams), NO_STATE_INHERIT)
            // );
            createMesh(type, shapes.sphere, materials.center, undefined, true, undefined, false, undefined, scaleAuxiliaryNode);
        });
    }

    /**
     * Builds the Entities that represent this Control.
     */
    private createNodes() {
        const scene = this._viewer.scene;
        const radius = 2 * GEOMETRY_RADIUS;
        const tubeRadius = GEOMETRY_RADIUS / 50.0;
        const handleTubeRadius = 6 * tubeRadius;

        this._rootNode = new Node(scene, { collidable: false });
        const rootNode = this._rootNode;

        const createCylinderGeometry = (
            radiusTop: number,
            radiusBottom: number,
            height: number,
            radialSegments = 80,
            heightSegments = 8,
            openEnded = false
        ) =>
            new ReadableGeometry(
                rootNode,
                buildCylinderGeometry({ radiusTop, radiusBottom, radialSegments, heightSegments, height, openEnded })
            );
        const createTorusGeometry = (radius: number, tube: number, arc: number, radialSegments = 80, tubeSegments = 8) =>
            new ReadableGeometry(rootNode, buildTorusGeometry({ radius, tube, radialSegments, tubeSegments, arc }));

        // Reusable geometries
        const shapes: { [key: string]: any } = {
            plane: new ReadableGeometry(
                rootNode,
                GeometryUtils.buildPlaneGeometry({ width: radius, height: radius, isClockwise: true })
            ),
            arrowHead: createCylinderGeometry(0.001, ARROW_RADIUS, GEOMETRY_RADIUS / 2.5, 32, 1),
            arrowHeadBig: createCylinderGeometry(0.001, 9 * tubeRadius, GEOMETRY_RADIUS / 2.0, 32, 1),
            //TODO.Expanding the geometry is good for being selected
            arrowHeadHandle: createCylinderGeometry(9 * tubeRadius, 9 * tubeRadius, GEOMETRY_RADIUS / 2.0, 8, 1),
            axis: createCylinderGeometry(tubeRadius, tubeRadius, radius, 20, 1),
            axisHandle: createCylinderGeometry(8 * tubeRadius, 8 * tubeRadius, radius, 20, 1),
            curve: createTorusGeometry(HOOP_RADIUS, tubeRadius, (Math.PI * 2.0) / 4.0, 64, 14),
            curveHandle: createTorusGeometry(HOOP_RADIUS, handleTubeRadius, (Math.PI * 2.0) / 4.0, 64, 14),
            hoop: createTorusGeometry(HOOP_RADIUS, tubeRadius, Math.PI * 2.0, 64, 8),
            sphere: new ReadableGeometry(rootNode, buildSphereGeometry({ radius: 0.05 })),
        };

        const createPhongMaterial = (color: number[], lineWidth = 2) =>
            new PhongMaterial(rootNode, {
                diffuse: color,
                emissive: color,
                ambient: [0, 0, 0],
                specular: [1, 1, 1],
                shininess: 80,
                lineWidth,
            });
        const createEmphasisMaterial = (fillColor: number[], fillAlpha = 1.0, edges = false, backfaces = false) =>
            new EmphasisMaterial(rootNode, { fill: true, fillColor, fillAlpha, edges, backfaces });

        // Reusable materials
        const materials: { [key: string]: any } = {
            pickable: new PhongMaterial(rootNode, {
                // Invisible material for pickable handles, which define a pickable 3D area
                diffuse: [1, 1, 1],
                alpha: 0, // Invisible
                alphaMode: "blend",
            }),
            planeEdge: new EdgeMaterial(rootNode, {
                edgeColor: DEFAULT_COLOR,
                edgeAlpha: 1.0,
            }),
            red: createPhongMaterial([1, 0, 0]),
            green: createPhongMaterial([0, 1, 0]),
            blue: createPhongMaterial([0, 0, 1]),
            center: createPhongMaterial(DEFAULT_COLOR),
            planeHighlighted: createEmphasisMaterial(DEFAULT_COLOR, 0.1),
            highlightRed: createEmphasisMaterial([1, 0, 0], 0.6),
            highlightGreen: createEmphasisMaterial([0, 1, 0], 0.6),
            highlightBlue: createEmphasisMaterial([0, 0, 1], 0.6),
        };

        this.createMeshes(shapes, materials);
    }

    private bindEvents() {
        const DRAG_ACTIONS = {
            none: -1,
            xTranslate: 0,
            yTranslate: 1,
            zTranslate: 2,
            xRotate: 3,
            yRotate: 4,
            zRotate: 5,
            xScale: 6,
            yScale: 7,
        };

        let grabbing = false;
        let lastPickedMesh: any = undefined;
        let lastHoverVisibleMesh: any = undefined;
        let lastScaleType: PlaneScaleType | undefined;

        let nextDragAction = DRAG_ACTIONS.none; // As we hover grabbed an arrow or hoop, self is the action we would do if we then dragged it.
        let dragAction = DRAG_ACTIONS.none; // Action we're doing while we drag an arrow or hoop.

        const lastCanvasPos = math.vec2();

        const xBaseAxis = math.vec3([1, 0, 0]);
        const yBaseAxis = math.vec3([0, 1, 0]);
        const zBaseAxis = math.vec3([0, 0, 1]);

        const cameraControl = this._viewer.cameraControl;
        const canvas = this._viewer.scene.canvas.canvas;
        const camera = this._viewer.camera;

        const rootNode = this._rootNode;
        const localToWorldVec = (() => {
            const mat = math.mat4();
            return (localVec: any, worldVec: any, normalize = true) => {
                math.quaternionToMat4(rootNode.quaternion, mat);
                math.transformVec3(mat, localVec, worldVec);
                if (normalize) {
                    math.normalizeVec3(worldVec);
                }
                return worldVec;
            };
        })();

        const worldToLocalVec = (() => {
            const mat = math.mat4();
            return (worldVec: any, localVec: any) => {
                math.quaternionToMat4(rootNode.quaternion, mat);
                math.inverseMat4(mat);
                math.transformVec3(mat, worldVec, localVec);
                //math.normalizeVec3(worldVec);
                return localVec;
            };
        })();

        const getTranslationPlane = (() => {
            const planeNormal = math.vec3();
            return (worldAxis: any) => {
                const absX = Math.abs(worldAxis[0]);
                if (absX > Math.abs(worldAxis[1]) && absX > Math.abs(worldAxis[2])) {
                    math.cross3Vec3(worldAxis, [0, 1, 0], planeNormal);
                } else {
                    math.cross3Vec3(worldAxis, [1, 0, 0], planeNormal);
                }
                math.cross3Vec3(planeNormal, worldAxis, planeNormal);
                math.normalizeVec3(planeNormal);
                return planeNormal;
            };
        })();

        const dragTranslateSectionPlane = (() => {
            const p1 = math.vec3();
            const p2 = math.vec3();
            const worldAxis = math.vec4();
            return (baseAxis: number[], from: number[], to: number[]) => {
                localToWorldVec(baseAxis, worldAxis);
                const planeNormal = getTranslationPlane(worldAxis);
                if (!getPointerPlaneIntersect(from, planeNormal, p1)) {
                    return;
                }
                if (!getPointerPlaneIntersect(to, planeNormal, p2)) {
                    return;
                }
                math.subVec3(p2, p1);
                //Calculate the section plane offset
                const dot = math.dotVec3(p2, worldAxis);
                // World coordinate offset
                const offset = [worldAxis[0] * dot, worldAxis[1] * dot, worldAxis[2] * dot];
                math.addVec3(rootNode.position, offset, p1);
                rootNode.position = p1;

                if (this._sectionPlane) {
                    this._sectionPlane.pos = rootNode.position;
                }
            };
        })();

        // Get the intersection point of ray and plane
        const getPointerPlaneIntersect = (() => {
            const dir = math.vec4([0, 0, 0, 1]);
            const matrix = math.mat4();
            return (mouse: number[], axis: number[], dest: any, offset = 0) => {
                dir[0] = (mouse[0] / canvas.width) * 2.0 - 1.0;
                dir[1] = -((mouse[1] / canvas.height) * 2.0 - 1.0);
                dir[2] = 0.0;
                dir[3] = 1.0;
                math.mulMat4(camera.projMatrix, camera.viewMatrix, matrix); // Unproject norm device coords to view coords
                math.inverseMat4(matrix);
                math.transformVec4(matrix, dir, dir);
                math.mulVec4Scalar(dir, 1.0 / dir[3]); // This is now point A on the ray in world space
                const rayO = camera.eye; // The direction
                math.subVec4(dir, rayO, dir);
                let origin = [0, 0, 0];
                if (this._sectionPlane) {
                    origin = this._sectionPlane.pos; // Plane origin
                } else {
                    origin = rootNode.position;
                }
                const d = -math.dotVec3(origin, axis) - offset;
                const dot = math.dotVec3(axis, dir);
                if (Math.abs(dot) > 0.005) {
                    const t = -(math.dotVec3(axis, rayO) + d) / dot;
                    math.mulVec3Scalar(dir, t, dest);
                    math.addVec3(dest, rayO);
                    math.subVec3(dest, origin, dest);
                    return true;
                }
                console.log(`[BoxControl] Can't get the intersection.`);
                return false;
            };
        })();

        const dragRotateSectionPlane = (() => {
            const p1 = math.vec4();
            const p2 = math.vec4();
            const c = math.vec4();
            const worldAxis = math.vec4();
            return (baseAxis: number[], from: number[], to: number[]) => {
                let dot = 0;
                localToWorldVec(baseAxis, worldAxis);
                const hasData = getPointerPlaneIntersect(from, worldAxis, p1) && getPointerPlaneIntersect(to, worldAxis, p2);
                if (!hasData) {
                    // Find intersections with view plane and project down to origin
                    const planeNormal = getTranslationPlane(worldAxis);
                    getPointerPlaneIntersect(from, planeNormal, p1, 1); // Ensure plane moves closer to camera so angles become workable
                    getPointerPlaneIntersect(to, planeNormal, p2, 1);
                    dot = math.dotVec3(p1, worldAxis);
                    p1[0] -= dot * worldAxis[0];
                    p1[1] -= dot * worldAxis[1];
                    p1[2] -= dot * worldAxis[2];
                    dot = math.dotVec3(p2, worldAxis);
                    p2[0] -= dot * worldAxis[0];
                    p2[1] -= dot * worldAxis[1];
                    p2[2] -= dot * worldAxis[2];
                }
                math.normalizeVec3(p1);
                math.normalizeVec3(p2);
                dot = math.dotVec3(p1, p2);
                dot = math.clamp(dot, -1.0, 1.0); // Rounding errors cause dot to exceed allowed range
                let incDegrees = Math.acos(dot) * math.RADTODEG;
                math.cross3Vec3(p1, p2, c);
                if (math.dotVec3(c, worldAxis) < 0.0) {
                    incDegrees = -incDegrees;
                }
                rootNode.rotate(baseAxis, incDegrees);
                rotateSectionPlane();
            };
        })();

        const rotateSectionPlane = (() => {
            const dir = math.vec3();
            const mat = math.mat4();
            return () => {
                if (this._sectionPlane) {
                    math.quaternionToMat4(rootNode.quaternion, mat);
                    math.transformVec3(mat, [0, 0, 1], dir);
                    this.setSectionPlaneDir(dir);
                }
            };
        })();

        const renovatePosition = (offsetVec: number[]) => {
            const hoverVisibleMeshes = this._hoverVisibleMeshes;
            const mesh = hoverVisibleMeshes.get(lastScaleType as string);
            math.addVec3(mesh.position, offsetVec);
            const plane = this._visibleMeshes.get(PLANE_TYPE);
            const leftMesh = hoverVisibleMeshes.get(PlaneScaleType.LEFT);
            const rightMesh = hoverVisibleMeshes.get(PlaneScaleType.RIGHT);
            const bottomMesh = hoverVisibleMeshes.get(PlaneScaleType.BOTTOM);
            const topMesh = hoverVisibleMeshes.get(PlaneScaleType.TOP);
            let offset = 0;
            switch (dragAction) {
                case DRAG_ACTIONS.xScale: {
                    const distance = Math.abs(mesh.position[0]);
                    if (distance < MIN_DISTANCE) {
                        offset = lastScaleType === PlaneScaleType.RIGHT ? MIN_DISTANCE - distance : distance - MIN_DISTANCE;
                    }
                    mesh.position = math.addVec3(mesh.position, [offset, 0, 0]);
                    //Move the position of top and bottom sphere
                    const xCenter = (rightMesh.position[0] + leftMesh.position[0]) / 2.0;
                    bottomMesh.position = [xCenter, bottomMesh.position[1], bottomMesh.position[2]];
                    topMesh.position = [xCenter, topMesh.position[1], topMesh.position[2]];
                    break;
                }
                case DRAG_ACTIONS.yScale: {
                    const distance = Math.abs(mesh.position[1]);
                    if (distance < MIN_DISTANCE) {
                        offset = lastScaleType === PlaneScaleType.TOP ? MIN_DISTANCE - distance : distance - MIN_DISTANCE;
                    }
                    mesh.position = math.addVec3(mesh.position, [0, offset, 0]);
                    const yCenter = (topMesh.position[1] + bottomMesh.position[1]) / 2.0;
                    leftMesh.position = [leftMesh.position[0], yCenter, leftMesh.position[2]];
                    rightMesh.position = [rightMesh.position[0], yCenter, rightMesh.position[2]];
                    break;
                }
                default:
                    return;
            }
            plane.geometry.positions = GeometryUtils.buildPlanePosition({
                left: leftMesh.position[0],
                right: rightMesh.position[0],
                bottom: bottomMesh.position[1],
                top: topMesh.position[1],
            });
        };
        const dragScaleSectionPlane = (() => {
            const p1 = math.vec3();
            const p2 = math.vec3();
            const worldAxis = math.vec4();
            return (baseAxis: number[], from: number[], to: number[]) => {
                localToWorldVec(baseAxis, worldAxis);
                const planeNormal = getTranslationPlane(worldAxis);
                if (!getPointerPlaneIntersect(from, planeNormal, p1)) {
                    return;
                }
                if (!getPointerPlaneIntersect(to, planeNormal, p2)) {
                    return;
                }
                math.subVec3(p2, p1);
                //Calculate the mesh local offset
                worldToLocalVec(p2, p1);
                const dot = math.dotVec3(p1, baseAxis);
                const offset = [baseAxis[0] * dot, baseAxis[1] * dot, baseAxis[2] * dot];
                renovatePosition(offset);
            };
        })();

        {
            // Keep gizmo screen size constant
            const tempVec3a = math.vec3([0, 0, 0]);
            let lastDist = -1;
            const scene = this._viewer.scene;
            const auxiliaryNode = this._hoverVisibleMeshes.get(
                CommonUtils.joinStrings(Axis.Y, ARROW_TYPE, HIGHLIGHTED_TYPE)
            ).parent;
            this._sceneSubIds.push(
                scene.on("tick", () => {
                    if (!this._visible) {
                        return;
                    }
                    const dist = Math.abs(math.lenVec3(math.subVec3(scene.camera.eye, rootNode.position, tempVec3a)));

                    if (Math.abs(dist - lastDist) > EPSILON2) {
                        let size = 1.0;
                        if (camera.projection === "perspective") {
                            const worldSize = Math.tan(camera.perspective.fov * math.DEGTORAD) * dist;
                            size = SCALE_RADIO * worldSize;
                        } else if (camera.projection === "ortho") {
                            size = SCALE_RADIO * camera.ortho.scale;
                        }
                        auxiliaryNode.scale = [size, size, size];
                        Object.values(PlaneScaleType).forEach((type) => {
                            this._hoverVisibleMeshes.get(type).scale = [size, size, size];
                        });
                        lastDist = dist;
                    }
                })
            );
        }

        {
            const pointerEnabled = cameraControl.pointerEnabled;
            const input = this._viewer.scene.input;
            const cursor = canvas.style.cursor;
            let isMouseDown = false;
            const hoverPlaneMeshes: any[] = [undefined, undefined];

            const visibleMeshes = this._visibleMeshes;
            const hoverVisibleMeshes = this._hoverVisibleMeshes;
            const getId = (...args: string[]) => hoverVisibleMeshes.get(CommonUtils.joinStrings(...args)).id;

            const hoverEnter = (hit: any) => {
                if (!this._visible) {
                    return;
                }
                if (isMouseDown) {
                    return;
                }

                nextDragAction = DRAG_ACTIONS.none;
                grabbing = false;

                if (lastHoverVisibleMesh) {
                    lastHoverVisibleMesh.visible = false;
                }

                hoverPlaneMeshes.forEach((mesh: any) => {
                    if (mesh) {
                        mesh.visible = false;
                    }
                });

                let scaleType: PlaneScaleType | undefined;
                let hoverVisibleMesh: any = undefined;
                const meshId = hit.entity.id;
                switch (meshId) {
                    case getId(Axis.X, ARROW_TYPE, HANDLE_TYPE):
                    case getId(Axis.X, HANDLE_TYPE):
                        nextDragAction = DRAG_ACTIONS.xTranslate;
                        hoverVisibleMesh = hoverVisibleMeshes.get(
                            CommonUtils.joinStrings(Axis.X, ARROW_TYPE, HIGHLIGHTED_TYPE)
                        );
                        break;

                    case getId(Axis.Y, ARROW_TYPE, HANDLE_TYPE):
                    case getId(Axis.Y, HANDLE_TYPE):
                        nextDragAction = DRAG_ACTIONS.yTranslate;
                        hoverVisibleMesh = hoverVisibleMeshes.get(
                            CommonUtils.joinStrings(Axis.Y, ARROW_TYPE, HIGHLIGHTED_TYPE)
                        );
                        break;

                    case getId(Axis.Z, ARROW_TYPE, HANDLE_TYPE):
                    case getId(Axis.Z, HANDLE_TYPE):
                        nextDragAction = DRAG_ACTIONS.zTranslate;
                        hoverVisibleMesh = hoverVisibleMeshes.get(
                            CommonUtils.joinStrings(Axis.Z, ARROW_TYPE, HIGHLIGHTED_TYPE)
                        );
                        break;
                    case getId(Axis.X, CURVE_TYPE, HANDLE_TYPE):
                        nextDragAction = DRAG_ACTIONS.xRotate;
                        hoverVisibleMesh = hoverVisibleMeshes.get(CommonUtils.joinStrings(Axis.X, HOOP_TYPE));
                        break;

                    case getId(Axis.Y, CURVE_TYPE, HANDLE_TYPE):
                        nextDragAction = DRAG_ACTIONS.yRotate;
                        hoverVisibleMesh = hoverVisibleMeshes.get(CommonUtils.joinStrings(Axis.Y, HOOP_TYPE));
                        break;

                    case getId(Axis.Z, CURVE_TYPE, HANDLE_TYPE):
                        nextDragAction = DRAG_ACTIONS.zRotate;
                        hoverVisibleMesh = hoverVisibleMeshes.get(CommonUtils.joinStrings(Axis.Z, HOOP_TYPE));
                        break;

                    case getId(PlaneScaleType.LEFT):
                        nextDragAction = DRAG_ACTIONS.xScale;
                        scaleType = PlaneScaleType.LEFT;
                        break;

                    case getId(PlaneScaleType.RIGHT):
                        nextDragAction = DRAG_ACTIONS.xScale;
                        scaleType = PlaneScaleType.RIGHT;
                        break;

                    case getId(PlaneScaleType.TOP):
                        nextDragAction = DRAG_ACTIONS.yScale;
                        scaleType = PlaneScaleType.TOP;
                        break;

                    case getId(PlaneScaleType.BOTTOM):
                        nextDragAction = DRAG_ACTIONS.yScale;
                        scaleType = PlaneScaleType.BOTTOM;
                        break;

                    case visibleMeshes.get(PLANE_TYPE).id:
                        hoverPlaneMeshes[0] = hoverVisibleMeshes.get(Axis.X).parent;
                        hoverPlaneMeshes[1] = hoverVisibleMeshes.get(PlaneScaleType.LEFT).parent;
                        lastPickedMesh = visibleMeshes.get(PLANE_TYPE);
                        break;

                    default:
                        nextDragAction = DRAG_ACTIONS.none;
                        return;
                }

                hoverPlaneMeshes.forEach((mesh: any) => {
                    if (mesh) {
                        mesh.visible = true;
                    }
                });

                canvas.style.cursor = "move";

                if (lastPickedMesh) {
                    lastPickedMesh.highlighted = true;
                }

                if (hoverVisibleMesh) {
                    hoverVisibleMesh.visible = true;
                }
                lastHoverVisibleMesh = hoverVisibleMesh;

                lastScaleType = scaleType;
                if (nextDragAction !== DRAG_ACTIONS.none) {
                    grabbing = true;
                }
            };

            const hoverOff = () => {
                if (!this._visible) {
                    return;
                }
                canvas.style.cursor = cursor;
                grabbing = false;

                if (lastPickedMesh) {
                    lastPickedMesh.highlighted = false;
                    lastPickedMesh = undefined;
                }

                nextDragAction = DRAG_ACTIONS.none;

                if (lastHoverVisibleMesh) {
                    lastHoverVisibleMesh.visible = false;
                    lastHoverVisibleMesh = undefined;
                }

                hoverPlaneMeshes.forEach((mesh: any, index: number) => {
                    if (mesh) {
                        mesh.visible = false;
                        hoverPlaneMeshes[index] = undefined;
                    }
                });

                lastScaleType = undefined;
            };

            const mousedown = (canvasPos: number[]) => {
                if (!this._visible) {
                    return;
                }
                if (!grabbing) {
                    return;
                }
                //mouse down left
                if (!input.mouseDownLeft) {
                    return;
                }

                cameraControl.pointerEnabled = false;
                isMouseDown = true;
                dragAction = nextDragAction;
                lastCanvasPos[0] = canvasPos[0];
                lastCanvasPos[1] = canvasPos[1];
            };

            const mousemove = (canvasPos: number[]) => {
                if (!this._visible) {
                    return;
                }
                if (!isMouseDown) {
                    return;
                }
                switch (dragAction) {
                    case DRAG_ACTIONS.xTranslate:
                        dragTranslateSectionPlane(xBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.yTranslate:
                        dragTranslateSectionPlane(yBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.zTranslate:
                        dragTranslateSectionPlane(zBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.xRotate:
                        dragRotateSectionPlane(xBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.yRotate:
                        dragRotateSectionPlane(yBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.zRotate:
                        dragRotateSectionPlane(zBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.xScale:
                        dragScaleSectionPlane(xBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    case DRAG_ACTIONS.yScale:
                        dragScaleSectionPlane(yBaseAxis, lastCanvasPos, canvasPos);
                        break;
                }
                lastCanvasPos[0] = canvasPos[0];
                lastCanvasPos[1] = canvasPos[1];
            };

            const mouseup = () => {
                if (!this._visible) {
                    return;
                }
                if (!isMouseDown) {
                    return;
                }
                cameraControl.pointerEnabled = pointerEnabled;
                isMouseDown = false;
                grabbing = false;
            };

            this._cameraControlSubIds.push(cameraControl.on("hoverEnter", hoverEnter, this));
            this._cameraControlSubIds.push(cameraControl.on("hoverOff", hoverOff, this));
            this._inputSubIds.push(input.on("mousedown", mousedown, this));
            this._inputSubIds.push(input.on("mousemove", mousemove, this));
            this._inputSubIds.push(input.on("mouseup", mouseup, this));
        }
    }

    destroy() {
        this.unbindEvents();
        this.destroyNodes();
    }

    private unbindEvents() {
        const viewer = this._viewer;
        const cameraControl = viewer.cameraControl;
        const scene = viewer.scene;
        const input = scene.input;

        this._cameraControlSubIds.forEach((subId: number) => cameraControl.off(subId));
        this._inputSubIds.forEach((subId: number) => input.off(subId));
        this._sceneSubIds.forEach((subId: number) => scene.off(subId));
        this._cameraControlSubIds = [];
        this._inputSubIds = [];
        this._sceneSubIds = [];
    }

    private destroyNodes() {
        this.setSectionPlane(undefined);
        this._rootNode.destroy();
        this._visibleMeshes.clear();
        this._hoverVisibleMeshes.clear();
    }
}
