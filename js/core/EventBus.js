/**
 * EventBus — Pub/Sub event system for decoupled communication
 */
(function () {
    'use strict';

    class EventBus {
        constructor() {
            this._listeners = {};
        }

        on(event, callback, context) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push({ fn: callback, ctx: context || null });
            return this;
        }

        off(event, callback) {
            if (!this._listeners[event]) return this;
            if (!callback) { delete this._listeners[event]; return this; }
            this._listeners[event] = this._listeners[event].filter(l => l.fn !== callback);
            return this;
        }

        emit(event, ...args) {
            if (!this._listeners[event]) return this;
            const listeners = this._listeners[event].slice();
            for (const l of listeners) {
                try { l.fn.apply(l.ctx, args); }
                catch (e) { console.error(`[EventBus] Error in "${event}" handler:`, e); }
            }
            return this;
        }

        once(event, callback, context) {
            const wrapper = (...args) => {
                this.off(event, wrapper);
                callback.apply(context || null, args);
            };
            return this.on(event, wrapper, context);
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.EventBus = new EventBus();
})();
