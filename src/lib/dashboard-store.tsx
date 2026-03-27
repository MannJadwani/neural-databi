import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { ChartSpec, DatasetSchema } from './types';

// ============================================================
// State
// ============================================================

export interface DashboardState {
  id: string;
  name: string;
  datasetId: string;
  schema: DatasetSchema | null;
  widgets: ChartSpec[];
  insights: string | null;
  selectedWidgetId: string | null;
  isEditing: boolean;
}

const initialState: DashboardState = {
  id: '',
  name: '',
  datasetId: '',
  schema: null,
  widgets: [],
  insights: null,
  selectedWidgetId: null,
  isEditing: false,
};

// ============================================================
// Actions
// ============================================================

export type DashboardAction =
  | { type: 'SET_DASHBOARD'; payload: { id: string; name: string; datasetId: string; schema: DatasetSchema | null; widgets: ChartSpec[]; insights?: string | null } }
  | { type: 'SET_WIDGETS'; payload: ChartSpec[] }
  | { type: 'ADD_WIDGET'; payload: ChartSpec }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; changes: Partial<ChartSpec> } }
  | { type: 'MOVE_WIDGET'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'RESIZE_WIDGET'; payload: { id: string; size: { w: number; h: number } } }
  | { type: 'SELECT_WIDGET'; payload: string | null }
  | { type: 'TOGGLE_EDITING' }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'DUPLICATE_WIDGET'; payload: string }
  | { type: 'RENAME'; payload: string };

// ============================================================
// Reducer
// ============================================================

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_DASHBOARD':
      return {
        ...state,
        ...action.payload,
        selectedWidgetId: null,
        isEditing: false,
      };

    case 'SET_WIDGETS':
      return { ...state, widgets: action.payload };

    case 'ADD_WIDGET':
      return { ...state, widgets: [...state.widgets, action.payload] };

    case 'REMOVE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.filter((w) => w.id !== action.payload),
        selectedWidgetId: state.selectedWidgetId === action.payload ? null : state.selectedWidgetId,
      };

    case 'UPDATE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.map((w) =>
          w.id === action.payload.id ? { ...w, ...action.payload.changes } : w
        ),
      };

    case 'MOVE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.map((w) =>
          w.id === action.payload.id ? { ...w, position: action.payload.position } : w
        ),
      };

    case 'RESIZE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.map((w) =>
          w.id === action.payload.id ? { ...w, size: action.payload.size } : w
        ),
      };

    case 'SELECT_WIDGET':
      return { ...state, selectedWidgetId: action.payload };

    case 'TOGGLE_EDITING':
      return { ...state, isEditing: !state.isEditing, selectedWidgetId: null };

    case 'SET_EDITING':
      return { ...state, isEditing: action.payload, selectedWidgetId: action.payload ? state.selectedWidgetId : null };

    case 'DUPLICATE_WIDGET': {
      const original = state.widgets.find((w) => w.id === action.payload);
      if (!original) return state;
      const clone: ChartSpec = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        title: `${original.title} (copy)`,
        position: original.position
          ? { x: original.position.x, y: original.position.y + (original.size?.h || 2) }
          : undefined,
      };
      return { ...state, widgets: [...state.widgets, clone] };
    }

    case 'RENAME':
      return { ...state, name: action.payload };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

const DashboardContext = createContext<DashboardState>(initialState);
const DashboardDispatchContext = createContext<Dispatch<DashboardAction>>(() => {});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  return (
    <DashboardContext.Provider value={state}>
      <DashboardDispatchContext.Provider value={dispatch}>
        {children}
      </DashboardDispatchContext.Provider>
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}

export function useDashboardDispatch() {
  return useContext(DashboardDispatchContext);
}

// ============================================================
// Auto-layout: bin-pack widgets into 12-column grid
// ============================================================

export function autoLayout(widgets: ChartSpec[]): ChartSpec[] {
  const COLS = 12;
  const grid: boolean[][] = []; // grid[row][col] = occupied

  function isOccupied(x: number, y: number, w: number, h: number): boolean {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (grid[row]?.[col]) return true;
      }
    }
    return false;
  }

  function occupy(x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++) {
      if (!grid[row]) grid[row] = new Array(COLS).fill(false);
      for (let col = x; col < x + w; col++) {
        grid[row][col] = true;
      }
    }
  }

  function findPosition(w: number, h: number): { x: number; y: number } {
    for (let y = 0; ; y++) {
      for (let x = 0; x <= COLS - w; x++) {
        if (!isOccupied(x, y, w, h)) return { x, y };
      }
    }
  }

  return widgets.map((widget) => {
    if (widget.position) {
      occupy(widget.position.x, widget.position.y, widget.size?.w || 6, widget.size?.h || 2);
      return widget;
    }
    const size = widget.size || { w: 6, h: 2 };
    const pos = findPosition(size.w, size.h);
    occupy(pos.x, pos.y, size.w, size.h);
    return { ...widget, position: pos };
  });
}
