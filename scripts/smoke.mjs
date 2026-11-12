// Smoke test: drives the built app in Chromium. Run after `npm run build`.
// Usage: node scripts/smoke.mjs [--shots <dir>]
// Needs Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`).
import { createRequire } from 'node:module';
import { preview } from 'vite';

// require() also resolves a globally installed Playwright via NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');

const shotsIdx = process.argv.indexOf('--shots');
const shotsDir = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;

const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`);
  if (!cond) failures++;
};
const shot = async (name) => shotsDir && page.screenshot({ path: `${shotsDir}/${name}.png` });

const state = () => page.evaluate(() => {
  const s = window.shapeBuilder;
  return { circles: s.shape.circles, selectedId: s.ui.selectedId, symmetry: s.shape.symmetry, ui: s.ui };
});
const shapeD = () => page.getAttribute('.canvas path.shape', 'd');
const nums = (d) => (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
const sameNums = (a, b, tol) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tol);
const toScreen = (x, y) => page.evaluate(([x, y]) => {
  const p = new DOMPoint(x, y).matrixTransform(document.querySelector('.canvas').getScreenCTM());
  return { x: p.x, y: p.y };
}, [x, y]);
// Renders are batched per animation frame: wait for two frames.
const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const loadPreset = async (name) => {
  await page.selectOption('#preset', name);
  await settle();
};
const click = async (sel) => {
  await page.click(sel);
  await settle();
};
const clickAt = async (x, y, opts) => {
  const p = await toScreen(x, y);
  await page.mouse.click(p.x, p.y, opts);
  await settle();
};
const dragDoc = async (from, to, { alt = false, steps = 8 } = {}) => {
  const a = await toScreen(...from);
  const b = await toScreen(...to);
  if (alt) await page.keyboard.down('Alt');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
  if (alt) await page.keyboard.up('Alt');
  await settle();
};
const order = (cs) => cs.map((c) => `${c.x},${c.y}`);
const sameCycle = (a, b) => a.length === b.length && a.some((_, k) => a.every((v, i) => v === b[(i + k) % b.length]));

try {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.canvas path.shape');
  let s = await state();
  check('starts with a single circle', s.circles.length === 1 && s.circles[0].x === 50 && s.circles[0].r === 30);
  check('default view has a margin', s.ui.view.x < 0 && s.ui.view.w > 100);

  // Presets: exported SVG matches the canvas.
  for (const name of ['cross', 'head', 'hand', 'circle']) {
    await loadPreset(name);
    const d = await shapeD();
    await click('#copy-svg');
    const svg = await page.evaluate(() => navigator.clipboard.readText());
    const exported = svg.match(/<path fill="[^"]*" d="([^"]*)"/)?.[1] ?? '';
    check(`preset ${name}: exported SVG matches canvas`, sameNums(nums(d), nums(exported), 1e-3));
    await shot(`preset-${name}`);
  }
  await loadPreset('hand');
  check('hand has 16 circles', (await state()).circles.length === 16);

  // Overlay and corner preview.
  const before = await page.locator('.canvas circle.circle').count();
  await click('[data-toggle="overlay"]');
  const after = await page.locator('.canvas circle.circle').count();
  check('overlay toggle hides circles', after < before, `${before} → ${after}`);
  await click('[data-toggle="overlay"]');
  await click('[data-toggle="corners"]');
  const vcount = await page.locator('.canvas .corner-vertex').count();
  check('corner preview shows vertices', vcount > 0 && (await page.locator('.canvas .corner-label').count()) === vcount);
  await click('[data-toggle="corners"]');

  // Picking: concave circles grab from anywhere inside.
  s = await state();
  const bigNotch = s.circles.find((c) => c.x === 27.04); // r 7.2, outside the fill
  await clickAt(27.04 + 3, 49.75 - 4);
  check('inside a large concave circle selects it', (await state()).selectedId === bigNotch.id);
  const fingerGap = s.circles.find((c) => c.x === 48.78); // r 1.8, between fingers
  await clickAt(48.78 + 1, 42.65 + 0.8);
  check('inside a tiny concave circle selects it', (await state()).selectedId === fingerGap.id);
  check('hint shows selection shortcuts', (await page.textContent('#canvas-hint')).includes('Arrows move'));

  // Single click on empty canvas deselects and adds nothing.
  await clickAt(95, 95);
  s = await state();
  check('single click on empty deselects', s.selectedId === null && s.circles.length === 16);
  check('hint shows add/pan shortcuts', (await page.textContent('#canvas-hint')).includes('Double-click'));

  // Double-click adds: concave outside, convex inside; undo removes.
  await loadPreset('cross');
  const p1 = await toScreen(90, 20);
  await page.mouse.dblclick(p1.x, p1.y);
  await settle();
  s = await state();
  let added = s.circles.find((c) => c.id === s.selectedId);
  check('double-click outside adds a concave circle', s.circles.length === 13 && added?.mode === 'concave' && added.x === 90 && added.y === 20);
  await page.keyboard.press('Control+z');
  await settle();
  check('undo removes it', (await state()).circles.length === 12);
  const p2 = await toScreen(50, 50);
  await page.mouse.dblclick(p2.x, p2.y);
  await settle();
  s = await state();
  added = s.circles.find((c) => c.id === s.selectedId);
  check('double-click inside adds a convex circle', added?.mode === 'convex');
  await page.keyboard.press('Control+z');

  // Drag moves with snapping, Alt skips snapping, one undo step.
  await loadPreset('cross');
  s = await state();
  const tip = s.circles.find((c) => c.x === 83.33 && c.y === 45.83);
  await dragDoc([83.33, 45.83], [88.6, 40.2]);
  s = await state();
  let moved = s.circles.find((c) => c.id === tip.id);
  check('drag moves with snapping', moved.x === 89 && moved.y === 40, `${moved.x},${moved.y}`);
  await page.keyboard.press('Control+z');
  await settle();
  moved = (await state()).circles.find((c) => c.id === tip.id);
  check('drag undoes in one step', moved.x === 83.33 && moved.y === 45.83);
  await dragDoc([83.33, 45.83], [88.37, 40.2], { alt: true });
  moved = (await state()).circles.find((c) => c.id === tip.id);
  check('Alt-drag skips snapping', Math.abs(moved.x - 88.37) < 0.05 && Math.abs(moved.y - 40.2) < 0.05, `${moved.x},${moved.y}`);
  await page.keyboard.press('Control+z');

  // Resize from any point on the selected rim.
  await loadPreset('circle');
  await clickAt(50, 50);
  const a = Math.PI / 4;
  await dragDoc([50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a)], [50 + 35 * Math.cos(a), 50 + 35 * Math.sin(a)]);
  check('resize from a rim point at 45°', (await state()).circles[0].r === 35);

  // Pan and zoom.
  await page.keyboard.press('0');
  await settle();
  let v = (await state()).ui.view;
  await dragDoc([2, 2], [20, 20]);
  check('dragging empty canvas without Space does not pan', JSON.stringify((await state()).ui.view) === JSON.stringify(v));
  const e = await toScreen(2, 2);
  await page.mouse.move(e.x, e.y);
  await page.keyboard.down('Space');
  await page.mouse.down();
  await page.mouse.move(e.x + 80, e.y + 40, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await settle();
  let v2 = (await state()).ui.view;
  check('Space-drag pans', v2.x < v.x && v2.y < v.y);
  const box = await page.locator('.canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await settle();
  const v3 = (await state()).ui.view;
  check('plain scroll pans', v3.y > v2.y && v3.w === v2.w);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
  await settle();
  check('Ctrl+scroll zooms in', (await state()).ui.view.w < v3.w);
  await click('[data-zoom="fit"]');
  v = (await state()).ui.view;
  check('Fit restores the margin view', Math.abs(v.x + 8) < 1e-9 && Math.abs(v.w - 116) < 1e-9);
  check('zoom widget shows a level', /%$/.test(await page.textContent('#zoom-level')));

  // Shortcuts work after using the panel; text fields keep their keys.
  await loadPreset('cross');
  await page.locator('.circle-row').nth(1).locator('[data-act="select"]').click();
  await settle();
  s = await state();
  const x0 = s.circles[1].x;
  await page.keyboard.press('ArrowRight');
  check('arrows work after clicking a panel row', (await state()).circles[1].x === x0 + 1);
  await page.keyboard.press('Shift+ArrowUp');
  check('Shift+arrow resizes', (await state()).circles[1].r === 5.17);
  await page.keyboard.press('c');
  check('C toggles mode', (await state()).circles[1].mode === 'concave');
  const rInput = page.locator('.circle-row').nth(1).locator('input[data-key="r"]');
  await rInput.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  check('Backspace in an input edits text, not circles', (await state()).circles.length === 12);
  await rInput.press('Escape');
  await page.keyboard.press('Delete');
  await settle();
  check('Delete removes the selected circle', (await state()).circles.length === 11);

  // Panel: Add circle, duplicate, reorder, Auto-order, compact rows.
  await loadPreset('cross');
  await page.locator('.circle-row').nth(1).locator('[data-act="select"]').click();
  await settle();
  s = await state();
  await click('#add-circle');
  let s2 = await state();
  const mid = s2.circles[2];
  check('Add circle inserts midway after the selection', s2.circles.length === 13 && mid.id === s2.selectedId &&
    Math.abs(mid.x - (s.circles[1].x + s.circles[2].x) / 2) < 1e-9);
  await page.keyboard.press('Control+z');
  await settle();
  await page.locator('.circle-row').nth(1).locator('[data-act="select"]').click();
  await settle();
  await click('.circle-row.selected [data-act="dup"]');
  s2 = await state();
  check('duplicate inserts after', s2.circles.length === 13 && s2.circles[2].id === s2.selectedId);
  await page.keyboard.press('Control+z');
  await loadPreset('head');
  const headOrder = order((await state()).circles);
  await page.locator('.circle-row').nth(0).locator('[data-act="select"]').click();
  await settle();
  for (let i = 0; i < 3; i++) await click('.circle-row.selected [data-act="down"]');
  check('move down reorders', !sameCycle(order((await state()).circles), headOrder));
  await click('#auto-order');
  check('Auto-order restores the clockwise order', sameCycle(order((await state()).circles), headOrder));
  await loadPreset('hand');
  const rowH = await page.locator('.circle-row').nth(3).evaluate((el) => el.getBoundingClientRect().height);
  check('rows are compact', rowH < 42, `${rowH.toFixed(0)}px`);

  // Selecting on the canvas scrolls its row into view.
  await page.locator('.side').evaluate((el) => (el.scrollTop = 0));
  await clickAt(27.04 + 3, 49.75 - 4); // circle 16
  await page.waitForTimeout(100);
  const visible = await page.evaluate(() => {
    const row = document.querySelector('.circle-row.selected');
    const side = document.querySelector('.side').getBoundingClientRect();
    const r = row.getBoundingClientRect();
    return r.top >= side.top && r.bottom <= side.bottom;
  });
  check('selected row scrolls into view', visible);
  await shot('hand-selected');

  // Symmetry.
  await loadPreset('cross');
  await click('#symmetry');
  s = await state();
  const right = s.circles.findIndex((c) => c.x === 83.33 && c.y === 45.83);
  const xInput = page.locator('.circle-row').nth(right).locator('input[data-key="x"]');
  await xInput.fill('85');
  await xInput.press('Enter');
  await settle();
  s = await state();
  check('symmetry mirrors edits', s.circles.some((c) => Math.abs(c.x - 15) < 1e-9 && c.y === 45.83));
  await click('#symmetry');

  // Persistence.
  await page.reload();
  await page.waitForSelector('.canvas path.shape');
  check('reload restores the document', (await state()).circles.some((c) => c.x === 85));

  // Export formats.
  await click('[data-format="rounded"]');
  await click('#copy-svg');
  check('rounded SVG has data-corner-radii', /data-corner-radii="[\d.,]+"/.test(await page.evaluate(() => navigator.clipboard.readText())));
  await click('#copy-figma');
  const vn = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  check('Copy for Figma gives a vector network', vn.vertices.length > 0 && vn.segments.length === vn.vertices.length);
  const [svgDownload] = await Promise.all([page.waitForEvent('download'), page.click('#download-svg')]);
  check('Download .svg uses the format in the name', svgDownload.suggestedFilename().endsWith('-rounded.svg'));

  // Save, open, reject a bad file.
  await loadPreset('hand');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const savedPath = await download.path();
  await loadPreset('cross');
  let [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#open')]);
  await chooser.setFiles(savedPath);
  await page.waitForFunction(() => window.shapeBuilder.shape.circles.length === 16);
  check('open restores a saved file', true);
  await page.keyboard.press('Control+z');
  await settle();
  check('open is undoable', (await state()).circles.length === 12);
  [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#open')]);
  await chooser.setFiles({
    name: 'bad.json', mimeType: 'application/json',
    buffer: Buffer.from('{"version":1,"canvas":{"width":100,"height":100},"shapes":[{"circles":[{"x":1,"y":2,"mode":"convex"}]}]}'),
  });
  await page.waitForSelector('.toast.error');
  check('malformed file rejected with a message', (await state()).circles.length === 12);

  await shot('final');
  check('no console errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  console.error(err);
  failures++;
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
