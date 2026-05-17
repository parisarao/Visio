/**
 * ShapeFactory — SVG shape path generators for all 10 shape types
 */
(function () {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';

    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    const ShapeFactory = {
        /**
         * Create SVG shape element for a given node
         * @returns SVGElement group with shape + text
         */
        createShape(node) {
            const g = el('g', { class: 'node-group', 'data-id': node.stepId, transform: `translate(${node.x || 0},${node.y || 0})` });
            const w = node.width || 140;
            const h = node.height || 60;
            const shape = this._getShape(node.shapeType, w, h, node);
            shape.classList.add('node-shape');
            g.appendChild(shape);

            const settings = (window.PMB && window.PMB.StateManager) ? window.PMB.StateManager.getSettings() : {};
            // Text
            const text = el('text', {
                x: w / 2, y: h / 2,
                'text-anchor': 'middle', 'dominant-baseline': 'central',
                fill: node.fontColor !== undefined && node.fontColor !== '' ? node.fontColor : (settings.defaultShapeFont || '#000000'),
                'font-size': '12', 'font-weight': '500', 'font-family': 'Inter, sans-serif',
                class: 'node-text'
            });
            // Wrap text if too long
            const label = node.stepName || node.stepId;
            if (label.length > 18) {
                const words = label.split(/\s+/);
                let lines = [], cur = '';
                words.forEach(w2 => {
                    if ((cur + ' ' + w2).trim().length > 16) { lines.push(cur.trim()); cur = w2; }
                    else cur = (cur + ' ' + w2).trim();
                });
                if (cur) lines.push(cur);
                const lineH = 14;
                const startY = h / 2 - ((lines.length - 1) * lineH) / 2;
                lines.forEach((line, i) => {
                    const tspan = el('tspan', { x: w / 2, dy: i === 0 ? '0' : lineH + '' });
                    tspan.textContent = line;
                    if (i === 0) tspan.setAttribute('y', startY + '');
                    text.appendChild(tspan);
                });
            } else {
                text.textContent = label;
            }
            g.appendChild(text);
            return g;
        },

        _getShape(type, w, h, node) {
            const settings = (window.PMB && window.PMB.StateManager) ? window.PMB.StateManager.getSettings() : {};
            let fill = node.backgroundColor !== undefined && node.backgroundColor !== '' ? node.backgroundColor : (settings.defaultShapeBg || 'transparent');
            if (fill === 'transparent') fill = 'none';
            const stroke = node.borderColor !== undefined && node.borderColor !== '' ? node.borderColor : (settings.defaultShapeBorder || '#000000');
            switch (type) {
                case 'start':
                case 'end': return this._stadium(w, h, fill, stroke);
                case 'process': return this._rect(w, h, fill, stroke, 6);
                case 'decision': return this._diamond(w, h, fill, stroke);
                case 'document': return this._document(w, h, fill, stroke);
                case 'database': return this._cylinder(w, h, fill, stroke);
                case 'manualInput': return this._parallelogram(w, h, fill, stroke);
                case 'delay': return this._dShape(w, h, fill, stroke);
                case 'connector': return this._circle(w, h, fill, stroke);
                case 'subprocess': return this._subprocess(w, h, fill, stroke);
                default: return this._rect(w, h, fill, stroke, 6);
            }
        },

        _stadium(w, h, fill, stroke) {
            const r = h / 2;
            return el('rect', { x: 0, y: 0, width: w, height: h, rx: r, ry: r, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _rect(w, h, fill, stroke, rx) {
            return el('rect', { x: 0, y: 0, width: w, height: h, rx: rx || 0, ry: rx || 0, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _diamond(w, h, fill, stroke) {
            const cx = w / 2, cy = h / 2;
            const points = `${cx},0 ${w},${cy} ${cx},${h} 0,${cy}`;
            return el('polygon', { points, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _document(w, h, fill, stroke) {
            const waveH = h * 0.15;
            const d = `M0,0 L${w},0 L${w},${h - waveH} Q${w * 0.75},${h - waveH * 2} ${w * 0.5},${h - waveH} Q${w * 0.25},${h} 0,${h - waveH} Z`;
            return el('path', { d, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _cylinder(w, h, fill, stroke) {
            const ry = h * 0.12;
            const g = el('g');
            // Body
            g.appendChild(el('path', {
                d: `M0,${ry} L0,${h - ry} A${w / 2},${ry} 0 0,0 ${w},${h - ry} L${w},${ry}`,
                fill, stroke, 'stroke-width': '1.5', 'pointer-events': 'all'
            }));
            // Top ellipse
            g.appendChild(el('ellipse', {
                cx: w / 2, cy: ry, rx: w / 2, ry: ry,
                fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all'
            }));
            // Bottom ellipse
            g.appendChild(el('ellipse', {
                cx: w / 2, cy: h - ry, rx: w / 2, ry: ry,
                fill: 'none', stroke, 'stroke-width': '1.5', 'pointer-events': 'all'
            }));
            return g;
        },

        _parallelogram(w, h, fill, stroke) {
            const skew = w * 0.15;
            const points = `${skew},0 ${w},0 ${w - skew},${h} 0,${h}`;
            return el('polygon', { points, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _dShape(w, h, fill, stroke) {
            const r = h / 2;
            const d = `M0,0 L${w - r},0 A${r},${r} 0 0,1 ${w - r},${h} L0,${h} Z`;
            return el('path', { d, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _circle(w, h, fill, stroke) {
            const r = Math.min(w, h) / 2;
            return el('circle', { cx: w / 2, cy: h / 2, r, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _subprocess(w, h, fill, stroke) {
            const g = el('g');
            g.appendChild(el('rect', { x: 0, y: 0, width: w, height: h, rx: 6, ry: 6, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' }));
            // Inner border
            const inset = 5;
            g.appendChild(el('rect', { x: inset, y: inset, width: w - inset * 2, height: h - inset * 2, rx: 3, ry: 3, fill: 'none', stroke, 'stroke-width': '0.8', opacity: '0.5', 'pointer-events': 'none' }));
            return g;
        },

        /**
         * Get connection point on shape boundary
         * @param node - node data with x, y, width, height, shapeType
         * @param side - 'top' | 'bottom' | 'left' | 'right'
         */
        getPort(node, side) {
            const x = node.x || 0, y = node.y || 0, w = node.width || 140, h = node.height || 60;
            switch (side) {
                case 'top':    return { x: x + w / 2, y: y };
                case 'bottom': return { x: x + w / 2, y: y + h };
                case 'left':   return { x: x,         y: y + h / 2 };
                case 'right':  return { x: x + w,     y: y + h / 2 };
                default:       return { x: x + w / 2, y: y + h };
            }
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.ShapeFactory = ShapeFactory;
})();
