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
const docToScreen = (x, y) => page.evaluate(([x, y]) => {
  const svg = document.querySelector('.canvas');
  const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
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

try {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.canvas path.shape');
  check('band path renders', ((await shapeD()) ?? '').startsWith('M'));
  check('starts with heart', (await state()).circles.length === 4);

  // Presets and exported SVG match the canvas path.
  for (const name of ['spade', 'heart', 'club', 'diamond']) {
    await loadPreset(name);
    await page.waitForTimeout(50);
    const d = await shapeD();
    await page.click('[data-copy="flattened"]');
    await page.waitForTimeout(50);
    const svg = await page.evaluate(() => navigator.clipboard.readText());
    const exported = svg.match(/<path fill="[^"]*" d="([^"]*)"/)?.[1] ?? '';
    check(`preset ${name}: exported SVG matches canvas`, sameNums(nums(d), nums(exported), 1e-3));
    await click('[data-toggle="corners"]');
    await shot(`preset-${name}`);
    await click('[data-toggle="corners"]');
  }

  // Construction overlay toggles.
  await loadPreset('club');
  const overlayOn = (await state()).ui.overlay;
  const before = await page.locator('.canvas circle.circle').count();
  await click('[data-toggle="overlay"]');
  const after = await page.locator('.canvas circle.circle').count();
  check('overlay toggle changes circles drawn', overlayOn ? after < before : after > before, `${before} → ${after}`);
  if (overlayOn) await click('[data-toggle="overlay"]');
  check('tangent dots drawn', (await page.locator('.canvas .tangent-dot').count()) === 18);

  // Corner preview.
  await click('[data-toggle="corners"]');
  const vcount = await page.locator('.canvas .corner-vertex').count();
  const labels = await page.locator('.canvas .corner-label').count();
  check('corner preview shows vertices and labels', vcount > 0 && labels === vcount, `${vcount}`);
  await click('[data-toggle="corners"]');

  // Click to add, undo.
  await loadPreset('heart');
  let p = await docToScreen(10, 90);
  await page.mouse.click(p.x, p.y);
  let s = await state();
  check('click adds circle', s.circles.length === 5 && s.circles.some((c) => c.x === 10 && c.y === 90));
  await page.keyboard.press('Control+z');
  check('undo removes added circle', (await state()).circles.length === 4);

  // Drag centre with snapping, single undo step.
  s = await state();
  const lobe = s.circles[0];
  p = await docToScreen(lobe.x, lobe.y);
  const q = await docToScreen(lobe.x + 5.37, lobe.y + 2.8);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(p.x + ((q.x - p.x) * i) / 8, p.y + ((q.y - p.y) * i) / 8);
  await page.mouse.up();
  s = await state();
  check('drag moves with snapping', s.circles[0].x === 75 && s.circles[0].y === 38, `${s.circles[0].x},${s.circles[0].y}`);
  await page.keyboard.press('Control+z');
  s = await state();
  check('drag undoes in one step', s.circles[0].x === 70 && s.circles[0].y === 35);

  // Rim handle resize.
  await page.evaluate(() => window.shapeBuilder.select(window.shapeBuilder.shape.circles[0].id));
  await page.waitForTimeout(50);
  p = await docToScreen(70 + 27, 35);
  const q2 = await docToScreen(70 + 30, 35);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q2.x, q2.y, { steps: 5 });
  await page.mouse.up();
  check('rim handle resizes', (await state()).circles[0].r === 30);
  await page.keyboard.press('Control+z');

  // Keyboard editing.
  await page.focus('.canvas');
  await page.keyboard.press('ArrowRight');
  check('arrow nudges', (await state()).circles[0].x === 71);
  await page.keyboard.press('Alt+ArrowDown');
  check('alt+arrow nudges by 0.1', Math.abs((await state()).circles[0].y - 35.1) < 1e-9);
  await page.keyboard.press('Shift+ArrowUp');
  check('shift+arrow resizes', (await state()).circles[0].r === 28);
  await page.keyboard.press('c');
  check('C toggles mode', (await state()).circles[0].mode === 'concave');
  await page.keyboard.press('Tab');
  s = await state();
  check('Tab selects next circle', s.selectedId === s.circles[1].id);
  await page.keyboard.press('Delete');
  check('Delete removes circle', (await state()).circles.length === 3);
  await page.keyboard.press('Control+Shift+z');
  check('redo with nothing to redo is harmless', (await state()).circles.length === 3);
  await loadPreset('heart');

  // Panel numeric input and invalid highlight.
  const rInput = page.locator('.circle-row').nth(1).locator('input[data-key="r"]');
  await rInput.fill('90');
  await rInput.press('Enter');
  await settle();
  s = await state();
  check('panel input edits radius', s.circles[1].r === 90, String(s.circles[1].r));
  check('nested/invalid circle highlighted', (await page.locator('.circle-row.invalid').count()) > 0);
  check('export warning shown', await page.isVisible('#export-warning'));
  await page.keyboard.press('Control+z');
  check('panel edit undoes', (await state()).circles[1].r === 4);

  // Duplicate and reorder buttons.
  await page.locator('.circle-row').nth(3).locator('[data-act="dup"]').click();
  s = await state();
  check('duplicate inserts after', s.circles.length === 5 && s.circles[4].x === 52 && s.circles[4].y === 14);
  await page.locator('.circle-row').nth(4).locator('[data-act="up"]').click();
  s = await state();
  check('move up reorders', s.circles[3].x === 52);
  await loadPreset('heart');

  // Symmetry.
  await click('#symmetry');
  const xInput = page.locator('.circle-row').nth(0).locator('input[data-key="x"]');
  await xInput.fill('72');
  await xInput.press('Enter');
  s = await state();
  check('symmetry mirrors edit', s.circles[0].x === 72 && s.circles[2].x === 28);
  await shot('symmetry');
  await click('#symmetry');

  // Persistence.
  await page.reload();
  await page.waitForSelector('.canvas path.shape');
  s = await state();
  check('reload restores document', s.circles[0].x === 72 && s.circles[2].x === 28);

  // Copy for Figma.
  await page.click('#copy-figma');
  await page.waitForTimeout(50);
  const vn = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  check('copy for Figma gives a vector network', vn.vertices.length > 0 && vn.segments.length === vn.vertices.length);

  // Rounded SVG copy.
  await page.click('[data-copy="rounded"]');
  await page.waitForTimeout(50);
  const rsvg = await page.evaluate(() => navigator.clipboard.readText());
  check('rounded SVG has data-corner-radii', /data-corner-radii="[\d.,]+"/.test(rsvg));

  // Zoom and pan leave circle values alone.
  await loadPreset('heart');
  const circlesBefore = JSON.stringify((await state()).circles.map((c) => [c.x, c.y, c.r]));
  let v = (await state()).ui.view;
  const empty = await docToScreen(2, 2); // outside every heart circle
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await page.mouse.move(empty.x + 80, empty.y + 40, { steps: 5 });
  await page.mouse.up();
  await settle();
  const v2 = (await state()).ui.view;
  check('drag on empty space pans', v2.x < v.x && v2.y < v.y);
  const box = await page.locator('.canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -300);
  await settle();
  v = (await state()).ui.view;
  check('wheel zooms in', v.w < 100, `w=${v.w.toFixed(1)}`);
  check('zoom/pan keep circles', JSON.stringify((await state()).circles.map((c) => [c.x, c.y, c.r])) === circlesBefore);
  check('pan does not add a circle', (await state()).circles.length === 4);
  await page.focus('.canvas');
  await page.keyboard.press('0');
  await settle();

  // Drag-to-reorder rows.
  const firstId = (await state()).circles[0].id;
  await page.locator('.circle-row').nth(0).locator('.drag-grip').dragTo(page.locator('.circle-row').nth(2), {
    targetPosition: { x: 20, y: 60 },
  });
  await settle();
  s = await state();
  check('drag row reorders', s.circles[2].id === firstId, String(s.circles.findIndex((c) => c.id === firstId)));
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+y');
  check('Ctrl+Y redoes', (await state()).circles[2].id === firstId);

  // Save and open the document file.
  await loadPreset('spade');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const savedPath = await download.path();
  check('save downloads json', download.suggestedFilename() === 'spade.json');
  await loadPreset('heart');
  let [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#open')]);
  await chooser.setFiles(savedPath);
  await page.waitForFunction(() => window.shapeBuilder.shape.circles.length === 7);
  check('open restores saved file', true);
  await page.keyboard.press('Control+z');
  await settle();
  check('open is undoable', (await state()).circles.length === 4);
  [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#open')]);
  await chooser.setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"canvas":{"width":100,"height":100},"shapes":[{"circles":[{"x":1,"y":2,"mode":"convex"}]}]}') });
  await page.waitForSelector('.toast.error');
  check('malformed file rejected with message', (await state()).circles.length === 4, await page.textContent('.toast'));

  await shot('final');
  check('no console errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
