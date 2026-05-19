/**
 * ShapeToolbox — Left panel shape palette and swimlane controls
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;
    const NS = 'http://www.w3.org/2000/svg';

    const shapeDefs = [
        { type: 'start', label: 'Start', svg: '<rect x="3" y="6" width="30" height="16" rx="8" fill="#22c55e" stroke="#16a34a"/>' },
        { type: 'end', label: 'End', svg: '<rect x="3" y="6" width="30" height="16" rx="8" fill="#ef4444" stroke="#dc2626"/>' },
        { type: 'process', label: 'Process', svg: '<rect x="3" y="5" width="30" height="18" rx="3" fill="#6366f1" stroke="#4f46e5"/>' },
        { type: 'decision', label: 'Decision', svg: '<polygon points="18,2 33,14 18,26 3,14" fill="#f59e0b" stroke="#d97706"/>' },
        { type: 'document', label: 'Document', svg: '<path d="M3,4 L33,4 L33,22 Q25,18 18,22 Q11,26 3,22 Z" fill="#3b82f6" stroke="#2563eb"/>' },
        { type: 'database', label: 'Database', svg: '<ellipse cx="18" cy="8" rx="14" ry="4" fill="#8b5cf6" stroke="#7c3aed"/><path d="M4,8 L4,20" stroke="#7c3aed" fill="none"/><path d="M32,8 L32,20" stroke="#7c3aed" fill="none"/><ellipse cx="18" cy="20" rx="14" ry="4" fill="#8b5cf6" stroke="#7c3aed"/>' },
        { type: 'comment', label: 'Comment', svg: '<rect x="3" y="5" width="30" height="18" rx="4" fill="#f8fafc" stroke="#94a3b8"/><path d="M8,23 L14,19 L8,19 Z" fill="#f8fafc" stroke="#94a3b8"/>' },
        { type: 'manualInput', label: 'Manual Input', svg: '<polygon points="7,4 33,4 30,24 3,24" fill="#06b6d4" stroke="#0891b2"/>' },
        { type: 'delay', label: 'Delay', svg: '<path d="M3,4 L25,4 A10,10 0 0,1 25,24 L3,24 Z" fill="#f97316" stroke="#ea580c"/>' },
        { type: 'connector', label: 'Connector', svg: '<circle cx="18" cy="14" r="10" fill="#64748b" stroke="#475569"/>' },
        { type: 'subprocess', label: 'Subprocess', svg: '<rect x="3" y="5" width="30" height="18" rx="3" fill="#10b981" stroke="#059669"/><rect x="6" y="8" width="24" height="12" rx="2" fill="none" stroke="#059669" opacity="0.5"/>' },
        { type: 'predefinedProcess', label: 'Predefined Process', svg: '<rect x="3" y="5" width="30" height="18" rx="3" fill="#14b8a6" stroke="#0d9488"/><line x1="8" y1="5" x2="8" y2="23" stroke="#0d9488"/><line x1="28" y1="5" x2="28" y2="23" stroke="#0d9488"/>' },
        { type: 'storedData', label: 'Stored Data', svg: '<path d="M6,5 L33,5 Q30,14 33,23 L6,23 Q3,14 6,5 Z" fill="#ec4899" stroke="#db2777"/>' },
        { type: 'internalStorage', label: 'Internal Storage', svg: '<rect x="3" y="5" width="30" height="18" rx="3" fill="#f43f5e" stroke="#e11d48"/><line x1="3" y1="9" x2="33" y2="9" stroke="#e11d48"/><line x1="8" y1="5" x2="8" y2="23" stroke="#e11d48"/>' },
        { type: 'sequentialData', label: 'Sequential Data', svg: '<circle cx="18" cy="12" r="8" fill="#a855f7" stroke="#9333ea"/><line x1="10" y1="20" x2="26" y2="20" stroke="#9333ea"/>' },
        { type: 'directData', label: 'Direct Data', svg: '<path d="M6,5 L30,5 A4,9 0 0,1 30,23 L6,23 A4,9 0 0,1 6,5 Z" fill="#6366f1" stroke="#4f46e5"/><ellipse cx="6" cy="14" rx="3" ry="9" fill="#6366f1" stroke="#4f46e5"/><ellipse cx="30" cy="14" rx="3" ry="9" fill="none" stroke="#4f46e5"/>' },
        { type: 'card', label: 'Card', svg: '<polygon points="8,5 33,5 33,23 3,23 3,10" fill="#fb923c" stroke="#f97316"/>' },
        { type: 'paperTape', label: 'Paper Tape', svg: '<path d="M3,7 Q11,4 18,7 Q25,10 33,7 L33,21 Q25,24 18,21 Q11,18 3,21 Z" fill="#22c55e" stroke="#16a34a"/>' },
        { type: 'display', label: 'Display', svg: '<path d="M7,5 L28,5 A9,9 0 0,1 28,23 L7,23 L3,14 Z" fill="#eab308" stroke="#ca8a04"/>' },
        { type: 'manualOperation', label: 'Manual Operation', svg: '<polygon points="3,5 33,5 29,23 7,23" fill="#06b6d4" stroke="#0891b2"/>' },
        { type: 'preparation', label: 'Preparation', svg: '<polygon points="7,5 29,5 33,14 29,23 7,23 3,14" fill="#a855f7" stroke="#9333ea"/>' },
        { type: 'annotation', label: 'Annotation', svg: '<path d="M12,5 L5,5 L5,23 L12,23" fill="none" stroke="#64748b" stroke-width="1.5"/><path d="M5,23 L1,27" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="2,2"/>' }
    ];

    const ShapeToolbox = {
        init() {
            this._renderPalette();
            this._renderTemplates();
            this._setupLayoutControls();
            this._setupLaneControls();
            bus().on('state:changed', () => this._refreshLaneList());
            bus().on('state:loaded', () => {
                this._refreshLaneList();
                this._syncLayoutControls();
            });
        },

        _renderPalette() {
            const container = document.getElementById('shape-palette');
            container.innerHTML = '';
            shapeDefs.forEach(def => {
                const item = document.createElement('div');
                item.className = 'shape-item';
                item.setAttribute('draggable', 'true');
                item.setAttribute('data-shape-type', def.type);
                item.innerHTML = `<svg viewBox="0 0 36 28" xmlns="${NS}">${def.svg}</svg><span class="shape-item-label">${def.label}</span>`;

                // Click to add
                item.addEventListener('click', () => {
                    const node = model().createNode({ shapeType: def.type, stepName: def.label });
                    state().addNode(node);
                    setTimeout(() => {
                        if (window.PMB.DiagramRenderer) {
                            window.PMB.DiagramRenderer.autoLayout();
                        }
                    }, 50);
                    bus().emit('toast', 'info', `Added ${def.label} node`);
                });

                // Drag start
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', def.type);
                    e.dataTransfer.effectAllowed = 'copy';
                });

                container.appendChild(item);
            });
        },

        _renderTemplates() {
            const container = document.getElementById('template-list');
            if (!container) return;
            container.innerHTML = '';
            const templates = window.PMB.Templates || {};
            Object.entries(templates).forEach(([key, tmpl]) => {
                const item = document.createElement('div');
                item.className = 'template-item';
                item.textContent = tmpl.name;
                item.addEventListener('click', () => {
                    if (state().getNodes().length > 0) {
                        if (!confirm('This will replace your current diagram. Continue?')) return;
                    }
                    const stateData = JSON.parse(JSON.stringify(tmpl.data));
                    stateData.title = tmpl.name;
                    state().loadState(stateData);
                    model().syncIdCounter(tmpl.data.nodes);
                    bus().emit('toast', 'success', `Loaded template: ${tmpl.name}`);
                });
                container.appendChild(item);
            });
        },

        _setupLaneControls() {
            document.getElementById('btn-add-lane').addEventListener('click', () => {
                this.showLaneModal(null, 'row');
            });

            const addColumnBtn = document.getElementById('btn-add-column-lane');
            if (addColumnBtn) {
                addColumnBtn.addEventListener('click', () => {
                    this.showLaneModal(null, 'column');
                });
            }

            document.getElementById('lane-orientation').addEventListener('change', (e) => {
                state().updateSettings({ laneOrientation: e.target.value });
                window.PMB.DiagramRenderer.autoLayout();
            });
        },

        _refreshLaneList() {
            const container = document.getElementById('lane-list');
            container.innerHTML = '';
            const lanes = state().getLanes() || [];
            const sortedLanes = [...lanes].sort((a, b) => (a.order || 0) - (b.order || 0));
            this._renderLaneItems(container, sortedLanes, 'row');

            const columnContainer = document.getElementById('lane-column-list');
            if (columnContainer) {
                columnContainer.innerHTML = '';
                const cols = state().getLaneColumns ? state().getLaneColumns() : [];
                const sortedCols = [...cols].sort((a, b) => (a.order || 0) - (b.order || 0));
                this._renderLaneItems(columnContainer, sortedCols, 'column');
            }

            // Update swimlane dropdown in properties
            const propSelect = document.getElementById('prop-swimlane');
            if (propSelect) {
                propSelect.innerHTML = '<option value="">(None)</option>';
                lanes.forEach(l => {
                        propSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`;
                    });
            }

            const propColumnSelect = document.getElementById('prop-swimlane-column');
            if (propColumnSelect) {
                propColumnSelect.innerHTML = '<option value="">(None)</option>';
                const columns = state().getLaneColumns ? state().getLaneColumns() : [];
                columns.forEach(c => {
                    propColumnSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                });
            }
        },

        _renderLaneItems(container, lanes, kind) {
            lanes.forEach((lane, idx) => {
                const item = document.createElement('div');
                item.className = 'lane-item';
                item.innerHTML = `
                    <span class="lane-item-color" style="background:${lane.backgroundColor || 'transparent'}; border: 1.5px solid ${lane.borderColor || 'var(--border)'}"></span>
                    <span class="lane-item-name">${lane.name}</span>
                    <div class="lane-item-actions">
                        <button class="lane-item-btn" data-action="up" title="Move Up">↑</button>
                        <button class="lane-item-btn" data-action="down" title="Move Down">↓</button>
                        <button class="lane-item-btn" data-action="edit" title="Edit">✎</button>
                        <button class="lane-item-btn danger" data-action="delete" title="Delete">✕</button>
                    </div>
                `;

                item.querySelector('[data-action="up"]').addEventListener('click', () => {
                    this._moveLane(lane.id, -1, kind);
                });
                item.querySelector('[data-action="down"]').addEventListener('click', () => {
                    this._moveLane(lane.id, 1, kind);
                });

                item.querySelector('[data-action="edit"]').addEventListener('click', () => {
                    this.showLaneModal(lane, kind);
                });
                item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                    const label = kind === 'column' ? 'column swimlane' : 'row swimlane';
                    if (confirm(`Delete ${label} "${lane.name}"?`)) {
                        if (kind === 'column') state().removeLaneColumn(lane.id);
                        else state().removeLane(lane.id);
                    }
                });
                container.appendChild(item);
            });
        },

        _moveLane(laneId, direction, kind) {
            // direction: -1 up, +1 down
            const lanes = kind === 'column' ? (state().getLaneColumns ? state().getLaneColumns() : []) : state().getLanes();
            const sorted = [...(lanes || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            const idx = sorted.findIndex(l => l.id === laneId);
            if (idx === -1) return;
            const newIdx = idx + direction;
            if (newIdx < 0 || newIdx >= sorted.length) return;

            // Swap order values
            const a = sorted[idx];
            const b = sorted[newIdx];
            const aOrder = a.order || 0;
            const bOrder = b.order || 0;

            // Swap order values via StateManager
            if (kind === 'column') {
                if (state().updateLaneColumn) {
                    state().updateLaneColumn(a.id, { order: bOrder });
                    state().updateLaneColumn(b.id, { order: aOrder });
                } else {
                    // fallback: directly set values and emit change
                    a.order = bOrder;
                    b.order = aOrder;
                    state().setState(state().getState());
                }
            } else {
                state().updateLane(a.id, { order: bOrder });
                state().updateLane(b.id, { order: aOrder });
            }
        },

        _setupLayoutControls() {
            const spacingInput = document.getElementById('layout-spacing');
            const spacingVal = document.getElementById('layout-spacing-val');
            const directionInput = document.getElementById('layout-direction');
            const laneOrientationInput = document.getElementById('lane-orientation');

            if (spacingInput && spacingVal) {
                spacingInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    spacingVal.textContent = val + 'px';
                    state().updateSettings({ nodeSpacing: parseInt(val, 10) });
                });

                spacingInput.addEventListener('change', () => {
                    window.PMB.DiagramRenderer.autoLayout(true);
                });
            }

            if (directionInput) {
                directionInput.addEventListener('change', (e) => {
                    state().updateSettings({ flowDirection: e.target.value });
                    window.PMB.DiagramRenderer.autoLayout();
                });
            }
        },

        _syncLayoutControls() {
            const settings = state().getSettings();
            const spacingInput = document.getElementById('layout-spacing');
            const spacingVal = document.getElementById('layout-spacing-val');
            const directionInput = document.getElementById('layout-direction');
            const laneOrientationInput = document.getElementById('lane-orientation');

            if (spacingInput && settings.nodeSpacing !== undefined) {
                spacingInput.value = settings.nodeSpacing;
                if (spacingVal) spacingVal.textContent = settings.nodeSpacing + 'px';
            }
            if (directionInput && settings.flowDirection) {
                directionInput.value = settings.flowDirection;
            }
            if (laneOrientationInput && settings.laneOrientation) {
                laneOrientationInput.value = settings.laneOrientation;
            }
        },

        showLaneModal(laneToEdit = null, kind = 'row') {
            const overlay = document.getElementById('modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const footerEl = document.getElementById('modal-footer');
            if (!overlay || !titleEl || !bodyEl || !footerEl) return;

            const laneKindLabel = kind === 'column' ? 'Column Swimlane' : 'Row Swimlane';
            titleEl.textContent = laneToEdit ? `Edit ${laneKindLabel}` : `Add ${laneKindLabel}`;
            
            // Set up form fields
            const nameVal = laneToEdit ? laneToEdit.name : 'New Lane';
            const hBgVal = laneToEdit ? (laneToEdit.headerBackgroundColor || '') : '';
            const bBgVal = laneToEdit ? (laneToEdit.backgroundColor || '') : '';
            const borderVal = laneToEdit ? (laneToEdit.borderColor || '') : '';
            const fontVal = laneToEdit ? (laneToEdit.fontColor || '') : '';

            // Map empty strings to placeholder hex colors for UI pickers
            const defaultHBg = '#f3f4f6';
            const defaultBBg = '#ffffff';
            const defaultBorder = '#cbd5e1';
            const defaultFont = '#334155';

            bodyEl.innerHTML = `
                <form id="lane-modal-form" style="display:flex; flex-direction:column; gap:16px;">
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text-primary)">${laneKindLabel} Name</label>
                        <input type="text" id="lane-modal-name" class="prop-input" value="${nameVal}" style="width:100%; font-size:13px; padding:6px 10px;" required />
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <label style="font-size:12px; font-weight:600; color:var(--text-primary); width:120px;">Order (position)</label>
                        <input type="number" id="lane-modal-order" class="prop-input" value="${laneToEdit ? (laneToEdit.order ?? 0) : (kind === 'column' ? (state().getLaneColumns ? state().getLaneColumns().length : 0) : state().getLanes().length)}" min="0" style="width:100px;" />
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:12px; font-weight:600; color:var(--text-primary)">Header Background</label>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="color" id="lane-modal-hbg" value="${hBgVal || defaultHBg}" style="width:40px; height:32px; padding:0; border:1.5px solid var(--border); border-radius:4px; cursor:pointer; background:transparent" />
                                <button type="button" id="lane-modal-hbg-reset" class="btn-secondary" style="font-size:11px; padding:4px 8px; height:32px; border-radius:4px; min-width:64px; ${!hBgVal ? 'opacity:0.5;' : ''}">Default</button>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:12px; font-weight:600; color:var(--text-primary)">Body Background</label>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="color" id="lane-modal-bbg" value="${bBgVal || defaultBBg}" style="width:40px; height:32px; padding:0; border:1.5px solid var(--border); border-radius:4px; cursor:pointer; background:transparent" />
                                <button type="button" id="lane-modal-bbg-reset" class="btn-secondary" style="font-size:11px; padding:4px 8px; height:32px; border-radius:4px; min-width:64px; ${!bBgVal ? 'opacity:0.5;' : ''}">Default</button>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:12px; font-weight:600; color:var(--text-primary)">Border Color</label>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="color" id="lane-modal-border" value="${borderVal || defaultBorder}" style="width:40px; height:32px; padding:0; border:1.5px solid var(--border); border-radius:4px; cursor:pointer; background:transparent" />
                                <button type="button" id="lane-modal-border-reset" class="btn-secondary" style="font-size:11px; padding:4px 8px; height:32px; border-radius:4px; min-width:64px; ${!borderVal ? 'opacity:0.5;' : ''}">Default</button>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:12px; font-weight:600; color:var(--text-primary)">Text Color</label>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="color" id="lane-modal-font" value="${fontVal || defaultFont}" style="width:40px; height:32px; padding:0; border:1.5px solid var(--border); border-radius:4px; cursor:pointer; background:transparent" />
                                <button type="button" id="lane-modal-font-reset" class="btn-secondary" style="font-size:11px; padding:4px 8px; height:32px; border-radius:4px; min-width:64px; ${!fontVal ? 'opacity:0.5;' : ''}">Default</button>
                            </div>
                        </div>
                    </div>
                </form>
            `;

            // State variables to track default overrides
            let isHBgDefault = !hBgVal;
            let isBBgDefault = !bBgVal;
            let isBorderDefault = !borderVal;
            let isFontDefault = !fontVal;

            // Select inputs
            const hBgInput = document.getElementById('lane-modal-hbg');
            const hBgReset = document.getElementById('lane-modal-hbg-reset');
            hBgInput.addEventListener('input', () => { isHBgDefault = false; hBgReset.style.opacity = '1'; });
            hBgReset.addEventListener('click', () => { isHBgDefault = true; hBgInput.value = defaultHBg; hBgReset.style.opacity = '0.5'; });

            const bBgInput = document.getElementById('lane-modal-bbg');
            const bBgReset = document.getElementById('lane-modal-bbg-reset');
            bBgInput.addEventListener('input', () => { isBBgDefault = false; bBgReset.style.opacity = '1'; });
            bBgReset.addEventListener('click', () => { isBBgDefault = true; bBgInput.value = defaultBBg; bBgReset.style.opacity = '0.5'; });

            const borderInput = document.getElementById('lane-modal-border');
            const borderReset = document.getElementById('lane-modal-border-reset');
            borderInput.addEventListener('input', () => { isBorderDefault = false; borderReset.style.opacity = '1'; });
            borderReset.addEventListener('click', () => { isBorderDefault = true; borderInput.value = defaultBorder; borderReset.style.opacity = '0.5'; });

            const fontInput = document.getElementById('lane-modal-font');
            const fontReset = document.getElementById('lane-modal-font-reset');
            fontInput.addEventListener('input', () => { isFontDefault = false; fontReset.style.opacity = '1'; });
            fontReset.addEventListener('click', () => { isFontDefault = true; fontInput.value = defaultFont; fontReset.style.opacity = '0.5'; });

            footerEl.innerHTML = `
                <button id="lane-modal-cancel" class="btn-secondary" style="padding:6px 12px; font-size:13px; border-radius:4px;">Cancel</button>
                <button id="lane-modal-save" class="btn-primary" style="padding:6px 12px; font-size:13px; border-radius:4px;">Save Changes</button>
            `;

            const closeModal = () => overlay.classList.add('hidden');

            document.getElementById('lane-modal-cancel').addEventListener('click', closeModal);
            document.getElementById('modal-close').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

            document.getElementById('lane-modal-save').addEventListener('click', () => {
                const name = document.getElementById('lane-modal-name').value.trim();
                if (!name) {
                    bus().emit('toast', 'error', 'Swimlane name is required');
                    return;
                }

                const finalHBg = isHBgDefault ? '' : hBgInput.value;
                const finalBBg = isBBgDefault ? '' : bBgInput.value;
                const finalBorder = isBorderDefault ? '' : borderInput.value;
                const finalFont = isFontDefault ? '' : fontInput.value;
                const orderVal = parseInt(document.getElementById('lane-modal-order').value, 10) || 0;

                if (laneToEdit) {
                    const updates = {
                        name,
                        headerBackgroundColor: finalHBg,
                        backgroundColor: finalBBg,
                        borderColor: finalBorder,
                        fontColor: finalFont,
                        order: orderVal
                    };
                    if (kind === 'column') {
                        if (state().updateLaneColumn) state().updateLaneColumn(laneToEdit.id, updates);
                        else { Object.assign(laneToEdit, updates); state().setState(state().getState()); }
                    } else {
                        state().updateLane(laneToEdit.id, updates);
                    }
                    bus().emit('toast', 'success', 'Swimlane updated');
                } else {
                    const newLane = model().createLane({
                        name,
                        headerBackgroundColor: finalHBg,
                        backgroundColor: finalBBg,
                        borderColor: finalBorder,
                        fontColor: finalFont,
                        order: orderVal
                    });
                    if (kind === 'column') {
                        state().addLaneColumn(newLane);
                    } else {
                        state().addLane(newLane);
                    }
                    bus().emit('toast', 'success', `${laneKindLabel} added`);
                }
                closeModal();
            });

            overlay.classList.remove('hidden');
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.ShapeToolbox = ShapeToolbox;
})();
