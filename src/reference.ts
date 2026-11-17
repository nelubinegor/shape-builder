// Onion-skin reference image: loading, fitting and replacing (session only).
import type { RefBox, Reference, Store } from './store';

export const DEFAULT_REFERENCE_OPACITY = 0.5;
/** Shape opacity while a reference is visible, so both stay readable. */
export const ONION_SHAPE_OPACITY = 0.6;

/** Contain-fit of an image inside a W×H artboard, centred. */
export function fitReference(iw: number, ih: number, W: number, H: number) {
  const s = Math.min(W / iw, H / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

export type Corner = 'nw' | 'ne' | 'se' | 'sw';

/** Height over width of the image. */
export const aspectOf = (ref: Pick<Reference, 'naturalWidth' | 'naturalHeight'>) => ref.naturalHeight / ref.naturalWidth;

/** The image's placement: the stored box, or the contain-fit box. */
export function referenceBox(ref: Reference, W: number, H: number): RefBox {
  if (ref.box) return ref.box;
  const f = fitReference(ref.naturalWidth, ref.naturalHeight, W, H);
  return { x: f.x, y: f.y, w: f.w };
}

export function moveBox(box: RefBox, dx: number, dy: number): RefBox {
  return { ...box, x: box.x + dx, y: box.y + dy };
}

/** Corner positions of a box with the given aspect (h / w). */
export function boxCorners(box: RefBox, aspect: number): Record<Corner, { x: number; y: number }> {
  const h = box.w * aspect;
  return {
    nw: { x: box.x, y: box.y },
    ne: { x: box.x + box.w, y: box.y },
    se: { x: box.x + box.w, y: box.y + h },
    sw: { x: box.x, y: box.y + h },
  };
}

const OPPOSITE: Record<Corner, Corner> = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' };

/**
 * Scales proportionally by dragging `corner` to `p`, keeping the opposite corner fixed.
 * The new width follows whichever pointer distance (horizontal, or vertical / aspect) is larger.
 */
export function scaleBoxFromCorner(box: RefBox, aspect: number, corner: Corner, p: { x: number; y: number }, minW: number): RefBox {
  const anchor = boxCorners(box, aspect)[OPPOSITE[corner]];
  const w = Math.max(minW, Math.abs(p.x - anchor.x), Math.abs(p.y - anchor.y) / aspect);
  const h = w * aspect;
  const west = corner === 'nw' || corner === 'sw';
  const north = corner === 'nw' || corner === 'ne';
  return { x: west ? anchor.x - w : anchor.x, y: north ? anchor.y - h : anchor.y, w };
}

export const isImage = (b: { type: string } | null | undefined): boolean => !!b && b.type.startsWith('image/');

/** Loads an image blob into an object URL and reads its natural size. */
export function loadReference(blob: Blob): Promise<Reference> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () =>
      resolve({ url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, opacity: DEFAULT_REFERENCE_OPACITY, visible: true, box: null });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be read.'));
    };
    img.src = url;
  });
}

/** Replaces (or clears) the store's reference, revoking the previous object URL. */
export function setReference(store: Store, ref: Reference | null): void {
  const prev = store.ui.reference;
  if (prev && prev.url !== ref?.url) URL.revokeObjectURL(prev.url);
  store.setUI({ reference: ref, adjustingReference: ref ? store.ui.adjustingReference : false });
}

/** Loads a blob as the new reference, reporting failures as a message. */
export async function addReference(store: Store, blob: Blob): Promise<void> {
  if (!isImage(blob)) return;
  try {
    setReference(store, await loadReference(blob));
    store.notify('Reference image added');
  } catch (e) {
    store.notify((e as Error).message, 'error');
  }
}
