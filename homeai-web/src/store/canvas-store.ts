import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Point2D } from '@/core/domain/types';

export type ToolType = 'select' | 'wall' | 'room' | 'door' | 'window' | 'pan';

interface CanvasState {
  activeProjectId: string | null;
  activeFloorId: string | null;
  tool: ToolType;
  zoom: number;
  panOffset: Point2D;
  selectedElementId: string | null;
  isModified: boolean;
}

interface CanvasActions {
  setActiveProject: (projectId: string) => void;
  setActiveFloor: (floorId: string) => void;
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point2D) => void;
  selectElement: (id: string | null) => void;
  markModified: (modified: boolean) => void;
  resetView: (zoom: number, panOffset: Point2D) => void;
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
      isModified: false,
      
      setActiveProject: (projectId) => set((state) => { state.activeProjectId = projectId; }),
      setActiveFloor: (floorId) => set((state) => { state.activeFloorId = floorId; }),
      setTool: (tool) => set((state) => { state.tool = tool; }),
      setZoom: (zoom) => set((state) => { state.zoom = zoom; }),
      setPanOffset: (offset) => set((state) => { state.panOffset = offset; }),
      selectElement: (id) => set((state) => { state.selectedElementId = id; }),
      markModified: (mod) => set((state) => { state.isModified = mod; }),
      resetView: (zoom, offset) => set((state) => { 
        state.zoom = zoom; 
        state.panOffset = offset; 
      })
    })),
    {
      name: 'canvas-storage',
      storage: createJSONStorage(() => sessionStorage), // only persist for session
      partialize: (state) => ({ 
        zoom: state.zoom, 
        panOffset: state.panOffset 
      }), // Persist view only
    }
  )
);
