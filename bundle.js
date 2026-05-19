/**
 * Standalone compiler for Process Map Builder
 * Dynamically parses index.html to find and inline all local styles and scripts.
 * 
 * Usage: node bundle.js
 */
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

function bundle() {
    try {
        console.log('\n=============================================');
        console.log('  PROCESS MAP BUILDER - STANDALONE COMPILER  ');
        console.log('=============================================\n');
        
        const indexPath = path.join(rootDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
            console.error('Error: index.html not found in the root directory!');
            return;
        }

        let html = fs.readFileSync(indexPath, 'utf8');

        // 1. Dynamically parse and inline local CSS files
        const cssRegex = /<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi;
        let cssMatch;
        cssRegex.lastIndex = 0;
        
        const cssReplacements = [];
        while ((cssMatch = cssRegex.exec(html)) !== null) {
            const originalTag = cssMatch[0];
            const href = cssMatch[1];
            
            // Check if it is local (does not start with http, https, //, or cdn link)
            const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.includes('unpkg.com') || href.includes('cdnjs');
            if (!isExternal) {
                const fullCssPath = path.join(rootDir, href);
                if (fs.existsSync(fullCssPath)) {
                    const cssContent = fs.readFileSync(fullCssPath, 'utf8');
                    cssReplacements.push({
                        tag: originalTag,
                        inline: `<style>\n/* === INLINED STYLESHEET: ${href} === */\n${cssContent}\n</style>`
                    });
                    console.log(`[CSS] Dynamically bundled: ${href}`);
                } else {
                    console.warn(`[CSS] Warning: local stylesheet not found at: ${fullCssPath}`);
                }
            }
        }
        
        // Replace all local CSS link tags
        cssReplacements.forEach(r => {
            html = html.replace(r.tag, r.inline);
        });

        // 2. Dynamically parse and inline local JS files
        const jsRegex = /<script\s+[^>]*src="([^"]+)"[^>]*>\s*<\/script>/gi;
        let jsMatch;
        jsRegex.lastIndex = 0;
        
        const jsReplacements = [];
        while ((jsMatch = jsRegex.exec(html)) !== null) {
            const originalTag = jsMatch[0];
            const src = jsMatch[1];
            
            // Check if it is local (does not start with http, https, //, or cdn link)
            const isExternal = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.includes('unpkg.com') || src.includes('cdn');
            if (!isExternal) {
                const fullJsPath = path.join(rootDir, src);
                if (fs.existsSync(fullJsPath)) {
                    const jsContent = fs.readFileSync(fullJsPath, 'utf8');
                    jsReplacements.push({
                        tag: originalTag,
                        inline: `<!-- === INLINED SCRIPT: ${src} === -->\n<script>\n${jsContent}\n</script>`
                    });
                    console.log(`[JS]  Dynamically bundled: ${src}`);
                } else {
                    console.warn(`[JS]  Warning: local script file not found at: ${fullJsPath}`);
                }
            }
        }
        
        // Replace all local JS script tags
        jsReplacements.forEach(r => {
            html = html.replace(r.tag, r.inline);
        });

        // 3. Save bundled standalone file
        const outputPath = path.join(rootDir, 'process-map-standalone.html');
        fs.writeFileSync(outputPath, html, 'utf8');
        
        console.log('\n=============================================');
        console.log(` SUCCESS! Standalone compiled: ${outputPath}`);
        console.log('=============================================\n');
    } catch (err) {
        console.error('Error during standalone bundle:', err);
    }
}

bundle();
