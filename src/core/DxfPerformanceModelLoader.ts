/* eslint-disable @typescript-eslint/no-explicit-any */
import { math, utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import axios from "axios";
import { CallbackRetureVoidType, EmptyCallbackType } from "./CallbackTypes";
import DxfParser from "dxf-parser";
import { FontManager } from "../services/FontManager";
import { GeometryUtils } from "../utils/GeometryUtils";
import { vec2 } from "gl-matrix";
import { SplineCurve } from "./paths/SplineCurve";
import { QuadraticBezierCurve } from "./paths/QuadraticBezierCurve";

export class DxfPerformanceModelLoader {
    constructor() {
        //TODO
        // console.log("[Dxf] is instanced!");
    }

    load(performanceModel: any, src: string, options: any, ok?: EmptyCallbackType, error?: CallbackRetureVoidType<string>) { // eslint-disable-line
        options = options || {};
        loadDxf(
            performanceModel,
            src,
            options,
            function () {
                //core.scheduleTask(function () {
                performanceModel.scene.fire("modelLoaded", performanceModel.id); // FIXME: Assumes listeners know order of these two events
                performanceModel.fire("loaded", true, false);
                //});
                if (ok) {
                    ok();
                }
            },
            function (msg: string) {
                if (error) {
                    error(msg);
                }
                performanceModel.fire("error", msg);
            }
        );
    }
}

const loadDxf = (function () {
    const parser = new DxfParser();
    return function (
        performanceModel: any, // eslint-disable-line
        src: string,
        options: any, // eslint-disable-line
        ok?: EmptyCallbackType,
        error?: CallbackRetureVoidType<string>
    ) {
        const spinner = performanceModel.scene.canvas.spinner;
        spinner.processes++;
        axios
            .get(src)
            .then((result) => {
                const dxf = parser.parseSync(result.data);
                if (dxf) {
                    parseDxf(performanceModel, dxf, options, ok);
                } else {
                    Promise.reject(`[Dxf] DxfParser ${src} error!`);
                }
                spinner.processes--;
            })
            .catch((e: string) => {
                if (error) {
                    error(e);
                }
            });
    };
})();

interface MeshConfig {
    id: string;
    primitive: string;
    positions: number[];
    indices?: number[];
    color?: number[];
    matrix?: number[];
    [key: string]: any; // eslint-disable-line
}

interface DrawConfig {
    matrix?: number[];
}

type StringOrUndefinedType = undefined | string | string[];

const parseDxf = (function () {
    let model: any; // eslint-disable-line
    //let okFunc: EmptyCallbackType | undefined;
    return function (performanceModel: any, json: any, options: any, ok?: EmptyCallbackType) { // eslint-disable-line
        model = performanceModel;
        for (let i = 0; i < json.entities.length; i++) {
            const entity = json.entities[i];
            const meshIds = drawEntity(entity, json);
            if (meshIds) {
                createModelEntity(Array.isArray(meshIds) ? meshIds : [meshIds]);
            }
        }

        model.finalize();
        if (ok) {
            ok();
        }
    };

    function drawEntity(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        const entityType = entity.type;
        if (entityType === "CIRCLE" || entityType === "ARC") {
            return drawArc(entity, data, cfg);
        } else if (entityType === "LWPOLYLINE" || entityType === "LINE" || entityType === "POLYLINE") {
            return drawLine(entity, data, cfg);
        } else if (entityType === "TEXT") {
            return drawText(entity, data, cfg);
        } else if (entityType === "SOLID") {
            return drawSolid(entity, data, cfg);
        } else if (entityType === "POINT") {
            return drawPoint(entity, data, cfg);
        } else if (entityType === "INSERT") {
            return drawBlock(entity, data, cfg);
        } else if (entityType === "SPLINE") {
            return drawSpline(entity, data, cfg);
        } else if (entityType === "MTEXT") {
            //TODO entity.text may be further understanded.
            return drawMText(entity, data, cfg);
        } else if (entityType === "ELLIPSE") {
            return drawEllipse(entity, data, cfg);
        } else if (entityType === "DIMENSION") {
            //TODO
            // const dimTypeEnum = entity.dimensionType & 7; // entity.dimensionType&7 Represents an oblique dimension
            // if (dimTypeEnum === 0) {

            return drawDimension(entity, data, cfg);
            // } else {
            //     console.log("[Dxf] Unsupported Dimension type: " + entity.dimensionType);
            // }
        } else if (entity === "ATTDEF") {
            //TODO
            //drawAttDef(entity,data);
            console.log("[Dxf] Unsupported Entity type: " + entityType);
        } else {
            console.log("[Dxf] Unsupported Entity Type: " + entityType);
        }

        return undefined;
    }

    function drawText(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType {
        const text = entity.text;
        if (!text || (<string>text).length === 0) {
            console.warn("[Dxf] entity.text is empty or undefined");
            return undefined;
        }

        const geometry = FontManager.instance().generateTextGeometry({
            text: text,
            height: 0,
            size: entity.textHeight || 12,
        });
        if (!geometry || geometry.positions.length === 0) {
            console.error(`[Dxf] Failed to generate text geometry for ${text}`);
            return undefined;
        }

        const startPoint = [entity.startPoint.x, entity.startPoint.z, entity.startPoint.y];

        const id = math.createUUID();

        const rotation = [0, 0, 0];
        if (entity.rotation) {
            rotation[1] = entity.rotation * -1;
        }

        const scale = [1, 1, 1];

        if (entity.xScale) {
            scale[0] = entity.xScale;
        }

        let localMatrix = getMatrix(startPoint, scale, rotation);

        if (localMatrix && cfg && cfg.matrix) {
            localMatrix = math.mulMat4(cfg.matrix, localMatrix, math.mat4());
        }

        const color = getColor(entity, data);
        createMesh(
            utils.apply(geometry, {
                color: color,
                matrix: localMatrix,
                id: id,
                primitive: "triangles",
                // position: startPoint,
                // rotation: rotation,
                // scale: scale,
            })
        );

        return id;
    }

    function drawMText(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType {
        const text = entity.text;
        if (!text || (<string>text).length === 0) {
            console.warn("[Dxf] entity.text is empty or undefined");
            return undefined;
        }

        //Regex replace \\p as \n
        const fontText = text.replace(/(\\p)+/gi, "\n");

        const geometry = FontManager.instance().generateTextGeometry({
            text: fontText,
            height: 1,
            size: entity.height * (4 / 5), //Reference three-dxf(https://github.com/gdsestimating/three-dxf)
        });
        if (!geometry || geometry.positions.length === 0) {
            console.error(`[Dxf] Failed to generate text geometry for ${fontText}`);
            return undefined;
        }

        const aabb = math.positions3ToAABB3(geometry.positions);
        const textWidth = aabb[3] - aabb[0];
        // If the text ends up being wider than the box, it's supposed
        // to be multiline. Doing that in threeJS is overkill.
        if (textWidth > entity.width) {
            console.log(`[Dxf] MTEXT entity is not supported yet! handle: ${entity.handle}, text: ${entity.text}`);
            return undefined;
        }

        const startPoint = [entity.position.x, entity.position.z, entity.position.y];
        switch (entity.attachmentPoint) {
            case 1:
                // Top Left
                startPoint[2] -= entity.height;
                break;
            case 2:
                // Top Center
                startPoint[0] -= textWidth / 2;
                startPoint[2] -= entity.height;
                break;
            case 3:
                // Top Right
                startPoint[0] -= textWidth;
                startPoint[2] -= entity.height;
                break;

            case 4:
                // Middle Left
                startPoint[2] -= entity.height / 2;
                break;
            case 5:
                // Middle Center
                startPoint[0] -= textWidth / 2;
                startPoint[2] -= entity.height / 2;
                break;
            case 6:
                // Middle Right
                startPoint[0] -= textWidth;
                startPoint[2] -= entity.height / 2;
                break;

            case 7:
                // Bottom Left
                //startPoint[0] = entity.position.x;
                //startPoint[1] = entity.position.y;
                break;
            case 8:
                // Bottom Center
                startPoint[0] -= textWidth / 2;
                //text.position.y = entity.position.y;
                break;
            case 9:
                // Bottom Right
                startPoint[0] -= textWidth;
                //text.position.y = entity.position.y;
                break;

            default:
                break;
        }

        const id = math.createUUID();

        const rotation = [0, 0, 0];
        if (entity.rotation) {
            rotation[1] = entity.rotation * -1;
        }

        const scale = [1, 1, 1];

        if (entity.xScale) {
            scale[0] = entity.xScale;
        }

        let localMatrix = getMatrix(startPoint, scale, rotation);

        if (localMatrix && cfg && cfg.matrix) {
            localMatrix = math.mulMat4(cfg.matrix, localMatrix, math.mat4());
        }

        const color = getColor(entity, data);
        createMesh(
            utils.apply(geometry, {
                color: color,
                matrix: localMatrix,
                id: id,
                primitive: "triangles",
                // position: startPoint,
                // rotation: rotation,
                // scale: scale,
            })
        );

        return id;
    }

    //TODO I use it at debug mode
    function drawAABB(aabb: number[]) { // eslint-disable-line
        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];
        const xmax = aabb[3];
        const ymax = aabb[4];
        const zmax = aabb[5];

        const positions = [
            // v0-v1-v2-v3 front
            xmax,
            ymax,
            zmax,
            xmin,
            ymax,
            zmax,
            xmin,
            ymin,
            zmax,
            xmax,
            ymin,
            zmax,

            // v0-v3-v4-v1 right
            xmax,
            ymax,
            zmax,
            xmax,
            ymin,
            zmax,
            xmax,
            ymin,
            zmin,
            xmax,
            ymax,
            zmin,

            // v0-v1-v6-v1 top
            xmax,
            ymax,
            zmax,
            xmax,
            ymax,
            zmin,
            xmin,
            ymax,
            zmin,
            xmin,
            ymax,
            zmax,

            // v1-v6-v7-v2 left
            xmin,
            ymax,
            zmax,
            xmin,
            ymax,
            zmin,
            xmin,
            ymin,
            zmin,
            xmin,
            ymin,
            zmax,

            // v7-v4-v3-v2 bottom
            xmin,
            ymin,
            zmin,
            xmax,
            ymin,
            zmin,
            xmax,
            ymin,
            zmax,
            xmin,
            ymin,
            zmax,

            // v4-v7-v6-v1 back
            xmax,
            ymin,
            zmin,
            xmin,
            ymin,
            zmin,
            xmin,
            ymax,
            zmin,
            xmax,
            ymax,
            zmin,
        ];
        const indices = [
            0, 1, 2, 0, 2, 3,
            // front
            4, 5, 6, 4, 6, 7,
            // right
            8, 9, 10, 8, 10, 11,
            // top
            12, 13, 14, 12, 14, 15,
            // left
            16, 17, 18, 16, 18, 19,
            // bottom
            20, 21, 22, 20, 22, 23,
        ];

        createMesh({
            id: "aabb",
            color: [1, 0, 0],
            indices: indices,
            primitive: "triangles",
            positions: positions,
            //rotation: rotation,
            //scale: scale,
        });
    }

    function drawBlock(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        if (!entity.name) {
            return undefined;
        }
        const block = data.blocks[entity.name];

        if (!block.entities) {
            return undefined;
        }

        const scale = [1, 1, 1];
        if (entity.xScale) {
            scale[0] = entity.xScale;
        }
        if (entity.yScale) {
            scale[2] = entity.yScale;
        }

        const rotation = [0, 0, 0];
        if (entity.rotation) {
            rotation[1] = entity.rotation;
        }

        const position = [0, 0, 0];
        if (entity.position) {
            position[0] = entity.position.x;
            position[2] = entity.position.y;
            position[1] = entity.position.z;
        }

        let localMatrix = getMatrix(position, scale, rotation);

        if (localMatrix && cfg && cfg.matrix) {
            localMatrix = math.mulMat4(cfg.matrix, localMatrix, math.mat4());
        }

        const newCfg = cfg ? (utils.clone(cfg) as DrawConfig) : {};
        newCfg.matrix = localMatrix;

        const meshIds: string[] = [];
        for (let i = 0; i < block.entities.length; i++) {
            const childEntity = drawEntity(block.entities[i], data, newCfg);
            if (childEntity) {
                if (Array.isArray(childEntity)) {
                    meshIds.push(...childEntity);
                } else {
                    meshIds.push(childEntity);
                }
            }
        }

        return meshIds;
    }

    function drawDimension(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        if (!entity.block) {
            return undefined;
        }
        const block = data.blocks[entity.block];

        if (!block || !block.entities) {
            return undefined;
        }

        const meshIds: string[] = [];
        for (let i = 0; i < block.entities.length; i++) {
            const childEntity = drawEntity(block.entities[i], data, cfg);
            if (childEntity) {
                if (Array.isArray(childEntity)) {
                    meshIds.push(...childEntity);
                } else {
                    meshIds.push(childEntity);
                }
            }
        }

        return meshIds;
    }

    function drawPoint(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        if (!entity && !entity.position) {
            return undefined;
        }
        const positions: number[] = [];
        positions.push(entity.position.x, entity.position.z, entity.position.y);

        // TODO: Could be more efficient that loads all points on once ?

        const id = math.createUUID();
        const primitive = "points";
        const color = getColor(entity, data);
        const matrix = cfg && cfg.matrix;
        createMesh({ id, primitive, positions, color, matrix });

        return id;
    }

    function drawSolid(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        const points = entity.points;
        const vert1 = [points[0].x, points[0].z, points[0].y];
        const vert2 = [points[1].x, points[1].z, points[1].y];
        const vert3 = [points[2].x, points[2].z, points[2].y];

        const positions: number[] = [];
        // swap y and z
        positions.push(...vert1);
        positions.push(...vert2);
        positions.push(...vert3);
        positions.push(points[3].x, points[3].z, points[3].y);

        // Calculate which direction the points are facing (clockwise or counter-clockwise)

        const vector1 = math.subVec3(vert2, vert1);
        const vector2 = math.subVec3(vert3, vert1);
        math.cross3Vec3(vector1, vector2);

        const indices: number[] = [];
        // If z < 0 then we must draw these in reverse order
        if (vector1.z < 0) {
            indices.push(2, 1, 0);
            indices.push(0, 3, 2);
            //indices.push(2, 3, 1);
        } else {
            indices.push(0, 1, 2);
            indices.push(2, 3, 0);
            //indices.push(1, 3, 2);
        }

        const id = math.createUUID();
        const primitive = "triangles";
        const color = getColor(entity, data);
        const matrix = cfg && cfg.matrix;
        createMesh({ id, primitive, positions, indices, color, matrix });

        return id;
    }

    function drawSpline(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        if (!entity.controlPoints || entity.controlPoints.length < 3) {
            return undefined;
        }

        //swap y and z (2d)
        //const points = entity.controlPoints.map((vec: any) => [vec.x, vec.z, vec.y]); // eslint-disable-line
        const points: vec2[] = entity.controlPoints.map((vec: any) => {
            return vec2.fromValues(vec.x, vec.y);
        });

        const divisions = 50;
        const positions: number[] = [];
        let curve;
        //TODO only consider degreeOfSplineCurve===2
        if (entity.degreeOfSplineCurve === 2 || entity.degreeOfSplineCurve === 3) {
            let i = 0;
            for (i = 0; i + 2 < points.length; i = i + 2) {
                curve = new QuadraticBezierCurve(points[i], points[i + 1], points[i + 2]);
                for (let j = 0; j <= divisions; ++j) {
                    const curvePt = curve.getPoint(j / divisions);
                    positions.push(curvePt[0], 0, curvePt[1]);
                }
            }
            if (i + 1 < points.length) {
                curve = new QuadraticBezierCurve(points[i], points[i + 1], points[i + 1]);
                for (let j = 0; j <= divisions; ++j) {
                    const curvePt = curve.getPoint(j / divisions);
                    positions.push(curvePt[0], 0, curvePt[1]);
                }
            }
        } else {
            curve = new SplineCurve(points);
            const curvePts = curve.getPoints(2 * divisions);
            curvePts.forEach((value: vec2) => {
                positions.push(...value);
            });
        }

        const interpolatedPointsNum = positions.length / 3;
        const indices: number[] = [];
        for (let j = 0; j < interpolatedPointsNum - 1; j++) {
            indices.push(j, j + 1);
        }

        const id = math.createUUID();
        const primitive = "lines";
        const color = getColor(entity, data);
        const matrix = cfg && cfg.matrix;
        createMesh({ id, primitive, positions, indices, color, matrix });

        return id;
    }

    function drawArc(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        let startAngle: number, endAngle: number;
        if (entity.type === "CIRCLE") {
            startAngle = entity.startAngle || 0;
            endAngle = startAngle + 2 * Math.PI;
        } else {
            startAngle = entity.startAngle;
            endAngle = entity.endAngle;
        }

        const centerObj = entity.center;
        const center = [centerObj.x, 0, centerObj.y];

        const geomtery = GeometryUtils.buildEllipseGeometry({
            center: center,
            xRadius: entity.radius,
            yRadius: entity.radius,
            startAngle: startAngle,
            endAngle: endAngle,
        });

        const id = math.createUUID();
        const primitive = "lines";
        const positions = geomtery.positions;
        const indices = geomtery.indices;
        const color = getColor(entity, data);
        const matrix = cfg && cfg.matrix;
        createMesh({ id, primitive, positions, indices, color, matrix });

        return id;
    }

    function drawLine(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        if (!entity.vertices) {
            console.error("[Dxf] entity.vertices is missing.");
            return undefined;
        }

        let vertex: any, startPoint: any, endPoint: any, bulge: number; // eslint-disable-line
        let bulgePositions: number[];

        const positions: number[] = [];
        // create geometry
        for (let i = 0; i < entity.vertices.length; i++) {
            if (entity.vertices[i].bulge) {
                bulge = entity.vertices[i].bulge;
                startPoint = entity.vertices[i];
                endPoint = i + 1 < entity.vertices.length ? entity.vertices[i + 1] : entity.vertices[0];

                bulgePositions = getBulgePositions(startPoint, endPoint, bulge);

                positions.push(...bulgePositions);
            } else {
                vertex = entity.vertices[i];
                positions.push(vertex.x, 0, vertex.y);
            }
        }

        // TODO Create indexes based on polylines
        const indices: number[] = [];
        const pointNum = positions.length / 3;
        for (let i = 0; i < pointNum - 1; ++i) {
            indices.push(i, i + 1);
        }

        if (entity.shape) {
            positions.push(positions[0], positions[1], positions[2]);
            indices.push(pointNum - 1, pointNum);
        }
        const color = getColor(entity, data);
        //TODO set material (dash line)
        // if (entity.lineType) {
        //     lineType = data.tables.lineType.lineTypes[entity.lineType];
        // }

        // if (lineType && lineType.pattern && lineType.pattern.length !== 0) {
        //
        // } else {
        //
        // }
        const id = math.createUUID();
        const primitive = "lines";
        const matrix = cfg && cfg.matrix;
        createMesh({ id, primitive, positions, indices, color, matrix });

        return id;
    }

    function drawEllipse(entity: any, data: any, cfg?: DrawConfig): StringOrUndefinedType { // eslint-disable-line
        const xrad = Math.sqrt(Math.pow(entity.majorAxisEndPoint.x, 2) + Math.pow(entity.majorAxisEndPoint.y, 2));
        const yrad = xrad * entity.axisRatio;
        const entityRotation = Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x) * (180.0 / Math.PI);

        const curveGeometry = GeometryUtils.buildEllipseGeometry({
            //center: [entity.center.x, 0, entity.center.y],
            xRadius: xrad,
            yRadius: yrad,
            startAngle: entity.startAngle,
            endAngle: entity.endAngle,
        });
        const center = [entity.center.x, 0, entity.center.y];
        const rotation = [0, entityRotation * -1, 0];

        let localMatrix = getMatrix(center, undefined, rotation);

        if (localMatrix && cfg && cfg.matrix) {
            localMatrix = math.mulMat4(cfg.matrix, localMatrix, math.mat4());
        }

        const id = math.createUUID();
        const primitive = "lines";
        const positions = curveGeometry.positions;
        const indices = curveGeometry.indices;
        const color = getColor(entity, data);
        const matrix = localMatrix;
        createMesh({ id, primitive, positions, indices, color, matrix });

        return id;
    }

    function getMatrix(position?: number[], scale?: number[], rotation?: number[]): number[] | undefined {
        if (!(position || scale || rotation)) {
            return undefined;
        }
        let matrix: number[] | undefined;
        let localMatrix: number[] = [];
        if (position) {
            localMatrix = math.translationMat4v(position);
            matrix = localMatrix;
        }

        if (rotation) {
            const quaternion = math.eulerToQuaternion(rotation, "XYZ");
            localMatrix = math.quaternionToMat4(quaternion);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix);
            } else {
                matrix = localMatrix;
            }
        }

        if (scale) {
            localMatrix = math.scalingMat4v(scale);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix);
            } else {
                matrix = localMatrix;
            }
        }

        return matrix;
    }

    function createMesh(cfg: MeshConfig) {
        if (model) {
            model.createMesh(cfg);
        }
    }

    function createModelEntity(meshIds: string[]) {
        if (model && meshIds.length > 0) {
            const entityId = math.createUUID();
            model.createEntity({
                id: entityId,
                meshIds: meshIds,
                isObject: true,
            });
        }
    }

    /**
     * Calculates points for a curve between two points
     * startPoint - the starting point of the curve
     * endPoint - the ending point of the curve
     * bulge - a value indicating how much to curve
     * segments - number of segments between the two given points
     */
    function getBulgePositions(startPoint: any, endPoint: any, bulge: number, segments?: number) { // eslint-disable-line
        const vertices: number[] = [];
        if (!startPoint || !endPoint) {
            return vertices;
        }
        const p0 = startPoint ? [startPoint.x, startPoint.y] : [0, 0];
        const p1 = endPoint ? [endPoint.x, endPoint.y] : [1, 0];

        const angle = 4 * Math.atan(bulge);
        const radius = math.distVec2(p0, p1) / 2 / Math.sin(angle / 2);
        const centerAngle = getAngle(p0, p1) + (Math.PI / 2 - angle / 2);
        const center = getPolar(p0, radius, centerAngle);

        const segmentNum = segments || Math.max(Math.abs(Math.ceil(angle / (Math.PI / 18))), 6); // By default want a segment roughly every 10 degrees
        const startAngle = getAngle(center, p0);
        const thetaAngle = angle / segmentNum;

        vertices.push(p0[0], 0, p0[1]);

        for (let i = 1; i <= segmentNum - 1; i++) {
            const vertex = getPolar(center, Math.abs(radius), startAngle + thetaAngle * i);
            vertices.push(vertex[0], 0, vertex[1]);
        }
        return vertices;
    }

    function getAngle(p1: number[], p2: number[]) {
        const dir = [p2[0] - p1[0], p2[1] - p1[1]];

        math.normalizeVec2(dir);
        if (dir[1] < 0) {
            return -Math.acos(dir[0]);
        }
        return Math.acos(dir[0]);
    }

    function getPolar(point: number[], distance: number, angle: number) {
        const x = point[0] + distance * Math.cos(angle);
        const y = point[1] + distance * Math.sin(angle);
        return [x, y];
    }

    function getColor(entity: any, data: any) { // eslint-disable-line
        let color = 0x000000; //default
        if (entity.color) {
            color = entity.color;
        } else if (data.tables && data.tables.layer && data.tables.layer.layers[entity.layer]) {
            color = data.tables.layer.layers[entity.layer].color;
        }

        if (color == null || color === 0xffffff) {
            color = 0x000000;
        }

        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;

        return [r / 255.0, g / 255.0, b / 255.0];
    }
})();
