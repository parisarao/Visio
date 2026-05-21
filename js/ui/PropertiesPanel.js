/**
 * PropertiesPanel — Right panel for editing selected node properties
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;

    const PropertiesPanel = {
        _currentNodeId: null,
        _updating: false,

        init() {
            // Listen to unified selection change event to swap panels (default, single, multiple)
            bus().on('selection:changed', (ids) => this._onSelectionChanged(ids));
            
            // Retain node:selected listener for legacy triggers, routing it safely to SelectionManager
            bus().on('node:selected', (id) => {
                if (window.PMB.SelectionManager) {
                    if (id) {
                        window.PMB.SelectionManager.selectMultiple([id]);
                    } else {
                        window.PMB.SelectionManager.clear();
                    }
                } else {
                    this._onSelectionChanged(id ? [id] : []);
                }
            });

            bus().on('state:loaded', () => {
                const selected = window.PMB.SelectionManager ? window.PMB.SelectionManager.getSelected() : [];
                this._onSelectionChanged(selected);
            });

            // Bind all single property inputs
            const fields = [
                { el: 'prop-step-name', field: 'stepName' },
                { el: 'prop-description', field: 'description' },
                { el: 'prop-shape-type', field: 'shapeType' },
                { el: 'prop-swimlane', field: 'swimlane' },
                { el: 'prop-swimlane-column', field: 'swimlaneColumn' },
                { el: 'prop-layout-flow', field: 'layoutFlow' },
                { el: 'prop-yes-flow-dir', field: 'yesFlowDir' },
                { el: 'prop-no-flow-dir', field: 'noFlowDir' },
                { el: 'prop-step-spacing', field: 'stepSpacing', type: 'number' },
                { el: 'prop-yes-path', field: 'yesPath' },
                { el: 'prop-no-path', field: 'noPath' },
                { el: 'prop-yes-label', field: 'yesLabel' },
                { el: 'prop-no-label', field: 'noLabel' },
                { el: 'prop-font-color', field: 'fontColor' },
                { el: 'prop-border-color', field: 'borderColor' },
                { el: 'prop-font-size', field: 'fontSize', type: 'number' },
                { el: 'prop-font-style', field: 'fontStyle' },
                { el: 'prop-width', field: 'width', type: 'number' },
                { el: 'prop-height', field: 'height', type: 'number' },
                { el: 'prop-x-pos', field: 'x', type: 'number' },
                { el: 'prop-y-pos', field: 'y', type: 'number' },
                { el: 'prop-conn-label', field: 'connectionLabel' },
                { el: 'prop-notes', field: 'notes' }
            ];

            fields.forEach(f => {
                const input = document.getElementById(f.el);
                if (!input) return;
                const evt = (input.type === 'color') ? 'input' : 'change';
                input.addEventListener(evt, () => {
                    if (this._updating || !this._currentNodeId) return;
                    let val = input.value;
                    if (f.type === 'number') {
                        if (f.field === 'stepSpacing' || f.field === 'fontSize') {
                            val = val === '' ? null : (parseInt(val, 10) || 0);
                        } else {
                            val = parseInt(val, 10) || 0;
                        }
                    }
                    state().updateNode(this._currentNodeId, { [f.field]: val });

                    // Auto layout immediately on flow direction or spacing changes to show the results
                    if (f.field === 'layoutFlow' || f.field === 'yesFlowDir' || f.field === 'noFlowDir' || f.field === 'stepSpacing') {
                        window.PMB.DiagramRenderer.autoLayout(true, true);
                    }
                });
                // Also listen to input for text fields for live preview
                if (input.type === 'text' || input.tagName === 'TEXTAREA' || f.el === 'prop-x-pos' || f.el === 'prop-y-pos' || f.el === 'prop-step-spacing' || f.el === 'prop-font-size') {
                    input.addEventListener('input', () => {
                        if (this._updating || !this._currentNodeId) return;
                        let val = input.value;
                        if (f.type === 'number') {
                            if (f.field === 'stepSpacing' || f.field === 'fontSize') {
                                val = val === '' ? null : (parseInt(val, 10) || 0);
                            } else {
                                val = parseInt(val, 10) || 0;
                            }
                        }
                        state().updateNode(this._currentNodeId, { [f.field]: val });
                        if (f.field === 'stepSpacing') {
                            window.PMB.DiagramRenderer.autoLayout(true, true);
                        }
                    });
                }
            });

            // Bind Next Step(s) manual controls
            const nextStepSelect = document.getElementById('prop-next-step');
            if (nextStepSelect) {
                nextStepSelect.addEventListener('change', () => {
                    if (this._updating || !this._currentNodeId) return;
                    const val = nextStepSelect.value;
                    if (!val) return; // ignore add connection placeholder
                    
                    const node = state().getNodes().find(n => n.stepId === this._currentNodeId);
                    if (!node) return;
                    
                    let nextIds = (node.nextStep || '').split(',').map(s => s.trim()).filter(Boolean);
                    if (!nextIds.includes(val)) {
                        nextIds.push(val);
                        const newNextStr = nextIds.join(', ');
                        state().updateNode(this._currentNodeId, { nextStep: newNextStr });
                        // Re-render tags and refresh dropdown to filter out added item
                        this._renderNextStepsTags(node);
                        this._fillSinglePanel(this._currentNodeId); 
                    }
                });
            }

            const clearNextBtn = document.getElementById('btn-clear-next-steps');
            if (clearNextBtn) {
                clearNextBtn.addEventListener('click', () => {
                    if (this._updating || !this._currentNodeId) return;
                    const node = state().getNodes().find(n => n.stepId === this._currentNodeId);
                    if (!node) return;
                    
                    state().updateNode(this._currentNodeId, { nextStep: '' });
                    this._renderNextStepsTags(node);
                    this._fillSinglePanel(this._currentNodeId);
                });
            }

            // Bind multi-select coordinate inputs for bulk alignment
            const multiXInput = document.getElementById('prop-multi-x-pos');
            if (multiXInput) {
                const handleMultiX = () => {
                    if (this._updating) return;
                    const val = parseInt(multiXInput.value, 10);
                    if (!isNaN(val) && window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.setMultiX(val);
                    }
                };
                multiXInput.addEventListener('change', handleMultiX);
                multiXInput.addEventListener('input', handleMultiX);
            }

            const multiYInput = document.getElementById('prop-multi-y-pos');
            if (multiYInput) {
                const handleMultiY = () => {
                    if (this._updating) return;
                    const val = parseInt(multiYInput.value, 10);
                    if (!isNaN(val) && window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.setMultiY(val);
                    }
                };
                multiYInput.addEventListener('change', handleMultiY);
                multiYInput.addEventListener('input', handleMultiY);
            }

            const multiWidthInput = document.getElementById('prop-multi-width');
            if (multiWidthInput) {
                const handleMultiWidth = () => {
                    if (this._updating) return;
                    const val = parseInt(multiWidthInput.value, 10);
                    if (!isNaN(val) && window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.setMultiWidth(val);
                    }
                };
                multiWidthInput.addEventListener('change', handleMultiWidth);
                multiWidthInput.addEventListener('input', handleMultiWidth);
            }

            const multiHeightInput = document.getElementById('prop-multi-height');
            if (multiHeightInput) {
                const handleMultiHeight = () => {
                    if (this._updating) return;
                    const val = parseInt(multiHeightInput.value, 10);
                    if (!isNaN(val) && window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.setMultiHeight(val);
                    }
                };
                multiHeightInput.addEventListener('change', handleMultiHeight);
                multiHeightInput.addEventListener('input', handleMultiHeight);
            }

            // Bind multi-select alignment and distribution buttons
            const bindMultiBtn = (btnId, smMethod) => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (window.PMB.SelectionManager) {
                            window.PMB.SelectionManager[smMethod]();
                        }
                    });
                }
            };
            bindMultiBtn('btn-multi-align-left', 'alignLeft');
            bindMultiBtn('btn-multi-align-center', 'alignCenter');
            bindMultiBtn('btn-multi-align-top', 'alignTop');
            bindMultiBtn('btn-multi-align-bottom', 'alignBottom');
            bindMultiBtn('btn-multi-align-middle', 'alignMiddle');
            bindMultiBtn('btn-multi-dist-horiz', 'distributeHorizontally');
            bindMultiBtn('btn-multi-dist-vert', 'distributeVertically');

            // Bind multi-select styling inputs
            const multiBgColor = document.getElementById('prop-multi-bg-color');
            const multiBgTrans = document.getElementById('prop-multi-bg-trans');
            const updateMultiBg = () => {
                if (this._updating) return;
                let val = multiBgColor.value;
                if (multiBgTrans) {
                    multiBgColor.disabled = multiBgTrans.checked;
                    if (multiBgTrans.checked) val = 'transparent';
                }
                if (window.PMB.SelectionManager) {
                    window.PMB.SelectionManager.setMultiStyle('backgroundColor', val);
                }
            };
            if (multiBgColor) {
                multiBgColor.addEventListener('input', updateMultiBg);
                multiBgColor.addEventListener('change', updateMultiBg);
            }
            if (multiBgTrans) {
                multiBgTrans.addEventListener('change', updateMultiBg);
            }

            const multiFontColor = document.getElementById('prop-multi-font-color');
            if (multiFontColor) {
                multiFontColor.addEventListener('input', () => {
                    if (this._updating) return;
                    if (window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.setMultiStyle('fontColor', multiFontColor.value);
                    }
                });
            }

            const multiBorderColor = document.getElementById('prop-multi-border-color');
            if (multiBorderColor) {
                multiBorderColor.addEventListener('input', () => {
                    if (this._updating) return;
                    if (window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.setMultiStyle('borderColor', multiBorderColor.value);
                    }
                });
            }

            // Handle shape type change to toggle flow UI
            const shapeTypeSelect = document.getElementById('prop-shape-type');
            if (shapeTypeSelect) {
                shapeTypeSelect.addEventListener('change', () => {
                    if (this._updating || !this._currentNodeId) return;
                    this._updateFlowUI(shapeTypeSelect.value);
                });
            }

            // Bind individual node background color styling (Fill Color & Trans Checkbox)
            const nodeBgColor = document.getElementById('prop-bg-color');
            const nodeBgTrans = document.getElementById('prop-bg-color-trans');
            
            const updateNodeBg = () => {
                if (this._updating || !this._currentNodeId) return;
                let val = nodeBgColor.value;
                if (nodeBgTrans) {
                    nodeBgColor.disabled = nodeBgTrans.checked;
                    if (nodeBgTrans.checked) {
                        val = 'transparent';
                    }
                }
                state().updateNode(this._currentNodeId, { backgroundColor: val });
            };

            if (nodeBgColor) {
                nodeBgColor.addEventListener('input', updateNodeBg);
                nodeBgColor.addEventListener('change', updateNodeBg);
            }
            if (nodeBgTrans) {
                nodeBgTrans.addEventListener('change', updateNodeBg);
            }

            // Listen to node updates to update X/Y inputs in real time when dragging shapes
            bus().on('node:updated', (id, updates) => {
                if (id === this._currentNodeId && !this._updating) {
                    this._updating = true;
                    if (updates.x !== undefined) document.getElementById('prop-x-pos').value = Math.round(updates.x);
                    if (updates.y !== undefined) document.getElementById('prop-y-pos').value = Math.round(updates.y);
                    this._updating = false;
                } else if (!this._currentNodeId && !this._updating && window.PMB.SelectionManager && window.PMB.SelectionManager.getSelected().includes(id)) {
                    // Update multi-select pre-fills if selected items are dragged on the canvas
                    const selected = window.PMB.SelectionManager.getSelected();
                    this._updating = true;
                    if (selected[0] === id) {
                        if (updates.x !== undefined) document.getElementById('prop-multi-x-pos').value = Math.round(updates.x);
                        if (updates.y !== undefined) document.getElementById('prop-multi-y-pos').value = Math.round(updates.y);
                    }
                    this._updating = false;
                }
            });

            // Bind default diagram properties
            const titleInput = document.getElementById('prop-diagram-title');
            if (titleInput) {
                titleInput.addEventListener('input', () => {
                    if (this._updating) return;
                    state().setTitle(titleInput.value);
                    const topTitleInput = document.getElementById('diagram-title-input');
                    if (topTitleInput) topTitleInput.value = titleInput.value;
                });
            }

            // Sync diagram title from top header change event
            bus().on('title:changed', (newTitle) => {
                if (titleInput && titleInput.value !== newTitle) {
                    titleInput.value = newTitle;
                }
            });

            // Default shapes and lanes styling fields
            const stylingFields = [
                { elId: 'default-shape-bg', transId: 'default-shape-bg-trans', key: 'defaultShapeBg' },
                { elId: 'default-shape-font', key: 'defaultShapeFont' },
                { elId: 'default-shape-border', key: 'defaultShapeBorder' },
                { elId: 'default-shape-font-size', key: 'defaultShapeFontSize', type: 'number' },
                { elId: 'default-shape-font-style', key: 'defaultShapeFontStyle' },
                { elId: 'default-lane-header-bg', transId: 'default-lane-header-bg-trans', key: 'defaultLaneHeaderBg' },
                { elId: 'default-lane-header-font', key: 'defaultLaneHeaderFont' },
                { elId: 'default-lane-border', key: 'defaultLaneBorder' },
                { elId: 'default-title-bg', transId: 'default-title-bg-trans', key: 'diagramTitleBg' },
                { elId: 'default-title-font', key: 'diagramTitleFont' },
                { elId: 'default-title-border', key: 'diagramTitleBorder' }
            ];

            stylingFields.forEach(f => {
                const colorEl = document.getElementById(f.elId);
                const transEl = f.transId ? document.getElementById(f.transId) : null;
                
                if (!colorEl) return;

                const updateStylingSetting = () => {
                    if (this._updating) return;
                    const settings = state().getSettings();
                    let val = colorEl.value;
                    if (f.type === 'number') {
                        val = parseInt(val, 10) || 12;
                    }
                    if (transEl) {
                        colorEl.disabled = transEl.checked;
                        if (transEl.checked) {
                            val = 'transparent';
                        }
                    }
                    state().updateSettings({ [f.key]: val });
                    window.PMB.DiagramRenderer.scheduleRender();
                };

                colorEl.addEventListener('input', updateStylingSetting);
                colorEl.addEventListener('change', updateStylingSetting);
                if (transEl) {
                    transEl.addEventListener('change', updateStylingSetting);
                }
            });

            // Bind the diagram settings button in the toolbar
            const settingsBtn = document.getElementById('btn-diagram-settings');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    if (window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.clear();
                    }
                    const rightPanel = document.getElementById('right-panel');
                    if (rightPanel && rightPanel.classList.contains('collapsed')) {
                        const collapseBtn = document.getElementById('btn-collapse-right');
                        if (collapseBtn) collapseBtn.click();
                    }
                });
            }

            // Bind Diagram Title Click to show settings in properties panel
            const topTitleInput = document.getElementById('diagram-title-input');
            if (topTitleInput) {
                topTitleInput.addEventListener('click', () => {
                    if (window.PMB.SelectionManager) {
                        window.PMB.SelectionManager.clear();
                    }
                    const rightPanel = document.getElementById('right-panel');
                    if (rightPanel && rightPanel.classList.contains('collapsed')) {
                        const collapseBtn = document.getElementById('btn-collapse-right');
                        if (collapseBtn) collapseBtn.click();
                    }
                });
            }

            // Reactively re-fill fields when state / settings change
            bus().on('state:changed', () => {
                const selected = window.PMB.SelectionManager ? window.PMB.SelectionManager.getSelected() : [];
                this._onSelectionChanged(selected);
            });

            // Show default panel on load
            this._onSelectionChanged([]);
        },

        _renderNextStepsTags(node) {
            const container = document.getElementById('next-steps-tags-container');
            if (!container) return;
            container.innerHTML = '';
            
            const nextStepVal = node.nextStep || '';
            const nextIds = nextStepVal.split(',').map(s => s.trim()).filter(Boolean);
            
            if (nextIds.length === 0) {
                container.innerHTML = '<span style="font-size:11px; color:var(--text-muted); font-style:italic; padding: 2px 0;">No connections</span>';
                return;
            }
            
            const allNodes = state().getNodes() || [];
            nextIds.forEach(id => {
                const targetNode = allNodes.find(n => n.stepId === id);
                const name = targetNode ? (targetNode.stepName || 'Unnamed') : 'Missing';
                
                const tag = document.createElement('div');
                tag.style.cssText = 'display:inline-flex; align-items:center; gap:4px; background:var(--accent); color:#ffffff; font-size:11px; font-weight:500; padding:2px 8px; border-radius:12px; margin:2px 0; margin-right:4px; flex-shrink:0;';
                
                const label = document.createElement('span');
                label.textContent = `${id}: ${name.substring(0, 8)}${name.length > 8 ? '..' : ''}`;
                label.title = `${id}: ${name}`;
                tag.appendChild(label);
                
                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.cssText = 'cursor:pointer; font-weight:bold; font-size:13px; line-height:1; display:inline-block; margin-left:4px; color:rgba(255,255,255,0.7);';
                removeBtn.title = `Remove connection to ${id}`;
                removeBtn.addEventListener('mouseover', () => { removeBtn.style.color = '#ffffff'; });
                removeBtn.addEventListener('mouseout', () => { removeBtn.style.color = 'rgba(255,255,255,0.7)'; });
                
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this._updating) return;
                    let currentIds = (node.nextStep || '').split(',').map(s => s.trim()).filter(Boolean);
                    currentIds = currentIds.filter(cid => cid !== id);
                    const newNextStr = currentIds.join(', ');
                    
                    state().updateNode(node.stepId, { nextStep: newNextStr });
                    this._renderNextStepsTags(node);
                    this._fillSinglePanel(node.stepId);
                });
                
                tag.appendChild(removeBtn);
                container.appendChild(tag);
            });
        },

        _updateFlowUI(shapeType) {
            const flowGroup = document.getElementById('prop-layout-flow-group');
            const decisionRow = document.getElementById('decision-flow-row');
            if (!flowGroup || !decisionRow) return;

            if (shapeType === 'decision') {
                flowGroup.style.display = 'none';
                decisionRow.style.display = 'flex';
            } else {
                flowGroup.style.display = 'block';
                decisionRow.style.display = 'none';
            }
        },

        _onSelectionChanged(ids) {
            const emptyEl = document.getElementById('properties-empty');
            const formEl = document.getElementById('properties-form');
            const defaultEl = document.getElementById('properties-default');
            const multiEl = document.getElementById('properties-multiselect');

            if (!ids || ids.length === 0) {
                if (multiEl) multiEl.classList.add('hidden');
                if (formEl) formEl.classList.add('hidden');
                if (emptyEl) emptyEl.classList.add('hidden');
                if (defaultEl) {
                    defaultEl.classList.remove('hidden');
                    this._currentNodeId = null;
                    this._fillDefaultPanel();
                }
                return;
            }

            if (ids.length === 1) {
                if (multiEl) multiEl.classList.add('hidden');
                if (defaultEl) defaultEl.classList.add('hidden');
                if (emptyEl) emptyEl.classList.add('hidden');
                if (formEl) {
                    formEl.classList.remove('hidden');
                    this._currentNodeId = ids[0];
                    this._fillSinglePanel(ids[0]);
                }
                return;
            }

            // Multiple shapes selected!
            if (emptyEl) emptyEl.classList.add('hidden');
            if (defaultEl) defaultEl.classList.add('hidden');
            if (formEl) formEl.classList.add('hidden');
            if (multiEl) {
                multiEl.classList.remove('hidden');
                this._currentNodeId = null; // No single node editing
                this._updating = true;
                
                // Update selected count badge
                const countBadge = document.getElementById('prop-multi-count');
                if (countBadge) {
                    countBadge.textContent = `${ids.length} selected`;
                }

                // Prefill fields with values of the first selected node
                const nodes = state().getNodes();
                const selNodes = nodes.filter(n => ids.includes(n.stepId));
                
                if (selNodes.length > 0) {
                    const first = selNodes[0];
                    document.getElementById('prop-multi-x-pos').value = Math.round(first.x || 0);
                    document.getElementById('prop-multi-y-pos').value = Math.round(first.y || 0);
                    const multiWidth = document.getElementById('prop-multi-width');
                    const multiHeight = document.getElementById('prop-multi-height');
                    if (multiWidth) multiWidth.value = Math.round(first.width || 140);
                    if (multiHeight) multiHeight.value = Math.round(first.height || 60);
                    
                    const multiBg = document.getElementById('prop-multi-bg-color');
                    const multiBgTrans = document.getElementById('prop-multi-bg-trans');
                    const isTrans = first.backgroundColor === 'transparent';
                    if (multiBgTrans && multiBg) {
                        multiBgTrans.checked = isTrans;
                        multiBg.disabled = isTrans;
                        multiBg.value = isTrans ? '#ffffff' : (first.backgroundColor || '#ffffff');
                    }
                    
                    const multiFont = document.getElementById('prop-multi-font-color');
                    if (multiFont) multiFont.value = first.fontColor || '#000000';
                    
                    const multiBorder = document.getElementById('prop-multi-border-color');
                    if (multiBorder) multiBorder.value = first.borderColor || '#000000';
                }
                
                this._updating = false;
            }
        },

        _fillDefaultPanel() {
            this._updating = true;
            const settings = state().getSettings() || {};
            const titleInput = document.getElementById('prop-diagram-title');
            if (titleInput) titleInput.value = state().getTitle();

            const stylingFields = [
                { elId: 'default-shape-bg', transId: 'default-shape-bg-trans', key: 'defaultShapeBg' },
                { elId: 'default-shape-font', key: 'defaultShapeFont' },
                { elId: 'default-shape-border', key: 'defaultShapeBorder' },
                { elId: 'default-shape-font-size', key: 'defaultShapeFontSize', type: 'number' },
                { elId: 'default-shape-font-style', key: 'defaultShapeFontStyle' },
                { elId: 'default-lane-header-bg', transId: 'default-lane-header-bg-trans', key: 'defaultLaneHeaderBg' },
                { elId: 'default-lane-header-font', key: 'defaultLaneHeaderFont' },
                { elId: 'default-lane-border', key: 'defaultLaneBorder' },
                { elId: 'default-title-bg', transId: 'default-title-bg-trans', key: 'diagramTitleBg' },
                { elId: 'default-title-font', key: 'diagramTitleFont' },
                { elId: 'default-title-border', key: 'diagramTitleBorder' }
            ];

            stylingFields.forEach(f => {
                const colorEl = document.getElementById(f.elId);
                const transEl = f.transId ? document.getElementById(f.transId) : null;
                if (!colorEl) return;

                let val = settings[f.key];
                if (val === undefined) {
                    if (f.key === 'defaultShapeFontSize') val = 12;
                    else if (f.key === 'defaultShapeFontStyle') val = 'normal';
                    else val = f.key.toLowerCase().includes('bg') ? 'transparent' : '#000000';
                }

                if (transEl) {
                    const isTrans = val === 'transparent';
                    transEl.checked = isTrans;
                    colorEl.disabled = isTrans;
                    if (!isTrans) colorEl.value = val;
                } else {
                    colorEl.value = val;
                }
            });
            this._updating = false;
        },

        _fillSinglePanel(id) {
            const node = state().getNodes().find(n => n.stepId === id);
            if (!node) return;

            this._updating = true;

            const settings = state().getSettings() || {};
            const defBg = settings.defaultShapeBg || 'transparent';
            const defFont = settings.defaultShapeFont || '#000000';
            const defBorder = settings.defaultShapeBorder || '#000000';

            const bgVal = node.backgroundColor !== undefined ? node.backgroundColor : defBg;
            const fontVal = node.fontColor !== undefined ? node.fontColor : defFont;
            const borderVal = node.borderColor !== undefined ? node.borderColor : defBorder;

            document.getElementById('prop-step-id').value = node.stepId;
            document.getElementById('prop-step-name').value = node.stepName || '';
            document.getElementById('prop-description').value = node.description || '';
            document.getElementById('prop-shape-type').value = node.shapeType || 'process';
            
            // Populate swimlane options
            const swimlaneSelect = document.getElementById('prop-swimlane');
            if (swimlaneSelect) {
                swimlaneSelect.innerHTML = '<option value="">[No Swimlane]</option>';
                const lanes = state().getLanes() || [];
                lanes.forEach(l => {
                    const opt = document.createElement('option');
                    opt.value = l.id;
                    opt.textContent = l.name;
                    swimlaneSelect.appendChild(opt);
                });
                swimlaneSelect.value = node.swimlane || '';
            }

            const swimlaneColumnSelect = document.getElementById('prop-swimlane-column');
            if (swimlaneColumnSelect) {
                swimlaneColumnSelect.innerHTML = '<option value="">[No Column]</option>';
                const columns = state().getLaneColumns ? (state().getLaneColumns() || []) : [];
                columns.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    swimlaneColumnSelect.appendChild(opt);
                });
                swimlaneColumnSelect.value = node.swimlaneColumn || '';
            }

            document.getElementById('prop-layout-flow').value = node.layoutFlow || 'default';
            document.getElementById('prop-yes-flow-dir').value = node.yesFlowDir || 'default';
            document.getElementById('prop-no-flow-dir').value = node.noFlowDir || 'default';
            document.getElementById('prop-step-spacing').value = (node.stepSpacing !== null && node.stepSpacing !== undefined) ? node.stepSpacing : '';
            // Populate dynamic dropdown selects for paths
            const allNodes = state().getNodes() || [];
            const otherNodes = allNodes.filter(n => n.stepId !== id);

            // Populate prop-next-step multi-dropdown, filtering out existing connections
            const nextStepSelect = document.getElementById('prop-next-step');
            if (nextStepSelect) {
                nextStepSelect.innerHTML = '<option value="">(Add Connection...)</option>';
                const connectedIds = (node.nextStep || '').split(',').map(s => s.trim()).filter(Boolean);
                const nextStepOptions = allNodes.filter(n => n.stepId !== id && !connectedIds.includes(n.stepId));
                nextStepOptions.forEach(n => {
                    const opt = document.createElement('option');
                    opt.value = n.stepId;
                    opt.textContent = `${n.stepId}: ${n.stepName || 'Unnamed'}`;
                    nextStepSelect.appendChild(opt);
                });
                nextStepSelect.value = '';
            }

            const populateDropdown = (selectElId, currentValue) => {
                const selectEl = document.getElementById(selectElId);
                if (!selectEl) return;
                
                // Clear existing
                selectEl.innerHTML = '<option value="">(None)</option>';
                
                // Add options
                otherNodes.forEach(n => {
                    const opt = document.createElement('option');
                    opt.value = n.stepId;
                    opt.textContent = `${n.stepId}: ${n.stepName || 'Unnamed'}`;
                    selectEl.appendChild(opt);
                });
                
                // Set current value
                selectEl.value = currentValue || '';
            };

            populateDropdown('prop-yes-path', node.yesPath);
            populateDropdown('prop-no-path', node.noPath);
            this._renderNextStepsTags(node);
            const yesLabelEl = document.getElementById('prop-yes-label');
            const noLabelEl = document.getElementById('prop-no-label');
            if (yesLabelEl) yesLabelEl.value = node.yesLabel || 'Yes';
            if (noLabelEl) noLabelEl.value = node.noLabel || 'No';

            this._updateFlowUI(node.shapeType || 'process');

            // Handle background trans checkbox
            const nodeBgColor = document.getElementById('prop-bg-color');
            const nodeBgTrans = document.getElementById('prop-bg-color-trans');
            if (nodeBgColor && nodeBgTrans) {
                const isTrans = bgVal === 'transparent';
                nodeBgTrans.checked = isTrans;
                nodeBgColor.disabled = isTrans;
                nodeBgColor.value = isTrans ? '#ffffff' : bgVal;
            }

            document.getElementById('prop-font-color').value = fontVal === 'transparent' ? '#000000' : fontVal;
            document.getElementById('prop-border-color').value = borderVal === 'transparent' ? '#000000' : borderVal;
            
            document.getElementById('prop-font-size').value = (node.fontSize !== null && node.fontSize !== undefined) ? node.fontSize : '';
            document.getElementById('prop-font-style').value = node.fontStyle || '';

            document.getElementById('prop-width').value = node.width || 140;
            document.getElementById('prop-height').value = node.height || 60;
            document.getElementById('prop-x-pos').value = Math.round(node.x || 0);
            document.getElementById('prop-y-pos').value = Math.round(node.y || 0);
            document.getElementById('prop-conn-label').value = node.connectionLabel || '';
            document.getElementById('prop-notes').value = node.notes || '';
            
            this._updating = false;
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.PropertiesPanel = PropertiesPanel;
})();
