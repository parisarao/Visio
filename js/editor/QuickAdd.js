/**
 * QuickAdd — Interactive shape creation and connection
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;
    const renderer = () => window.PMB.DiagramRenderer;

    const NS = 'http://www.w3.org/2000/svg';

    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    const QuickAdd = {
        _layer: null,
        _activeNodeId: null,
        _activeDirection: null,

        init() {
            this._layer = document.getElementById('quick-add-layer');
            
            bus().on('selection:changed', (sel) => {
                if (sel && sel.length === 1) {
                    this._activeNodeId = sel[0];
                    this.render();
                } else {
                    this._activeNodeId = null;
                    this.clear();
                }
            });

            bus().on('render:complete', () => {
                if (this._activeNodeId) this.render();
            });

            this._setupInteractions();
        },

        clear() {
            if (this._layer) {
                while (this._layer.firstChild) this._layer.removeChild(this._layer.firstChild);
            }
        },

        render() {
            this.clear();
            if (!this._activeNodeId) return;

            const node = state().getNodes().find(n => n.stepId === this._activeNodeId);
            if (!node) return;

            const padding = 20;
            const w = node.width || 140;
            const h = node.height || 60;
            const x = node.x || 0;
            const y = node.y || 0;

            const points = [
                { dir: 'up', cx: x + w/2, cy: y - padding },
                { dir: 'right', cx: x + w + padding, cy: y + h/2 },
                { dir: 'down', cx: x + w/2, cy: y + h + padding },
                { dir: 'left', cx: x - padding, cy: y + h/2 }
            ];

            points.forEach(pt => {
                const g = el('g', {
                    class: 'quick-add-btn',
                    'data-dir': pt.dir,
                    'data-node-id': node.stepId,
                    style: 'cursor: pointer; pointer-events: all;'
                });

                // Invisible larger hit area
                const hit = el('circle', {
                    cx: pt.cx, cy: pt.cy, r: 15,
                    fill: 'transparent'
                });
                
                // Visible button
                const circle = el('circle', {
                    cx: pt.cx, cy: pt.cy, r: 8,
                    fill: '#3b82f6', stroke: '#ffffff', 'stroke-width': '2'
                });

                // Plus icon
                const plus = el('path', {
                    d: `M ${pt.cx - 3} ${pt.cy} L ${pt.cx + 3} ${pt.cy} M ${pt.cx} ${pt.cy - 3} L ${pt.cx} ${pt.cy + 3}`,
                    stroke: '#ffffff', 'stroke-width': '2', 'stroke-linecap': 'round'
                });

                g.appendChild(hit);
                g.appendChild(circle);
                g.appendChild(plus);
                this._layer.appendChild(g);
            });
        },

        _setupInteractions() {
            const wrapper = document.getElementById('canvas-wrapper');
            const menu = document.getElementById('quick-add-menu');
            const confirmBtn = document.getElementById('btn-quick-add-confirm');
            const shapeSelect = document.getElementById('quick-add-shape-type');

            wrapper.addEventListener('mousedown', (e) => {
                let target = e.target;
                let isBtn = false;
                let dir = null;
                let nodeId = null;

                while (target && target !== wrapper) {
                    const cls = (target.getAttribute && target.getAttribute('class')) || '';
                    if (cls.indexOf('quick-add-btn') !== -1) {
                        isBtn = true;
                        dir = target.getAttribute('data-dir');
                        nodeId = target.getAttribute('data-node-id');
                        break;
                    }
                    target = target.parentNode;
                }

                if (isBtn && nodeId) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this._activeDirection = dir;
                    this._activeNodeId = nodeId;

                    // Position menu
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';
                    menu.classList.remove('hidden');
                } else if (!menu.contains(e.target)) {
                    menu.classList.add('hidden');
                }
            });

            confirmBtn.addEventListener('click', () => {
                if (!this._activeNodeId || !this._activeDirection) return;

                const node = state().getNodes().find(n => n.stepId === this._activeNodeId);
                if (!node) return;

                const shapeType = shapeSelect.value;
                const gap = (state().getSettings() && state().getSettings().nodeSpacing !== undefined) ? state().getSettings().nodeSpacing : 30;
                let nx = node.x || 0;
                let ny = node.y || 0;
                if (this._activeDirection === 'right') nx += (node.width || 140) + gap;
                else if (this._activeDirection === 'left') nx -= 140 + gap;
                else if (this._activeDirection === 'down') ny += (node.height || 60) + gap;
                else if (this._activeDirection === 'up') ny -= 60 + gap;

                const newNode = model().createNode({ 
                    shapeType, 
                    swimlane: node.swimlane, 
                    swimlaneColumn: node.swimlaneColumn,
                    x: nx,
                    y: ny
                });

                // Update parent to connect to new node in the chosen direction
                const updates = {};
                if (node.shapeType === 'decision') {
                    if (!node.yesPath) {
                        updates.yesPath = newNode.stepId;
                        updates.yesFlowDir = this._activeDirection;
                    } else if (!node.noPath) {
                        updates.noPath = newNode.stepId;
                        updates.noFlowDir = this._activeDirection;
                    } else {
                        bus().emit('toast', 'warning', 'Decision already has both paths connected.');
                        menu.classList.add('hidden');
                        return;
                    }
                } else {
                    updates.nextStep = newNode.stepId;
                    updates.layoutFlow = this._activeDirection;
                }

                // Add to state
                state().addNode(newNode);
                state().updateNode(node.stepId, updates);

                menu.classList.add('hidden');
                bus().emit('toast', 'success', 'Shape added and connected');
                
                // Select new shape and layout
                setTimeout(() => {
                    if (window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.selectMultiple([newNode.stepId]);
                    }
                    renderer().autoLayout(false, true);
                }, 50);
            });
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.QuickAdd = QuickAdd;
})();
