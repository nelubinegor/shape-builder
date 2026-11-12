// Preset shapes on a 100×100 canvas, as [x, y, signedR] in clockwise band order.
// Cross, head and hand are traced from the twostu Design Library in Figma
// (file orrEBTSjd4MJu0xIAfkrxs, page "icons"): each 24×24 icon is scaled ×100/24
// and every arc of its rendered outline (fillGeometry) becomes one circle.

export type Triple = [number, number, number];

export const circle: Triple[] = [[50, 50, 30]];

/** Figma node 2618:372. Outer corners r1, inner fillets r2 (icon units). */
export const cross: Triple[] = [
  [66.67, 33.33, -8.33], [83.33, 45.83, 4.17], [83.33, 54.17, 4.17], [66.67, 66.67, -8.33],
  [54.17, 83.33, 4.17], [45.83, 83.33, 4.17], [33.33, 66.67, -8.33], [16.67, 54.17, 4.17],
  [16.67, 45.83, 4.17], [33.33, 33.33, -8.33], [45.83, 16.67, 4.17], [54.17, 16.67, 4.17],
];

/** Figma node 2618:362. Profile facing right: skull, nose, lips, chin, neck. */
export const head: Triple[] = [
  [62.45, 33.1, 12.5], [78.91, 37.66, -4.17], [77.99, 48.26, 3.78], [80.61, 54.23, -2.64],
  [76.26, 57.23, 2.64], [77.04, 60.38, -0.5], [75.56, 62.42, 2.02], [77.46, 66.67, -2.57],
  [71.24, 70.25, 4.17], [60.35, 82.76, -8.33], [34.78, 78.95, 15.56], [6.02, 63.19, -16.67],
  [45.35, 37.85, 29.38],
];

/**
 * Figma node 2618:369. Peace-sign hand. Two near-identical tiny circles at the
 * knuckle notch were merged into one (r 0.7) so the pair stays valid.
 */
export const hand: Triple[] = [
  [44.22, 11.7, 4.5], [48.78, 42.65, -1.8], [68.9, 16.46, 4.47], [61.37, 48.75, -1.78],
  [62.48, 54.96, 4.51], [66.45, 58.75, -0.7], [64.73, 62.66, 3.37], [65.23, 72.09, -3.6],
  [40.47, 80.32, 13.49], [28.42, 79.58, 1.8], [32, 71.8, -6.74], [46.26, 71.24, 4.5],
  [55.76, 61.97, -3.39], [42.33, 63.12, -4.49], [30.96, 62.47, 1.8], [27.04, 49.75, -7.2],
];

export const presets = { circle, cross, head, hand } as const;
export type PresetName = keyof typeof presets;
export const presetNames = Object.keys(presets) as PresetName[];
