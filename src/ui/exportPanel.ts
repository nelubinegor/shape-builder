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
      <div class="export-format">
        <div>
          <h3>Flattened SVG</h3>
          <p class="muted small">One path with arcs. Pixel-exact in Figma, Illustrator and browsers.</p>
        </div>
        <div class="button-row">
          <button data-copy="flattened">Copy SVG</button>
          <button data-download="flattened">Download .svg</button>
        </div>
      </div>
      <div class="export-format">
        <div>
          <h3>Rounded-corner SVG</h3>
          <p class="muted small">Straight edges plus a radius per corner in <code>data-corner-radii</code>. Other apps show sharp corners; use Copy for Figma to keep them editable.</p>
        </div>
        <div class="button-row">
          <button data-copy="rounded">Copy SVG</button>
          <button data-download="rounded">Download .svg</button>
          <button id="copy-figma">Copy for Figma</button>
        </div>
      </div>
      <div class="field-row options">
        <label class="field"><span>Scale</span><input id="export-scale" type="number" min="0.01" step="any"></label>
        <label class="check"><input id="export-overlay" type="checkbox"> Include construction</label>
      </div>
      <p class="muted small">Fill uses the shape colour above.</p>
    </section>`;

  const warning = host.querySelector<HTMLParagraphElement>('#export-warning')!;
  const scale = host.querySelector<HTMLInputElement>('#export-scale')!;
  const overlay = host.querySelector<HTMLInputElement>('#export-overlay')!;

  const opts = (): ExportOptions => ({ ...store.ui.exportOpts, fill: store.shape.fill });
  const isInvalid = () => {
    const v = validate(toSigned(store.shape.circles));
    return v.invalidPairs.length > 0 || v.nested.length > 0;
  };
  const warnSuffix = () => (isInvalid() ? ' (warning: outline may be malformed)' : '');

  host.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      const f = b.dataset.copy as SvgFormat;
      const ok = await copyText(buildSvg(store.doc, f, opts()));
      store.notify(ok ? `Copied ${f} SVG${warnSuffix()}` : 'Copy failed', ok ? 'info' : 'error');
    }),
  );
  host.querySelectorAll<HTMLButtonElement>('[data-download]').forEach((b) =>
    b.addEventListener('click', () => {
      const f = b.dataset.download as SvgFormat;
      downloadText(exportFileName(store.shape, f), buildSvg(store.doc, f, opts()), 'image/svg+xml');
      if (isInvalid()) store.notify(`Downloaded${warnSuffix()}`);
    }),
  );
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
