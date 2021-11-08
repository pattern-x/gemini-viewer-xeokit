import { Map } from "./Map";

/**
 * Controller class
 * Reference to: https://github.com/xeokit/xeokit-bim-viewer/blob/master/src/Controller.js
 */
export class Controller {
    bimViewer: any; // eslint-disable-line
    server: any; // eslint-disable-line
    viewer: any; // eslint-disable-line
    destroyed = false;
    parent?: Controller;
    children: Controller[] = [];
    protected _subIdMap: Map | undefined;
    protected _subIdEvents: any; // eslint-disable-line
    protected _eventSubs: any; // eslint-disable-line
    protected _events: any; // eslint-disable-line
    protected _eventCallDepth = 0;
    protected _enabled: boolean;
    protected _active: boolean;

    /**
     * @protected
     */
    constructor(parent?: Controller, cfg?: any, server?: any, viewer?: any) { // eslint-disable-line
        this.bimViewer = parent ? parent.bimViewer || parent : this;
        this.server = parent ? parent.server : server;
        this.viewer = parent ? parent.viewer : viewer;

        if (parent) {
            parent.children.push(this);
        }
        this.parent = parent;

        this._subIdMap = undefined; // Subscription subId pool
        this._subIdEvents = undefined; // Subscription subIds mapped to event names
        this._eventSubs = undefined; // Event names mapped to subscribers
        this._events = undefined; // Maps names to events
        this._eventCallDepth = 0; // Helps us catch stack overflows from recursive events

        this._enabled = true; // Used by #setEnabled() and #getEnabled()
        this._active = false; // Used by #setActive() and #getActive()
    }

    /**
     * Fires an event on this Controller.
     *
     * @protected
     *
     * @param {String} event The event type name
     * @param {Object} value The event parameters
     * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers
     */
    fire(event: string, value: any, forget = false) { // eslint-disable-line
        if (!this._events) {
            this._events = {};
        }
        if (!this._eventSubs) {
            this._eventSubs = {};
        }
        if (forget !== true) {
            this._events[event] = value || true; // Save notification
        }
        const subs = this._eventSubs[event];
        let sub;
        if (subs) {
            // Notify subscriptions
            for (const subId in subs) {
                if (Object.prototype.hasOwnProperty.call(subs, subId)) {
                    sub = subs[subId];
                    this._eventCallDepth++;
                    if (this._eventCallDepth < 300) {
                        sub.callback.call(sub.scope, value);
                    } else {
                        this.error("fire: potential stack overflow from recursive event '" + event + "' - dropping this event");
                    }
                    this._eventCallDepth--;
                }
            }
        }
    }

    /**
     * Subscribes to an event on this Controller.
     *
     * The callback is be called with this component as scope.
     *
     * @param {String} event The event
     * @param {Function} callback Called fired on the event
     * @param {Object} [scope=this] Scope for the callback
     * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link #off}.
     */
    on(event: string, callback: any, scope = this) { // eslint-disable-line
        if (!this._events) {
            this._events = {};
        }
        if (!this._subIdMap) {
            this._subIdMap = new Map(); // Subscription subId pool
        }
        if (!this._subIdEvents) {
            this._subIdEvents = {};
        }
        if (!this._eventSubs) {
            this._eventSubs = {};
        }
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = {};
            this._eventSubs[event] = subs;
        }
        const subId = this._subIdMap.addItem(); // Create unique subId
        subs[subId] = {
            callback: callback,
            scope: scope || this,
        };
        this._subIdEvents[subId] = event;
        const value = this._events[event];
        if (value !== undefined) {
            // A publication exists, notify callback immediately
            callback.call(scope || this, value);
        }
        return subId;
    }

    /**
     * Cancels an event subscription that was previously made with {@link Controller#on} or {@link Controller#once}.
     *
     * @param {String} subId Subscription ID
     */
    off(subId?: string | number) {
        if (subId === undefined || subId === null) {
            return;
        }
        if (!this._subIdEvents) {
            return;
        }
        const event = this._subIdEvents[subId];
        if (event) {
            delete this._subIdEvents[subId];
            const subs = this._eventSubs[event];
            if (subs) {
                delete subs[subId];
            }
            if (this._subIdMap) {
                this._subIdMap.removeItem(subId); // Release subId
            }
        }
    }

    /**
     * Subscribes to the next occurrence of the given event, then un-subscribes as soon as the event is handled.
     *
     * This is equivalent to calling {@link Controller#on}, and then calling {@link Controller#off} inside the callback function.
     *
     * @param {String} event Data event to listen to
     * @param {Function} callback Called when fresh data is available at the event
     * @param {Object} [scope=this] Scope for the callback
     */
    once(event: string, callback: any, scope = this) { // eslint-disable-line
        const self = this; // eslint-disable-line
        const subId = this.on(
            event,
            (value: any) => { // eslint-disable-line
                self.off(subId);
                callback.call(scope, value);
            },
            scope
        );
    }

    /**
     * Logs a console debugging message for this Controller.
     *
     * The console message will have this format: *````[LOG] [<component type> <component id>: <message>````*
     *
     * @protected
     *
     * @param {String} message The message to log
     */
    log(message: string) {
        message = "[LOG] " + message;
        window.console.log(message);
    }

    /**
     * Logs a warning for this Controller to the JavaScript console.
     *
     * The console message will have this format: *````[WARN] [<component type> =<component id>: <message>````*
     *
     * @protected
     *
     * @param {String} message The message to log
     */
    warn(message: string) {
        message = "[WARN] " + message;
        window.console.warn(message);
    }

    /**
     * Logs an error for this Controller to the JavaScript console.
     *
     * The console message will have this format: *````[ERROR] [<component type> =<component id>: <message>````*
     *
     * @protected
     *
     * @param {String} message The message to log
     */
    error(message: string) {
        message = "[ERROR] " + message;
        window.console.error(message);
    }

    mutexActivation(controllers: Controller[]) {
        const numControllers = controllers.length;
        for (let i = 0; i < numControllers; i++) {
            const controller = controllers[i];
            controller.on(
                "active",
                (() => {
                    const _i = i;
                    return (active: boolean) => {
                        if (!active) {
                            return;
                        }
                        for (let j = 0; j < numControllers; j++) {
                            if (j === _i) {
                                continue;
                            }
                            controllers[j].setActive(false);
                        }
                    };
                })()
            );
        }
    }

    /**
     * Enables or disables this Controller.
     *
     * Fires an "enabled" event on update.
     *
     * @protected
     * @param {boolean} enabled Whether or not to enable.
     */
    setEnabled(enabled: boolean) {
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        this.fire("enabled", this._enabled);
    }

    /**
     * Gets whether or not this Controller is enabled.
     *
     * @protected
     *
     * @returns {boolean}
     */
    getEnabled() {
        return this._enabled;
    }

    /**
     * Activates or deactivates this Controller.
     *
     * Fires an "active" event on update.
     *
     * @protected
     *
     * @param {boolean} active Whether or not to activate.
     */
    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        this._active = active;
        this.fire("active", this._active);
    }

    /**
     * Gets whether or not this Controller is active.
     *
     * @protected
     *
     * @returns {boolean}
     */
    getActive() {
        return this._active;
    }

    /**
     * Destroys this Controller.
     *
     * @protected
     *
     */
    destroy() {
        if (this.destroyed) {
            return;
        }
        /**
         * Fired when this Controller is destroyed.
         * @event destroyed
         */
        this.fire("destroyed", (this.destroyed = true));
        this._subIdMap = undefined;
        this._subIdEvents = undefined;
        this._eventSubs = undefined;
        this._events = undefined;
        this._eventCallDepth = 0;
        for (let i = 0, len = this.children.length; i < len; i++) {
            // this._children.destroy(); // this should be a bug in xeokit-bim-viewer, should destroy a child instead
            this.children[i].destroy();
        }
        this.children = [];
    }
}
