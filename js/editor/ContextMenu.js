/**
 * ContextMenu — Right-click context menus on nodes and canvas
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;
    const renderer = () => window.PMB.DiagramRenderer;

    const ContextMenu = {
        _menu: null,

        init() {
            this._menu = document.getElementById('context-menu');
            const svg = document.getElementById('diagram-svg');

            svg.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const nodeGroup = e.target.closest('.node-group');
                const connectorGroup = e.target.closest('.connector-group');
                if (nodeGroup) {
                    this._showNodeMenu(e, nodeGroup.getAttribute('data-id'));
                } else if (connectorGroup) {
                    this._showConnectorMenu(e, connectorGroup.getAttribute('data-edge-id'));
                } else {
                    this._showCanvasMenu(e);
                }
            });

            document.addEventListener('click', () => this._hide());
            document.addEventListener('contextmenu', (e) => {
                if (!e.target.closest('#diagram-svg')) this._hide();
            });
        },

        _showNodeMenu(e, nodeId) {
            renderer().selectNode(nodeId);
            this._menu.innerHTML = `
                <button class="context-menu-item" data-action="edit">Edit Name<span class="context-menu-shortcut">Dbl-Click</span></button>
                <button class="context-menu-item" data-action="duplicate">Duplicate<span class="context-menu-shortcut">Ctrl+D</span></button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item danger" data-action="delete">Delete<span class="context-menu-shortcut">Del</span></button>
            `;
            this._menu.querySelector('[data-action="edit"]').addEventListener('click', () => {
                const node = state().getNodes().find(n => n.stepId === nodeId);
                if (node) {
                    const name = prompt('Step name:', node.stepName);
                    if (name !== null) state().updateNode(nodeId, { stepName: name });
                }
            });
            this._menu.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
                const node = state().getNodes().find(n => n.stepId === nodeId);
                if (node) {
                    const dup = model().createNode({ ...node, x: (node.x || 0) + 30, y: (node.y || 0) + 30 });
                    state().addNode(dup);
                }
            });
            this._menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
                state().removeNode(nodeId);
                renderer().selectNode(null);
            });
            this._show(e.clientX, e.clientY);
        },

        _showConnectorMenu(e, edgeId) {
            bus().emit('edge:selected', edgeId);
            this._menu.innerHTML = `
                <button class="context-menu-item" data-action="reset-line">Reset Line</button>
            `;
            this._menu.querySelector('[data-action="reset-line"]').addEventListener('click', () => {
                if (window.PMB.EdgeEditor) {
                    window.PMB.EdgeEditor.resetEdge(edgeId);
                }
            });
            this._show(e.clientX, e.clientY);
        },

        _showCanvasMenu(e) {
            const sm = window.PMB.SelectionManager;
            const hasMultiSel = sm && sm.getSelected().length > 1;

            this._menu.innerHTML = `
                <button class="context-menu-item" data-action="add">Add Process Step</button>
                <button class="context-menu-item" data-action="paste">Paste<span class="context-menu-shortcut">Ctrl+V</span></button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item" data-action="fit">Fit to Screen<span class="context-menu-shortcut">Ctrl+0</span></button>
                <button class="context-menu-item" data-action="layout">Auto Layout</button>
                ${hasMultiSel ? `
                <div class="context-menu-divider"></div>
                <button class="context-menu-item" data-action="align-left">Align Left</button>
                <button class="context-menu-item" data-action="align-center">Align Center</button>
                <button class="context-menu-item" data-action="distribute-v">Distribute Vertically</button>
                ` : ''}
            `;
            this._menu.querySelector('[data-action="add"]').addEventListener('click', () => {
                const svgEl = document.getElementById('diagram-svg');
                const pt = svgEl.createSVGPoint();
                pt.x = e.clientX; pt.y = e.clientY;
                const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
                const node = model().createNode({ x: svgPt.x, y: svgPt.y });
                state().addNode(node);
            });
            this._menu.querySelector('[data-action="paste"]').addEventListener('click', () => {
                bus().emit('toast', 'info', 'Paste not yet implemented');
            });
            this._menu.querySelector('[data-action="fit"]').addEventListener('click', () => renderer().fitToScreen());
            this._menu.querySelector('[data-action="layout"]').addEventListener('click', () => renderer().autoLayout());

            if (hasMultiSel) {
                this._menu.querySelector('[data-action="align-left"]').addEventListener('click', () => sm.alignLeft());
                this._menu.querySelector('[data-action="align-center"]').addEventListener('click', () => sm.alignCenter());
                this._menu.querySelector('[data-action="distribute-v"]').addEventListener('click', () => sm.distributeVertically());
            }

            this._show(e.clientX, e.clientY);
        },

        _show(x, y) {
            this._menu.style.left = x + 'px';
            this._menu.style.top = y + 'px';
            this._menu.classList.remove('hidden');
        },

        _hide() {
            this._menu.classList.add('hidden');
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.ContextMenu = ContextMenu;
})();
