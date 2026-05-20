/**
 * Toolbar — Top toolbar button bindings
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const storage = () => window.PMB.StorageManager;
    const renderer = () => window.PMB.DiagramRenderer;
    const exporters = () => window.PMB.Exporters;
    const model = () => window.PMB.DataModel;

    const Toolbar = {
        init() {
            // Title Input Setup
            const titleInput = document.getElementById('diagram-title-input');
            if (titleInput) {
                // Initialize value
                titleInput.value = state().getTitle();

                // Bind updates
                titleInput.addEventListener('input', (e) => {
                    state().setTitle(e.target.value);
                });

                bus().on('title:changed', (newTitle) => {
                    if (titleInput.value !== newTitle) {
                        titleInput.value = newTitle;
                    }
                });

                bus().on('state:loaded', (stateData) => {
                    if (stateData && stateData.title) {
                        titleInput.value = stateData.title;
                    }
                });
            }

            // New
            document.getElementById('btn-new').addEventListener('click', () => {
                if (state().isDirty()) {
                    if (!confirm('Unsaved changes will be lost. Continue?')) return;
                }
                state().reset();
                storage().clearAutoSave();
                if (titleInput) titleInput.value = state().getTitle();
                bus().emit('toast', 'info', 'New diagram created');
            });

            // Open
            document.getElementById('btn-open').addEventListener('click', () => storage().openFile());

            // Save
            document.getElementById('btn-save').addEventListener('click', () => storage().saveToFile());

            // Undo / Redo
            document.getElementById('btn-undo').addEventListener('click', () => state().undo());
            document.getElementById('btn-redo').addEventListener('click', () => state().redo());

            // Auto Layout
            document.getElementById('btn-auto-layout').addEventListener('click', () => renderer().autoLayout());

            // Validate
            document.getElementById('btn-validate').addEventListener('click', () => {
                const issues = model().validate(state().getState());
                if (issues.length === 0) {
                    bus().emit('toast', 'success', 'Diagram is valid — no issues found');
                } else {
                    issues.forEach(i => bus().emit('toast', i.type === 'error' ? 'error' : 'warning', i.message));
                }
            });

            // Export dropdown
            const exportBtn = document.getElementById('btn-export');
            const exportDrop = document.getElementById('export-dropdown');
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                exportDrop.classList.toggle('hidden');
                if (importDrop) importDrop.classList.add('hidden');
            });
            
            // Import dropdown
            const importBtn = document.getElementById('btn-import');
            const importDrop = document.getElementById('import-dropdown');
            if (importBtn && importDrop) {
                importBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    importDrop.classList.toggle('hidden');
                    exportDrop.classList.add('hidden');
                });
            }

            document.addEventListener('click', () => {
                exportDrop.classList.add('hidden');
                if (importDrop) importDrop.classList.add('hidden');
            });

            document.getElementById('btn-export-pdf').addEventListener('click', () => exporters().exportPDF());
            document.getElementById('btn-export-png').addEventListener('click', () => exporters().exportPNG());
            document.getElementById('btn-export-jpeg').addEventListener('click', () => exporters().exportJPEG());
            document.getElementById('btn-export-svg').addEventListener('click', () => exporters().exportSVG());
            document.getElementById('btn-export-json').addEventListener('click', () => storage().saveToFile());
            
            const btnBulkExport = document.getElementById('btn-export-bulk-pdf');
            if (btnBulkExport) {
                btnBulkExport.addEventListener('click', () => {
                    if (window.PMB.Exporters && window.PMB.Exporters.showBulkExportModal) {
                        window.PMB.Exporters.showBulkExportModal();
                    }
                });
            }

            const btnImportJson = document.getElementById('btn-import-json');
            if (btnImportJson) {
                btnImportJson.addEventListener('click', async () => {
                    const loaded = await storage().openFile();
                    if (loaded && window.PMB.ExcelRepositoryManager && window.PMB.ExcelRepositoryManager.isRepositoryActive()) {
                        if (confirm('JSON loaded. Would you like to save this new diagram into your connected Excel Database?')) {
                            // Automatically grab new title for activity name
                            const title = state().getTitle() || 'Imported Activity';
                            window.PMB.ExcelRepositoryManager.activeActivity = title;
                            // Optionally, user might need to set Account/Process if it's not set
                            if (!window.PMB.ExcelRepositoryManager.activeAccount) {
                                window.PMB.ExcelRepositoryManager.activeAccount = 'Imported Account';
                            }
                            if (!window.PMB.ExcelRepositoryManager.activeProcess) {
                                window.PMB.ExcelRepositoryManager.activeProcess = 'Imported Process';
                            }
                            window.PMB.ExcelRepositoryManager.saveActiveStateToWorkbook();
                        }
                    }
                });
            }

            // Zoom
            document.getElementById('btn-zoom-in').addEventListener('click', () => renderer().zoomIn());
            document.getElementById('btn-zoom-out').addEventListener('click', () => renderer().zoomOut());
            document.getElementById('btn-zoom-fit').addEventListener('click', () => renderer().fitToScreen());

            // Grid panel toggle
            document.getElementById('btn-toggle-grid').addEventListener('click', () => {
                document.getElementById('grid-panel').classList.toggle('collapsed');
            });

            // Add / Delete / Excel Import rows
            const excelBtn = document.getElementById('btn-excel-import');
            if (excelBtn) {
                excelBtn.addEventListener('click', () => {
                    if (window.PMB.ExcelImporter) {
                        window.PMB.ExcelImporter.showModal();
                    }
                });
            }

            document.getElementById('btn-add-row').addEventListener('click', () => {
                const node = model().createNode({ stepName: 'New Step' });
                state().addNode(node);
                setTimeout(() => {
                    if (window.PMB.DiagramRenderer) {
                        window.PMB.DiagramRenderer.autoLayout(false, true);
                    }
                }, 50);
            });
            document.getElementById('btn-delete-row').addEventListener('click', () => {
                window.PMB.GridManager.deleteSelectedRow();
            });

            // Panel collapse & expand handles
            const toggleLeft = () => {
                const lp = document.getElementById('left-panel');
                const ex = document.getElementById('btn-expand-left');
                lp.classList.toggle('collapsed');
                if (lp.classList.contains('collapsed')) {
                    ex.classList.remove('hidden');
                } else {
                    ex.classList.add('hidden');
                }
                setTimeout(() => { if (window.PMB.DiagramRenderer) window.PMB.DiagramRenderer.fitToScreen(); }, 250);
            };

            const toggleRight = () => {
                const rp = document.getElementById('right-panel');
                const ex = document.getElementById('btn-expand-right');
                rp.classList.toggle('collapsed');
                if (rp.classList.contains('collapsed')) {
                    ex.classList.remove('hidden');
                } else {
                    ex.classList.add('hidden');
                }
                setTimeout(() => { if (window.PMB.DiagramRenderer) window.PMB.DiagramRenderer.fitToScreen(); }, 250);
            };

            document.getElementById('btn-collapse-left').addEventListener('click', toggleLeft);
            document.getElementById('btn-expand-left').addEventListener('click', toggleLeft);
            document.getElementById('btn-collapse-right').addEventListener('click', toggleRight);
            document.getElementById('btn-expand-right').addEventListener('click', toggleRight);
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.Toolbar = Toolbar;
})();
