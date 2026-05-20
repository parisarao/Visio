/**
 * Exporters — PDF, PNG, JPEG, and SVG export functionality
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const storage = () => window.PMB.StorageManager;
    const state = () => window.PMB.StateManager;

    const Exporters = {
        /**
         * Clones the main SVG, computes content-aware bounding box, inlines active CSS stylesheets,
         * and configures high-DPI scaling.
         */
        _prepareExportSVG() {
            const svg = document.getElementById('diagram-svg');
            if (!svg) throw new Error('Diagram SVG element not found');

            // Clone SVG
            const clone = svg.cloneNode(true);

            // Helper to parse rgb/rgba color and extract color & opacity
            function parseColorAndOpacity(colorStr) {
                if (!colorStr || colorStr === 'none' || colorStr === 'transparent') {
                    return { color: colorStr, opacity: null };
                }
                const rgbaMatch = colorStr.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
                if (rgbaMatch) {
                    const r = rgbaMatch[1];
                    const g = rgbaMatch[2];
                    const b = rgbaMatch[3];
                    const a = rgbaMatch[4];
                    const rgbColor = `rgb(${r}, ${g}, ${b})`;
                    if (a !== undefined && a !== null && a !== '1') {
                        return { color: rgbColor, opacity: parseFloat(a) };
                    }
                    return { color: rgbColor, opacity: null };
                }
                return { color: colorStr, opacity: null };
            }

            // Parallel walk: original live DOM elements and cloned off-screen elements
            const originalElements = [svg, ...svg.querySelectorAll('*')];
            const clonedElements = [clone, ...clone.querySelectorAll('*')];

            for (let i = 0; i < originalElements.length; i++) {
                const orig = originalElements[i];
                const cln = clonedElements[i];
                if (!orig || !cln) continue;

                // Remove filters for clean Visio-optimized rendering
                cln.removeAttribute('filter');

                // Read computed styles of original live DOM element
                const style = window.getComputedStyle(orig);

                // Flatten colors & stroke properties
                const fillStyle = style.fill;
                if (fillStyle && fillStyle !== 'none') {
                    const { color, opacity } = parseColorAndOpacity(fillStyle);
                    cln.setAttribute('fill', color);
                    if (opacity !== null) {
                        cln.setAttribute('fill-opacity', opacity);
                    } else {
                        const fillOpacity = style.fillOpacity;
                        if (fillOpacity && fillOpacity !== '1') {
                            cln.setAttribute('fill-opacity', fillOpacity);
                        }
                    }
                } else if (fillStyle === 'none') {
                    cln.setAttribute('fill', 'none');
                }

                const strokeStyle = style.stroke;
                if (strokeStyle && strokeStyle !== 'none') {
                    const { color, opacity } = parseColorAndOpacity(strokeStyle);
                    cln.setAttribute('stroke', color);
                    if (opacity !== null) {
                        cln.setAttribute('stroke-opacity', opacity);
                    } else {
                        const strokeOpacity = style.strokeOpacity;
                        if (strokeOpacity && strokeOpacity !== '1') {
                            cln.setAttribute('stroke-opacity', strokeOpacity);
                        }
                    }

                    const strokeWidth = style.strokeWidth;
                    if (strokeWidth) {
                        cln.setAttribute('stroke-width', strokeWidth);
                    }

                    const strokeDasharray = style.strokeDasharray;
                    if (strokeDasharray && strokeDasharray !== 'none') {
                        cln.setAttribute('stroke-dasharray', strokeDasharray);
                    }
                } else if (strokeStyle === 'none') {
                    cln.setAttribute('stroke', 'none');
                }

                const opacity = style.opacity;
                if (opacity && opacity !== '1') {
                    cln.setAttribute('opacity', opacity);
                }

                const display = style.display;
                if (display === 'none') {
                    cln.setAttribute('display', 'none');
                }

                const tagName = orig.tagName.toLowerCase();
                if (tagName === 'text' || tagName === 'tspan') {
                    const fontSize = style.fontSize;
                    if (fontSize) cln.setAttribute('font-size', fontSize);

                    const fontFamily = style.fontFamily;
                    if (fontFamily) {
                        const cleanFontFamily = fontFamily.replace(/['"]/g, '');
                        cln.setAttribute('font-family', cleanFontFamily);
                    }

                    const fontWeight = style.fontWeight;
                    if (fontWeight) cln.setAttribute('font-weight', fontWeight);

                    const fontStyle = style.fontStyle;
                    if (fontStyle) cln.setAttribute('font-style', fontStyle);

                    const textAnchor = style.textAnchor;
                    if (textAnchor) cln.setAttribute('text-anchor', textAnchor);

                    const dominantBaseline = style.dominantBaseline;
                    if (dominantBaseline) cln.setAttribute('dominant-baseline', dominantBaseline);
                }
            }

            // Compute exact visual bounding box of contents
            const layers = [
                document.getElementById('swimlane-layer'),
                document.getElementById('connector-layer'),
                document.getElementById('node-layer')
            ];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            layers.forEach(layer => {
                if (layer && layer.children.length > 0) {
                    const bbox = layer.getBBox();
                    if (bbox.width > 0 && bbox.height > 0) {
                        minX = Math.min(minX, bbox.x);
                        minY = Math.min(minY, bbox.y);
                        maxX = Math.max(maxX, bbox.x + bbox.width);
                        maxY = Math.max(maxY, bbox.y + bbox.height);
                    }
                }
            });

            // Fallback if no nodes/lanes
            if (minX === Infinity) {
                minX = 0; minY = 0; maxX = 800; maxY = 600;
            }

            // Frame the content beautifully with padding
            const padding = 40;
            const x = minX - padding;
            const y = minY - padding;
            const w = (maxX - minX) + padding * 2;
            const h = (maxY - minY) + padding * 2;

            // Set precise content boundaries
            clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
            clone.setAttribute('width', w);
            clone.setAttribute('height', h);

            // Empty interactive layers to clean them out of the export
            const overlay = clone.querySelector('#overlay-layer');
            if (overlay) overlay.innerHTML = '';
            
            const quickAdd = clone.querySelector('#quick-add-layer');
            if (quickAdd) quickAdd.innerHTML = '';

            // Clean up connector path attributes (already processed by loop, but we make sure they are correct)
            clone.querySelectorAll('.connector-path').forEach(path => {
                path.setAttribute('fill', 'none');
                path.setAttribute('fill-opacity', '0');
            });
            clone.querySelectorAll('.connector-label-bg, .connector-group rect').forEach(rect => {
                rect.setAttribute('fill', '#ffffff');
                rect.setAttribute('fill-opacity', '1');
            });

            // Apply solid canvas background color dynamically resolved from container or body theme
            const gridBg = clone.querySelector('#grid-bg');
            if (gridBg) {
                const canvasContainer = document.getElementById('canvas-container') || document.body;
                let canvasBgColor = '#ffffff';
                if (canvasContainer) {
                    const style = window.getComputedStyle(canvasContainer);
                    let bg = style.backgroundColor;
                    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
                        bg = window.getComputedStyle(document.body).backgroundColor;
                    }
                    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
                        const { color } = parseColorAndOpacity(bg);
                        canvasBgColor = color;
                    }
                }
                gridBg.setAttribute('fill', canvasBgColor);
                gridBg.removeAttribute('fill-opacity');
            }

            // Inline theme identifier just in case, but no large browser stylesheet is needed anymore!
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            clone.setAttribute('data-theme', currentTheme);

            return { clone, width: w, height: h };
        },

        async exportPDF() {
            try {
                bus().emit('toast', 'info', 'Generating PDF...');
                const { clone, width, height } = this._prepareExportSVG();
                const { jsPDF } = window.jspdf || {};
                if (!jsPDF) throw new Error('jsPDF library is not loaded');

                const scale = 2;
                const canvasW = Math.max(1, Math.round(width * scale));
                const canvasH = Math.max(1, Math.round(height * scale));

                clone.setAttribute('width', canvasW);
                clone.setAttribute('height', canvasH);

                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = canvasW;
                            canvas.height = canvasH;
                            const ctx = canvas.getContext('2d');

                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, canvasW, canvasH);
                            ctx.drawImage(img, 0, 0, canvasW, canvasH);

                            const pdfWidth = width + 40;
                            const pdfHeight = height + 40;
                            const doc = new jsPDF({
                                orientation: width > height ? 'landscape' : 'portrait',
                                unit: 'pt',
                                format: [pdfWidth, pdfHeight]
                            });

                            const pngData = canvas.toDataURL('image/png');
                            doc.addImage(pngData, 'PNG', 20, 20, width, height);
                            doc.save(this._getSafeFilename('.pdf'));
                            resolve();
                        } catch (err) {
                            reject(err);
                        } finally {
                            URL.revokeObjectURL(url);
                        }
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(url);
                        reject(new Error('Could not render diagram for PDF export'));
                    };
                    img.src = url;
                });

                bus().emit('toast', 'success', 'PDF exported successfully');
            } catch (err) {
                console.error('[Exporters] PDF export error:', err);
                bus().emit('toast', 'error', 'PDF export failed: ' + err.message);
            }
        },

        async exportPNG() {
            try {
                bus().emit('toast', 'info', 'Generating PNG...');
                const { clone, width, height } = this._prepareExportSVG();

                // High-definition DPI multiplier
                const scale = 2;
                const canvasW = width * scale;
                const canvasH = height * scale;

                clone.setAttribute('width', canvasW);
                clone.setAttribute('height', canvasH);

                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasW;
                    canvas.height = canvasH;
                    const ctx = canvas.getContext('2d');

                    // Draw white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvasW, canvasH);

                    // Draw image
                    ctx.drawImage(img, 0, 0, canvasW, canvasH);
                    canvas.toBlob(blob2 => {
                        storage().downloadBlob(blob2, this._getSafeFilename('.png'));
                        bus().emit('toast', 'success', 'PNG exported successfully');
                    }, 'image/png');
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            } catch (err) {
                console.error('[Exporters] PNG export error:', err);
                bus().emit('toast', 'error', 'PNG export failed: ' + err.message);
            }
        },

        async exportJPEG() {
            try {
                bus().emit('toast', 'info', 'Generating JPEG...');
                const { clone, width, height } = this._prepareExportSVG();

                const scale = 2;
                const canvasW = width * scale;
                const canvasH = height * scale;

                clone.setAttribute('width', canvasW);
                clone.setAttribute('height', canvasH);

                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasW;
                    canvas.height = canvasH;
                    const ctx = canvas.getContext('2d');

                    // Draw white background (essential for JPEGs to avoid transparency-to-black fallback)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvasW, canvasH);

                    // Draw image
                    ctx.drawImage(img, 0, 0, canvasW, canvasH);
                    canvas.toBlob(blob2 => {
                        storage().downloadBlob(blob2, this._getSafeFilename('.jpg'));
                        bus().emit('toast', 'success', 'JPEG exported successfully');
                    }, 'image/jpeg', 0.95);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            } catch (err) {
                console.error('[Exporters] JPEG export error:', err);
                bus().emit('toast', 'error', 'JPEG export failed: ' + err.message);
            }
        },

        exportSVG() {
            try {
                const { clone } = this._prepareExportSVG();
                const serializer = new XMLSerializer();
                let svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                storage().downloadBlob(blob, this._getSafeFilename('.svg'));
                bus().emit('toast', 'success', 'SVG exported successfully');
            } catch (err) {
                console.error('[Exporters] SVG export error:', err);
                bus().emit('toast', 'error', 'SVG export failed: ' + err.message);
            }
        },

        _getSafeFilename(ext) {
            let title = state().getTitle() || 'Process Map';
            title = title.replace(/[^a-z0-9 -]/gi, '_');
            return `${title}${ext}`;
        },

        showBulkExportModal() {
            if (!window.PMB.ExcelRepositoryManager || !window.PMB.ExcelRepositoryManager.isRepositoryActive()) {
                bus().emit('toast', 'warning', 'Please connect an Excel Repository first to use Bulk Export.');
                return;
            }

            const modalOverlay = document.getElementById('modal-overlay');
            const modalEl = document.getElementById('modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            const modalFooter = document.getElementById('modal-footer');

            if (!modalOverlay || !modalBody) return;

            // Expand modal to fit premium two-column filter & cards layout beautifully
            if (modalEl) {
                modalEl.style.maxWidth = '720px';
                modalEl.style.width = '95%';
                modalEl.style.transition = 'all var(--transition)';
            }

            modalTitle.textContent = 'Bulk Export Process Maps';

            // Extract all unique combinations from the connected repository
            const repoData = window.PMB.ExcelRepositoryManager._stepsData || [];
            const uniqueMaps = new Map(); // key -> {acc, proc, act}
            const accountsSet = new Set();
            const processMapByAcc = {}; 
            
            repoData.forEach(row => {
                const acc = (row.Account || '').trim();
                const proc = (row.Process || '').trim();
                const act = (row.Activity || '').trim();
                if (acc && proc && act) {
                    const key = `${acc}|${proc}|${act}`;
                    if (!uniqueMaps.has(key)) {
                        uniqueMaps.set(key, { acc, proc, act });
                        accountsSet.add(acc);
                        if (!processMapByAcc[acc]) processMapByAcc[acc] = new Set();
                        processMapByAcc[acc].add(proc);
                    }
                }
            });

            if (uniqueMaps.size === 0) {
                modalBody.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-secondary);">No process maps found in the repository.</p>';
                modalOverlay.classList.remove('hidden');
                return;
            }

            const mapsList = Array.from(uniqueMaps.values()).sort((a, b) => a.acc.localeCompare(b.acc) || a.proc.localeCompare(b.proc) || a.act.localeCompare(b.act));
            const accounts = Array.from(accountsSet).sort();

            modalBody.innerHTML = `
                <div class="bulk-export-container" style="display: flex; flex-direction: column; gap: 16px; color: var(--text-primary);">
                    <!-- Description & Status -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 13px; color: var(--text-secondary);">Select the process maps you want to combine into a single multi-page PDF.</span>
                        <span style="background: rgba(16, 124, 65, 0.1); color: #107c41; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                            Connected Repository
                        </span>
                    </div>
                    
                    <!-- Dropdown Filters Card -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--bg-tertiary); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border);">
                        <div>
                            <label style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px; letter-spacing: 0.5px;">Account Filter</label>
                            <div style="position: relative;">
                                <select id="bulk-filter-acc" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; outline: none; font-size: 13px; transition: border-color var(--transition); box-shadow: var(--shadow-sm); appearance: none;">
                                    <option value="ALL">📋 -- All Accounts --</option>
                                    ${accounts.map(a => `<option value="${a}">${a}</option>`).join('')}
                                </select>
                                <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); font-size: 9px;">▼</div>
                            </div>
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px; letter-spacing: 0.5px;">Process Filter</label>
                            <div style="position: relative;">
                                <select id="bulk-filter-proc" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; outline: none; font-size: 13px; transition: border-color var(--transition); box-shadow: var(--shadow-sm); appearance: none;">
                                    <option value="ALL">📁 -- All Processes --</option>
                                </select>
                                <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); font-size: 9px;">▼</div>
                            </div>
                        </div>
                    </div>

                    <!-- Actions & Counters -->
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px; font-size: 12px;">
                        <div>
                            Selected: <span id="bulk-count-selected" style="font-weight: 600; color: #107c41; background: rgba(16, 124, 65, 0.08); padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 6px;">0</span>
                            <span style="color: var(--text-muted);">Matches:</span> <span id="bulk-count-visible" style="font-weight: 600;">0</span> / <span style="font-weight: 600;">${mapsList.length}</span>
                        </div>
                        
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button id="btn-export-select-all" class="btn-secondary btn-sm" style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11px; font-weight: 500;">
                                Select Visible
                            </button>
                            <button id="btn-export-select-none" class="btn-secondary btn-sm" style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11px; font-weight: 500;">
                                Clear Visible
                            </button>
                            <button id="btn-export-select-all-repo" class="btn-secondary btn-sm" style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11px; font-weight: 500; border-color: var(--accent); color: var(--accent);">
                                Select All (${mapsList.length})
                            </button>
                        </div>
                    </div>

                    <!-- Scrollable checklist of maps -->
                    <div id="bulk-export-list-container" style="max-height: 280px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius); padding: 6px; display: flex; flex-direction: column; gap: 6px; background: var(--bg-primary);">
                    </div>
                </div>
            `;

            modalFooter.innerHTML = `
                <button id="btn-modal-cancel" class="toolbar-btn" style="border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-secondary);">Cancel</button>
                <button id="btn-modal-export" class="toolbar-btn" style="background:#107c41; color:#fff; border-color:#107c41; font-weight:600; border-radius:var(--radius-sm); display:flex; align-items:center; gap:6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Export Selected</span>
                </button>
            `;

            modalOverlay.classList.remove('hidden');

            const filterAcc = document.getElementById('bulk-filter-acc');
            const filterProc = document.getElementById('bulk-filter-proc');
            const listContainer = document.getElementById('bulk-export-list-container');
            const btnExport = document.getElementById('btn-modal-export');
            
            // Keep track of user's checked items globally across filters
            const selectedSet = new Set();
            mapsList.forEach((_, idx) => selectedSet.add(idx)); // default all selected

            // Update row background & border highlights based on checked status
            const updateRowStates = () => {
                document.querySelectorAll('.bulk-item-row').forEach(row => {
                    const idx = parseInt(row.getAttribute('data-idx'), 10);
                    const chk = row.querySelector('.export-map-chk');
                    if (chk) {
                        const isChecked = selectedSet.has(idx);
                        chk.checked = isChecked;
                        row.style.background = isChecked ? 'rgba(16, 124, 65, 0.04)' : 'var(--bg-secondary)';
                        row.style.borderColor = isChecked ? 'rgba(16, 124, 65, 0.25)' : 'var(--border-light)';
                    }
                });
            };

            const updateCounters = () => {
                const countSelected = selectedSet.size;
                const countVisible = document.querySelectorAll('.bulk-item-row').length;
                
                document.getElementById('bulk-count-selected').textContent = countSelected;
                document.getElementById('bulk-count-visible').textContent = countVisible;
                
                if (btnExport) {
                    btnExport.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Export Selected (${countSelected})</span>
                    `;
                    if (countSelected === 0) {
                        btnExport.disabled = true;
                        btnExport.style.opacity = '0.5';
                        btnExport.style.cursor = 'not-allowed';
                    } else {
                        btnExport.disabled = false;
                        btnExport.style.opacity = '1';
                        btnExport.style.cursor = 'pointer';
                    }
                }

                updateRowStates();
            };

            const renderList = () => {
                const accVal = filterAcc.value;
                const procVal = filterProc.value;
                
                let html = '';
                let countVisible = 0;
                mapsList.forEach((map, idx) => {
                    const matchAcc = accVal === 'ALL' || map.acc === accVal;
                    const matchProc = procVal === 'ALL' || map.proc === procVal;
                    
                    if (matchAcc && matchProc) {
                        countVisible++;
                        const isChecked = selectedSet.has(idx);
                        html += `
                            <div class="bulk-item-row" data-idx="${idx}" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-sm); transition: all var(--transition); cursor: pointer;">
                                <input type="checkbox" id="chk-export-${idx}" class="export-map-chk" data-idx="${idx}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #107c41; cursor: pointer; flex-shrink: 0; pointer-events: none;">
                                
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; pointer-events: none;">
                                    <span style="font-weight: 600; font-size: 13px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                                        ${map.act}
                                    </span>
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <span style="font-size: 10px; background: var(--bg-tertiary); color: var(--text-secondary); padding: 1px 6px; border-radius: 4px; font-weight: 500; border: 1px solid var(--border);">
                                            🏢 ${map.acc}
                                        </span>
                                        <span style="font-size: 10px; background: var(--accent-subtle); color: var(--accent); padding: 1px 6px; border-radius: 4px; font-weight: 500; border: 1px solid rgba(99,102,241,0.2);">
                                            ⚙️ ${map.proc}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                });

                if (countVisible === 0) {
                    html = '<div style="font-size:12px; color:var(--text-muted); padding:20px; text-align:center;">No maps match the selected filters.</div>';
                }
                
                listContainer.innerHTML = html;
                updateCounters();
            };

            const updateProcessDropdown = () => {
                const accVal = filterAcc.value;
                let procs = [];
                if (accVal === 'ALL') {
                    const allProcs = new Set();
                    Object.values(processMapByAcc).forEach(pSet => pSet.forEach(p => allProcs.add(p)));
                    procs = Array.from(allProcs).sort();
                } else {
                    procs = Array.from(processMapByAcc[accVal] || []).sort();
                }

                filterProc.innerHTML = '<option value="ALL">📁 -- All Processes --</option>' + 
                    procs.map(p => `<option value="${p}">${p}</option>`).join('');
            };

            // Setup Event Listeners
            filterAcc.addEventListener('change', () => {
                updateProcessDropdown();
                renderList();
            });

            filterProc.addEventListener('change', () => {
                renderList();
            });

            // Toggling selection by clicking the row card directly makes a premium user experience
            listContainer.addEventListener('click', (e) => {
                const row = e.target.closest('.bulk-item-row');
                if (!row) return;
                
                const idx = parseInt(row.getAttribute('data-idx'), 10);
                if (selectedSet.has(idx)) {
                    selectedSet.delete(idx);
                } else {
                    selectedSet.add(idx);
                }
                updateCounters();
            });

            // Select all currently visible matching items
            document.getElementById('btn-export-select-all').addEventListener('click', () => {
                document.querySelectorAll('.bulk-item-row').forEach(row => {
                    const idx = parseInt(row.getAttribute('data-idx'), 10);
                    selectedSet.add(idx);
                });
                updateCounters();
            });

            // Clear selection of currently visible matching items
            document.getElementById('btn-export-select-none').addEventListener('click', () => {
                document.querySelectorAll('.bulk-item-row').forEach(row => {
                    const idx = parseInt(row.getAttribute('data-idx'), 10);
                    selectedSet.delete(idx);
                });
                updateCounters();
            });

            // Select all repository items
            document.getElementById('btn-export-select-all-repo').addEventListener('click', () => {
                mapsList.forEach((_, idx) => selectedSet.add(idx));
                updateCounters();
            });

            // Initial render & populate
            updateProcessDropdown();
            renderList();

            const btnCancel = document.getElementById('btn-modal-cancel');
            const closeModal = () => {
                modalOverlay.classList.add('hidden');
                // Restore original modal sizes
                if (modalEl) {
                    modalEl.style.maxWidth = '';
                    modalEl.style.width = '';
                }
            };

            btnCancel.addEventListener('click', closeModal);
            document.getElementById('modal-close').addEventListener('click', closeModal);

            btnExport.addEventListener('click', async () => {
                const selectedIndexes = Array.from(selectedSet);
                if (selectedIndexes.length === 0) {
                    alert('Please select at least one process map to export.');
                    return;
                }

                // Sort the selected indexes so the PDF is in alphabetical order
                selectedIndexes.sort((a, b) => a - b);
                const mapsToExport = selectedIndexes.map(idx => mapsList[idx]);
                closeModal();
                await this._executeBulkExport(mapsToExport);
            });
        },

        async _executeBulkExport(mapsToExport) {
            try {
                bus().emit('toast', 'info', `Starting bulk export of ${mapsToExport.length} maps...`);
                const { jsPDF } = window.jspdf || {};
                if (!jsPDF) throw new Error('jsPDF library is not loaded');

                // Remember current state to restore later
                const originalAccount = window.PMB.ExcelRepositoryManager.activeAccount;
                const originalProcess = window.PMB.ExcelRepositoryManager.activeProcess;
                const originalActivity = window.PMB.ExcelRepositoryManager.activeActivity;

                let doc = null;

                for (let i = 0; i < mapsToExport.length; i++) {
                    const map = mapsToExport[i];
                    bus().emit('toast', 'info', `Exporting (${i+1}/${mapsToExport.length}): ${map.act}...`);
                    
                    // Load the map into the canvas
                    window.PMB.ExcelRepositoryManager.loadDiagramFromWorkbook(map.acc, map.proc, map.act);
                    
                    // Wait for rendering to complete (need a small delay for ELK layout and DOM updates)
                    await new Promise(r => setTimeout(r, 800));

                    const { clone, width, height } = this._prepareExportSVG();
                    const scale = 2;
                    const canvasW = Math.max(1, Math.round(width * scale));
                    const canvasH = Math.max(1, Math.round(height * scale));

                    clone.setAttribute('width', canvasW);
                    clone.setAttribute('height', canvasH);

                    const serializer = new XMLSerializer();
                    const svgStr = serializer.serializeToString(clone);
                    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);

                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            try {
                                const canvas = document.createElement('canvas');
                                canvas.width = canvasW;
                                canvas.height = canvasH;
                                const ctx = canvas.getContext('2d');

                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, canvasW, canvasH);
                                ctx.drawImage(img, 0, 0, canvasW, canvasH);

                                // Leave room for header
                                const pdfWidth = width + 40;
                                const pdfHeight = height + 80; // Extra height for header/footer

                                if (!doc) {
                                    doc = new jsPDF({
                                        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                                        unit: 'pt',
                                        format: [pdfWidth, pdfHeight]
                                    });
                                } else {
                                    doc.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'landscape' : 'portrait');
                                }

                                // Add Header text
                                doc.setFontSize(14);
                                doc.setTextColor(0, 0, 0);
                                doc.text(`${map.acc} - ${map.proc}`, 20, 30);
                                doc.setFontSize(18);
                                doc.text(map.act, 20, 50);

                                const pngData = canvas.toDataURL('image/png');
                                doc.addImage(pngData, 'PNG', 20, 60, width, height);
                                resolve();
                            } catch (err) {
                                reject(err);
                            } finally {
                                URL.revokeObjectURL(url);
                            }
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(url);
                            reject(new Error(`Could not render diagram for PDF export: ${map.act}`));
                        };
                        img.src = url;
                    });
                }

                // Restore original state
                if (originalAccount && originalProcess && originalActivity) {
                    window.PMB.ExcelRepositoryManager.loadDiagramFromWorkbook(originalAccount, originalProcess, originalActivity);
                }

                // Save combined PDF
                const today = new Date().toISOString().split('T')[0];
                doc.save(`Bulk_Process_Export_${today}.pdf`);
                bus().emit('toast', 'success', 'Bulk PDF exported successfully!');

            } catch (err) {
                console.error('[Exporters] Bulk PDF export error:', err);
                bus().emit('toast', 'error', 'Bulk PDF export failed: ' + err.message);
            }
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.Exporters = Exporters;
})();
