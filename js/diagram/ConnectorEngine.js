/**
 * ConnectorEngine — Edge routing with orthogonal, straight, and curved paths
 */
(function () {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const shapes = () => window.PMB.ShapeFactory;

    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    const ConnectorEngine = {
        /**
         * Create SVG connector between two nodes
         */
        createConnector(edge, sourceNode, targetNode, style) {
            const g = el('g', { class: 'connector-group', 'data-edge-id': edge.id });
            const connStyle = style || 'orthogonal';

            // Determine best port sides or use custom ones
            const ports = {
                source: edge.srcPort || this._bestPorts(sourceNode, targetNode).source,
                target: edge.tgtPort || this._bestPorts(sourceNode, targetNode).target
            };
            const src = shapes().getPort(sourceNode, ports.source);
            const tgt = shapes().getPort(targetNode, ports.target);

            let pathD;
            let points = [];
            if (edge.waypoints && edge.waypoints.length > 0) {
                const res = this._customOrthogonalPath(src, tgt, edge.waypoints);
                pathD = res.d;
                points = res.points;
            } else {
                switch (connStyle) {
                    case 'straight': pathD = this._straightPath(src, tgt); points = [src, tgt]; break;
                    case 'curved':   pathD = this._curvedPath(src, tgt); points = [src, tgt]; break;
                    default:         
                        const res = this._orthogonalPath(src, tgt, ports);
                        pathD = res.d;
                        points = res.points;
                        break;
                }
            }
            g.setAttribute('data-points', JSON.stringify(points));

            // Determine marker and color
            let markerEnd = 'url(#arrowhead)';
            let color = edge.color || '#64748b';
            if (edge.type === 'yes') { markerEnd = 'url(#arrowhead-yes)'; color = '#22c55e'; }
            else if (edge.type === 'no') { markerEnd = 'url(#arrowhead-no)'; color = '#ef4444'; }

            const path = el('path', {
                d: pathD,
                class: 'connector-path',
                fill: 'none',
                stroke: color,
                'stroke-width': '1.8',
                'marker-end': markerEnd,
                'data-edge-id': edge.id
            });
            g.appendChild(path);

            // Label
            if (edge.label) {
                const mid = this._labelPoint(points);
                const labelG = el('g', { transform: `translate(${mid.x},${mid.y})` });
                const bg = el('rect', {
                    x: -16, y: -10, width: 32, height: 18, rx: 4,
                    class: 'connector-label-bg',
                    fill: '#ffffff', 'fill-opacity': '1',
                    stroke: color, 'stroke-width': '1', opacity: '0.95'
                });
                const txt = el('text', {
                    x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                    fill: color, 'font-size': '10', 'font-weight': '600',
                    'font-family': 'Inter, sans-serif', class: 'connector-label'
                });
                txt.textContent = edge.label;
                // Adjust bg width to text
                const estW = edge.label.length * 7 + 12;
                bg.setAttribute('width', estW);
                bg.setAttribute('x', -estW / 2);
                labelG.appendChild(bg);
                labelG.appendChild(txt);
                g.appendChild(labelG);
            }

            return g;
        },

        _bestPorts(src, tgt) {
            const sx = src.x + (src.width || 140) / 2;
            const sy = src.y + (src.height || 60) / 2;
            const tx = tgt.x + (tgt.width || 140) / 2;
            const ty = tgt.y + (tgt.height || 60) / 2;
            const dx = tx - sx, dy = ty - sy;

            if (Math.abs(dy) > Math.abs(dx)) {
                return dy > 0
                    ? { source: 'bottom', target: 'top' }
                    : { source: 'top', target: 'bottom' };
            } else {
                return dx > 0
                    ? { source: 'right', target: 'left' }
                    : { source: 'left', target: 'right' };
            }
        },

        _straightPath(src, tgt) {
            return `M${src.x},${src.y} L${tgt.x},${tgt.y}`;
        },

        _curvedPath(src, tgt) {
            const mx = (src.x + tgt.x) / 2;
            return `M${src.x},${src.y} C${mx},${src.y} ${mx},${tgt.y} ${tgt.x},${tgt.y}`;
        },

        _orthogonalPath(src, tgt, ports) {
            let points = [src];

            if (ports.source === 'bottom' && ports.target === 'top') {
                const midY = (src.y + tgt.y) / 2;
                if (Math.abs(src.x - tgt.x) < 5) {
                    points.push(tgt);
                } else {
                    points.push({ x: src.x, y: midY });
                    points.push({ x: tgt.x, y: midY });
                    points.push(tgt);
                }
            } else if (ports.source === 'top' && ports.target === 'bottom') {
                const midY = (src.y + tgt.y) / 2;
                points.push({ x: src.x, y: midY });
                points.push({ x: tgt.x, y: midY });
                points.push(tgt);
            } else if (ports.source === 'right' && ports.target === 'left') {
                const midX = (src.x + tgt.x) / 2;
                points.push({ x: midX, y: src.y });
                points.push({ x: midX, y: tgt.y });
                points.push(tgt);
            } else if (ports.source === 'left' && ports.target === 'right') {
                const midX = (src.x + tgt.x) / 2;
                points.push({ x: midX, y: src.y });
                points.push({ x: midX, y: tgt.y });
                points.push(tgt);
            } else {
                // fallback routing
                points.push({ x: src.x, y: tgt.y });
                points.push(tgt);
            }

            let d = `M${points[0].x},${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                d += ` L${points[i].x},${points[i].y}`;
            }
            return { d, points };
        },

        _customOrthogonalPath(src, tgt, waypoints) {
            let points = [src];
            for (let wp of waypoints) {
                points.push({ x: wp.x, y: wp.y });
            }
            points.push(tgt);
            
            // To ensure 90-degree angles, if consecutive points don't align, we auto-insert intermediate points.
            let orthPoints = [points[0]];
            for (let i = 1; i < points.length; i++) {
                let prev = orthPoints[orthPoints.length - 1];
                let curr = points[i];
                if (Math.abs(prev.x - curr.x) > 2 && Math.abs(prev.y - curr.y) > 2) {
                    // Create an elbow
                    if (i === points.length - 1) {
                        // Last segment, typically goes vertically then horizontally or vice versa
                        orthPoints.push({ x: prev.x, y: curr.y });
                    } else {
                        orthPoints.push({ x: curr.x, y: prev.y });
                    }
                }
                orthPoints.push(curr);
            }

            let d = `M${orthPoints[0].x},${orthPoints[0].y}`;
            for (let i = 1; i < orthPoints.length; i++) {
                d += ` L${orthPoints[i].x},${orthPoints[i].y}`;
            }
            return { d, points: orthPoints };
        },

        _midpoint(src, tgt) {
            return { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 };
        },

        _labelPoint(points) {
            if (!points || points.length < 2) return { x: 0, y: 0 };

            const segments = [];
            let totalLength = 0;
            for (let i = 0; i < points.length - 1; i++) {
                const start = points[i];
                const end = points[i + 1];
                const length = Math.hypot(end.x - start.x, end.y - start.y);
                if (length <= 0) continue;
                segments.push({ start, end, length });
                totalLength += length;
            }

            if (segments.length === 0) return points[0];

            let target = totalLength / 2;
            for (const segment of segments) {
                if (target <= segment.length) {
                    const ratio = target / segment.length;
                    return {
                        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
                        y: segment.start.y + (segment.end.y - segment.start.y) * ratio
                    };
                }
                target -= segment.length;
            }

            const last = segments[segments.length - 1];
            return {
                x: (last.start.x + last.end.x) / 2,
                y: (last.start.y + last.end.y) / 2
            };
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.ConnectorEngine = ConnectorEngine;
})();
