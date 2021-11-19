import { AxisSectionPlanePlugin } from "../plugins/AxisSectionPlanePlugin";
import { BackgroundColorPlugin } from "../plugins/BackgroundColorPlugin";
import { BimViewerConfig, CameraConfig, DEFAULT_BACKGROUND_COLOR, ModelConfig, NavControlConfig } from "./Configs";
import { BottomBar } from "../components/BottomBar";
import { cn, en } from "../utils/Locale";
import { CommonUtils } from "../utils/CommonUtils";
import { ComponentPropertyPlugin } from "../plugins/ComponentPropertyPlugin";
import { Controller } from "./Controller";
import { CustomizedGLTFLoaderPlugin } from "../plugins/CustomizedGLTFLoaderPlugin";
import { DxfLoaderPlugin } from "../plugins/DxfLoaderPlugin";
import { EnhancedDistanceMeasurementPlugin as DistanceMeasurementsPlugin } from "../plugins/EnhancedDistanceMeasurementPlugin";
import { FontManager } from "../services/FontManager";
import { forEach, forIn, has, last, set } from "lodash";
import { FullScreenPlugin } from "../plugins/FullScreenPlugin";
import { GridPlugin } from "../plugins/GridPlugin";
import { ObjectUtil } from "../utils/ObjectUtil";
import { OrthoModePlugin } from "../plugins/OrthoModePlugin";
import { PlanViewPlugin } from "../plugins/PlanViewPlugin";
import { SceneGraphTreeViewPlugin } from "../plugins/SceneGraphTreeViewPlugin";
import { SectionBoxPlugin } from "../plugins/SectionBoxPlugin";
import { SectionPlanePlugin } from "../plugins/SectionPlanePlugin";
import { showContextMenu } from "../utils/ContextMenuUtils";
import { SingleSelectionPlugin } from "../plugins/SingleSelectionPlugin";
import { Toolbar } from "../widgets/toolbar/Toolbar";
import { ToolbarMenuId } from "../widgets/toolbar/ToolbarConfig";

import {
    AmbientLight,
    AnnotationsPlugin,
    AxisGizmoPlugin,
    BCFViewpointsPlugin,
    ContextMenu,
    DirLight,
    FastNavPlugin,
    LocaleService,
    math,
    NavCubePlugin,
    OBJLoaderPlugin,
    Skybox,
    STLLoaderPlugin,
    Viewer,
    XKTLoaderPlugin,
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

/**
 * BimViewer class
 */
export class BimViewer extends Controller {
    // loaders
    // eslint-disable-next-line
    private _loaders: { [format: string]: { constructorFunc: any; loader?: any; is2d?: boolean } } = {
        gltf: { constructorFunc: CustomizedGLTFLoaderPlugin },
        obj: { constructorFunc: OBJLoaderPlugin },
        xkt: { constructorFunc: XKTLoaderPlugin },
        stl: { constructorFunc: STLLoaderPlugin },
        dxf: { constructorFunc: DxfLoaderPlugin, is2d: true },
    };
    // plugins
    private _annotationsPlugin: any; // eslint-disable-line
    private _axisSectionPlanePlugin?: AxisSectionPlanePlugin;
    private _axisGizmoPlugin: any; // eslint-disable-line
    private _backgroundColorPlugin?: BackgroundColorPlugin;
    private _bcfViewpointsPlugin?: any; // eslint-disable-line
    private _componentPropertyPlugin?: ComponentPropertyPlugin;
    private _distanceMeasurementsPlugin?: DistanceMeasurementsPlugin;
    private _fastNavPlugin: any; // eslint-disable-line
    private _fullScreenPlugin?: FullScreenPlugin;
    private _girdPlugin?: GridPlugin;
    private _navCubePlugin: any; // eslint-disable-line
    private _orthoModePlugin?: OrthoModePlugin;
    private _planViewPlugin?: PlanViewPlugin;
    private _skybox?: any; // eslint-disable-line
    private _singleSelectionPlugin?: SingleSelectionPlugin;
    private _sectionBoxPlugin?: SectionBoxPlugin;
    private _sectionPlanePlugin?: SectionPlanePlugin;
    private _treeViewPlugin?: SceneGraphTreeViewPlugin;
    // others
    private _localeService: any; // eslint-disable-line
    private _contextMenu?: any; // eslint-disable-line
    private _bimViewerCfg: BimViewerConfig;
    private _navControlCfg: NavControlConfig = {};
    private _twoDModelCount = 0; // number of 2d models
    private _threeDModelCount = 0; // number of 3d models
    private _selectionSuppressCount = 0; // used to count how many other tools who want to suppress selection tool
    private _homeView?: CameraConfig; // store it, so user can simply jump to home view
    private _rootHtmlElement?: HTMLElement; // add html into this element, so they can be removed properly
    private _rootStyleElement?: HTMLElement; // add css into this element, so they can be removed properly
    private _bottomBar?: BottomBar;
    private _toolbar?: Toolbar;

    /**
     * BimViewer constructor
     */
    constructor(bimViewerCfg: BimViewerConfig, cameraCfg?: CameraConfig, navControlCfg?: NavControlConfig) {
        super();

        this._bimViewerCfg = bimViewerCfg;
        this.initLocaleService(bimViewerCfg.locale);
        this.initViewer(bimViewerCfg, cameraCfg);
        this.initLights();
        this.initNavConfig(navControlCfg);
        this.initBackgroundColorPlugin(bimViewerCfg.backgroundColor, bimViewerCfg.transparent);
        bimViewerCfg.skyBoxImgSrc && this.initSkybox(bimViewerCfg.skyBoxImgSrc);
        this.initFullScreenPlugin(bimViewerCfg.canvasId);
        if (bimViewerCfg.enableNavCube !== false) {
            this.initNavCubePlugin(bimViewerCfg.navCubeCanvasId);
        }
        if (bimViewerCfg.enableFastNav !== false) {
            this.initFastNavPlugin();
        }
        if (bimViewerCfg.enableAxisGizmo !== false) {
            this.initAxisGizmoPlugin(bimViewerCfg.axisGizmoCanvasId);
        }
        if (bimViewerCfg.enableSingleSelection !== false) {
            this.initSingleSelectionPlugin();
            this.singleSelectionPlugin.setActive(true);
        }
        if (bimViewerCfg.enableContextMenu !== false) {
            this.initContextMenu();
        }
        if (bimViewerCfg.enableToolbar !== false) {
            this.initToolbar();
        }
        if (bimViewerCfg.enableBottomBar !== false) {
            this.initBottomBar();
        }
    }

    //////////////////////////////////////////////////////////////////
    // Initialize methods

    private initLocaleService(locale = "cn") {
        const params = {
            messages: {
                en: en,
                cn: cn,
            },
            locale: locale,
        };
        this._localeService = new LocaleService(params);
        return this._localeService;
    }

    private initViewer(cfg: BimViewerConfig, cameraCfg?: CameraConfig) {
        const viewer = new Viewer({
            canvasId: cfg.canvasId,
            spinnerElementId: cfg.spinnerElementId,
            antialias: cfg.antialias,
            transparent: !!cfg.transparent, // need to be false in order to enable backgroundColor!
            gammaInput: cfg.gammaInput,
            gammaOutput: cfg.gammaOutput,
            backgroundColor: cfg.backgroundColor || DEFAULT_BACKGROUND_COLOR,
            // backgroundColorFromAmbientLight: cfg.backgroundColorFromAmbientLight,
            units: cfg.units,
            scale: cfg.scale,
            origin: cfg.scale,
            saoEnabled: cfg.saoEnabled,
            pbrEnabled: cfg.pbrEnabled,
            // alphaDepthMask: cfg.alphaDepthMask,
            // entityOffsetsEnabled: cfg.entityOffsetsEnabled,
            // logarithmicDepthBufferEnabled: cfg.logarithmicDepthBufferEnabled,
            preserveDrawingBuffer: true,
            localeService: this._localeService,
        });
        const camera = viewer.camera;
        const scene = viewer.scene;

        if (cameraCfg) {
            camera.eye = cameraCfg.eye;
            camera.look = cameraCfg.look;
            cameraCfg.up && (camera.up = cameraCfg.up);
            if (cameraCfg.near) {
                camera.perspective.near = cameraCfg.near;
                camera.ortho.near = cameraCfg.near;
            }
            if (cameraCfg.far) {
                camera.perspective.far = cameraCfg.far;
                camera.ortho.far = cameraCfg.far;
            }
            this._homeView = { ...cameraCfg };
        } else {
            // set default values if not specified
            // TODO: should dynamically zoom to models...
            camera.eye = [50, 50, 50];
            camera.look = [0, 5, 0];
            camera.up = [0, 1, 0];
        }

        scene.selectedMaterial.fillAlpha = 0.1;
        scene.highlightMaterial.fillAlpha = 0.3;
        scene.highlightMaterial.edgeColor = [1, 1, 0];
        // scene.backgroundColor = [0.83, 0.9, 0.97];
        scene.sao.numSamples = 30; // change default value 10 to 30, for a better sao effect

        this.viewer = viewer;

        // modify the style for the default spinner
        const spinners = document.getElementsByClassName("sk-circle");
        // eslint-disable-next-line
        forEach(spinners, (element: any) => {
            element.classList.add("sk-customize");
        });
        const spinnerStyleSheet = last(document.styleSheets);
        spinnerStyleSheet?.insertRule(".sk-customize:before { background-color: #00D2B2 !important }");

        return viewer;
    }

    private initSkybox(src: string) {
        this._skybox = new Skybox(this.viewer.scene, {
            id: "skybox",
            src: src,
            size: 5000,
        });
    }

    /**
     * Replaces xeokit's default lights with our own, so we can change the parameters.
     * Reference to https://github.com/xeokit/xeokit-sdk/blob/master/src/viewer/scene/lights/DirLight.js
     */
    private initLights() {
        const scene = this.viewer && this.viewer.scene;
        if (!scene) {
            return; // should init viewer first
        }
        scene.clearLights(); // clear existing lights
        new AmbientLight(scene, {
            color: [1.0, 1.0, 1.0],
            intensity: 0.7,
        });
        new DirLight(scene, {
            dir: [0.8, -0.5, -0.5],
            color: [0.85, 0.85, 1.0], // [0.67, 0.67, 1.0]
            intensity: 0.7,
            space: "world",
        });
        new DirLight(scene, {
            dir: [-0.8, -1.0, 0.5],
            color: [1, 1, 0.9],
            intensity: 0.9,
            space: "world",
        });
    }

    private initNavConfig(navControlCfg?: NavControlConfig) {
        const cc = this.viewer.cameraControl;
        this._navControlCfg = {
            followPointer: cc.followPointer,
            panRightClick: cc.panRightClick,
            doublePickFlyTo: cc.doublePickFlyTo,
            dragRotationRate: cc.dragRotationRate,
            keyboardRotationRate: cc.keyboardRotationRate,
            rotationInertia: cc.rotationInertia,
            keyboardPanRate: cc.keyboardPanRate,
            panInertia: cc.panInertia,
            keyboardDollyRate: cc.keyboardDollyRate,
            mouseWheelDollyRate: cc.mouseWheelDollyRate,
            dollyInertia: cc.dollyInertia,
            dollyMinSpeed: cc.dollyMinSpeed,
        };

        this.setNavConfig(navControlCfg);

        // hard code the pivot marker id for now. TODO: make it configurable
        const cameraPivotElement = document.getElementById("pivotMarker");
        if (cameraPivotElement) {
            cc.pivotElement = cameraPivotElement;
            // always enable smartPivot, so it sets pointer position(rather than camera.look) as the pivot
            cc.smartPivot = true;
        }
    }

    private initNavCubePlugin(canvasId?: string) {
        if (!canvasId) {
            // if caller didn't define canvas element, create a default nav cube
            const element = document.createElement("canvas");
            element.id = canvasId = "myNavCubeCanvas";

            const css = `
                #myNavCubeCanvas {
                    position: absolute;
                    width: 200px;
                    height: 200px;
                    bottom: 10px;
                    right: 10px;
                    z-index: 1;
                    opacity: 0.8;
                    &:hover {
                        opacity: 1;
                    }
                }`;
            this.appendHtmlElement(element, css);
        }
        this._navCubePlugin = new NavCubePlugin(this.viewer, {
            canvasId,
            visible: true,
            color: "rgb(180,180,180)",
            hoverColor: "rgb(160,160,160)",
            shadowVisible: false,
        });
        this._navCubePlugin._navCubeCamera.ortho.scale = 10.0;
        return this._navCubePlugin;
    }

    private initFastNavPlugin() {
        this._fastNavPlugin = new FastNavPlugin(this.viewer, {
            pbrEnabled: this._bimViewerCfg.pbrEnabled !== false,
            saoEnabled: this._bimViewerCfg.saoEnabled !== false, // enable it by default
            edgesEnabled: true,
        });
        return this._fastNavPlugin;
    }

    private initAxisGizmoPlugin(canvasId?: string) {
        if (!this.viewer) {
            throw new Error("[Viewer] Should init viewer first!");
        }
        if (!canvasId) {
            // if caller didn't define canvas element, create a default nav cube
            const element = document.createElement("canvas");
            element.id = canvasId = "myAxisGizmoCanvas";

            const css = `
                #myAxisGizmoCanvas {
                    position: absolute;
                    width: 120px;
                    height: 120px;
                    bottom: 20px;
                    left: 10px;
                    z-index: 1;
                }`;
            this.appendHtmlElement(element, css);
        }
        this._axisGizmoPlugin = new AxisGizmoPlugin(this.viewer, { canvasId });
        return this._axisGizmoPlugin;
    }

    private initBackgroundColorPlugin(backgroundColor: number[] = DEFAULT_BACKGROUND_COLOR, transparent = false) {
        this._backgroundColorPlugin = new BackgroundColorPlugin(this.viewer, { transparent, backgroundColor });
        return this._backgroundColorPlugin;
    }

    private initSingleSelectionPlugin() {
        this._singleSelectionPlugin = new SingleSelectionPlugin(this.viewer);
        return this._singleSelectionPlugin;
    }

    // reference to https://github.com/xeokit/xeokit-bim-viewer/blob/master/src/BIMViewer.js
    private initContextMenu() {
        this._contextMenu = new ContextMenu({ context: { bimViewer: this } });

        this.viewer.cameraControl.on("rightClick", ({ canvasPos }: { canvasPos: [number, number] }) => {
            const hit = this.viewer.scene.pick({ canvasPos: canvasPos });
            showContextMenu(this._contextMenu, hit, canvasPos);
        });
    }

    private initComponentPropertyPlugin() {
        this._componentPropertyPlugin = new ComponentPropertyPlugin(this.viewer, {
            singleSelectionControl: this.singleSelectionPlugin,
            active: false,
        });
        return this._componentPropertyPlugin;
    }

    private initFullScreenPlugin(canvasId: string) {
        this._fullScreenPlugin = new FullScreenPlugin();
        let element = document.getElementById(canvasId);
        while (element?.parentElement) {
            element = element.parentElement;
        }
        if (element) {
            this._fullScreenPlugin.setElement(element);
        }
        return this._fullScreenPlugin;
    }

    private initSectionPlanePlugin() {
        this._sectionPlanePlugin = new SectionPlanePlugin(this.viewer);
        return this._sectionPlanePlugin;
    }

    private initAxisSectionPlanePlugin() {
        const cfg = {
            active: false,
            swapYZ: !!this._bimViewerCfg.swapYZ,
        };
        this._axisSectionPlanePlugin = new AxisSectionPlanePlugin(this.viewer, cfg);
        return this._axisSectionPlanePlugin;
    }

    private initDistanceMeasurementsPlugin() {
        this._distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(this.viewer, {
            container: this.rootHtmlElement,
            labelMinAxisLength: 100, // do not show label for x, y, z axis when there is no space
        });
        return this._distanceMeasurementsPlugin;
    }

    private initTreeViewPlugin() {
        const containerElement = document.getElementById("treeViewContainer");
        if (!containerElement) {
            console.error("[Viewer]", "can not find tree view container!");
            return;
        }

        this._treeViewPlugin = new SceneGraphTreeViewPlugin(this.viewer, { containerElement });

        // Left-clicking on a tree node isolates that object in the 3D view
        // eslint-disable-next-line
        this._treeViewPlugin.on("nodeTitleClicked", (e: any) => {
            const scene = this.viewer.scene;
            const objectIds: string[] = [];
            // eslint-disable-next-line
            e.treeViewPlugin.withNodeTree(e.treeViewNode, (treeViewNode: any) => {
                if (treeViewNode.objectId) {
                    objectIds.push(treeViewNode.objectId);
                }
            });
            e.treeViewPlugin.unShowNode();
            scene.setObjectsXRayed(scene.objectIds, true);
            scene.setObjectsVisible(scene.objectIds, true);
            scene.setObjectsXRayed(objectIds, false);
            scene.setObjectsSelected(scene.selectedObjectIds, false);
            scene.setObjectsSelected(objectIds, true);
            this.viewer.cameraFlight.flyTo(
                {
                    aabb: scene.getAABB(objectIds),
                    duration: 0.5,
                },
                () => {
                    setTimeout(() => {
                        scene.setObjectsXRayed(scene.xrayedObjectIds, false);
                    }, 500);
                }
            );
        });
        return this._treeViewPlugin;
    }

    /**
     * Init toolbar whether from user defined or build in element
     */
    private initToolbar() {
        this._toolbar = new Toolbar(this);

        if (this._bimViewerCfg.activeOrthoMode) {
            this.toolbar.controllers[ToolbarMenuId.OrthoMode].fire("click", null);
        }
    }

    /**
     * Init BottomBar
     */
    private initBottomBar() {
        this._bottomBar = new BottomBar(this);
        return this._bottomBar;
    }

    //////////////////////////////////////////////////////////////////
    // Properties
    get navCubePlugin() {
        if (!this._navCubePlugin) {
            this._navCubePlugin = this.initNavCubePlugin();
        }
        return this._navCubePlugin;
    }

    get fastNavPlugin() {
        if (!this._fastNavPlugin) {
            this._fastNavPlugin = this.initFastNavPlugin();
        }
        return this._fastNavPlugin;
    }

    get backgroundColorPlugin() {
        if (!this._backgroundColorPlugin) {
            const color = this._bimViewerCfg.backgroundColor || DEFAULT_BACKGROUND_COLOR;
            this._backgroundColorPlugin = this.initBackgroundColorPlugin(color);
        }
        return this._backgroundColorPlugin;
    }

    get componentPropertyPlugin() {
        if (!this._componentPropertyPlugin) {
            this._componentPropertyPlugin = this.initComponentPropertyPlugin();
        }
        return this._componentPropertyPlugin;
    }

    get singleSelectionPlugin() {
        if (!this._singleSelectionPlugin) {
            this._singleSelectionPlugin = this.initSingleSelectionPlugin();
        }
        return this._singleSelectionPlugin;
    }

    get fullScreenPlugin() {
        // should be initialized in constructor already
        return this._fullScreenPlugin;
    }

    get orthoModePlugin() {
        if (!this._orthoModePlugin) {
            this._orthoModePlugin = new OrthoModePlugin(this.viewer);
        }
        return this._orthoModePlugin;
    }

    get planViewPlugin() {
        if (!this._planViewPlugin) {
            this._planViewPlugin = new PlanViewPlugin(this.viewer);
        }
        return this._planViewPlugin;
    }

    get girdPlugin() {
        if (!this._girdPlugin) {
            this._girdPlugin = new GridPlugin(this.viewer);
        }
        return this._girdPlugin;
    }

    get bcfViewpointsPlugin() {
        if (!this._bcfViewpointsPlugin) {
            this._bcfViewpointsPlugin = new BCFViewpointsPlugin(this.viewer);
        }
        return this._bcfViewpointsPlugin;
    }

    get annotationsPlugin() {
        if (!this._annotationsPlugin) {
            this._annotationsPlugin = new AnnotationsPlugin(this.viewer, { surfaceOffset: 0.1 });
        }
        return this._annotationsPlugin;
    }

    get sectionPlanePlugin() {
        if (!this._sectionPlanePlugin) {
            this._sectionPlanePlugin = this.initSectionPlanePlugin();
        }
        return this._sectionPlanePlugin;
    }
    get axisSectionPlanePlugin() {
        if (!this._axisSectionPlanePlugin) {
            this._axisSectionPlanePlugin = this.initAxisSectionPlanePlugin();
        }
        return this._axisSectionPlanePlugin;
    }
    get distanceMeasurementsPlugin() {
        if (!this._distanceMeasurementsPlugin) {
            this._distanceMeasurementsPlugin = this.initDistanceMeasurementsPlugin();
        }
        return this._distanceMeasurementsPlugin;
    }

    get sectionBoxPlugin() {
        if (!this._sectionBoxPlugin) {
            this._sectionBoxPlugin = new SectionBoxPlugin(this.viewer);
        }
        return this._sectionBoxPlugin;
    }

    get skybox() {
        if (!this._skybox) {
            this._bimViewerCfg.skyBoxImgSrc && this.initSkybox(this._bimViewerCfg.skyBoxImgSrc);
        }
        return this._skybox;
    }

    get treeViewPlugin() {
        if (!this._treeViewPlugin) {
            this._treeViewPlugin = this.initTreeViewPlugin();
        }
        return this._treeViewPlugin;
    }

    /**
     * If there is any 2d model loaded
     */
    get has2dModel() {
        return this._twoDModelCount > 0;
    }

    /**
     * If there is any 3d model loaded
     */
    get has3dModel() {
        return this._threeDModelCount > 0;
    }

    /**
     * Gets root HTMLElement that contains dynamically created ui
     */
    get rootHtmlElement() {
        if (!this._rootHtmlElement) {
            this._rootHtmlElement = document.createElement("div");
            this._rootHtmlElement.id = "rootHtmlElement";
            document.body.appendChild(this._rootHtmlElement);
        }
        return this._rootHtmlElement;
    }

    /**
     * Gets root HTMLElement that contains dynamically created css
     */
    get rootStyleElement() {
        if (!this._rootStyleElement) {
            this._rootStyleElement = document.createElement("style");
            this._rootStyleElement.setAttribute("type", "text/css");
            this._rootStyleElement.id = "rootStyleElement";
            document.head.appendChild(this._rootStyleElement);
        }
        return this._rootStyleElement;
    }

    get toolbar() {
        if (!this._toolbar) {
            return (this._toolbar = new Toolbar(this));
        }
        return this._toolbar;
    }

    //////////////////////////////////////////////////////////////////
    // Public methods

    /**
     * Makes viewport fit to all models
     */
    viewFitAll() {
        const aabb = this.viewer.scene.getAABB(this.viewer.scene.visibleObjectIds);
        this.viewer.cameraFlight.flyTo({ aabb, duration: 0.5 });
        this.viewer.cameraControl.pivotPos = math.getAABB3Center(aabb);
    }

    /**
     * Goes to home view
     */
    goToHomeView(duration = 0.5) {
        const viewer = this.viewer;
        let eye = [50, 50, 50];
        let look = [0, 5, 0];
        let up = [0, 1, 0];

        if (this._homeView) {
            eye = this._homeView.eye || eye;
            look = this._homeView.look || look;
            up = this._homeView.up || up;
        } else {
            const scene = viewer.scene;
            const tempVec3a = math.vec3();
            const aabb = scene.getAABB(scene.visibleObjectIds);
            const diag = math.getAABB3Diag(aabb);
            const center = math.getAABB3Center(aabb, tempVec3a);
            const camera = scene.camera;
            // const fitFOV = camera.perspective.fov;
            const dist = Math.abs(diag / Math.tan(45 * math.DEGTORAD));
            const dir = math.normalizeVec3(camera.yUp ? [-0.5, -0.7071, -0.5] : [-1, 1, -1]);
            up = math.normalizeVec3(camera.yUp ? [-0.5, 0.7071, -0.5] : [-1, 1, 1]);
            viewer.cameraControl.pivotPos = center;
            viewer.cameraControl.planView = false;
            eye = [center[0] - dist * dir[0], center[1] - dist * dir[1], center[2] - dist * dir[2]];
            look = center;
            // orthoScale: diag * 1.3,
            // projection: "perspective",
        }

        viewer.cameraFlight.flyTo({ look, eye, up, duration });
    }

    /**
     * Resets BimViewer by clearing invisible, selected, x-rayed, highlighted objects.
     */
    reset() {
        const scene = this.viewer.scene;
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsPickable(scene.xrayedObjectIds, true);
        scene.setObjectsXRayed(scene.xrayedObjectIds, false);
        scene.setObjectsSelected(scene.selectedObjectIds, false);
        scene.setObjectsHighlighted(scene.highlightedObjectIds, false);

        // clear and deactive measurements
        if (this._distanceMeasurementsPlugin) {
            const plugin = this._distanceMeasurementsPlugin;
            plugin.clear();
            plugin.control.deactivate();
        }
        this.toolbar.controllers[ToolbarMenuId.Measure].children.forEach((child: Controller) => {
            if (child.getActive()) {
                child.setActive(false);
            }
        });
        // clear and deactive sections
        if (this._sectionBoxPlugin) {
            const plugin = this._sectionBoxPlugin;
            if (plugin && plugin.active) {
                plugin.reset();
                plugin.active = false;
            }
        }
        if (this._sectionPlanePlugin) {
            const plugin = this._sectionPlanePlugin;
            if (plugin && plugin.active) {
                plugin.reset();
                plugin.active = false;
            }
        }
        if (this._axisSectionPlanePlugin) {
            const plugin = this._axisSectionPlanePlugin;
            if (plugin && plugin.active) {
                plugin.reset();
                plugin.active = false;
            }
        }
        this.toolbar.controllers[ToolbarMenuId.Section].children.forEach((child: Controller) => {
            if (child.getActive()) {
                child.setActive(false);
            }
        });

        this._selectionSuppressCount = 0;
    }

    /**
     * Actives single selection
     */
    activeSingleSelection(active = true) {
        this.singleSelectionPlugin.setActive(active);
    }

    /**
     * Actives ortho mode
     */
    activeOrthoMode(active = true) {
        this.viewer.cameraFlight.jumpTo({ projection: active ? "ortho" : "perspective" });
    }

    /**
     * Actives section box
     */
    activeSectionBox(active = true) {
        this.sectionBoxPlugin.visible = active;
        this.sectionBoxPlugin.active = active;
    }

    /**
     * Actives section plane
     */
    activeSectionPlane(active = true) {
        this.sectionPlanePlugin.visible = active;
        this.sectionPlanePlugin.active = active;
    }

    /**
     * Active axis section plane
     */
    activeAxisSectionPlane(active = true) {
        this.axisSectionPlanePlugin.visible = active;
        this.axisSectionPlanePlugin.active = active;
    }

    /**
     * Actives distance measurement
     */
    activeDistanceMeasurement(active = true) {
        this.distanceMeasurementsPlugin.active = active;
    }

    /**
     * Actives BIM Tree
     */
    activeBimTree(active = true) {
        this.treeViewPlugin?.setActive(active);
    }

    /**
     * Actives viewpoint panel
     */
    activeViewpoint(/* active = true */) {
        console.warn("Not implemented yet!");
    }

    /**
     * Actives annotation panel
     */
    activeAnnotation(/* active = true */) {
        console.warn("Not implemented yet!");
    }

    /**
     * Actives property panel
     */
    activeProperty(active = true) {
        this.componentPropertyPlugin.setActive(active);
    }

    /**
     * Actives setting panel
     */
    activeSetting(/* active = true */) {
        console.warn("Not implemented yet!");
    }

    /**
     * Actives full screen
     */
    activeFullScreen(active = true) {
        this.fullScreenPlugin?.setActive(active);
    }

    /**
     * Actives 2d mode
     */
    active2dMode(active = true) {
        this.planViewPlugin.setActive(active);
    }

    /**
     * Suppresses or unsupporess SingleSelectionPlugin
     * When other tools(measure, section, etc.) are actived, we need to suppress from selecting any object.
     * While, we need to unsuppress it when a tool is inactived.
     * Here we assume SingleSelectionPlugin is active once created, if not, we need to adjust the logic a bit.
     */
    suppressSingleSelection(suppress = true) {
        if (!this._singleSelectionPlugin) {
            return;
        }
        this._selectionSuppressCount += suppress ? 1 : -1;
        const active = this._selectionSuppressCount <= 0;
        if (active !== this._singleSelectionPlugin.getActive()) {
            this._singleSelectionPlugin.setActive(active);
        }
    }

    /**
     * @description Loads a model
     * @param {ModelConfig} modleCfg
     * @param {(model: any) => void} [okFunc]
     * @return {*}
     * @memberof BimViewer
     */
    // eslint-disable-next-line
    loadModel(modleCfg: ModelConfig, okFunc?: (model: any) => void) {
        const src = modleCfg.src;
        if (!src) {
            console.error(`[Viewer] Invalid "src"!`);
            return;
        }
        const format = src.slice(src.lastIndexOf(".") + 1).split("?")[0];
        const loader = this.getLoader(format);
        if (!loader) {
            console.error(`[Viewer] Failed to get loader for ${src}`);
            return;
        }
        if (this.is2d(format) && FontManager.instance().isEmpty()) {
            console.error("[Viewer] Dxf files need fonts");
        }
        const id = this.getUniqulModelId(modleCfg.name);
        console.log(`[Viewer] Loading "${modleCfg.name || id}"...`);
        const startTime = Date.now();
        const m = loader.load({
            id: id,
            src: modleCfg.src,
            metaModelSrc: "",
            position: modleCfg.position,
            scale: modleCfg.scale,
            rotation: modleCfg.rotation,
            edges: modleCfg.edges,
            performance: modleCfg.performance !== false,
        });
        m.on("loaded", () => {
            console.log(`[Viewer] Loaded "${id}" in ${(Date.now() - startTime) / 1000}s`);
            this.sectionBoxPlugin.aabb = this.viewer.scene.getAABB(this.viewer.scene.visibleObjectIds);
            console.log(`[Viewer] Current aabb: (${CommonUtils.numbersToString(this.sectionBoxPlugin.aabb)})`);
            this.is2d(format) ? this._twoDModelCount++ : this._threeDModelCount++;
            okFunc && okFunc(m);
        });
    }

    /**
     * @description Sets the visibility for the model
     * @param {*} model
     * @param {boolean} visible
     * @return {*}
     * @memberof BimViewer
     */
    // eslint-disable-next-line
    setModelVisibility(model: any, visible: boolean) {
        if (!model.isModel) {
            console.warn(model, "is not a model");
            return;
        }
        model.visible = visible;
    }

    /**
     * @description Sets the visibily for Objects
     * @param {string[]} objectIds
     * @param {boolean} visible
     * @memberof BimViewer
     */
    setObjectsVisibility(objectIds: string[], visible: boolean) {
        this.viewer.scene.setObjectsVisible(objectIds, visible);
    }

    /**
     * @description Gets the screenshot of the model
     * @return {string} dataUrls
     * @memberof BimViewer
     */
    getCanvasImageDataUrl() {
        const { canvasId } = this._bimViewerCfg;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        return canvas.toDataURL("image/png");
    }

    /**
     * Loads fonts needed for text rendering
     */
    async loadFont(url: string): Promise<boolean> {
        const id = await FontManager.instance().load({ url });
        return Promise.resolve(id !== undefined);
    }

    /**
     * Sets navigation control parameters
     */
    setNavConfig(newCfg: NavControlConfig = {}) {
        const cc = this.viewer.cameraControl;
        const cfg = this._navControlCfg;
        forIn(newCfg, (value, prop) => {
            if (value !== undefined && has(cfg, prop)) {
                set(cc, prop, value);
                set(cfg, prop, value);
            }
        });
    }

    getNavValueByName(paraName: keyof NavControlConfig): number | boolean | undefined {
        return ObjectUtil.getKeyValue(this._navControlCfg, paraName);
    }

    /**
     * @description Creates an annotation on the canvas.
     * @param {*} params
     * @return {*}
     * @memberof BimViewer
     */
    // eslint-disable-next-line
    createAnnotation(params: any) {
        return this.annotationsPlugin.createAnnotation(params);
    }

    /**
     * @description Clears all annotations.
     * @memberof BimViewer
     */
    clearAnnotations() {
        this.annotationsPlugin.clear();
    }

    /**
     * @description Destroys an annotation on the canvas.
     * @param {string} id
     * @memberof BimViewer
     */
    destroyAnnotation(id: string) {
        this.annotationsPlugin.destroyAnnotation(id);
    }

    translate(key: string) {
        return this._localeService.translate(key) || key;
    }

    /**
     * Destroies everything
     */
    destroy() {
        // eslint-disable-next-line
        const destroy = (obj: any) => {
            if (obj && typeof obj.destroy === "function") {
                obj.destroy();
            }
        };
        destroy(this._annotationsPlugin);
        destroy(this._axisGizmoPlugin);
        destroy(this._backgroundColorPlugin);
        destroy(this._bcfViewpointsPlugin);
        destroy(this._componentPropertyPlugin);
        destroy(this._distanceMeasurementsPlugin);
        destroy(this._fastNavPlugin);
        destroy(this._fullScreenPlugin);
        destroy(this._girdPlugin);
        destroy(this._navCubePlugin);
        destroy(this._orthoModePlugin);
        destroy(this._planViewPlugin);
        destroy(this._singleSelectionPlugin);
        destroy(this._sectionBoxPlugin);
        destroy(this._sectionPlanePlugin);
        destroy(this._axisSectionPlanePlugin);
        destroy(this._treeViewPlugin);
        destroy(this._contextMenu);

        destroy(this._toolbar);
        delete this._toolbar;

        if (this._rootHtmlElement) {
            this._rootHtmlElement.remove();
        }
        if (this._rootStyleElement) {
            this._rootStyleElement.remove();
        }
        destroy(this._bottomBar);
        destroy(this.viewer);
    }

    //////////////////////////////////////////////////////////////////
    // Private methods

    /**
     * Checks if a format is 2d
     */
    private is2d(format: string): boolean {
        format = format.toLowerCase();
        const obj = this._loaders[format];
        return !!(obj && obj.is2d);
    }

    /**
     * Gets a loader by given file format
     */
    private getLoader(format: string) {
        format = format.toLowerCase();
        const obj = this._loaders[format];
        if (!obj) {
            return undefined;
        }
        if (!obj.loader && obj.constructorFunc) {
            obj.loader = new obj.constructorFunc(this.viewer);
        }
        return obj.loader;
    }

    private getUniqulModelId(prefix?: string): string {
        const DEFAULT_PREFIX = "model_id";
        const modelIds = this.viewer.scene.modelIds;
        let newId = prefix || `${DEFAULT_PREFIX}_1`;
        let i = 1;
        while (modelIds.find((id: string) => id === newId)) {
            newId = prefix ? `${prefix}_${i}` : `${DEFAULT_PREFIX}_${i}`;
            i++;
        }
        return newId;
    }

    /**
     * Appends ui and css to current page
     */
    private appendHtmlElement(html: HTMLElement, css: string) {
        this.rootStyleElement.innerHTML += css;
        this.rootHtmlElement.appendChild(html);
    }
}
