/**
 * ExcelRepositoryManager — Bidirectional SheetJS integration for single-workbook process map database.
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const model = () => window.PMB.DataModel;

    // Excel Sheet Names
    const SHEET_STEPS = 'ProcessSteps';
    const SHEET_LANES = 'Swimlanes';
    const SHEET_COLUMNS = 'Columns';
    const SHEET_SETTINGS = 'DiagramSettings';

    class ExcelRepositoryManager {
        constructor() {
            this._workbook = null;
            this._fileHandle = null;
            this._fileName = '';
            
            // Structured data arrays in-memory
            this._stepsData = [];
            this._lanesData = [];
            this._colsData = [];
            this._settingsData = [];

            // Tracking active hierarchy
            this.activeAccount = '';
            this.activeProcess = '';
            this.activeActivity = '';
        }

        init() {
            console.log('[ExcelRepositoryManager] Initializing...');

            // Bind UI elements
            this._bindUI();

            // Set up event listener to capture active diagram updates when saved
            bus().on('save:requested', () => {
                if (this.isRepositoryActive()) {
                    this.saveActiveStateToWorkbook();
                }
            });
        }

        isRepositoryActive() {
            return this._workbook !== null && this.activeAccount && this.activeProcess && this.activeActivity;
        }

        _bindUI() {
            const btnLoad = document.getElementById('btn-repo-load');
            const btnSave = document.getElementById('btn-repo-save');
            const btnCreate = document.getElementById('btn-repo-create');
            const btnSeed = document.getElementById('btn-repo-seed');

            const selectAccount = document.getElementById('repo-select-account');
            const selectProcess = document.getElementById('repo-select-process');
            const selectActivity = document.getElementById('repo-select-activity');

            if (btnLoad) {
                btnLoad.addEventListener('click', () => this.handleOpenRepositoryFile());
            }

            if (btnSave) {
                btnSave.addEventListener('click', () => {
                    this.saveActiveStateToWorkbook();
                });
            }

            if (btnCreate) {
                btnCreate.addEventListener('click', () => this.showCreateProcessDialog());
            }

            if (btnSeed) {
                btnSeed.addEventListener('click', () => this.showSeedModal());
            }

            const btnTemplate = document.getElementById('btn-repo-template');
            if (btnTemplate) {
                btnTemplate.addEventListener('click', () => this.downloadBlankTemplate());
            }

            // Cascading Dropdown Listeners
            if (selectAccount) {
                selectAccount.addEventListener('change', (e) => {
                    this.activeAccount = e.target.value;
                    this.activeProcess = '';
                    this.activeActivity = '';
                    this.updateProcessDropdown();
                });
            }

            if (selectProcess) {
                selectProcess.addEventListener('change', (e) => {
                    this.activeProcess = e.target.value;
                    this.activeActivity = '';
                    this.updateActivityDropdown();
                });
            }

            if (selectActivity) {
                selectActivity.addEventListener('change', (e) => {
                    this.activeActivity = e.target.value;
                    if (this.activeActivity) {
                        this.loadDiagramFromWorkbook(this.activeAccount, this.activeProcess, this.activeActivity);
                    }
                });
            }
        }

        // ==========================================
        //        LOADING WORKBOOK FILE
        // ==========================================
        async handleOpenRepositoryFile() {
            try {
                let file, handle = null;

                // Try File System Access API for seamless native saving
                if (window.showOpenFilePicker) {
                    try {
                        const [pickerHandle] = await window.showOpenFilePicker({
                            types: [{
                                description: 'Excel Workbooks',
                                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                            }],
                            excludeAcceptAllOption: true,
                            multiple: false
                        });
                        handle = pickerHandle;
                        file = await handle.getFile();
                    } catch (e) {
                        if (e.name === 'AbortError') return; // User cancelled
                        console.warn('[ExcelRepositoryManager] Picker failed, falling back to input:', e);
                    }
                }

                // Fallback standard file input
                if (!file) {
                    const result = await this._promptFileInput();
                    if (!result) return;
                    file = result.file;
                    handle = null;
                }

                this._fileHandle = handle;
                this._fileName = file.name;

                // Read binary XLSX via SheetJS
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const wb = XLSX.read(data, { type: 'array' });
                        this.parseWorkbook(wb);
                        bus().emit('toast', 'success', `Loaded repository: ${this._fileName}`);
                    } catch (err) {
                        console.error('[ExcelRepositoryManager] Parsing Excel failed:', err);
                        bus().emit('toast', 'error', 'Failed to read Excel format. Verify it is a valid workbook.');
                    }
                };
                reader.readAsArrayBuffer(file);

            } catch (err) {
                console.error('[ExcelRepositoryManager] File open error:', err);
            }
        }

        _promptFileInput() {
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        resolve({ file });
                    } else {
                        resolve(null);
                    }
                };
                input.click();
            });
        }

        // ==========================================
        //        PARSING & DROP DOWN CASCADES
        // ==========================================
        parseWorkbook(wb) {
            this._workbook = wb;

            // Load sheets or fallback to blank tables
            this._stepsData = wb.Sheets[SHEET_STEPS] ? XLSX.utils.sheet_to_json(wb.Sheets[SHEET_STEPS]) : [];
            this._lanesData = wb.Sheets[SHEET_LANES] ? XLSX.utils.sheet_to_json(wb.Sheets[SHEET_LANES]) : [];
            this._colsData = wb.Sheets[SHEET_COLUMNS] ? XLSX.utils.sheet_to_json(wb.Sheets[SHEET_COLUMNS]) : [];
            this._settingsData = wb.Sheets[SHEET_SETTINGS] ? XLSX.utils.sheet_to_json(wb.Sheets[SHEET_SETTINGS]) : [];

            // Clean up properties to avoid casing issues and strip whitespace
            const cleanArray = (arr) => arr.map(row => {
                const clean = {};
                for (let k in row) {
                    clean[k.trim()] = row[k];
                }
                return clean;
            });

            this._stepsData = cleanArray(this._stepsData);
            this._lanesData = cleanArray(this._lanesData);
            this._colsData = cleanArray(this._colsData);
            this._settingsData = cleanArray(this._settingsData);

            // Activate dropdown container
            const dropdownsContainer = document.getElementById('repo-dropdowns');
            if (dropdownsContainer) dropdownsContainer.style.display = 'flex';

            // Enable new process button
            const btnCreate = document.getElementById('btn-repo-create');
            if (btnCreate) btnCreate.disabled = false;

            this.populateAccountDropdown();
        }

        populateAccountDropdown() {
            const selectAccount = document.getElementById('repo-select-account');
            if (!selectAccount) return;

            // Reset Account list
            selectAccount.innerHTML = '<option value="">(Select Account)</option>';

            const accounts = [...new Set(this._stepsData.map(r => r.Account || r.account || '').map(s => s.trim()).filter(Boolean))].sort();
            accounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc;
                opt.textContent = acc;
                selectAccount.appendChild(opt);
            });

            selectAccount.value = '';
            
            // Reset cascading selectors
            this.updateProcessDropdown();
        }

        updateProcessDropdown() {
            const selectProcess = document.getElementById('repo-select-process');
            if (!selectProcess) return;

            selectProcess.innerHTML = '<option value="">(Select Process)</option>';
            selectProcess.disabled = !this.activeAccount;

            if (this.activeAccount) {
                const processes = [...new Set(
                    this._stepsData
                        .filter(r => (r.Account || r.account || '').trim() === this.activeAccount)
                        .map(r => r.Process || r.process || '')
                        .map(s => s.trim())
                        .filter(Boolean)
                )].sort();

                processes.forEach(proc => {
                    const opt = document.createElement('option');
                    opt.value = proc;
                    opt.textContent = proc;
                    selectProcess.appendChild(opt);
                });
            }

            this.updateActivityDropdown();
        }

        updateActivityDropdown() {
            const selectActivity = document.getElementById('repo-select-activity');
            if (!selectActivity) return;

            selectActivity.innerHTML = '<option value="">(Select Activity)</option>';
            selectActivity.disabled = !this.activeProcess;

            if (this.activeProcess) {
                const activities = [...new Set(
                    this._stepsData
                        .filter(r => (r.Account || r.account || '').trim() === this.activeAccount && (r.Process || r.process || '').trim() === this.activeProcess)
                        .map(r => r.Activity || r.activity || '')
                        .map(s => s.trim())
                        .filter(Boolean)
                )].sort();

                activities.forEach(act => {
                    const opt = document.createElement('option');
                    opt.value = act;
                    opt.textContent = act;
                    selectActivity.appendChild(opt);
                });
            }

            const btnSave = document.getElementById('btn-repo-save');
            if (btnSave) btnSave.disabled = true;
        }

        // ==========================================
        //        LOADING SPECIFIC DIAGRAM
        // ==========================================
        loadDiagramFromWorkbook(account, process, activity) {
            console.log(`[ExcelRepositoryManager] Loading map for keys: Account="${account}", Process="${process}", Activity="${activity}"`);

            // Filter relevant steps (nodes)
            const matchedStepRows = this._stepsData.filter(r => 
                (r.Account || '').trim() === account && 
                (r.Process || '').trim() === process && 
                (r.Activity || '').trim() === activity
            );

            // Filter relevant swimlanes & column swimlanes
            const matchedLaneRows = this._lanesData.filter(r => 
                (r.Account || '').trim() === account && 
                (r.Process || '').trim() === process && 
                (r.Activity || '').trim() === activity
            );

            const matchedColRows = this._colsData.filter(r => 
                (r.Account || '').trim() === account && 
                (r.Process || '').trim() === process && 
                (r.Activity || '').trim() === activity
            );

            // Filter relevant settings
            const matchedSettingsRow = this._settingsData.find(r => 
                (r.Account || '').trim() === account && 
                (r.Process || '').trim() === process && 
                (r.Activity || '').trim() === activity
            );

            // Convert Settings
            const diagramSettings = {};
            if (matchedSettingsRow) {
                const row = matchedSettingsRow;
                if (row.Theme) diagramSettings.theme = row.Theme.trim();
                if (row['Connector Style']) diagramSettings.connectorStyle = row['Connector Style'].trim();
                if (row['Grid Snap'] !== undefined) diagramSettings.gridSnap = String(row['Grid Snap']).trim().toLowerCase() === 'true';
                if (row['Grid Size']) diagramSettings.gridSize = Number(row['Grid Size']);
                if (row['Lane Orientation']) diagramSettings.laneOrientation = row['Lane Orientation'].trim();
                if (row['Node Spacing']) diagramSettings.nodeSpacing = Number(row['Node Spacing']);
                if (row['Flow Direction']) diagramSettings.flowDirection = row['Flow Direction'].trim();
                if (row['Default Shape BG']) diagramSettings.defaultShapeBg = row['Default Shape BG'].trim();
                if (row['Default Shape Border']) diagramSettings.defaultShapeBorder = row['Default Shape Border'].trim();
            }

            // Convert Lanes & Columns
            const lanes = matchedLaneRows.map(r => ({
                id: (r['Lane ID'] || r.laneId || '').trim(),
                name: (r['Lane Name'] || r.name || '').trim(),
                headerBackgroundColor: (r['Header BG'] || r.headerBg || '').trim(),
                backgroundColor: (r['BG Color'] || r.bgColor || '').trim(),
                borderColor: (r['Border Color'] || r.borderColor || '').trim(),
                fontColor: (r['Font Color'] || r.fontColor || '').trim(),
                order: Number(r.Order || r.order || 0)
            })).sort((a, b) => a.order - b.order);

            const laneColumns = matchedColRows.map(r => ({
                id: (r['Column ID'] || r.columnId || '').trim(),
                name: (r['Column Name'] || r.name || '').trim(),
                headerBackgroundColor: (r['Header BG'] || r.headerBg || '').trim(),
                backgroundColor: (r['BG Color'] || r.bgColor || '').trim(),
                borderColor: (r['Border Color'] || r.borderColor || '').trim(),
                fontColor: (r['Font Color'] || r.fontColor || '').trim(),
                order: Number(r.Order || r.order || 0)
            })).sort((a, b) => a.order - b.order);

            // Convert Steps (Nodes) using DataModel overrides
            const nodes = matchedStepRows.map(r => {
                let parsedRouting = {};
                try {
                    if (r['Edge Routing']) {
                        parsedRouting = JSON.parse(r['Edge Routing']);
                    }
                } catch (e) {
                    console.warn(`[ExcelRepositoryManager] Failed to parse edge routing JSON for node ${r['Step ID']}:`, e);
                }

                const overrides = {
                    stepId: (r['Step ID'] || '').trim(),
                    stepName: (r['Step Name'] || '').trim(),
                    description: (r.Description || '').trim(),
                    shapeType: (r['Shape Type'] || 'process').trim().toLowerCase(),
                    swimlane: (r.Swimlane || '').trim(),
                    swimlaneColumn: (r['Column Swimlane'] || '').trim(),
                    nextStep: (r['Next Step'] || '').trim(),
                    yesPath: (r['Yes Path'] || '').trim(),
                    noPath: (r['No Path'] || '').trim(),
                    backgroundColor: (r['BG Color'] || '').trim(),
                    fontColor: (r['Font Color'] || '').trim(),
                    borderColor: (r['Border Color'] || '').trim(),
                    connectionLineColor: (r['Line Color'] || '').trim(),
                    connectionLabel: (r['Conn. Label'] || '').trim(),
                    yesLabel: (r['Yes Label'] || '').trim(),
                    noLabel: (r['No Label'] || '').trim(),
                    width: r.Width ? Number(r.Width) : undefined,
                    height: r.Height ? Number(r.Height) : undefined,
                    x: r.X ? Number(r.X) : 0,
                    y: r.Y ? Number(r.Y) : 0,
                    layoutFlow: (r['Layout Flow'] || 'default').trim(),
                    yesFlowDir: (r['Yes Flow Dir'] || 'default').trim(),
                    noFlowDir: (r['No Flow Dir'] || 'default').trim(),
                    stepSpacing: r['Step Spacing'] ? Number(r['Step Spacing']) : null,
                    notes: (r.Notes || '').trim(),
                    icon: (r.Icon || '').trim(),
                    edgeRouting: parsedRouting
                };

                return model().createNode(overrides);
            });

            // Reconstruct logical connections
            const edges = model().buildEdges(nodes);

            // State packaging
            const stateData = {
                version: '1.0',
                settings: diagramSettings,
                title: activity,
                lanes: lanes,
                laneColumns: laneColumns,
                nodes: nodes,
                edges: edges
            };

            // Inject into system state
            state().loadState(stateData);

            // Enable save button
            const btnSave = document.getElementById('btn-repo-save');
            if (btnSave) btnSave.disabled = false;

            // Trigger sync of title input UI
            const titleInput = document.getElementById('diagram-title-input');
            if (titleInput) titleInput.value = activity;

            bus().emit('toast', 'success', `Loaded process: ${activity}`);
        }

        // ==========================================
        //        SAVING ACTIVE STATE BACK TO WORKBOOK
        // ==========================================
        async saveActiveStateToWorkbook() {
            if (!this.isRepositoryActive()) return;

            const acc = this.activeAccount;
            const proc = this.activeProcess;
            const act = this.activeActivity;

            console.log(`[ExcelRepositoryManager] Saving active diagram state back to Excel: Account="${acc}", Process="${proc}", Activity="${act}"`);
            bus().emit('toast', 'info', 'Updating Excel workbook database...');

            const activeState = state().getState();
            
            // Also grab visual coordinates and customizations
            const nodes = activeState.nodes || [];
            const lanes = activeState.lanes || [];
            const cols = activeState.laneColumns || [];
            const settings = activeState.settings || {};

            // 1. Remove existing entries for this specific hierarchy key
            const cleanFilter = (item) => !(
                (item.Account || '').trim() === acc && 
                (item.Process || '').trim() === proc && 
                (item.Activity || '').trim() === act
            );

            this._stepsData = this._stepsData.filter(cleanFilter);
            this._lanesData = this._lanesData.filter(cleanFilter);
            this._colsData = this._colsData.filter(cleanFilter);
            this._settingsData = this._settingsData.filter(cleanFilter);

            // 2. Compile new rows
            nodes.forEach(n => {
                this._stepsData.push({
                    'Account': acc,
                    'Process': proc,
                    'Activity': act,
                    'Step ID': n.stepId,
                    'Step Name': n.stepName,
                    'Description': n.description || '',
                    'Shape Type': n.shapeType,
                    'Swimlane': n.swimlane || '',
                    'Column Swimlane': n.swimlaneColumn || '',
                    'Next Step': n.nextStep || '',
                    'Yes Path': n.yesPath || '',
                    'No Path': n.noPath || '',
                    'BG Color': n.backgroundColor || '',
                    'Font Color': n.fontColor || '',
                    'Border Color': n.borderColor || '',
                    'Line Color': n.connectionLineColor || '',
                    'Conn. Label': n.connectionLabel || '',
                    'Yes Label': n.yesLabel || 'Yes',
                    'No Label': n.noLabel || 'No',
                    'Width': n.width,
                    'Height': n.height,
                    'X': Math.round(n.x),
                    'Y': Math.round(n.y),
                    'Layout Flow': n.layoutFlow || 'default',
                    'Yes Flow Dir': n.yesFlowDir || 'default',
                    'No Flow Dir': n.noFlowDir || 'default',
                    'Step Spacing': n.stepSpacing,
                    'Edge Routing': n.edgeRouting ? JSON.stringify(n.edgeRouting) : '{}',
                    'Notes': n.notes || '',
                    'Icon': n.icon || ''
                });
            });

            lanes.forEach(l => {
                this._lanesData.push({
                    'Account': acc,
                    'Process': proc,
                    'Activity': act,
                    'Lane ID': l.id,
                    'Lane Name': l.name,
                    'Header BG': l.headerBackgroundColor || '',
                    'BG Color': l.backgroundColor || '',
                    'Border Color': l.borderColor || '',
                    'Font Color': l.fontColor || '',
                    'Order': l.order || 0
                });
            });

            cols.forEach(c => {
                this._colsData.push({
                    'Account': acc,
                    'Process': proc,
                    'Activity': act,
                    'Column ID': c.id,
                    'Column Name': c.name,
                    'Header BG': c.headerBackgroundColor || '',
                    'BG Color': c.backgroundColor || '',
                    'Border Color': c.borderColor || '',
                    'Font Color': c.fontColor || '',
                    'Order': c.order || 0
                });
            });

            this._settingsData.push({
                'Account': acc,
                'Process': proc,
                'Activity': act,
                'Theme': settings.theme || 'light',
                'Connector Style': settings.connectorStyle || 'orthogonal',
                'Grid Snap': settings.gridSnap ? 'true' : 'false',
                'Grid Size': settings.gridSize || 20,
                'Lane Orientation': settings.laneOrientation || 'horizontal',
                'Node Spacing': settings.nodeSpacing || 80,
                'Flow Direction': settings.flowDirection || 'horizontal',
                'Default Shape BG': settings.defaultShapeBg || 'transparent',
                'Default Shape Border': settings.defaultShapeBorder || '#000000'
            });

            // 3. Rebuild SheetJS workbook object
            const wb = XLSX.utils.book_new();

            const stepsWS = XLSX.utils.json_to_sheet(this._stepsData);
            const lanesWS = XLSX.utils.json_to_sheet(this._lanesData);
            const colsWS = XLSX.utils.json_to_sheet(this._colsData);
            const settingsWS = XLSX.utils.json_to_sheet(this._settingsData);

            XLSX.utils.book_append_sheet(wb, stepsWS, SHEET_STEPS);
            XLSX.utils.book_append_sheet(wb, lanesWS, SHEET_LANES);
            XLSX.utils.book_append_sheet(wb, colsWS, SHEET_COLUMNS);
            XLSX.utils.book_append_sheet(wb, settingsWS, SHEET_SETTINGS);

            this._workbook = wb;

            // Generate binary xlsx
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

            // 4. Save to disk (in-place handle or download)
            const saved = await this._writeWorkbookToDisk(wbout);
            if (saved) {
                state().markClean();
                bus().emit('toast', 'success', `Successfully saved repository workbook: ${this._fileName || 'Process_Maps_Repository.xlsx'}`);
            }
        }

        async _writeWorkbookToDisk(arrayBuffer) {
            const handle = this._fileHandle;
            
            if (handle && window.showSaveFilePicker) {
                try {
                    // Check file write permissions
                    const options = { mode: 'readwrite' };
                    if ((await handle.queryPermission(options)) !== 'granted') {
                        if ((await handle.requestPermission(options)) !== 'granted') {
                            throw new Error('Write permission denied by user.');
                        }
                    }
                    const writable = await handle.createWritable();
                    await writable.write(arrayBuffer);
                    await writable.close();
                    return true;
                } catch (e) {
                    console.warn('[ExcelRepositoryManager] In-place write failed, falling back to download:', e);
                }
            }

            // Fallback download
            const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this._fileName || 'Process_Maps_Repository.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        }

        // ==========================================
        //        CREATE NEW PROCESS FLOW
        // ==========================================
        showCreateProcessDialog() {
            const modalOverlay = document.getElementById('modal-overlay');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            const modalFooter = document.getElementById('modal-footer');

            if (!modalOverlay || !modalBody) return;

            modalTitle.textContent = 'Create New Process Map';
            
            modalBody.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px; font-family:inherit;">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-weight:600; font-size:13px; color:var(--text);">Account Name</label>
                        <input id="new-repo-acc" class="properties-input" type="text" placeholder="e.g. Genpact Solutions" value="${this.activeAccount}" style="padding:6px; font-size:13px;">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-weight:600; font-size:13px; color:var(--text);">Process Group</label>
                        <input id="new-repo-proc" class="properties-input" type="text" placeholder="e.g. Direct Procurement" value="${this.activeProcess}" style="padding:6px; font-size:13px;">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-weight:600; font-size:13px; color:var(--text);">Activity Name (Diagram Title)</label>
                        <input id="new-repo-act" class="properties-input" type="text" placeholder="e.g. Process Change Orders" style="padding:6px; font-size:13px;">
                    </div>
                </div>
            `;

            modalFooter.innerHTML = `
                <button id="btn-modal-cancel" class="toolbar-btn" style="border-radius:var(--radius-sm);">Cancel</button>
                <button id="btn-modal-submit" class="toolbar-btn" style="background:#107c41; color:#fff; border-color:#107c41; font-weight:600; border-radius:var(--radius-sm);">Create</button>
            `;

            modalOverlay.classList.remove('hidden');

            // Listeners
            const btnCancel = document.getElementById('btn-modal-cancel');
            const btnSubmit = document.getElementById('btn-modal-submit');
            const closeModal = () => modalOverlay.classList.add('hidden');

            btnCancel.addEventListener('click', closeModal);
            document.getElementById('modal-close').addEventListener('click', closeModal);

            btnSubmit.addEventListener('click', () => {
                const accVal = document.getElementById('new-repo-acc').value.trim();
                const procVal = document.getElementById('new-repo-proc').value.trim();
                const actVal = document.getElementById('new-repo-act').value.trim();

                if (!accVal || !procVal || !actVal) {
                    alert('Please fill out all fields.');
                    return;
                }

                // Check if this Activity already exists
                const exists = this._stepsData.some(r => 
                    (r.Account || '').trim() === accVal && 
                    (r.Process || '').trim() === procVal && 
                    (r.Activity || '').trim() === actVal
                );

                if (exists) {
                    alert('An activity with this name already exists under the selected Account and Process.');
                    return;
                }

                // Create default lanes
                const defaultLaneId = 'lane-' + Date.now();
                this._lanesData.push({
                    'Account': accVal,
                    'Process': procVal,
                    'Activity': actVal,
                    'Lane ID': defaultLaneId,
                    'Lane Name': 'Department Swimlane 1',
                    'Header BG': 'transparent',
                    'BG Color': 'transparent',
                    'Border Color': '#000000',
                    'Font Color': '#000000',
                    'Order': 0
                });

                // Create starting steps overrides
                this._stepsData.push({
                    'Account': accVal,
                    'Process': procVal,
                    'Activity': actVal,
                    'Step ID': 'S1',
                    'Step Name': 'Start',
                    'Description': 'Start process',
                    'Shape Type': 'start',
                    'Swimlane': defaultLaneId,
                    'Column Swimlane': '',
                    'Next Step': 'S2',
                    'Yes Path': '',
                    'No Path': '',
                    'BG Color': 'transparent',
                    'Font Color': '#000000',
                    'Border Color': '#000000',
                    'Line Color': '#64748b',
                    'Conn. Label': '',
                    'Yes Label': 'Yes',
                    'No Label': 'No',
                    'Width': 120,
                    'Height': 50,
                    'X': 150,
                    'Y': 100,
                    'Layout Flow': 'down',
                    'Yes Flow Dir': 'default',
                    'No Flow Dir': 'default',
                    'Step Spacing': null,
                    'Edge Routing': '{}',
                    'Notes': '',
                    'Icon': ''
                });

                this._stepsData.push({
                    'Account': accVal,
                    'Process': procVal,
                    'Activity': actVal,
                    'Step ID': 'S2',
                    'Step Name': 'End',
                    'Description': 'End process',
                    'Shape Type': 'end',
                    'Swimlane': defaultLaneId,
                    'Column Swimlane': '',
                    'Next Step': '',
                    'Yes Path': '',
                    'No Path': '',
                    'BG Color': 'transparent',
                    'Font Color': '#000000',
                    'Border Color': '#000000',
                    'Line Color': '#64748b',
                    'Conn. Label': '',
                    'Yes Label': 'Yes',
                    'No Label': 'No',
                    'Width': 120,
                    'Height': 50,
                    'X': 150,
                    'Y': 240,
                    'Layout Flow': 'default',
                    'Yes Flow Dir': 'default',
                    'No Flow Dir': 'default',
                    'Step Spacing': null,
                    'Edge Routing': '{}',
                    'Notes': '',
                    'Icon': ''
                });

                // Default settings row
                this._settingsData.push({
                    'Account': accVal,
                    'Process': procVal,
                    'Activity': actVal,
                    'Theme': 'light',
                    'Connector Style': 'orthogonal',
                    'Grid Snap': 'true',
                    'Grid Size': 20,
                    'Lane Orientation': 'horizontal',
                    'Node Spacing': 80,
                    'Flow Direction': 'horizontal',
                    'Default Shape BG': 'transparent',
                    'Default Shape Border': '#000000'
                });

                // Close modal
                closeModal();

                // Re-populate dropdown arrays
                this.activeAccount = accVal;
                this.activeProcess = procVal;
                this.activeActivity = actVal;

                // Sync UI selectors
                this.populateAccountDropdown();

                const selectAccount = document.getElementById('repo-select-account');
                const selectProcess = document.getElementById('repo-select-process');
                const selectActivity = document.getElementById('repo-select-activity');

                if (selectAccount) selectAccount.value = accVal;
                this.updateProcessDropdown();

                if (selectProcess) selectProcess.value = procVal;
                this.updateActivityDropdown();

                if (selectActivity) selectActivity.value = actVal;

                // Immediately load the active blank process diagram
                this.loadDiagramFromWorkbook(accVal, procVal, actVal);
            });
        }

        // ==========================================
        //        SEEDING UTILITY FLOW
        // ==========================================
        showSeedModal() {
            const modalOverlay = document.getElementById('modal-overlay');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            const modalFooter = document.getElementById('modal-footer');

            if (!modalOverlay || !modalBody) return;

            modalTitle.textContent = 'Seed Excel Repository Workbook';

            modalBody.innerHTML = `
                <div style="font-family:inherit; font-size:13px; color:var(--text); line-height:1.6;">
                    <p style="margin-bottom:12px;">This tool compiles your existing diagram JSON files into a single, beautifully structured Excel workbook backend (<code>Process_Maps_Repository.xlsx</code>).</p>
                    
                    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                        <label style="font-weight:600; font-size:12px;">1. Set Account Name for seed diagrams:</label>
                        <input id="seed-account-name" class="properties-input" type="text" value="Genpact Solutions" style="padding:6px; font-size:13px;">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                        <label style="font-weight:600; font-size:12px;">2. Set Process Group for seed diagrams:</label>
                        <input id="seed-process-name" class="properties-input" type="text" value="Direct Procurement" style="padding:6px; font-size:13px;">
                    </div>

                    <div style="border:1px dashed #107c41; background:rgba(16,124,65,0.03); border-radius:6px; padding:12px; margin-bottom:12px;">
                        <label style="font-weight:600; font-size:12px; color:#107c41; display:block; margin-bottom:6px;">3. Load JSON Files (Required if running via file:///):</label>
                        <p style="font-size:11px; margin:0 0 8px 0; color:#555;">Since you are running offline on <code>file:///</code>, browser CORS rules block auto-reading. Please select or drag the 4 JSON files from your <code>Visio/Library/</code> folder here:</p>
                        <input type="file" id="seed-json-picker" multiple accept=".json" style="font-size:12px; font-family:inherit; width:100%;">
                    </div>

                    <div id="seed-progress" style="display:none; margin-top:16px; font-weight:600; color:#107c41;">
                        ⏳ Loading and compiling JSON files...
                    </div>
                </div>
            `;

            modalFooter.innerHTML = `
                <button id="btn-modal-cancel" class="toolbar-btn" style="border-radius:var(--radius-sm);">Cancel</button>
                <button id="btn-modal-seed" class="toolbar-btn" style="background:#107c41; color:#fff; border-color:#107c41; font-weight:600; border-radius:var(--radius-sm);">Generate Excel Workbook</button>
            `;

            modalOverlay.classList.remove('hidden');

            const btnCancel = document.getElementById('btn-modal-cancel');
            const btnSeed = document.getElementById('btn-modal-seed');
            const closeModal = () => modalOverlay.classList.add('hidden');

            btnCancel.addEventListener('click', closeModal);
            document.getElementById('modal-close').addEventListener('click', closeModal);

            btnSeed.addEventListener('click', async () => {
                const accVal = document.getElementById('seed-account-name').value.trim();
                const procVal = document.getElementById('seed-process-name').value.trim();
                const jsonPicker = document.getElementById('seed-json-picker');

                if (!accVal || !procVal) {
                    alert('Please specify Account and Process Group names.');
                    return;
                }

                document.getElementById('seed-progress').style.display = 'block';
                btnSeed.disabled = true;

                try {
                    const stepsList = [];
                    const lanesList = [];
                    const colsList = [];
                    const settingsList = [];

                    const processJSONData = (data, actTitle) => {
                        // Compile settings
                        const s = data.settings || {};
                        settingsList.push({
                            'Account': accVal,
                            'Process': procVal,
                            'Activity': actTitle,
                            'Theme': s.theme || 'light',
                            'Connector Style': s.connectorStyle || 'orthogonal',
                            'Grid Snap': s.gridSnap ? 'true' : 'false',
                            'Grid Size': s.gridSize || 20,
                            'Lane Orientation': s.laneOrientation || 'horizontal',
                            'Node Spacing': s.nodeSpacing || 80,
                            'Flow Direction': s.flowDirection || 'horizontal',
                            'Default Shape BG': s.defaultShapeBg || 'transparent',
                            'Default Shape Border': s.defaultShapeBorder || '#000000'
                        });

                        // Compile lanes
                        const lanes = data.lanes || [];
                        lanes.forEach(l => {
                            lanesList.push({
                                'Account': accVal,
                                'Process': procVal,
                                'Activity': actTitle,
                                'Lane ID': l.id,
                                'Lane Name': l.name,
                                'Header BG': l.headerBackgroundColor || '',
                                'BG Color': l.backgroundColor || '',
                                'Border Color': l.borderColor || '',
                                'Font Color': l.fontColor || '',
                                'Order': l.order || 0
                            });
                        });

                        // Compile columns
                        const columns = data.laneColumns || [];
                        columns.forEach(c => {
                            colsList.push({
                                'Account': accVal,
                                'Process': procVal,
                                'Activity': actTitle,
                                'Column ID': c.id,
                                'Column Name': c.name,
                                'Header BG': c.headerBackgroundColor || '',
                                'BG Color': c.bgColor || c.backgroundColor || '',
                                'Border Color': c.borderColor || '',
                                'Font Color': c.fontColor || '',
                                'Order': c.order || 0
                            });
                        });

                        // Compile steps (nodes)
                        const nodes = data.nodes || [];
                        nodes.forEach(n => {
                            stepsList.push({
                                'Account': accVal,
                                'Process': procVal,
                                'Activity': actTitle,
                                'Step ID': n.stepId,
                                'Step Name': n.stepName,
                                'Description': n.description || '',
                                'Shape Type': n.shapeType,
                                'Swimlane': n.swimlane || '',
                                'Column Swimlane': n.swimlaneColumn || '',
                                'Next Step': n.nextStep || '',
                                'Yes Path': n.yesPath || '',
                                'No Path': n.noPath || '',
                                'BG Color': n.backgroundColor || '',
                                'Font Color': n.fontColor || '',
                                'Border Color': n.borderColor || '',
                                'Line Color': n.connectionLineColor || '',
                                'Conn. Label': n.connectionLabel || '',
                                'Yes Label': n.yesLabel || 'Yes',
                                'No Label': n.noLabel || 'No',
                                'Width': n.width,
                                'Height': n.height,
                                'X': Math.round(n.x),
                                'Y': Math.round(n.y),
                                'Layout Flow': n.layoutFlow || 'default',
                                'Yes Flow Dir': n.yesFlowDir || 'default',
                                'No Flow Dir': n.noFlowDir || 'default',
                                'Step Spacing': n.stepSpacing,
                                'Edge Routing': n.edgeRouting ? JSON.stringify(n.edgeRouting) : '{}',
                                'Notes': n.notes || '',
                                'Icon': n.icon || ''
                            });
                        });
                    };

                    const pickedFiles = jsonPicker && jsonPicker.files;

                    if (pickedFiles && pickedFiles.length > 0) {
                        // Option B: Load selected local JSON files
                        for (let file of pickedFiles) {
                            try {
                                const text = await file.text();
                                const data = JSON.parse(text);
                                const actTitle = data.title || file.name.replace('.json', '');
                                processJSONData(data, actTitle);
                            } catch (e) {
                                console.error('[Seeder] Failed to parse local JSON file:', e);
                            }
                        }
                    } else {
                        // Option A: Try to fetch automatically
                        const libraryFiles = [
                            'Library/Change Order Process.json',
                            'Library/Change Order- Cost.json',
                            'Library/Change Order- Qty.json',
                            'Library/Cisco Merake Order Processing - CCW.json'
                        ];

                        for (let path of libraryFiles) {
                            try {
                                const res = await fetch(path);
                                if (!res.ok) throw new Error(`Fetch status ${res.status}`);
                                const data = await res.json();
                                const actTitle = data.title || path.split('/').pop().replace('.json', '');
                                processJSONData(data, actTitle);
                            } catch (fetchErr) {
                                console.error(`[Seeder] Failed loading file ${path}:`, fetchErr);
                            }
                        }
                    }

                    if (stepsList.length === 0) {
                        alert('CORS restriction has blocked auto-reading of files. Please select the 4 JSON files from the "Visio/Library/" folder using the selector first!');
                        btnSeed.disabled = false;
                        document.getElementById('seed-progress').style.display = 'none';
                        return;
                    }

                    // Build and write seed workbook
                    const wb = XLSX.utils.book_new();

                    const stepsWS = XLSX.utils.json_to_sheet(stepsList);
                    const lanesWS = XLSX.utils.json_to_sheet(lanesList);
                    const colsWS = XLSX.utils.json_to_sheet(colsList);
                    const settingsWS = XLSX.utils.json_to_sheet(settingsList);

                    XLSX.utils.book_append_sheet(wb, stepsWS, SHEET_STEPS);
                    XLSX.utils.book_append_sheet(wb, lanesWS, SHEET_LANES);
                    XLSX.utils.book_append_sheet(wb, colsWS, SHEET_COLUMNS);
                    XLSX.utils.book_append_sheet(wb, settingsWS, SHEET_SETTINGS);

                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

                    // Clean file name
                    this._fileName = 'Process_Maps_Repository.xlsx';
                    this._fileHandle = null;

                    // Write to download file
                    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = this._fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    // Parse new workbook internally to make it instantly active in UI!
                    this.parseWorkbook(wb);

                    // Select the first activity to load
                    const selectAccount = document.getElementById('repo-select-account');
                    const selectProcess = document.getElementById('repo-select-process');
                    const selectActivity = document.getElementById('repo-select-activity');

                    if (selectAccount) selectAccount.value = accVal;
                    this.activeAccount = accVal;
                    this.updateProcessDropdown();

                    if (selectProcess) selectProcess.value = procVal;
                    this.activeProcess = procVal;
                    this.updateActivityDropdown();

                    const firstAct = selectActivity.options[1]?.value;
                    if (firstAct) {
                        selectActivity.value = firstAct;
                        this.activeActivity = firstAct;
                        this.loadDiagramFromWorkbook(accVal, procVal, firstAct);
                    }

                    closeModal();
                    bus().emit('toast', 'success', 'Successfully generated and loaded Process_Maps_Repository.xlsx!');

                } catch (compileErr) {
                    console.error('[Seeder] Compilation failed:', compileErr);
                    alert('Seeding compiled failed. Make sure you are running via local HTTP server or check console logs.');
                    btnSeed.disabled = false;
                    document.getElementById('seed-progress').style.display = 'none';
                }
            });
        }

        downloadBlankTemplate() {
            try {
                // Headers for each sheet
                const stepsHeaders = ['Account', 'Process', 'Activity', 'Step ID', 'Step Name', 'Description', 'Shape Type', 'Swimlane', 'Column Swimlane', 'Next Step', 'Yes Path', 'No Path', 'BG Color', 'Font Color', 'Border Color', 'Line Color', 'Conn. Label', 'Yes Label', 'No Label', 'Width', 'Height', 'X', 'Y', 'Layout Flow', 'Yes Flow Dir', 'No Flow Dir', 'Step Spacing', 'Edge Routing', 'Notes', 'Icon'];
                const lanesHeaders = ['Account', 'Process', 'Activity', 'Lane ID', 'Lane Name', 'Header BG', 'BG Color', 'Border Color', 'Font Color', 'Order'];
                const colsHeaders = ['Account', 'Process', 'Activity', 'Column ID', 'Column Name', 'Header BG', 'BG Color', 'Border Color', 'Font Color', 'Order'];
                const settingsHeaders = ['Account', 'Process', 'Activity', 'Theme', 'Connector Style', 'Grid Snap', 'Grid Size', 'Lane Orientation', 'Node Spacing', 'Flow Direction', 'Default Shape BG', 'Default Shape Border'];

                // Create worksheets from array of arrays containing headers as the first row
                const stepsWS = XLSX.utils.aoa_to_sheet([stepsHeaders]);
                const lanesWS = XLSX.utils.aoa_to_sheet([lanesHeaders]);
                const colsWS = XLSX.utils.aoa_to_sheet([colsHeaders]);
                const settingsWS = XLSX.utils.aoa_to_sheet([settingsHeaders]);

                // Create new workbook
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, stepsWS, SHEET_STEPS);
                XLSX.utils.book_append_sheet(wb, lanesWS, SHEET_LANES);
                XLSX.utils.book_append_sheet(wb, colsWS, SHEET_COLUMNS);
                XLSX.utils.book_append_sheet(wb, settingsWS, SHEET_SETTINGS);

                // Write binary
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

                // Trigger download
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Blank_Process_Repository.xlsx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                bus().emit('toast', 'success', 'Downloaded Blank Process Repository template!');
            } catch (err) {
                console.error('[ExcelRepositoryManager] Failed to generate template:', err);
                bus().emit('toast', 'error', 'Failed to generate template.');
            }
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.ExcelRepositoryManager = new ExcelRepositoryManager();
})();
