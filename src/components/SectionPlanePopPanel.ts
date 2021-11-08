import { ICON_FONT_CLASS } from "../utils/Consts";
import { PopPanel } from "./PopPanel";

export interface SectionPlanePopPanelItemConfig {
    itemName: string;
    hoverTitle?: string;
    hoverActiveTitle?: string;
    iconClass?: string;
    iconActiveClass?: string;
    content?: string;
    canDisable?: boolean;
    isActive?: boolean;
    isClickable?: boolean;
    isResetAll?: boolean;
    onClick?: () => void;
    onActive?: () => boolean | undefined;
    onDeactive?: () => boolean | undefined;
}

export interface SectionPlanePopPanelConfig {
    groupSelectItems?: SectionPlanePopPanelItemConfig[];
    activeSelectItems?: SectionPlanePopPanelItemConfig[];
}

const changeIcon = (parentNode: HTMLElement, iconClass: string) => {
    const iconNode = document.createElement("i");
    iconNode.classList.add(ICON_FONT_CLASS);
    iconNode.classList.add(iconClass);
    parentNode.innerHTML = "";
    parentNode.appendChild(iconNode);
};

const initActiveSelectNode = (itemNode: HTMLElement, itemConfig: SectionPlanePopPanelItemConfig) => {
    itemNode.classList.add("pop-panel-item");
    if (itemConfig.hoverTitle) {
        itemNode.setAttribute("title", itemConfig.hoverTitle);
    }
    itemNode.setAttribute("itemName", itemConfig.itemName);
    itemNode.setAttribute("isActive", "false");
    if (itemConfig.content) {
        itemNode.append(itemConfig.content);
    } else {
        changeIcon(itemNode, itemConfig.iconClass as string);
    }
};

export class SectionPlanePopPanel extends PopPanel {
    private _activeItem = "";
    private _activeSelectNode?: HTMLElement;
    private _activeSelectConfig: SectionPlanePopPanelItemConfig[] = [];
    private _groupSelectNode?: HTMLElement;
    private _groupSelectConfig: SectionPlanePopPanelItemConfig[] = [];
    private _isDisable = false;

    constructor(id: string, content: string | HTMLElement, config: SectionPlanePopPanelConfig) {
        super(id, content);

        if (config.groupSelectItems && config.groupSelectItems.length) {
            this.creatGroupSelectLayout();
            this.addGroupSelectItems(config.groupSelectItems);
            this._groupSelectConfig = config.groupSelectItems;
            this._groupSelectNode?.addEventListener("click", this.onGroupSelectClick);
        }

        if (config.activeSelectItems && config.activeSelectItems.length) {
            this.createActiveSelectLayout();
            this.addActiveSelectItems(config.activeSelectItems);
            this._activeSelectConfig = config.activeSelectItems;
            this._activeSelectNode?.addEventListener("click", this.onActiveSelectClick);
        }
    }

    creatGroupSelectLayout() {
        const wrapper = document.createElement("div");
        wrapper.classList.add("pop-panel-group-select");
        this._body.appendChild(wrapper);
        this._groupSelectNode = wrapper;
    }

    onGroupSelectClick = (event: any) => { // eslint-disable-line
        // composedPath for firefox, path for chrome and opera
        const allElements = event.path || (event.composedPath && event.composedPath());
        const target = Array.from(allElements as HTMLElement[]).find(
            (el) => el.classList && el.classList.contains("pop-panel-item")
        );

        if (!target) {
            return;
        }
        const itemName = target.getAttribute("itemName");
        const itemIndex = parseInt(target.getAttribute("itemIndex") as string, 10);

        if (this._activeItem === itemName) {
            return;
        }

        // remove active
        const activeItemNode = this._groupSelectNode?.querySelector(".pop-panel-item.active");
        if (activeItemNode) {
            const activeItemName = activeItemNode.getAttribute("itemName");
            const activeItemConfig = this._groupSelectConfig?.find((itemConfig) => itemConfig.itemName === activeItemName);

            activeItemNode.classList.remove("active");
            if (activeItemConfig && !activeItemConfig.content) {
                changeIcon(activeItemNode as HTMLElement, activeItemConfig.iconClass as string);
                if (activeItemConfig.hoverTitle) {
                    activeItemNode.setAttribute("title", activeItemConfig.hoverTitle);
                }
            }
        }

        // set current item active
        target.classList.add("active");

        if (!this._groupSelectConfig || this._groupSelectConfig.length === 0) {
            return;
        }

        const currentItemConfig = this._groupSelectConfig[itemIndex];
        this._activeItem = currentItemConfig.itemName;

        if (!currentItemConfig.content) {
            changeIcon(target, currentItemConfig.iconActiveClass as string);
            if (currentItemConfig.hoverActiveTitle) {
                target.setAttribute("title", currentItemConfig.hoverActiveTitle);
            }
        }
        currentItemConfig.onActive && currentItemConfig.onActive();
    };

    addGroupSelectItems(groupConfig: SectionPlanePopPanelItemConfig[]) {
        groupConfig.forEach((item: SectionPlanePopPanelItemConfig, idx: number) => {
            const itemNode = document.createElement("div");
            itemNode.classList.add("pop-panel-item");
            if (item.hoverTitle) {
                itemNode.setAttribute("title", item.hoverTitle);
            }
            itemNode.setAttribute("itemName", item.itemName);
            itemNode.setAttribute("itemIndex", `${idx}`);
            if (item.content) {
                itemNode.append(item.content);
            } else {
                changeIcon(itemNode, item.iconClass as string);
            }
            if (item.isActive) {
                this._activeItem === item.itemName;
                itemNode.classList.add("active");
            }
            this._groupSelectNode?.appendChild(itemNode);
        });
    }

    createActiveSelectLayout() {
        const wrapper = document.createElement("div");
        wrapper.classList.add("pop-panel-active-select");
        this._body.appendChild(wrapper);
        this._activeSelectNode = wrapper;
    }

    onActiveSelectClick = (event: any) => { // eslint-disable-line
        // composedPath for firefox, path for chrome and opera
        const allElements = event.path || (event.composedPath && event.composedPath());
        const target = Array.from(allElements as HTMLElement[]).find(
            (el) => el.classList && el.classList.contains("pop-panel-item")
        );

        if (!target) {
            return;
        }
        const itemIndex = parseInt(target.getAttribute("itemIndex") as string, 10);
        const itemConfig = this._activeSelectConfig[itemIndex];

        if (!itemConfig) {
            return;
        }

        if (itemConfig.canDisable && this._isDisable) {
            return;
        }

        if (itemConfig.isClickable && itemConfig.onClick) {
            if (itemConfig.isResetAll && this._activeSelectNode) {
                Array.from(this._activeSelectNode.children).forEach((node: Element, idx: number) => {
                    initActiveSelectNode(node as HTMLElement, this._activeSelectConfig[idx]);
                });
            }
            itemConfig.onClick();
            return;
        }
        const isActive = target.getAttribute("isActive");
        if (isActive === "true") {
            const nextStep = itemConfig.onDeactive && itemConfig.onDeactive();
            if (nextStep) {
                changeIcon(target, itemConfig.iconClass as string);
                target.setAttribute("isActive", "false");
                if (itemConfig.hoverTitle) {
                    target.setAttribute("title", itemConfig.hoverTitle);
                }
            }
        } else {
            const nextStep = itemConfig.onActive && itemConfig.onActive();
            if (nextStep) {
                changeIcon(target, itemConfig.iconActiveClass as string);
                target.setAttribute("isActive", "true");
                if (itemConfig.hoverActiveTitle) {
                    target.setAttribute("title", itemConfig.hoverActiveTitle);
                }
            }
        }
    };

    addActiveSelectItems(activeConfig: SectionPlanePopPanelItemConfig[]) {
        activeConfig.forEach((item: SectionPlanePopPanelItemConfig, idx: number) => {
            const itemNode = document.createElement("div");
            initActiveSelectNode(itemNode, item);
            itemNode.setAttribute("itemIndex", `${idx}`);
            this._activeSelectNode?.appendChild(itemNode);
        });
    }

    setActiveSelectItem(index: number, active: boolean) {
        const itemConfig = this._activeSelectConfig[index];
        const itemNode = this._activeSelectNode && this._activeSelectNode.children[index];

        if (!itemConfig || !itemNode) {
            return;
        }

        if (!active) {
            changeIcon(itemNode as HTMLElement, itemConfig.iconClass as string);
            itemNode.setAttribute("isActive", "false");
        } else {
            changeIcon(itemNode as HTMLElement, itemConfig.iconActiveClass as string);
            itemNode.setAttribute("isActive", "true");
        }
    }

    enableActiveSelectItems() {
        this._isDisable = false;
        this._activeSelectConfig.forEach((item: SectionPlanePopPanelItemConfig, idx: number) => {
            if (!item.canDisable) {
                return;
            }
            const node = this._activeSelectNode && this._activeSelectNode.children[idx];
            if (!node) {
                return;
            }
            node.classList.remove("disable");
        });
    }

    disableActiveSelectItems() {
        this._isDisable = true;
        this._activeSelectConfig.forEach((item: SectionPlanePopPanelItemConfig, idx: number) => {
            if (!item.canDisable) {
                return;
            }
            const node = this._activeSelectNode && this._activeSelectNode.children[idx];
            if (!node) {
                return;
            }
            node.classList.add("disable");
        });
    }

    destroy() {
        if (this._groupSelectNode) {
            this._groupSelectNode.removeEventListener("click", this.onGroupSelectClick);
        }
        if (this._activeSelectNode) {
            this._activeSelectNode.removeEventListener("click", this.onActiveSelectClick);
        }
        super.destroy();
    }
}
