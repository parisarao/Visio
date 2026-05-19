/**
 * App — Main application orchestrator
 * Initializes all modules and handles startup
 */
(function () {
    'use strict';

    function showToast(type, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
    }

    function initApp() {
        const PMB = window.PMB;

        // Toast system
        PMB.EventBus.on('toast', (type, msg) => showToast(type, msg));

        // Initialize core
        PMB.LayoutEngine.init();
        PMB.StorageManager.init();

        // Initialize UI
        PMB.Toolbar.init();
        PMB.ShapeToolbox.init();
        PMB.PropertiesPanel.init();
        PMB.ThemeManager.init();
        PMB.KeyboardShortcuts.init();

        // Initialize Excel Repository Backend
        if (PMB.ExcelRepositoryManager) {
            PMB.ExcelRepositoryManager.init();
        }

        // Initialize diagram
        PMB.DiagramRenderer.init();
        PMB.Minimap.init();

        // Initialize grid
        PMB.GridManager.init();

        // Initialize editor
        PMB.SelectionManager.init();
        PMB.EdgeEditor.init();
        PMB.DragDropManager.init();
        PMB.TextEditor.init();
        PMB.ContextMenu.init();

        // Try to restore auto-save
        if (PMB.StorageManager.hasAutoSave()) {
            PMB.StorageManager.loadAutoSave();
        } else {
            // Load default template
            const defaultTemplate = PMB.Templates['it-support'];
            if (defaultTemplate) {
                PMB.StateManager.loadState(JSON.parse(JSON.stringify(defaultTemplate.data)));
                PMB.DataModel.syncIdCounter(defaultTemplate.data.nodes);
            }
        }

        // Warn on close if dirty
        window.addEventListener('beforeunload', (e) => {
            if (PMB.StateManager.isDirty()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        console.log('[ProcessMapBuilder] Application initialized');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
