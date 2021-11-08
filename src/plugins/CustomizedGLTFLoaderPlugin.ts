import { GLTFLoaderPlugin, math, Node, PerformanceModel, utils } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

interface CustomizedGLTFLoaderParams {
    id?: string;
    src?: string;
    gltf?: any; // eslint-disable-line
    metaModelSrc?: string;
    metaModelData?: any; // eslint-disable-line
    objectDefaults?: any; // eslint-disable-line
    includeTypes?: string[];
    excludeTypes?: string[];
    edges?: boolean;
    position?: number[];
    scale?: number[];
    rotation?: number[];
    matrix?: number[];
    backfaces?: boolean;
    edgeThreshold?: number;
    performance?: boolean;
    readableGeometry?: boolean;
    handleGLTFNode?(modelId: string, glTFNode: any, actions: any): boolean; // eslint-disable-line
}

export interface CustomizedGLTFLoaderConfig {
    id?: string;
    objectDefaults?: any; // eslint-disable-line
    dataSource?: any; // eslint-disable-line
}

export class CustomizedGLTFLoaderPlugin extends GLTFLoaderPlugin {
    constructor(viewer: any, cfg: CustomizedGLTFLoaderConfig = {}) { // eslint-disable-line
        super(viewer, cfg);
    }

    load(params: CustomizedGLTFLoaderParams = {}) {
        if (params.id && this.viewer.scene.components[params.id]) {
            this.error(`[GltfLoader] Component id "${params.id}" already exists, will generate a new one`);
            delete params.id;
        }

        const performance = params.performance !== false;

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

        if (!params.src && !params.gltf) {
            this.error("[GltfLoader] load() param expected: src or gltf");
            return model; // Return new empty model
        }

        const loader = performance ? this._performanceModelLoader : this._sceneGraphLoader;

        if (params.metaModelSrc || params.metaModelData) {
            //TODO IFCObjectDefaults is not exported
            const objectDefaults = params.objectDefaults || this._objectDefaults; //IFCObjectDefaults;

            const processMetaModelData = (metaModelData: any) => { // eslint-disable-line
                this.viewer.metaScene.createMetaModel(modelId, metaModelData, {
                    includeTypes: params.includeTypes,
                    excludeTypes: params.excludeTypes,
                });

                this.viewer.scene.canvas.spinner.processes--;

                params.readableGeometry = false;
                if (!params.handleGLTFNode) {
                    params.handleGLTFNode = (modelId, glTFNode, actions) => {
                        const name = glTFNode.name;

                        if (!name) {
                            return true; // Continue descending this node subtree
                        }

                        const nodeId = name;
                        const metaObject = this.viewer.metaScene.metaObjects[nodeId];
                        const type = (metaObject ? metaObject.type : "DEFAULT") || "DEFAULT";

                        actions.createEntity = {
                            id: nodeId,
                            isObject: true, // Registers the Entity in Scene#objects
                        };

                        const props = objectDefaults[type];

                        if (props) {
                            // Set Entity's initial rendering state for recognized type

                            if (props.visible === false) {
                                actions.createEntity.visible = false;
                            }

                            if (props.colorize) {
                                actions.createEntity.colorize = props.colorize;
                            }

                            if (props.pickable === false) {
                                actions.createEntity.pickable = false;
                            }

                            if (props.opacity !== undefined && props.opacity !== null) {
                                actions.createEntity.opacity = props.opacity;
                            }
                        }

                        return true; // Continue descending this glTF node subtree
                    };
                }
                if (params.src) {
                    loader.load(this, model, params.src, params);
                } else {
                    loader.parse(this, model, params.gltf, params);
                }
            };

            if (params.metaModelSrc) {
                const metaModelSrc = params.metaModelSrc;

                this.viewer.scene.canvas.spinner.processes++;

                this._dataSource.getMetaModel(
                    metaModelSrc,
                    (metaModelData: any) => { // eslint-disable-line
                        this.viewer.scene.canvas.spinner.processes--;

                        processMetaModelData(metaModelData);
                    },
                    (errMsg: string) => {
                        this.error(
                            `[GltfLoader] load(): Failed to load model metadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`
                        );
                        this.viewer.scene.canvas.spinner.processes--;
                    }
                );
            } else if (params.metaModelData) {
                processMetaModelData(params.metaModelData);
            }
        } else {
            const nodeIds = new Map<string, number>();

            const fixedSuffix = "_";
            if (!params.handleGLTFNode) {
                params.handleGLTFNode = (modelId, glTFNode, actions) => {
                    const name = glTFNode.name;
                    let id = name;
                    if (!name) {
                        id = math.createUUID();
                    }
                    id = math.globalizeObjectId(modelId, id); // Add modelId prefix

                    let count = 1;
                    if (nodeIds.has(id)) {
                        const originalId = id;
                        count = nodeIds.get(originalId) as number;
                        id = originalId + fixedSuffix + count.toString();
                        count++;
                        nodeIds.set(originalId, count);
                    } else {
                        nodeIds.set(id, count);
                    }

                    actions.createEntity = {
                        // Create an Entity for this glTF scene node
                        id: id,
                        isObject: true, // Registers the Entity in Scene#objects
                    };

                    return true; // Continue descending this glTF node subtree
                };
            }

            const okFunc = () => {
                nodeIds.clear();
            };

            const errorFunc = (errorMsg?: string) => {
                nodeIds.clear();
                console.error("[GltfLoader] ", errorMsg);
            };

            if (params.src) {
                loader.load(this, model, params.src, params, okFunc, errorFunc);
            } else {
                loader.parse(this, model, params.gltf, params, okFunc, errorFunc);
            }
        }

        model.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return model;
    }
}
