// Export section: copy/download in both SVG formats, Copy for Figma, options.
import { validate } from '../band';
import { downloadText, toSigned } from '../document';
import { buildSvg, exportFileName, vectorNetwork, type SvgFormat } from '../export';
import type { ExportOptions, Store } from '../store';

export interface ExportApi {
  render(): void;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function mountExportPanel(host: HTMLElement, store: Store): ExportApi {
  host.innerHTML = `
    <section class="group" aria-labelledby="export-h">
      <h2 id="export-h">Export</h2>
      <p class="warning" id="export-warning" role="status" hidden>The shape has invalid circles, so the outline may be malformed.</p>
      <div class="segmented" role="radiogroup" aria-label="SVG format">
        <button role="radio" data-format="flattened" aria-checked="true">Flattened</button>
        <button role="radio" data-format="rounded" aria-checked="false">Rounded corners</button>
      </div>
      <p class="muted small" id="format-note"></p>
      <div class="button-row">
        <button id="copy-svg">Copy SVG</button>
        <button id="download-svg">Download .svg</button>
        <button id="copy-figma" title="Vector network with editable corner radii">Copy for Figma</button>
      </div>
      <div class="field-row options">
        <label class="field"><span>Scale</span><input id="export-scale" type="number" min="0.01" step="any"></label>
        <label class="check"><input id="export-overlay" type="checkbox"> Include construction</label>
      </div>
    </section>`;

  const NOTES: Record<SvgFormat, string> = {
    flattened: 'One path with exact arcs. Pastes cleanly into Figma, Illustrator and browsers.',
    rounded: 'Straight edges with each corner radius in data-corner-radii. Other apps show sharp corners; use Copy for Figma to keep them editable.',
  };
  let format: SvgFormat = 'flattened';
  const note = host.querySelector<HTMLParagraphElement>('#format-note')!;
  const formatButtons = host.querySelectorAll<HTMLButtonElement>('[data-format]');
  const setFormat = (f: SvgFormat) => {
    format = f;
    formatButtons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.format === f)));
    note.textContent = NOTES[f];
  };
  formatButtons.forEach((b) => b.addEventListener('click', () => setFormat(b.dataset.format as SvgFormat)));
  host.querySelector('.segmented')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      setFormat(format === 'flattened' ? 'rounded' : 'flattened');
      host.querySelector<HTMLButtonElement>(`[data-format="${format}"]`)!.focus();
      e.preventDefault();
      e.stopPropagation();
    }
  });
  setFormat('flattened');

  const warning = host.querySelector<HTMLParagraphElement>('#export-warning')!;
  const scale = host.querySelector<HTMLInputElement>('#export-scale')!;
  const overlay = host.querySelector<HTMLInputElement>('#export-overlay')!;

  const opts = (): ExportOptions => ({ ...store.ui.exportOpts, fill: store.shape.fill });
  const isInvalid = () => {
    const v = validate(toSigned(store.shape.circles));
    return v.invalidPairs.length > 0 || v.nested.length > 0;
  };
  const warnSuffix = () => (isInvalid() ? ' (warning: outline may be malformed)' : '');

  host.querySelector('#copy-svg')!.addEventListener('click', async () => {
    const ok = await copyText(buildSvg(store.doc, format, opts()));
    store.notify(ok ? `Copied ${format} SVG${warnSuffix()}` : 'Copy failed', ok ? 'info' : 'error');
  });
  host.querySelector('#download-svg')!.addEventListener('click', () => {
    downloadText(exportFileName(store.shape, format), buildSvg(store.doc, format, opts()), 'image/svg+xml');
    if (isInvalid()) store.notify(`Downloaded${warnSuffix()}`);
  });
  host.querySelector('#copy-figma')!.addEventListener('click', async () => {
    const json = JSON.stringify(vectorNetwork(store.shape, opts().scale), null, 2);
    const ok = await copyText(json);
    store.notify(ok ? `Copied vector network for Figma${warnSuffix()}` : 'Copy failed', ok ? 'info' : 'error');
  });

  scale.addEventListener('change', () => {
    const v = Number(scale.value);
    if (Number.isFinite(v) && v > 0) store.setUI({ exportOpts: { ...store.ui.exportOpts, scale: v } });
    else scale.value = String(store.ui.exportOpts.scale);
  });
  overlay.addEventListener('change', () => store.setUI({ exportOpts: { ...store.ui.exportOpts, overlay: overlay.checked } }));

  function render() {
    warning.hidden = !isInvalid();
    if (document.activeElement !== scale) scale.value = String(store.ui.exportOpts.scale);
    overlay.checked = store.ui.exportOpts.overlay;
  }
  return { render };
}
