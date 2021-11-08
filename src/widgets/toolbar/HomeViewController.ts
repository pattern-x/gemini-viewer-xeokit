import { ToolbarMenuBaseController } from "./ToolbarMenuBaseController";

/**
 * HomeViewController
 * Reference to: https://github.com/xeokit/xeokit-bim-viewer/blob/master/src/toolbar/ResetAction.js
 */
export class HomeViewController extends ToolbarMenuBaseController {
    /**
     * HomeViewController doesn't need 'active' state, we use it to improve user experience.
     */
    protected onActive(active: boolean) {
        super.onActive(active);
        if (active) {
            const self = this; // eslint-disable-line
            setTimeout(() => self.setActive(false), 300); // de-active it after 0.3s
        }
    }

    protected onClick(event: Event) {
        super.onClick(event);
        this.bimViewer.goToHomeView();
    }
}
