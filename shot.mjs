// Review stills: node shot.mjs 0,6,14,30 [WxH]  -> shots/t-<time>-<W>.png (one tour frame each, via ?t=)
// Needs Chromium: `npx playwright install chromium` once. On a box without sudo see the skill's notes on LD_LIBRARY_PATH.
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(ROOT, 'node_modules/x.js'));
const {chromium} = require('playwright');
const times = (process.argv[2] || '0').split(',');
const [vw, vh] = (process.argv[3] || '1440x810').split('x').map(Number);
fs.mkdirSync(path.join(ROOT, 'shots'), {recursive: true});
const browser = await chromium.launch({args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: vw, height: vh}, deviceScaleFactor: 1});
page.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text()));
page.on('pageerror', (e) => console.log('PAGEERR', e.message));
for (const t of times) {
  await page.goto(pathToFileURL(path.join(ROOT, 'docs/index.html')).href + '?t=' + t);
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, {timeout: 60000});
  await page.waitForTimeout(300);
  await page.screenshot({path: path.join(ROOT, `shots/t-${t}-${vw}.png`)});
  console.log('shot', t);
}
await browser.close();
