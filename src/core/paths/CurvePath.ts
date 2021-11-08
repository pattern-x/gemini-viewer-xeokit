/* eslint-disable @typescript-eslint/no-explicit-any */
import { utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { Curve, VecType } from "./Curve";
import { createCurveByType, CurveType } from "./Curves";
import { vec2, vec3 } from "gl-matrix";
import { LineCurve } from "./LineCurve";
import { SplineCurve } from "./SplineCurve";

/**************************************************************
 *	Curved Path - a curve path is simply a array of connected
 *  curves, but retains the api of a curve
 **************************************************************/

export class CurvePath extends Curve<VecType> {
    protected _curves: Curve<VecType>[];
    protected _autoClose: boolean;
    protected _cachedLengths: number[];

    constructor() {
        super();

        this._type = CurveType.CURVE_PATH;
        this._curves = [];
        this._cachedLengths = [];
        this._autoClose = false; // Automatically closes the path
    }

    add(curve: Curve<VecType>) {
        this._curves.push(curve);
    }

    closePath() {
        // Add a line curve if start and end of lines are not connected
        const startPoint = this._curves[0].getPoint(0);
        const endPoint = this._curves[this._curves.length - 1].getPoint(1);

        if (startPoint.length === 2) {
            if (!vec2.equals(startPoint, endPoint as vec2)) {
                this._curves.push(new LineCurve(endPoint as vec2, startPoint as vec2));
            }
        } else {
            //TODO vec3
            console.log("[CurvePath] 3d is not yet supported in closePath()");
        }
    }

    // To get accurate point with reference to
    // entire path distance at time t,
    // following has to be done:

    // 1. Length of each sub path have to be known
    // 2. Locate and identify type of curve
    // 3. Get t for the curve
    // 4. Return curve.getPointAt(t')

    getPoint(t: number): VecType {
        const d = t * this.getLength();
        const curveLengths = this.getCurveLengths();
        let i = 0;

        // To think about boundaries points.

        while (i < curveLengths.length) {
            if (curveLengths[i] >= d) {
                const diff = curveLengths[i] - d;
                const curve = this._curves[i];

                const segmentLength = curve.getLength();
                const u = segmentLength === 0 ? 0 : 1 - diff / segmentLength;

                return curve.getPointAt(u);
            }

            i++;
        }

        //TODO
        console.warn(`[CurvePath] Failed to find point for getPoint(${t})!`);
        return vec2.create();

        // loop where sum != 0, sum > d , sum+1 <d
    }

    // We cannot use the default THREE.Curve getPoint() with getLength() because in
    // THREE.Curve, getLength() depends on getPoint() but in THREE.CurvePath
    // getPoint() depends on getLength

    getLength() {
        const lens = this.getCurveLengths();
        return lens[lens.length - 1];
    }

    // cacheLengths must be recalculated.
    updateArcLengths() {
        this._needsUpdate = true;
        this._cachedLengths = [];
        this.getCurveLengths();
    }

    // Compute lengths and cache them
    // We cannot overwrite getLengths() because UtoT mapping uses it.

    getCurveLengths() {
        // We use cache values if curves and cache array are same length

        if (this._cachedLengths && this._cachedLengths.length === this._curves.length) {
            return this._cachedLengths;
        }

        // Get length of sub-curve
        // Push sums into cached array

        const lengths: number[] = [];
        let sums = 0;

        for (let i = 0, l = this._curves.length; i < l; i++) {
            sums += this._curves[i].getLength();
            lengths.push(sums);
        }

        this._cachedLengths = lengths;

        return lengths;
    }

    getSpacedPoints(divisions = 40) {
        const points = [];

        for (let i = 0; i <= divisions; i++) {
            points.push(this.getPoint(i / divisions));
        }

        if (this._autoClose) {
            points.push(points[0]);
        }

        return points;
    }

    getPoints(divisions = 12) {
        const points: VecType[] = [];
        let last: VecType | undefined;

        for (let i = 0, curves = this._curves; i < curves.length; i++) {
            const curve = curves[i];
            // const resolution =
            //     curve && curve.isEllipseCurve()
            //         ? divisions * 2
            //         : curve && curve.isLineCurve() // || curve.isLineCurve3)
            //         ? 1
            //         : curve && curve.isSplineCurve()
            //         ? divisions * curve.points.length
            //         : divisions;
            let resolution: number;
            switch (curve.getType()) {
                case CurveType.ELLIPSE_CURVE:
                    resolution = divisions * 2;
                    break;
                case CurveType.LINE_CURVE:
                    resolution = 1;
                    break;
                case CurveType.SPLINE_CURVE:
                    resolution = divisions * (curve as SplineCurve).points.length;
                    break;
                default:
                    resolution = divisions;
                    break;
            }

            const pts = curve.getPoints(resolution);
            const isVec2 = pts.length > 0 && pts[0].length === 2;

            for (let j = 0; j < pts.length; j++) {
                const point = pts[j];

                if (last) {
                    let isEqual = false;
                    if (isVec2) {
                        isEqual = vec2.equals(last as vec2, point as vec2);
                    } else {
                        isEqual = vec3.equals(last as vec3, point as vec3);
                    }

                    if (isEqual) {
                        continue;
                    } // ensures no consecutive points are duplicates
                }

                points.push(point);
                last = point;
            }
        }

        if (this._autoClose && points.length > 1) {
            const isVec2 = points[0].length === 2;
            let isEqual = false;
            if (isVec2) {
                isEqual = vec2.equals(points[points.length - 1] as vec2, points[0] as vec2);
            } else {
                isEqual = vec3.equals(points[points.length - 1] as vec3, points[0] as vec3);
            }
            if (!isEqual) {
                points.push(points[0]);
            }
        }

        return points;
    }

    copy(source: CurvePath) {
        super.copy(source);

        this._curves = [];

        let newCurve: Curve<VecType> | undefined;
        for (let i = 0, l = source._curves.length; i < l; i++) {
            const curve = source._curves[i];
            //TODO
            //this.curves.push(curve.clone());
            newCurve = createCurveByType(curve.getType());
            if (newCurve) {
                this._curves.push(newCurve.copy(curve));
            }
        }

        this._autoClose = source._autoClose;

        return this;
    }

    toJSON() {
        const data = super.toJSON();
        // const result = {};
        //result.autoClose = this.autoClose;
        const curves = [];

        for (let i = 0, l = this._curves.length; i < l; i++) {
            const curve = this._curves[i];
            curves.push(curve.toJSON());
        }

        return utils.apply(data, {
            autoClose: this._autoClose,
            curves: curves,
        });
    }

    fromJSON(json: any) {
        super.fromJSON(json);

        this._autoClose = json.autoClose;
        this._curves = [];
        let newCurve: Curve<VecType> | undefined;
        for (let i = 0, l = json.curves.length; i < l; i++) {
            const curve = json.curves[i];
            newCurve = createCurveByType(curve.type);
            if (newCurve) {
                this._curves.push(newCurve.fromJSON(curve));
            }
        }

        return this;
    }
}
