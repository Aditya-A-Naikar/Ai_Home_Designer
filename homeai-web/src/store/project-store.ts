import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Project, Wall, Room, Door, Window, Floor } from '@/core/domain/types';
import { projectRepository } from '@/infrastructure/persistence/local-storage-project-repository';
import { useCanvasStore } from './canvas-store';

interface ProjectState {
  currentProject: Project | null;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  
  // History stack
  past: Project[];
  future: Project[];
}

interface ProjectActions {
  loadProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  
  // Floor Management
  addFloor: (floor: Floor) => void;
  updateFloor: (floorId: string, updater: (f: Floor) => void) => void;
  deleteFloor: (floorId: string) => void;
  
  // Walls
  addWall: (floorId: string, wall: Wall) => void;
  updateWall: (floorId: string, wallId: string, updater: (w: Wall) => void) => void;
  deleteWall: (floorId: string, wallId: string) => void;
  
  // Rooms
  addRoom: (floorId: string, room: Room) => void;
  updateRoom: (floorId: string, roomId: string, updater: (r: Room) => void) => void;
  deleteRoom: (floorId: string, roomId: string) => void;
  
  // Elements
  addDoor: (floorId: string, wallId: string, door: Door) => void;
  addWindow: (floorId: string, wallId: string, window: Window) => void;
  
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 50;

function pushHistory(state: ProjectState) {
  if (state.currentProject) {
    state.past.push(JSON.parse(JSON.stringify(state.currentProject)));
    if (state.past.length > MAX_HISTORY) {
      state.past.shift();
    }
    state.future = [];
  }
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  immer((set, get) => ({
    currentProject: null,
    isSaving: false,
    isLoading: false,
    error: null,
    past: [],
    future: [],
    
    loadProject: async (id) => {
      set((state) => { state.isLoading = true; state.error = null; });
      try {
        const project = await projectRepository.getById(id);
        if (!project) throw new Error("Project not found");
        
        set((state) => {
          state.currentProject = project;
          state.past = [];
          state.future = [];
          state.isLoading = false;
        });
        
        useCanvasStore.getState().setActiveProject(id);
        useCanvasStore.getState().setActiveFloor(project.activeFloorId);
      } catch (err: unknown) {
        set((state) => {
          state.error = (err as Error).message;
          state.isLoading = false;
        });
      }
    },
    
    saveProject: async () => {
      const { currentProject } = get();
      if (!currentProject) return;
      
      set((state) => { state.isSaving = true; });
      try {
        const updated = {
          ...currentProject,
          metadata: {
            ...currentProject.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        await projectRepository.save(updated);
        set((state) => {
          state.currentProject = updated;
          state.isSaving = false;
        });
        useCanvasStore.getState().markModified(false);
      } catch (err: unknown) {
        set((state) => {
          state.error = (err as Error).message;
          state.isSaving = false;
        });
      }
    },
    
    addFloor: (floor) => set((state) => {
      pushHistory(state);
      state.currentProject?.floors.push(floor);
      useCanvasStore.getState().markModified(true);
    }),
    
    updateFloor: (floorId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) updater(floor);
      useCanvasStore.getState().markModified(true);
    }),
    
    deleteFloor: (floorId) => set((state) => {
      if (!state.currentProject) return;
      if (state.currentProject.floors.length <= 1) return;
      pushHistory(state);
      state.currentProject.floors = state.currentProject.floors.filter(f => f.id !== floorId);
      if (state.currentProject.activeFloorId === floorId) {
        state.currentProject.activeFloorId = state.currentProject.floors[0].id;
        useCanvasStore.getState().setActiveFloor(state.currentProject.activeFloorId);
      }
      useCanvasStore.getState().markModified(true);
    }),
    
    addWall: (floorId, wall) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) floor.walls.push(wall);
      useCanvasStore.getState().markModified(true);
    }),
    
    updateWall: (floorId, wallId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) updater(wall);
      useCanvasStore.getState().markModified(true);
    }),
    
    deleteWall: (floorId, wallId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        floor.walls = floor.walls.filter(w => w.id !== wallId);
      }
      useCanvasStore.getState().markModified(true);
    }),
    
    addRoom: (floorId, room) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) floor.rooms.push(room);
      useCanvasStore.getState().markModified(true);
    }),
    
    updateRoom: (floorId, roomId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === roomId);
      if (room) updater(room);
      useCanvasStore.getState().markModified(true);
    }),
    
    deleteRoom: (floorId, roomId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        floor.rooms = floor.rooms.filter(r => r.id !== roomId);
      }
      useCanvasStore.getState().markModified(true);
    }),
    
    addDoor: (floorId, wallId, door) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) wall.doors.push(door);
      useCanvasStore.getState().markModified(true);
    }),
    
    addWindow: (floorId, wallId, window) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) wall.windows.push(window);
      useCanvasStore.getState().markModified(true);
    }),
    
    undo: () => set((state) => {
      if (state.past.length === 0 || !state.currentProject) return;
      const prev = state.past.pop()!;
      state.future.push(JSON.parse(JSON.stringify(state.currentProject)));
      state.currentProject = prev;
      useCanvasStore.getState().markModified(true);
    }),
    
    redo: () => set((state) => {
      if (state.future.length === 0 || !state.currentProject) return;
      const next = state.future.pop()!;
      state.past.push(JSON.parse(JSON.stringify(state.currentProject)));
      state.currentProject = next;
      useCanvasStore.getState().markModified(true);
    })
  }))
);
