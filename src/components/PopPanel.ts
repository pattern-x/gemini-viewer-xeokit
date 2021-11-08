import { MOUSEMOVE_EVENT, MOUSEUP_EVENT, MOUSEDOWN_EVENT } from "../utils/Consts";

export class PopPanel {
    private _node: HTMLElement;
    public _header: HTMLElement;
    public _body: HTMLElement;
    private _isFollowing = false;
    private _diffX = 0;
    private _diffY = 0;

    constructor(id: string, content: string | HTMLElement) {
        this._node = document.createElement("div");
        this._node.id = id;
        this._node.classList.add("pop-panel");

        const header = document.createElement("div");
        header.classList.add("pop-panel-header");
        header.append(content);
        this._node.appendChild(header);
        this._header = header;

        const info = document.createElement("div");
        info.classList.add("pop-panel-body");
        this._node.appendChild(info);
        this._body = info;

        header.addEventListener(MOUSEDOWN_EVENT, this.start);
        header.addEventListener(MOUSEUP_EVENT, this.stop);
        document.addEventListener(MOUSEMOVE_EVENT, this.follow);
        document.body.appendChild(this._node);
    }

    start = (event: MouseEvent) => {
        this._isFollowing = true;
        this._diffX = event.clientX - this._node.offsetLeft;
        this._diffY = event.clientY - this._node.offsetTop;
    };

    stop = () => {
        this._isFollowing = false;
    };

    follow = (event: MouseEvent) => {
        if (!this._isFollowing) {
            return;
        }
        this._node.style.left = event.clientX - this._diffX + "px";
        this._node.style.top = event.clientY - this._diffY + "px";
    };

    destroy() {
        document.removeEventListener(MOUSEMOVE_EVENT, this.follow);
        this._node.removeEventListener(MOUSEDOWN_EVENT, this.start);
        this._node.removeEventListener(MOUSEUP_EVENT, this.stop);
        document.body.removeChild(this._node);
    }
}
