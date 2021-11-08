import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * SectionBoxController
 */
export class SectionBoxController extends ToolbarMenuBaseController {
    /**
     * onActive can be triggered by 'click' event, also can be triggered by other events, e.g. anohter conflicted button is clicked.
     */
    protected onActive(active: boolean) {
        super.onActive(active);
        this.bimViewer.suppressSingleSelection(active);
        this.bimViewer.activeSectionBox(active);
        if (this.parent) {
            this.parent.setActive(active); // also update parent's status
        }
    }
}
