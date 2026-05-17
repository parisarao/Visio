/**
 * GridManager — Tabulator data grid setup with all 17 columns
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;

    class GridManager {
        constructor() {
            this._table = null;
            this._updating = false;
            this._tableBuilt = false;
        }

        init() {
            this._buildTable();
            this._updatingSelection = false;
            bus().on('state:changed', () => this._syncFromState());
            bus().on('state:loaded', () => this._syncFromState());
            bus().on('selection:changed', (ids) => this._syncSelectionFromState(ids));
        }

        _buildTable() {
            const shapeValues = model().SHAPE_TYPES.reduce((o, t) => { o[t] = t.charAt(0).toUpperCase() + t.slice(1); return o; }, {});
            const laneValues = () => {
                const lanes = state().getLanes();
                const obj = { '': '(None)' };
                lanes.forEach(l => { obj[l.id] = l.name; });
                return obj;
            };

            this._table = new Tabulator('#grid-container', {
                data: [],
                layout: 'fitDataFill',
                height: '100%',
                movableRows: true,
                selectable: true,
                index: 'stepId',
                reactiveData: false,
                placeholder: 'No process steps defined. Click "+ Add Step" to begin.',
                columns: [
                    { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 40, cellClick: function(e, cell) { cell.getRow().toggleSelect(); } },
                    { title: 'Step ID', field: 'stepId', width: 80, editor: 'input', frozen: true },
                    { title: 'Step Name', field: 'stepName', width: 140, editor: 'input' },
                    { title: 'Description', field: 'description', width: 160, editor: 'input' },
                    { title: 'Shape', field: 'shapeType', width: 110, editor: 'list', editorParams: { values: shapeValues, autocomplete: true } },
                    { title: 'Swimlane', field: 'swimlane', width: 120, editor: 'list',
                        editorParams: (cell) => {
                            const lanes = state().getLanes();
                            const values = { '': '(None)' };
                            lanes.forEach(l => {
                                values[l.id] = l.name;
                            });
                            return { values };
                        },
                        formatter: (cell) => {
                            const v = cell.getValue();
                            const lane = state().getLanes().find(l => l.id === v);
                            return lane ? lane.name : v || '';
                        }
                    },
                    { title: 'Next Step', field: 'nextStep', width: 90, editor: 'input' },
                    { title: 'Yes Path', field: 'yesPath', width: 90, editor: 'input' },
                    { title: 'No Path', field: 'noPath', width: 90, editor: 'input' },
                    { title: 'BG Color', field: 'backgroundColor', width: 80, formatter: this._colorFormatter, editor: this._colorEditor },
                    { title: 'Font Color', field: 'fontColor', width: 80, formatter: this._colorFormatter, editor: this._colorEditor },
                    { title: 'Border', field: 'borderColor', width: 80, formatter: this._colorFormatter, editor: this._colorEditor },
                    { title: 'Line Color', field: 'connectionLineColor', width: 80, formatter: this._colorFormatter, editor: this._colorEditor },
                    { title: 'Conn. Label', field: 'connectionLabel', width: 100, editor: 'input' },
                    { title: 'W', field: 'width', width: 55, editor: 'number', editorParams: { min: 40, max: 400 } },
                    { title: 'H', field: 'height', width: 55, editor: 'number', editorParams: { min: 30, max: 300 } },
                    { title: 'Icon', field: 'icon', width: 70, editor: 'input' },
                    { title: 'Notes', field: 'notes', width: 140, editor: 'input' }
                ]
            });

            // Cell edited → update state
            this._table.on('cellEdited', (cell) => {
                if (this._updating) return;
                const row = cell.getRow().getData();
                const field = cell.getField();
                
                if (field === 'swimlane') {
                    state().updateNode(row.stepId, { swimlane: cell.getValue() });
                } else {
                    const nodes = this._table.getData();
                    const currentState = state().getState();
                    currentState.nodes = JSON.parse(JSON.stringify(nodes));
                    state().setState(currentState);
                }
            });

            // Selection changed event -> sync to SelectionManager
            this._table.on('rowSelectionChanged', (data, rows) => {
                if (this._updating || this._updatingSelection) return;
                this._updatingSelection = true;
                const ids = data.map(d => d.stepId);
                if (window.PMB.SelectionManager) {
                    window.PMB.SelectionManager.selectMultiple(ids);
                }
                this._updatingSelection = false;
            });

            // Mark table as built and sync
            this._table.on('tableBuilt', () => {
                this._tableBuilt = true;
                this._syncFromState();
            });
        }

        _colorFormatter(cell) {
            const v = cell.getValue() || '#666';
            return `<div style="display:flex;align-items:center;gap:4px"><span style="width:16px;height:16px;border-radius:3px;background:${v};border:1px solid rgba(255,255,255,0.15);flex-shrink:0"></span><span style="font-size:11px;opacity:0.7">${v}</span></div>`;
        }

        _colorEditor(cell, onRendered, success, cancel) {
            const container = document.createElement('div');
            container.style.cssText = 'display:flex;align-items:center;gap:4px;padding:2px';
            const input = document.createElement('input');
            input.type = 'color';
            input.value = cell.getValue() || '#666666';
            input.style.cssText = 'width:30px;height:24px;border:none;padding:0;cursor:pointer;background:transparent';
            const text = document.createElement('input');
            text.type = 'text';
            text.value = cell.getValue() || '#666666';
            text.style.cssText = 'width:70px;font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-tertiary);color:var(--text-primary)';
            container.appendChild(input);
            container.appendChild(text);
            input.addEventListener('input', () => { text.value = input.value; });
            text.addEventListener('keydown', (e) => { if (e.key === 'Enter') success(text.value); if (e.key === 'Escape') cancel(); });
            input.addEventListener('change', () => success(input.value));
            onRendered(() => input.focus());
            return container;
        }

        _syncFromState() {
            if (!this._table || !this._tableBuilt) return;
            this._updating = true;
            const nodes = state().getNodes();
            const selected = window.PMB.SelectionManager ? window.PMB.SelectionManager.getSelected() : [];
            try {
                const replaced = this._table.replaceData(JSON.parse(JSON.stringify(nodes)));
                if (replaced && typeof replaced.then === 'function') {
                    replaced
                        .then(() => this._syncSelectionFromState(selected))
                        .finally(() => { this._updating = false; });
                    return;
                }
            } catch (err) {
                console.warn('[GridManager] Tabulator replaceData postponed:', err);
            }
            this._updating = false;
        }

        _syncSelectionFromState(selectedIds) {
            if (!this._table || !this._tableBuilt || this._updatingSelection) return;
            this._updatingSelection = true;
            this._table.deselectRow();
            if (selectedIds && selectedIds.length > 0) {
                this._table.selectRow(selectedIds);
                const rows = this._table.getSelectedRows();
                if (rows.length > 0) {
                    this._table.scrollToRow(rows[0], 'center', false);
                }
            }
            this._updatingSelection = false;
        }

        addRow(nodeData) {
            if (!this._table) return;
            state().addNode(nodeData);
        }

        deleteSelectedRow() {
            if (!this._table) return;
            const selected = this._table.getSelectedRows();
            if (selected.length > 0) {
                if (confirm(`Are you sure you want to delete ${selected.length} selected step(s)?`)) {
                    selected.forEach(row => {
                        state().removeNode(row.getData().stepId);
                    });
                    if (window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.clear();
                    }
                }
            }
        }

        getTable() { return this._table; }
    }

    window.PMB = window.PMB || {};
    window.PMB.GridManager = new GridManager();
})();
