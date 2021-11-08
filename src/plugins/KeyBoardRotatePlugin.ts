import { Plugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

type CallbackType<T> = (event: T) => void;
type KeyboardCallbackType = CallbackType<KeyboardEvent>;

/**
 * Customize the keyboard rotation.
 * The default mode is orbit. Customize to the first people
 */
export class KeyBoardRotatePlugin extends Plugin {
    private _documentKeyDownHandler: KeyboardCallbackType;
    private _documentKeyUpHandler: KeyboardCallbackType;
    private _cameraControl: any; // eslint-disable-line
    private _originNavMode: any; // eslint-disable-line

    constructor(viewer: any, cfg?: any) { // eslint-disable-line
        super("KeyBoardRotate", viewer, cfg);

        const cameraControl: any = viewer.cameraControl; // eslint-disable-line
        this._cameraControl = cameraControl;

        const scene: any = viewer.scene; // eslint-disable-line
        const configs = cameraControl._configs;
        const states = cameraControl._states;
        document.addEventListener(
            "keydown",
            (this._documentKeyDownHandler = (e: KeyboardEvent) => {
                const navMode = this._cameraControl.navMode;
                if (navMode !== "orbit") {
                    return;
                }

                if (!(configs.active && configs.pointerEnabled) || !scene.input.keyboardEnabled) {
                    return;
                }
                if (!states.mouseover) {
                    return;
                }
                const keyCode = e.keyCode;
                const isRotateKey = this._isKeyForRotate(keyCode);
                if (isRotateKey) {
                    this._cameraControl.navMode = "firstPerson";
                    this._originNavMode = "orbit";
                }
            })
        );

        document.addEventListener(
            "keyup",
            (this._documentKeyUpHandler = (e: KeyboardEvent) => {
                if (this._originNavMode !== "orbit") {
                    return;
                }

                if (!(configs.active && configs.pointerEnabled) || !scene.input.keyboardEnabled) {
                    return;
                }
                if (!states.mouseover) {
                    return;
                }
                const keyCode = e.keyCode;

                const isRotateKey = this._isKeyForRotate(keyCode);
                if (isRotateKey) {
                    this._cameraControl.navMode = this._originNavMode;
                    this._originNavMode = "";
                }
            })
        );
    }

    destroy() {
        document.removeEventListener("keydown", this._documentKeyDownHandler);
        document.removeEventListener("keyup", this._documentKeyUpHandler);

        super.destroy();
    }

    private _isKeyForRotate(keyCode: any): boolean {// eslint-disable-line
        const rotateYPos: boolean = this._isKeyForAction(this._cameraControl.ROTATE_Y_POS, keyCode);
        if (rotateYPos) {
            return true;
        }
        const rotateYNeg = this._isKeyForAction(this._cameraControl.ROTATE_Y_NEG, keyCode);
        if (rotateYNeg) {
            return true;
        }
        const rotateXPos = this._isKeyForAction(this._cameraControl.ROTATE_X_POS, keyCode);
        if (rotateXPos) {
            return true;
        }
        const rotateXNeg = this._isKeyForAction(this._cameraControl.ROTATE_X_NEG, keyCode);

        return rotateXNeg;
    }

    private _isKeyForAction(action: any, keyCode: any): boolean { // eslint-disable-line
        const keys = this._cameraControl.keyMap[action];
        if (!keys) {
            return false;
        }
        if (!keyCode) {
            return false;
        }
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            if (key == keyCode) {
                return true;
            }
        }
        return false;
    }
}
