// Bundles duo/main.js with three.js and the fonts into one offline page: docs/index.html (what GitHub Pages serves)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEPS = path.join(ROOT, 'node_modules');
const require = createRequire(path.join(DEPS, 'x.js'));
const esbuild = require('esbuild');

const res = await esbuild.build({
  entryPoints: [path.join(ROOT, 'duo/main.js')],
  bundle: true, minify: true, format: 'esm', write: false, target: 'es2022',
  nodePaths: [DEPS],
  alias: {'three/addons': path.join(DEPS, 'three/examples/jsm')},
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const b64 = (f) => fs.readFileSync(path.join(DEPS, f)).toString('base64');
const fonts =
  `@font-face{font-family:'Inter';font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${b64('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2')}` +
  `@font-face{font-family:'JetBrains Mono';font-weight:600;font-display:swap;src:url(data:font/woff2;base64,${b64('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2')}) format('woff2')}`;
const html = fs.readFileSync(path.join(ROOT, 'duo/template.html'), 'utf8').replace('/*FONTS*/', () => fonts).replace('/*BUNDLE*/', () => js);
fs.mkdirSync(path.join(ROOT, 'docs'), {recursive: true});
const out = path.join(ROOT, 'docs/index.html');
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + ' KB');
