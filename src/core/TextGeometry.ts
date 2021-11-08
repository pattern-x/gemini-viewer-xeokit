import { TextGeometryParameter } from "../services/FontManager";
import { vec2 } from "gl-matrix";
import { ShapeUtils } from "./paths/ShapeUtils";
import { Shape } from "./paths/Shape";

export class TextGeometry {
    //TODO Don't care about normals and UVs
    static extrudeGeometry(shapes: Shape[], options: TextGeometryParameter, swapYZ = true) {
        shapes = Array.isArray(shapes) ? shapes : [shapes];

        const verticesArray: number[] = [];
        //const uvArray = [];

        for (let i = 0, l = shapes.length; i < l; i++) {
            const shape = shapes[i];
            addShape(shape);
        }

        if (verticesArray.length % 9 !== 0) {
            console.error("[TextGeometry] vertices count is not a multiple of 3");
            return undefined;
        }

        return {
            indices: getGeometryIndices(verticesArray),
            positions: verticesArray,
        };

        //this.setAttribute("position", new Float32BufferAttribute(verticesArray, 3));
        //this.setAttribute("uv", new Float32BufferAttribute(uvArray, 2));

        //this.computeVertexNormals();

        function addShape(shape: Shape) {
            // options
            const curveSegments = options.curveSegments !== undefined ? options.curveSegments : 12;
            //const steps = options.steps !== undefined ? options.steps : 1;
            const steps = 1;
            const depth = options.height !== undefined ? options.height : 100;

            let bevelEnabled = options.bevelEnabled !== undefined ? options.bevelEnabled : true;
            let bevelThickness = options.bevelThickness !== undefined ? options.bevelThickness : 6;
            let bevelSize = options.bevelSize !== undefined ? options.bevelSize : bevelThickness - 2;
            let bevelOffset = options.bevelOffset !== undefined ? options.bevelOffset : 0;
            let bevelSegments = options.bevelSegments !== undefined ? options.bevelSegments : 3;

            //TODO don't consider extrudePath
            const extrudePath = options.extrudePath;

            //const uvgen = options.UVGenerator !== undefined ? options.UVGenerator : WorldUVGenerator;

            //let extrudePts,
            let extrudeByPath = false;
            //let splineTube, binormal, normal, position2;

            if (extrudePath) {
                //extrudePts = extrudePath.getSpacedPoints(steps);

                extrudeByPath = true;
                bevelEnabled = false; // bevels not supported for path extrusion

                // SETUP TNB variables

                // TODO1 - have a .isClosed in spline?

                //splineTube = extrudePath.computeFrenetFrames(steps, false);

                // console.log(splineTube, 'splineTube', splineTube.normals.length, 'steps', steps, 'extrudePts', extrudePts.length);

                // binormal = new Vector3();
                // normal = new Vector3();
                // position2 = new Vector3();
            }

            // Safeguards if bevels are not enabled

            if (!bevelEnabled) {
                bevelSegments = 0;
                bevelThickness = 0;
                bevelSize = 0;
                bevelOffset = 0;
            }

            // Variables initialization

            const shapePoints = shape.extractPoints(curveSegments);

            let vertices = shapePoints.shape as vec2[];
            const holes = shapePoints.holes;

            if (vertices.length === 0) {
                console.error("[TextGeometry] shape.vertices is empty !");
                return;
            }

            const reverse = !ShapeUtils.isClockWise(vertices);

            if (reverse) {
                vertices = vertices.reverse();

                // Maybe we should also check if holes are in the opposite direction, just to be safe ...

                for (let h = 0, hl = holes.length; h < hl; h++) {
                    const ahole = holes[h];

                    if (ShapeUtils.isClockWise(ahole)) {
                        holes[h] = ahole.reverse();
                    }
                }
            }

            const faces = ShapeUtils.triangulateShape(vertices as vec2[], holes);

            /* Vertices */

            const contour = vertices; // vertices has all points but contour has only points of circumference

            for (let h = 0, hl = holes.length; h < hl; h++) {
                const ahole = holes[h];

                vertices = vertices.concat(ahole);
            }

            const vlen = vertices.length,
                flen = faces.length;

            const contourMovements: vec2[] = [];

            for (let i = 0, il = contour.length, j = il - 1, k = i + 1; i < il; i++, j++, k++) {
                if (j === il) {
                    j = 0;
                }
                if (k === il) {
                    k = 0;
                }

                //  (j)---(i)---(k)
                // console.log('i,j,k', i, j , k)

                contourMovements[i] = getBevelVec(contour[i], contour[j], contour[k]);
            }

            const holesMovements: vec2[][] = [];
            let oneHoleMovements: vec2[],
                verticesMovements = contourMovements.concat();

            for (let h = 0, hl = holes.length; h < hl; h++) {
                const ahole = holes[h];

                oneHoleMovements = [];

                for (let i = 0, il = ahole.length, j = il - 1, k = i + 1; i < il; i++, j++, k++) {
                    if (j === il) {
                        j = 0;
                    }
                    if (k === il) {
                        k = 0;
                    }

                    //  (j)---(i)---(k)
                    oneHoleMovements[i] = getBevelVec(ahole[i], ahole[j], ahole[k]);
                }

                if (oneHoleMovements.length > 0) {
                    holesMovements.push(oneHoleMovements);
                    verticesMovements = verticesMovements.concat(oneHoleMovements);
                }
            }

            const placeholder: number[] = [];
            // Loop bevelSegments, 1 for the front, 1 for the back

            for (let b = 0; b < bevelSegments; b++) {
                //for ( b = bevelSegments; b > 0; b -- ) {

                const t = b / bevelSegments;
                const z = bevelThickness * Math.cos((t * Math.PI) / 2);
                const bs = bevelSize * Math.sin((t * Math.PI) / 2) + bevelOffset;

                // contract shape

                for (let i = 0, il = contour.length; i < il; i++) {
                    const vert = scalePt2(contour[i], contourMovements[i], bs);

                    v(vert[0], vert[1], -z);
                }

                // expand holes

                for (let h = 0, hl = holes.length; h < hl; h++) {
                    const ahole = holes[h];
                    oneHoleMovements = holesMovements[h];

                    for (let i = 0, il = ahole.length; i < il; i++) {
                        const vert = scalePt2(ahole[i], oneHoleMovements[i], bs);

                        v(vert[0], vert[1], -z);
                    }
                }
            }

            const bs = bevelSize + bevelOffset;

            // Back facing vertices

            for (let i = 0; i < vlen; i++) {
                const vert = bevelEnabled ? scalePt2(vertices[i], verticesMovements[i], bs) : vertices[i];

                if (!extrudeByPath) {
                    v(vert[0], vert[1], 0);
                } else {
                    //TODO
                    console.log("[TextGeometry] extrudeByPath on the backface!");
                    // normal.copy(splineTube.normals[0]).multiplyScalar(vert.x);
                    // binormal.copy(splineTube.binormals[0]).multiplyScalar(vert.y);

                    // position2.copy(extrudePts[0]).add(normal).add(binormal);

                    // v(position2.x, position2.y, position2.z);
                }
            }

            // Add stepped vertices...
            // Including front facing vertices

            for (let s = 1; s <= steps; s++) {
                for (let i = 0; i < vlen; i++) {
                    const vert = bevelEnabled ? scalePt2(vertices[i], verticesMovements[i], bs) : vertices[i];

                    if (!extrudeByPath) {
                        v(vert[0], vert[1], (depth / steps) * s);
                    } else {
                        //TODO
                        console.log("[TextGeometry] extrudeByPath on the frontface!");
                        // v( vert.x, vert.y + extrudePts[ s - 1 ].y, extrudePts[ s - 1 ].x );
                        // normal.copy(splineTube.normals[s]).multiplyScalar(vert.x);
                        // binormal.copy(splineTube.binormals[s]).multiplyScalar(vert.y);
                        // position2.copy(extrudePts[s]).add(normal).add(binormal);
                        // v(position2.x, position2.y, position2.z);
                    }
                }
            }

            // Add bevel segments planes

            //for ( b = 1; b <= bevelSegments; b ++ ) {
            for (let b = bevelSegments - 1; b >= 0; b--) {
                const t = b / bevelSegments;
                const z = bevelThickness * Math.cos((t * Math.PI) / 2);
                const bs = bevelSize * Math.sin((t * Math.PI) / 2) + bevelOffset;

                // contract shape

                for (let i = 0, il = contour.length; i < il; i++) {
                    const vert = scalePt2(contour[i], contourMovements[i], bs);
                    v(vert[0], vert[1], depth + z);
                }

                // expand holes

                for (let h = 0, hl = holes.length; h < hl; h++) {
                    const ahole = holes[h];
                    oneHoleMovements = holesMovements[h];

                    for (let i = 0, il = ahole.length; i < il; i++) {
                        const vert = scalePt2(ahole[i], oneHoleMovements[i], bs);

                        if (!extrudeByPath) {
                            v(vert[0], vert[1], depth + z);
                        } else {
                            //v(vert.x, vert.y + extrudePts[steps - 1].y, extrudePts[steps - 1].x + z);
                        }
                    }
                }
            }

            /* Faces */
            // Top and bottom faces
            buildLidFaces();

            // Sides faces
            buildSideFaces();

            /////  Internal functions

            function buildLidFaces() {
                //const start = verticesArray.length / 3;

                if (bevelEnabled) {
                    let layer = 0; // steps + 1
                    let offset = vlen * layer;

                    // Bottom faces

                    for (let i = 0; i < flen; i++) {
                        const face = faces[i];
                        f3(face[2] + offset, face[1] + offset, face[0] + offset);
                    }

                    layer = steps + bevelSegments * 2;
                    offset = vlen * layer;

                    // Top faces

                    for (let i = 0; i < flen; i++) {
                        const face = faces[i];
                        f3(face[0] + offset, face[1] + offset, face[2] + offset);
                    }
                } else {
                    // Bottom faces

                    for (let i = 0; i < flen; i++) {
                        const face = faces[i];
                        f3(face[2], face[1], face[0]);
                    }

                    // Top faces

                    for (let i = 0; i < flen; i++) {
                        const face = faces[i];
                        f3(face[0] + vlen * steps, face[1] + vlen * steps, face[2] + vlen * steps);
                    }
                }

                //scope.addGroup(start, verticesArray.length / 3 - start, 0);
            }

            // Create faces for the z-sides of the shape

            function buildSideFaces() {
                //const start = verticesArray.length / 3;
                let layeroffset = 0;
                sidewalls(contour, layeroffset);
                layeroffset += contour.length;

                for (let h = 0, hl = holes.length; h < hl; h++) {
                    const ahole = holes[h];
                    sidewalls(ahole, layeroffset);

                    layeroffset += ahole.length;
                }

                //scope.addGroup(start, verticesArray.length / 3 - start, 1);
            }

            function sidewalls(contour: vec2[], layeroffset: number) {
                let i = contour.length;

                while (--i >= 0) {
                    const j = i;
                    let k = i - 1;
                    if (k < 0) {
                        k = contour.length - 1;
                    }

                    //console.log('b', i,j, i-1, k,vertices.length);

                    for (let s = 0, sl = steps + bevelSegments * 2; s < sl; s++) {
                        const slen1 = vlen * s;
                        const slen2 = vlen * (s + 1);

                        const a = layeroffset + j + slen1,
                            b = layeroffset + k + slen1,
                            c = layeroffset + k + slen2,
                            d = layeroffset + j + slen2;

                        f4(a, b, c, d);
                    }
                }
            }

            function v(x: number, y: number, z: number) {
                placeholder.push(x);
                if (swapYZ) {
                    placeholder.push(z);
                    placeholder.push(y);
                } else {
                    placeholder.push(y);
                    placeholder.push(z);
                }
            }

            function f3(a: number, b: number, c: number) {
                addVertex(a);
                addVertex(b);
                addVertex(c);

                // const nextIndex = verticesArray.length / 3;
                // const uvs = uvgen.generateTopUV(scope, verticesArray, nextIndex - 3, nextIndex - 2, nextIndex - 1);

                // addUV(uvs[0]);
                // addUV(uvs[1]);
                // addUV(uvs[2]);
            }

            function f4(a: number, b: number, c: number, d: number) {
                addVertex(a);
                addVertex(b);
                addVertex(d);

                addVertex(b);
                addVertex(c);
                addVertex(d);

                // const nextIndex = verticesArray.length / 3;
                // const uvs = uvgen.generateSideWallUV(
                //     scope,
                //     verticesArray,
                //     nextIndex - 6,
                //     nextIndex - 3,
                //     nextIndex - 2,
                //     nextIndex - 1
                // );

                // addUV(uvs[0]);
                // addUV(uvs[1]);
                // addUV(uvs[3]);

                // addUV(uvs[1]);
                // addUV(uvs[2]);
                // addUV(uvs[3]);
            }

            function addVertex(index: number) {
                const offset = index * 3;
                verticesArray.push(placeholder[offset + 0]);
                verticesArray.push(placeholder[offset + 1]);
                verticesArray.push(placeholder[offset + 2]);
            }

            // function addUV(vector2: vec2) {
            //     uvArray.push(vector2[0]);
            //     uvArray.push(vector2[1]);
            // }
        }
    }
}

function getGeometryIndices(verticesArray: number[]) {
    const verticeCount = verticesArray.length / 3;

    const indices: number[] = [];
    for (let i = 0; i < verticeCount; i++) {
        indices.push(i);
    }
    return indices;
}

// Find directions for point movement
function getBevelVec(inPt: vec2, inPrev: vec2, inNext: vec2): vec2 {
    // computes for inPt the corresponding point inPt' on a new contour
    //   shifted by 1 unit (length of normalized vector) to the left
    // if we walk along contour clockwise, this new contour is outside the old one
    //
    // inPt' is the intersection of the two lines parallel to the two
    //  adjacent edges of inPt at a distance of 1 unit on the left side.

    let v_trans_x, v_trans_y, shrink_by; // resulting translation vector for inPt

    // good reading for geometry algorithms (here: line-line intersection)
    // http://geomalgorithms.com/a05-_intersect-1.html

    const v_prev_x = inPt[0] - inPrev[0],
        v_prev_y = inPt[1] - inPrev[1];
    const v_next_x = inNext[0] - inPt[0],
        v_next_y = inNext[1] - inPt[1];

    const v_prev_lensq = v_prev_x * v_prev_x + v_prev_y * v_prev_y;

    // check for collinear edges
    const collinear0 = v_prev_x * v_next_y - v_prev_y * v_next_x;

    if (Math.abs(collinear0) > Number.EPSILON) {
        // not collinear

        // length of vectors for normalizing

        const v_prev_len = Math.sqrt(v_prev_lensq);
        const v_next_len = Math.sqrt(v_next_x * v_next_x + v_next_y * v_next_y);

        // shift adjacent points by unit vectors to the left

        const ptPrevShift_x = inPrev[0] - v_prev_y / v_prev_len;
        const ptPrevShift_y = inPrev[1] + v_prev_x / v_prev_len;

        const ptNextShift_x = inNext[0] - v_next_y / v_next_len;
        const ptNextShift_y = inNext[1] + v_next_x / v_next_len;

        // scaling factor for v_prev to intersection point

        const sf =
            ((ptNextShift_x - ptPrevShift_x) * v_next_y - (ptNextShift_y - ptPrevShift_y) * v_next_x) /
            (v_prev_x * v_next_y - v_prev_y * v_next_x);

        // vector from inPt to intersection point

        v_trans_x = ptPrevShift_x + v_prev_x * sf - inPt[0];
        v_trans_y = ptPrevShift_y + v_prev_y * sf - inPt[1];

        // Don't normalize!, otherwise sharp corners become ugly
        //  but prevent crazy spikes
        const v_trans_lensq = v_trans_x * v_trans_x + v_trans_y * v_trans_y;
        if (v_trans_lensq <= 2) {
            return vec2.fromValues(v_trans_x, v_trans_y);
        } else {
            shrink_by = Math.sqrt(v_trans_lensq / 2);
        }
    } else {
        // handle special case of collinear edges

        let direction_eq = false; // assumes: opposite

        if (v_prev_x > Number.EPSILON) {
            if (v_next_x > Number.EPSILON) {
                direction_eq = true;
            }
        } else {
            if (v_prev_x < -Number.EPSILON) {
                if (v_next_x < -Number.EPSILON) {
                    direction_eq = true;
                }
            } else {
                if (Math.sign(v_prev_y) === Math.sign(v_next_y)) {
                    direction_eq = true;
                }
            }
        }

        if (direction_eq) {
            // console.log("Warning: lines are a straight sequence");
            v_trans_x = -v_prev_y;
            v_trans_y = v_prev_x;
            shrink_by = Math.sqrt(v_prev_lensq);
        } else {
            // console.log("Warning: lines are a straight spike");
            v_trans_x = v_prev_x;
            v_trans_y = v_prev_y;
            shrink_by = Math.sqrt(v_prev_lensq / 2);
        }
    }

    return vec2.fromValues(v_trans_x / shrink_by, v_trans_y / shrink_by);
}

function scalePt2(pt: vec2, vec: vec2, size: number): vec2 {
    const vecClone = vec2.clone(vec);
    return vec2.scaleAndAdd(vecClone, pt, vecClone, size);
    //return vec.clone().multiplyScalar(size).add(pt);
}
