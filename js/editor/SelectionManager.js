/**
 * SelectionManager — Multi-select, align, distribute
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;

    const SelectionManager = {
        _selected: [],
        _selectedEdges: [],

        init() {
            bus().on('node:selected', (id) => {
                this._selected = id ? [id] : [];
                this._selectedEdges = [];
                bus().emit('selection:changed', this._selected);
            });
            bus().on('edge:selected', (id) => {
                this._selectedEdges = id ? [id] : [];
                this._selected = [];
                bus().emit('selection:changed', this._selected);
            });
        },

        getSelected() { return this._selected; },
        getSelectedEdges() { return this._selectedEdges; },

        selectMultiple(ids) {
            this._selected = ids;
            this._selectedEdges = [];
            bus().emit('selection:changed', this._selected);
        },

        clear() {
            this._selected = [];
            this._selectedEdges = [];
            bus().emit('selection:changed', this._selected);
        },

        alignLeft() {
            if (this._selected.length < 2) return;
            const nodes = state().getNodes();
            const sel = nodes.filter(n => this._selected.includes(n.stepId));
            const minX = Math.min(...sel.map(n => n.x || 0));
            sel.forEach(n => state().updateNode(n.stepId, { x: minX }));
        },

        alignCenter() {
            if (this._selected.length < 2) return;
            const nodes = state().getNodes();
            const sel = nodes.filter(n => this._selected.includes(n.stepId));
            const avgX = sel.reduce((s, n) => s + (n.x || 0) + (n.width || 140) / 2, 0) / sel.length;
            sel.forEach(n => state().updateNode(n.stepId, { x: avgX - (n.width || 140) / 2 }));
        },

        alignTop() {
            if (this._selected.length < 2) return;
            const nodes = state().getNodes();
            const sel = nodes.filter(n => this._selected.includes(n.stepId));
            const minY = Math.min(...sel.map(n => n.y || 0));
            sel.forEach(n => state().updateNode(n.stepId, { y: minY }));
        },

        alignMiddle() {
            if (this._selected.length < 2) return;
            const nodes = state().getNodes();
            const sel = nodes.filter(n => this._selected.includes(n.stepId));
            const avgY = sel.reduce((s, n) => s + (n.y || 0) + (n.height || 60) / 2, 0) / sel.length;
            sel.forEach(n => state().updateNode(n.stepId, { y: avgY - (n.height || 60) / 2 }));
        },

        distributeHorizontally() {
            if (this._selected.length < 3) return;
            const nodes = state().getNodes();
            const sel = nodes.filter(n => this._selected.includes(n.stepId)).sort((a, b) => (a.x || 0) - (b.x || 0));
            const minX = sel[0].x || 0;
            const maxX = sel[sel.length - 1].x || 0;
            const spacing = (maxX - minX) / (sel.length - 1);
            sel.forEach((n, i) => state().updateNode(n.stepId, { x: minX + i * spacing }));
        },

        distributeVertically() {
            if (this._selected.length < 3) return;
            const nodes = state().getNodes();
            const sel = nodes.filter(n => this._selected.includes(n.stepId)).sort((a, b) => (a.y || 0) - (b.y || 0));
            const minY = sel[0].y || 0;
            const maxY = sel[sel.length - 1].y || 0;
            const spacing = (maxY - minY) / (sel.length - 1);
            sel.forEach((n, i) => state().updateNode(n.stepId, { y: minY + i * spacing }));
        },

        setMultiX(val) {
            if (this._selected.length === 0) return;
            this._selected.forEach(id => state().updateNode(id, { x: val }));
        },

        setMultiY(val) {
            if (this._selected.length === 0) return;
            this._selected.forEach(id => state().updateNode(id, { y: val }));
        },

        setMultiWidth(val) {
            if (this._selected.length === 0) return;
            this._selected.forEach(id => state().updateNode(id, { width: val }));
        },

        setMultiHeight(val) {
            if (this._selected.length === 0) return;
            this._selected.forEach(id => state().updateNode(id, { height: val }));
        },

        setMultiStyle(field, val) {
            if (this._selected.length === 0) return;
            this._selected.forEach(id => state().updateNode(id, { [field]: val }));
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.SelectionManager = SelectionManager;
})();
