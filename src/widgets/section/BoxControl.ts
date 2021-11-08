/* eslint-disable @typescript-eslint/no-explicit-any */
import { addPrefix, CommonUtils } from "../../utils/CommonUtils";
import { GeometryUtils } from "../../utils/GeometryUtils";
import { SECTION_BOX_ID } from "../../utils/Consts";
import {
    buildCylinderGeometry,
    buildTorusGeometry,
    EdgeMaterial,
    EmphasisMaterial,
    math,
    Mesh,
    Node,
    PhongMaterial,
    ReadableGeometry,
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

/**
 * Left/Right: x direction
 * Top/Bottom: y direction
 * Front/Back: z direction
 */
export enum BoxSectionPlaneType {
    LEFT = "Left",
    RIGHT = "Right",
    TOP = "Top",
    BOTTOM = "Bottom",
    FRONT = "Front",
    BACK = "Back",
}

interface PickedComponent {
    mesh: any; // local coordinate. Transforms to world coordinates through the rootNode.
    sectionPlane?: any; // world coordinate.
}

const zeroVec = new Float64Array([0, 0, 1]);
const quat = new Float64Array(4);
const NO_STATE_INHERIT = false;
const EPSILON2 = 0.01;
const SCALE_RADIO = 0.005;
const ROTATION_SCALE_RADIO = 0.6;
const MIN_WIDTH = 0.5;
const DRAG_ROTATION_RATE = 135;
const GEOMETRY_RADIUS = 0.5; // Geometric default initial size
const DEFAULT_COLOR = [0.0, 0.855, 0.718]; // Default colors of all Mesh
const AXIS_SUFFIX = "_Axis";
const ARROW_SUFFIX = "_Arrow";
const CURVE_TYPE = "yCurve";
const HANDLE_TYPE = "Handle";

export class BoxControl {
    private _viewer: any;
    private _visible = false;
    private _rootNode: any; // Root of Node graph that represents this control in the 3D scene
    private _meshes: Map<string, any> = new Map(); // Meshes that are always visible
    private _hideableMeshes: Map<string, any> = new Map(); // Meshes displayed momentarily for affordance
    private _originAABB: number[] = [];
    private _currentAABB: number[] = []; // aabb without rotation
    private _sectionPlaneMap = new Map<BoxSectionPlaneType, any>();

    private _sceneSubIds: number[] = []; // event subscription ids of the scene class, used to un-register events
    private _cameraControlSubIds: number[] = []; // event subscription ids of the cameraControl class, used to un-register events
    private _inputSubIds: number[] = []; // event subscription ids of the input class, used to un-register events

    constructor(owner: any) {
        this._viewer = owner.viewer;

        this.createNodes();
        this.bindEvents();
    }

    initSectionPlanes(sectionPlaneMap: Map<BoxSectionPlaneType, any>, aabb: number[]) {
        if (!this._meshes) {
            return;
        }

        this._sectionPlaneMap = sectionPlaneMap;

        this.rebuildBoxMesh(aabb);
    }

    rebuildBoxMesh(value: number[]) {
        if (value.length !== 6 || this._sectionPlaneMap.size === 0) {
            console.error(`[BoxControl] Invalid value.length or sectionPlaneMap.size!`);
            return;
        }

        this._originAABB = [...value];
        this._currentAABB = [...value];

        this.setBoxMeshPosition(this._originAABB, true);
    }

    // Change the aabb of box mesh
    private setBoxMeshPosition(value: number[], changePlaneMeshDirection = false) {
        const aabb = value;

        const xWidth = aabb[3] - aabb[0];
        const yWidth = aabb[4] - aabb[1];
        const zWidth = aabb[5] - aabb[2];
        const center = [(aabb[3] + aabb[0]) / 2.0, (aabb[4] + aabb[1]) / 2.0, (aabb[5] + aabb[2]) / 2.0];

        //TODO. This code will be optimized later.
        const setMeshMatrix = (sectionPlane: any, mesh: any) => {
            let node = mesh;
            if (mesh.parent) {
                node = mesh.parent;
            }
            if (changePlaneMeshDirection) {
                node.quaternion = math.vec3PairToQuaternion(zeroVec, sectionPlane.dir, quat);
            }
            switch (sectionPlane.id) {
                case BoxSectionPlaneType.RIGHT:
                    mesh.scale = [zWidth, yWidth, 1];
                    node.position = [xWidth / 2.0, 0, 0];
                    break;
                case BoxSectionPlaneType.LEFT:
                    mesh.scale = [zWidth, yWidth, 1];
                    node.position = [-xWidth / 2.0, 0, 0];
                    break;
                case BoxSectionPlaneType.TOP:
                    mesh.scale = [xWidth, zWidth, 1];
                    node.position = [0, yWidth / 2.0, 0];
                    break;
                case BoxSectionPlaneType.BOTTOM:
                    mesh.scale = [xWidth, zWidth, 1];
                    node.position = [0, -yWidth / 2.0, 0];
                    break;
                case BoxSectionPlaneType.FRONT:
                    mesh.scale = [xWidth, yWidth, 1];
                    node.position = [0, 0, zWidth / 2.0];
                    break;
                case BoxSectionPlaneType.BACK:
                    mesh.scale = [xWidth, yWidth, 1];
                    node.position = [0, 0, -zWidth / 2.0];
                    break;
                default:
                    break;
            }
        };
        const meshes = this._meshes as Map<string, any>;
        const sectionPlaneMap = this._sectionPlaneMap;
        for (const [key, sectionPlane] of sectionPlaneMap) {
            if (meshes.has(key)) {
                const mesh = meshes.get(key);
                setMeshMatrix(sectionPlane, mesh);
            }
        }

        meshes.get(CURVE_TYPE).parent.position = [-xWidth / 2.0, -yWidth / 2.0, -zWidth / 2.0];

        this._rootNode.position = center;
    }

    setVisible(visible = true) {
        if (this._visible === visible) {
            return;
        }
        this._visible = visible;
        this._meshes.forEach((mesh: any) => (mesh.visible = visible));
        this._hideableMeshes.forEach((mesh: any) => (mesh.visible = false));
    }

    getVisible() {
        return this._visible;
    }

    /**
     * Sets if this Control is culled. This is called by SectionPlanesPlugin to
     * temporarily hide the Control while a snapshot is being taken by Viewer#getSnapshot().
     */
    setCulled(culled: boolean) {
        this._meshes.forEach((mesh: any) => (mesh.culled = culled));
    }

    private createMeshes(shapes: { [key: string]: any }, materials: { [key: string]: any }) {
        const entityParams = {
            collidable: false, // Don't participate in the calculation of the scene aabb when collidable is false.
            clippable: false,
            visible: false,
        };

        const axisParmas = {
            geometry: shapes.arrowHandle,
            material: materials.axis,
            highlightMaterial: materials.highlightAxis,
            pickable: true,
            ...entityParams,
            matrix: (() => {
                const translate = math.translateMat4c(0, GEOMETRY_RADIUS, 0, math.identityMat4());
                const rotate = math.rotationMat4v(-90 * math.DEGTORAD, [1, 0, 0], math.identityMat4());
                return math.mulMat4(rotate, translate, math.identityMat4());
            })(),
        };

        const arrowHeadParmas = {
            geometry: shapes.arrowHead,
            material: materials.axis,
            highlightMaterial: materials.highlightAxis,
            pickable: true,
            ...entityParams,
            matrix: (() => {
                const translate = math.translateMat4c(0, 4 * GEOMETRY_RADIUS, 0, math.identityMat4());
                const rotate = math.rotationMat4v(-90 * math.DEGTORAD, [1, 0, 0], math.identityMat4());
                return math.mulMat4(rotate, translate, math.identityMat4());
            })(),
        };

        const planeParams = {
            geometry: shapes.plane,
            material: materials.pickable,
            edges: true,
            edgeMaterial: materials.planeEdge,
            highlightMaterial: materials.planeHighlighted,
            pickable: true,
            ...entityParams,
        };
        const rootNode = this._rootNode;
        Object.values(BoxSectionPlaneType).forEach((type) => {
            const node = new Node(rootNode, { collidable: false });
            rootNode.addChild(node, NO_STATE_INHERIT);
            // plane
            this._meshes.set(
                type,
                node.addChild(new Mesh(node, { id: addPrefix(type)(SECTION_BOX_ID), ...planeParams }), NO_STATE_INHERIT)
            );

            // translate control
            const arrowNode = new Node(node, { collidable: false });
            node.addChild(arrowNode, NO_STATE_INHERIT);
            this._hideableMeshes.set(
                CommonUtils.joinStrings(type, AXIS_SUFFIX),
                arrowNode.addChild(new Mesh(arrowNode, axisParmas), NO_STATE_INHERIT)
            );
            this._hideableMeshes.set(
                CommonUtils.joinStrings(type, ARROW_SUFFIX),
                arrowNode.addChild(new Mesh(arrowNode, arrowHeadParmas), NO_STATE_INHERIT)
            );
        });

        // Rotation control
        const childNode = new Node(rootNode, { collidable: false });
        rootNode.addChild(childNode, NO_STATE_INHERIT);

        this._meshes.set(
            CURVE_TYPE,
            childNode.addChild(
                new Mesh(childNode, {
                    geometry: shapes.curve,
                    material: materials.axis,
                    highlighted: true,
                    highlightMaterial: materials.highlightAxis,
                    rotation: [-90, 0, 90],
                    pickable: false,
                    ...entityParams,
                }),
                NO_STATE_INHERIT
            )
        );

        const rotationArrowParams = {
            geometry: shapes.arrowHead,
            material: materials.axis,
            highlighted: true,
            highlightMaterial: materials.highlightAxis,
            pickable: true,
            ...entityParams,
        };
        // The arrow points to z direction
        this._meshes.set(
            CommonUtils.joinStrings(CURVE_TYPE, ARROW_SUFFIX, "1"),
            childNode.addChild(
                new Mesh(childNode, {
                    ...rotationArrowParams,
                    matrix: (() => {
                        const translate = math.translateMat4c(
                            -GEOMETRY_RADIUS * 10,
                            0,
                            GEOMETRY_RADIUS * 2,
                            math.identityMat4()
                        );
                        const rotate = math.rotationMat4v(90 * math.DEGTORAD, [1, 0, 0], math.identityMat4());
                        return math.mulMat4(translate, rotate, math.identityMat4());
                    })(),
                }),
                NO_STATE_INHERIT
            )
        );
        // The arrow points to x direction
        this._meshes.set(
            CommonUtils.joinStrings(CURVE_TYPE, ARROW_SUFFIX, "2"),
            childNode.addChild(
                new Mesh(childNode, {
                    ...rotationArrowParams,
                    matrix: (() => {
                        const translate = math.translateMat4c(
                            GEOMETRY_RADIUS * 2,
                            0,
                            -GEOMETRY_RADIUS * 10,
                            math.identityMat4()
                        );
                        const rotate = math.rotationMat4v(-90 * math.DEGTORAD, [0, 0, 1], math.identityMat4());
                        return math.mulMat4(translate, rotate, math.identityMat4());
                    })(),
                }),
                NO_STATE_INHERIT
            )
        );

        this._meshes.set(
            CommonUtils.joinStrings(CURVE_TYPE, HANDLE_TYPE),
            childNode.addChild(
                new Mesh(childNode, {
                    geometry: shapes.curveHandle,
                    material: materials.pickable,
                    rotation: [-90, 0, 90],
                    pickable: true,
                    ...entityParams,
                }),
                NO_STATE_INHERIT
            )
        );
    }

    /**
     * Builds the Entities that represent this control.
     */
    private createNodes() {
        const scene = this._viewer.scene;

        this._rootNode = new Node(scene, {
            collidable: false,
        });
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
                GeometryUtils.buildPlaneGeometry({ width: 2 * GEOMETRY_RADIUS, height: 2 * GEOMETRY_RADIUS, isClockwise: true })
            ),
            arrowHead: createCylinderGeometry(0.001, GEOMETRY_RADIUS * 2, GEOMETRY_RADIUS * 4), // radiusTop cannot be 0, should be a bug!
            // TODO.Expanding the geometry is good for being selected
            arrowHandle: createCylinderGeometry(GEOMETRY_RADIUS, GEOMETRY_RADIUS, GEOMETRY_RADIUS * 2),
            curve: createTorusGeometry(GEOMETRY_RADIUS * 10, GEOMETRY_RADIUS / 2.0, (Math.PI * 2.0) / 4.0),
            curveHandle: createTorusGeometry(GEOMETRY_RADIUS * 10, GEOMETRY_RADIUS, (Math.PI * 2.0) / 4.0),
        };

        const createPhongMaterial = (color: number[], lineWidth = 2) =>
            new PhongMaterial(rootNode, {
                diffuse: color,
                emissive: color,
                ambient: [0, 0, 0],
                specular: [1, 1, 1],
                shininess: 80,
                opacity: 0.6,
                lineWidth,
            });

        // Reusable materials
        const materials: { [key: string]: any } = {
            pickable: new PhongMaterial(rootNode, {
                // Invisible material for pickable handles, which define a pickable 3D area
                diffuse: [1, 1, 0],
                alpha: 0, // Invisible
                alphaMode: "blend",
            }),
            axis: createPhongMaterial(DEFAULT_COLOR),
            highlightAxis: new EmphasisMaterial(rootNode, {
                // Emphasis for red rotation affordance hoop
                edges: false,
                fill: true,
                fillColor: [1, 0, 0],
                fillAlpha: 0.6,
            }),
            planeEdge: new EdgeMaterial(rootNode, {
                edgeColor: DEFAULT_COLOR,
                edgeAlpha: 1.0,
            }),
            planeHighlighted: new EmphasisMaterial(rootNode, {
                edges: true,
                fill: true,
                fillColor: DEFAULT_COLOR,
                fillAlpha: 0.1,
            }),
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
        };

        let grabbing = false;

        let lastPicked: PickedComponent | undefined;
        let lastHideableMesh: any = undefined;

        let nextDragAction = DRAG_ACTIONS.none; // As we hover grabbed an arrow or hoop, self is the action we would do if we then dragged it.
        let dragAction = DRAG_ACTIONS.none; // Action we're doing while we drag an arrow or hoop.
        let dragPlaneType = BoxSectionPlaneType.LEFT;
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

        const currentPosition = math.vec3();
        const rootNodePositionOffset = math.vec3();

        const renovatePoint = (point: number[]) => {
            const rootNodePosition = [...rootNode.position];
            const currentAABB = this._currentAABB;
            const currentAABBCenter = [
                (currentAABB[3] + currentAABB[0]) / 2.0,
                (currentAABB[4] + currentAABB[1]) / 2.0,
                (currentAABB[5] + currentAABB[2]) / 2.0,
            ];

            math.addVec3(point, currentAABBCenter, currentPosition);
            let pointChanged = false;
            const originAABB = this._originAABB;

            //axis:0,1,2 are the x, y, and z axes respectively.
            const limitAabb = (axis: number, positive: boolean) => {
                const aabbIndex = axis + (positive ? 3 : 0);
                let needChanged = positive
                    ? originAABB[aabbIndex] < currentPosition[axis]
                    : originAABB[aabbIndex] > currentPosition[axis];
                if (needChanged) {
                    point[axis] = originAABB[aabbIndex] - currentAABBCenter[axis];
                    pointChanged = true;
                } else {
                    const currentAabbIndex = axis + (positive ? 0 : 3);
                    const aabbValue = currentAABB[currentAabbIndex] + (positive ? 1 : -1) * MIN_WIDTH;
                    //Limit the minimum width of aabb in the x direction.
                    const minMaxFunc = positive ? Math.max : Math.min;
                    currentAABB[aabbIndex] = minMaxFunc(aabbValue, point[axis] + currentAABBCenter[axis]);
                    needChanged = positive ? currentPosition[axis] < aabbValue : currentPosition[axis] > aabbValue;
                    if (needChanged) {
                        point[axis] = aabbValue - currentAABBCenter[axis];
                        pointChanged = true;
                    }
                }
            };

            switch (dragPlaneType) {
                case BoxSectionPlaneType.RIGHT:
                    limitAabb(0, true);
                    break;
                case BoxSectionPlaneType.LEFT:
                    limitAabb(0, false);
                    break;
                case BoxSectionPlaneType.TOP:
                    limitAabb(1, true);
                    break;
                case BoxSectionPlaneType.BOTTOM:
                    limitAabb(1, false);
                    break;
                case BoxSectionPlaneType.FRONT:
                    limitAabb(2, true);
                    break;
                case BoxSectionPlaneType.BACK:
                    limitAabb(2, false);
                    break;
            }

            this.setBoxMeshPosition(currentAABB);

            //Calculate new position of the root node.
            const newCenter = rootNode.position;
            math.subVec3(newCenter, currentAABBCenter, rootNodePositionOffset);
            console.log(`[BoxControl] RootNode center local offset:`, rootNodePositionOffset); //TODO:remove it
            localToWorldVec(rootNodePositionOffset, currentPosition, false);
            console.log(`[BoxControl] RootNode center world offset:`, currentPosition); //TODO:remove it
            rootNode.position = math.addVec3(rootNodePosition, currentPosition);
            console.log(`[BoxControl] RootNode center :`, rootNode.position); //TODO:remove it

            return pointChanged;
        };

        const dragTranslateSectionPlane = (() => {
            const p1 = math.vec3();
            const p2 = math.vec3();
            const localVec3 = math.vec3();
            const worldAxis = math.vec4();
            return (baseAxis: number[], from: number[], to: number[]) => {
                if (!lastPicked) {
                    return;
                }
                localToWorldVec(baseAxis, worldAxis);
                const planeNormal = getTranslationPlane(worldAxis);
                if (!getPointerPlaneIntersect(from, planeNormal, p1)) {
                    return;
                }
                if (!getPointerPlaneIntersect(to, planeNormal, p2)) {
                    return;
                }

                math.subVec3(p2, p1);

                //Calculate the mesh offset
                worldToLocalVec(p2, localVec3);
                let dot = math.dotVec3(localVec3, baseAxis);
                const offset = [baseAxis[0] * dot, baseAxis[1] * dot, baseAxis[2] * dot];

                const position = [...lastPicked.mesh.position]; // local coordinate

                math.addVec3(position, offset);
                if (lastPicked.sectionPlane) {
                    if (renovatePoint(position)) {
                        console.log(`[BoxControl] Exceed the maximum and minimum range of the position`);

                        localToWorldVec(lastPicked.mesh.position, position, false);
                        math.addVec3(position, rootNode.position);
                        lastPicked.sectionPlane.pos = position;
                    } else {
                        //Calculate the section plane offset

                        dot = math.dotVec3(p2, worldAxis);
                        console.log(`[BoxControl] world move distance:`, dot);
                        // World coordinate offset
                        const offset = [worldAxis[0] * dot, worldAxis[1] * dot, worldAxis[2] * dot];
                        console.log(`[BoxControl] world move offset:`, offset);

                        const position = lastPicked.sectionPlane.pos;
                        math.addVec3(position, offset);
                        lastPicked.sectionPlane.pos = position; // world coordinate
                        console.log(`[BoxControl] sectionPlane world position:`, position);
                    }
                }

                //TODO: remove it
                //Compares the position of mesh and section plane.
                localToWorldVec(lastPicked.mesh.position, worldAxis, false);
                console.log(`[BoxControl] back mesh local position:`, worldAxis);
                math.addVec3(worldAxis, rootNode.position);
                console.log(`[BoxControl] back mesh world position:`, worldAxis);
                math.subVec3(worldAxis, lastPicked.sectionPlane.pos);
                dot = math.dotVec3(worldAxis, math.normalizeVec3(lastPicked.sectionPlane.dir));
                console.log(`[BoxControl] back mesh and plane distance:`, dot);

                // x axis
                const sectionPlane = this._sectionPlaneMap.get(BoxSectionPlaneType.RIGHT);
                const mesh = this._meshes.get(BoxSectionPlaneType.RIGHT).parent;
                localToWorldVec(mesh.position, worldAxis, false);
                console.log(`[BoxControl] right mesh local position:`, worldAxis);
                math.addVec3(worldAxis, rootNode.position);
                console.log(`[BoxControl] right mesh world position:`, worldAxis);
                math.subVec3(worldAxis, sectionPlane.pos);
                const dot2 = math.dotVec3(worldAxis, math.normalizeVec3(sectionPlane.dir));
                console.log(`[BoxControl] right mesh and plane distance:`, dot2);
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
                //const origin = self._sectionPlane.pos; // Plane origin:
                let origin = [0, 0, 0];
                if (dragAction >= DRAG_ACTIONS.xRotate) {
                    origin = rootNode.position; //[(aabb[3] + aabb[0]) / 2.0, (aabb[4] + aabb[1]) / 2.0, (aabb[5] + aabb[2]) / 2.0];
                    console.log(`[BoxControl] Origin point:${origin}.`);
                } else if (lastPicked?.sectionPlane) {
                    origin = lastPicked?.sectionPlane.pos;
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

        const dragRotateSectionPlane = (baseAxis: number[], from: number[], to: number[]) => {
            const canvasBoundary = this._viewer.scene.canvas.boundary;
            const canvasWidth = canvasBoundary[2] - canvasBoundary[0];
            const incDegrees = ((to[0] - from[0]) / canvasWidth) * DRAG_ROTATION_RATE;

            rootNode.rotate(baseAxis, incDegrees);
            rotateSectionPlane();
        };

        const rotateSectionPlane = (() => {
            const dir = math.vec3();
            const mat = math.mat4();
            const directions: Map<BoxSectionPlaneType, number[]> = new Map();
            directions.set(BoxSectionPlaneType.RIGHT, [-1, 0, 0]);
            directions.set(BoxSectionPlaneType.LEFT, [1, 0, 0]);
            directions.set(BoxSectionPlaneType.TOP, [0, -1, 0]);
            directions.set(BoxSectionPlaneType.BOTTOM, [0, 1, 0]);
            directions.set(BoxSectionPlaneType.FRONT, [0, 0, -1]);
            directions.set(BoxSectionPlaneType.BACK, [0, 0, 1]);
            return () => {
                const center = rootNode.position;
                math.quaternionToMat4(rootNode.quaternion, mat);
                const meshes = this._meshes;
                for (const [key, sectionPlane] of this._sectionPlaneMap) {
                    const planeDir = directions.get(key);
                    math.transformVec3(mat, planeDir, dir);
                    sectionPlane.dir = dir;

                    const planePos = meshes.get(key).parent.position;
                    math.transformVec3(mat, planePos, dir);
                    math.addVec3(dir, center);
                    sectionPlane.pos = dir;
                }
            };
        })();

        {
            // Keep gizmo screen size constant
            const tempVec3a = math.vec3([0, 0, 0]);
            let lastDist = -1;
            const scene = this._viewer.scene;
            const auxiliaryNode = this._meshes.get(CURVE_TYPE).parent;
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
                        const rotationControlSize = ROTATION_SCALE_RADIO * size;
                        auxiliaryNode.scale = [rotationControlSize, rotationControlSize, rotationControlSize];
                        Object.values(BoxSectionPlaneType).forEach((type) => {
                            this._hideableMeshes.get(CommonUtils.joinStrings(type, AXIS_SUFFIX)).parent.scale = [
                                size,
                                size,
                                size,
                            ];
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

            const meshes = this._meshes;
            const hideableMeshes = this._hideableMeshes;

            const hoverEnter = (hit: any) => {
                if (!this._visible) {
                    return;
                }
                if (isMouseDown) {
                    return;
                }
                nextDragAction = DRAG_ACTIONS.none;
                grabbing = false;
                if (lastPicked && lastPicked.mesh) {
                    lastPicked.mesh.highlighted = false;
                }
                if (lastHideableMesh) {
                    lastHideableMesh.visible = false;
                }
                const sectionPlaneMap = this._sectionPlaneMap;
                const picked: PickedComponent = { mesh: undefined };
                let hideableMesh: any = undefined;
                const meshId = hit.entity.id;
                const getId = (...args: string[]) => hideableMeshes.get(CommonUtils.joinStrings(...args)).id;
                switch (meshId) {
                    case getId(BoxSectionPlaneType.RIGHT, ARROW_SUFFIX):
                    case getId(BoxSectionPlaneType.RIGHT, AXIS_SUFFIX):
                        dragPlaneType = BoxSectionPlaneType.RIGHT;
                        nextDragAction = DRAG_ACTIONS.xTranslate;
                        break;
                    case getId(BoxSectionPlaneType.LEFT, ARROW_SUFFIX):
                    case getId(BoxSectionPlaneType.LEFT, AXIS_SUFFIX):
                        dragPlaneType = BoxSectionPlaneType.LEFT;
                        nextDragAction = DRAG_ACTIONS.xTranslate;
                        break;
                    case getId(BoxSectionPlaneType.TOP, ARROW_SUFFIX):
                    case getId(BoxSectionPlaneType.TOP, AXIS_SUFFIX):
                        dragPlaneType = BoxSectionPlaneType.TOP;
                        nextDragAction = DRAG_ACTIONS.yTranslate;
                        break;
                    case getId(BoxSectionPlaneType.BOTTOM, ARROW_SUFFIX):
                    case getId(BoxSectionPlaneType.BOTTOM, AXIS_SUFFIX):
                        dragPlaneType = BoxSectionPlaneType.BOTTOM;
                        nextDragAction = DRAG_ACTIONS.yTranslate;
                        break;
                    case getId(BoxSectionPlaneType.FRONT, ARROW_SUFFIX):
                    case getId(BoxSectionPlaneType.FRONT, AXIS_SUFFIX):
                        dragPlaneType = BoxSectionPlaneType.FRONT;
                        nextDragAction = DRAG_ACTIONS.zTranslate;
                        break;
                    case getId(BoxSectionPlaneType.BACK, ARROW_SUFFIX):
                    case getId(BoxSectionPlaneType.BACK, AXIS_SUFFIX):
                        dragPlaneType = BoxSectionPlaneType.BACK;
                        nextDragAction = DRAG_ACTIONS.zTranslate;
                        break;
                    case meshes.get(BoxSectionPlaneType.RIGHT).id:
                        dragPlaneType = BoxSectionPlaneType.RIGHT;
                        break;
                    case meshes.get(BoxSectionPlaneType.LEFT).id:
                        dragPlaneType = BoxSectionPlaneType.LEFT;
                        break;
                    case meshes.get(BoxSectionPlaneType.TOP).id:
                        dragPlaneType = BoxSectionPlaneType.TOP;
                        break;
                    case meshes.get(BoxSectionPlaneType.BOTTOM).id:
                        dragPlaneType = BoxSectionPlaneType.BOTTOM;
                        break;
                    case meshes.get(BoxSectionPlaneType.FRONT).id:
                        dragPlaneType = BoxSectionPlaneType.FRONT;
                        break;
                    case meshes.get(BoxSectionPlaneType.BACK).id:
                        dragPlaneType = BoxSectionPlaneType.BACK;
                        break;
                    case meshes.get(CommonUtils.joinStrings(CURVE_TYPE, HANDLE_TYPE)).id:
                        nextDragAction = DRAG_ACTIONS.yRotate;
                        break;
                    default:
                        nextDragAction = DRAG_ACTIONS.none;
                        return;
                }

                if (nextDragAction >= DRAG_ACTIONS.none && nextDragAction < DRAG_ACTIONS.xRotate) {
                    picked.sectionPlane = sectionPlaneMap.get(dragPlaneType);
                    const mesh = meshes.get(dragPlaneType);
                    picked.mesh = nextDragAction === DRAG_ACTIONS.none ? mesh : mesh.parent; // parent node of the picked section plane.
                    hideableMesh = hideableMeshes.get(CommonUtils.joinStrings(dragPlaneType, ARROW_SUFFIX)).parent;
                }

                canvas.style.cursor = "move";

                if (picked.mesh) {
                    picked.mesh.highlighted = true;
                }
                lastPicked = picked;

                if (hideableMesh) {
                    hideableMesh.visible = true;
                }
                lastHideableMesh = hideableMesh;

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

                if (lastPicked && lastPicked.mesh) {
                    lastPicked.mesh.highlighted = false;
                    lastPicked.mesh = undefined;
                    lastPicked.sectionPlane = undefined;
                }
                lastPicked = undefined;
                nextDragAction = DRAG_ACTIONS.none;

                if (lastHideableMesh) {
                    lastHideableMesh.visible = false;
                }
                lastHideableMesh = undefined;
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
                    // case DRAG_ACTIONS.xRotate:
                    //     dragRotateSectionPlane(xBaseAxis, lastCanvasPos, canvasPos);
                    //     break;
                    case DRAG_ACTIONS.yRotate:
                        dragRotateSectionPlane(yBaseAxis, lastCanvasPos, canvasPos);
                        break;
                    // case DRAG_ACTIONS.zRotate:
                    //     dragRotateSectionPlane(zBaseAxis, lastCanvasPos, canvasPos);
                    //     break;
                }
                console.log(`[BoxControl] LastCanvasPos:${lastCanvasPos}, canvasPos: ${canvasPos}, dragAction: ${dragAction}`); // TODO: remove it
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
        const input = viewer.scene.input;

        this._sceneSubIds.forEach((subId: number) => viewer.scene.off(subId));
        this._cameraControlSubIds.forEach((subId: number) => cameraControl.off(subId));
        this._inputSubIds.forEach((subId: number) => input.off(subId));
        this._sceneSubIds = [];
        this._cameraControlSubIds = [];
        this._inputSubIds = [];
    }

    private destroyNodes() {
        this._rootNode.destroy();
        this._meshes.clear();
        this._hideableMeshes.clear();
    }
}
