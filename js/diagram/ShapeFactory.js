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

    function measureTextWidth(text, fontSize, fontFamily, fontStyle, fontWeight) {
        const textEl = getTextMeasurer();
        if (fontSize) textEl.setAttribute('font-size', fontSize);
        if (fontFamily) textEl.setAttribute('font-family', fontFamily);
        textEl.setAttribute('font-style', fontStyle || 'normal');
        textEl.setAttribute('font-weight', fontWeight || 'normal');
        textEl.textContent = text;
        return textEl.getComputedTextLength();
    }

    function wrapLabelText(label, maxWidth, fontSize, fontFamily, fontStyle, fontWeight) {
        const words = label.split(/\s+/);
        const lines = [];
        let current = '';

        words.forEach(word => {
            const testLine = current ? `${current} ${word}` : word;
            if (measureTextWidth(testLine, fontSize, fontFamily, fontStyle, fontWeight) <= maxWidth) {
                current = testLine;
                return;
            }

            if (current) {
                lines.push(current);
                current = '';
            }

            if (measureTextWidth(word, fontSize, fontFamily, fontStyle, fontWeight) <= maxWidth) {
                current = word;
                return;
            }

            let chunk = '';
            for (const ch of word) {
                const nextChunk = chunk + ch;
                if (measureTextWidth(nextChunk, fontSize, fontFamily, fontStyle, fontWeight) <= maxWidth) {
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
            
            // 1. Determine font size: node override > global default > shape scale defaults
            let fontSize = 12;
            if (node.fontSize !== undefined && node.fontSize !== null && node.fontSize !== '') {
                fontSize = parseInt(node.fontSize, 10) || 12;
            } else if (settings.defaultShapeFontSize !== undefined && settings.defaultShapeFontSize !== null && settings.defaultShapeFontSize !== '') {
                fontSize = parseInt(settings.defaultShapeFontSize, 10) || 12;
            } else {
                if (w >= 220 && h >= 100) {
                    fontSize = 15;
                } else if (w >= 170 && h >= 80) {
                    fontSize = 13;
                } else if (w < 90 || h < 45) {
                    fontSize = 10;
                }
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
            } else if (type === 'predefinedProcess') {
                maxTextWidth = w - 36;
            } else if (type === 'storedData') {
                maxTextWidth = w * 0.76;
            } else if (type === 'internalStorage') {
                maxTextWidth = w - 24;
                usableHeight = h - 14;
                startYOffset = 6;
            } else if (type === 'sequentialData') {
                maxTextWidth = w * 0.64;
                usableHeight = h * 0.64;
            } else if (type === 'directData') {
                maxTextWidth = w * 0.76;
            } else if (type === 'card') {
                maxTextWidth = w - 20;
            } else if (type === 'paperTape') {
                maxTextWidth = w - 20;
                usableHeight = h * 0.7;
            } else if (type === 'display') {
                maxTextWidth = w * 0.72;
            } else if (type === 'manualOperation') {
                maxTextWidth = w * 0.72;
            } else if (type === 'preparation') {
                maxTextWidth = w * 0.72;
            } else if (type === 'annotation' || type === 'doubleAnnotation' || type === 'braceAnnotation') {
                maxTextWidth = w - 32;
                startYOffset = 0;
            } else if (type === 'balloonCallout') {
                maxTextWidth = w - 20;
                usableHeight = h - 16;
                startYOffset = -4; // Nudge slightly up above the bottom pointer pointer
            } else if (type === 'stickyNote') {
                maxTextWidth = w - 24;
                usableHeight = h - 24;
            }

            maxTextWidth = Math.max(20, maxTextWidth);

            // 2. Determine font style and font weight: node override > global default > baseline normal
            const fontStyleVal = node.fontStyle || settings.defaultShapeFontStyle || 'normal';
            let fStyle = 'normal';
            let fWeight = '500';
            if (fontStyleVal === 'italic') {
                fStyle = 'italic';
            } else if (fontStyleVal === 'bold') {
                fWeight = 'bold';
            } else if (fontStyleVal === 'bold-italic' || fontStyleVal === 'italic-bold') {
                fStyle = 'italic';
                fWeight = 'bold';
            }

            // Text Element
            const text = el('text', {
                'text-anchor': 'middle',
                fill: node.fontColor !== undefined && node.fontColor !== '' ? node.fontColor : (settings.defaultShapeFont || '#000000'),
                'font-size': fontSize + '',
                'font-weight': fWeight,
                'font-style': fStyle,
                'font-family': fontFamily,
                class: 'node-text'
            });

            const label = node.stepName || node.stepId;
            const lines = measureTextWidth(label, fontSize + '', fontFamily, fStyle, fWeight) <= maxTextWidth
                ? [label]
                : wrapLabelText(label, maxTextWidth, fontSize + '', fontFamily, fStyle, fWeight);

            // Calculate max lines based on shape's usable height
            const maxLines = Math.max(1, Math.floor((usableHeight - 8) / lineH));
            if (lines.length > maxLines) {
                const clipped = lines.slice(0, maxLines);
                let lastLine = clipped[maxLines - 1];
                const ellipsis = '…';
                while (lastLine.length > 0 && measureTextWidth(lastLine + ellipsis, fontSize + '', fontFamily, fStyle, fWeight) > maxTextWidth) {
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
                case 'predefinedProcess': return this._predefinedProcess(w, h, fill, stroke);
                case 'storedData': return this._storedData(w, h, fill, stroke);
                case 'internalStorage': return this._internalStorage(w, h, fill, stroke);
                case 'sequentialData': return this._sequentialData(w, h, fill, stroke);
                case 'directData': return this._directData(w, h, fill, stroke);
                case 'card': return this._card(w, h, fill, stroke);
                case 'paperTape': return this._paperTape(w, h, fill, stroke);
                case 'display': return this._display(w, h, fill, stroke);
                case 'manualOperation': return this._manualOperation(w, h, fill, stroke);
                case 'preparation': return this._preparation(w, h, fill, stroke);
                case 'annotation': return this._annotation(w, h, fill, stroke, node);
                case 'doubleAnnotation': return this._doubleAnnotation(w, h, fill, stroke, node);
                case 'balloonCallout': return this._balloonCallout(w, h, fill, stroke, node);
                case 'braceAnnotation': return this._braceAnnotation(w, h, fill, stroke, node);
                case 'stickyNote': return this._stickyNote(w, h, fill, stroke, node);
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

        _predefinedProcess(w, h, fill, stroke) {
            const g = el('g');
            const rect = el('rect', { x: 0, y: 0, width: w, height: h, rx: 6, ry: 6, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
            g.appendChild(rect);
            // Left vertical line
            g.appendChild(el('line', { x1: 12, y1: 0, x2: 12, y2: h, stroke, 'stroke-width': '1.5' }));
            // Right vertical line
            g.appendChild(el('line', { x1: w - 12, y1: 0, x2: w - 12, y2: h, stroke, 'stroke-width': '1.5' }));
            return g;
        },

        _storedData(w, h, fill, stroke) {
            const curve = w * 0.1;
            const d = `M${curve},0 L${w},0 Q${w - curve},${h/2} ${w},${h} L${curve},${h} Q0,${h/2} ${curve},0 Z`;
            return el('path', { d, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _internalStorage(w, h, fill, stroke) {
            const g = el('g');
            const rect = el('rect', { x: 0, y: 0, width: w, height: h, rx: 6, ry: 6, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
            g.appendChild(rect);
            // Horizontal line at y=10
            g.appendChild(el('line', { x1: 0, y1: 10, x2: w, y2: 10, stroke, 'stroke-width': '1.5' }));
            // Vertical line at x=10
            g.appendChild(el('line', { x1: 10, y1: 0, x2: 10, y2: h, stroke, 'stroke-width': '1.5' }));
            return g;
        },

        _sequentialData(w, h, fill, stroke) {
            const g = el('g');
            const r = Math.min(w, h) * 0.4;
            const cx = w / 2;
            const cy = h / 2 - 2;
            // Tape circle
            g.appendChild(el('circle', { cx, cy, r, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' }));
            // Tape tail extending to bottom-right
            const tailY = cy + r;
            g.appendChild(el('line', { x1: cx - r, y1: tailY, x2: cx + r + 10, y2: tailY, stroke, 'stroke-width': '1.5' }));
            return g;
        },

        _directData(w, h, fill, stroke) {
            const rx = w * 0.08;
            const g = el('g');
            // Body
            g.appendChild(el('path', {
                d: `M${rx},0 L${w - rx},0 A${rx},${h/2} 0 0,1 ${w - rx},${h} L${rx},${h} A${rx},${h/2} 0 0,1 ${rx},0 Z`,
                fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all'
            }));
            // Left ellipse
            g.appendChild(el('ellipse', {
                cx: rx, cy: h / 2, rx, ry: h / 2,
                fill, stroke, 'stroke-width': '1.5', 'pointer-events': 'all'
            }));
            // Right ellipse
            g.appendChild(el('ellipse', {
                cx: w - rx, cy: h / 2, rx, ry: h / 2,
                fill: 'none', stroke, 'stroke-width': '1.5', 'pointer-events': 'all'
            }));
            return g;
        },

        _card(w, h, fill, stroke) {
            const cut = Math.min(w, h) * 0.15;
            const points = `${cut},0 ${w},0 ${w},${h} 0,${h} 0,${cut}`;
            return el('polygon', { points, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _paperTape(w, h, fill, stroke) {
            const wave = h * 0.12;
            const d = `M0,${wave} Q${w*0.25},0 ${w*0.5},${wave} Q${w*0.75},${wave*2} ${w},${wave} L${w},${h - wave} Q${w*0.75},${h} ${w*0.5},${h - wave} Q${w*0.25},${h - wave*2} 0,${h - wave} Z`;
            return el('path', { d, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _display(w, h, fill, stroke) {
            const cut = w * 0.12;
            const r = h / 2;
            const d = `M${cut},0 L${w - r},0 A${r},${r} 0 0,1 ${w - r},${h} L${cut},${h} L0,${h/2} Z`;
            return el('path', { d, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _manualOperation(w, h, fill, stroke) {
            const inset = w * 0.12;
            const points = `0,0 ${w},0 ${w - inset},${h} ${inset},${h}`;
            return el('polygon', { points, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _preparation(w, h, fill, stroke) {
            const inset = w * 0.12;
            const points = `${inset},0 ${w - inset},0 ${w},${h/2} ${w - inset},${h} ${inset},${h} 0,${h/2}`;
            return el('polygon', { points, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _annotation(w, h, fill, stroke, node) {
            const g = el('g');
            // Open bracket on the left: M15,2 L3,2 L3,h-2 L15,h-2
            const bracketD = `M15,2 L3,2 L3,${h - 2} L15,${h - 2}`;
            const bracket = el('path', { d: bracketD, fill: 'none', stroke, 'stroke-width': '1.5', 'pointer-events': 'all' });
            g.appendChild(bracket);
            
            // Render the static pointer line only when NOT connected to another shape
            const hasConnection = node && (node.nextStep || '');
            if (!hasConnection) {
                const lineD = `M3,${h - 2} L-15,${h + 15}`;
                const pointer = el('path', { d: lineD, fill: 'none', stroke, 'stroke-width': '1.5', 'stroke-dasharray': '3,3', 'pointer-events': 'none' });
                g.appendChild(pointer);
            }
            
            // Invisible background rect for easy selection/hovering on canvas
            const bg = el('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent', stroke: 'none', 'pointer-events': 'all' });
            g.insertBefore(bg, bracket);
            
            return g;
        },

        _doubleAnnotation(w, h, fill, stroke, node) {
            const g = el('g');
            const leftD = `M15,2 L3,2 L3,${h - 2} L15,${h - 2}`;
            const rightD = `M${w - 15},2 L${w - 3},2 L${w - 3},${h - 2} L${w - 15},${h - 2}`;
            g.appendChild(el('path', { d: leftD, fill: 'none', stroke, 'stroke-width': '1.5', 'pointer-events': 'all' }));
            g.appendChild(el('path', { d: rightD, fill: 'none', stroke, 'stroke-width': '1.5', 'pointer-events': 'all' }));
            
            // Invisible background rect
            const bg = el('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent', stroke: 'none', 'pointer-events': 'all' });
            g.insertBefore(bg, g.firstChild);
            
            return g;
        },

        _balloonCallout(w, h, fill, stroke, node) {
            const r = 6;
            const pointerSize = 12;
            const d = `M ${r},0 L ${w - r},0 A ${r},${r} 0 0,1 ${w},${r} L ${w},${h - pointerSize - r} A ${r},${r} 0 0,1 ${w - r},${h - pointerSize} L 30,${h - pointerSize} L 15,${h} L 18,${h - pointerSize} L ${r},${h - pointerSize} A ${r},${r} 0 0,1 0,${h - pointerSize - r} L 0,${r} A ${r},${r} 0 0,1 ${r},0 Z`;
            return el('path', { d, fill, stroke, 'stroke-width': '1.5', filter: 'url(#drop-shadow)', 'pointer-events': 'all' });
        },

        _braceAnnotation(w, h, fill, stroke, node) {
            const g = el('g');
            const halfY = h / 2;
            const braceD = `M 15,2 Q 3,2 3,${halfY / 2} Q 3,${halfY} 0,${halfY} Q 3,${halfY} 3,${halfY + halfY / 2} Q 3,${h - 2} 15,${h - 2}`;
            const brace = el('path', { d: braceD, fill: 'none', stroke, 'stroke-width': '1.8', 'pointer-events': 'all' });
            g.appendChild(brace);

            // Invisible background
            const bg = el('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent', stroke: 'none', 'pointer-events': 'all' });
            g.insertBefore(bg, brace);
            return g;
        },

        _stickyNote(w, h, fill, stroke, node) {
            const g = el('g');
            
            // If the user hasn't overridden the color, use a beautiful pastel yellow default!
            let noteFill = fill;
            if (fill === 'none' || fill === 'transparent') {
                noteFill = '#fef08a'; // Beautiful sticky note yellow
            }
            
            // Asymmetric curled sticky note path
            const d = `M 0,0 L ${w},0 L ${w},${h - 8} Q ${w * 0.75},${h - 8} ${w * 0.5},${h - 4} Q ${w * 0.2},${h + 2} 0,${h - 3} Z`;
            
            const paper = el('path', {
                d,
                fill: noteFill,
                stroke,
                'stroke-width': '1.5',
                filter: 'url(#drop-shadow)',
                'pointer-events': 'all'
            });
            g.appendChild(paper);
            
            // Red paperclip at the top right with 3D drop-shadow
            const clipG = el('g', { transform: `translate(${w - 35}, -4) rotate(15)` });
            
            const shadowClip = el('path', {
                d: 'M 0,5 L 0,22 A 4,4 0 0,0 8,22 L 8,7 A 6,6 0 0,0 -4,7 L -4,27 A 8,8 0 0,0 12,27 L 12,12',
                fill: 'none',
                stroke: 'rgba(0, 0, 0, 0.2)',
                'stroke-width': '2.2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                transform: 'translate(1, 1.5)'
            });
            
            const realClip = el('path', {
                d: 'M 0,5 L 0,22 A 4,4 0 0,0 8,22 L 8,7 A 6,6 0 0,0 -4,7 L -4,27 A 8,8 0 0,0 12,27 L 12,12',
                fill: 'none',
                stroke: '#ef4444', // Red color
                'stroke-width': '2.2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round'
            });
            
            clipG.appendChild(shadowClip);
            clipG.appendChild(realClip);
            g.appendChild(clipG);
            
            return g;
        },

        /**
         * Get connection point on shape boundary
         * @param node - node data with x, y, width, height, shapeType
         * @param side - 'top' | 'bottom' | 'left' | 'right'
         */
        getPort(node, side) {
            const x = node.x || 0, y = node.y || 0, w = node.width || 140, h = node.height || 60;
            
            // Specialized snapping ports for Annotation styles
            if (node.shapeType === 'annotation' || node.shapeType === 'doubleAnnotation' || node.shapeType === 'braceAnnotation') {
                switch (side) {
                    case 'top':    return { x: x + 3, y: y + 2 };      // Top corner of left bracket
                    case 'bottom': return { x: x + 3, y: y + h - 2 };  // Bottom corner of left bracket
                    case 'left':   return { x: x + 3, y: y + h / 2 };  // Middle-left edge of bracket
                    case 'right':  return { x: x + w - 3, y: y + h / 2 }; // Right bracket (if double) or right side
                    default:       return { x: x + 3, y: y + h - 2 };
                }
            } else if (node.shapeType === 'balloonCallout') {
                const pointerSize = 12;
                switch (side) {
                    case 'top':    return { x: x + w / 2, y: y };
                    case 'bottom': return { x: x + 15, y: y + h };     // Snaps exactly to pointer tip!
                    case 'left':   return { x: x, y: y + (h - pointerSize) / 2 };
                    case 'right':  return { x: x + w, y: y + (h - pointerSize) / 2 };
                    default:       return { x: x + 15, y: y + h };
                }
            }

            switch (side) {
                case 'top-left':     return { x: x, y: y };
                case 'top-right':    return { x: x + w, y: y };
                case 'bottom-left':  return { x: x, y: y + h };
                case 'bottom-right': return { x: x + w, y: y + h };
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
