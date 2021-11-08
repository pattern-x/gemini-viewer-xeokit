/**
 * Map class
 * Reference to: https://github.com/xeokit/xeokit-bim-viewer/blob/master/src/Map.js
 */
export class Map {
    private _items: any; // eslint-disable-line
    private _lastUniqueId = -1;

    constructor(items?: any, baseId?: number) { // eslint-disable-line
        this._items = items || [];
        this._lastUniqueId = (baseId || 0) + 1;
    }

    /**
     * Usage:
     *
     * id = myMap.addItem("foo") // ID internally generated
     * id = myMap.addItem("foo", "bar") // ID is "foo"
     */
    addItem(...args: any) { // eslint-disable-line
        let item;
        if (args.length === 2) {
            const id = args[0];
            item = args[1];
            if (this._items[id]) {
                // Won't happen if given ID is string
                throw "ID clash: '" + id + "'";
            }
            this._items[id] = item;
            return id;
        } else {
            item = args[0] || {};
            while (true) { // eslint-disable-line
                const findId = this._lastUniqueId++;
                if (!this._items[findId]) {
                    this._items[findId] = item;
                    return findId;
                }
            }
        }
    }

    removeItem(id: number | string) {
        const item = this._items[id];
        delete this._items[id];
        return item;
    }
}
