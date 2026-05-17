/**
 * StorageManager — localStorage auto-save + File System Access API
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;
    const STORAGE_KEY = 'pmb_autosave';
    const AUTOSAVE_INTERVAL = 15000; // 15 seconds

    class StorageManager {
        constructor() {
            this._fileHandle = null;
            this._autoSaveTimer = null;
        }

        init() {
            // Start auto-save
            this._autoSaveTimer = setInterval(() => this.autoSave(), AUTOSAVE_INTERVAL);
            bus().on('state:changed', () => this._scheduleAutoSave());
        }

        _scheduleAutoSave() {
            // debounced autosave on state change
            if (this._debounce) clearTimeout(this._debounce);
            this._debounce = setTimeout(() => this.autoSave(), 2000);
        }

        autoSave() {
            try {
                const data = JSON.stringify(state().getState());
                localStorage.setItem(STORAGE_KEY, data);
            } catch (e) {
                console.warn('[StorageManager] Auto-save failed:', e);
            }
        }

        hasAutoSave() {
            return localStorage.getItem(STORAGE_KEY) !== null;
        }

        loadAutoSave() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const data = JSON.parse(raw);
                    state().loadState(data);
                    bus().emit('toast', 'info', 'Auto-save restored');
                    return true;
                }
            } catch (e) {
                console.error('[StorageManager] Failed to load auto-save:', e);
            }
            return false;
        }

        clearAutoSave() {
            localStorage.removeItem(STORAGE_KEY);
        }

        async saveToFile() {
            const data = JSON.stringify(state().getState(), null, 2);
            // Try File System Access API
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'process-map.json',
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(data);
                    await writable.close();
                    this._fileHandle = handle;
                    state().markClean();
                    bus().emit('toast', 'success', 'File saved successfully');
                    return true;
                } catch (e) {
                    if (e.name === 'AbortError') return false;
                    console.error('[StorageManager] File save error:', e);
                }
            }
            // Fallback: download
            this._downloadFile(data, 'process-map.json', 'application/json');
            state().markClean();
            bus().emit('toast', 'success', 'File downloaded');
            return true;
        }

        async openFile() {
            if (window.showOpenFilePicker) {
                try {
                    const [handle] = await window.showOpenFilePicker({
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const file = await handle.getFile();
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this._fileHandle = handle;
                    state().loadState(data);
                    bus().emit('toast', 'success', 'File loaded successfully');
                    return true;
                } catch (e) {
                    if (e.name === 'AbortError') return false;
                    bus().emit('toast', 'error', 'Failed to open file: ' + e.message);
                }
            } else {
                // Fallback: input element
                return this._openViaInput();
            }
            return false;
        }

        _openViaInput() {
            return new Promise(resolve => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) { resolve(false); return; }
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        state().loadState(data);
                        bus().emit('toast', 'success', 'File loaded successfully');
                        resolve(true);
                    } catch (err) {
                        bus().emit('toast', 'error', 'Invalid JSON file');
                        resolve(false);
                    }
                };
                input.click();
            });
        }

        _downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        destroy() {
            if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
            if (this._debounce) clearTimeout(this._debounce);
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.StorageManager = new StorageManager();
})();
