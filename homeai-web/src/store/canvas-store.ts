import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Point2D, Door } from '@/core/domain/types';

export type ToolType = 'select' | 'wall' | 'room' | 'door' | 'window' | 'prop' | 'pan';

export interface SubElementSelection {
  type: 'wall' | 'room' | 'door' | 'window' | 'prop';
  id: string;
  parentWallId?: string;
}

interface CanvasState {
  activeProjectId: string | null;
  activeFloorId: string | null;
  tool: ToolType;
  zoom: number;
  panOffset: Point2D;
  selectedElementId: string | null;
  selectedSubElement: SubElementSelection | null;
  isModified: boolean;
  
  // Snap settings
  snapToGrid: boolean;
  snapToEndpoints: boolean;
  orthoMode: boolean;
  gridSize: number;

  // View settings
  showAllDimensions: boolean;

  // Placement parameters
  doorWidth: number;
  doorSwing: Door['swingDirection'];
  windowWidth: number;
  windowSill: number;
}

interface CanvasActions {
  setActiveProject: (projectId: string) => void;
  setActiveFloor: (floorId: string) => void;
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point2D) => void;
  selectElement: (id: string | null) => void;
  selectSubElement: (sel: SubElementSelection | null) => void;
  markModified: (modified: boolean) => void;
  resetView: (zoom: number, panOffset: Point2D) => void;

  toggleSnapToGrid: () => void;
  toggleSnapToEndpoints: () => void;
  toggleOrthoMode: () => void;
  setGridSize: (size: number) => void;
  toggleShowAllDimensions: () => void;

  setDoorWidth: (width: number) => void;
  setDoorSwing: (swing: Door['swingDirection']) => void;
  setWindowWidth: (width: number) => void;
  setWindowSill: (sill: number) => void;
}

type CanvasStore = CanvasState & CanvasActions;

export const useCanvasStore = create<CanvasStore>()(
  persist(
    immer((set) => ({
      activeProjectId: null,
      activeFloorId: null,
      tool: 'select',
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      selectedElementId: null,
      selectedSubElement: null,
      isModified: false,

      snapToGrid: true,
      snapToEndpoints: true,
      orthoMode: false,
      gridSize: 100,

      showAllDimensions: false,

      doorWidth: 900,
      doorSwing: 'inward_right',
      windowWidth: 1200,
      windowSill: 900,
      
      setActiveProject: (projectId) => set((state) => { state.activeProjectId = projectId; }),
      setActiveFloor: (floorId) => set((state) => { state.activeFloorId = floorId; }),
      setTool: (tool) => set((state) => { 
        state.tool = tool;
        if (tool !== 'select') {
          state.selectedElementId = null;
          state.selectedSubElement = null;
        }
      }),
      setZoom: (zoom) => set((state) => { state.zoom = Math.min(Math.max(zoom, 0.05), 5.0); }),
      setPanOffset: (offset) => set((state) => { state.panOffset = offset; }),
      selectElement: (id) => set((state) => { 
        state.selectedElementId = id;
        state.selectedSubElement = id ? { type: 'wall', id } : null;
      }),
      selectSubElement: (sel) => set((state) => {
        state.selectedSubElement = sel;
        state.selectedElementId = sel ? sel.id : null;
      }),
      markModified: (mod) => set((state) => { state.isModified = mod; }),
      resetView: (zoom, offset) => set((state) => { 
        state.zoom = zoom; 
        state.panOffset = offset; 
      }),

      toggleSnapToGrid: () => set((state) => { state.snapToGrid = !state.snapToGrid; }),
      toggleSnapToEndpoints: () => set((state) => { state.snapToEndpoints = !state.snapToEndpoints; }),
      toggleOrthoMode: () => set((state) => { state.orthoMode = !state.orthoMode; }),
      setGridSize: (size) => set((state) => { state.gridSize = size; }),
      toggleShowAllDimensions: () => set((state) => { state.showAllDimensions = !state.showAllDimensions; }),

      setDoorWidth: (w) => set((state) => { state.doorWidth = w; }),
      setDoorSwing: (s) => set((state) => { state.doorSwing = s; }),
      setWindowWidth: (w) => set((state) => { state.windowWidth = w; }),
      setWindowSill: (s) => set((state) => { state.windowSill = s; }),
    })),
    {
      name: 'canvas-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        zoom: state.zoom, 
        panOffset: state.panOffset,
        snapToGrid: state.snapToGrid,
        snapToEndpoints: state.snapToEndpoints,
        orthoMode: state.orthoMode,
        gridSize: state.gridSize,
        showAllDimensions: state.showAllDimensions,
      }),
    }
  )
);
