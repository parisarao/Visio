/**
 * TextEditor — Inline text editing on double-click
 */
(function () {
    'use strict';
    const state = () => window.PMB.StateManager;

    const TextEditor = {
        init() {
            const svg = document.getElementById('diagram-svg');
            svg.addEventListener('dblclick', (e) => {
                const nodeGroup = e.target.closest('.node-group');
                if (!nodeGroup) return;
                const id = nodeGroup.getAttribute('data-id');
                const node = state().getNodes().find(n => n.stepId === id);
                if (!node) return;

                const newName = prompt('Edit step name:', node.stepName || '');
                if (newName !== null) {
                    state().updateNode(id, { stepName: newName });
                }
            });
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.TextEditor = TextEditor;
})();
