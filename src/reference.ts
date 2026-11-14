// Onion-skin reference image: loading, fitting and replacing (session only).
import type { Reference, Store } from './store';

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

export const isImage = (b: { type: string } | null | undefined): boolean => !!b && b.type.startsWith('image/');

/** Loads an image blob into an object URL and reads its natural size. */
export function loadReference(blob: Blob): Promise<Reference> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () =>
      resolve({ url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, opacity: DEFAULT_REFERENCE_OPACITY, visible: true });
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
  store.setUI({ reference: ref });
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
