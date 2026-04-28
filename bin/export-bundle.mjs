import { readFileSync, writeFileSync, existsSync, readdirSync, cpSync, rmSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';

const BUILD = 'build';
const htmlPath = join(BUILD, 'index.html');
const html = readFileSync(htmlPath, 'utf-8');
const OUT = 'time-note-export';

// --- Portable folder (always works) ---
console.log('Creating portable folder...');
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

// Copy _app folder
cpSync(join(BUILD, '_app'), join(OUT, '_app'), { recursive: true });

// Fix paths: absolute (/...) → relative (./...)
let portable = html.replace(/(href|src|action)="\//g, '$1="./');
writeFileSync(join(OUT, 'index.html'), portable);

const totalSize = portable.length + dirSize(join(OUT, '_app'));
console.log(`Portable folder: ${OUT}/  (${(totalSize / 1024).toFixed(0)} KB total)`);
console.log(`  Open: ${OUT}/index.html (from file:// protocol)\n`);

// --- Single-file inline (best-effort) ---
console.log('Attempting single-file inline...');

const files = new Map();
function loadDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) loadDir(p);
        else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) files.set(p, readFileSync(p, 'utf-8'));
    }
}
loadDir(join(BUILD, '_app'));

// Inline CSS
let singleFile = html.replace(
    /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
    (m, h) => { const p = join(BUILD, h); const c = existsSync(p) ? readFileSync(p, 'utf-8') : null; return c ? `<style>${c}</style>` : m; }
);
// Remove preload links
singleFile = singleFile.replace(/<link[^>]*rel="(modulepreload|preload)"[^>]*>\s*/g, '');

// Bundle JS: resolve import graph starting with modulepreload files
function resolveFile(absPath, seen) {
    if (seen.has(absPath) || !files.has(absPath)) return '';
    seen.add(absPath);
    seen; // suppress unused warning
    let code = files.get(absPath);
    const dir = dirname(absPath);
    code = code.replace(/import\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"];?\s*/g, (_, s) => resolveFile(resolve(dir, s), seen));
    code = code.replace(/import\s+\w+\s+from\s+['"]([^'"]+)['"];?\s*/g, (_, s) => resolveFile(resolve(dir, s), seen));
    code = code.replace(/import\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"];?\s*/g, (_, s) => resolveFile(resolve(dir, s), seen));
    code = code.replace(/import\s+['"]([^'"]+)['"];?\s*/g, (_, s) => resolveFile(resolve(dir, s), seen));
    code = code.replace(/\bexport\s+default\s+/g, '');
    code = code.replace(/\bexport\s+(const|let|var|function|class)\s+/g, '');
    code = code.replace(/export\s*\{[^}]*\}\s*(;?\s*)/g, '');
    return code;
}

const preloads = [...html.matchAll(/href="([^"]+\.js)"/g)].map(m => m[1]);
let bundle = '';
const seen = new Set();
for (const href of preloads) {
    bundle += resolveFile(join(BUILD, href), seen) + '\n';
}

// Replace inline bootstrap script
// The SvelteKit starter uses dynamic import("start.js") and import("app.js")
// We need to keep these since the module code is now in the bundle scope
// The imports won't work in inline <script> (no type="module")
// So we replace them with the actual module references

// Strategy: wrap everything in an IIFE, define modules, and patch the boot script
const bootMatch = singleFile.match(/<script>([\s\S]*?)<\/script>/);
if (bootMatch) {
    let boot = bootMatch[1];
    // Find all import("...") paths
    const bootImports = [...boot.matchAll(/import\("([^"]+)"\)/g)].map(m => m[1]);
    // Create module variables
    let modDefs = '';
    for (const p of bootImports) {
        const name = p.split('/').pop().replace(/[^a-zA-Z0-9_$]/g, '_');
        modDefs += `var ${name} = {};\n`;
        boot = boot.replace(`import("${p}")`, `Promise.resolve(${name})`);
    }
    const finalJS = `(function(){\n${modDefs}\n${bundle}\n${boot}\n})();\n`;
    singleFile = singleFile.replace(/<script>[\s\S]*?<\/script>/, `<script>${finalJS}</script>`);
    writeFileSync('time-note-export.html', singleFile);
    console.log(`Single file: time-note-export.html (${(singleFile.length / 1024).toFixed(0)} KB)`);
    console.log('  Note: JS modules may not work correctly when opened from file://');
    console.log(`  Use the portable folder (time-note-export/) for reliable file:// access.`);
} else {
    console.log('Single file: skipped (no bootstrap script found)');
}

function dirSize(dir) {
    let size = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) size += dirSize(p);
        else size += readFileSync(p).length;
    }
    return size;
}
