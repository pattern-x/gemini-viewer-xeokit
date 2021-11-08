import { BimViewer } from "./BimViewer";

/**
 * Camera config
 */
export interface CameraConfig {
    eye: number[];
    look: number[];
    up?: number[];
    near?: number;
    far?: number;
}

/**
 * Model config
 */
export interface ModelConfig {
    name?: string;
    src: string; // url of the model
    position?: number[];
    rotation?: number[];
    scale?: number[];
    edges?: boolean; // if we want to generate and show edges to the modle
    visible?: boolean; // default value is true. won't load a model when invisible
    performance?: boolean; // Whether to use performance mode. Default value is true.
}

/**
 * Navigation control config
 */
export abstract class NavControlConfig {
    followPointer?: boolean;
    doublePickFlyTo?: boolean;
    panRightClick?: boolean;
    //Rotation
    dragRotationRate?: number;
    keyboardRotationRate?: number;
    rotationInertia?: number;
    //Pan
    keyboardPanRate?: number;
    panInertia?: number;
    //Dolly
    keyboardDollyRate?: number;
    mouseWheelDollyRate?: number;
    dollyInertia?: number;
    dollyMinSpeed?: number;
}

/**
 * Context for ContextMenu
 * \xeokit-sdk\src\extras\ContextMenu\ContextMenu.js
 */
export interface Context {
    bimViewer: BimViewer;
    entity?: any; // eslint-disable-line
}

/**
 * ContextMenu Config
 */
export interface ContextMenuConfig {
    items?: any[]; // eslint-disable-line
    context?: Context;
    enabled?: boolean;
    hideOnMouseDown?: boolean;
}

/**
 * This wrappers most config for Viewer (xeokit-sdk\src\viewer\Viewer.js)
 */
export interface BimViewerConfig {
    /**
     * Shows the NavCube.
     * @description Default is `true`.
     */
    enableNavCube?: boolean;
    /**
     * Shows the AxisGizmo.
     * @description Default is `true`.
     */
    enableAxisGizmo?: boolean;
    /**
     * Shows the toolbar.
     * @description Default is `true`.
     */
    enableToolbar?: boolean;
    /**
     * shows the bottom-bar.
     * @description Default is `true`.
     */
    enableBottomBar?: boolean;
    /**
     * Shows the context-menu.
     * @description Default is `true`.
     */
    enableContextMenu?: boolean;
    /**
     * Enables FastNav
     * @description Viewer plugin that improves interactivity by disabling expensive rendering effects while the Camera is moving.
     * Default is `true`.
     */
    enableFastNav?: boolean;
    /**
     * Enable single selection.
     * @description Default is `true`.
     */
    enableSingleSelection?: boolean;
    // toolbarConfig?: ToolbarConfiguration; // will use the default configuration if this is not specified

    /**
     * @description For Xeokit Viewer.
     */
    canvasId: string;
    /**
     * The id of customized spinner element.
     * @description For `Xeokit Viewer.scene`.
     */
    spinnerElementId?: string;
    /**
     * Swaps Y / Z axis.
     * @description Default is `false`.
     */
    swapYZ?: boolean;
    /**
     * The id of the customized canvas to draw NavCube.
     * @description It will use the default NavCube when this param is empty.
     */
    navCubeCanvasId?: string;
    /**
     * The id of the customized canvas to draw AxisGizmo.
     * @description It will use the default AxisGizmo when this param is empty.
     */
    axisGizmoCanvasId?: string;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    antialias?: boolean;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    transparent?: boolean;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    gammaInput?: boolean;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    gammaOutput?: boolean;
    /**
     * @description For `Xeokit Viewer.scene.canvas`.
     */
    backgroundColor?: number[];
    /**
     * @description For `Xeokit Viewer.scene.canvas`.
     */
    // backgroundColorFromAmbientLight?: number[];
    /**
     * @description For `Xeokit Viewer.scene.metrics`.
     *
     * Default is `meters`
     */
    units?: string;
    /**
     * @description For `Xeokit Viewer.scene.metrics`.
     */
    scale?: number;
    /**
     * @description For `Xeokit Viewer.scene.metrics`.
     */
    origin?: number[];
    /**
     * @description For `Xeokit Viewer.scene.sao`.
     */
    saoEnabled?: boolean;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    pbrEnabled?: boolean;

    /**
     * @description For `Xeokit Viewer.scene`.
     */
    // alphaDepthMask?: boolean;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    // entityOffsetsEnabled?: boolean;
    /**
     * @description For `Xeokit Viewer.scene`.
     */
    // logarithmicDepthBufferEnabled?: boolean;

    /**
     * Enter ortho mode by default.
     */
    activeOrthoMode?: boolean;
    /**
     * Sets the default locale
     * @description Default is `cn`.
     */
    locale?: "cn" | "en";
    /**
     * The image src of the skybox.
     * @description It will use default background color when this param is empty.
     */
    skyBoxImgSrc?: string;
}

/**
 * Default background color of viewer
 */
export const DEFAULT_BACKGROUND_COLOR = [0.98, 0.98, 0.98]; // [0.68, 0.85, 0.9] [0.83, 0.9, 0.97];

/**
 * A default BimViewerConfig as a template, which enables most plugins.
 */
export const DEFAULT_BIM_VIEWER_CONFIG: BimViewerConfig = {
    enableNavCube: true,
    enableAxisGizmo: true,
    enableToolbar: true,
    enableBottomBar: true,
    enableContextMenu: true,
    enableFastNav: true,
    enableSingleSelection: true,
    canvasId: "myCanvas", // caller need to make sure it exist or rewrite it
    spinnerElementId: "", // will create a default one when not specified
    navCubeCanvasId: "", // will create a default one when not specified
    axisGizmoCanvasId: "",
    antialias: true,
    transparent: false,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    units: "meters",
    saoEnabled: true,
    pbrEnabled: true,
};

/**
 * A simple BimViewerConfig as a template, which disables most plugins.
 */
export const SIMPLE_BIM_VIEWER_CONFIG: BimViewerConfig = {
    enableNavCube: false,
    enableAxisGizmo: false,
    enableToolbar: false,
    enableBottomBar: false,
    enableContextMenu: false,
    enableFastNav: false,
    enableSingleSelection: false,
    canvasId: "myCanvas", // caller need to make sure it exist or rewrite it
};
