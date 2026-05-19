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

    let _textMeasurer = null;
    function getTextMeasurer() {
        if (!_textMeasurer) {
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('aria-hidden', 'true');
            svg.style.position = 'absolute';
            svg.style.visibility = 'hidden';
            svg.style.width = '0';
            svg.style.height = '0';
            svg.style.overflow = 'hidden';
            document.body.appendChild(svg);
            const text = document.createElementNS(NS, 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', '0');
            svg.appendChild(text);
            _textMeasurer = text;
        }
        return _textMeasurer;
    }

    function measureTextWidth(text, fontSize, fontFamily) {
        const textEl = getTextMeasurer();
        if (fontSize) textEl.setAttribute('font-size', fontSize);
        if (fontFamily) textEl.setAttribute('font-family', fontFamily);
        textEl.textContent = text;
        return textEl.getComputedTextLength();
    }

    function wrapLabelText(label, maxWidth, fontSize, fontFamily) {
        const words = label.split(/\s+/);
        const lines = [];
        let current = '';

        words.forEach(word => {
            const testLine = current ? `${current} ${word}` : word;
            if (measureTextWidth(testLine, fontSize, fontFamily) <= maxWidth) {
                current = testLine;
                return;
            }

            if (current) {
                lines.push(current);
                current = '';
            }

            if (measureTextWidth(word, fontSize, fontFamily) <= maxWidth) {
                current = word;
                return;
            }

            let chunk = '';
            for (const ch of word) {
                const nextChunk = chunk + ch;
                if (measureTextWidth(nextChunk, fontSize, fontFamily) <= maxWidth) {
                    chunk = nextChunk;
                    continue;
                }
                if (chunk) lines.push(chunk);
                chunk = ch;
            }
            current = chunk;
        });

        if (current) lines.push(current);
        return lines;
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
            
            // 1. Auto-adjust font size and line height based on shape scale
            let fontSize = 12;
            if (w >= 220 && h >= 100) {
                fontSize = 15;
            } else if (w >= 170 && h >= 80) {
                fontSize = 13;
            } else if (w < 90 || h < 45) {
                fontSize = 10;
            }
            const lineH = fontSize + 2;
            const fontFamily = 'Inter, sans-serif';

            // 2. Shape-specific bounding constraints to keep text perfectly within physical boundaries
            let maxTextWidth = w - 20;
            let usableHeight = h;
            let startYOffset = 0;
            const type = node.shapeType;

            if (type === 'decision') {
                maxTextWidth = w * 0.52;
                usableHeight = h * 0.8;
            } else if (type === 'connector') {
                maxTextWidth = w * 0.68;
                usableHeight = h * 0.68;
            } else if (type === 'database') {
                maxTextWidth = w * 0.8;
                usableHeight = h * 0.72;
                startYOffset = h * 0.06; // nudge text down below the top cylinder ellipse
            } else if (type === 'document') {
                maxTextWidth = w - 20;
                usableHeight = h * 0.8; // keep text above the bottom document wave
            } else if (type === 'manualInput') {
                maxTextWidth = w * 0.7;
                usableHeight = h * 0.8; // keep inside skewed parallelogram
            } else if (type === 'subprocess') {
                maxTextWidth = w - 30; // avoid double border
                usableHeight = h - 20;
            } else if (type === 'comment') {
                maxTextWidth = w - 24;
                usableHeight = h * 0.8;
            } else if (type === 'start' || type === 'end') {
                maxTextWidth = w - 32; // avoid curved stadium sides
            }

            maxTextWidth = Math.max(20, maxTextWidth);

            // Text Element
            const text = el('text', {
                'text-anchor': 'middle',
                fill: node.fontColor !== undefined && node.fontColor !== '' ? node.fontColor : (settings.defaultShapeFont || '#000000'),
                'font-size': fontSize + '',
                'font-weight': '500',
                'font-family': fontFamily,
                class: 'node-text'
            });

            const label = node.stepName || node.stepId;
            const lines = measureTextWidth(label, fontSize + '', fontFamily) <= maxTextWidth
                ? [label]
                : wrapLabelText(label, maxTextWidth, fontSize + '', fontFamily);

            // Calculate max lines based on shape's usable height
            const maxLines = Math.max(1, Math.floor((usableHeight - 8) / lineH));
            if (lines.length > maxLines) {
                const clipped = lines.slice(0, maxLines);
                let lastLine = clipped[maxLines - 1];
                const ellipsis = '…';
                while (lastLine.length > 0 && measureTextWidth(lastLine + ellipsis, fontSize + '', fontFamily) > maxTextWidth) {
                    lastLine = lastLine.slice(0, -1);
                }
                clipped[maxLines - 1] = lastLine + ellipsis;
                lines.length = 0;
                lines.push(...clipped);
            }

            // 3. Bulletproof, multi-browser vertical centering using explicit tspans with absolute coordinates
            const startY = h / 2 - ((lines.length - 1) * lineH) / 2 + startYOffset + (fontSize * 0.3);
            lines.forEach((line, i) => {
                const tspan = el('tspan', {
                    x: w / 2,
                    y: startY + (i * lineH)
                });
                tspan.textContent = line;
                text.appendChild(tspan);
            });

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
                case 'comment': return this._comment(w, h, fill, stroke);
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

        _comment(w, h, fill, stroke) {
            // A simple comment/callout: rounded rect with a small triangular tail on the bottom-left
            const g = el('g');
            const rect = el('rect', { x: 0, y: 0, width: w, height: h, rx: 6, ry: 6, fill, stroke, 'stroke-width': '1.2', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
            g.appendChild(rect);
            // Tail triangle size relative to height
            const tailW = Math.min(18, Math.max(8, Math.round(w * 0.12)));
            const tailH = Math.min(12, Math.max(6, Math.round(h * 0.25)));
            const tx = 6; // horizontal offset from left
            const ty = h; // base at bottom
            const tailD = `M${tx},${ty} L${tx + tailW},${ty - tailH} L${tx + tailW + 2},${ty - tailH} Z`;
            const tail = el('path', { d: tailD, fill, stroke, 'stroke-width': '1.2', 'pointer-events': 'none' });
            g.appendChild(tail);
            return g;
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
