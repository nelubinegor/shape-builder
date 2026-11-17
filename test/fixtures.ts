// Card-suit shapes used as geometry fixtures (also offered as app presets).
import { circlesFromTriples, type ShapeDoc } from '../src/document';
import { club, diamond, heart, spade } from '../src/presets';

export { club, diamond, heart, spade };

export const suits = { spade, heart, club, diamond } as const;
export type SuitName = keyof typeof suits;
export const suitNames = Object.keys(suits) as SuitName[];

export function suitShape(name: SuitName): ShapeDoc {
  return { name, fill: '#000000', symmetry: false, circles: circlesFromTriples(suits[name]) };
}
