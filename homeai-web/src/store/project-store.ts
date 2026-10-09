import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Project, Wall, Room, Door, Window, Floor, Point2D, Prop, Staircase, SlabVoid, StructuralColumn } from '@/core/domain/types';
import { PlanGenerationAction } from '@/core/ai/plan-generator';
import { projectRepository } from '@/infrastructure/persistence/local-storage-project-repository';
import { autoDetectRooms, polygonArea } from '@/core/geometry/room-utils';
import { ARCHITECTURAL_DESIGN_PRESETS, applyDesignPresetToProject } from '@/core/geometry/design-presets';
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
  setActiveFloor: (floorId: string) => void;
  
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

  // Vertical Circulation: Stairs
  addStaircase: (floorId: string, stair: Staircase) => void;
  updateStaircase: (floorId: string, stairId: string, updater: (s: Staircase) => void) => void;
  deleteStaircase: (floorId: string, stairId: string) => void;

  // Slab Voids (Double-height & stair cutouts)
  addSlabVoid: (floorId: string, voidItem: SlabVoid) => void;
  updateSlabVoid: (floorId: string, voidId: string, updater: (v: SlabVoid) => void) => void;
  deleteSlabVoid: (floorId: string, voidId: string) => void;

  // Structural Columns
  addColumn: (floorId: string, col: StructuralColumn) => void;
  updateColumn: (floorId: string, colId: string, updater: (c: StructuralColumn) => void) => void;
  deleteColumn: (floorId: string, colId: string) => void;

  // Stage 3: Mandatory Floor Plan Confirmation & Baseline Locking
  confirmFloorPlan: () => { success: boolean; message: string };
  reopenFloorPlanForEditing: () => void;

  // 3D Customization & Finishes Studio
  updateWallFinish: (floorId: string, wallId: string, finishId?: string, colorHex?: string, wallpaper?: string) => void;
  updateWallFinishBulk: (floorId: string, scope: 'room' | 'all', targetRoomId?: string, finishId?: string, colorHex?: string) => void;
  updateRoomFloorFinish: (floorId: string, roomId: string, finishId: string) => void;
  updateFloorFinishBulk: (floorId: string, finishId: string) => void;
  applyDesignPreset: (presetId: string) => void;
  updatePropCustomization: (floorId: string, propId: string, customization: { finishMaterial?: string; finishColor?: string; width?: number; depth?: number; height?: number; rotation?: number; position?: Point2D; color?: string }) => void;

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

    setActiveFloor: (floorId) => set((state) => {
      if (state.currentProject && state.currentProject.floors.some(f => f.id === floorId)) {
        state.currentProject.activeFloorId = floorId;
        useCanvasStore.getState().setActiveFloor(floorId);
      }
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

    // Stairs
    addStaircase: (floorId, stair) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        if (!floor.stairs) floor.stairs = [];
        floor.stairs.push(stair);
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateStaircase: (floorId, stairId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const stair = floor?.stairs?.find(s => s.id === stairId);
      if (stair) updater(stair);
      useCanvasStore.getState().markModified(true);
    }),

    deleteStaircase: (floorId, stairId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor && floor.stairs) {
        floor.stairs = floor.stairs.filter(s => s.id !== stairId);
      }
      useCanvasStore.getState().markModified(true);
    }),

    // Slab Voids
    addSlabVoid: (floorId, voidItem) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        if (!floor.voids) floor.voids = [];
        floor.voids.push(voidItem);
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateSlabVoid: (floorId, voidId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const voidItem = floor?.voids?.find(v => v.id === voidId);
      if (voidItem) updater(voidItem);
      useCanvasStore.getState().markModified(true);
    }),

    deleteSlabVoid: (floorId, voidId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor && floor.voids) {
        floor.voids = floor.voids.filter(v => v.id !== voidId);
      }
      useCanvasStore.getState().markModified(true);
    }),

    // Columns
    addColumn: (floorId, col) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        if (!floor.columns) floor.columns = [];
        floor.columns.push(col);
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateColumn: (floorId, colId, updater) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const col = floor?.columns?.find(c => c.id === colId);
      if (col) updater(col);
      useCanvasStore.getState().markModified(true);
    }),

    deleteColumn: (floorId, colId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor && floor.columns) {
        floor.columns = floor.columns.filter(c => c.id !== colId);
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
      const defaultFloor = state.currentProject.floors.find(f => f.id === floorId) || state.currentProject.floors[0];
      if (!defaultFloor) return;

      const affectedFloorIds = new Set<string>();
      for (const act of actions) {
        if (act.floorId) affectedFloorIds.add(act.floorId);
      }
      if (affectedFloorIds.size === 0) affectedFloorIds.add(defaultFloor.id);

      // If replacing floor, clear all affected floors
      if (replaceFloor) {
        for (const fId of affectedFloorIds) {
          const fl = state.currentProject.floors.find(f => f.id === fId);
          if (fl) {
            fl.walls = [];
            fl.rooms = [];
            fl.props = [];
            fl.stairs = [];
            fl.voids = [];
            fl.columns = [];
          }
        }
      }

      for (const act of actions) {
        const targetFloorId = act.floorId || defaultFloor.id;
        let targetFloor = state.currentProject.floors.find(f => f.id === targetFloorId);
        if (!targetFloor) {
          const isL1 = targetFloorId.includes('1') || targetFloorId.includes('first') || targetFloorId.includes('ff');
          const newFloor: Floor = {
            id: targetFloorId,
            projectId: state.currentProject.id,
            name: isL1 ? 'First Floor (Level 1)' : `Floor ${state.currentProject.floors.length}`,
            level: isL1 ? 1 : state.currentProject.floors.length,
            elevation: isL1 ? 3000 : state.currentProject.floors.length * 3000,
            height: 3000,
            walls: [],
            rooms: [],
            props: [],
            stairs: [],
            voids: [],
            columns: [],
          };
          state.currentProject.floors.push(newFloor);
          targetFloor = newFloor;
        }

        if (!targetFloor.props) targetFloor.props = [];
        if (!targetFloor.stairs) targetFloor.stairs = [];
        if (!targetFloor.voids) targetFloor.voids = [];
        if (!targetFloor.columns) targetFloor.columns = [];

        const curFloor = targetFloor;
        if (act.type === 'add_wall' && act.wall) {
          curFloor.walls.push(act.wall);
        } else if (act.type === 'add_room' && act.room) {
          curFloor.rooms.push(act.room);
        } else if (act.type === 'add_prop' && act.prop) {
          if (!curFloor.props) curFloor.props = [];
          curFloor.props.push(act.prop);
        } else if (act.type === 'add_door' && act.door) {
          const wall = curFloor.walls.find(w => w.id === act.door?.wallId);
          if (wall) wall.doors.push(act.door);
        } else if (act.type === 'add_window' && act.window) {
          const wall = curFloor.walls.find(w => w.id === act.window?.wallId);
          if (wall) wall.windows.push(act.window);
        } else if (act.type === 'add_staircase' && act.staircase) {
          if (!curFloor.stairs) curFloor.stairs = [];
          curFloor.stairs.push(act.staircase);
        } else if (act.type === 'add_void' && act.void) {
          if (!curFloor.voids) curFloor.voids = [];
          curFloor.voids.push(act.void);
        } else if (act.type === 'add_column' && act.column) {
          if (!curFloor.columns) curFloor.columns = [];
          curFloor.columns.push(act.column);
        } else if (act.type === 'update_prop' && act.propId) {
          const propToUpdate = curFloor.props?.find(p => p.id === act.propId);
          if (propToUpdate && act.propUpdates) {
            Object.assign(propToUpdate, act.propUpdates);
          }
        } else if (act.type === 'update_wall_finish' && act.wallFinish) {
          curFloor.walls.forEach(w => {
            w.finishId = act.wallFinish;
            if (act.color) w.colorHex = act.color;
          });
        } else if (act.type === 'update_floor_finish' && act.floorFinish) {
          curFloor.rooms.forEach(r => {
            r.floorFinishId = act.floorFinish;
          });
        } else if (act.type === 'apply_preset' && act.presetId && state.currentProject) {
          applyDesignPresetToProject(state.currentProject, act.presetId);
        }
      }
      useCanvasStore.getState().markModified(true);
    }),

    confirmFloorPlan: () => {
      const { currentProject } = get();
      if (!currentProject) {
        return { success: false, message: "No active project found." };
      }

      const activeFloor = currentProject.floors.find(f => f.id === currentProject.activeFloorId) || currentProject.floors[0];
      if (!activeFloor || (activeFloor.walls.length === 0 && activeFloor.rooms.length === 0)) {
        return { success: false, message: "Floor plan cannot be confirmed because it has no walls or rooms. Please create or generate a layout first." };
      }

      // Calculate summary metrics
      let roomCount = 0;
      let wallCount = 0;
      let stairCount = 0;
      let totalAreaSqMm = 0;

      currentProject.floors.forEach(f => {
        roomCount += f.rooms.length;
        wallCount += f.walls.length;
        stairCount += (f.stairs?.length || 0);
        f.rooms.forEach(r => {
          if (r.polygon && r.polygon.length >= 3) {
            totalAreaSqMm += polygonArea(r.polygon);
          }
        });
      });

      const totalAreaSqM = Math.round(totalAreaSqMm / 1_000_000);
      const nextVersion = (currentProject.designVersion || 0) + 1;

      set((state) => {
        pushHistory(state);
        if (state.currentProject) {
          state.currentProject.floorPlanStatus = "confirmed";
          state.currentProject.designVersion = nextVersion;
          state.currentProject.designBaseline = {
            confirmedAt: new Date().toISOString(),
            version: nextVersion,
            snapshotJson: JSON.stringify(state.currentProject.floors),
            summary: {
              roomCount,
              wallCount,
              stairCount,
              totalAreaSqM
            }
          };
        }
        useCanvasStore.getState().markModified(true);
        useCanvasStore.getState().setViewMode('3d');
      });

      get().saveProject();

      return {
        success: true,
        message: `Floor plan confirmed and locked as Design Baseline v${nextVersion} (${totalAreaSqM} m² / ${roomCount} rooms). Welcome to the 3D Architectural Customization Studio!`
      };
    },

    reopenFloorPlanForEditing: () => set((state) => {
      pushHistory(state);
      if (state.currentProject) {
        state.currentProject.floorPlanStatus = "draft";
      }
      useCanvasStore.getState().markModified(true);
      useCanvasStore.getState().setViewMode('2d');
    }),

    updateWallFinish: (floorId, wallId, finishId, colorHex, wallpaper) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const wall = floor?.walls.find(w => w.id === wallId);
      if (wall) {
        wall.finishId = finishId;
        if (colorHex !== undefined) wall.colorHex = colorHex;
        if (wallpaper !== undefined) wall.wallpaperPattern = wallpaper;
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateWallFinishBulk: (floorId, scope, targetRoomId, finishId, colorHex) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (!floor) return;

      if (scope === 'all') {
        floor.walls.forEach(w => {
          if (finishId) w.finishId = finishId;
          if (colorHex) w.colorHex = colorHex;
        });
      } else if (scope === 'room' && targetRoomId) {
        const room = floor.rooms.find(r => r.id === targetRoomId);
        if (room) {
          room.wallFinishId = finishId;
          floor.walls.forEach(w => {
            if (finishId) w.finishId = finishId;
            if (colorHex) w.colorHex = colorHex;
          });
        }
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateRoomFloorFinish: (floorId, roomId, finishId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === roomId);
      if (room) {
        room.floorFinishId = finishId;
      }
      useCanvasStore.getState().markModified(true);
    }),

    updateFloorFinishBulk: (floorId, finishId) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      if (floor) {
        floor.rooms.forEach(r => {
          r.floorFinishId = finishId;
        });
      }
      useCanvasStore.getState().markModified(true);
    }),

    applyDesignPreset: (presetId) => set((state) => {
      const preset = ARCHITECTURAL_DESIGN_PRESETS[presetId];
      if (!preset || !state.currentProject) return;

      pushHistory(state);
      state.currentProject.activeDesignPreset = presetId;
      state.currentProject.floors.forEach(floor => {
        floor.rooms.forEach(r => {
          r.floorFinishId = preset.floorFinish;
          r.wallFinishId = preset.wallFinish;
        });
        floor.walls.forEach(w => {
          w.finishId = preset.wallFinish;
          w.colorHex = preset.primaryColor;
        });
      });
      useCanvasStore.getState().markModified(true);
    }),

    updatePropCustomization: (floorId, propId, customization) => set((state) => {
      pushHistory(state);
      const floor = state.currentProject?.floors.find(f => f.id === floorId);
      const prop = floor?.props?.find(p => p.id === propId);
      if (prop) {
        if (customization.finishMaterial !== undefined) prop.finishMaterial = customization.finishMaterial;
        if (customization.finishColor !== undefined) {
          prop.finishColor = customization.finishColor;
          prop.color = customization.finishColor;
        }
        if (customization.color !== undefined) {
          prop.color = customization.color;
          prop.finishColor = customization.color;
        }
        if (customization.rotation !== undefined) prop.rotation = customization.rotation;
        if (customization.position !== undefined) prop.position = customization.position;
        if (customization.width !== undefined) prop.dimensions.width = customization.width;
        if (customization.depth !== undefined) prop.dimensions.depth = customization.depth;
        if (customization.height !== undefined) prop.dimensions.height = customization.height;
      }
      useCanvasStore.getState().markModified(true);
    }),
  }))
);
