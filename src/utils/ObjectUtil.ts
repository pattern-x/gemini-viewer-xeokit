export class ObjectUtil {
    // TODO: this is not a helper class, it should be util class instead
    static getKeyValue<T, K extends keyof T>(obj: T, key: K): T[K] {
        return obj[key];
    }

    /**
     * Deep clone function for TypeScript.
     * @param T Generic type of target/copied value.
     * @param target Target value to be copied.
     * @see Source project, ts-deeply https://github.com/ykdr2017/ts-deepcopy
     * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
     */
    static deepClone<T>(target: T): T {
        if (target === null) {
            return target;
        }
        if (target instanceof Date) {
            return new Date(target.getTime()) as any; // eslint-disable-line
        }
        // First part is for array and second part is for Realm.Collection
        // if (target instanceof Array || typeof (target as any).type === 'string') {
        if (typeof target === "object") {
            if (typeof (target as { [key: string]: any })[(Symbol as any).iterator] === "function") { // eslint-disable-line
                const cp = [] as any[]; // eslint-disable-line
                if ((target as any as any[]).length > 0) { // eslint-disable-line
                    for (const arrayMember of target as any as any[]) { // eslint-disable-line
                        cp.push(ObjectUtil.deepClone(arrayMember));
                    }
                }
                return cp as any as T; // eslint-disable-line
            } else {
                const targetKeys = Object.keys(target);
                const cp = {} as { [key: string]: any }; // eslint-disable-line
                if (targetKeys.length > 0) {
                    for (const key of targetKeys) {
                        cp[key] = ObjectUtil.deepClone((target as { [key: string]: any })[key]); // eslint-disable-line
                    }
                }
                return cp as T;
            }
        }
        // Means that object is atomic
        return target;
    }
}
