import { AxisSectionPlaneController } from "./AxisSectionPlaneController";
import { BimTreeController } from "./BimTreeController";
import { FullScreenController } from "./FullScreenController";
import { HomeViewController } from "./HomeViewController";
import { MeasureAreaController } from "./MeasureAreaController";
import { MeasureClearController } from "./MeasureClearController";
import { MeasureController } from "./MeasureController";
import { MeasureDistanceController } from "./MeasureDistanceController";
import { OrthoModeController } from "./OrthoModeController";
import { PropertyController } from "./PropertyController";
import { SectionBoxController } from "./SectionBoxController";
import { SectionController } from "./SectionController";
import { SectionPlaneController } from "./SectionPlaneController";
import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * Buildin toolbar ids
 */
export enum ToolbarMenuId {
    HomeView = "HomeView",
    OrthoMode = "OrthoMode",
    Measure = "Measure",
    MeasureDistance = "MeasureDistance",
    MeasureArea = "MeasureArea",
    MeasureClear = "MeasureClear",
    Section = "Section",
    SectionBox = "SectionBox",
    SectionPlane = "SectionPlane",
    AxisSectionPlane = "AxisSectionPlane",
    BimTree = "BimTree",
    Viewpoint = "Viewpoint",
    Annotation = "Annotation",
    Property = "Property",
    Settings = "Settings",
    Fullscreen = "FullScreen",
}

/**
 * ToolbarConfig
 */
export interface ToolbarMenuConfig {
    menuName: string;
    icon: IconClass;
    controller: typeof ToolbarMenuBaseController;
    children?: ToolbarConfig;
    visible?: boolean;
    mutexIds?: ToolbarMenuId[];
    onActive?: () => void;
    onDeactive?: () => void;
}

export interface IconClass {
    default: string;
    active?: string;
    iconFont?: string;
}

export type ToolbarConfig = {
    [key in ToolbarMenuId]?: ToolbarMenuConfig;
};

export const DEFAULT_TOOLBAR_CONFIG: ToolbarConfig = {
    [ToolbarMenuId.HomeView]: {
        icon: { default: "icon-home", active: "icon-home-filled" },
        menuName: "Toolbar.homeView",
        controller: HomeViewController,
    },
    [ToolbarMenuId.OrthoMode]: {
        icon: { default: "icon-orthomode", active: "icon-orthomode-filled" },
        menuName: "Toolbar.orthoView",
        controller: OrthoModeController,
    },
    [ToolbarMenuId.Measure]: {
        icon: { default: "icon-measure", active: "icon-measure-filled" },
        menuName: "Toolbar.measurement",
        controller: MeasureController,
        children: {
            [ToolbarMenuId.MeasureDistance]: {
                icon: { default: "icon-distancemeasure", active: "icon-distancemeasure-filled" },
                menuName: "Toolbar.distanceMeasurement",
                controller: MeasureDistanceController,
                mutexIds: [ToolbarMenuId.MeasureArea],
            },
            [ToolbarMenuId.MeasureArea]: {
                icon: { default: "icon-areameasure", active: "icon-areameasure-filled" },
                menuName: "Toolbar.areaMeasurement",
                controller: MeasureAreaController,
                mutexIds: [ToolbarMenuId.MeasureDistance],
                visible: false,
            },
            [ToolbarMenuId.MeasureClear]: {
                icon: { default: "icon-clear", active: "icon-clear-filled" },
                menuName: "Toolbar.clearMeasurement",
                controller: MeasureClearController,
            },
        },
    },
    [ToolbarMenuId.Section]: {
        icon: { default: "icon-section", active: "icon-section-filled" },
        menuName: "Toolbar.section",
        controller: SectionController,
        children: {
            [ToolbarMenuId.AxisSectionPlane]: {
                icon: { default: "icon-sectionplane", active: "icon-sectionplane-filled" },
                menuName: "Toolbar.axisSection",
                controller: AxisSectionPlaneController,
                mutexIds: [ToolbarMenuId.SectionBox, ToolbarMenuId.SectionPlane],
            },
            [ToolbarMenuId.SectionPlane]: {
                icon: { default: "icon-choosesectionplane", active: "icon-choosesectionplane-filled" },
                menuName: "Toolbar.pickSectionPlane",
                controller: SectionPlaneController,
                mutexIds: [ToolbarMenuId.AxisSectionPlane, ToolbarMenuId.SectionBox],
            },
            [ToolbarMenuId.SectionBox]: {
                icon: { default: "icon-sectionbox", active: "icon-sectionbox-filled" },
                menuName: "Toolbar.sectionBox",
                controller: SectionBoxController,
                mutexIds: [ToolbarMenuId.AxisSectionPlane, ToolbarMenuId.SectionPlane],
            },
        },
    },
    [ToolbarMenuId.BimTree]: {
        icon: { default: "icon-bimtree", active: "icon-bimtree-filled" },
        menuName: "Toolbar.bimTree",
        controller: BimTreeController,
    },
    [ToolbarMenuId.Viewpoint]: {
        icon: { default: "icon-viewpoint", active: "icon-viewpoint-filled" },
        menuName: "Toolbar.viewpoint",
        controller: ToolbarMenuBaseController,
        visible: false,
    },
    [ToolbarMenuId.Annotation]: {
        icon: { default: "icon-annotation", active: "icon-annotation-filled" },
        menuName: "Toolbar.annotation",
        controller: ToolbarMenuBaseController,
        visible: false,
    },
    [ToolbarMenuId.Property]: {
        icon: { default: "icon-property", active: "icon-property-filled" },
        menuName: "Toolbar.property",
        controller: PropertyController,
        visible: false,
    },
    [ToolbarMenuId.Settings]: {
        icon: { default: "icon-settings", active: "icon-settings-filled" },
        menuName: "Toolbar.settings",
        controller: ToolbarMenuBaseController,
        visible: false,
    },
    [ToolbarMenuId.Fullscreen]: {
        icon: { default: "icon-fullscreen", active: "icon-fullscreen-filled" },
        menuName: "Toolbar.fullscreen",
        controller: FullScreenController,
    },
};

export const GROUP_CONFIG = [
    [ToolbarMenuId.HomeView, ToolbarMenuId.OrthoMode, ToolbarMenuId.Fullscreen],
    [ToolbarMenuId.Measure, ToolbarMenuId.Section],
    [ToolbarMenuId.BimTree, ToolbarMenuId.Viewpoint, ToolbarMenuId.Annotation, ToolbarMenuId.Property],
    [ToolbarMenuId.Settings],
];
