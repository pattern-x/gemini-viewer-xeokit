import { Controller } from "../../core/Controller";
import { forEach } from "lodash";
import { ICON_FONT_CLASS } from "../../utils/Consts";
import { IconClass, ToolbarMenuConfig } from "./ToolbarConfig";

/**
 * @description
 * @export
 * @class ToolbarMenuBaseController
 * @extends {Controller}
 */
export class ToolbarMenuBaseController extends Controller {
    protected _element: HTMLElement;
    private _cfg: ToolbarMenuConfig;

    constructor(parent: Controller, cfg: ToolbarMenuConfig, node: HTMLElement) {
        super(parent, cfg);

        this._element = node;
        this._cfg = cfg;
        if (!this._element) {
            throw `Failed to get toolbar menu button: ${node}`;
        }

        this.on("active", (active: boolean) => this.onActive(active));
        this.on("click", (event: Event) => this.onClick(event));
        this._element.addEventListener("click", (event: Event) => this.onClick(event));
    }

    /**
     * Default onActive behavior
     */
    protected onActive(active: boolean) {
        const changeIconStyle = (classList: DOMTokenList, iconClass: IconClass, active: boolean) => {
            const { default: defaultClass, active: activeClass } = iconClass;
            if (active) {
                if (classList.contains(defaultClass)) {
                    classList.remove(defaultClass);
                }
                classList.add(activeClass || defaultClass);
            } else {
                if (activeClass && classList.contains(activeClass)) {
                    classList.remove(activeClass);
                }
                classList.add(defaultClass);
            }
        };

        const icon = this._element.getElementsByClassName(ICON_FONT_CLASS)[0];
        changeIconStyle(icon.classList, this._cfg.icon, active);
        if (active) {
            this._element.classList.add("active");
            forEach(this._cfg.mutexIds, (toolbarMenuId) => {
                this.bimViewer.toolbar.controllers[toolbarMenuId]?.setActive(false);
            });

            if (this._cfg.onActive) {
                this._cfg.onActive();
            }
        } else {
            this._element.classList.remove("active");

            if (this._cfg.onDeactive) {
                this._cfg.onDeactive();
            }
        }
    }

    /**
     * Default onClick behavior
     */
    protected onClick(event: Event) {
        if (this.getEnabled()) {
            this._active = !this._active;
            this.fire("active", this._active);
        }
        event && event.preventDefault();
    }
}
