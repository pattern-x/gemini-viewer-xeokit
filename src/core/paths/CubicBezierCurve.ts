/* eslint-disable @typescript-eslint/no-explicit-any */
import { utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { CubicBezier } from "./Interpolations";
import { Curve } from "./Curve";
import { CurveType } from "./Curves";
import { vec2 } from "gl-matrix";

export class CubicBezierCurve extends Curve<vec2> {
    protected _v0: vec2;
    protected _v1: vec2;
    protected _v2: vec2;
    protected _v3: vec2;

    constructor(v0 = vec2.create(), v1 = vec2.create(), v2 = vec2.create(), v3 = vec2.create()) {
        super();

        this._type = CurveType.CUBIC_BEZIER_CURVE;

        this._v0 = v0;
        this._v1 = v1;
        this._v2 = v2;
        this._v3 = v3;
    }

    getPoint(t: number, optionalTarget = vec2.create()) {
        const point = optionalTarget;

        const v0 = this._v0,
            v1 = this._v1,
            v2 = this._v2,
            v3 = this._v3;

        const x = CubicBezier(t, v0[0], v1[0], v2[0], v3[0]);
        const y = CubicBezier(t, v0[1], v1[1], v2[1], v3[1]);
        vec2.set(point, x, y);

        return point;
    }

    copy(source: CubicBezierCurve) {
        super.copy(source);

        vec2.copy(this._v0, source._v0);
        vec2.copy(this._v1, source._v1);
        vec2.copy(this._v2, source._v2);
        vec2.copy(this._v3, source._v3);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        // data.v0 = this.v0.toArray();
        // data.v1 = this.v1.toArray();
        // data.v2 = this.v2.toArray();
        // data.v3 = this.v3.toArray();

        return utils.apply(data, {
            v0: [...this._v0],
            v1: [...this._v1],
            v2: [...this._v2],
            v3: [...this._v3],
        });
    }

    fromJSON(json: any) {
        super.fromJSON(json);

        vec2.set(this._v0, json.v0[0], json.v0[1]);
        vec2.set(this._v1, json.v1[0], json.v1[1]);
        vec2.set(this._v2, json.v2[0], json.v2[1]);
        vec2.set(this._v3, json.v3[0], json.v3[1]);

        return this;
    }
}
