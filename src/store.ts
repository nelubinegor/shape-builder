// Application state with undo/redo. Documents are treated as immutable.
import type { Doc, ShapeDoc } from './document';

export interface View {
  /** viewBox origin and size in document units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExportOptions {
  fill: string;
  overlay: boolean;
  scale: number;
}

export interface UIState {
  selectedId: string | null;
  overlay: boolean;
  corners: boolean;
  grid: boolean;
  snap: boolean;
  gridStep: number;
  view: View;
  exportOpts: ExportOptions;
  message: { text: string; kind: 'info' | 'error' } | null;
}

export const HISTORY_LIMIT = 200;

/** Margin around the artboard in the default view, as a fraction of its size. */
export const FIT_MARGIN = 0.08;

/** The default view: the whole artboard with a margin on every side. */
export function fitView(width: number, height: number): View {
  return { x: -width * FIT_MARGIN, y: -height * FIT_MARGIN, w: width * (1 + 2 * FIT_MARGIN), h: height * (1 + 2 * FIT_MARGIN) };
}

type Listener = (s: Store, kind: 'doc' | 'ui') => void;

export class Store {
  doc: Doc;
  ui: UIState;
  private past: Doc[] = [];
  private future: Doc[] = [];
  private txBase: Doc | null = null;
  private listeners = new Set<Listener>();

  constructor(doc: Doc, ui?: Partial<UIState>) {
    this.doc = doc;
    const { width, height } = doc.canvas;
    this.ui = {
      selectedId: null,
      overlay: true,
      corners: false,
      grid: true,
      snap: true,
      gridStep: 1,
      view: fitView(width, height),
      exportOpts: { fill: doc.shapes[0].fill, overlay: false, scale: 1 },
      message: null,
      ...ui,
    };
  }

  get shape(): ShapeDoc {
    return this.doc.shapes[0];
  }

  get width(): number {
    return this.doc.canvas.width;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(kind: 'doc' | 'ui') {
    for (const l of this.listeners) l(this, kind);
  }

  get inTransaction(): boolean {
    return this.txBase !== null;
  }

  /** Starts a transaction (e.g. a drag): all updates until commit() become one undo step. */
  begin(): void {
    if (!this.txBase) this.txBase = this.doc;
  }

  commit(): void {
    if (!this.txBase) return;
    const base = this.txBase;
    this.txBase = null;
    if (base !== this.doc) this.pushPast(base);
    this.emit('doc');
  }

  cancel(): void {
    if (!this.txBase) return;
    this.doc = this.txBase;
    this.txBase = null;
    this.fixSelection();
    this.emit('doc');
  }

  private pushPast(d: Doc) {
    this.past.push(d);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }

  /** Replaces the single shape. Undoable (merged into an open transaction). */
  updateShape(fn: (s: ShapeDoc) => ShapeDoc): void {
    const next = fn(this.shape);
    if (next === this.shape) return;
    this.setDoc({ ...this.doc, shapes: [next, ...this.doc.shapes.slice(1)] });
  }

  /** Replaces the whole document. Undoable. */
  setDoc(doc: Doc): void {
    if (doc === this.doc) return;
    if (!this.txBase) this.pushPast(this.doc);
    this.doc = doc;
    this.fixSelection();
    this.emit('doc');
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    if (this.txBase) this.commit();
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.doc);
    this.doc = prev;
    this.fixSelection();
    this.emit('doc');
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.doc);
    this.doc = next;
    this.fixSelection();
    this.emit('doc');
  }

  setUI(patch: Partial<UIState>): void {
    this.ui = { ...this.ui, ...patch };
    this.emit('ui');
  }

  select(id: string | null): void {
    if (id === this.ui.selectedId) return;
    this.setUI({ selectedId: id });
  }

  notify(text: string, kind: 'info' | 'error' = 'info'): void {
    this.setUI({ message: { text, kind } });
  }

  private fixSelection() {
    const id = this.ui.selectedId;
    if (id && !this.shape.circles.some((c) => c.id === id)) this.ui = { ...this.ui, selectedId: null };
  }
}
