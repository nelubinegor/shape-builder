// Preset shapes on a 100×100 canvas, as [x, y, signedR] in clockwise band order.

export type Triple = [number, number, number];

export const heart: Triple[] = [[70, 35, 27], [50, 90, 4], [30, 35, 27], [50, 12, -3]];

export const spade: Triple[] = [
  [50, 7, 5], [72, 58, 22], [60, 84, -6], [62, 95, 3], [38, 95, 3], [40, 84, -6], [28, 58, 22],
];

export const club: Triple[] = [
  [50, 27, 19], [78, 27, -7], [75, 58, 19], [60, 80, -5], [62, 95, 3],
  [38, 95, 3], [40, 80, -5], [25, 58, 19], [22, 27, -7],
];

/**
 * Diamond: four tips (r 4) with a concave r 90 circle between each pair of tips.
 * Each concave centre sits outward from the side's midpoint at
 * sqrt((90 + 4.5)^2 - (side / 2)^2), giving a slightly concave side.
 */
export function diamondTriples(): Triple[] {
  const tips: [number, number][] = [[50, 4], [90, 50], [50, 96], [10, 50]];
  const tipR = 4;
  const sideR = 90;
  const cx = 50;
  const cy = 50;
  const out: Triple[] = [];
  for (let i = 0; i < tips.length; i++) {
    const [ax, ay] = tips[i];
    const [bx, by] = tips[(i + 1) % tips.length];
    out.push([ax, ay, tipR]);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const half = Math.hypot(bx - ax, by - ay) / 2;
    const d = Math.sqrt((sideR + 4.5) ** 2 - half ** 2);
    // Unit normal to the side, pointing away from the canvas centre.
    let nx = (by - ay) / (2 * half);
    let ny = -(bx - ax) / (2 * half);
    if (nx * (mx - cx) + ny * (my - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    out.push([mx + nx * d, my + ny * d, -sideR]);
  }
  return out;
}

export const diamond: Triple[] = diamondTriples();

export const presets = { spade, heart, club, diamond } as const;
export type PresetName = keyof typeof presets;
export const presetNames = Object.keys(presets) as PresetName[];
