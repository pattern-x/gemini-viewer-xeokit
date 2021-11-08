import { math, Map, Queue } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

import { CallbackRetureVoidType } from "./CallbackTypes";

//type AnyCallbackReturnVoidType = CallbackRetureVoidType<any>;
type ElementCallbackReturnVoidType = CallbackRetureVoidType<MouseEvent>;

const idMap = new Map();

interface SceneGraphTreeViewConfig {
    containerElement: HTMLElement;
    rootName?: string;
    autoExpandDepth?: number;
}

interface TreeViewNode {
    nodeId: string;
    objectId: string;
    title: string;
    type?: string;
    parent?: TreeViewNode;
    numEntities: number;
    numVisibleEntities: number;
    checked: boolean;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    children: TreeViewNode[];
}

export class SceneGraphTreeView {
    private _switchCollapseHandler!: ElementCallbackReturnVoidType;
    private _switchExpandHandler!: ElementCallbackReturnVoidType;

    private _checkboxChangeHandler!: ElementCallbackReturnVoidType;
    private _onObjectVisibility: any; // eslint-disable-line
    private _showListItemElementId: string | undefined;
    private _id: any; // eslint-disable-line
    private _baseId!: string;
    private _viewer: any; // eslint-disable-line
    private _treeViewPlugin: any; // eslint-disable-line
    private _containerElement!: HTMLElement;
    private _rootElement: any; // eslint-disable-line
    private _muteSceneEvents!: boolean;
    private _muteTreeEvents!: boolean;
    private _rootNodes!: TreeViewNode[];
    private _objectNodes: any; // eslint-disable-line
    private _rootName: string | undefined;
    private _autoExpandDepth!: number;

    private _isPerformance: boolean;
    private _rootModel: any; // eslint-disable-line

    constructor(
        viewer: any, // eslint-disable-line
        treeViewPlugin: any, // eslint-disable-line
        model: any, // eslint-disable-line 
        cfg: SceneGraphTreeViewConfig
    ) {
        if (!cfg.containerElement) {
            throw "Config expected: containerElement";
        }
        //normal model  or performance model
        // if (!(model && model.isNode)) {
        //   console.error("[SceneGraphTreeView] only support that the model is node");
        //   return;
        // }
        this._id = idMap.addItem();
        this._baseId = "" + this._id;
        this._viewer = viewer;
        this._treeViewPlugin = treeViewPlugin;
        //this._rootMetaObject = rootMetaObject;
        this._rootModel = model;
        this._containerElement = cfg.containerElement;
        this._rootElement = null;
        this._muteSceneEvents = false;
        this._muteTreeEvents = false;
        this._rootNodes = [];
        this._objectNodes = {};
        this._rootName = cfg.rootName;
        //this._sortNodes = cfg.sortNodes;
        //this._pruneEmptyNodes = cfg.pruneEmptyNodes;

        //this._showListItemElementId = null;

        this._isPerformance = false;
        if (model && model.isPerformanceModel) {
            this._isPerformance = true;
        }

        this._containerElement.oncontextmenu = (e) => {
            e.preventDefault();
        };

        this._switchCollapseHandler = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const switchElement = event.target;
            this._collapseSwitchElement(switchElement);
        };

        this._switchExpandHandler = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const switchElement = event.target;
            this._expandSwitchElement(switchElement);
        };

        this._checkboxChangeHandler = (event: MouseEvent) => {
            if (this._muteTreeEvents) {
                return;
            }
            this._muteSceneEvents = true;
            const checkbox = event.target as HTMLInputElement;
            const visible = checkbox.checked;
            const nodeId = checkbox.id;
            const checkedObjectId = this._nodeToObjectID(nodeId);
            const checkedNode = this._objectNodes[checkedObjectId];
            const objects = this._viewer.scene.objects;
            let numUpdated = 0;
            this._withNodeTree(checkedNode, (node: TreeViewNode) => {
                const objectId = node.objectId;
                const checkBoxId = node.nodeId;
                const entity = objects[objectId];
                const isLeaf = node.children.length === 0;
                node.numVisibleEntities = visible ? node.numEntities : 0;
                if (isLeaf && visible !== node.checked) {
                    numUpdated++;
                }
                node.checked = visible;
                const checkbox2 = document.getElementById(checkBoxId) as HTMLInputElement;
                if (checkbox2) {
                    checkbox2.checked = visible;
                }
                if (entity) {
                    entity.visible = visible;
                }
            });
            let parent = checkedNode.parent;
            while (parent) {
                parent.checked = visible;
                const checkbox2 = document.getElementById(parent.nodeId) as HTMLInputElement; // Parent checkboxes are always in DOM
                if (visible) {
                    parent.numVisibleEntities += numUpdated;
                } else {
                    parent.numVisibleEntities -= numUpdated;
                }
                const newChecked = parent.numVisibleEntities > 0;
                if (newChecked !== checkbox2.checked) {
                    checkbox2.checked = newChecked;
                }
                parent = parent.parent;
            }
            this._muteSceneEvents = false;
        };

        this._onObjectVisibility = this._viewer.scene.on("objectVisibility", (entity: any) => { // eslint-disable-line
            if (this._muteSceneEvents) {
                return;
            }
            const objectId = entity.id;
            const node = this._objectNodes[objectId];
            if (!node) {
                return; // Not in this tree
            }
            const visible = entity.visible;
            const updated = visible !== node.checked;
            if (!updated) {
                return;
            }
            this._muteTreeEvents = true;
            node.checked = visible;
            if (visible) {
                node.numVisibleEntities++;
            } else {
                node.numVisibleEntities--;
            }
            const checkbox = document.getElementById(node.nodeId) as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = visible;
            }
            let parent = node.parent;
            while (parent) {
                parent.checked = visible;
                if (visible) {
                    parent.numVisibleEntities++;
                } else {
                    parent.numVisibleEntities--;
                }
                const parentCheckbox = document.getElementById(parent.nodeId) as HTMLInputElement;
                if (parentCheckbox) {
                    const newChecked = parent.numVisibleEntities > 0;
                    if (newChecked !== parentCheckbox.checked) {
                        parentCheckbox.checked = newChecked;
                    }
                }
                parent = parent.parent;
            }
            this._muteTreeEvents = false;
        });

        //this._hierarchy = cfg.hierarchy || "containment";
        this._autoExpandDepth = cfg.autoExpandDepth || 0;

        this._createNodes();
    }

    expandToDepth(depth: number): void {
        const expand = (node: TreeViewNode, countDepth: number) => {
            if (countDepth === depth) {
                return;
            }
            const nodeId = node.nodeId;
            const switchElementId = "switch-" + nodeId;
            const switchElement = document.getElementById(switchElementId);
            if (switchElement) {
                this._expandSwitchElement(switchElement);
                const childNodes = node.children;
                for (let i = 0, len = childNodes.length; i < len; i++) {
                    const childNode = childNodes[i];
                    expand(childNode, countDepth + 1);
                }
            }
        };
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            expand(rootNode, 0);
        }
    }

    private _expandSwitchElement(switchElement: EventTarget | null) {
        if (!switchElement) {
            return;
        }
        const switchHtmlElement = switchElement as HTMLElement;
        const parentElement = switchHtmlElement.parentElement as HTMLElement;
        const expanded = parentElement.getElementsByTagName("li")[0];
        if (expanded) {
            return;
        }
        const nodeId = parentElement.id.replace("node-", "");
        const objectId = this._nodeToObjectID(nodeId);
        const switchNode = this._objectNodes[objectId];
        const childNodes = switchNode.children;
        const nodeElements = childNodes.map((node: any) => { // eslint-disable-line
            return this._createNodeElement(node);
        });
        const ul = document.createElement("ul");
        nodeElements.forEach((nodeElement: any) => { // eslint-disable-line
            ul.appendChild(nodeElement);
        });
        parentElement.appendChild(ul);
        switchHtmlElement.classList.remove("plus");
        switchHtmlElement.classList.add("minus");
        switchHtmlElement.textContent = "-";
        switchElement.removeEventListener("click", this._switchExpandHandler as EventListenerOrEventListenerObject);
        switchElement.addEventListener("click", this._switchCollapseHandler as EventListenerOrEventListenerObject);
    }

    private _collapseSwitchElement(switchElement: EventTarget | null) {
        if (!switchElement) {
            return;
        }
        const switchHtmlElement = switchElement as HTMLElement;
        const parent = switchHtmlElement.parentElement;
        if (!parent) {
            return;
        }
        const ul = parent.querySelector("ul");
        if (!ul) {
            return;
        }
        parent.removeChild(ul);
        switchHtmlElement.classList.remove("minus");
        switchHtmlElement.classList.add("plus");
        switchHtmlElement.textContent = "+";
        switchElement.removeEventListener("click", this._switchCollapseHandler as EventListenerOrEventListenerObject);
        switchElement.addEventListener("click", this._switchExpandHandler as EventListenerOrEventListenerObject);
    }

    private _createNodes(): void {
        if (this._rootElement) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._rootElement = null;
        }
        this._rootNodes = [];
        this._objectNodes = {};
        // this._validate();
        // if (this.valid) {
        this._createEnabledNodes();
        // } else {
        //   this._createDisabledNodes();
        // }
    }

    private _nodeToObjectID(nodeId: string): string {
        return nodeId.substring(this._baseId.length);
    }

    private _objectToNodeID(objectId: string) {
        return this._baseId + objectId;
    }

    private _withNodeTree(node: TreeViewNode, callbackFun: CallbackRetureVoidType<TreeViewNode>): void {
        callbackFun(node);
        const children = node.children;
        if (!children) {
            return;
        }
        for (let i = 0, len = children.length; i < len; i++) {
            this._withNodeTree(children[i], callbackFun);
        }
    }

    private _createNodeElement(node: TreeViewNode): HTMLElement {
        const nodeElement = document.createElement("li");

        const nodeId = node.nodeId;
        nodeElement.id = "node-" + nodeId;
        if (node.children.length > 0) {
            const switchElementId = "switch-" + nodeId;
            const switchElement = document.createElement("a");
            switchElement.href = "#";
            switchElement.id = switchElementId;
            switchElement.textContent = "+";
            switchElement.classList.add("plus");
            switchElement.addEventListener("click", this._switchExpandHandler);
            nodeElement.appendChild(switchElement);
        }
        const checkbox = document.createElement("input");
        checkbox.id = nodeId;
        checkbox.type = "checkbox";
        checkbox.checked = node.checked;
        checkbox.style.pointerEvents = "all";
        checkbox.addEventListener("change", this._checkboxChangeHandler as EventListenerOrEventListenerObject);
        nodeElement.appendChild(checkbox);
        const span = document.createElement("span");
        span.textContent = node.title;
        nodeElement.appendChild(span);
        span.oncontextmenu = (e) => {
            this._treeViewPlugin.fire("contextmenu", {
                event: e,
                viewer: this._viewer,
                treeViewPlugin: this._treeViewPlugin,
                treeViewNode: node,
            });
            e.preventDefault();
        };
        span.onclick = (e) => {
            this._treeViewPlugin.fire("nodeTitleClicked", {
                event: e,
                viewer: this._viewer,
                treeViewPlugin: this._treeViewPlugin,
                treeViewNode: node,
            });
            e.preventDefault();
        };
        return nodeElement;
    }

    private _createEnabledNodes(): void {
        this._createContainmentNodes(this._rootModel);
        //}
        // if (this._sortNodes) {
        //   this._doSortNodes();
        // }
        if (this._isPerformance) {
            this._performanceSynchNodesToEntities();
        } else {
            this._synchNodesToEntities();
        }
        this._createTrees();
        this.expandToDepth(this._autoExpandDepth);
    }

    // TODO
    private _createContainmentNodes(metaObject: any, parent?: TreeViewNode) { // eslint-disable-line
        // if (this._pruneEmptyNodes && metaObject._countEntities === 0) {
        //   return;
        // }

        const objectId: string = metaObject.id;
        const metaObjectType: string = metaObject.type || "test";
        let metaObjectName: string = metaObject.name || objectId || metaObjectType;
        const modelId = this._rootModel.id;
        metaObjectName = math.unglobalizeObjectId(modelId, objectId);

        let children;
        //PerformanceModel
        if (this._isPerformance) {
            if (metaObject.entityList === 0) {
                return;
            }
            children = metaObject.entityList;
        } else {
            if (metaObject.numChildren === 0) {
                return;
            }

            children = metaObject.children;
        }

        const node: TreeViewNode = {
            nodeId: this._objectToNodeID(objectId),
            objectId: objectId,
            title: !parent
                ? this._rootName || metaObjectName
                : metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default"
                ? metaObjectName
                : metaObjectType,
            type: metaObjectType,
            parent: parent,
            numEntities: 0,
            numVisibleEntities: 0,
            checked: false,
            children: [],
        };
        if (parent) {
            parent.children.push(node);
        } else {
            this._rootNodes.push(node);
        }
        this._objectNodes[node.objectId] = node;

        if (children) {
            if (this._isPerformance) {
                for (let i = 0, len = children.length; i < len; i++) {
                    const childPerformanceNode = children[i];
                    const childObjectId = childPerformanceNode.id;
                    if (this._objectNodes[childObjectId]) {
                        console.warn(`${childObjectId} have the same id !`);
                        continue;
                    }
                    const childObjectType: string = childPerformanceNode.type || "test";
                    let childObjectName: string = childPerformanceNode.name || childObjectId || childObjectType;

                    childObjectName = math.unglobalizeObjectId(modelId, childObjectId);

                    const childNode = {
                        nodeId: this._objectToNodeID(childObjectId),
                        objectId: childObjectId,
                        title: childObjectName,
                        type: childObjectType,
                        parent: node,
                        numEntities: 0,
                        numVisibleEntities: 0,
                        checked: false,
                        children: [],
                    };

                    node.children.push(childNode);
                    this._objectNodes[childNode.objectId] = childNode;
                }
            } else {
                for (let i = 0, len = children.length; i < len; i++) {
                    const childMetaObject = children[i];
                    this._createContainmentNodes(childMetaObject, node);
                }
            }
        }
    }

    private _synchNodesToEntities() {
        //TODO: Scene Graph need user-defined
        const queue = new Queue();
        queue.unshift(this._rootModel);
        while (queue.length !== 0) {
            const item = queue.shift();
            if (item.isMesh) {
                const objectId = item.id;
                const node = this._objectNodes[objectId];
                if (node) {
                    const visible = item.visible;
                    node.numEntities = 1;
                    if (visible) {
                        node.numVisibleEntities = 1;
                        node.checked = true;
                    } else {
                        node.numVisibleEntities = 0;
                        node.checked = false;
                    }
                    let parent = node.parent; // Synch parents
                    while (parent) {
                        parent.numEntities++;
                        if (visible) {
                            parent.numVisibleEntities++;
                            parent.checked = true;
                        }
                        parent = parent.parent;
                    }
                }
                continue;
            }
            const children = item.children;
            for (let i = 0; i < children.length; i++) {
                queue.push(children[i]);
            }
        }
    }

    private _performanceSynchNodesToEntities() {
        const queue = new Queue();
        queue.unshift(this._rootModel);
        while (queue.length !== 0) {
            const item = queue.shift();
            if (!item.isModel) {
                const objectId = item.id;
                const node = this._objectNodes[objectId];
                if (node) {
                    const visible = item.visible;
                    node.numEntities = 1;
                    if (visible) {
                        node.numVisibleEntities = 1;
                        node.checked = true;
                    } else {
                        node.numVisibleEntities = 0;
                        node.checked = false;
                    }
                    let parent = node.parent; // Synch parents
                    while (parent) {
                        parent.numEntities++;
                        if (visible) {
                            parent.numVisibleEntities++;
                            parent.checked = true;
                        }
                        parent = parent.parent;
                    }
                }
                continue;
            }
            const children = item.entityList;
            for (let i = 0; i < children.length; i++) {
                queue.push(children[i]);
            }
        }
    }

    private _createTrees() {
        if (this._rootNodes.length === 0) {
            return;
        }
        const rootNodeElements = this._rootNodes.map((rootNode) => {
            return this._createNodeElement(rootNode);
        });
        const ul = document.createElement("ul");
        rootNodeElements.forEach((nodeElement) => {
            ul.appendChild(nodeElement);
        });
        this._containerElement.appendChild(ul);
        this._rootElement = ul;
    }

    showNode(objectId: string) {
        if (this._showListItemElementId) {
            this.unShowNode();
        }
        const node = this._objectNodes[objectId];
        if (!node) {
            return; // Node may not exist for the given object if (this._pruneEmptyNodes == true)
        }
        const nodeId = node.nodeId;
        const switchElementId = "switch-" + nodeId;
        const switchElement = document.getElementById(switchElementId);
        if (switchElement) {
            this._expandSwitchElement(switchElement);
            switchElement.scrollIntoView();
            return;
        }
        const path = [];
        path.unshift(node);
        let parent = node.parent;
        while (parent) {
            path.unshift(parent);
            parent = parent.parent;
        }
        for (let i = 0, len = path.length; i < len; i++) {
            const node = path[i];
            const nodeId = node.nodeId;
            const switchElementId = "switch-" + nodeId;
            const switchElement = document.getElementById(switchElementId);
            if (switchElement) {
                this._expandSwitchElement(switchElement);
            }
        }
        const listItemElementId = "node-" + nodeId;
        const listItemElement = document.getElementById(listItemElementId);
        if (listItemElement) {
            listItemElement.scrollIntoView({ block: "center" });
            listItemElement.classList.add("highlighted-node");
            this._showListItemElementId = listItemElementId;
        }
    }

    unShowNode() {
        if (!this._showListItemElementId) {
            return;
        }
        const listItemElement = document.getElementById(this._showListItemElementId);
        if (!listItemElement) {
            this._showListItemElementId = undefined;
            return;
        }
        listItemElement.classList.remove("highlighted-node");
        this._showListItemElementId = undefined;
    }

    destroy() {
        if (this._rootElement) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._rootElement = null;
            this._viewer.scene.off(this._onObjectVisibility);
            idMap.removeItem(this._id);
        }
    }
}
