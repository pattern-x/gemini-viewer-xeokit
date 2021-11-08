import { vec2 } from "gl-matrix";
import { Shape } from "./Shape";
import { ShapeUtils } from "./ShapeUtils";
import { Path } from "./Path";

interface ShapeInfo {
    s: Shape;
    p: vec2[];
}
interface PathInfo {
    h: Path;
    p: vec2;
}

export class ShapePath {
    protected _type: string;
    protected _subPaths: Path[];
    protected _currentPath?: Path;

    constructor() {
        this._type = "ShapePath";

        //this.color = new Color();

        this._subPaths = [];
    }

    moveTo(x: number, y: number) {
        this._currentPath = new Path();
        this._subPaths.push(this._currentPath);
        this._currentPath.moveTo(x, y);

        return this;
    }

    lineTo(x: number, y: number) {
        if (this._currentPath) {
            this._currentPath.lineTo(x, y);
        }

        return this;
    }

    quadraticCurveTo(aCPx: number, aCPy: number, aX: number, aY: number) {
        if (this._currentPath) {
            this._currentPath.quadraticCurveTo(aCPx, aCPy, aX, aY);
        }

        return this;
    }

    bezierCurveTo(aCP1x: number, aCP1y: number, aCP2x: number, aCP2y: number, aX: number, aY: number) {
        if (this._currentPath) {
            this._currentPath.bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY);
        }

        return this;
    }

    splineThru(pts: vec2[]) {
        if (this._currentPath) {
            this._currentPath.splineThru(pts);
        }

        return this;
    }

    toShapes(isCCW?: boolean, noHoles?: boolean): Shape[] {
        function toShapesNoHoles(inSubpaths: Path[]) {
            const shapes: Shape[] = [];

            for (let i = 0, l = inSubpaths.length; i < l; i++) {
                const tmpPath = inSubpaths[i];

                const tmpShape = new Shape();
                tmpShape.setCurves(tmpPath.getCurves());

                shapes.push(tmpShape);
            }

            return shapes;
        }

        function isPointInsidePolygon(inPt: vec2, inPolygon: vec2[]) {
            const polyLen = inPolygon.length;

            // inPt on polygon contour => immediate success    or
            // toggling of inside/outside at every single! intersection point of an edge
            //  with the horizontal line through inPt, left of inPt
            //  not counting lowerY endpoints of edges and whole edges on that line
            let inside = false;
            for (let p = polyLen - 1, q = 0; q < polyLen; p = q++) {
                let edgeLowPt = inPolygon[p];
                let edgeHighPt = inPolygon[q];

                let edgeDx = edgeHighPt[0] - edgeLowPt[0];
                let edgeDy = edgeHighPt[1] - edgeLowPt[1];

                if (Math.abs(edgeDy) > Number.EPSILON) {
                    // not parallel
                    if (edgeDy < 0) {
                        edgeLowPt = inPolygon[q];
                        edgeDx = -edgeDx;
                        edgeHighPt = inPolygon[p];
                        edgeDy = -edgeDy;
                    }

                    if (inPt[1] < edgeLowPt[1] || inPt[1] > edgeHighPt[1]) {
                        continue;
                    }

                    if (inPt[1] === edgeLowPt[1]) {
                        if (inPt[0] === edgeLowPt[0]) {
                            return true;
                        }
                    } else {
                        const perpEdge = edgeDy * (inPt[0] - edgeLowPt[0]) - edgeDx * (inPt[1] - edgeLowPt[1]);
                        if (perpEdge === 0) {
                            return true; // inPt is on contour ?
                        }
                        if (perpEdge < 0) {
                            continue;
                        }
                        inside = !inside; // true intersection left of inPt
                    }
                } else {
                    // parallel or collinear
                    if (inPt[1] !== edgeLowPt[1]) {
                        continue;
                    } // parallel
                    // edge lies on the same horizontal line as inPt
                    if (
                        (edgeHighPt[0] <= inPt[0] && inPt[0] <= edgeLowPt[0]) ||
                        (edgeLowPt[0] <= inPt[0] && inPt[0] <= edgeHighPt[0])
                    ) {
                        return true; // inPt: Point on contour !
                    }
                }
            }

            return inside;
        }

        const isClockWise = ShapeUtils.isClockWise;

        const subPaths = this._subPaths;
        if (subPaths.length === 0) {
            return [];
        }

        if (noHoles === true) {
            return toShapesNoHoles(subPaths);
        }

        let tmpPath: Path, tmpShape: Shape;
        const shapes: Shape[] = [];

        if (subPaths.length === 1) {
            tmpPath = subPaths[0];
            tmpShape = new Shape();
            tmpShape.setCurves(tmpPath.getCurves());
            shapes.push(tmpShape);
            return shapes;
        }

        let holesFirst = !isClockWise(subPaths[0].getPoints() as vec2[]);
        holesFirst = isCCW ? !holesFirst : holesFirst;

        //console.log("[ShapePath] Holes first", holesFirst);

        const betterShapeHoles: PathInfo[][] = [];
        const newShapes: (ShapeInfo | undefined)[] = [];
        let newShapeHoles: PathInfo[][] = [];
        let mainIdx = 0;
        let tmpPoints: vec2[];
        let solid: boolean;
        newShapes[mainIdx] = undefined;
        newShapeHoles[mainIdx] = [];

        for (let i = 0, l = subPaths.length; i < l; i++) {
            tmpPath = subPaths[i];
            tmpPoints = tmpPath.getPoints() as vec2[];
            solid = isClockWise(tmpPoints);
            solid = isCCW ? !solid : solid;

            if (solid) {
                if (!holesFirst && newShapes[mainIdx]) {
                    mainIdx++;
                }

                newShapes[mainIdx] = { s: new Shape(), p: tmpPoints };
                (newShapes[mainIdx] as ShapeInfo).s.setCurves(tmpPath.getCurves());

                if (holesFirst) {
                    mainIdx++;
                }
                newShapeHoles[mainIdx] = [];

                //console.log("[ShapePath] cw", i);
            } else {
                newShapeHoles[mainIdx].push({ h: tmpPath, p: tmpPoints[0] });

                //console.log("[ShapePath] ccw", i);
            }
        }

        // only Holes? -> probably all Shapes with wrong orientation
        if (!newShapes[0]) {
            return toShapesNoHoles(subPaths);
        }

        if (newShapes.length > 1) {
            let ambiguous = false;
            const toChange = [];

            for (let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx++) {
                betterShapeHoles[sIdx] = [];
            }

            for (let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx++) {
                const sho = newShapeHoles[sIdx];

                for (let hIdx = 0; hIdx < sho.length; hIdx++) {
                    const ho = sho[hIdx];
                    let hole_unassigned = true;

                    for (let s2Idx = 0; s2Idx < newShapes.length; s2Idx++) {
                        if (isPointInsidePolygon(ho.p, (newShapes[s2Idx] as ShapeInfo).p)) {
                            if (sIdx !== s2Idx) {
                                toChange.push({ froms: sIdx, tos: s2Idx, hole: hIdx });
                            }
                            if (hole_unassigned) {
                                hole_unassigned = false;
                                betterShapeHoles[s2Idx].push(ho);
                            } else {
                                ambiguous = true;
                            }
                        }
                    }

                    if (hole_unassigned) {
                        betterShapeHoles[sIdx].push(ho);
                    }
                }
            }
            // console.log("ambiguous: ", ambiguous);

            if (toChange.length > 0) {
                //console.log("[ShapePath] to change: ", toChange);
                if (!ambiguous) {
                    newShapeHoles = betterShapeHoles;
                }
            }
        }

        let tmpHoles;

        for (let i = 0, il = newShapes.length; i < il; i++) {
            tmpShape = (newShapes[i] as ShapeInfo).s;
            shapes.push(tmpShape);
            tmpHoles = newShapeHoles[i];

            const holes: Path[] = [];
            for (let j = 0, jl = tmpHoles.length; j < jl; j++) {
                holes.push(tmpHoles[j].h);
            }

            tmpShape.setHoles(holes);
        }

        //console.log("shape", shapes);

        return shapes;
    }
}
