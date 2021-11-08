import { Plugin, Node, PerformanceModel, utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { DxfPerformanceModelLoader } from "../core/DxfPerformanceModelLoader";

interface DxfLoaderPluginConfig {
    id?: string;
}

interface DxfLoaderPluginParams {
    id?: string;
    src: string;
    // position?: number[];
    // scale?: number[];
    // rotation?: number[];
    // matrix?: number[];
    // backfaces?: boolean;
    // edgeThreshold?: number;
    edges?: boolean;
    saoEnabled?: boolean;
    performance?: boolean;
    //readableGeometry?: boolean;
    //handleGLTFNode?(modelId: string, glTFNode: any, actions: any): boolean; // eslint-disable-line
}

export class DxfLoaderPlugin extends Plugin {
    private performanceModelLoader: DxfPerformanceModelLoader;
    constructor(viewer: any, cfg?: DxfLoaderPluginConfig) { // eslint-disable-line
        super("DxfLoader", viewer, cfg);

        this.performanceModelLoader = new DxfPerformanceModelLoader();
    }

    load(params: DxfLoaderPluginParams) {
        if (params.id && this.viewer.scene.components[params.id]) {
            this.error(`[Dxf] Component with ID "${params.id}" already exists in viewer, will generate a new ID.`);
            delete params.id;
        }

        //TODO Ignore the non-performance mode for the moment
        const performance = params.performance !== false;
        params.edges = false;
        params.saoEnabled = false;
        const model = performance
            ? // PerformanceModel provides performance-oriented scene representation
              // converting glTF materials to simple flat-shading without textures

              new PerformanceModel(
                  this.viewer.scene,
                  utils.apply(params, {
                      isModel: true,
                  })
              )
            : // Scene Node graph supports original glTF materials

              new Node(
                  this.viewer.scene,
                  utils.apply(params, {
                      isModel: true,
                  })
              );

        const modelId = model.id; // In case ID was auto-generated

        if (!params.src) {
            this.error("[Dxf] 'src' or 'gltf' param expected for load() method.");
            return model; // Return new empty model
        }

        const loader = this.performanceModelLoader; //performance ? this._performanceModelLoader : this._sceneGraphLoader;

        // const fixedSuffix = "_";
        // if (!params.handleGLTFNode) {
        //     params.handleGLTFNode = (modelId, glTFNode, actions) => {
        //         const name = glTFNode.name;
        //         let id = name;
        //         if (!name) {
        //             id = math.createUUID();
        //         }
        //         id = math.globalizeObjectId(modelId, id); // Add modelId prefix

        //         let count = 1;
        //         if (nodeIds.has(id)) {
        //             const originalId = id;
        //             count = nodeIds.get(originalId) as number;
        //             id = originalId + fixedSuffix + count.toString();
        //             count++;
        //             nodeIds.set(originalId, count);
        //         } else {
        //             nodeIds.set(id, count);
        //         }

        //         actions.createEntity = {
        //             // Create an Entity for this glTF scene node
        //             id: id,
        //             isObject: true, // Registers the Entity in Scene#objects
        //         };

        //         return true; // Continue descending this glTF node subtree
        //     };

        const okFunc = () => {
            console.log(`[Dxf] ${params.src} loaded.`);
        };

        const errorFunc = (errorMsg?: string) => {
            console.error(`[Dxf] Failed to load ${params.src}, error: `, errorMsg);
        };

        // if (params.src) {
        loader.load(model, params.src, params, okFunc, errorFunc);
        // } else {
        //loader.parse(this, model, params.gltf, params, okFunc, errorFunc);
        //}
        //}

        model.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return model;
    }
}
