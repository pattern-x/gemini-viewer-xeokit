/* eslint-disable @typescript-eslint/no-explicit-any */
import { utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { Curve } from "./Curve";
import { CurveType } from "./Curves";
import { vec2 } from "gl-matrix";

export class EllipseCurve extends Curve<vec2> {
    protected _aX: number;
    protected _aY: number;
    protected _xRadius: number;
    protected _yRadius: number;
    protected _aStartAngle: number;
    protected _aEndAngle: number;
    protected _aClockwise: boolean;
    protected _aRotation: number;

    constructor(
        aX = 0,
        aY = 0,
        xRadius = 1,
        yRadius = 1,
        aStartAngle = 0,
        aEndAngle = Math.PI * 2,
        aClockwise = false,
        aRotation = 0
    ) {
        super();

        this._type = CurveType.ELLIPSE_CURVE;

        this._aX = aX;
        this._aY = aY;

        this._xRadius = xRadius;
        this._yRadius = yRadius;

        this._aStartAngle = aStartAngle;
        this._aEndAngle = aEndAngle;

        this._aClockwise = aClockwise;

        this._aRotation = aRotation;
    }

    getPoint(t: number, optionalTarget?: vec2) {
        const point = optionalTarget || vec2.create();

        const twoPi = Math.PI * 2;
        let deltaAngle = this._aEndAngle - this._aStartAngle;
        const samePoints = Math.abs(deltaAngle) < Number.EPSILON;

        // ensures that deltaAngle is 0 .. 2 PI
        while (deltaAngle < 0) {
            deltaAngle += twoPi;
        }
        while (deltaAngle > twoPi) {
            deltaAngle -= twoPi;
        }

        if (deltaAngle < Number.EPSILON) {
            if (samePoints) {
                deltaAngle = 0;
            } else {
                deltaAngle = twoPi;
            }
        }

        if (this._aClockwise === true && !samePoints) {
            if (deltaAngle === twoPi) {
                deltaAngle = -twoPi;
            } else {
                deltaAngle = deltaAngle - twoPi;
            }
        }

        const angle = this._aStartAngle + t * deltaAngle;
        let x = this._aX + this._xRadius * Math.cos(angle);
        let y = this._aY + this._yRadius * Math.sin(angle);

        if (this._aRotation !== 0) {
            const cos = Math.cos(this._aRotation);
            const sin = Math.sin(this._aRotation);

            const tx = x - this._aX;
            const ty = y - this._aY;

            // Rotate the point about the center of the ellipse.
            x = tx * cos - ty * sin + this._aX;
            y = tx * sin + ty * cos + this._aY;
        }

        return vec2.set(point, x, y);
    }

    copy(source: EllipseCurve) {
        super.copy(source);

        this._aX = source._aX;
        this._aY = source._aY;

        this._xRadius = source._xRadius;
        this._yRadius = source._yRadius;

        this._aStartAngle = source._aStartAngle;
        this._aEndAngle = source._aEndAngle;

        this._aClockwise = source._aClockwise;

        this._aRotation = source._aRotation;

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        // data.aX = this.aX;
        // data.aY = this.aY;

        // data.xRadius = this.xRadius;
        // data.yRadius = this.yRadius;

        // data.aStartAngle = this.aStartAngle;
        // data.aEndAngle = this.aEndAngle;

        // data.aClockwise = this.aClockwise;

        // data.aRotation = this.aRotation;

        return utils.apply(data, {
            aX: this._aX,
            aY: this._aY,
            xRadius: this._xRadius,
            yRadius: this._yRadius,
            aStartAngle: this._aStartAngle,
            aEndAngle: this._aEndAngle,
            aClockwise: this._aClockwise,
            aRotation: this._aRotation,
        });
    }

    fromJSON(json: any) {
        super.fromJSON(json);

        this._aX = json.aX;
        this._aY = json.aY;

        this._xRadius = json.xRadius;
        this._yRadius = json.yRadius;

        this._aStartAngle = json.aStartAngle;
        this._aEndAngle = json.aEndAngle;

        this._aClockwise = json.aClockwise;

        this._aRotation = json.aRotation;

        return this;
    }
}
