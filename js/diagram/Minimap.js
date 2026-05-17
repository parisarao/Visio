/**
 * Minimap — Small overview widget in bottom-right corner
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;

    class Minimap {
        constructor() {
            this._svg = null;
            this._viewport = null;
            this._scale = 0.12;
        }

        init() {
            this._svg = document.getElementById('minimap-svg');
            this._viewport = document.getElementById('minimap-viewport');
            bus().on('minimap:update', () => this.update());
        }

        update() {
            if (!this._svg) return;
            const nodes = state().getNodes();
            const renderer = window.PMB.DiagramRenderer;
            if (!renderer) return;

            // Clear minimap
            while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);

            if (nodes.length === 0) return;

            // Find bounds
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(n => {
                minX = Math.min(minX, n.x || 0);
                minY = Math.min(minY, n.y || 0);
                maxX = Math.max(maxX, (n.x || 0) + (n.width || 140));
                maxY = Math.max(maxY, (n.y || 0) + (n.height || 60));
            });

            const w = maxX - minX + 40 || 400;
            const h = maxY - minY + 40 || 300;
            const mmW = 180, mmH = 120;
            const scaleX = mmW / w, scaleY = mmH / h;
            const scale = Math.min(scaleX, scaleY) * 0.85;

            const NS = 'http://www.w3.org/2000/svg';
            // Draw nodes as small rects
            nodes.forEach(n => {
                const rect = document.createElementNS(NS, 'rect');
                rect.setAttribute('x', ((n.x || 0) - minX + 20) * scale);
                rect.setAttribute('y', ((n.y || 0) - minY + 20) * scale);
                rect.setAttribute('width', Math.max(4, (n.width || 140) * scale));
                rect.setAttribute('height', Math.max(3, (n.height || 60) * scale));
                rect.setAttribute('fill', n.backgroundColor || '#6366f1');
                rect.setAttribute('rx', '1');
                this._svg.appendChild(rect);
            });

            // Viewport indicator
            const vb = renderer.getViewBox();
            const vpLeft = (vb.x - minX + 20) * scale;
            const vpTop = (vb.y - minY + 20) * scale;
            const vpW = vb.w * scale;
            const vpH = vb.h * scale;
            this._viewport.style.left = Math.max(0, vpLeft) + 'px';
            this._viewport.style.top = Math.max(0, vpTop) + 'px';
            this._viewport.style.width = Math.min(mmW, Math.max(20, vpW)) + 'px';
            this._viewport.style.height = Math.min(mmH, Math.max(15, vpH)) + 'px';
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.Minimap = new Minimap();
})();
