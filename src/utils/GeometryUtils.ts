export interface BuildEllipseGeometryConfig {
    center?: number[];
    xRadius?: number;
    yRadius?: number;
    startAngle: number;
    endAngle: number;
    segments?: number;
}

export interface BuildPlaneGeometryConfig {
    width?: number;
    height?: number;
    isClockwise?: boolean;
}

export interface BuildPlanePositionConfig {
    left: number;
    right: number;
    bottom: number;
    top: number;
}

export class GeometryUtils {
    //Get the ellipse curve on the y plane
    static buildEllipseGeometry(cfg: BuildEllipseGeometryConfig) {
        let xRadius = cfg.xRadius || 1;
        if (xRadius < 0) {
            console.error("[GeometryUtil] xRadius shouldn't be negative, will use its absolute value.");
            xRadius *= -1;
        }

        let yRadius = cfg.yRadius || 1;
        if (yRadius < 0) {
            console.error("[GeometryUtil] yRadius shouldn't be negative, will use its absolute value.");
            yRadius *= -1;
        }

        let segments = cfg.segments || 32;
        if (segments < 0) {
            console.error("[GeometryUtil] segments shouldn't be negative, will use its absolute value.");
            segments *= -1;
        }
        if (segments < 3) {
            segments = 3;
        }

        const twoPi = Math.PI * 2;
        let deltaAngle = cfg.endAngle - cfg.startAngle;
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

        const perSegmentAngle = deltaAngle / segments;

        const center = cfg.center;
        const centerX = center ? center[0] : 0;
        const centerY = center ? center[1] : 0;
        const centerZ = center ? center[2] : 0;

        let x: number, z: number;
        let angle: number;
        const positions: number[] = [];
        const indices: number[] = [];

        for (let i = 0; i <= segments; i++) {
            angle = cfg.startAngle + i * perSegmentAngle;
            x = xRadius * Math.cos(angle);
            z = yRadius * Math.sin(angle);

            positions.push(x + centerX);
            positions.push(centerY);
            positions.push(z + centerZ);

            if (i != segments) {
                indices.push(i, i + 1);
            }
        }

        //TODO Consider a triangular index

        return {
            positions: positions,
            indices: indices,
        };
    }
    //Generate plane geometry information on z=0 and center=[0,0]
    static buildPlaneGeometry(cfg: BuildPlaneGeometryConfig) {
        let width = cfg.width || 1;
        if (width < 0) {
            console.error("[GeometryUtil] Width shouldn't be negative, will use its absolute value.");
            width *= -1;
        }

        let height = cfg.height || 1;
        if (height < 0) {
            console.error("[GeometryUtil] Height shouldn't be negative, will use its absolute value.");
            height *= -1;
        }
        const halfWidth = width / 2.0;
        const halfHeight = height / 2.0;
        const zValue = 0.0;
        const positions: number[] = [];
        //right top
        positions.push(halfWidth, halfHeight, zValue);
        //right bottom
        positions.push(halfWidth, -halfHeight, zValue);
        //left bottom
        positions.push(-halfWidth, -halfHeight, zValue);
        //left top
        positions.push(-halfWidth, halfHeight, zValue);

        let isClockwise = false;
        if (cfg.isClockwise !== undefined) {
            isClockwise = cfg.isClockwise;
        }
        const indices = [0, 1, 2, 2, 3, 0];
        if (!isClockwise) {
            indices.reverse();
        }
        const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
        const primitive = "triangles";
        return {
            primitive,
            positions,
            indices,
            normals,
        };
    }

    //Generate plane geometry information on z=0
    static buildPlanePosition(cfg: BuildPlanePositionConfig) {
        const right = Math.max(cfg.right, cfg.left);
        const left = Math.min(cfg.right, cfg.left);

        const top = Math.max(cfg.top, cfg.bottom);
        const bottom = Math.min(cfg.top, cfg.bottom);

        const zValue = 0.0;
        const positions: number[] = [];
        //right top
        positions.push(right, top, zValue);
        //right bottom
        positions.push(right, bottom, zValue);
        //left bottom
        positions.push(left, bottom, zValue);
        //left top
        positions.push(left, top, zValue);

        return positions;
    }
}
