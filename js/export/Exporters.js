/**
 * Exporters — PDF, PNG, JPEG, and SVG export functionality
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const storage = () => window.PMB.StorageManager;
    const state = () => window.PMB.StateManager;

    const Exporters = {
        /**
         * Clones the main SVG, computes content-aware bounding box, inlines active CSS stylesheets,
         * and configures high-DPI scaling.
         */
        _prepareExportSVG() {
            const svg = document.getElementById('diagram-svg');
            if (!svg) throw new Error('Diagram SVG element not found');

            // Clone SVG
            const clone = svg.cloneNode(true);

            // Compute exact visual bounding box of contents
            const layers = [
                document.getElementById('swimlane-layer'),
                document.getElementById('connector-layer'),
                document.getElementById('node-layer')
            ];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            layers.forEach(layer => {
                if (layer && layer.children.length > 0) {
                    const bbox = layer.getBBox();
                    if (bbox.width > 0 && bbox.height > 0) {
                        minX = Math.min(minX, bbox.x);
                        minY = Math.min(minY, bbox.y);
                        maxX = Math.max(maxX, bbox.x + bbox.width);
                        maxY = Math.max(maxY, bbox.y + bbox.height);
                    }
                }
            });

            // Fallback if no nodes/lanes
            if (minX === Infinity) {
                minX = 0; minY = 0; maxX = 800; maxY = 600;
            }

            // Frame the content beautifully with padding
            const padding = 40;
            const x = minX - padding;
            const y = minY - padding;
            const w = (maxX - minX) + padding * 2;
            const h = (maxY - minY) + padding * 2;

            // Set precise content boundaries
            clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
            clone.setAttribute('width', w);
            clone.setAttribute('height', h);

            // Remove interactive helper overlay elements
            const overlay = clone.querySelector('#overlay-layer');
            if (overlay) overlay.innerHTML = '';

            // Apply solid white or light canvas background color depending on theme
            const gridBg = clone.querySelector('#grid-bg');
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            if (gridBg) {
                gridBg.setAttribute('fill', currentTheme === 'light' ? '#ffffff' : 'var(--bg-canvas)');
            }

            // Inline all active styles (supports resolving HSL/HEX CSS variables)
            const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            let cssText = '';
            for (const sheet of document.styleSheets) {
                try {
                    const rules = sheet.cssRules || sheet.rules;
                    if (rules) {
                        for (const rule of rules) {
                            cssText += rule.cssText + '\n';
                        }
                    }
                } catch (e) {
                    // Skip cross-origin sheets safely
                }
            }
            styleEl.textContent = cssText;
            clone.insertBefore(styleEl, clone.firstChild);

            // Set current theme attribute for correct variable inheritance
            clone.setAttribute('data-theme', currentTheme);

            return { clone, width: w, height: h };
        },

        async exportPDF() {
            try {
                bus().emit('toast', 'info', 'Generating PDF...');
                const { clone, width, height } = this._prepareExportSVG();
                const { jsPDF } = window.jspdf;

                // Configure PDF size to match diagram dimensions
                const doc = new jsPDF({
                    orientation: width > height ? 'landscape' : 'portrait',
                    unit: 'pt',
                    format: [width + 40, height + 40]
                });

                // Temporarily add clone to DOM for svg2pdf
                clone.style.position = 'absolute';
                clone.style.left = '-9999px';
                document.body.appendChild(clone);

                await doc.svg(clone, { x: 20, y: 20, width: width, height: height });
                doc.save('process-map.pdf');
                document.body.removeChild(clone);

                bus().emit('toast', 'success', 'PDF exported successfully');
            } catch (err) {
                console.error('[Exporters] PDF export error:', err);
                bus().emit('toast', 'error', 'PDF export failed: ' + err.message);
            }
        },

        async exportPNG() {
            try {
                bus().emit('toast', 'info', 'Generating PNG...');
                const { clone, width, height } = this._prepareExportSVG();

                // High-definition DPI multiplier
                const scale = 2;
                const canvasW = width * scale;
                const canvasH = height * scale;

                clone.setAttribute('width', canvasW);
                clone.setAttribute('height', canvasH);

                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasW;
                    canvas.height = canvasH;
                    const ctx = canvas.getContext('2d');

                    // Draw white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvasW, canvasH);

                    // Draw image
                    ctx.drawImage(img, 0, 0, canvasW, canvasH);
                    canvas.toBlob(blob2 => {
                        storage().downloadBlob(blob2, 'process-map.png');
                        bus().emit('toast', 'success', 'PNG exported successfully');
                    }, 'image/png');
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            } catch (err) {
                console.error('[Exporters] PNG export error:', err);
                bus().emit('toast', 'error', 'PNG export failed: ' + err.message);
            }
        },

        async exportJPEG() {
            try {
                bus().emit('toast', 'info', 'Generating JPEG...');
                const { clone, width, height } = this._prepareExportSVG();

                const scale = 2;
                const canvasW = width * scale;
                const canvasH = height * scale;

                clone.setAttribute('width', canvasW);
                clone.setAttribute('height', canvasH);

                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasW;
                    canvas.height = canvasH;
                    const ctx = canvas.getContext('2d');

                    // Draw white background (essential for JPEGs to avoid transparency-to-black fallback)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvasW, canvasH);

                    // Draw image
                    ctx.drawImage(img, 0, 0, canvasW, canvasH);
                    canvas.toBlob(blob2 => {
                        storage().downloadBlob(blob2, 'process-map.jpg');
                        bus().emit('toast', 'success', 'JPEG exported successfully');
                    }, 'image/jpeg', 0.95);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            } catch (err) {
                console.error('[Exporters] JPEG export error:', err);
                bus().emit('toast', 'error', 'JPEG export failed: ' + err.message);
            }
        },

        exportSVG() {
            try {
                const { clone } = this._prepareExportSVG();
                const serializer = new XMLSerializer();
                let svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                storage().downloadBlob(blob, 'process-map.svg');
                bus().emit('toast', 'success', 'SVG exported successfully');
            } catch (err) {
                console.error('[Exporters] SVG export error:', err);
                bus().emit('toast', 'error', 'SVG export failed: ' + err.message);
            }
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.Exporters = Exporters;
})();
