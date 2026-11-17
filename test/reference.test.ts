import { describe, expect, it } from 'vitest';
import { boxCorners, fitReference, isImage, moveBox, referenceBox, scaleBoxFromCorner } from '../src/reference';

describe('reference image', () => {
  it('contain-fits a wide image and centres it', () => {
    expect(fitReference(200, 100, 100, 100)).toEqual({ x: 0, y: 25, w: 100, h: 50 });
  });
  it('contain-fits a tall image on a wide canvas', () => {
    expect(fitReference(50, 100, 200, 100)).toEqual({ x: 75, y: 0, w: 50, h: 100 });
  });
  it('accepts only images', () => {
    expect(isImage({ type: 'image/png' })).toBe(true);
    expect(isImage({ type: 'text/plain' })).toBe(false);
    expect(isImage(null)).toBe(false);
  });
});

describe('reference adjustment', () => {
  const ref = { url: 'x', naturalWidth: 200, naturalHeight: 100, opacity: 0.5, visible: true, box: null };

  it('defaults to the fit box', () => {
    expect(referenceBox(ref, 100, 100)).toEqual({ x: 0, y: 25, w: 100 });
    expect(referenceBox({ ...ref, box: { x: 3, y: 4, w: 50 } }, 100, 100)).toEqual({ x: 3, y: 4, w: 50 });
  });

  it('moves add up', () => {
    expect(moveBox(moveBox({ x: 0, y: 0, w: 10 }, 5, 3), -2, 1)).toEqual({ x: 3, y: 4, w: 10 });
  });

  it('scales from the bottom-right corner keeping the top-left fixed', () => {
    const b = scaleBoxFromCorner({ x: 10, y: 10, w: 40 }, 0.5, 'se', { x: 90, y: 30 }, 1);
    expect(b).toEqual({ x: 10, y: 10, w: 80 });
  });

  it('uses the vertical distance when it implies a larger size', () => {
    const b = scaleBoxFromCorner({ x: 10, y: 10, w: 40 }, 0.5, 'se', { x: 20, y: 70 }, 1);
    expect(b).toEqual({ x: 10, y: 10, w: 120 });
  });

  it('scales from the top-left corner keeping the bottom-right fixed', () => {
    const b = scaleBoxFromCorner({ x: 10, y: 10, w: 40 }, 0.5, 'nw', { x: 30, y: 20 }, 1);
    const c = boxCorners(b, 0.5);
    expect(c.se).toEqual({ x: 50, y: 30 });
    expect(b.w).toBe(20);
  });

  it('respects the minimum width', () => {
    expect(scaleBoxFromCorner({ x: 0, y: 0, w: 40 }, 0.5, 'se', { x: 0.1, y: 0.1 }, 2).w).toBe(2);
  });
});
