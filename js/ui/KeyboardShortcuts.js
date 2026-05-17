/**
 * KeyboardShortcuts — Global hotkey bindings
 */
(function () {
    'use strict';
    const state = () => window.PMB.StateManager;
    const storage = () => window.PMB.StorageManager;
    const renderer = () => window.PMB.DiagramRenderer;

    const KeyboardShortcuts = {
        init() {
            document.addEventListener('keydown', (e) => {
                // Don't intercept when typing in inputs
                const tag = (e.target.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

                const ctrl = e.ctrlKey || e.metaKey;
                const arrowDeltas = {
                    ArrowLeft: { x: -1, y: 0 },
                    ArrowRight: { x: 1, y: 0 },
                    ArrowUp: { x: 0, y: -1 },
                    ArrowDown: { x: 0, y: 1 }
                };

                if (ctrl && e.key === 'z') { e.preventDefault(); state().undo(); }
                else if (ctrl && e.key === 'y') { e.preventDefault(); state().redo(); }
                else if (ctrl && e.key === 's') { e.preventDefault(); storage().saveToFile(); }
                else if (ctrl && e.key === 'o') { e.preventDefault(); storage().openFile(); }
                else if (arrowDeltas[e.key]) {
                    const selectedIds = window.PMB.SelectionManager
                        ? window.PMB.SelectionManager.getSelected()
                        : (renderer()._selectedNodeId ? [renderer()._selectedNodeId] : []);
                    if (selectedIds && selectedIds.length > 0) {
                        e.preventDefault();
                        const step = e.shiftKey ? 10 : 1;
                        const delta = arrowDeltas[e.key];
                        const nodes = state().getNodes();
                        selectedIds.forEach(id => {
                            const node = nodes.find(n => n.stepId === id);
                            if (!node) return;
                            state().updateNode(id, {
                                x: (node.x || 0) + delta.x * step,
                                y: (node.y || 0) + delta.y * step
                            });
                        });
                    }
                }
                else if (e.key === 'Delete' || e.key === 'Backspace') {
                    const selId = renderer()._selectedNodeId;
                    if (selId) { e.preventDefault(); state().removeNode(selId); renderer().selectNode(null); }
                }
                else if (e.key.toLowerCase() === 'r') {
                    const selectedEdges = window.PMB.SelectionManager ? window.PMB.SelectionManager.getSelectedEdges() : [];
                    if (selectedEdges && selectedEdges.length > 0 && window.PMB.EdgeEditor) {
                        e.preventDefault();
                        window.PMB.EdgeEditor.resetSelectedEdge();
                    }
                }
                else if (e.key === '+' || e.key === '=') { if (ctrl) { e.preventDefault(); renderer().zoomIn(); } }
                else if (e.key === '-') { if (ctrl) { e.preventDefault(); renderer().zoomOut(); } }
                else if (e.key === '0') { if (ctrl) { e.preventDefault(); renderer().fitToScreen(); } }
            });

            // Smart clipboard paste (Ctrl+V) listener
            document.addEventListener('paste', (e) => {
                const tag = (e.target.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

                const text = (e.clipboardData || window.clipboardData).getData('text');
                if (text && text.includes('\t')) {
                    e.preventDefault();
                    if (window.PMB.ExcelImporter) {
                        window.PMB.ExcelImporter.showModal(text);
                    }
                }
            });
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.KeyboardShortcuts = KeyboardShortcuts;
})();
