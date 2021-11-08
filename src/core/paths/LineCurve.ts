import { utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { Curve } from "./Curve";
import { CurveType } from "./Curves";
import { vec2 } from "gl-matrix";

export class LineCurve extends Curve<vec2> {
    private _v1: vec2;
    private _v2: vec2;

    constructor(v1 = vec2.create(), v2 = vec2.create()) {
        super();

        this._type = CurveType.LINE_CURVE;

        this._v1 = v1;
        this._v2 = v2;
    }

    getPoint(t: number, optionalTarget = vec2.create()) {
        const point = optionalTarget;

        if (t === 1) {
            vec2.copy(point, this._v2);
        } else {
            vec2.copy(point, this._v2);
            vec2.sub(point, point, this._v1);
            //point.multiplyScalar(t).add(this.v1);
            vec2.scale(point, point, t);
            vec2.add(point, point, this._v1);
        }

        return point;
    }

    // Line curve is linear, so we can overwrite default getPointAt
    getPointAt(u: number, optionalTarget?: vec2) {
        return this.getPoint(u, optionalTarget);
    }

    getTangent(t: number, optionalTarget?: vec2) {
        const tangent = optionalTarget || vec2.create();

        //tangent.copy(this.v2).sub(this.v1).normalize();

        vec2.copy(tangent, this._v2);
        vec2.sub(tangent, tangent, this._v1);
        vec2.normalize(tangent, tangent);

        return tangent;
    }

    copy(source: LineCurve) {
        super.copy(source);

        //this.v1.copy(source.v1);
        vec2.copy(this._v1, source._v1);
        //this.v2.copy(source.v2);
        vec2.copy(this._v2, source._v2);
        return this;
    }

    toJSON() {
        const data = super.toJSON();

        utils.apply(data, {
            v1: [...this._v1],
            v2: [...this._v2],
        });
        //data.v1 = this.v1.toArray();
        //data.v2 = this.v2.toArray();

        return data;
    }

    fromJSON(json: any) { // eslint-disable-line
        super.fromJSON(json);

        //this.v1.fromArray(json.v1);
        //this.v2.fromArray(json.v2);

        vec2.set(this._v1, json.v1[0], json.v1[1]);
        vec2.set(this._v2, json.v2[0], json.v2[1]);

        return this;
    }
}
