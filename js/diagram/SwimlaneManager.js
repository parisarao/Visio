/**
 * SwimlaneManager — Renders horizontal/vertical swimlane containers
 */
(function () {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const state = () => window.PMB.StateManager;

    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    const SwimlaneManager = {
        LANE_HEADER_WIDTH: 40,
        LANE_PADDING: 30,
        MIN_LANE_HEIGHT: 160,

        /**
         * Render swimlane backgrounds into the SVG layer
         * @param lanes - array of lane objects
         * @param nodes - array of node objects (with x, y positions)
         * @param orientation - 'horizontal' or 'vertical'
         * @param svgLayer - SVG <g> element to render into
         * @returns {Object} lane bounds for layout
         */
        render(lanes, nodes, orientation, svgLayer, columns = []) {
            while (svgLayer.firstChild) svgLayer.removeChild(svgLayer.firstChild);

            let sortedColumns = [...(columns || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            if (orientation === 'grid' && sortedColumns.length === 0) {
                sortedColumns = [{ id: 'default-col', name: 'Column 1', order: 0 }];
            }

            const isHoriz = orientation !== 'vertical';
            const renderLanes = isHoriz ? lanes : sortedColumns;
            if (!renderLanes || renderLanes.length === 0) return {};

            const sorted = [...(lanes || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            const bounds = {};

            if (orientation === 'grid') {
                this._renderGrid(sorted, sortedColumns, nodes, svgLayer, bounds);
            } else if (isHoriz) {
                this._renderHorizontal(sorted, nodes, svgLayer, bounds);
            } else {
                this._renderVertical(sortedColumns, nodes, svgLayer, bounds);
            }
            return bounds;
        },

        _laneColors(lane, settings) {
            let headerBg = lane.headerBackgroundColor !== undefined && lane.headerBackgroundColor !== '' ? lane.headerBackgroundColor : (settings.defaultLaneHeaderBg || 'transparent');
            if (headerBg === 'transparent') headerBg = 'none';
            let bodyBg = lane.backgroundColor || 'transparent';
            if (bodyBg === 'transparent') bodyBg = 'none';
            return {
                headerBg,
                bodyBg,
                border: lane.borderColor !== undefined && lane.borderColor !== '' ? lane.borderColor : (settings.defaultLaneBorder || '#000000'),
                font: lane.fontColor !== undefined && lane.fontColor !== '' ? lane.fontColor : (settings.defaultLaneHeaderFont || '#000000')
            };
        },

        _renderTitle(layer, x, y, width, settings) {
            const titleText = window.PMB.StateManager ? window.PMB.StateManager.getTitle() : '';
            if (!titleText) return 0;

            const titleBarH = 50;
            const titleBg = settings.diagramTitleBg !== undefined ? settings.diagramTitleBg : 'transparent';
            const titleFont = settings.diagramTitleFont || '#000000';
            const titleBorder = settings.diagramTitleBorder || '#000000';

            layer.appendChild(el('rect', {
                x, y, width, height: titleBarH,
                fill: titleBg,
                stroke: titleBorder,
                'stroke-width': '1',
                rx: 4,
                class: 'diagram-title-rect'
            }));

            const text = el('text', {
                x: x + 15, y: y + titleBarH / 2,
                'text-anchor': 'start', 'dominant-baseline': 'central',
                fill: titleFont,
                'font-size': '18', 'font-weight': '600',
                'font-family': 'Inter, sans-serif',
                class: 'diagram-title-text'
            });
            text.textContent = titleText;
            layer.appendChild(text);
            return titleBarH + 10;
        },

        _renderGrid(rows, columns, nodes, layer, bounds) {
            const settings = state().getSettings() || {};
            const rowHeaderW = this.LANE_HEADER_WIDTH;
            const colHeaderH = this.LANE_HEADER_WIDTH;
            const padding = this.LANE_PADDING;
            const gap = 2;

            const colWidths = columns.map(col => {
                const colNodes = nodes.filter(n => (n.swimlaneColumn || (columns[0] && columns[0].id)) === col.id);
                if (colNodes.length === 0) return 240;
                const minX = Math.min(...colNodes.map(n => n.x || 0));
                const maxX = Math.max(...colNodes.map(n => (n.x || 0) + (n.width || 140)));
                return Math.max(240, maxX - minX + padding * 2);
            });
            const rowHeights = rows.map(row => {
                const rowNodes = nodes.filter(n => n.swimlane === row.id);
                if (rowNodes.length === 0) return 180;
                const minY = Math.min(...rowNodes.map(n => n.y || 0));
                const maxY = Math.max(...rowNodes.map(n => (n.y || 0) + (n.height || 60)));
                return Math.max(180, maxY - minY + padding * 2);
            });

            const gridWidth = rowHeaderW + colWidths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, columns.length - 1);
            let startY = 10 + this._renderTitle(layer, 0, 10, gridWidth, settings);
            const gridTop = startY + colHeaderH;
            const colStarts = [];
            const rowStarts = [];

            let cursorX = rowHeaderW;
            colWidths.forEach(width => {
                colStarts.push(cursorX);
                cursorX += width + gap;
            });

            let cursorY = gridTop;
            rowHeights.forEach(height => {
                rowStarts.push(cursorY);
                cursorY += height + gap;
            });

            nodes.forEach(node => {
                const colId = node.swimlaneColumn || (columns[0] && columns[0].id);
                if (colId) {
                    const colIdx = columns.findIndex(c => c.id === colId);
                    if (colIdx !== -1) {
                        const minX = colStarts[colIdx] + padding;
                        const maxX = colStarts[colIdx] + colWidths[colIdx] - padding - (node.width || 140);
                        if ((node.x || 0) < minX || (node.x || 0) > maxX) {
                            node.x = Math.max(minX, Math.min(maxX, minX));
                        }
                    }
                }
                if (node.swimlane) {
                    const rowIdx = rows.findIndex(r => r.id === node.swimlane);
                    if (rowIdx !== -1) {
                        const minY = rowStarts[rowIdx] + padding;
                        const maxY = rowStarts[rowIdx] + rowHeights[rowIdx] - padding - (node.height || 60);
                        if ((node.y || 0) < minY || (node.y || 0) > maxY) {
                            node.y = Math.max(minY, Math.min(maxY, minY));
                        }
                    }
                }
            });

            let x = rowHeaderW;
            columns.forEach((column, idx) => {
                const colors = this._laneColors(column, settings);
                layer.appendChild(el('rect', {
                    x, y: startY, width: colWidths[idx], height: colHeaderH,
                    fill: colors.headerBg,
                    stroke: colors.border,
                    'stroke-width': '1',
                    rx: 4,
                    class: 'swimlane-header'
                }));
                const text = el('text', {
                    x: x + colWidths[idx] / 2, y: startY + colHeaderH / 2,
                    'text-anchor': 'middle', 'dominant-baseline': 'central',
                    fill: colors.font,
                    'font-size': '12', 'font-weight': '600',
                    'font-family': 'Inter, sans-serif'
                });
                text.textContent = column.name;
                layer.appendChild(text);
                x += colWidths[idx] + gap;
            });

            let y = gridTop;
            rows.forEach((row, rowIdx) => {
                const rowColors = this._laneColors(row, settings);
                const rowHeight = rowHeights[rowIdx];

                layer.appendChild(el('rect', {
                    x: 0, y, width: rowHeaderW, height: rowHeight,
                    fill: rowColors.headerBg,
                    stroke: rowColors.border,
                    'stroke-width': '1',
                    rx: 4,
                    class: 'swimlane-header'
                }));
                const rowText = el('text', {
                    x: rowHeaderW / 2, y: y + rowHeight / 2,
                    'text-anchor': 'middle', 'dominant-baseline': 'central',
                    fill: rowColors.font,
                    'font-size': '12', 'font-weight': '600',
                    'font-family': 'Inter, sans-serif',
                    transform: `rotate(-90, ${rowHeaderW / 2}, ${y + rowHeight / 2})`
                });
                rowText.textContent = row.name;
                layer.appendChild(rowText);

                let cellX = rowHeaderW;
                columns.forEach((column, colIdx) => {
                    const colColors = this._laneColors(column, settings);
                    const fill = rowColors.bodyBg !== 'none' ? rowColors.bodyBg : colColors.bodyBg;
                    layer.appendChild(el('rect', {
                        x: cellX, y, width: colWidths[colIdx], height: rowHeight,
                        fill,
                        stroke: rowColors.border,
                        'stroke-width': '1',
                        rx: 2,
                        class: 'swimlane-rect',
                        'data-lane-id': row.id,
                        'data-column-lane-id': column.id
                    }));
                    cellX += colWidths[colIdx] + gap;
                });

                bounds[row.id] = { x: rowHeaderW, y, width: gridWidth - rowHeaderW, height: rowHeight };
                y += rowHeight + gap;
            });
        },

        _renderHorizontal(lanes, nodes, layer, bounds) {
            let currentY = 20;
            const headerW = this.LANE_HEADER_WIDTH;
            const padding = this.LANE_PADDING;

            // Calculate total width from nodes
            let maxX = 400;
            nodes.forEach(n => {
                const right = (n.x || 0) + (n.width || 140) + padding * 2;
                if (right > maxX) maxX = right;
            });
            const totalWidth = maxX + headerW + padding;

            const settings = state().getSettings() || {};

            // Dynamic diagram title header at the top
            const titleText = window.PMB.StateManager ? window.PMB.StateManager.getTitle() : '';
            if (titleText) {
                const titleBarH = 50;
                const titleBg = settings.diagramTitleBg !== undefined ? settings.diagramTitleBg : 'transparent';
                const titleFont = settings.diagramTitleFont || '#000000';
                const titleBorder = settings.diagramTitleBorder || '#000000';

                const headerBg = el('rect', {
                    x: 0, y: 10, width: totalWidth, height: titleBarH,
                    fill: titleBg,
                    stroke: titleBorder,
                    'stroke-width': '1',
                    rx: 4, class: 'diagram-title-rect'
                });
                layer.appendChild(headerBg);

                const text = el('text', {
                    x: 15, y: 10 + titleBarH / 2,
                    'text-anchor': 'start', 'dominant-baseline': 'central',
                    fill: titleFont,
                    'font-size': '18', 'font-weight': '600',
                    'font-family': 'Inter, sans-serif',
                    class: 'diagram-title-text'
                });
                text.textContent = titleText;
                layer.appendChild(text);
                currentY = 10 + titleBarH + 10;
            }

            lanes.forEach(lane => {
                const laneNodes = nodes.filter(n => n.swimlane === lane.id);
                
                // Calculate dynamic height based on nodes in this lane
                let laneHeight = 180;
                if (laneNodes.length > 0) {
                    let minY = Infinity;
                    let maxY = -Infinity;
                    laneNodes.forEach(n => {
                        const top = n.y || 0;
                        const bottom = top + (n.height || 60);
                        if (top < minY) minY = top;
                        if (bottom > maxY) maxY = bottom;
                    });
                    
                    const contentHeight = maxY - minY;
                    const requiredHeight = contentHeight + padding * 2;
                    laneHeight = Math.max(180, requiredHeight);
                    
                    // If the top node is outside the current swimlane bounds, shift all nodes in this lane together
                    const expectedTop = currentY + padding;
                    const dy = expectedTop - minY;
                    if (dy !== 0) {
                        laneNodes.forEach(n => {
                            n.y = (n.y || 0) + dy;
                        });
                    }
                }

                let laneHeaderBg = lane.headerBackgroundColor !== undefined && lane.headerBackgroundColor !== '' ? lane.headerBackgroundColor : (settings.defaultLaneHeaderBg || 'transparent');
                if (laneHeaderBg === 'transparent') laneHeaderBg = 'none';
                const laneBorder = lane.borderColor !== undefined && lane.borderColor !== '' ? lane.borderColor : (settings.defaultLaneBorder || '#000000');
                const laneFontColor = lane.fontColor !== undefined && lane.fontColor !== '' ? lane.fontColor : (settings.defaultLaneHeaderFont || '#000000');

                // Lane background
                let laneBg = lane.backgroundColor || 'transparent';
                if (laneBg === 'transparent') laneBg = 'none';
                const rect = el('rect', {
                    x: 0, y: currentY, width: totalWidth, height: laneHeight,
                    fill: laneBg,
                    stroke: laneBorder,
                    'stroke-width': '1', rx: 4, class: 'swimlane-rect',
                    'data-lane-id': lane.id
                });
                layer.appendChild(rect);

                // Lane header
                const headerBg = el('rect', {
                    x: 0, y: currentY, width: headerW, height: laneHeight,
                    fill: laneHeaderBg,
                    stroke: laneBorder,
                    'stroke-width': '1',
                    rx: 4, class: 'swimlane-header'
                });
                layer.appendChild(headerBg);

                // Lane name (rotated)
                const text = el('text', {
                    x: headerW / 2, y: currentY + laneHeight / 2,
                    'text-anchor': 'middle', 'dominant-baseline': 'central',
                    fill: laneFontColor,
                    'font-size': '12', 'font-weight': '600',
                    'font-family': 'Inter, sans-serif',
                    transform: `rotate(-90, ${headerW / 2}, ${currentY + laneHeight / 2})`
                });
                text.textContent = lane.name;
                layer.appendChild(text);

                bounds[lane.id] = { x: headerW, y: currentY, width: totalWidth - headerW, height: laneHeight };
                currentY += laneHeight + 2;
            });
        },

        _renderVertical(lanes, nodes, layer, bounds) {
            let currentX = 20;
            const headerH = this.LANE_HEADER_WIDTH;
            const padding = this.LANE_PADDING;

            // Calculate total width of all vertical lanes combined
            let totalWidth = 0;
            lanes.forEach(lane => {
                const laneNodes = nodes.filter(n => n.swimlaneColumn === lane.id);
                let laneWidth = 240;
                if (laneNodes.length > 0) {
                    let minX = Infinity, maxX2 = 0;
                    laneNodes.forEach(n => {
                        if ((n.x || 0) < minX) minX = n.x || 0;
                        const r = (n.x || 0) + (n.width || 140);
                        if (r > maxX2) maxX2 = r;
                    });
                    laneWidth = Math.max(240, maxX2 - minX + padding * 2);
                }
                totalWidth += laneWidth + 2;
            });

            const settings = state().getSettings() || {};

            let startY = 10;
            const titleText = window.PMB.StateManager ? window.PMB.StateManager.getTitle() : '';
            if (titleText) {
                const titleBarH = 50;
                const titleBg = settings.diagramTitleBg !== undefined ? settings.diagramTitleBg : 'transparent';
                const titleFont = settings.diagramTitleFont || '#000000';
                const titleBorder = settings.diagramTitleBorder || '#000000';

                const headerBg = el('rect', {
                    x: 20, y: 10, width: totalWidth, height: titleBarH,
                    fill: titleBg,
                    stroke: titleBorder,
                    'stroke-width': '1',
                    rx: 4, class: 'diagram-title-rect'
                });
                layer.appendChild(headerBg);

                const text = el('text', {
                    x: 35, y: 10 + titleBarH / 2,
                    'text-anchor': 'start', 'dominant-baseline': 'central',
                    fill: titleFont,
                    'font-size': '18', 'font-weight': '600',
                    'font-family': 'Inter, sans-serif',
                    class: 'diagram-title-text'
                });
                text.textContent = titleText;
                layer.appendChild(text);
                startY = 10 + titleBarH + 10;
            }

            // Calculate dynamic height based on the maximum y position of any node
            let maxY = 0;
            nodes.forEach(n => {
                const bottom = (n.y || 0) + (n.height || 60);
                if (bottom > maxY) maxY = bottom;
            });
            const totalHeight = Math.max(500, maxY + padding * 2);

            lanes.forEach(lane => {
                const laneNodes = nodes.filter(n => n.swimlaneColumn === lane.id);
                
                // Calculate dynamic width based on nodes in this lane
                let laneWidth = 240;
                if (laneNodes.length > 0) {
                    let minX = Infinity;
                    let maxX = -Infinity;
                    laneNodes.forEach(n => {
                        const left = n.x || 0;
                        const right = left + (n.width || 140);
                        if (left < minX) minX = left;
                        if (right > maxX) maxX = right;
                    });
                    
                    const contentWidth = maxX - minX;
                    const requiredWidth = contentWidth + padding * 2;
                    laneWidth = Math.max(240, requiredWidth);
                    
                    // Shift nodes in this lane horizontally if they go outside
                    const expectedLeft = currentX + padding;
                    const dx = expectedLeft - minX;
                    if (dx !== 0) {
                        laneNodes.forEach(n => {
                            n.x = (n.x || 0) + dx;
                        });
                    }
                }

                let laneHeaderBg = lane.headerBackgroundColor !== undefined && lane.headerBackgroundColor !== '' ? lane.headerBackgroundColor : (settings.defaultLaneHeaderBg || 'transparent');
                if (laneHeaderBg === 'transparent') laneHeaderBg = 'none';
                const laneBorder = lane.borderColor !== undefined && lane.borderColor !== '' ? lane.borderColor : (settings.defaultLaneBorder || '#000000');
                const laneFontColor = lane.fontColor !== undefined && lane.fontColor !== '' ? lane.fontColor : (settings.defaultLaneHeaderFont || '#000000');

                let laneBg = lane.backgroundColor || 'transparent';
                if (laneBg === 'transparent') laneBg = 'none';
                const rect = el('rect', {
                    x: currentX, y: startY, width: laneWidth, height: totalHeight - startY,
                    fill: laneBg,
                    stroke: laneBorder,
                    'stroke-width': '1', rx: 4, class: 'swimlane-rect',
                    'data-lane-id': lane.id
                });
                layer.appendChild(rect);

                const headerBg = el('rect', {
                    x: currentX, y: startY, width: laneWidth, height: headerH,
                    fill: laneHeaderBg,
                    stroke: laneBorder,
                    'stroke-width': '1',
                    rx: 4,
                    class: 'swimlane-header'
                });
                layer.appendChild(headerBg);

                const text = el('text', {
                    x: currentX + laneWidth / 2, y: startY + headerH / 2,
                    'text-anchor': 'middle', 'dominant-baseline': 'central',
                    fill: laneFontColor,
                    'font-size': '12', 'font-weight': '600', 'font-family': 'Inter, sans-serif'
                });
                text.textContent = lane.name;
                layer.appendChild(text);

                bounds[lane.id] = { x: currentX, y: startY + headerH, width: laneWidth, height: totalHeight - startY - headerH };
                currentX += laneWidth + 2;
            });
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.SwimlaneManager = SwimlaneManager;
})();
