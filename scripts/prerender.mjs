// Runs after `vite build` and `vite build --ssr`: puts the rendered page into
// dist/index.html. The client (createRoot) replaces it once the script loads.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const entry = resolve('dist-ssr/entry-server.js');
const { render } = await import(pathToFileURL(entry).href);
const file = resolve('dist/index.html');
const html = readFileSync(file, 'utf8');
if (!html.includes('<div id="root"></div>')) throw new Error('prerender: #root placeholder not found');
writeFileSync(file, html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`));
rmSync(resolve('dist-ssr'), { recursive: true, force: true });
console.log('prerender: dist/index.html filled');
