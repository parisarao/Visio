/**
 * DiagramRenderer — Main SVG rendering orchestrator
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;
    const shapes = () => window.PMB.ShapeFactory;
    const connectors = () => window.PMB.ConnectorEngine;
    const swimlanes = () => window.PMB.SwimlaneManager;
    const layout = () => window.PMB.LayoutEngine;

    class DiagramRenderer {
        constructor() {
            this._svg = null;
            this._nodeLayer = null;
            this._connectorLayer = null;
            this._swimlaneLayer = null;
            this._overlayLayer = null;
            this._viewBox = { x: 0, y: 0, w: 1200, h: 800 };
            this._zoom = 1;
            this._isPanning = false;
            this._panStart = { x: 0, y: 0 };
            this._selectedNodeId = null;
            this._renderScheduled = false;
            this._suppressNextCanvasClick = false;
        }

        init() {
            this._svg = document.getElementById('diagram-svg');
            this._nodeLayer = document.getElementById('node-layer');
            this._connectorLayer = document.getElementById('connector-layer');
            this._swimlaneLayer = document.getElementById('swimlane-layer');
            this._overlayLayer = document.getElementById('overlay-layer');

            // Set initial viewBox
            const rect = this._svg.getBoundingClientRect();
            this._viewBox.w = rect.width || 1200;
            this._viewBox.h = rect.height || 800;
            this._updateViewBox();

            // Pan & zoom
            this._setupPanZoom();

            // Listen for state changes
            bus().on('state:changed', () => this.scheduleRender());
            bus().on('state:loaded', () => this._onStateLoaded());
            bus().on('selection:changed', () => this.scheduleRender());

            // Empty-canvas click. Node and connector selection is handled from
            // mousedown in _setupPanZoom so modifier-click multi-select does not
            // get toggled twice by the later click event.
            this._svg.addEventListener('click', (e) => {
                if (this._suppressNextCanvasClick) {
                    this._suppressNextCanvasClick = false;
                    return;
                }

                let nodeGroup = e.target;
                while (nodeGroup && nodeGroup !== this._svg) {
                    const cls = (nodeGroup.getAttribute && nodeGroup.getAttribute('class')) || '';
                    if (cls.indexOf('node-group') !== -1) break;
                    nodeGroup = nodeGroup.parentNode;
                }
                
                const finalCls = (nodeGroup && nodeGroup.getAttribute && nodeGroup.getAttribute('class')) || '';
                if (!(nodeGroup && nodeGroup !== this._svg && finalCls.indexOf('node-group') !== -1)) {
                    if (window.PMB.SelectionManager) window.PMB.SelectionManager.clear();
                    this.selectNode(null);
                }
            });

            // Track mouse position
            this._svg.addEventListener('mousemove', (e) => {
                const pt = this._svgPoint(e);
                const posEl = document.getElementById('cursor-pos');
                if (posEl) posEl.textContent = `${Math.round(pt.x)}, ${Math.round(pt.y)}`;
            });
        }

        scheduleRender() {
            if (this._renderScheduled) return;
            this._renderScheduled = true;
            requestAnimationFrame(() => {
                this._renderScheduled = false;
                this.render();
            });
        }

        async render() {
            const s = state().getState();
            const nodes = s.nodes || [];
            const lanes = s.lanes || [];
            const laneColumns = s.laneColumns || [];
            const settings = s.settings || {};
            const edges = model().buildEdges(nodes);

            // Update status
            document.getElementById('node-count').textContent = nodes.length + ' nodes';
            document.getElementById('edge-count').textContent = edges.length + ' edges';

            // Clear layers
            this._clearLayer(this._swimlaneLayer);
            this._clearLayer(this._nodeLayer);
            this._clearLayer(this._connectorLayer);

            // Render swimlanes (even if 0 nodes!)
            swimlanes().render(lanes, nodes, settings.laneOrientation || 'horizontal', this._swimlaneLayer, laneColumns);

            if (nodes.length === 0) {
                // Update minimap
                bus().emit('minimap:update');
                return;
            }

            // Render nodes
            let selectedIds = [this._selectedNodeId];
            if (window.PMB.SelectionManager) {
                const multiSel = window.PMB.SelectionManager.getSelected();
                if (multiSel && multiSel.length > 0) selectedIds = multiSel;
            }

            nodes.forEach(node => {
                const shapeEl = shapes().createShape(node);
                if (selectedIds.includes(node.stepId)) {
                    shapeEl.classList.add('selected');
                    const shp = shapeEl.querySelector('.node-shape');
                    if (shp) shp.setAttribute('stroke', 'var(--accent)');
                }
                this._nodeLayer.appendChild(shapeEl);
            });

            // Render connectors
            const connStyle = settings.connectorStyle || 'orthogonal';
            edges.forEach(edge => {
                const src = nodes.find(n => n.stepId === edge.source);
                const tgt = nodes.find(n => n.stepId === edge.target);
                if (src && tgt) {
                    const connEl = connectors().createConnector(edge, src, tgt, connStyle);
                    
                    if (window.PMB.SelectionManager) {
                        const selectedEdges = window.PMB.SelectionManager.getSelectedEdges();
                        if (selectedEdges && selectedEdges.includes(edge.id)) {
                            const path = connEl.querySelector('.connector-path');
                            if (path) {
                                path.setAttribute('stroke-width', '2.5');
                                path.style.filter = 'drop-shadow(0 0 3px rgba(22, 163, 74, 0.4))';
                            }
                        }
                    }
                    
                    this._connectorLayer.appendChild(connEl);
                }
            });

            // Update minimap
            bus().emit('minimap:update');
            bus().emit('render:complete');
        }

        renderEdgesOnly() {
            const s = state().getState();
            const nodes = s.nodes || [];
            const settings = s.settings || {};
            const edges = model().buildEdges(nodes);

            this._clearLayer(this._connectorLayer);

            const connStyle = settings.connectorStyle || 'orthogonal';
            edges.forEach(edge => {
                const src = nodes.find(n => n.stepId === edge.source);
                const tgt = nodes.find(n => n.stepId === edge.target);
                if (src && tgt) {
                    const connEl = connectors().createConnector(edge, src, tgt, connStyle);
                    
                    if (window.PMB.SelectionManager) {
                        const selectedEdges = window.PMB.SelectionManager.getSelectedEdges();
                        if (selectedEdges && selectedEdges.includes(edge.id)) {
                            const path = connEl.querySelector('.connector-path');
                            if (path) {
                                path.setAttribute('stroke-width', '2.5');
                                path.style.filter = 'drop-shadow(0 0 3px rgba(22, 163, 74, 0.4))';
                            }
                        }
                    }
                    
                    this._connectorLayer.appendChild(connEl);
                }
            });
            bus().emit('minimap:update');
        }

        async autoLayout(skipFit = false, isAutomatic = false) {
            const lockEl = document.getElementById('layout-auto-lock');
            if (isAutomatic && lockEl && lockEl.checked) {
                return;
            }

            const s = state().getState();
            const nodes = s.nodes || [];
            const settings = s.settings || {};
            const lanes = settings.laneOrientation === 'vertical' ? (s.laneColumns || []) : (s.lanes || []);
            const edges = model().buildEdges(nodes);

            bus().emit('toast', 'info', 'Running auto-layout...');

            const positioned = await layout().layout(nodes, edges, lanes, settings.laneOrientation);

            // Wipe out custom waypoints because absolute positions are now broken
            positioned.forEach(node => {
                if (node.edgeRouting) {
                    Object.keys(node.edgeRouting).forEach(key => {
                        if (node.edgeRouting[key].waypoints) {
                            delete node.edgeRouting[key].waypoints;
                        }
                    });
                }
            });

            const newState = { ...s, nodes: positioned };
            state().setState(newState);

            // Fit to screen after layout
            if (!skipFit) {
                setTimeout(() => this.fitToScreen(), 100);
            }
            bus().emit('toast', 'success', 'Layout complete');
        }

        async _onStateLoaded() {
            const s = state().getState();
            // If nodes have no positions, auto-layout
            const hasPositions = s.nodes.some(n => n.x > 0 || n.y > 0);
            if (!hasPositions && s.nodes.length > 0) {
                await this.autoLayout(false, true);
            } else {
                this.render();
                setTimeout(() => this.fitToScreen(), 200);
            }
        }

        selectNode(id, e) {
            const shiftOrCtrl = e && (e.shiftKey || e.ctrlKey || e.metaKey);
            if (shiftOrCtrl && window.PMB.SelectionManager) {
                const current = [...window.PMB.SelectionManager.getSelected()];
                if (current.includes(id)) {
                    const idx = current.indexOf(id);
                    current.splice(idx, 1);
                } else {
                    current.push(id);
                }
                window.PMB.SelectionManager.selectMultiple(current);
            } else {
                this._selectedNodeId = id;
                bus().emit('node:selected', id);
            }
            this.scheduleRender();
        }

        // ---- Pan & Zoom ----
        _setupPanZoom() {
            const wrapper = document.getElementById('canvas-wrapper');

            wrapper.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                
                // Check if clicking on node or connector
                let isNode = false;
                let isConnector = false;
                let nodeId = null;
                let edgeId = null;
                let target = e.target;
                
                while (target && target !== wrapper) {
                    const cls = (target.getAttribute && target.getAttribute('class')) || '';
                    // First check if clicking on EdgeEditor interactive dots
                    if (cls.indexOf('edge-anchor') !== -1 || cls.indexOf('edge-waypoint') !== -1) {
                        return; // Let EdgeEditor handle it
                    }
                    if (cls.indexOf('node-group') !== -1) {
                        isNode = true;
                        nodeId = target.getAttribute('data-id');
                        break;
                    }
                    if (cls.indexOf('connector-path') !== -1 || cls.indexOf('connector-label') !== -1) {
                        isConnector = true;
                        edgeId = target.getAttribute('data-edge-id');
                        break;
                    }
                    if (cls.indexOf('connector-group') !== -1) {
                        isConnector = true;
                        edgeId = target.getAttribute('data-edge-id');
                        break;
                    }
                    target = target.parentNode;
                }
                
                e.preventDefault(); // Prevent native text selection
                
                if (isNode && nodeId) {
                    this._suppressNextCanvasClick = true;
                    if (window.PMB.DragDropManager) {
                        window.PMB.DragDropManager.startDrag(nodeId, e);
                    }
                } else if (isConnector && edgeId) {
                    this._suppressNextCanvasClick = true;
                    bus().emit('edge:selected', edgeId);
                    this.render();
                } else {
                    bus().emit('node:selected', null);
                    bus().emit('edge:selected', null);
                    this.render();
                    // Start panning
                    this._isPanning = true;
                    this._panStart = { x: e.clientX, y: e.clientY };
                    wrapper.style.cursor = 'grabbing';
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!this._isPanning) return;
                if (e.buttons === 0) {
                    this._isPanning = false;
                    wrapper.style.cursor = 'grab';
                    return;
                }
                const dx = (e.clientX - this._panStart.x) / this._zoom;
                const dy = (e.clientY - this._panStart.y) / this._zoom;
                this._viewBox.x -= dx;
                this._viewBox.y -= dy;
                this._panStart = { x: e.clientX, y: e.clientY };
                this._updateViewBox();
            });

            window.addEventListener('mouseup', () => {
                this._isPanning = false;
                wrapper.style.cursor = 'grab';
            });

            wrapper.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const pt = this._svgPoint(e);
                this._zoom *= delta;
                this._zoom = Math.max(0.1, Math.min(5, this._zoom));

                // Zoom towards cursor
                this._viewBox.x = pt.x - (pt.x - this._viewBox.x) / delta;
                this._viewBox.y = pt.y - (pt.y - this._viewBox.y) / delta;
                this._viewBox.w /= delta;
                this._viewBox.h /= delta;
                this._updateViewBox();
                this._updateZoomLabel();
            }, { passive: false });
        }

        zoomIn() {
            const cx = this._viewBox.x + this._viewBox.w / 2;
            const cy = this._viewBox.y + this._viewBox.h / 2;
            this._zoom *= 1.2;
            this._zoom = Math.min(5, this._zoom);
            this._viewBox.w /= 1.2;
            this._viewBox.h /= 1.2;
            this._viewBox.x = cx - this._viewBox.w / 2;
            this._viewBox.y = cy - this._viewBox.h / 2;
            this._updateViewBox();
            this._updateZoomLabel();
        }

        zoomOut() {
            const cx = this._viewBox.x + this._viewBox.w / 2;
            const cy = this._viewBox.y + this._viewBox.h / 2;
            this._zoom *= 0.8;
            this._zoom = Math.max(0.1, this._zoom);
            this._viewBox.w /= 0.8;
            this._viewBox.h /= 0.8;
            this._viewBox.x = cx - this._viewBox.w / 2;
            this._viewBox.y = cy - this._viewBox.h / 2;
            this._updateViewBox();
            this._updateZoomLabel();
        }

        fitToScreen() {
            const nodes = state().getNodes();
            if (nodes.length === 0) return;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(n => {
                minX = Math.min(minX, n.x || 0);
                minY = Math.min(minY, n.y || 0);
                maxX = Math.max(maxX, (n.x || 0) + (n.width || 140));
                maxY = Math.max(maxY, (n.y || 0) + (n.height || 60));
            });
            const padding = 60;
            this._viewBox.x = minX - padding;
            this._viewBox.y = minY - padding;
            this._viewBox.w = (maxX - minX) + padding * 2;
            this._viewBox.h = (maxY - minY) + padding * 2;
            // calc zoom
            const rect = this._svg.getBoundingClientRect();
            this._zoom = Math.min(rect.width / this._viewBox.w, rect.height / this._viewBox.h);
            this._updateViewBox();
            this._updateZoomLabel();
        }

        _updateViewBox() {
            this._svg.setAttribute('viewBox', `${this._viewBox.x} ${this._viewBox.y} ${this._viewBox.w} ${this._viewBox.h}`);
            bus().emit('minimap:update');
        }

        _updateZoomLabel() {
            const el = document.getElementById('zoom-level');
            if (el) el.textContent = Math.round(this._zoom * 100) + '%';
        }

        _svgPoint(e) {
            const pt = this._svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const ctm = this._svg.getScreenCTM().inverse();
            return pt.matrixTransform(ctm);
        }

        _clearLayer(layer) {
            while (layer.firstChild) layer.removeChild(layer.firstChild);
        }

        getSVGElement() { return this._svg; }
        getViewBox() { return this._viewBox; }
        getZoom() { return this._zoom; }
    }

    window.PMB = window.PMB || {};
    window.PMB.DiagramRenderer = new DiagramRenderer();
})();
