import { utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { Curve } from "./Curve";
import { CurveType } from "./Curves";
import { vec2 } from "gl-matrix";
import { QuadraticBezier } from "./Interpolations";

export class QuadraticBezierCurve extends Curve<vec2> {
    protected _v0: vec2;
    protected _v1: vec2;
    protected _v2: vec2;

    constructor(v0 = vec2.create(), v1 = vec2.create(), v2 = vec2.create()) {
        super();

        this._type = CurveType.QUADRATIC_BEZIER_CURVE;

        this._v0 = v0;
        this._v1 = v1;
        this._v2 = v2;
    }

    getPoint(t: number, optionalTarget = vec2.create()) {
        const point = optionalTarget;

        const v0 = this._v0,
            v1 = this._v1,
            v2 = this._v2;

        const x = QuadraticBezier(t, v0[0], v1[0], v2[0]);
        const y = QuadraticBezier(t, v0[1], v1[1], v2[1]);
        vec2.set(point, x, y);

        return point;
    }

    copy(source: QuadraticBezierCurve) {
        super.copy(source);

        // this.v0.copy(source.v0);
        // this.v1.copy(source.v1);
        // this.v2.copy(source.v2);

        vec2.copy(this._v0, source._v0);
        vec2.copy(this._v1, source._v1);
        vec2.copy(this._v2, source._v2);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        return utils.apply(data, {
            v0: [...this._v0],
            v1: [...this._v1],
            v2: [...this._v2],
        });
    }

    fromJSON(json: any) { // eslint-disable-line
        super.fromJSON(json);

        vec2.set(this._v0, json.v0[0], json.v0[1]);
        vec2.set(this._v1, json.v1[0], json.v1[1]);
        vec2.set(this._v2, json.v2[0], json.v2[1]);

        return this;
    }
}
