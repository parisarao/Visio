/**
 * StateManager — Global state, undo/redo, and dirty tracking
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;

    class StateManager {
        constructor() {
            this._state = this._defaultState();
            this._undoStack = [];
            this._redoStack = [];
            this._maxHistory = 50;
            this._dirty = false;
        }

        _defaultState() {
            return {
                version: '1.0',
                settings: {
                    theme: 'light',
                    connectorStyle: 'orthogonal',
                    gridSnap: true,
                    gridSize: 20,
                    laneOrientation: 'horizontal',
                    nodeSpacing: 80,
                    flowDirection: 'horizontal',
                    defaultShapeBg: 'transparent',
                    defaultShapeFont: '#000000',
                    defaultShapeBorder: '#000000',
                    defaultLaneHeaderBg: 'transparent',
                    defaultLaneHeaderFont: '#000000',
                    defaultLaneBorder: '#000000',
                    diagramTitleBg: 'transparent',
                    diagramTitleFont: '#000000',
                    diagramTitleBorder: '#000000'
                },
                title: 'Enterprise Process Map',
                lanes: [],
                laneColumns: [],
                nodes: [],
                edges: []
            };
        }

        getState() { return this._state; }
        getTitle() { return this._state.title || 'Enterprise Process Map'; }

        setTitle(newTitle) {
            this._state.title = newTitle;
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('title:changed', newTitle);
        }

        setState(newState, skipHistory) {
            if (!skipHistory) this._pushHistory();
            this._state = JSON.parse(JSON.stringify(newState));
            this._dirty = true;
            bus().emit('state:changed', this._state);
            this._updateUndoRedoButtons();
        }

        getNodes() { return this._state.nodes; }
        getLanes() { return this._state.lanes; }
        getLaneColumns() { return this._state.laneColumns || []; }
        getEdges() { return this._state.edges; }
        getSettings() { return this._state.settings; }

        updateNode(stepId, updates) {
            this._pushHistory();
            const node = this._state.nodes.find(n => n.stepId === stepId);
            if (node) {
                // If swimlane is being updated, check if it actually changed!
                if (updates.swimlane !== undefined && updates.swimlane !== node.swimlane) {
                    const laneId = updates.swimlane;
                    if (laneId) {
                        const lanes = this._state.lanes;
                        const settings = this._state.settings;
                        const sortedLanes = [...lanes].sort((a, b) => (a.order || 0) - (b.order || 0));
                        const laneIdx = sortedLanes.findIndex(l => l.id === laneId);
                        if (laneIdx !== -1) {
                            const isHoriz = settings.laneOrientation !== 'vertical';
                            const titleText = this.getTitle();
                            const startY = titleText ? 70 : 20;
                            
                            if (isHoriz) {
                                const laneHeight = 180;
                                const laneY = startY + laneIdx * (laneHeight + 2);
                                updates.y = laneY + laneHeight / 2 - (updates.height || node.height || 60) / 2;
                            } else {
                                const laneWidth = 240;
                                const laneX = 20 + laneIdx * (laneWidth + 2);
                                updates.x = laneX + laneWidth / 2 - (updates.width || node.width || 140) / 2;
                            }
                        }
                    }
                }
                if (updates.swimlaneColumn !== undefined && updates.swimlaneColumn !== node.swimlaneColumn) {
                    const columnId = updates.swimlaneColumn;
                    if (columnId) {
                        const columns = this.getLaneColumns();
                        const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
                        const columnIdx = sortedColumns.findIndex(c => c.id === columnId);
                        if (columnIdx !== -1) {
                            const columnWidth = 240;
                            const headerW = this._state.settings.laneOrientation === 'grid' ? 40 : 20;
                            const columnX = headerW + columnIdx * (columnWidth + 2);
                            updates.x = columnX + columnWidth / 2 - (updates.width || node.width || 140) / 2;
                        }
                    }
                }
                Object.assign(node, updates);
            }
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('node:updated', stepId, updates);
            this._updateUndoRedoButtons();
        }

        addNode(nodeData) {
            this._pushHistory();
            
            // Auto-create default lane if there are absolutely no lanes in the diagram
            if (this._state.lanes.length === 0) {
                const defaultLane = {
                    id: 'lane-1',
                    name: 'Default Lane',
                    headerBackgroundColor: 'transparent',
                    backgroundColor: 'transparent',
                    borderColor: '#000000',
                    fontColor: '#000000',
                    order: 0
                };
                this._state.lanes.push(defaultLane);
            }

            // Ensure the node has a swimlane assigned
            if (!nodeData.swimlane && this._state.lanes.length > 0) {
                nodeData.swimlane = this._state.lanes[0].id;
            }
            if (!nodeData.swimlaneColumn && this.getLaneColumns().length > 0) {
                nodeData.swimlaneColumn = this.getLaneColumns()[0].id;
            }

            // If swimlane is already set when adding a node, position it in that lane
            if (nodeData.swimlane) {
                const laneId = nodeData.swimlane;
                const lanes = this._state.lanes;
                const settings = this._state.settings;
                const sortedLanes = [...lanes].sort((a, b) => (a.order || 0) - (b.order || 0));
                const laneIdx = sortedLanes.findIndex(l => l.id === laneId);
                if (laneIdx !== -1) {
                    const isHoriz = settings.laneOrientation !== 'vertical';
                    const titleText = this.getTitle();
                    const startY = titleText ? 70 : 20;
                    
                    if (isHoriz) {
                        const laneHeight = 180;
                        const laneY = startY + laneIdx * (laneHeight + 2);
                        nodeData.y = laneY + laneHeight / 2 - (nodeData.height || 60) / 2;
                    } else {
                        const laneWidth = 240;
                        const laneX = 20 + laneIdx * (laneWidth + 2);
                        nodeData.x = laneX + laneWidth / 2 - (nodeData.width || 140) / 2;
                    }
                }
            }

            if (nodeData.swimlaneColumn) {
                const sortedColumns = [...this.getLaneColumns()].sort((a, b) => (a.order || 0) - (b.order || 0));
                const columnIdx = sortedColumns.findIndex(c => c.id === nodeData.swimlaneColumn);
                if (columnIdx !== -1) {
                    const columnWidth = 240;
                    const headerW = this._state.settings.laneOrientation === 'grid' ? 40 : 20;
                    const columnX = headerW + columnIdx * (columnWidth + 2);
                    nodeData.x = columnX + columnWidth / 2 - (nodeData.width || 140) / 2;
                }
            }
            
            this._state.nodes.push(nodeData);
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('node:added', nodeData);
            this._updateUndoRedoButtons();
        }

        removeNode(stepId) {
            this._pushHistory();
            this._state.nodes = this._state.nodes.filter(n => n.stepId !== stepId);
            // Clean up references
            this._state.nodes.forEach(n => {
                if (n.nextStep === stepId) n.nextStep = '';
                if (n.yesPath === stepId) n.yesPath = '';
                if (n.noPath === stepId) n.noPath = '';
            });
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('node:removed', stepId);
            this._updateUndoRedoButtons();
        }

        addLane(lane) {
            this._pushHistory();
            this._state.lanes.push(lane);
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('lane:added', lane);
            this._updateUndoRedoButtons();
        }

        removeLane(laneId) {
            this._pushHistory();
            this._state.lanes = this._state.lanes.filter(l => l.id !== laneId);
            this._state.nodes.forEach(n => { if (n.swimlane === laneId) n.swimlane = ''; });
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('lane:removed', laneId);
            this._updateUndoRedoButtons();
        }

        updateLane(laneId, updates) {
            this._pushHistory();
            const lane = this._state.lanes.find(l => l.id === laneId);
            if (lane) {
                Object.assign(lane, updates);
            }
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('lane:updated', laneId, updates);
            this._updateUndoRedoButtons();
        }

        updateLaneColumn(columnId, updates) {
            this._pushHistory();
            if (!this._state.laneColumns) this._state.laneColumns = [];
            const col = this._state.laneColumns.find(c => c.id === columnId);
            if (col) {
                Object.assign(col, updates);
            }
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('lane-column:updated', columnId, updates);
            this._updateUndoRedoButtons();
        }

        addLaneColumn(column) {
            this._pushHistory();
            if (!this._state.laneColumns) this._state.laneColumns = [];
            this._state.laneColumns.push(column);
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('lane-column:added', column);
            this._updateUndoRedoButtons();
        }

        removeLaneColumn(columnId) {
            this._pushHistory();
            this._state.laneColumns = this.getLaneColumns().filter(c => c.id !== columnId);
            this._state.nodes.forEach(n => { if (n.swimlaneColumn === columnId) n.swimlaneColumn = ''; });
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('lane-column:removed', columnId);
            this._updateUndoRedoButtons();
        }

        updateSettings(updates) {
            this._pushHistory();
            Object.assign(this._state.settings, updates);
            this._dirty = true;
            bus().emit('state:changed', this._state);
            bus().emit('settings:changed', this._state.settings);
            this._updateUndoRedoButtons();
        }

        // Undo / Redo
        _pushHistory() {
            this._undoStack.push(JSON.stringify(this._state));
            if (this._undoStack.length > this._maxHistory) this._undoStack.shift();
            this._redoStack = [];
        }

        undo() {
            if (this._undoStack.length === 0) return;
            this._redoStack.push(JSON.stringify(this._state));
            this._state = JSON.parse(this._undoStack.pop());
            this._dirty = true;
            bus().emit('state:changed', this._state);
            this._updateUndoRedoButtons();
        }

        redo() {
            if (this._redoStack.length === 0) return;
            this._undoStack.push(JSON.stringify(this._state));
            this._state = JSON.parse(this._redoStack.pop());
            this._dirty = true;
            bus().emit('state:changed', this._state);
            this._updateUndoRedoButtons();
        }

        canUndo() { return this._undoStack.length > 0; }
        canRedo() { return this._redoStack.length > 0; }
        isDirty() { return this._dirty; }
        markClean() { this._dirty = false; }

        _updateUndoRedoButtons() {
            const undoBtn = document.getElementById('btn-undo');
            const redoBtn = document.getElementById('btn-redo');
            if (undoBtn) undoBtn.disabled = !this.canUndo();
            if (redoBtn) redoBtn.disabled = !this.canRedo();
        }

        reset() {
            this._pushHistory();
            this._state = this._defaultState();
            
            // Reset ID counter in DataModel
            if (window.PMB && window.PMB.DataModel) {
                window.PMB.DataModel.syncIdCounter([]);
            }

            this._dirty = false;
            bus().emit('state:changed', this._state);
            this._updateUndoRedoButtons();
        }

        loadState(data) {
            this._pushHistory();
            // Merge with defaults
            const merged = this._defaultState();
            if (data.version) merged.version = data.version;
            if (data.settings) Object.assign(merged.settings, data.settings);
            if (data.title) merged.title = data.title;
            if (data.lanes) merged.lanes = data.lanes;
            if (data.laneColumns) merged.laneColumns = data.laneColumns;
            if (data.nodes) merged.nodes = data.nodes;
            if (data.edges) merged.edges = data.edges || [];
            this._state = merged;
            
            // Sync ID counter in DataModel
            if (window.PMB && window.PMB.DataModel) {
                window.PMB.DataModel.syncIdCounter(merged.nodes);
            }

            this._dirty = false;
            bus().emit('state:loaded', this._state);
            bus().emit('state:changed', this._state);
            this._updateUndoRedoButtons();
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.StateManager = new StateManager();
})();
