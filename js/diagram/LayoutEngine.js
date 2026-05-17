/**
 * LayoutEngine — ELK.js integration for automatic diagram layout
 */
(function () {
    'use strict';
    const state = () => window.PMB.StateManager;

    const LayoutEngine = {
        _elk: null,

        init() {
            if (typeof ELK !== 'undefined') {
                this._elk = new ELK();
            } else {
                console.error('[LayoutEngine] ELK.js not loaded');
            }
        },

        /**
         * Run auto-layout on current state nodes & edges
         * @returns Promise resolving to nodes with updated x, y positions
         */
        async layout(nodes, edges, lanes, orientation) {
            if (!this._elk) { console.error('ELK not available'); return nodes; }
            if (!nodes || nodes.length === 0) return nodes;

            const settings = state().getSettings();
            const minGap = settings.nodeSpacing || 80;
            const flowDirection = settings.flowDirection || 'horizontal';

            let dir = 'RIGHT';
            if (flowDirection === 'vertical') dir = 'DOWN';
            else if (flowDirection === 'vertical-up') dir = 'UP';

            const headerOffset = lanes && lanes.length > 0 ? 60 : 20;
            const isHoriz = !lanes || lanes.length === 0 || settings.laneOrientation !== 'vertical';

            // Build flat ELK graph for maximum robustness and optimal routing
            const elkGraph = {
                id: 'root',
                layoutOptions: {
                    'elk.algorithm': 'layered',
                    'elk.direction': dir,
                    'elk.spacing.nodeNode': String(minGap),
                    'elk.layered.spacing.nodeNodeBetweenLayers': String(minGap + 35),
                    'elk.layered.spacing.edgeNodeBetweenLayers': String(minGap * 0.4),
                    'elk.edgeRouting': 'ORTHOGONAL',
                    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
                    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
                    'elk.padding': '[top=40,left=80,bottom=40,right=40]'
                },
                children: [],
                edges: []
            };

            nodes.forEach(n => {
                elkGraph.children.push({
                    id: n.stepId,
                    width: n.width || 140,
                    height: n.height || 60
                });
            });

            edges.forEach(e => {
                elkGraph.edges.push({ id: e.id, sources: [e.source], targets: [e.target] });
            });

            try {
                const result = await this._elk.layout(elkGraph);
                // Extract positions
                const posMap = {};
                this._extractPositions(result, posMap, 0, 0);

                // Prepare swimlane maps for centering
                const sortedLanes = lanes ? [...lanes].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
                const laneMap = {};
                sortedLanes.forEach((lane, idx) => { laneMap[lane.id] = idx; });

                const titleText = window.PMB.StateManager ? window.PMB.StateManager.getTitle() : '';
                const startY = titleText ? 70 : 20;
                const laneHeight = 180;
                const laneWidth = 240;

                // Apply positions to nodes with swimlane centering post-processing
                const updated = nodes.map(n => {
                    const pos = posMap[n.stepId];
                    if (pos) {
                        let nx = pos.x + headerOffset;
                        let ny = pos.y + headerOffset;

                        if (lanes && lanes.length > 0 && n.swimlane) {
                            const laneIdx = laneMap[n.swimlane];
                            if (laneIdx !== undefined) {
                                if (isHoriz) {
                                    // Stack horizontal lanes vertically
                                    const laneY = startY + laneIdx * laneHeight;
                                    
                                    // Find all nodes in this lane to compute min Y from ELK
                                    const laneNodes = nodes.filter(x => x.swimlane === n.swimlane);
                                    let minElkY = pos.y;
                                    laneNodes.forEach(ln => {
                                        const lpos = posMap[ln.stepId];
                                        if (lpos && lpos.y < minElkY) minElkY = lpos.y;
                                    });
                                    
                                    const relY = pos.y - minElkY;
                                    ny = laneY + 40 + relY; // 40px top padding
                                } else {
                                    // Stack vertical lanes horizontally
                                    const laneX = 20 + laneIdx * laneWidth;
                                    
                                    // Find all nodes in this lane to compute min X from ELK
                                    const laneNodes = nodes.filter(x => x.swimlane === n.swimlane);
                                    let minElkX = pos.x;
                                    laneNodes.forEach(ln => {
                                        const lpos = posMap[ln.stepId];
                                        if (lpos && lpos.x < minElkX) minElkX = lpos.x;
                                    });
                                    
                                    const relX = pos.x - minElkX;
                                    nx = laneX + 40 + relX; // 40px left padding
                                }
                            }
                        }
                        return { ...n, x: nx, y: ny };
                    }
                    return n;
                });

                // Post-process custom step-level flow directions!
                const nodeMap = {};
                updated.forEach(n => { nodeMap[n.stepId] = n; });

                const shiftSubtree = (nodeId, dx, dy, visited = new Set()) => {
                    if (visited.has(nodeId)) return;
                    visited.add(nodeId);
                    const node = nodeMap[nodeId];
                    if (!node) return;
                    node.x = (node.x || 0) + dx;
                    node.y = (node.y || 0) + dy;
                    if (node.nextStep) shiftSubtree(node.nextStep, dx, dy, visited);
                    if (node.yesPath) shiftSubtree(node.yesPath, dx, dy, visited);
                    if (node.noPath) shiftSubtree(node.noPath, dx, dy, visited);
                };

                updated.forEach(n => {
                    const hasCustomFlow = n.layoutFlow && n.layoutFlow !== 'default';
                    const hasYesFlow = n.yesFlowDir && n.yesFlowDir !== 'default';
                    const hasNoFlow = n.noFlowDir && n.noFlowDir !== 'default';
                    const hasCustomSpacing = n.stepSpacing !== null && n.stepSpacing !== undefined && n.stepSpacing !== '';
                    
                    if (hasCustomFlow || hasYesFlow || hasNoFlow || hasCustomSpacing) {
                        let defaultFlowDir = flowDirection;
                        if (defaultFlowDir === 'vertical') defaultFlowDir = 'down';
                        else if (defaultFlowDir === 'vertical-up') defaultFlowDir = 'up';
                        else defaultFlowDir = 'right';

                        let flow = hasCustomFlow ? n.layoutFlow : defaultFlowDir;
                        const gap = hasCustomSpacing ? parseInt(n.stepSpacing, 10) : minGap;
                        
                        // Find targets
                        const targets = [];
                        if (n.nextStep && nodeMap[n.nextStep]) {
                            targets.push({ node: nodeMap[n.nextStep], path: 'next' });
                        }
                        if (n.yesPath && nodeMap[n.yesPath]) {
                            targets.push({ node: nodeMap[n.yesPath], path: 'yes' });
                        }
                        if (n.noPath && nodeMap[n.noPath]) {
                            targets.push({ node: nodeMap[n.noPath], path: 'no' });
                        }

                        if (targets.length === 1) {
                            const target = targets[0].node;
                            const tFlow = (targets[0].path === 'yes' && hasYesFlow) ? n.yesFlowDir : ((targets[0].path === 'no' && hasNoFlow) ? n.noFlowDir : flow);
                            
                            let targetX = target.x;
                            let targetY = target.y;

                            if (tFlow === 'right') {
                                targetX = n.x + (n.width || 140) + gap;
                                targetY = n.y + ((n.height || 60) - (target.height || 60)) / 2;
                            } else if (tFlow === 'down') {
                                targetX = n.x + ((n.width || 140) - (target.width || 140)) / 2;
                                targetY = n.y + (n.height || 60) + gap;
                            } else if (tFlow === 'up') {
                                targetX = n.x + ((n.width || 140) - (target.width || 140)) / 2;
                                targetY = n.y - (target.height || 60) - gap;
                            } else if (tFlow === 'left') {
                                targetX = n.x - (target.width || 140) - gap;
                                targetY = n.y + ((n.height || 60) - (target.height || 60)) / 2;
                            }

                            const dx = targetX - target.x;
                            const dy = targetY - target.y;
                            if (dx !== 0 || dy !== 0) {
                                shiftSubtree(target.stepId, dx, dy);
                            }
                        } else if (targets.length > 1) {
                            // Multiple targets (e.g. Decision)
                            targets.forEach(t => {
                                const tNode = t.node;
                                let tFlow = flow;
                                if (t.path === 'yes') {
                                    tFlow = hasYesFlow ? n.yesFlowDir : (flow === 'down' ? 'down' : 'right');
                                } else if (t.path === 'no') {
                                    tFlow = hasNoFlow ? n.noFlowDir : (flow === 'down' ? 'right' : 'down');
                                }
                                
                                let tX = tNode.x;
                                let tY = tNode.y;

                                if (tFlow === 'right') {
                                    tX = n.x + (n.width || 140) + gap;
                                    tY = n.y + ((n.height || 60) - (tNode.height || 60)) / 2;
                                } else if (tFlow === 'down') {
                                    tX = n.x + ((n.width || 140) - (tNode.width || 140)) / 2;
                                    tY = n.y + (n.height || 60) + gap;
                                } else if (tFlow === 'up') {
                                    tX = n.x + ((n.width || 140) - (tNode.width || 140)) / 2;
                                    tY = n.y - (tNode.height || 60) - gap;
                                } else if (tFlow === 'left') {
                                    tX = n.x - (tNode.width || 140) - gap;
                                    tY = n.y + ((n.height || 60) - (tNode.height || 60)) / 2;
                                }

                                const dx = tX - tNode.x;
                                const dy = tY - tNode.y;
                                if (dx !== 0 || dy !== 0) shiftSubtree(tNode.stepId, dx, dy);
                            });
                        }
                    }
                });

                return updated;
            } catch (err) {
                console.error('[LayoutEngine] Layout failed:', err);
                // Fallback: simple grid layout
                return this._fallbackLayout(nodes, lanes, isHoriz);
            }
        },

        _findLaneGroup(graph, nodeId) {
            for (const child of graph.children) {
                if (child.children && child.children.find(c => c.id === nodeId)) return child.id;
            }
            return null;
        },

        _extractPositions(node, posMap, offsetX, offsetY) {
            if (node.children) {
                for (const child of node.children) {
                    const cx = (child.x || 0) + offsetX;
                    const cy = (child.y || 0) + offsetY;
                    if (child.children) {
                        this._extractPositions(child, posMap, cx, cy);
                    } else {
                        posMap[child.id] = { x: cx, y: cy };
                    }
                }
            }
        },

        _fallbackLayout(nodes, lanes, isHoriz) {
            const spacing = { x: 200, y: 120 };
            const cols = Math.ceil(Math.sqrt(nodes.length));
            return nodes.map((n, i) => ({
                ...n,
                x: (i % cols) * spacing.x + 80,
                y: Math.floor(i / cols) * spacing.y + 80
            }));
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.LayoutEngine = LayoutEngine;
})();
