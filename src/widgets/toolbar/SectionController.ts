import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * SectionController
 * This is a parent controller, which doesn't have any action except that it need to reflect children's active status.
 */
export class SectionController extends ToolbarMenuBaseController {
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
