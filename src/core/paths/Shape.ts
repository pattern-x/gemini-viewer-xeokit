import { math } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { CurveType } from "./Curves";
import { vec2 } from "gl-matrix";
import { Path } from "./Path";

export class Shape extends Path {
    protected _uuid: string;
    protected _holes: Path[];

    constructor(points?: vec2[]) {
        super(points);

        this._uuid = math.createUUID();

        this._type = CurveType.SHAPE;

        this._holes = [];
    }

    setHoles(value: Path[]) {
        this._holes = value;
    }

    getPointsHoles(divisions: number) {
        const holesPts: vec2[][] = [];

        for (let i = 0, l = this._holes.length; i < l; i++) {
            holesPts[i] = this._holes[i].getPoints(divisions) as vec2[];
        }

        return holesPts;
    }

    // get points of shape and holes (keypoints based on segments parameter)

    extractPoints(divisions: number) {
        return {
            shape: this.getPoints(divisions),
            holes: this.getPointsHoles(divisions),
        };
    }

    copy(source: Shape) {
        super.copy(source);

        this._holes = [];

        for (let i = 0, l = source._holes.length; i < l; i++) {
            const hole = source._holes[i];
            const newHole = new Path();

            this._holes.push(newHole.copy(hole));
        }

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.uuid = this._uuid;
        data.holes = [];

        for (let i = 0, l = this._holes.length; i < l; i++) {
            const hole = this._holes[i];
            data.holes.push(hole.toJSON());
        }

        return data;
    }

    fromJSON(json: any) { // eslint-disable-line
        super.fromJSON(json);

        this._uuid = json.uuid;
        this._holes = [];

        for (let i = 0, l = json.holes.length; i < l; i++) {
            const hole = json.holes[i];
            this._holes.push(new Path().fromJSON(hole));
        }

        return this;
    }
}
