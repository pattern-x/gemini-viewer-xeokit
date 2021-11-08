// import { ArcCurve } from "./ArcCurve";
// import { CatmullRomCurve3 } from "./CatmullRomCurve3";
import { Curve, VecType } from "./Curve";
import { CubicBezierCurve } from "./CubicBezierCurve";
// import { CubicBezierCurve3 } from "./CubicBezierCurve3";
import { EllipseCurve } from "./EllipseCurve";
import { LineCurve } from "./LineCurve";
// import { LineCurve3 } from "./LineCurve3";
// import { QuadraticBezierCurve3 } from "./QuadraticBezierCurve3";
import { SplineCurve } from "./SplineCurve";
import { QuadraticBezierCurve } from "./QuadraticBezierCurve";

export enum CurveType {
    CURVE = "Curve",
    CURVE_PATH = "CurvePath",
    CUBIC_BEZIER_CURVE = "CubicBezierCurve",
    ELLIPSE_CURVE = "EllipseCurve",
    LINE_CURVE = "LineCurve",
    PATH = "Path",
    QUADRATIC_BEZIER_CURVE = "QuadraticBezierCurve",
    SHAPE = "Shape",
    SPLINE_CURVE = "SplineCurve",
}

export function createCurveByType(type: CurveType): Curve<VecType> | undefined {
    switch (type) {
        case CurveType.CUBIC_BEZIER_CURVE:
            return new CubicBezierCurve();

        case CurveType.ELLIPSE_CURVE:
            return new EllipseCurve();

        case CurveType.LINE_CURVE:
            return new LineCurve();

        case CurveType.QUADRATIC_BEZIER_CURVE:
            return new QuadraticBezierCurve();

        case CurveType.SPLINE_CURVE:
            return new SplineCurve();

        default:
            return undefined;
    }
}
