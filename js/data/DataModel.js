/**
 * DataModel — Validation, ID generation, and data helpers
 */
(function () {
    'use strict';

    const SHAPE_TYPES = ['start', 'end', 'process', 'decision', 'document', 'database', 'manualInput', 'delay', 'connector', 'subprocess', 'annotation', 'doubleAnnotation', 'balloonCallout', 'braceAnnotation', 'stickyNote'];
 
    const SHAPE_DEFAULTS = {
        start:            { bg: 'transparent', font: '#000000', border: '#000000', w: 120, h: 50 },
        end:              { bg: 'transparent', font: '#000000', border: '#000000', w: 120, h: 50 },
        process:          { bg: 'transparent', font: '#000000', border: '#000000', w: 150, h: 60 },
        decision:         { bg: 'transparent', font: '#000000', border: '#000000', w: 130, h: 100 },
        document:         { bg: 'transparent', font: '#000000', border: '#000000', w: 140, h: 70 },
        database:         { bg: 'transparent', font: '#000000', border: '#000000', w: 100, h: 80 },
        manualInput:      { bg: 'transparent', font: '#000000', border: '#000000', w: 140, h: 60 },
        delay:            { bg: 'transparent', font: '#000000', border: '#000000', w: 120, h: 60 },
        connector:        { bg: 'transparent', font: '#000000', border: '#000000', w: 50,  h: 50 },
        subprocess:       { bg: 'transparent', font: '#000000', border: '#000000', w: 160, h: 70 },
        annotation:       { bg: 'transparent', font: '#000000', border: '#000000', w: 120, h: 50 },
        doubleAnnotation: { bg: 'transparent', font: '#000000', border: '#000000', w: 120, h: 50 },
        balloonCallout:   { bg: 'transparent', font: '#000000', border: '#000000', w: 140, h: 60 },
        braceAnnotation:  { bg: 'transparent', font: '#000000', border: '#000000', w: 120, h: 50 },
        stickyNote:       { bg: '#fef08a',     font: '#713f12', border: '#ca8a04', w: 120, h: 120 }
    };

    class DataModel {
        constructor() {
            this._idCounter = 0;
        }

        get SHAPE_TYPES() { return SHAPE_TYPES; }
        get SHAPE_DEFAULTS() { return SHAPE_DEFAULTS; }

        generateId(prefix) {
            this._idCounter++;
            return (prefix || 'S') + this._idCounter;
        }

        syncIdCounter(nodes) {
            let max = 0;
            nodes.forEach(n => {
                const match = (n.stepId || '').match(/\d+/);
                if (match) max = Math.max(max, parseInt(match[0], 10));
            });
            this._idCounter = max;
        }

        createNode(overrides) {
            const type = (overrides && overrides.shapeType) || 'process';
            const def = SHAPE_DEFAULTS[type] || SHAPE_DEFAULTS.process;
            const settings = (window.PMB && window.PMB.StateManager) ? window.PMB.StateManager.getSettings() : {};

            let baseName = overrides?.stepName || 'New Step';
            let uniqueName = baseName;
            let newX = overrides?.x !== undefined ? overrides.x : 40;
            let newY = overrides?.y !== undefined ? overrides.y : 40;

            if (window.PMB && window.PMB.StateManager && overrides?.x === undefined) {
                const existingNodes = window.PMB.StateManager.getNodes() || [];
                let counter = 1;
                while (existingNodes.some(n => n.stepName === uniqueName)) {
                    uniqueName = `${baseName} (${counter})`;
                    counter++;
                }

                // Find non-overlapping spot
                const isOccupied = (tx, ty) => {
                    return existingNodes.some(n => {
                        const nx = n.x || 0;
                        const ny = n.y || 0;
                        const nw = n.width || 140;
                        const nh = n.height || 60;
                        return !(tx + 140 <= nx || tx >= nx + nw || ty + 60 <= ny || ty >= ny + nh);
                    });
                };
                while (isOccupied(newX, newY)) {
                    newX += 20;
                    newY += 20;
                }
            }

            return {
                stepId: overrides?.stepId || this.generateId('S'),
                stepName: uniqueName,
                description: overrides?.description || '',
                shapeType: type,
                swimlane: overrides?.swimlane || '',
                swimlaneColumn: overrides?.swimlaneColumn || '',
                x: newX,
                y: newY,
                nextStep: overrides?.nextStep || '',
                yesPath: overrides?.yesPath || '',
                noPath: overrides?.noPath || '',
                backgroundColor: overrides?.backgroundColor !== undefined ? overrides.backgroundColor : (settings.defaultShapeBg !== undefined ? settings.defaultShapeBg : def.bg),
                fontColor: overrides?.fontColor !== undefined ? overrides.fontColor : (settings.defaultShapeFont !== undefined ? settings.defaultShapeFont : def.font),
                borderColor: overrides?.borderColor !== undefined ? overrides.borderColor : (settings.defaultShapeBorder !== undefined ? settings.defaultShapeBorder : def.border),
                connectionLineColor: overrides?.connectionLineColor || '#64748b',
                connectionLabel: overrides?.connectionLabel || '',
                yesLabel: overrides?.yesLabel !== undefined ? overrides.yesLabel : 'Yes',
                noLabel: overrides?.noLabel !== undefined ? overrides.noLabel : 'No',
                width: overrides?.width || def.w,
                height: overrides?.height || def.h,
                icon: overrides?.icon || '',
                notes: overrides?.notes || '',
                layoutFlow: overrides?.layoutFlow || 'default',
                yesFlowDir: overrides?.yesFlowDir || 'default',
                noFlowDir: overrides?.noFlowDir || 'default',
                stepSpacing: overrides?.stepSpacing !== undefined ? overrides.stepSpacing : null,
                fontSize: overrides?.fontSize !== undefined ? overrides.fontSize : null,
                fontStyle: overrides?.fontStyle !== undefined ? overrides.fontStyle : '',
                edgeRouting: overrides?.edgeRouting || {},
                x: overrides?.x || 0,
                y: overrides?.y || 0
            };
        }

        createLane(overrides) {
            const id = 'lane-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
            const settings = (window.PMB && window.PMB.StateManager) ? window.PMB.StateManager.getSettings() : {};

            return {
                id: overrides?.id || id,
                name: overrides?.name || 'New Lane',
                headerBackgroundColor: overrides?.headerBackgroundColor !== undefined ? overrides.headerBackgroundColor : (settings.defaultLaneHeaderBg !== undefined ? settings.defaultLaneHeaderBg : 'transparent'),
                backgroundColor: overrides?.backgroundColor !== undefined ? overrides.backgroundColor : 'transparent',
                borderColor: overrides?.borderColor !== undefined ? overrides.borderColor : (settings.defaultLaneBorder !== undefined ? settings.defaultLaneBorder : '#000000'),
                fontColor: overrides?.fontColor !== undefined ? overrides.fontColor : (settings.defaultLaneHeaderFont !== undefined ? settings.defaultLaneHeaderFont : '#000000'),
                order: overrides?.order ?? 0
            };
        }

        validate(stateData) {
            const issues = [];
            const nodes = stateData.nodes || [];
            const ids = new Set();

            const startNodes = nodes.filter(n => n.shapeType === 'start');
            if (startNodes.length === 0) issues.push({ type: 'error', message: 'No Start node defined' });
            if (startNodes.length > 1) issues.push({ type: 'warning', message: 'Multiple Start nodes found' });

            const endNodes = nodes.filter(n => n.shapeType === 'end');
            if (endNodes.length === 0) issues.push({ type: 'warning', message: 'No End node defined' });

            for (const node of nodes) {
                if (ids.has(node.stepId)) {
                    issues.push({ type: 'error', message: 'Duplicate Step ID: "' + node.stepId + '"' });
                }
                ids.add(node.stepId);

                if (node.shapeType === 'decision') {
                    if (!node.yesPath && !node.noPath) {
                        issues.push({ type: 'error', message: 'Decision "' + node.stepId + '" has no Yes/No paths' });
                    }
                }

                if (node.shapeType !== 'decision' && node.shapeType !== 'end') {
                    if (!node.nextStep) {
                        issues.push({ type: 'warning', message: '"' + node.stepId + '" has no Next Step' });
                    }
                }

                var checkRef = function(refId, field) {
                    if (refId) {
                        if (field === 'Next Step') {
                            const refIds = refId.split(',').map(s => s.trim()).filter(Boolean);
                            refIds.forEach(id => {
                                if (!nodes.find(function(n) { return n.stepId === id; })) {
                                    issues.push({ type: 'error', message: '"' + node.stepId + '" ' + field + ' references missing "' + id + '"' });
                                }
                            });
                        } else {
                            if (!nodes.find(function(n) { return n.stepId === refId; })) {
                                issues.push({ type: 'error', message: '"' + node.stepId + '" ' + field + ' references missing "' + refId + '"' });
                            }
                        }
                    }
                };
                checkRef(node.nextStep, 'Next Step');
                checkRef(node.yesPath, 'Yes Path');
                checkRef(node.noPath, 'No Path');

                if (node.swimlane && stateData.lanes && !stateData.lanes.find(function(l) { return l.id === node.swimlane; })) {
                    issues.push({ type: 'warning', message: '"' + node.stepId + '" references missing swimlane' });
                }
                if (node.swimlaneColumn && stateData.laneColumns && !stateData.laneColumns.find(function(l) { return l.id === node.swimlaneColumn; })) {
                    issues.push({ type: 'warning', message: '"' + node.stepId + '" references missing column swimlane' });
                }

                if (node.nextStep) {
                    const refIds = node.nextStep.split(',').map(s => s.trim()).filter(Boolean);
                    if (refIds.includes(node.stepId)) {
                        issues.push({ type: 'error', message: '"' + node.stepId + '" references itself' });
                    }
                }
                if (node.yesPath === node.stepId) issues.push({ type: 'error', message: '"' + node.stepId + '" Yes Path references itself' });
                if (node.noPath === node.stepId) issues.push({ type: 'error', message: '"' + node.stepId + '" No Path references itself' });
            }

            return issues;
        }

        buildEdges(nodes) {
            const edges = [];
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var routing = node.edgeRouting || {};
                
                if (node.shapeType === 'decision') {
                    if (node.yesPath) {
                        const r = routing['yes'] || {};
                        edges.push({
                            id: 'e-' + node.stepId + '-' + node.yesPath + '-yes',
                            source: node.stepId,
                            target: node.yesPath,
                            label: node.yesLabel || 'Yes',
                            type: 'yes',
                            color: '#22c55e',
                            srcPort: r.srcPort || null,
                            tgtPort: r.tgtPort || null,
                            waypoints: r.waypoints || null
                        });
                    }
                    if (node.noPath) {
                        const r = routing['no'] || {};
                        edges.push({
                            id: 'e-' + node.stepId + '-' + node.noPath + '-no',
                            source: node.stepId,
                            target: node.noPath,
                            label: node.noLabel || 'No',
                            type: 'no',
                            color: '#ef4444',
                            srcPort: r.srcPort || null,
                            tgtPort: r.tgtPort || null,
                            waypoints: r.waypoints || null
                        });
                    }
                } else if (node.nextStep && node.shapeType !== 'end') {
                    const r = routing['next'] || {};
                    const nextIds = node.nextStep.split(',').map(s => s.trim()).filter(Boolean);
                    nextIds.forEach((nextId, index) => {
                        edges.push({
                            id: 'e-' + node.stepId + '-' + nextId + (index > 0 ? '-' + index : ''),
                            source: node.stepId,
                            target: nextId,
                            label: node.connectionLabel || '',
                            type: 'normal',
                            color: node.connectionLineColor || '#64748b',
                            srcPort: r.srcPort || null,
                            tgtPort: r.tgtPort || null,
                            waypoints: r.waypoints || null
                        });
                    });
                }
            }
            return edges;
        }
    }

    window.PMB = window.PMB || {};
    window.PMB.DataModel = new DataModel();
})();
