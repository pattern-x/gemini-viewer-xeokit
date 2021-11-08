/* eslint-disable @typescript-eslint/no-explicit-any */
import { CubicBezierCurve } from "./CubicBezierCurve";
import { Curve, VecType } from "./Curve";
import { CurveType } from "./Curves";
import { CurvePath } from "./CurvePath";
import { EllipseCurve } from "./EllipseCurve";
import { LineCurve } from "./LineCurve";
import { vec2 } from "gl-matrix";
import { SplineCurve } from "./SplineCurve";
import { QuadraticBezierCurve } from "./QuadraticBezierCurve";

export class Path extends CurvePath {
    protected _currentPoint: vec2;

    constructor(points?: vec2[]) {
        super();
        this._type = CurveType.PATH;

        this._currentPoint = vec2.create();

        if (points) {
            this.setFromPoints(points);
        }
    }

    setFromPoints(points: vec2[]) {
        this.moveTo(points[0][0], points[0][1]);

        for (let i = 1, l = points.length; i < l; i++) {
            this.lineTo(points[i][0], points[i][0]);
        }

        return this;
    }

    setCurves(value: Curve<VecType>[]) {
        this._curves = value;
    }

    getCurves() {
        return this._curves;
    }

    moveTo(x: number, y: number) {
        //this.currentPoint.set(x, y); // TODO consider referencing vectors instead of copying?
        vec2.set(this._currentPoint, x, y);
        return this;
    }

    lineTo(x: number, y: number) {
        const curve = new LineCurve(vec2.clone(this._currentPoint), vec2.fromValues(x, y));
        this._curves.push(curve);

        //this.currentPoint.set(x, y);
        vec2.set(this._currentPoint, x, y);
        return this;
    }

    quadraticCurveTo(aCPx: number, aCPy: number, aX: number, aY: number) {
        const curve = new QuadraticBezierCurve(
            vec2.clone(this._currentPoint),
            vec2.fromValues(aCPx, aCPy),
            vec2.fromValues(aX, aY)
        );

        this._curves.push(curve);

        //this.currentPoint.set(aX, aY);
        vec2.set(this._currentPoint, aX, aY);
        return this;
    }

    bezierCurveTo(aCP1x: number, aCP1y: number, aCP2x: number, aCP2y: number, aX: number, aY: number) {
        const curve = new CubicBezierCurve(
            vec2.clone(this._currentPoint),
            vec2.fromValues(aCP1x, aCP1y),
            vec2.fromValues(aCP2x, aCP2y),
            vec2.fromValues(aX, aY)
        );

        this._curves.push(curve);

        //this.currentPoint.set(aX, aY);
        vec2.set(this._currentPoint, aX, aY);
        return this;
    }

    splineThru(pts: vec2[]) {
        const npts = [vec2.clone(this._currentPoint)].concat(pts);

        const curve = new SplineCurve(npts);
        this._curves.push(curve);

        vec2.copy(this._currentPoint, pts[pts.length - 1]);

        return this;
    }

    arc(aX: number, aY: number, aRadius: number, aStartAngle: number, aEndAngle: number, aClockwise?: boolean) {
        const x0 = this._currentPoint[0];
        const y0 = this._currentPoint[1];

        this.absarc(aX + x0, aY + y0, aRadius, aStartAngle, aEndAngle, aClockwise);

        return this;
    }

    absarc(aX: number, aY: number, aRadius: number, aStartAngle: number, aEndAngle: number, aClockwise?: boolean) {
        this.absellipse(aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise);

        return this;
    }

    ellipse(
        aX: number,
        aY: number,
        xRadius: number,
        yRadius: number,
        aStartAngle: number,
        aEndAngle: number,
        aClockwise?: boolean,
        aRotation?: number
    ) {
        const x0 = this._currentPoint[0];
        const y0 = this._currentPoint[1];

        this.absellipse(aX + x0, aY + y0, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation);

        return this;
    }

    absellipse(
        aX: number,
        aY: number,
        xRadius: number,
        yRadius: number,
        aStartAngle: number,
        aEndAngle: number,
        aClockwise?: boolean,
        aRotation?: number
    ) {
        const curve = new EllipseCurve(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation);

        if (this._curves.length > 0) {
            // if a previous curve is present, attempt to join
            const firstPoint = curve.getPoint(0);

            if (!vec2.equals(firstPoint, this._currentPoint)) {
                this.lineTo(firstPoint[0], firstPoint[1]);
            }
        }

        this._curves.push(curve);

        const lastPoint = curve.getPoint(1);
        //this.currentPoint.copy(lastPoint);
        vec2.copy(this._currentPoint, lastPoint);
        return this;
    }

    copy(source: Path) {
        super.copy(source);

        //this.currentPoint.copy(source.currentPoint);
        vec2.copy(this._currentPoint, source._currentPoint);
        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.currentPoint = [...this._currentPoint];

        return data;
    }

    fromJSON(json: any) {
        super.fromJSON(json);

        //this.currentPoint.fromArray(json.currentPoint);
        vec2.set(this._currentPoint, json.currentPoint[0], json.currentPoint[1]);
        return this;
    }
}
