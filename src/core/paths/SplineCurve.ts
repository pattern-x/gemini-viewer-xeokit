import { utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { Curve } from "./Curve";
import { CurveType } from "./Curves";
import { vec2 } from "gl-matrix";
import { CatmullRom } from "./Interpolations";

export class SplineCurve extends Curve<vec2> {
    points: vec2[];

    constructor(points: vec2[] = []) {
        super();

        this._type = CurveType.SPLINE_CURVE;

        this.points = points;
    }

    getPoint(t: number, optionalTarget = vec2.create()) {
        const point = optionalTarget;

        const points = this.points;
        const p = (points.length - 1) * t;

        const intPoint = Math.floor(p);
        const weight = p - intPoint;

        const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
        const p1 = points[intPoint];
        const p2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
        const p3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];

        const x = CatmullRom(weight, p0[0], p1[0], p2[0], p3[0]);
        const y = CatmullRom(weight, p0[1], p1[1], p2[1], p3[1]);
        vec2.set(point, x, y);

        return point;
    }

    copy(source: SplineCurve) {
        super.copy(source);

        this.points = [];

        for (let i = 0, l = source.points.length; i < l; i++) {
            const point = source.points[i];

            this.points.push(vec2.clone(point));
        }

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        const points = [];

        for (let i = 0, l = this.points.length; i < l; i++) {
            const point = this.points[i];
            points.push([...point]);
        }

        return utils.apply(data, {
            points,
        });
    }

    fromJSON(json: any) { // eslint-disable-line
        super.fromJSON(json);

        this.points = [];

        for (let i = 0, l = json.points.length; i < l; i++) {
            const point = json.points[i];
            this.points.push(vec2.fromValues(point[0], point[1]));
        }

        return this;
    }
}
