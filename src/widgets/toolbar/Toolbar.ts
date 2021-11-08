import { assign, concat, forEach, forIn, get, keys, take, takeRight } from "lodash";
import { BimViewer } from "../../core/BimViewer";
import { Controller } from "../../core/Controller";
import { DEFAULT_TOOLBAR_CONFIG, GROUP_CONFIG, ToolbarConfig, ToolbarMenuConfig, ToolbarMenuId } from "./ToolbarConfig";
import { ICON_FONT_CLASS } from "../../utils/Consts";
import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * @class Toolbar
 * @description A customized toolbar.
 *
 * For example:
 * #### Example 1:
 * Using {@link updateMenu} to modify the toolbar configuration
 * ```typescript
 *     const toolbar = this.bimViewer.toolbar;
 *     toolbar.updateMenu(ToolbarMenuId.Viewpoint, { onActive: this.handleActive });
 *     toolbar.updateMenu(ToolbarMenuId.Annotation, { visible: false });
 * ```
 *
 * #### Example 2:
 * Using {@link addMenu} to add a new menu to the toolbar with specific position.
 * ```typescript
 *     const toolbar = this.bimViewer.toolbar;
 *     toolbar.addMenu(
 *         "newMenu",
 *         { icon: { default: "icon-new" }, menuName: "新菜单", controller: BimTreeController },
 *         [2, 5]
 *     );
 * ```
 *
 * #### Example 3:
 * Modify the configuration in to custmize the toolbar directly, and then {@link refresh} the whole toolbar.
 * ```typescript
 *     const toolbar = this.bimViewer.toolbar;
 *     const toolbarGroupConfig = [
 *         [ToolbarMenuId.OrthoMode, ToolbarMenuId.FullScreen],
 *         [ToolbarMenuId.Measure, ToolbarMenuId.Section],
 *         [ToolbarMenuId.BimTree, ToolbarMenuId.Viewpoint, ToolbarMenuId.Annotation, ToolbarMenuId.Property],
 *         [ToolbarMenuId.Setting, "newMenu"],
 *     ];
 *     toolbar.toolbarGroupConfig = toolbarGroupConfig;
 *     toolbar.refresh();
 * ```
 */
class Toolbar {
    private _menuConfig: ToolbarConfig;
    private _bimViewer: BimViewer;
    private _element: HTMLDivElement | undefined;
    private _controllers: { [id: string]: ToolbarMenuBaseController } = {};
    private _groupConfig: ToolbarMenuId[][] | string[][];

    constructor(bimViewer: BimViewer) {
        this._menuConfig = { ...DEFAULT_TOOLBAR_CONFIG };
        this._groupConfig = [...GROUP_CONFIG];
        this._bimViewer = bimViewer;

        this.init();
    }

    get menuConfig() {
        return this._menuConfig;
    }

    set groupConfig(groupConfig: ToolbarMenuId[][] | string[][]) {
        this._groupConfig = groupConfig;
    }

    get element() {
        return this._element;
    }

    get controllers() {
        return this._controllers;
    }

    private init() {
        const toolbarElement = document.createElement("div");
        toolbarElement.classList.add("toolbar");
        const toolbarControllers = {};

        this._groupConfig.forEach((menuGroup, index) => {
            const groupElement = document.createElement("div");
            groupElement.classList.add("toolbar-group");
            const groupDivision = document.createElement("div");
            groupDivision.classList.add("toolbar-group-division");

            menuGroup.forEach((menuId) => {
                const cfg = get(this._menuConfig, menuId);
                if (cfg && cfg.visible !== false) {
                    const toolbarMenu = this.createToolbarMenu(this._bimViewer, menuId, cfg);
                    groupElement.appendChild(toolbarMenu.node);
                    assign(toolbarControllers, toolbarMenu.controller);
                }
            });

            if (groupElement.hasChildNodes()) {
                index && toolbarElement.appendChild(groupDivision);
                toolbarElement.appendChild(groupElement);
            }
        });

        this._element = toolbarElement;
        this._controllers = toolbarControllers;
        this._bimViewer.rootHtmlElement.appendChild(toolbarElement);

        // prevent context menu while clicked on toolbar
        toolbarElement.oncontextmenu = (e: Event) => {
            e.preventDefault();
        };
    }

    private createToolbarMenu(parent: Controller, menuId: string, cfg: ToolbarMenuConfig, isChild = false) {
        const menuButton = document.createElement("div");
        menuButton.id = menuId;
        menuButton.classList.add("toolbar-menu");
        cfg.children && menuButton.classList.add("toolbar-parent-menu");
        const { default: defaultClass = "icon-new", iconFont = ICON_FONT_CLASS } = cfg.icon;
        menuButton.innerHTML = `<div class="icon ${iconFont} ${defaultClass}"></div>`;
        menuButton.title = this._bimViewer.translate(cfg.menuName);
        !isChild && (menuButton.innerHTML += `<span>${menuButton.title}</span>`);

        const controller = {};
        cfg.controller && assign(controller, { [menuId]: new cfg.controller(parent, cfg, menuButton) });

        if (cfg.children) {
            const subMenu = document.createElement("div");
            subMenu.classList.add("toolbar-sub-menu");
            const subMenuList = document.createElement("div");
            subMenuList.classList.add("toolbar-sub-menu-list");
            subMenu.appendChild(subMenuList);
            forIn(cfg.children, (subMenuConfig, subMenuId) => {
                if (subMenuConfig && subMenuConfig.visible !== false) {
                    const subMenuItem = this.createToolbarMenu(get(controller, menuId), subMenuId, subMenuConfig, true);
                    subMenuItem && subMenuList.appendChild(subMenuItem.node);
                    subMenuItem && assign(controller, subMenuItem.controller);
                }
            });

            menuButton.appendChild(subMenu);
        }

        return { node: menuButton, controller };
    }

    /**
     * @description Modify the menu configuration and update the toolbar.
     * @param {ToolbarMenuId} menuId
     * @param {Partial<ToolbarMenuConfig>} config
     * @memberof Toolbar
     */
    updateMenu(menuId: ToolbarMenuId, config: Partial<ToolbarMenuConfig>) {
        assign(this._menuConfig[menuId], config);
        this.refresh();
    }

    /**
     * @description Modify the menu configuration and update the toolbar.
     * @param {{ menuId: ToolbarMenuId; config: Partial<ToolbarMenuConfig> }[]} configs
     * @memberof Toolbar
     */
    updateMenus(configs: { menuId: ToolbarMenuId; config: Partial<ToolbarMenuConfig> }[]) {
        forEach(configs, ({ menuId, config }) => {
            assign(this._menuConfig[menuId], config);
        });
        this.refresh();
    }

    /**
     * @description Add a custmized menu to toolbar.
     * @param {string} menuId
     * @param {ToolbarMenuConfig} config
     * @param {[number, number]} [insertPosition]
     * @return {*}
     * @memberof Toolbar
     */
    addMenu(menuId: string, config: ToolbarMenuConfig, insertPosition?: [number, number]) {
        if (keys(this._menuConfig).includes(menuId)) {
            console.error("[Toolbar]", menuId, "exists.");
            return;
        }
        assign(this._menuConfig, { [menuId]: config });
        if (insertPosition) {
            const [groupIndex, ItemIndex] = insertPosition;
            if (groupIndex > this._groupConfig.length - 1) {
                this._groupConfig = concat(this._groupConfig, [[menuId]]);
            } else {
                const group = this._groupConfig[groupIndex];
                this._groupConfig[groupIndex] =
                    ItemIndex > group.length - 1
                        ? concat(group, menuId)
                        : concat(take(group, ItemIndex), menuId, takeRight(group, group.length - ItemIndex));
            }
        } else {
            this._groupConfig = concat(this._groupConfig, [[menuId]]);
        }
        this.refresh();
    }

    /**
     * @description Update the whole toolbar element with the current configuration.
     * @memberof Toolbar
     */
    refresh() {
        this._element && this._element.remove();
        this._element = undefined;
        this.init();
    }

    destroy() {
        forEach(this._controllers, (controller) => {
            controller.destroy();
        });
        this._element && this._element.remove();
    }
}

export { Toolbar };
