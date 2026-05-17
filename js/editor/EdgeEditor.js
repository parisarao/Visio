/**
 * EdgeEditor — Interactivity for custom connection routing (waypoints and ports)
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;
    const shapes = () => window.PMB.ShapeFactory;

    const NS = 'http://www.w3.org/2000/svg';

    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    const EdgeEditor = {
        _layer: null,
        _activeEdgeId: null,
        
        // Drag state
        _isDragging: false,
        _dragType: null, // 'anchor-source', 'anchor-target', 'waypoint'
        _dragEdge: null,
        _dragNode: null,
        _dragIndex: -1, // for waypoints
        _dragStartPt: null,
        _dragOriginalWaypoints: null,

        init() {
            this._layer = document.getElementById('overlay-layer');
            
            bus().on('selection:changed', () => this.render());
            // Only re-render edge controls after the diagram itself finishes rendering,
            // but do NOT trigger further state:changed events during this render.
            bus().on('render:complete', () => {
                if (!this._isDragging) this.render();
            });

            this._setupInteractions();
        },

        render() {
            // clear layer
            while (this._layer.firstChild) this._layer.removeChild(this._layer.firstChild);

            if (!window.PMB.SelectionManager) return;
            const edges = window.PMB.SelectionManager.getSelectedEdges();
            if (!edges || edges.length === 0) {
                this._activeEdgeId = null;
                return;
            }

            this._activeEdgeId = edges[0];
            const allEdges = model().buildEdges(state().getNodes());
            const edge = allEdges.find(e => e.id === this._activeEdgeId);
            if (!edge) return;

            const srcNode = state().getNodes().find(n => n.stepId === edge.source);
            const tgtNode = state().getNodes().find(n => n.stepId === edge.target);
            if (!srcNode || !tgtNode) return;

            // Fetch the rendered path points
            const g = document.querySelector(`g[data-edge-id="${edge.id}"]`);
            if (!g) return;
            const pointsStr = g.getAttribute('data-points');
            if (!pointsStr) return;
            const points = JSON.parse(pointsStr);

            // Render Anchor Ports (all 4 sides of source and target)
            this._renderAnchorPorts(srcNode, edge, 'source', points[0]);
            this._renderAnchorPorts(tgtNode, edge, 'target', points[points.length - 1]);

            // Render Waypoints (yellow dots on corners)
            for (let i = 1; i < points.length - 1; i++) {
                this._renderWaypoint(points[i], i, edge);
            }
            
            // Render Midpoints (for creating new waypoints)
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                if (Math.abs(p1.x - p2.x) > 10 || Math.abs(p1.y - p2.y) > 10) {
                    const mid = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
                    this._renderMidpoint(mid, i, edge);
                }
            }
        },

        _renderAnchorPorts(node, edge, type, activePoint) {
            const sides = ['top', 'right', 'bottom', 'left'];
            sides.forEach(side => {
                const pt = shapes().getPort(node, side);
                const isActive = Math.abs(pt.x - activePoint.x) < 2 && Math.abs(pt.y - activePoint.y) < 2;
                
                const dot = el('circle', {
                    cx: pt.x, cy: pt.y, r: isActive ? 6 : 4,
                    fill: isActive ? '#16a34a' : '#ffffff',
                    stroke: '#16a34a', 'stroke-width': '2',
                    class: 'edge-anchor',
                    'data-type': type,
                    'data-side': side,
                    'data-node-id': node.stepId,
                    'data-edge-id': edge.id,
                    style: 'cursor: crosshair; pointer-events: all;'
                });
                this._layer.appendChild(dot);
            });
        },

        _renderWaypoint(pt, index, edge) {
            const dot = el('circle', {
                cx: pt.x, cy: pt.y, r: 5,
                fill: '#eab308', stroke: '#000000', 'stroke-width': '1.5',
                class: 'edge-waypoint',
                'data-index': index,
                'data-edge-id': edge.id,
                style: 'cursor: move; pointer-events: all;'
            });
            this._layer.appendChild(dot);
        },
        
        _renderMidpoint(pt, insertAfterIndex, edge) {
            const dot = el('circle', {
                cx: pt.x, cy: pt.y, r: 4,
                fill: '#ffffff', stroke: '#eab308', 'stroke-width': '1.5',
                class: 'edge-waypoint edge-midpoint',
                'data-insert-after': insertAfterIndex,
                'data-edge-id': edge.id,
                style: 'cursor: move; pointer-events: all; opacity: 0.7;'
            });
            this._layer.appendChild(dot);
        },

        _setupInteractions() {
            const wrapper = document.getElementById('canvas-wrapper');
            const rendererObj = () => window.PMB.DiagramRenderer;

            wrapper.addEventListener('mousedown', (e) => {
                let target = e.target;
                const cls = (target.getAttribute && target.getAttribute('class')) || '';
                
                if (cls.indexOf('edge-anchor') !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    const type = target.getAttribute('data-type');
                    const side = target.getAttribute('data-side');
                    const edgeId = target.getAttribute('data-edge-id');
                    
                    this._updateEdgeRouting(edgeId, type === 'source' ? { srcPort: side } : { tgtPort: side });
                } 
                else if (cls.indexOf('edge-waypoint') !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this._isDragging = true;
                    this._dragType = 'waypoint';
                    this._dragEdge = target.getAttribute('data-edge-id');
                    
                    const g = document.querySelector(`g[data-edge-id="${this._dragEdge}"]`);
                    let currentPoints = JSON.parse(g.getAttribute('data-points'));
                    
                    // If it's a midpoint, we need to insert it as a new waypoint first
                    if (cls.indexOf('edge-midpoint') !== -1) {
                        const insertAfter = parseInt(target.getAttribute('data-insert-after'), 10);
                        const pt = rendererObj()._svgPoint(e);
                        currentPoints.splice(insertAfter + 1, 0, { x: pt.x, y: pt.y });
                        this._dragIndex = insertAfter + 1;
                    } else {
                        this._dragIndex = parseInt(target.getAttribute('data-index'), 10);
                    }
                    
                    // The waypoints in DataModel are JUST the middle points, not src/tgt
                    this._dragOriginalWaypoints = currentPoints.slice(1, -1);
                    this._dragStartPt = rendererObj()._svgPoint(e);
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!this._isDragging || this._dragType !== 'waypoint') return;
                
                const pt = rendererObj()._svgPoint(e);
                
                // We update the specific waypoint being dragged.
                // _dragIndex is position in the full points array (1 = first middle point).
                // In the waypoints array (which excludes src/tgt), that's index _dragIndex - 1.
                const wpIndex = this._dragIndex - 1;
                
                // Clone original waypoints and set absolute position (not delta)
                const newWaypoints = JSON.parse(JSON.stringify(this._dragOriginalWaypoints));
                
                // We use absolute SVG position, updating by offset from original waypoint position.
                const origWp = newWaypoints[wpIndex];
                const origPt = this._dragStartPt;
                newWaypoints[wpIndex] = {
                    x: origWp.x + (pt.x - origPt.x),
                    y: origWp.y + (pt.y - origPt.y)
                };
                
                // Real-time preview by updating the DataModel and triggering a render.
                // skipHistory=true so we don't flood the undo stack.
                this._updateEdgeRouting(this._dragEdge, { waypoints: newWaypoints }, true);
            });

            window.addEventListener('mouseup', () => {
                if (this._isDragging) {
                    this._isDragging = false;
                    // Push final state to history
                    const node = this._getSourceNodeForEdge(this._dragEdge);
                    if (node) {
                        state()._pushHistory();
                        state()._dirty = true;
                        bus().emit('state:changed', state().getState());
                        state()._updateUndoRedoButtons();
                    }
                }
            });
        },
        
        _getSourceNodeForEdge(edgeId) {
            const allEdges = model().buildEdges(state().getNodes());
            const edge = allEdges.find(e => e.id === edgeId);
            if (!edge) return null;
            return state().getNodes().find(n => n.stepId === edge.source);
        },

        _updateEdgeRouting(edgeId, updates, skipHistory = false) {
            const allEdges = model().buildEdges(state().getNodes());
            const edge = allEdges.find(e => e.id === edgeId);
            if (!edge) return;

            const node = state().getNodes().find(n => n.stepId === edge.source);
            if (!node) return;

            let edgeType = 'next';
            if (edge.type === 'yes') edgeType = 'yes';
            else if (edge.type === 'no') edgeType = 'no';

            const routing = node.edgeRouting || {};
            const r = routing[edgeType] || {};
            
            if (updates.srcPort !== undefined) r.srcPort = updates.srcPort;
            if (updates.tgtPort !== undefined) r.tgtPort = updates.tgtPort;
            if (updates.waypoints !== undefined) r.waypoints = updates.waypoints;
            
            routing[edgeType] = r;
            
            if (skipHistory) {
                // Mutate directly and render for real-time dragging performance
                node.edgeRouting = routing;
                window.PMB.DiagramRenderer.render();
            } else {
                state().updateNode(node.stepId, { edgeRouting: routing });
            }
        },

        resetEdge(edgeId) {
            const allEdges = model().buildEdges(state().getNodes());
            const edge = allEdges.find(e => e.id === edgeId);
            if (!edge) return;

            const node = state().getNodes().find(n => n.stepId === edge.source);
            if (!node || !node.edgeRouting) return;

            let edgeType = 'next';
            if (edge.type === 'yes') edgeType = 'yes';
            else if (edge.type === 'no') edgeType = 'no';

            const routing = { ...node.edgeRouting };
            delete routing[edgeType];

            state().updateNode(node.stepId, { edgeRouting: routing });
            if (window.PMB.SelectionManager) {
                window.PMB.SelectionManager.selectMultiple([]);
                bus().emit('edge:selected', edgeId);
            }
            bus().emit('toast', 'success', 'Line reset to automatic route');
        },

        resetSelectedEdge() {
            const selectedEdges = window.PMB.SelectionManager ? window.PMB.SelectionManager.getSelectedEdges() : [];
            if (!selectedEdges || selectedEdges.length === 0) return;
            this.resetEdge(selectedEdges[0]);
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.EdgeEditor = EdgeEditor;
})();
