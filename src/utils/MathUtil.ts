export class MathUtil {
    // TODO: this is not a helper class, it should be util class instead
    static expandAABB(aabb: number[], scale: number) {
        let xWidth = aabb[3] - aabb[0];
        let yWidth = aabb[4] - aabb[1];
        let zWidth = aabb[5] - aabb[2];
        const center = [(aabb[3] + aabb[0]) / 2.0, (aabb[4] + aabb[1]) / 2.0, (aabb[5] + aabb[2]) / 2.0];

        xWidth *= scale;
        yWidth *= scale;
        zWidth *= scale;

        aabb[0] = center[0] - xWidth / 2.0;
        aabb[3] = center[0] + xWidth / 2.0;
        aabb[1] = center[1] - yWidth / 2.0;
        aabb[4] = center[1] + yWidth / 2.0;
        aabb[2] = center[2] - zWidth / 2.0;
        aabb[5] = center[2] + zWidth / 2.0;

        return aabb;
    }
}
