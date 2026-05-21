/**
 * ExcelImporter — Import and copy-paste process steps from Excel sheets
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;

    const FIELD_OPTIONS = [
        { value: '', text: '[Ignore Column]' },
        { value: 'stepId', text: 'Step ID' },
        { value: 'stepName', text: 'Step Name' },
        { value: 'description', text: 'Description' },
        { value: 'shapeType', text: 'Shape Type' },
        { value: 'swimlane', text: 'Swimlane' },
        { value: 'swimlaneColumn', text: 'Column Swimlane' },
        { value: 'nextStep', text: 'Next Step' },
        { value: 'yesPath', text: 'Yes Path (Decisions)' },
        { value: 'noPath', text: 'No Path (Decisions)' },
        { value: 'backgroundColor', text: 'BG Color' },
        { value: 'fontColor', text: 'Font Color' },
        { value: 'borderColor', text: 'Border Color' },
        { value: 'connectionLineColor', text: 'Line Color' },
        { value: 'connectionLabel', text: 'Conn. Label' },
        { value: 'yesLabel', text: 'Yes Label' },
        { value: 'noLabel', text: 'No Label' },
        { value: 'width', text: 'Width' },
        { value: 'height', text: 'Height' },
        { value: 'x', text: 'X Position' },
        { value: 'y', text: 'Y Position' },
        { value: 'icon', text: 'Icon' },
        { value: 'notes', text: 'Notes' }
    ];

    const SHAPE_MAP = {
        'start': 'start',
        'end': 'end',
        'process': 'process',
        'step': 'process',
        'activity': 'process',
        'decision': 'decision',
        'if': 'decision',
        'document': 'document',
        'doc': 'document',
        'database': 'database',
        'db': 'database',
        'manualinput': 'manualInput',
        'manual input': 'manualInput',
        'input': 'manualInput',
        'delay': 'delay',
        'wait': 'delay',
        'connector': 'connector',
        'subprocess': 'subprocess',
        'sub process': 'subprocess'
    };

    class ExcelImporter {
        constructor() {
            this._parsedData = null;
        }

        init() {
            // Can listen to key events or actions if registered globally
        }

        showModal(preloadedText = '') {
            this._swimlaneOrder = null; // Reset custom swimlane order sequence for new import session
            const overlay = document.getElementById('modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const footerEl = document.getElementById('modal-footer');
            const modal = document.getElementById('modal');

            if (!overlay || !titleEl || !bodyEl || !footerEl) return;

            // Reset modal overlay hidden and configure class
            modal.classList.add('excel-modal');
            overlay.classList.remove('hidden');

            titleEl.textContent = 'Paste & Import Steps from Excel';
            
            // Phase 1: Paste area layout
            this._renderPastePhase(bodyEl, footerEl, preloadedText);
            
            // If text was preloaded (e.g. from global Ctrl+V), trigger paste handling immediately
            if (preloadedText) {
                const textarea = document.getElementById('excel-paste-textarea');
                if (textarea) {
                    textarea.value = preloadedText;
                    this._handlePastedText(preloadedText, bodyEl, footerEl);
                }
            }
        }

        _renderPastePhase(bodyEl, footerEl, preloadedText) {
            bodyEl.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div class="excel-paste-box" id="excel-paste-box">
                        <svg class="excel-paste-icon" fill="currentColor" viewBox="0 0 24 24" width="48" height="48">
                            <path d="M16.2 2H7.8C6.8 2 6 2.8 6 3.8v16.4c0 1 .8 1.8 1.8 1.8h8.4c1 0 1.8-.8 1.8-1.8V3.8c0-1-.8-1.8-1.8-1.8zm-1.7 13.5l-1.3-2 1.3-2c.1-.2.2-.4.2-.6 0-.4-.3-.7-.7-.7h-1.2c-.2 0-.4.1-.5.3l-.9 1.4-.9-1.4c-.1-.2-.3-.3-.5-.3H9c-.4 0-.7.3-.7.7 0 .2.1.4.2.6l1.3 2-1.3 2c-.1.2-.2.4-.2.6 0 .4.3.7.7.7h1.2c.2 0 .4-.1.5-.3l.9-1.4.9 1.4c.1.2.3.3.5.3h1.2c.4 0 .7-.3.7-.7 0-.2-.1-.4-.2-.6z" fill="#107c41"/>
                        </svg>
                        <div class="excel-paste-instructions">
                            <p style="font-size:15px; font-weight:600; margin-bottom:4px; color:#107c41;">Copy Cells from Excel and Paste Here</p>
                            <p style="font-size:12px; color:var(--text-secondary);">Select this area and press <strong>Ctrl+V</strong> to insert your columns.</p>
                        </div>
                        <textarea id="excel-paste-textarea" class="excel-paste-textarea" autofocus></textarea>
                    </div>
                    
                    <div style="font-size:12px; line-height:1.5; color:var(--text-primary); background:linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.08)); padding:12px 14px; border-radius:var(--radius); border:1px solid rgba(79, 70, 229, 0.2); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div style="flex:1;">
                            <p style="font-weight:700; margin-bottom:3px; color:#4f46e5; display:flex; align-items:center; gap:6px; margin-top:0;">
                                <span>🤖</span> Convert Flowchart Image using AI
                            </p>
                            <p style="color:var(--text-secondary); font-size:11.5px; margin:0; line-height:1.4;">
                                Have a flowchart image or drawing? Use our optimized AI prompt to convert it to a copy-pasteable spreadsheet format complete with shape types, branching, and layout coordinates!
                            </p>
                        </div>
                        <button id="btn-excel-show-ai-prompt" class="btn-primary" style="background: linear-gradient(135deg, #4f46e5, #06b6d4); color: white; border: none; font-size: 11px; padding: 6px 14px; white-space: nowrap; cursor: pointer; border-radius: var(--radius); font-weight: 600; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">Get AI Prompt</button>
                    </div>

                    <div style="font-size:12px; line-height:1.5; color:var(--text-secondary); background:var(--bg-tertiary); padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border)">
                        <p style="font-weight:600; margin-bottom:4px; color:var(--text-primary); margin-top:0;">💡 Column Headers Auto-matching:</p>
                        <p style="margin:0;">If your Excel sheet includes headers like <strong>Step ID</strong>, <strong>Step Name</strong>, <strong>Description</strong>, <strong>Shape</strong>, <strong>Swimlane</strong>, <strong>X Position</strong>, <strong>Y Position</strong>, and <strong>Next Step</strong>, the system will automatically map the columns correctly!</p>
                    </div>
                </div>
            `;

            footerEl.innerHTML = `
                <button id="excel-modal-cancel" class="btn-secondary">Cancel</button>
            `;

            const textarea = document.getElementById('excel-paste-textarea');
            const pasteBox = document.getElementById('excel-paste-box');
            const showAiPromptBtn = document.getElementById('btn-excel-show-ai-prompt');
            
            const closeModal = () => {
                const modal = document.getElementById('modal');
                if (modal) modal.classList.remove('excel-modal');
                const overlayEl = document.getElementById('modal-overlay');
                if (overlayEl) overlayEl.classList.add('hidden');
            };

            document.getElementById('excel-modal-cancel').addEventListener('click', closeModal);
            document.getElementById('modal-close').addEventListener('click', closeModal);
            
            // Re-focus textarea when clicking on the visual box
            if (pasteBox && textarea) {
                pasteBox.addEventListener('click', () => textarea.focus());
            }

            if (showAiPromptBtn) {
                showAiPromptBtn.addEventListener('click', () => {
                    this.showAiPromptModal(true);
                });
            }

            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    this._handlePastedText(e.target.value, bodyEl, footerEl);
                });
            }
        }

        _handlePastedText(text, bodyEl, footerEl) {
            const parsed = this._parseTSV(text);
            if (!parsed || parsed.rows.length === 0) {
                bus().emit('toast', 'warning', 'No valid data found in paste buffer. Please copy cells from Excel.');
                return;
            }

            this._parsedData = parsed;
            this._renderMappingPhase(bodyEl, footerEl);
        }

        _parseTSV(text) {
            if (!text || !text.trim()) return null;
            
            const rows = [];
            let currentRow = [];
            let currentCell = '';
            let inQuotes = false;
            let maxCols = 0;
            const len = text.length;
            
            for (let i = 0; i < len; i++) {
                const char = text[i];
                
                if (inQuotes) {
                    if (char === '"') {
                        // Check for escaped double quotes ("")
                        if (i + 1 < len && text[i + 1] === '"') {
                            currentCell += '"';
                            i++; // skip next quote
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        currentCell += char;
                    }
                } else {
                    if (char === '"') {
                        inQuotes = true;
                    } else if (char === '\t') {
                        currentRow.push(currentCell.trim());
                        currentCell = '';
                    } else if (char === '\r') {
                        if (i + 1 < len && text[i + 1] === '\n') {
                            i++;
                        }
                        currentRow.push(currentCell.trim());
                        rows.push(currentRow);
                        if (currentRow.length > maxCols) maxCols = currentRow.length;
                        currentRow = [];
                        currentCell = '';
                    } else if (char === '\n') {
                        currentRow.push(currentCell.trim());
                        rows.push(currentRow);
                        if (currentRow.length > maxCols) maxCols = currentRow.length;
                        currentRow = [];
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
            }
            
            if (currentCell || currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
                if (currentRow.length > maxCols) maxCols = currentRow.length;
            }
            
            const nonEmptyRows = rows.filter(r => r.some(c => c !== ''));
            if (nonEmptyRows.length === 0) return null;
            return { rows: nonEmptyRows, colCount: maxCols };
        }

        _detectHeaders(firstRow) {
            const mappings = {
                stepId: ['step id', 'stepid', 'id', 'step_id', 'code', 'stepno', 'step no'],
                stepName: ['step name', 'stepname', 'name', 'label', 'title', 'step_name', 'process step'],
                description: ['description', 'desc', 'description text', 'details', 'summary'],
                shapeType: ['shape', 'shape type', 'shapetype', 'type', 'shape_type'],
                swimlane: ['swimlane', 'lane', 'swim lane', 'actor', 'department', 'role', 'owner'],
                swimlaneColumn: ['swimlane column', 'swimlanecolumn', 'column swimlane', 'swimlane_column'],
                nextStep: ['next step', 'nextstep', 'next', 'next_step', 'following', 'goto', 'go to'],
                yesPath: ['yes path', 'yespath', 'yes', 'yes_path', 'yes step', 'if yes', 'yes route'],
                noPath: ['no path', 'nopath', 'no', 'no_path', 'no step', 'if no', 'no route'],
                yesLabel: ['yes label', 'yeslabel', 'if yes label', 'yes_label'],
                noLabel: ['no label', 'nolabel', 'if no label', 'no_label'],
                backgroundColor: ['bg color', 'bgcolor', 'background', 'fill color', 'fill', 'color'],
                fontColor: ['font color', 'fontcolor', 'text color', 'text_color'],
                borderColor: ['border color', 'bordercolor', 'border'],
                connectionLineColor: ['line color', 'linecolor', 'connector color', 'connector_color'],
                connectionLabel: ['conn label', 'connection label', 'conn_label', 'link label', 'line label'],
                width: ['width', 'w'],
                height: ['height', 'h'],
                x: ['x', 'x pos', 'x position', 'xpos', 'x_pos', 'x coordinate', 'xcoordinate'],
                y: ['y', 'y pos', 'y position', 'ypos', 'y_pos', 'y coordinate', 'ycoordinate'],
                icon: ['icon'],
                notes: ['notes', 'comments', 'comment']
            };

            let matchedCount = 0;
            const columnMapping = [];

            for (let c = 0; c < firstRow.length; c++) {
                const cell = (firstRow[c] || '').toLowerCase().trim();
                let matchedField = '';

                for (const [field, keywords] of Object.entries(mappings)) {
                    if (keywords.includes(cell)) {
                        matchedField = field;
                        matchedCount++;
                        break;
                    }
                }
                columnMapping.push(matchedField);
            }

            // Consider it a header row if we match at least one standard keyword
            const hasHeaders = matchedCount >= 1;
            return { hasHeaders, columnMapping };
        }

        _renderMappingPhase(bodyEl, footerEl) {
            const parsed = this._parsedData;
            const firstRow = parsed.rows[0] || [];
            const headerResult = this._detectHeaders(firstRow);
            
            const hasHeaders = headerResult.hasHeaders;
            const autoMapping = headerResult.columnMapping;
            const dataRows = hasHeaders ? parsed.rows.slice(1) : parsed.rows;
            const hasXorY = autoMapping.includes('x') || autoMapping.includes('y');

            let html = `
                <div class="excel-mapping-container">
                    <!-- Wizard Header/Intro -->
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px; color:var(--text-secondary);">Detected <strong>${parsed.colCount} columns</strong> and <strong>${dataRows.length} rows</strong> of step data.</span>
                        <span style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:600; ${hasHeaders ? 'background:rgba(22,163,74,0.1); color:var(--success)' : 'background:rgba(217,119,6,0.1); color:var(--warning)'}">
                            ${hasHeaders ? '✓ Column headers detected' : '⚠ No column headers found'}
                        </span>
                    </div>

                    <!-- Config Settings Row -->
                    <div class="excel-import-settings">
                        <div class="excel-setting-group" style="flex:1; min-width:200px;">
                            <label>Import Strategy</label>
                            <div class="excel-radio-group">
                                <label class="excel-radio-label">
                                    <input type="radio" name="excel-import-mode" value="append" checked />
                                    <span>📋 Append to existing</span>
                                </label>
                                <label class="excel-radio-label">
                                    <input type="radio" name="excel-import-mode" value="replace" />
                                    <span>🔄 Replace all steps</span>
                                </label>
                            </div>
                        </div>
                        <div class="excel-setting-group" style="display:flex; flex-direction:row; align-items:center; gap:16px;">
                            <label class="excel-checkbox-label">
                                <input type="checkbox" id="excel-auto-lanes" checked />
                                <span>Create missing swimlanes</span>
                            </label>
                            <label class="excel-checkbox-label">
                                <input type="checkbox" id="excel-auto-layout" ${hasXorY ? '' : 'checked'} />
                                <span>Auto-layout diagram</span>
                            </label>
                        </div>
                    </div>

                    <!-- Swimlane Ordering Panel (Hidden by default, shown if swimlane is mapped) -->
                    <div id="excel-swimlane-order-section" style="display:none; flex-direction:column; gap:8px; border:1px solid var(--border); padding:14px; border-radius:var(--radius); background:var(--bg-secondary); margin-bottom:16px; width:100%; box-sizing:border-box;">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <span style="font-weight:700; font-size:13px; color:#107c41; display:flex; align-items:center; gap:6px;">
                                <span>↕</span> Swimlane Rendering Order (Top to Bottom)
                            </span>
                            <span style="font-size:11px; color:var(--text-muted);">Adjust the vertical sequence of lanes</span>
                        </div>
                        <div id="excel-swimlane-order-list" style="max-height:160px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); padding:6px; display:flex; flex-direction:column; gap:4px; width:100%; box-sizing:border-box;">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Mapping Table -->
                    <div class="excel-mapping-table-wrapper">
                        <table class="excel-mapping-table">
                            <thead>
                                <tr>
                                    <th>Excel Column</th>
                                    <th>Maps To Property</th>
                                    <th>Preview Values (First 3 Rows)</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            for (let c = 0; c < parsed.colCount; c++) {
                const headerLabel = hasHeaders ? (firstRow[c] || `Column ${c + 1}`) : `Column ${c + 1}`;
                
                // Set initial mapping field
                    let selectedField = '';
                if (hasHeaders) {
                    selectedField = autoMapping[c] || '';
                } else {
                    const defaultOrder = ['stepId', 'stepName', 'description', 'shapeType', 'swimlane', 'nextStep', 'yesPath', 'noPath', 'yesLabel', 'noLabel'];
                    selectedField = defaultOrder[c] || '';
                }

                // Gather preview values
                const previews = [];
                for (let r = 0; r < Math.min(3, dataRows.length); r++) {
                    const val = dataRows[r][c];
                    if (val !== undefined && val !== '') {
                        previews.push(val);
                    }
                }
                const previewStr = previews.join(', ') || '(Empty)';

                // Render field dropdown
                let selectHtml = `<select class="excel-map-select" data-col-idx="${c}">`;
                FIELD_OPTIONS.forEach(opt => {
                    const isSel = opt.value === selectedField ? 'selected' : '';
                    selectHtml += `<option value="${opt.value}" ${isSel}>${opt.text}</option>`;
                });
                selectHtml += `</select>`;

                html += `
                    <tr>
                        <td style="width:220px;">
                            <span class="excel-col-badge">${hasHeaders ? 'Header' : 'Col ' + (c + 1)}</span>
                            <span style="font-weight:600; margin-left:6px; color:var(--text-primary);">${headerLabel}</span>
                        </td>
                        <td style="width:240px;">${selectHtml}</td>
                        <td><div class="excel-preview-text" title="${previewStr}">${previewStr}</div></td>
                    </tr>
                `;
            }

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            bodyEl.innerHTML = html;

            footerEl.innerHTML = `
                <button id="excel-modal-back" class="btn-secondary" style="margin-right:auto;">← Paste Again</button>
                <button id="excel-modal-cancel" class="btn-secondary">Cancel</button>
                <button id="excel-modal-import" class="btn-primary excel-btn-green">Import Steps (${dataRows.length})</button>
            `;

            // Back button returns to text box
            document.getElementById('excel-modal-back').addEventListener('click', () => {
                this._renderPastePhase(bodyEl, footerEl);
            });

            // Dynamically uncheck auto-layout if X or Y columns are selected in mapping dropdowns
            const recheckAutoLayoutCheckbox = () => {
                const selectedDropdowns = Array.from(document.querySelectorAll('.excel-map-select')).map(s => s.value);
                const hasSelectedXorY = selectedDropdowns.includes('x') || selectedDropdowns.includes('y');
                const checkbox = document.getElementById('excel-auto-layout');
                if (checkbox) {
                    checkbox.checked = !hasSelectedXorY;
                }
            };

            const triggerSwimlaneUpdate = () => {
                this._updateSwimlaneOrderList(bodyEl, dataRows, hasHeaders, firstRow);
            };

            const selectDropdowns = document.querySelectorAll('.excel-map-select');
            selectDropdowns.forEach(dropdown => {
                dropdown.addEventListener('change', () => {
                    recheckAutoLayoutCheckbox();
                    triggerSwimlaneUpdate();
                });
            });

            const strategyRadios = bodyEl.querySelectorAll('input[name="excel-import-mode"]');
            strategyRadios.forEach(radio => {
                radio.addEventListener('change', triggerSwimlaneUpdate);
            });

            // Initial updates
            triggerSwimlaneUpdate();

            const closeModal = () => {
                const modal = document.getElementById('modal');
                if (modal) modal.classList.remove('excel-modal');
                const overlayEl = document.getElementById('modal-overlay');
                if (overlayEl) overlayEl.classList.add('hidden');
            };

            document.getElementById('excel-modal-cancel').addEventListener('click', closeModal);
            
            // Execute Import
            document.getElementById('excel-modal-import').addEventListener('click', () => {
                this._executeImport(dataRows, parsed.colCount, closeModal);
            });
        }

        _updateSwimlaneOrderList(bodyEl, dataRows, hasHeaders, firstRow) {
            const selectEls = Array.from(bodyEl.querySelectorAll('.excel-map-select'));
            const swimlaneColIdx = selectEls.find(s => s.value === 'swimlane')?.getAttribute('data-col-idx');
            const orderSection = bodyEl.querySelector('#excel-swimlane-order-section');
            const orderList = bodyEl.querySelector('#excel-swimlane-order-list');
            
            if (!orderSection || !orderList) return;

            let detectedLanes = [];
            if (swimlaneColIdx !== undefined) {
                const colIdx = parseInt(swimlaneColIdx, 10);
                const seen = new Set();
                dataRows.forEach(row => {
                    const val = (row[colIdx] || '').trim();
                    if (val && !seen.has(val.toLowerCase())) {
                        seen.add(val.toLowerCase());
                        detectedLanes.push(val);
                    }
                });
            }

            const importModeRadio = bodyEl.querySelector('input[name="excel-import-mode"]:checked');
            const isReplaceMode = importModeRadio ? importModeRadio.value === 'replace' : false;
            
            if (!isReplaceMode) {
                // Merge in existing swimlanes from state
                const existingLanes = state().getLanes() || [];
                const sortedExisting = [...existingLanes].sort((a, b) => (a.order || 0) - (b.order || 0));
                sortedExisting.forEach(lane => {
                    const name = (lane.name || '').trim();
                    if (name && !detectedLanes.some(s => s.toLowerCase() === name.toLowerCase())) {
                        detectedLanes.push(name);
                    }
                });
            }

            if (detectedLanes.length === 0) {
                orderSection.style.display = 'none';
                this._swimlaneOrder = [];
                return;
            }

            orderSection.style.display = 'flex';

            // Sync with existing ordered list to keep user adjustments
            if (!this._swimlaneOrder) {
                this._swimlaneOrder = [];
            }
            // Keep only those that are in detectedLanes
            this._swimlaneOrder = this._swimlaneOrder.filter(name => 
                detectedLanes.some(s => s.toLowerCase() === name.toLowerCase())
            );
            // Append newly detected ones
            detectedLanes.forEach(name => {
                if (!this._swimlaneOrder.some(s => s.toLowerCase() === name.toLowerCase())) {
                    this._swimlaneOrder.push(name);
                }
            });

            // Render list items
            this._renderSwimlaneOrderUI(orderList, bodyEl, dataRows, hasHeaders, firstRow);
        }

        _renderSwimlaneOrderUI(orderList, bodyEl, dataRows, hasHeaders, firstRow) {
            orderList.innerHTML = '';
            if (!this._swimlaneOrder || this._swimlaneOrder.length === 0) {
                orderList.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:10px;">No swimlanes mapped</div>';
                return;
            }

            this._swimlaneOrder.forEach((laneName, idx) => {
                const rowEl = document.createElement('div');
                rowEl.className = 'swimlane-order-row';
                rowEl.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; font-weight:500; color:var(--text-primary);';
                
                rowEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:600; color:#107c41; min-width:18px;">${idx + 1}.</span>
                        <span>${laneName}</span>
                    </div>
                    <div style="display:flex; gap:4px;">
                        <button class="swimlane-reorder-btn btn-up" data-idx="${idx}" style="padding:2px 6px; font-size:10px; cursor:pointer; background:var(--bg-tertiary); border:1px solid var(--border); border-radius:3px; color:var(--text-primary);" ${idx === 0 ? 'disabled' : ''}>▲</button>
                        <button class="swimlane-reorder-btn btn-down" data-idx="${idx}" style="padding:2px 6px; font-size:10px; cursor:pointer; background:var(--bg-tertiary); border:1px solid var(--border); border-radius:3px; color:var(--text-primary);" ${idx === this._swimlaneOrder.length - 1 ? 'disabled' : ''}>▼</button>
                    </div>
                `;
                
                // Add event listeners to Up/Down buttons
                const upBtn = rowEl.querySelector('.btn-up');
                const downBtn = rowEl.querySelector('.btn-down');
                
                if (upBtn) {
                    upBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (idx > 0) {
                            const temp = this._swimlaneOrder[idx];
                            this._swimlaneOrder[idx] = this._swimlaneOrder[idx - 1];
                            this._swimlaneOrder[idx - 1] = temp;
                            this._renderSwimlaneOrderUI(orderList, bodyEl, dataRows, hasHeaders, firstRow);
                        }
                    });
                }
                
                if (downBtn) {
                    downBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (idx < this._swimlaneOrder.length - 1) {
                            const temp = this._swimlaneOrder[idx];
                            this._swimlaneOrder[idx] = this._swimlaneOrder[idx + 1];
                            this._swimlaneOrder[idx + 1] = temp;
                            this._renderSwimlaneOrderUI(orderList, bodyEl, dataRows, hasHeaders, firstRow);
                        }
                    });
                }
                
                orderList.appendChild(rowEl);
            });
        }

        _executeImport(dataRows, colCount, closeModalCallback) {
            // 1. Gather column mappings
            const selectEls = document.querySelectorAll('.excel-map-select');
            const columnMappings = Array.from(selectEls).reduce((acc, select) => {
                const colIdx = parseInt(select.getAttribute('data-col-idx'), 10);
                acc[colIdx] = select.value;
                return acc;
            }, {});

            // Verify if at least Step Name or Step ID is mapped
            const mappedFields = Object.values(columnMappings);
            if (!mappedFields.includes('stepName') && !mappedFields.includes('stepId')) {
                bus().emit('toast', 'error', 'Mapping Error: You must map at least "Step Name" or "Step ID" to import!');
                return;
            }

            // 2. Gather settings
            const isReplaceMode = document.querySelector('input[name="excel-import-mode"]:checked').value === 'replace';
            const autoCreateLanes = document.getElementById('excel-auto-lanes').checked;
            const applyAutoLayout = document.getElementById('excel-auto-layout').checked;

            // 3. Import process
            const currentState = JSON.parse(JSON.stringify(state().getState()));

            if (isReplaceMode) {
                currentState.nodes = [];
                currentState.edges = [];
                // If we completely reset nodes, we also sync the ID counter
                model().syncIdCounter([]);
            }

            // Build map of existing swimlanes to avoid duplicates
            const laneMap = {};
            currentState.lanes.forEach(lane => {
                laneMap[lane.name.toLowerCase()] = lane.id;
                laneMap[lane.id.toLowerCase()] = lane.id;
            });

            // Build map of existing column swimlanes to avoid duplicates
            const colMap = {};
            currentState.laneColumns = currentState.laneColumns || [];
            currentState.laneColumns.forEach(col => {
                colMap[col.name.toLowerCase()] = col.id;
                colMap[col.id.toLowerCase()] = col.id;
            });

            // Map to track duplicate Step ID collisions in Append Mode
            const idLookup = {}; // oldStepId -> newStepId
            const existingNodes = isReplaceMode ? [] : state().getNodes();
            const existingIds = new Set(existingNodes.map(n => n.stepId));

            const newNodes = [];

            // 2.5 Construct raw row objects from spreadsheet data
            const rawRows = [];
            dataRows.forEach(row => {
                const rawNode = {};
                let hasVal = false;
                for (let c = 0; c < colCount; c++) {
                    const field = columnMappings[c];
                    if (field) {
                        const val = (row[c] || '').trim();
                        rawNode[field] = val;
                        if (val !== '') hasVal = true;
                    }
                }
                if (hasVal) {
                    rawRows.push(rawNode);
                }
            });

            // Pass A: Forward merge pass (e.g. Row 7 "Confirm solution" merges into S5 "Issue closed")
            for (let i = 0; i < rawRows.length - 1; i++) {
                const cur = rawRows[i];
                const next = rawRows[i + 1];
                
                const curHasId = !!cur.stepId;
                const nextHasId = !!next.stepId;
                
                const curHasMetadata = Object.entries(cur).some(([k, v]) => {
                    return k !== 'stepId' && k !== 'stepName' && k !== 'description' && v !== '';
                });
                
                if (!curHasId && !curHasMetadata && nextHasId) {
                    next.stepName = (cur.stepName ? cur.stepName + '\n' : '') + (next.stepName || '');
                    next.description = (cur.description ? cur.description + '\n' : '') + (next.description || '');
                    cur._merged = true;
                }
            }
            const filteredRows = rawRows.filter(r => !r._merged);

            // Pass B: Backward/consecutive merge pass (e.g. S1 "Report issue" merges Row 3 "Receive issue")
            const groupedRows = [];
            let currentGroup = null;

            for (let i = 0; i < filteredRows.length; i++) {
                const row = filteredRows[i];
                
                const hasId = !!row.stepId;
                const hasMetadata = Object.entries(row).some(([k, v]) => {
                    return k !== 'stepId' && k !== 'stepName' && k !== 'description' && v !== '';
                });

                if (hasId) {
                    if (currentGroup) {
                        groupedRows.push(currentGroup);
                    }
                    currentGroup = JSON.parse(JSON.stringify(row));
                } else {
                    if (currentGroup && !hasMetadata) {
                        // Merge into active group
                        if (row.stepName) {
                            currentGroup.stepName = (currentGroup.stepName || '') + '\n' + row.stepName;
                        }
                        if (row.description) {
                            currentGroup.description = (currentGroup.description || '') + '\n' + row.description;
                        }
                    } else {
                        // Start a new group or merge into next (if no ID exists)
                        if (currentGroup) {
                            groupedRows.push(currentGroup);
                        }
                        currentGroup = JSON.parse(JSON.stringify(row));
                    }
                }
            }

            if (currentGroup) {
                groupedRows.push(currentGroup);
            }

            // Auto-generate step IDs for groups lacking them
            groupedRows.forEach(g => {
                if (!g.stepId) {
                    g.stepId = model().generateId('S');
                }
            });

            // Pass 1: Normalize fields, resolve swimlanes, generate and remap IDs
            groupedRows.forEach(rawNode => {

                // Normalize shape type
                let shapeType = 'process';
                if (rawNode.shapeType) {
                    const shapeLower = rawNode.shapeType.toLowerCase().replace(/\s+/g, '');
                    shapeType = SHAPE_MAP[shapeLower] || 'process';
                }

                // Resolve swimlane ID
                let swimlaneId = '';
                if (rawNode.swimlane) {
                    const laneStr = rawNode.swimlane.trim();
                    const laneLower = laneStr.toLowerCase();
                    
                    if (laneMap[laneLower]) {
                        swimlaneId = laneMap[laneLower];
                    } else if (autoCreateLanes) {
                        // Create a new swimlane!
                        const newLane = model().createLane({ name: laneStr, order: currentState.lanes.length });
                        currentState.lanes.push(newLane);
                        
                        // Register in lane maps
                        laneMap[laneLower] = newLane.id;
                        laneMap[newLane.id.toLowerCase()] = newLane.id;
                        swimlaneId = newLane.id;
                    }
                }

                // Resolve column swimlane ID
                let swimlaneColId = '';
                if (rawNode.swimlaneColumn) {
                    const colStr = rawNode.swimlaneColumn.trim();
                    const colLower = colStr.toLowerCase();
                    
                    if (colMap[colLower]) {
                        swimlaneColId = colMap[colLower];
                    } else if (autoCreateLanes) {
                        // Create a new column swimlane!
                        const newCol = {
                            id: 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                            name: colStr,
                            headerBackgroundColor: 'transparent',
                            backgroundColor: 'transparent',
                            borderColor: '#000000',
                            fontColor: '#000000',
                            order: currentState.laneColumns.length
                        };
                        currentState.laneColumns.push(newCol);
                        
                        // Register in column maps
                        colMap[colLower] = newCol.id;
                        colMap[newCol.id.toLowerCase()] = newCol.id;
                        swimlaneColId = newCol.id;
                    }
                }

                // Resolve duplicate Step IDs
                let originalId = (rawNode.stepId || '').trim();
                let finalId = originalId;

                if (!finalId) {
                    finalId = model().generateId('S');
                } else if (existingIds.has(finalId)) {
                    // Collision found: generate a new unique ID
                    finalId = model().generateId('S');
                    idLookup[originalId] = finalId;
                }
                
                existingIds.add(finalId);

                // Build clean node
                const nodeObj = model().createNode({
                    stepId: finalId,
                    stepName: rawNode.stepName || 'Imported Step',
                    description: rawNode.description || '',
                    shapeType: shapeType,
                    swimlane: swimlaneId,
                    swimlaneColumn: swimlaneColId,
                    nextStep: rawNode.nextStep || '',
                    yesPath: rawNode.yesPath || '',
                    noPath: rawNode.noPath || '',
                    yesLabel: rawNode.yesLabel || undefined,
                    noLabel: rawNode.noLabel || undefined,
                    backgroundColor: rawNode.backgroundColor || undefined,
                    fontColor: rawNode.fontColor || undefined,
                    borderColor: rawNode.borderColor || undefined,
                    connectionLineColor: rawNode.connectionLineColor || undefined,
                    connectionLabel: rawNode.connectionLabel || '',
                    width: parseInt(rawNode.width, 10) || undefined,
                    height: parseInt(rawNode.height, 10) || undefined,
                    x: (rawNode.x !== undefined && rawNode.x !== '' && !isNaN(parseInt(rawNode.x, 10))) ? parseInt(rawNode.x, 10) : undefined,
                    y: (rawNode.y !== undefined && rawNode.y !== '' && !isNaN(parseInt(rawNode.y, 10))) ? parseInt(rawNode.y, 10) : undefined,
                    icon: rawNode.icon || '',
                    notes: rawNode.notes || ''
                });

                // Temporarily track old targets for Pass 2 connection fixing
                nodeObj._origNext = rawNode.nextStep || '';
                nodeObj._origYes = rawNode.yesPath || '';
                nodeObj._origNo = rawNode.noPath || '';

                newNodes.push(nodeObj);
            });

            if (newNodes.length === 0) {
                bus().emit('toast', 'warning', 'No valid process steps were found to import.');
                return;
            }

            // Pass 2: Re-link connections using the lookup table if IDs were remapped
            newNodes.forEach(node => {
                if (node._origNext && idLookup[node._origNext]) {
                    node.nextStep = idLookup[node._origNext];
                }
                if (node._origYes && idLookup[node._origYes]) {
                    node.yesPath = idLookup[node._origYes];
                }
                if (node._origNo && idLookup[node._origNo]) {
                    node.noPath = idLookup[node._origNo];
                }

                // Delete transient fields
                delete node._origNext;
                delete node._origYes;
                delete node._origNo;
            });

            // Append nodes and build new logical edges
            currentState.nodes = currentState.nodes.concat(newNodes);
            currentState.edges = model().buildEdges(currentState.nodes);

            // Apply custom swimlane ordering sequence if configured
            if (this._swimlaneOrder && this._swimlaneOrder.length > 0) {
                currentState.lanes.forEach(lane => {
                    const laneName = (lane.name || '').trim();
                    const orderIdx = this._swimlaneOrder.findIndex(name => name.toLowerCase() === laneName.toLowerCase());
                    if (orderIdx !== -1) {
                        lane.order = orderIdx;
                    } else {
                        lane.order = this._swimlaneOrder.length + (lane.order || 0);
                    }
                });
                // Sort the array of lanes in currentState by their order
                currentState.lanes.sort((a, b) => (a.order || 0) - (b.order || 0));
            }

            // Save updated state into state history
            state().setState(currentState);

            // Trigger success indicator
            bus().emit('toast', 'success', `Successfully imported ${newNodes.length} steps from Excel!`);

            // Apply layout engine rendering
            if (applyAutoLayout && window.PMB.DiagramRenderer) {
                setTimeout(() => {
                    window.PMB.DiagramRenderer.autoLayout();
                }, 100);
            }

            // Close the modal
            closeModalCallback();
        }

        showAiPromptModal(fromImporter = false) {
            const overlay = document.getElementById('modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const footerEl = document.getElementById('modal-footer');
            const modal = document.getElementById('modal');

            if (!overlay || !titleEl || !bodyEl || !footerEl) return;

            // Reset modal overlay hidden and configure class
            modal.className = 'modal excel-modal';
            overlay.classList.remove('hidden');

            titleEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px;">🤖 <span>Convert Flowchart Image using AI</span></span>`;

            const promptText = `You are an expert systems analyst and flowchart designer. Your task is to analyze the provided flowchart image or drawing and convert it into a structured, tab-separated values (TSV) table that can be copy-pasted directly into our process mapping application.

### Important Column Schema:
The output must be a single plain-text TSV (Tab-Separated Values) code block containing exactly these columns:
Step ID\tStep Name\tDescription\tShape Type\tSwimlane\tColumn Swimlane\tNext Step\tYes Path (Decisions)\tNo Path (Decisions)\tYes Label\tNo Label\tX Position\tY Position\tBG Color\tFont Color\tBorder Color

### Rules for each column:
1. **Step ID**: Create a logical, unique step ID starting with S1, S2, S3, etc. Order them top-to-bottom or left-to-right following the process flow.
2. **Step Name**: The short title of the step inside the shape (keep it short, e.g., 2-5 words).
3. **Description**: A brief summary of what happens in this step, based on context.
4. **Shape Type**: Choose exactly one of the following based on the visual shape:
   - \`start\` (for start circle or oval)
   - \`end\` (for end circle or oval)
   - \`process\` (for normal rectangular step)
   - \`decision\` (for diamond-shaped question step)
   - \`document\` (for document-shaped step with wavy bottom)
   - \`database\` (for cylinder database shape)
   - \`manualInput\` (for slanted top manual entry shape)
   - \`delay\` (for D-shaped half-oval delay step)
   - \`subprocess\` (for double-bordered process rect)
5. **Swimlane**: If the flowchart has horizontal rows indicating departments, roles, or actors (e.g. Customer, Support, Manager, System), write the exact name of the row this shape belongs to.
6. **Column Swimlane**: If the flowchart has vertical columns indicating phases or stages (e.g. Initiation, Verification, Completion), write the name of the column it belongs to.
7. **Next Step**: The Step ID(s) that this shape connects to. If a shape connects to multiple downstream steps, write their IDs separated by a comma (e.g., "S3, S4"). If it's an end step or has no outgoing connection, leave blank.
8. **Yes Path (Decisions)**: If this is a \`decision\` step, write the Step ID connected by the "Yes" or true arrow.
9. **No Path (Decisions)**: If this is a \`decision\` step, write the Step ID connected by the "No" or false arrow.
10. **Yes Label**: If the yes path has a custom label in the diagram, specify it (defaults to "Yes").
11. **No Label**: If the no path has a custom label in the diagram, specify it (defaults to "No").
12. **X Position**: Assign a precise layout \`X\` coordinate in pixels to recreate the diagram structure. 
    - The first column/step should start at \`x = 100\`.
    - Each sequential step or horizontal move should increment \`x\` by standard column intervals (e.g., +240px per step).
    - Parallel branches should share similar or aligned X coordinates if they occur in the same stage.
13. **Y Position**: Assign a precise layout \`Y\` coordinate in pixels.
    - If swimlanes are used, assign a vertical coordinate block to each swimlane (e.g., Lane 1 at y = 100 to 220, Lane 2 at y = 260 to 380, etc.).
    - If no swimlanes are used, keep sequential nodes on the same horizontal path around the same Y, and shift Y by +150px or -150px for alternative branches or parallel processes.
14. **BG Color / Font Color / Border Color**: Estimate the hex colors of the shapes if colored in the image, otherwise leave empty to use standard styling.

### Output Formatting Constraint:
Output ONLY the plain-text TSV table inside a standard markdown code block. Do not write any pre-amble, conversational text, explanations, or notes.`;

            bodyEl.innerHTML = `
                <div class="ai-prompt-container" style="display:flex; flex-direction:column; gap:16px;">
                    <div style="font-size:13.5px; line-height:1.5; color:var(--text-secondary);">
                        Convert any flowchart drawing, photo, or PDF into our direct app schema using modern AI models (like Gemini 1.5 Pro, GPT-4o, or Claude 3.5 Sonnet).
                    </div>
                    
                    <div class="ai-prompt-stepper" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                        <div style="background:var(--bg-tertiary); padding:12px 14px; border-radius:var(--radius); border:1px solid var(--border); font-size:12px; line-height:1.4;">
                            <strong style="color:#4f46e5; display:block; margin-bottom:6px; font-size:13px;">1. Copy Prompt</strong>
                            Copy our optimized, pre-formatted prompt system instructions below.
                        </div>
                        <div style="background:var(--bg-tertiary); padding:12px 14px; border-radius:var(--radius); border:1px solid var(--border); font-size:12px; line-height:1.4;">
                            <strong style="color:#06b6d4; display:block; margin-bottom:6px; font-size:13px;">2. Send to AI</strong>
                            Go to your favorite AI model, upload your flowchart image, and paste the prompt.
                        </div>
                        <div style="background:var(--bg-tertiary); padding:12px 14px; border-radius:var(--radius); border:1px solid var(--border); font-size:12px; line-height:1.4;">
                            <strong style="color:var(--success); display:block; margin-bottom:6px; font-size:13px;">3. Paste & Render</strong>
                            Copy the generated tabular TSV block and paste it directly into our importer.
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <label style="font-size:12px; font-weight:600; color:var(--text-primary);">Optimized AI Prompt:</label>
                            <button id="btn-copy-ai-prompt" class="btn-primary btn-sm" style="background: linear-gradient(135deg, #4f46e5, #06b6d4); color: white; border: none; cursor: pointer; border-radius: var(--radius); padding: 5px 14px; font-size: 11.5px; font-weight: 600; display:flex; align-items:center; gap:6px; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                                <span>📋</span> Copy Prompt
                            </button>
                        </div>
                        <div class="ai-prompt-box" style="position:relative;">
                            <textarea id="ai-prompt-text-block" readonly style="width:100%; height:280px; font-family:monospace; font-size:11px; padding:14px; border-radius:var(--radius); border:1px solid var(--border); background:var(--bg-tertiary); color:var(--text-primary); resize:none; line-height:1.5; outline:none;" tabindex="-1">${promptText}</textarea>
                        </div>
                    </div>
                </div>
            `;

            footerEl.innerHTML = `
                ${fromImporter ? '<button id="excel-prompt-modal-back" class="btn-secondary" style="margin-right:auto;">← Back to Importer</button>' : ''}
                <button id="excel-prompt-modal-close" class="btn-secondary">Close</button>
            `;

            const closeModal = () => {
                modal.className = 'modal excel-modal';
                overlay.classList.add('hidden');
            };

            document.getElementById('excel-prompt-modal-close').addEventListener('click', closeModal);
            document.getElementById('modal-close').addEventListener('click', closeModal);

            if (fromImporter) {
                document.getElementById('excel-prompt-modal-back').addEventListener('click', () => {
                    this.showModal();
                });
            }

            const copyBtn = document.getElementById('btn-copy-ai-prompt');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const txtBlock = document.getElementById('ai-prompt-text-block');
                    if (txtBlock) {
                        txtBlock.select();
                        
                        const performCopy = () => {
                            copyBtn.innerHTML = '<span>✓</span> Prompt Copied!';
                            copyBtn.style.background = 'linear-gradient(135deg, #22c55e, #10b981)';
                            bus().emit('toast', 'success', 'AI Prompt copied to clipboard!');
                            
                            setTimeout(() => {
                                copyBtn.innerHTML = '<span>📋</span> Copy Prompt';
                                copyBtn.style.background = 'linear-gradient(135deg, #4f46e5, #06b6d4)';
                            }, 2000);
                        };

                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(txtBlock.value).then(performCopy).catch(() => {
                                document.execCommand('copy');
                                performCopy();
                            });
                        } else {
                            document.execCommand('copy');
                            performCopy();
                        }
                    }
                });
            }
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.ExcelImporter = new ExcelImporter();
    window.PMB.ExcelImporter.init();
})();
