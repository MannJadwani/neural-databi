import type { ChartSpec } from './types';

const MAX_HISTORY = 30;

interface UndoState {
  past: ChartSpec[][];
  present: ChartSpec[];
  future: ChartSpec[][];
}

let state: UndoState = { past: [], present: [], future: [] };
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function initUndoStack(widgets: ChartSpec[]) {
  state = { past: [], present: widgets, future: [] };
}

export function pushState(widgets: ChartSpec[]) {
  // Don't push if nothing changed
  if (JSON.stringify(widgets) === JSON.stringify(state.present)) return;
  state = {
    past: [...state.past, state.present].slice(-MAX_HISTORY),
    present: widgets,
    future: [],
  };
  notify();
}

export function undo(): ChartSpec[] | null {
  if (state.past.length === 0) return null;
  const prev = state.past[state.past.length - 1];
  state = {
    past: state.past.slice(0, -1),
    present: prev,
    future: [state.present, ...state.future],
  };
  notify();
  return prev;
}

export function redo(): ChartSpec[] | null {
  if (state.future.length === 0) return null;
  const next = state.future[0];
  state = {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
  notify();
  return next;
}

export function canUndo(): boolean {
  return state.past.length > 0;
}

export function canRedo(): boolean {
  return state.future.length > 0;
}

export function subscribeUndo(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
