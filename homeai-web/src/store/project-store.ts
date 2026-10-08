import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Project, Wall, Room, Door, Window, Floor, Point2D, Prop } from '@/core/domain/types';
import { PlanGenerationAction } from '@/core/ai/plan-generator';
import { projectRepository } from '@/infrastructure/persistence/local-storage-project-repository';
import { autoDetectRooms } from '@/core/geometry/room-utils';
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
  updateWallEndpoints: (floorId: string, wallId: string, start: Point2D, end: Point2D) => void;
  deleteWall: (floorId: string, wallId: string) => void;
  
  // Rooms
  addRoom: (floorId: string, room: Room) => void;
  updateRoom: (floorId: string, roomId: string, updater: (r: Room) => void) => void;
  deleteRoom: (floorId: string, roomId: string) => void;
  detectAndAddRooms: (floorId: string) => number;
  
  // Elements
  addDoor: (floorId: string, wallId: string, door: Door) => void;
  updateDoor: (floorId: string, wallId: string, doorId: string, updater: (d: Door) => void) => void;
  deleteDoor: (floorId: string, wallId: string, doorId: string) => void;
  
  addWindow: (floorId: string, wallId: string, window: Window) => void;
  updateWindow: (floorId: string, wallId: string, windowId: string, updater: (win: Window) => void) => void;
  deleteWindow: (floorId: string, wallId: string, windowId: string) => void;
  
  // Props / Accessories
  addProp: (floorId: string, prop: Prop) => void;
  updateProp: (floorId: string, propId: string, updater: (p: Prop) => void) => void;
  deleteProp: (floorId: string, propId: string) => void;

  undo: () => void;
  redo: () => void;
  importProject: (project: Project) => Promise<void>;
  applyPlanGenerationActions: (floorId: string, actions: PlanGenerationAction[], replaceFloor?: boolean) => void;
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

    importProject: async (project: Project) => {
      set((state) => {
        state.currentProject = project;
        state.past = [];
        state.future = [];
        state.isLoading = false;
        state.error = null;
      });
      await projectRepository.save(project);
      useCanvasStore.getState().setActiveProject(project.id);
      useCanvasStore.getState().setActiveFloor(project.activeFloorId);
      useCanvasStore.getState().markModified(false);
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
    
    updateWallEndpoints: (floorId, wallId, start, end) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) {
        wall.start = start;
        wall.end = end;
      }
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

    detectAndAddRooms: (floorId) => {
      const { currentProject } = get();
      if (!currentProject) return 0;
      const floor = currentProject.floors.find(f => f.id === floorId);
      if (!floor) return 0;

      const detected = autoDetectRooms(floor.walls, floorId);
      if (detected.length === 0) return 0;

      set((state) => {
        pushHistory(state);
        const targetFloor = state.currentProject?.floors.find(f => f.id === floorId);
        if (targetFloor) {
          // Replace or append detected rooms
          targetFloor.rooms = detected;
        }
        useCanvasStore.getState().markModified(true);
      });

      return detected.length;
    },
    
    addDoor: (floorId, wallId, door) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) wall.doors.push(door);
      useCanvasStore.getState().markModified(true);
    }),

    updateDoor: (floorId, wallId, doorId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      const door = wall?.doors.find(d => d.id === doorId);
      if (door) updater(door);
      useCanvasStore.getState().markModified(true);
    }),

    deleteDoor: (floorId, wallId, doorId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) {
        wall.doors = wall.doors.filter(d => d.id !== doorId);
      }
      useCanvasStore.getState().markModified(true);
    }),
    
    addWindow: (floorId, wallId, window) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) wall.windows.push(window);
      useCanvasStore.getState().markModified(true);
    }),

    updateWindow: (floorId, wallId, windowId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      const win = wall?.windows.find(w => w.id === windowId);
      if (win) updater(win);
      useCanvasStore.getState().markModified(true);
    }),

    deleteWindow: (floorId, wallId, windowId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) {
        wall.windows = wall.windows.filter(w => w.id !== windowId);
      }
      useCanvasStore.getState().markModified(true);
    }),

    addProp: (floorId, prop) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        if (!floor.props) floor.props = [];
        floor.props.push(prop);
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateProp: (floorId, propId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const prop = floor?.props?.find(p => p.id === propId);
      if (prop) updater(prop);
      useCanvasStore.getState().markModified(true);
    }),

    deleteProp: (floorId, propId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor && floor.props) {
        floor.props = floor.props.filter(p => p.id !== propId);
      }
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
    }),

    applyPlanGenerationActions: (floorId, actions, replaceFloor = false) => set((state) => {
      if (!state.currentProject) return;
      pushHistory(state);
      const floor = state.currentProject.floors.find(f => f.id === floorId) || state.currentProject.floors[0];
      if (!floor) return;

      if (replaceFloor) {
        floor.walls = [];
        floor.rooms = [];
        floor.props = [];
      }

      if (!floor.props) floor.props = [];

      for (const act of actions) {
        if (act.type === 'add_wall' && act.wall) {
          floor.walls.push(act.wall);
        } else if (act.type === 'add_room' && act.room) {
          floor.rooms.push(act.room);
        } else if (act.type === 'add_prop' && act.prop) {
          floor.props.push(act.prop);
        } else if (act.type === 'add_door' && act.door) {
          const wall = floor.walls.find(w => w.id === act.door?.wallId);
          if (wall) wall.doors.push(act.door);
        } else if (act.type === 'add_window' && act.window) {
          const wall = floor.walls.find(w => w.id === act.window?.wallId);
          if (wall) wall.windows.push(act.window);
        }
      }
      useCanvasStore.getState().markModified(true);
    })
  }))
);
