import { Context } from "../core/Configs";
import { endsWith, get } from "lodash";
import { math } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
import { SECTION_BOX_ID, SECTION_PLANE_CONTROL_ID, AXIS_SECTION_PLANE_CONTROL_ID } from "./Consts";
import { ToolbarMenuId } from "../widgets/toolbar/ToolbarConfig";

const translate =
    (translateKey: string) =>
    ({ bimViewer }: Context) =>
        bimViewer.translate(`ContextMenu.${translateKey}`);

// Common ContextMenu Items
const viewFitAll = {
    getTitle: translate("viewFitAll"), // View Fit All
    doAction: ({ bimViewer }: Context) => bimViewer.viewFitAll(),
};

const hideAll = {
    getTitle: translate("hideAll"), // Hide All
    getEnabled: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => scene.numVisibleObjects > 0,
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => {
        scene.setObjectsVisible(scene.visibleObjectIds, false);
    },
};

const showAll = {
    getTitle: translate("showAll"), // Show All
    getEnabled: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => scene.numVisibleObjects < scene.numObjects || scene.numXRayedObjects > 0,
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => {
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsPickable(scene.xrayedObjectIds, true);
        scene.setObjectsXRayed(scene.xrayedObjectIds, false);
    },
};

const xRayAll = {
    getTitle: translate("xRayAll"), // X-Ray
    getEnabled: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => scene.numXRayedObjects < scene.numObjects,
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => {
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsXRayed(scene.objectIds, true);
        scene.setObjectsPickable(scene.objectIds, false);
    },
};

const xRayNone = {
    getTitle: translate("xRayNone"), // X-Ray None
    getEnabled: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => scene.numXRayedObjects > 0,
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => {
        const xrayedObjectIds = scene.xrayedObjectIds;
        scene.setObjectsPickable(xrayedObjectIds, true);
        scene.setObjectsXRayed(xrayedObjectIds, false);
    },
};

const selectNone = {
    getTitle: translate("selectNone"), // Select None
    getEnabled: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => scene.numSelectedObjects > 0,
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
    }: Context) => scene.setObjectsSelected(scene.selectedObjectIds, false),
};

const resetView = {
    getTitle: translate("resetView"), // Reset View
    doAction: ({ bimViewer }: Context) => bimViewer.reset(),
};

// Object ContextMenu Item
const viewFitEntity = {
    getTitle: translate("viewFitEntity"), // View Fit
    getShown: ({ entity }: Context) => entity,
    doAction: ({
        bimViewer: { viewer },
        bimViewer: {
            viewer: { scene },
        },
        entity,
    }: Context) => {
        viewer.cameraFlight.flyTo(
            {
                aabb: entity.aabb,
                duration: 0.5,
            },
            () => {
                setTimeout(() => scene.setObjectsHighlighted(scene.highlightedObjectIds, false), 500);
            }
        );
        viewer.cameraControl.pivotPos = math.getAABB3Center(entity.aabb);
    },
};

const hideEntity = {
    getTitle: translate("hideEntity"), // Hide
    getEnabled: ({ entity }: Context) => entity.visible,
    doAction: ({ entity }: Context) => (entity.visible = false),
};

const hideOthers = {
    getTitle: translate("hideOthers"), // Hide Others
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
        entity,
    }: Context) => {
        scene.setObjectsVisible(scene.visibleObjectIds, false);
        entity.visible = true;
    },
};

const xRayEntity = {
    getTitle: translate("xRayEntity"), // X-Ray
    getEnabled: ({ entity }: Context) => !entity.xrayed,
    doAction: ({ entity }: Context) => {
        entity.xrayed = true;
        entity.pickable = false;
    },
};

const xRayOthers = {
    getTitle: translate("xRayOthers"), // X-Ray Others
    doAction: ({
        bimViewer: {
            viewer: { scene },
        },
        entity,
    }: Context) => {
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsXRayed(scene.objectIds, true);
        scene.setObjectsPickable(scene.objectIds, false);
        entity.xrayed = false;
        entity.pickable = true;
    },
};

const selectEntity = {
    getTitle: ({ entity, bimViewer }: Context) =>
        entity.selected ? translate("deselect")(bimViewer) : translate("select")(bimViewer),
    doAction: ({ entity }: Context) => (entity.selected = !entity.selected),
};

// Section Related Items
const showSection = {
    getTitle: ({ bimViewer }: Context) => {
        if (bimViewer.sectionPlanePlugin.active) {
            return translate("showSectionPlane")(bimViewer);
        }
        if (bimViewer.sectionBoxPlugin.active) {
            return translate("showSectionBox")(bimViewer);
        }
        if (bimViewer.axisSectionPlanePlugin.active) {
            return translate("showAxisSection")(bimViewer);
        }
    },
    getShown: ({ bimViewer }: Context) =>
        (bimViewer.sectionPlanePlugin.active && !bimViewer.sectionPlanePlugin.visible) ||
        (bimViewer.sectionBoxPlugin.active && !bimViewer.sectionBoxPlugin.visible) ||
        (bimViewer.axisSectionPlanePlugin.active && !bimViewer.axisSectionPlanePlugin.visible),
    doAction: ({ bimViewer }: Context) => {
        if (bimViewer.sectionPlanePlugin.active) {
            bimViewer.sectionPlanePlugin.visible = true;
        } else if (bimViewer.sectionBoxPlugin.active) {
            bimViewer.sectionBoxPlugin.visible = true;
        } else if (bimViewer.axisSectionPlanePlugin.active) {
            bimViewer.axisSectionPlanePlugin.visible = true;
        }
    },
};

const hitOnSection = (context: Context) => {
    const entityId = get(context, "entity.id");

    return (
        AXIS_SECTION_PLANE_CONTROL_ID === entityId ||
        SECTION_PLANE_CONTROL_ID === entityId ||
        endsWith(entityId, SECTION_BOX_ID)
    );
};

const hideSection = {
    getTitle: ({ bimViewer }: Context) => {
        if (bimViewer.sectionPlanePlugin.active) {
            return translate("hideSectionPlane")(bimViewer);
        }
        if (bimViewer.sectionBoxPlugin.active) {
            return translate("hideSectionBox")(bimViewer);
        }
        if (bimViewer.axisSectionPlanePlugin.active) {
            return translate("hideAxisSection")(bimViewer);
        }
    },
    getShown: (context: Context) => hitOnSection(context),
    doAction: ({ bimViewer }: Context) => {
        if (bimViewer.sectionPlanePlugin.active) {
            bimViewer.sectionPlanePlugin.visible = false;
        } else if (bimViewer.sectionBoxPlugin.active) {
            bimViewer.sectionBoxPlugin.visible = false;
        } else if (bimViewer.axisSectionPlanePlugin.active) {
            bimViewer.axisSectionPlanePlugin.visible = false;
        }
    },
};

const undoSection = {
    getTitle: translate("undoSection"),
    getShown: (context: Context) => hitOnSection(context),
    doAction: ({ bimViewer }: Context) => {
        if (bimViewer.sectionPlanePlugin.active) {
            bimViewer.toolbar.controllers[ToolbarMenuId.SectionPlane].fire("click", undefined);
        } else if (bimViewer.sectionBoxPlugin.active) {
            bimViewer.toolbar.controllers[ToolbarMenuId.SectionBox].fire("click", undefined);
        } else if (bimViewer.axisSectionPlanePlugin.active) {
            bimViewer.toolbar.controllers[ToolbarMenuId.AxisSectionPlane].fire("click", undefined);
        }
    },
};

// ContextMenu Configuration
const canvasContextMenuItems = [
    [showSection],
    [hideSection, undoSection],
    [viewFitAll],
    [hideAll, showAll],
    [xRayAll, xRayNone],
    [selectNone],
    [resetView],
];

const objectContextMenuItems = [
    [showSection],
    [viewFitEntity, viewFitAll],
    [hideEntity, hideOthers, hideAll, showAll],
    [xRayEntity, xRayOthers, xRayAll, xRayNone],
    [selectEntity, selectNone],
];

// eslint-disable-next-line
const getContextMenuItems = (hit: any) => (get(hit, "entity.isObject") ? objectContextMenuItems : canvasContextMenuItems);

// eslint-disable-next-line
export const showContextMenu = (contextMenu: any, hit: any, canvasPos: [number, number]) => {
    contextMenu.items = getContextMenuItems(hit);
    contextMenu.context = {
        ...contextMenu.context,
        entity: get(hit, "entity"),
    };
    contextMenu.show(canvasPos[0], canvasPos[1]);
};
