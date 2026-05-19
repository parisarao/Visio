/**
 * DragDropManager — Drag nodes on canvas + drop from palette
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;
    const renderer = () => window.PMB.DiagramRenderer;

    const DragDropManager = {
        _dragging: false,
        _dragNode: null,
        _dragOffset: { x: 0, y: 0 },
        _dragStartClient: { x: 0, y: 0 },
        _dragMoved: false,

        startDrag(nodeId, e) {
            const node = state().getNodes().find(n => n.stepId === nodeId);
            if (!node) return;

            this._dragging = true;
            this._dragNode = nodeId;
            this._dragStartClient = { x: e.clientX, y: e.clientY };
            this._dragMoved = false;
            const pt = renderer()._svgPoint(e);
            this._dragOffset = { x: pt.x - (node.x || 0), y: pt.y - (node.y || 0) };
            renderer().selectNode(nodeId, e);
        },

        init() {
            const svg = document.getElementById('diagram-svg');

            window.addEventListener('mousemove', (e) => {
                if (!this._dragging || !this._dragNode) return;
                if (e.buttons === 0) {
                    this._dragging = false;
                    this._dragNode = null;
                    this._dragMoved = false;
                    return;
                }
                const clientDx = Math.abs(e.clientX - this._dragStartClient.x);
                const clientDy = Math.abs(e.clientY - this._dragStartClient.y);
                if (!this._dragMoved && clientDx < 3 && clientDy < 3) return;
                this._dragMoved = true;

                const pt = renderer()._svgPoint(e);
                const newX = pt.x - this._dragOffset.x;
                const newY = pt.y - this._dragOffset.y;

                // Update node coordinate state in memory for real-time connection routing
                const node = state().getNodes().find(n => n.stepId === this._dragNode);
                if (node) {
                    node.x = newX;
                    node.y = newY;
                }

                // Direct DOM update for smooth dragging
                const group = document.querySelector(`[data-id="${this._dragNode}"]`);
                if (group) {
                    group.setAttribute('transform', `translate(${newX},${newY})`);
                }

                // Trigger real-time, high-performance edge route updates
                renderer().renderEdgesOnly();
            });

            window.addEventListener('mouseup', (e) => {
                if (!this._dragging || !this._dragNode) return;
                if (!this._dragMoved) {
                    this._dragging = false;
                    this._dragNode = null;
                    return;
                }

                const pt = renderer()._svgPoint(e);
                let x = pt.x - this._dragOffset.x;
                let y = pt.y - this._dragOffset.y;
                state().updateNode(this._dragNode, { x, y });
                this._dragging = false;
                this._dragNode = null;
                this._dragMoved = false;
            });

            // Drop from palette
            const canvas = document.getElementById('canvas-container');
            canvas.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const shapeType = e.dataTransfer.getData('text/plain');
                if (!shapeType) return;
                const svgRect = svg.getBoundingClientRect();
                const vb = renderer().getViewBox();
                const scaleX = vb.w / svgRect.width;
                const scaleY = vb.h / svgRect.height;
                const x = (e.clientX - svgRect.left) * scaleX + vb.x;
                const y = (e.clientY - svgRect.top) * scaleY + vb.y;
                const settings = state().getSettings();
                const grid = settings.gridSize || 20;
                const snappedX = settings.gridSnap ? Math.round(x / grid) * grid : x;
                const snappedY = settings.gridSnap ? Math.round(y / grid) * grid : y;
                const node = model().createNode({ shapeType, x: snappedX, y: snappedY, stepName: shapeType.charAt(0).toUpperCase() + shapeType.slice(1) });
                state().addNode(node);
            });
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.DragDropManager = DragDropManager;
})();
