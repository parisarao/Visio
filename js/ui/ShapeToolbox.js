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
        { type: 'manualInput', label: 'Manual Input', svg: '<polygon points="7,4 33,4 30,24 3,24" fill="#06b6d4" stroke="#0891b2"/>' },
        { type: 'delay', label: 'Delay', svg: '<path d="M3,4 L25,4 A10,10 0 0,1 25,24 L3,24 Z" fill="#f97316" stroke="#ea580c"/>' },
        { type: 'connector', label: 'Connector', svg: '<circle cx="18" cy="14" r="10" fill="#64748b" stroke="#475569"/>' },
        { type: 'subprocess', label: 'Subprocess', svg: '<rect x="3" y="5" width="30" height="18" rx="3" fill="#10b981" stroke="#059669"/><rect x="6" y="8" width="24" height="12" rx="2" fill="none" stroke="#059669" opacity="0.5"/>' }
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
            const lanes = state().getLanes();
            this._renderLaneItems(container, lanes, 'row');

            const columnContainer = document.getElementById('lane-column-list');
            if (columnContainer) {
                columnContainer.innerHTML = '';
                this._renderLaneItems(columnContainer, state().getLaneColumns ? state().getLaneColumns() : [], 'column');
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
            lanes.forEach(lane => {
                const item = document.createElement('div');
                item.className = 'lane-item';
                item.innerHTML = `
                    <span class="lane-item-color" style="background:${lane.backgroundColor || 'transparent'}; border: 1.5px solid ${lane.borderColor || 'var(--border)'}"></span>
                    <span class="lane-item-name">${lane.name}</span>
                    <div class="lane-item-actions">
                        <button class="lane-item-btn" data-action="edit" title="Edit">✎</button>
                        <button class="lane-item-btn danger" data-action="delete" title="Delete">✕</button>
                    </div>
                `;
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

                if (laneToEdit) {
                    laneToEdit.name = name;
                    laneToEdit.headerBackgroundColor = finalHBg;
                    laneToEdit.backgroundColor = finalBBg;
                    laneToEdit.borderColor = finalBorder;
                    laneToEdit.fontColor = finalFont;
                    state().setState(state().getState());
                    bus().emit('toast', 'success', 'Swimlane updated');
                } else {
                    const newLane = model().createLane({
                        name,
                        headerBackgroundColor: finalHBg,
                        backgroundColor: finalBBg,
                        borderColor: finalBorder,
                        fontColor: finalFont,
                        order: kind === 'column'
                            ? (state().getLaneColumns ? state().getLaneColumns().length : 0)
                            : state().getLanes().length
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
