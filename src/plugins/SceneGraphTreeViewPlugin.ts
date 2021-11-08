import {
    // ModelTreeView,
    TreeViewPlugin,
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

import { SceneGraphTreeView } from "../core/SceneGraphTreeView";

interface SceneGraphTreeViewPluginConfig {
    containerElement: HTMLElement;
    //autoAddModels?: boolean;
    autoExpandDepth?: number;
    hierarchy?: string;
    sortNodes?: boolean;
    pruneEmptyNodes?: boolean;
}

interface TreeViewPluginConfig extends SceneGraphTreeViewPluginConfig {
    autoAddModels: boolean;
}

interface TreeViewAddModelConfig {
    rootName?: string;
}

export class SceneGraphTreeViewPlugin extends TreeViewPlugin {
    private _active: boolean;

    constructor(viewer: any, cfg: SceneGraphTreeViewPluginConfig) { // eslint-disable-line
        const treeViewPluginCfg: TreeViewPluginConfig = {
            containerElement: cfg.containerElement,
            autoExpandDepth: cfg.autoExpandDepth,
            hierarchy: cfg.hierarchy,
            sortNodes: cfg.sortNodes,
            pruneEmptyNodes: cfg.pruneEmptyNodes,
            autoAddModels: false, //must be false
        };
        super(viewer, treeViewPluginCfg);

        this._active = false;
    }

    addModel(modelId: string, options: TreeViewAddModelConfig) {
        if (!this._containerElement) {
            return;
        }
        const model = this.viewer.scene.models[modelId];
        if (!model) {
            throw "Model not found: " + modelId;
        }

        if (this._modelTreeViews[modelId]) {
            this.warn("Model already added: " + modelId);
            return;
        }

        let modelTreeView: SceneGraphTreeView | undefined = undefined;
        const metaModel = this.viewer.metaScene.metaModels[modelId];
        if (!metaModel) {
            // this.error("MetaModel not found: " + modelId);
            modelTreeView = new SceneGraphTreeView(this.viewer, this, model, {
                containerElement: this._containerElement,
                autoExpandDepth: this._autoExpandDepth,
                rootName: options.rootName,
            });
        } else {
            console.error("ModelTreeView mode not implemented yet!"); // TODO
            return;
            // modelTreeView = new ModelTreeView(this.viewer, this, model, metaModel, {
            //   containerElement: this._containerElement,
            //   autoExpandDepth: this._autoExpandDepth,
            //   hierarchy: this._hierarchy,
            //   sortNodes: this._sortNodes,
            //   pruneEmptyNodes: this._pruneEmptyNodes,
            //   rootName: options.rootName,
            // });
        }
        this._modelTreeViews[modelId] = modelTreeView;
        model.on("destroyed", () => {
            this.removeModel(model.id);
        });
        return modelTreeView;
    }

    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        this._active = active;

        if (!this._active) {
            this._containerElement.style.visibility = "hidden";
        } else {
            this._containerElement.style.visibility = "visible";
            //metaModels
            const modelIds = Object.keys(this.viewer.metaScene.metaModels);
            for (let i = 0, len = modelIds.length; i < len; i++) {
                const modelId = modelIds[i];
                this.addModel(modelId, {});
            }
            //models
            const sceneModelIds = Object.keys(this.viewer.scene.models);
            for (let i = 0, len = sceneModelIds.length; i < len; i++) {
                const modelId = sceneModelIds[i];
                if (modelIds.includes(modelId)) {
                    continue;
                }
                this.addModel(modelId, {});
            }
        }
    }

    getActive(): boolean {
        return this._active;
    }
}
