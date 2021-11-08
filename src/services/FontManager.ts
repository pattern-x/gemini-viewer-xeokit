/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Shape } from "../core/paths/Shape";
import { ShapePath } from "../core/paths/ShapePath";
import { TextGeometry } from "../core/TextGeometry";

interface TypeFaceLoadConfig {
    id?: string;
    url: string;
}

/**
 * Text = 3D Text
 *
 * parameters = {
 *  font: <THREE.Font>, // font
 *
 *  size: <float>, // size of the text
 *  height: <float>, // thickness to extrude text
 *  curveSegments: <int>, // number of points on the curves
 *
 *  bevelEnabled: <bool>, // turn on bevel
 *  bevelThickness: <float>, // how deep into text bevel goes
 *  bevelSize: <float>, // how far from text outline (including bevelOffset) is bevel
 *  bevelOffset: <float> // how far from text outline does bevel start
 * }
 */
export interface TextGeometryParameter {
    text: string;
    typeFaceId?: string; // typeFace id
    size?: number; // size of the text
    height?: number; //thickness to extrude text
    curveSegments?: number; // number of points on the curves

    bevelEnabled?: boolean; // turn on bevel
    bevelThickness?: number; // how deep into text bevel goes
    bevelSize?: number; // how far from text outline (including bevelOffset) is bevel
    bevelOffset?: number; // how far from text outline does bevel start

    [key: string]: any;
}

function getPathName(src: string) {
    const i = src.lastIndexOf("/");
    return i !== 0 ? src.substring(i + 1) : "";
}

export class FontManager {
    private _typeFaceMap: Map<string, any>;
    private static _instance: FontManager | undefined;

    private constructor() {
        this._typeFaceMap = new Map<string, any>();
    }

    static instance(): FontManager {
        if (!FontManager._instance) {
            FontManager._instance = new FontManager();
        }
        return FontManager._instance;
    }

    load(cfg: TypeFaceLoadConfig): Promise<string | undefined> {
        if (cfg.url.length === 0) {
            console.error("[FontManager] cfg.url is empty!");
            return Promise.reject(undefined);
        }
        let id = "";
        if (!cfg.id) {
            id = getPathName(cfg.url);
        }

        if (id.length === 0) {
            id = cfg.url;
        }

        if (this._typeFaceMap.has(id)) {
            console.log(`[FontManager] Font with id "${id}" has been loaded already!`);
            return Promise.resolve(id);
        }
        console.log(`[FontManager] Loading font url:${cfg.url}`);
        const typeFaceMap = this._typeFaceMap;

        return new Promise<string | undefined>((resolve, reject) => {
            axios
                .get(cfg.url)
                .then((jsonResult: any) => {
                    console.log(`[FontManager] Load font success`);
                    if (jsonResult) {
                        typeFaceMap.set(id, jsonResult.data);
                    }
                    resolve(id);
                })
                .catch((reason) => {
                    console.error(`[FontManager] Failed to load font: ${reason}`);
                    reject(undefined);
                });
        });
    }

    generateTextGeometry(params: TextGeometryParameter) {
        if (params.text.length === 0 || this._typeFaceMap.size == 0) {
            console.error("[FontManager] params.text or typeFaceMap is empty!");
            return undefined;
        }
        if (params.typeFaceId && !this._typeFaceMap.has(params.typeFaceId)) {
            console.error(`[FontManager] Failed to find "${params.typeFaceId}" in typeFaceMap!`);
            return undefined;
        }

        const shapes = this.generateShapes(params.text, params.size, params.typeFaceId);

        // translate parameters to ExtrudeGeometry API
        if (params.height === undefined) {
            params.height = 50;
        }

        // defaults
        if (params.bevelThickness === undefined) {
            params.bevelThickness = 10;
        }
        if (params.bevelSize === undefined) {
            params.bevelSize = 8;
        }
        if (params.bevelEnabled === undefined) {
            params.bevelEnabled = false;
        }

        return TextGeometry.extrudeGeometry(shapes, params);
    }

    isEmpty(): boolean {
        return this._typeFaceMap.size === 0;
    }

    havaFontById(fontId: string) {
        return this._typeFaceMap.has(fontId);
    }

    destroyTypeFaceById(fontId: string) {
        if (this._typeFaceMap.has(fontId)) {
            this._typeFaceMap.delete(fontId);
        }
    }

    destroy() {
        this._typeFaceMap.clear();
    }

    private generateShapes(text: string, size = 100, fontId?: string) {
        const shapes: Shape[] = [];
        const paths = this.createPaths(text, size, fontId);

        for (let p = 0, pl = paths.length; p < pl; p++) {
            Array.prototype.push.apply(shapes, paths[p].toShapes());
        }

        return shapes;
    }

    private createPaths(text: string, size: number, fontId?: string) {
        //Forget about dynamically switching fonts for the moment
        let data = this._typeFaceMap.values().next().value;
        if (fontId) {
            data = this._typeFaceMap.get(fontId);
        }
        const chars = Array.from(text);
        const scale = size / data.resolution;
        const line_height = (data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness) * scale;

        const paths: ShapePath[] = [];

        let offsetX = 0,
            offsetY = 0;

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];

            if (char === "\n") {
                offsetX = 0;
                offsetY -= line_height;
            } else {
                const ret = this.createPath(char, scale, offsetX, offsetY, data);
                if (ret) {
                    offsetX += ret.offsetX;
                    if (ret.path) {
                        paths.push(ret.path);
                    }
                }
            }
        }

        return paths;
    }

    private createPath(char: string, scale: number, offsetX: number, offsetY: number, data: any) {
        const glyph = data.glyphs[char] || data.glyphs["?"];

        if (!glyph) {
            console.error(`[FontManager] Cannot find character "${char}" in font family "${data.familyName}`);
            return undefined;
        }

        let path: ShapePath | undefined;

        if (glyph.o) {
            path = new ShapePath();
            let x: number, y: number, cpx: number, cpy: number, cpx1: number, cpy1: number, cpx2: number, cpy2: number;
            const outline = glyph._cachedOutline || (glyph._cachedOutline = glyph.o.split(" "));

            for (let i = 0, l = outline.length; i < l; ) {
                const action = outline[i++];

                switch (action) {
                    case "m": // moveTo
                        x = outline[i++] * scale + offsetX;
                        y = outline[i++] * scale + offsetY;

                        path.moveTo(x, y);

                        break;

                    case "l": // lineTo
                        x = outline[i++] * scale + offsetX;
                        y = outline[i++] * scale + offsetY;

                        path.lineTo(x, y);

                        break;

                    case "q": // quadraticCurveTo
                        cpx = outline[i++] * scale + offsetX;
                        cpy = outline[i++] * scale + offsetY;
                        cpx1 = outline[i++] * scale + offsetX;
                        cpy1 = outline[i++] * scale + offsetY;

                        path.quadraticCurveTo(cpx1, cpy1, cpx, cpy);

                        break;

                    case "b": // bezierCurveTo
                        cpx = outline[i++] * scale + offsetX;
                        cpy = outline[i++] * scale + offsetY;
                        cpx1 = outline[i++] * scale + offsetX;
                        cpy1 = outline[i++] * scale + offsetY;
                        cpx2 = outline[i++] * scale + offsetX;
                        cpy2 = outline[i++] * scale + offsetY;

                        path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, cpx, cpy);

                        break;
                }
            }
        }

        return { offsetX: glyph.ha * scale, path: path };
    }
}
