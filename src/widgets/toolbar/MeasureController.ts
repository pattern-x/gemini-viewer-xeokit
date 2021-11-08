import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * MeasureController
 */
export class MeasureController extends ToolbarMenuBaseController {
    protected onClick(/* event: Event */) {
        // do nothing
    }

    /**
     * A parent's 'active' status is decided by it's children rather than itself. So, we won't set this._active directly here.
     */
    setActive() {
        const active = this.anyChildrenActive();
        super.setActive(active);
    }

    /**
     * Checks if any child is active
     */
    protected anyChildrenActive(): boolean {
        for (let i = 0; i < this.children.length; ++i) {
            if (this.children[i].getActive()) {
                return true;
            }
        }
        return false;
    }
}
