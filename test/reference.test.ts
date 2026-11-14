import { describe, expect, it } from 'vitest';
import { fitReference, isImage } from '../src/reference';

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
