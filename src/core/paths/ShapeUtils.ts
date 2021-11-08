import { vec2 } from "gl-matrix";
import Earcut from "earcut";

export class ShapeUtils {
    // calculate area of the contour polygon
    static area(contour: vec2[]) {
        const n = contour.length;
        let a = 0.0;

        for (let p = n - 1, q = 0; q < n; p = q++) {
            a += contour[p][0] * contour[q][1] - contour[q][0] * contour[p][1];
        }

        return a * 0.5;
    }

    static isClockWise(pts: vec2[]) {
        return ShapeUtils.area(pts) < 0;
    }

    //TODO only conside 2d
    static triangulateShape(contour: vec2[], holes: vec2[][]) {
        const vertices: number[] = []; // flat array of vertices like [ x0,y0, x1,y1, x2,y2, ... ]
        const holeIndices: number[] = []; // array of hole indices
        const faces: number[][] = []; // final array of vertex indices like [ [ a,b,d ], [ b,c,d ] ]

        removeDupEndPts(contour);
        addContour(vertices, contour);

        let holeIndex = contour.length;

        holes.forEach(removeDupEndPts);

        for (let i = 0; i < holes.length; i++) {
            holeIndices.push(holeIndex);
            holeIndex += holes[i].length;
            addContour(vertices, holes[i]);
        }
        //vertices need to be clockwise. triangels indices are counterclockwise
        const triangles = Earcut(vertices, holeIndices, 2);

        for (let i = 0; i < triangles.length; i += 3) {
            faces.push(triangles.slice(i, i + 3));
        }

        return faces;
    }
}

function removeDupEndPts(points: vec2[]) {
    const l = points.length;

    if (l > 2 && vec2.equals(points[l - 1], points[0])) {
        points.pop();
    }
}

function addContour(vertices: number[], contour: vec2[]) {
    for (let i = 0; i < contour.length; i++) {
        vertices.push(contour[i][0]);
        vertices.push(contour[i][1]);
    }
}
