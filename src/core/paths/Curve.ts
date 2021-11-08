/* eslint-disable @typescript-eslint/no-explicit-any */
import { math } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { CurveType } from "./Curves";
import { mat4, ReadonlyVec2, ReadonlyVec3, vec2, vec3 } from "gl-matrix";
/**
 * Reference to https://github.com/mrdoob/three.js/blob/dev/src/extras/core/Curve.js
 * Extensible curve object.
 *
 * Some comments of curve methods:
 * .getPoint( t, optionalTarget ), .getTangent( t, optionalTarget )
 * .getPointAt( u, optionalTarget ), .getTangentAt( u, optionalTarget )
 * .getPoints(), .getSpacedPoints()
 * .getLength()
 * .updateArcLengths()
 *
 * Following curves inherit from Curve:
 *
 * -- 2D curves --
 * ArcCurve
 * CubicBezierCurve
 * EllipseCurve
 * LineCurve
 * QuadraticBezierCurve
 * SplineCurve
 *
 * -- 3D curves --
 * CatmullRomCurve3
 * CubicBezierCurve3
 * LineCurve3
 * QuadraticBezierCurve3
 *
 * A series of curves can represent as a CurvePath.
 *
 **/

export type VecType = vec2 | vec3;
export abstract class Curve<Type extends VecType> {
    protected _type: CurveType;
    protected _arcLengthDivisions: number;
    protected _cachedArcLengths: number[] = [];
    protected _needsUpdate = true;

    constructor() {
        this._type = CurveType.CURVE;

        this._arcLengthDivisions = 200;
    }

    getType() {
        return this._type;
    }

    // Virtual base class method to overwrite and implement in subclasses
    //	- t [0 .. 1]

    abstract getPoint(t: number, optionalTarget?: Type): Type;

    // Get point at relative position in curve according to arc length
    // - u [0 .. 1]

    getPointAt(u: number, optionalTarget?: Type) {
        const t = this.getUtoTmapping(u);
        return this.getPoint(t, optionalTarget);
    }

    // Get sequence of points using getPoint( t )

    getPoints(divisions = 5) {
        const points = [];

        for (let i = 0; i <= divisions; i++) {
            points.push(this.getPoint(i / divisions));
        }

        return points;
    }

    // Get sequence of points using getPointAt( u )

    getSpacedPoints(divisions = 5) {
        const points = [];

        for (let d = 0; d <= divisions; d++) {
            points.push(this.getPointAt(d / divisions));
        }

        return points;
    }

    // Get total curve arc length

    getLength() {
        const lengths = this.getLengths();
        return lengths[lengths.length - 1];
    }

    // Get list of cumulative segment lengths

    getLengths(divisions = this._arcLengthDivisions) {
        if (this._cachedArcLengths && this._cachedArcLengths.length === divisions + 1 && !this._needsUpdate) {
            return this._cachedArcLengths;
        }

        this._needsUpdate = false;

        const cache: number[] = [];
        let current: Type,
            last = this.getPoint(0);
        let sum = 0;

        cache.push(0);

        for (let p = 1; p <= divisions; p++) {
            current = this.getPoint(p / divisions);
            sum +=
                current.length === 2
                    ? vec2.distance(current as ReadonlyVec2, last as ReadonlyVec2)
                    : vec3.distance(current as ReadonlyVec3, last as ReadonlyVec3); //current.distanceTo(last);

            cache.push(sum);
            last = current;
        }

        this._cachedArcLengths = cache;

        return cache; // { sums: cache, sum: sum }; Sum is in the last element.
    }

    updateArcLengths() {
        this._needsUpdate = true;
        this.getLengths();
    }

    // Given u ( 0 .. 1 ), get a t to find p. This gives you points which are equidistant

    getUtoTmapping(u: number, distance?: number) {
        const arcLengths = this.getLengths();

        let i = 0;
        const il = arcLengths.length;

        let targetArcLength; // The targeted u distance value to get

        if (distance) {
            targetArcLength = distance;
        } else {
            targetArcLength = u * arcLengths[il - 1];
        }

        // binary search for the index with largest value smaller than target u distance

        let low = 0,
            high = il - 1,
            comparison;

        while (low <= high) {
            i = Math.floor(low + (high - low) / 2); // less likely to overflow, though probably not issue here, JS doesn't really have integers, all numbers are floats

            comparison = arcLengths[i] - targetArcLength;

            if (comparison < 0) {
                low = i + 1;
            } else if (comparison > 0) {
                high = i - 1;
            } else {
                high = i;
                break;

                // DONE
            }
        }

        i = high;

        if (arcLengths[i] === targetArcLength) {
            return i / (il - 1);
        }

        // we could get finer grain at lengths, or use simple interpolation between two points

        const lengthBefore = arcLengths[i];
        const lengthAfter = arcLengths[i + 1];

        const segmentLength = lengthAfter - lengthBefore;

        // determine where we are between the 'before' and 'after' points

        const segmentFraction = (targetArcLength - lengthBefore) / segmentLength;

        // add that fractional amount to t

        const t = (i + segmentFraction) / (il - 1);

        return t;
    }

    // Returns a unit vector tangent at t
    // In case any sub curve does not implement its tangent derivation,
    // 2 points a small delta apart will be used to find its gradient
    // which seems to give a reasonable approximation

    getTangent(t: number, optionalTarget?: Type) {
        const delta = 0.0001;
        let t1 = t - delta;
        let t2 = t + delta;

        // Capping in case of danger

        if (t1 < 0) {
            t1 = 0;
        }
        if (t2 > 1) {
            t2 = 1;
        }

        const pt1 = this.getPoint(t1);
        const pt2 = this.getPoint(t2);

        // const tangent = optionalTarget || (pt1.isVector2 ? new Vector2() : new Vector3());

        // tangent.copy(pt2).sub(pt1).normalize();
        const tangent = optionalTarget || (pt1.length === 2 ? vec2.create() : vec3.create());

        if (pt1.length === 2) {
            vec2.copy(tangent as vec2, pt2 as ReadonlyVec2);
            vec2.sub(tangent as vec2, tangent as ReadonlyVec2, pt1 as ReadonlyVec2);
            vec2.normalize(tangent as vec2, tangent as ReadonlyVec2);
        } else {
            vec3.copy(tangent as vec3, pt2 as ReadonlyVec3);
            vec3.sub(tangent as vec3, tangent as ReadonlyVec3, pt1 as ReadonlyVec3);
            vec3.normalize(tangent as vec3, tangent as ReadonlyVec3);
        }

        return tangent;
    }

    getTangentAt(u: number, optionalTarget?: Type) {
        const t = this.getUtoTmapping(u);
        return this.getTangent(t, optionalTarget);
    }

    computeFrenetFrames(segments: number, closed?: boolean) {
        // see http://www.cs.indiana.edu/pub/techreports/TR425.pdf

        const normal = vec3.create();

        const tangents: vec3[] = [];
        const normals: vec3[] = [];
        const binormals: vec3[] = [];

        const vec = vec3.create();
        const mat = mat4.create();

        // compute the tangent vectors for each segment on the curve

        for (let i = 0; i <= segments; i++) {
            const u = i / segments;

            tangents[i] = this.getTangentAt(u, vec3.create() as Type) as vec3;
            //tangents[i].normalize();
            vec3.normalize(tangents[i], tangents[i]);
        }

        // select an initial normal vector perpendicular to the first tangent vector,
        // and in the direction of the minimum tangent xyz component

        normals[0] = vec3.create();
        binormals[0] = vec3.create();
        let min = Number.MAX_VALUE;
        const tx = Math.abs(tangents[0][0]);
        const ty = Math.abs(tangents[0][1]);
        const tz = Math.abs(tangents[0][2]);

        if (tx <= min) {
            min = tx;
            //normal.set(1, 0, 0);
            vec3.set(normal, 1, 0, 0);
        }

        if (ty <= min) {
            min = ty;
            //normal.set(0, 1, 0);
            vec3.set(normal, 0, 1, 0);
        }

        if (tz <= min) {
            //normal.set(0, 0, 1);
            vec3.set(normal, 0, 0, 1);
        }

        //vec.crossVectors(tangents[0], normal).normalize();
        crossVectors(vec, tangents[0], normal);

        //normals[0].crossVectors(tangents[0], vec);
        crossVectors(normals[0], tangents[0], vec);

        //binormals[0].crossVectors(tangents[0], normals[0]);
        crossVectors(binormals[0], tangents[0], normals[0]);

        // compute the slowly-varying normal and binormal vectors for each segment on the curve

        for (let i = 1; i <= segments; i++) {
            normals[i] = vec3.clone(normals[i - 1]);
            binormals[i] = vec3.clone(binormals[i - 1]);

            crossVectors(vec, tangents[i - 1], tangents[i]);

            if (vec3.length(vec) > Number.EPSILON) {
                vec3.normalize(vec, vec);

                const theta = Math.acos(math.clamp(vec3.dot(tangents[i - 1], tangents[i]), -1, 1)); // clamp for floating pt errors

                //normals[i].applyMatrix4(mat.makeRotationAxis(vec, theta));

                mat4.fromRotation(mat, theta, vec);
                vec3.transformMat4(normals[i], normals[i], mat);
            }

            //binormals[i].crossVectors(tangents[i], normals[i]);
            crossVectors(binormals[i], tangents[i], normals[i]);
        }

        // if the curve is closed, postprocess the vectors so the first and last normal vectors are the same

        if (closed === true) {
            let theta = Math.acos(math.clamp(vec3.dot(normals[0], normals[segments]), -1, 1));
            theta /= segments;

            crossVectors(vec, normals[0], normals[segments]);
            if (vec3.dot(tangents[0], vec) > 0) {
                theta = -theta;
            }

            for (let i = 1; i <= segments; i++) {
                // twist a little...
                //normals[i].applyMatrix4(mat.makeRotationAxis(tangents[i], theta * i));
                mat4.fromRotation(mat, theta * i, tangents[i]);
                vec3.transformMat4(normals[i], normals[i], mat);
                //binormals[i].crossVectors(tangents[i], normals[i]);
                crossVectors(binormals[i], tangents[i], normals[i]);
            }
        }

        return {
            tangents: tangents,
            normals: normals,
            binormals: binormals,
        };
    }

    copy(source: Curve<Type>) {
        this._arcLengthDivisions = source._arcLengthDivisions;

        return this;
    }

    toJSON() {
        const data = {
            metadata: {
                version: 4.5,
                type: "Curve",
                generator: "Curve.toJSON",
            },
            arcLengthDivisions: this._arcLengthDivisions,
            type: this._type,
        };

        return data;
    }

    fromJSON(json: any) {
        this._arcLengthDivisions = json.arcLengthDivisions;

        return this;
    }

    // isEllipseCurve(): this is EllipseCurve {
    //     return this instanceof EllipseCurve;
    // }

    // isCubicBezierCurve(): this is CubicBezierCurve {
    //     return this instanceof CubicBezierCurve;
    // }

    // isQuadraticBezierCurve(): this is QuadraticBezierCurve {
    //     return this instanceof QuadraticBezierCurve;
    // }

    // isSplineCurve(): this is SplineCurve {
    //     return this instanceof SplineCurve;
    // }

    // isLineCurve(): this is LineCurve {
    //     return this instanceof LineCurve;
    // }
}

function crossVectors(outVec: vec3, firstVec: vec3, secondVec: vec3) {
    vec3.cross(outVec, firstVec, secondVec);
    vec3.normalize(outVec, outVec);
}
