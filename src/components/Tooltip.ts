import { MOUSEMOVE_EVENT } from "../utils/Consts";

interface TooltipConfig {
    showOnCreate?: boolean;
    followPointer?: boolean;
    parentNode?: HTMLElement;
    target?: HTMLElement;
}
export class Tooltip {
    private _node: HTMLElement;
    private _parentNode: HTMLElement;
    private _target: HTMLElement | undefined;

    constructor(id: string, content: string | HTMLElement, cfg?: TooltipConfig) {
        this._node = document.createElement("div");
        this._node.id = id;
        this._node.append(content);

        this._target = cfg?.target;

        this._parentNode = cfg?.parentNode || document.body;

        if (cfg?.followPointer) {
            this._node.classList.add("follow-tooltip");
            document.addEventListener(MOUSEMOVE_EVENT, this.follow);
        }
        this._parentNode.appendChild(this._node);
        !cfg?.showOnCreate && this._node.setAttribute("hidden", "");
    }

    follow = (event: MouseEvent) => {
        if (this._target) {
            event.target === this._target ? this.show() : this.hide();
        }
        this._node.style.left = event.clientX + 15 + "px";
        this._node.style.top = event.clientY - 30 + "px";
    };

    show = () => this._node.hasAttribute("hidden") && this._node.removeAttribute("hidden");

    hide = () => !this._node.hasAttribute("hidden") && this._node.setAttribute("hidden", "");

    destroy = () => {
        document.removeEventListener(MOUSEMOVE_EVENT, this.follow);
        this._parentNode.removeChild(this._node);
    };
}
