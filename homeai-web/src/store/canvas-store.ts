import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Point2D, Door } from '@/core/domain/types';

export type ToolType = 'select' | 'wall' | 'room' | 'door' | 'window' | 'prop' | 'stair' | 'column' | 'pan' | 'mep' | 'calibrate';

export interface SubElementSelection {
  type: 'wall' | 'room' | 'door' | 'window' | 'prop' | 'stair' | 'column' | 'void';
  id: string;
  parentWallId?: string;
}

export type ActiveDrawer = 'none' | 'catalog' | 'materials' | 'properties' | 'ai';

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
  viewMode: '2d' | '3d';
  showAllDimensions: boolean;
  showUnderlay: boolean;
  underlayOpacity: number;
  activeDrawer: ActiveDrawer;
  // Derived backward-compatibility flags (synced strictly with activeDrawer)
  leftSidebarOpen: boolean;
  aiAdvisorOpen: boolean;
  catalogDockOpen: boolean;
  materialsDockOpen: boolean;
  activeStage: number; // 1 to 7 matching reference journey
  walkthroughActive: boolean;

  // MEP Layer Visibility
  showMEPElectrical: boolean;
  showMEPPlumbing: boolean;
  showMEPHVAC: boolean;

  // Placement parameters
  doorWidth: number;
  doorSwing: Door['swingDirection'];
  windowWidth: number;
  windowSill: number;

  // 3D Placement Mode
  activePlacementPreset: string | null;
  placementRotation: number;

  // Blueprint Underlay Dock (Stage 4.1)
  blueprintDockOpen: boolean;
}

interface CanvasActions {
  setActiveProject: (projectId: string) => void;
  setActiveFloor: (floorId: string) => void;
  setViewMode: (mode: '2d' | '3d') => void;
  setTool: (tool: ToolType) => void;
  toggleBlueprintDock: () => void;
  setBlueprintDockOpen: (open: boolean) => void;
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
  toggleShowUnderlay: () => void;
  setUnderlayOpacity: (opacity: number) => void;
  
  // Drawer Management (activeDrawer is single source of truth)
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  toggleDrawer: (drawer: Exclude<ActiveDrawer, 'none'>) => void;
  closeDrawer: () => void;

  // Backward-compatibility actions (all sync with activeDrawer)
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleAIAdvisor: () => void;
  setAIAdvisorOpen: (open: boolean) => void;
  setActiveStage: (stage: number) => void;
  setCatalogDockOpen: (open: boolean) => void;
  setMaterialsDockOpen: (open: boolean) => void;
  setWalkthroughActive: (active: boolean) => void;

  // MEP Toggles
  toggleMEPElectrical: () => void;
  toggleMEPPlumbing: () => void;
  toggleMEPHVAC: () => void;

  setDoorWidth: (width: number) => void;
  setDoorSwing: (swing: Door['swingDirection']) => void;
  setWindowWidth: (width: number) => void;
  setWindowSill: (sill: number) => void;

  // 3D Placement Actions
  setActivePlacementPreset: (presetKey: string | null) => void;
  setPlacementRotation: (rotation: number) => void;
  rotatePlacement: (deltaDegrees: number) => void;
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

      viewMode: '2d',
      showAllDimensions: false,
      showUnderlay: false,
      underlayOpacity: 0.35,
      activeDrawer: 'none',
      leftSidebarOpen: false,
      aiAdvisorOpen: false,
      activeStage: 4,
      catalogDockOpen: false,
      materialsDockOpen: false,
      walkthroughActive: false,

      showMEPElectrical: false,
      showMEPPlumbing: false,
      showMEPHVAC: false,

      doorWidth: 900,
      doorSwing: 'inward_right',
      windowWidth: 1200,
      windowSill: 900,

      activePlacementPreset: null,
      placementRotation: 0,
      blueprintDockOpen: false,
      
      setActiveProject: (projectId) => set((state) => { state.activeProjectId = projectId; }),
      setActiveFloor: (floorId) => set((state) => { state.activeFloorId = floorId; }),
      setViewMode: (mode) => set((state) => { state.viewMode = mode; }),
      toggleBlueprintDock: () => set((state) => { state.blueprintDockOpen = !state.blueprintDockOpen; }),
      setBlueprintDockOpen: (open) => set((state) => { state.blueprintDockOpen = open; }),
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
      toggleShowUnderlay: () => set((state) => { state.showUnderlay = !state.showUnderlay; }),
      setUnderlayOpacity: (opacity) => set((state) => { 
        state.underlayOpacity = Math.max(0.1, Math.min(0.8, opacity)); 
      }),

      // Drawer Management (activeDrawer is single source of truth)
      setActiveDrawer: (drawer) => set((state) => {
        state.activeDrawer = drawer;
        state.catalogDockOpen = drawer === 'catalog';
        state.materialsDockOpen = drawer === 'materials';
        state.leftSidebarOpen = drawer === 'properties';
        state.aiAdvisorOpen = drawer === 'ai';
      }),
      toggleDrawer: (drawer) => set((state) => {
        const next = state.activeDrawer === drawer ? 'none' : drawer;
        state.activeDrawer = next;
        state.catalogDockOpen = next === 'catalog';
        state.materialsDockOpen = next === 'materials';
        state.leftSidebarOpen = next === 'properties';
        state.aiAdvisorOpen = next === 'ai';
      }),
      closeDrawer: () => set((state) => {
        state.activeDrawer = 'none';
        state.catalogDockOpen = false;
        state.materialsDockOpen = false;
        state.leftSidebarOpen = false;
        state.aiAdvisorOpen = false;
      }),

      // Backward-compatibility actions (all sync with activeDrawer as single source of truth)
      toggleLeftSidebar: () => set((state) => {
        const next: ActiveDrawer = state.activeDrawer === 'properties' ? 'none' : 'properties';
        state.activeDrawer = next;
        state.catalogDockOpen = false;
        state.materialsDockOpen = false;
        state.leftSidebarOpen = next === 'properties';
        state.aiAdvisorOpen = false;
      }),
      setLeftSidebarOpen: (open) => set((state) => {
        const next: ActiveDrawer = open ? 'properties' : (state.activeDrawer === 'properties' ? 'none' : state.activeDrawer);
        state.activeDrawer = next;
        state.catalogDockOpen = next === 'catalog';
        state.materialsDockOpen = next === 'materials';
        state.leftSidebarOpen = next === 'properties';
        state.aiAdvisorOpen = next === 'ai';
      }),
      toggleAIAdvisor: () => set((state) => {
        const next: ActiveDrawer = state.activeDrawer === 'ai' ? 'none' : 'ai';
        state.activeDrawer = next;
        state.catalogDockOpen = false;
        state.materialsDockOpen = false;
        state.leftSidebarOpen = false;
        state.aiAdvisorOpen = next === 'ai';
      }),
      setAIAdvisorOpen: (open) => set((state) => {
        const next: ActiveDrawer = open ? 'ai' : (state.activeDrawer === 'ai' ? 'none' : state.activeDrawer);
        state.activeDrawer = next;
        state.catalogDockOpen = next === 'catalog';
        state.materialsDockOpen = next === 'materials';
        state.leftSidebarOpen = next === 'properties';
        state.aiAdvisorOpen = next === 'ai';
      }),
      setActiveStage: (stage) => set((state) => { state.activeStage = stage; }),
      setCatalogDockOpen: (open) => set((state) => {
        const next = open ? 'catalog' : (state.activeDrawer === 'catalog' ? 'none' : state.activeDrawer);
        state.activeDrawer = next;
        state.catalogDockOpen = next === 'catalog';
        state.materialsDockOpen = next === 'materials';
        state.leftSidebarOpen = next === 'properties';
        state.aiAdvisorOpen = next === 'ai';
      }),
      setMaterialsDockOpen: (open) => set((state) => {
        const next = open ? 'materials' : (state.activeDrawer === 'materials' ? 'none' : state.activeDrawer);
        state.activeDrawer = next;
        state.catalogDockOpen = next === 'catalog';
        state.materialsDockOpen = next === 'materials';
        state.leftSidebarOpen = next === 'properties';
        state.aiAdvisorOpen = next === 'ai';
      }),
      setWalkthroughActive: (active) => set((state) => { state.walkthroughActive = active; }),

      toggleMEPElectrical: () => set((state) => { state.showMEPElectrical = !state.showMEPElectrical; }),
      toggleMEPPlumbing: () => set((state) => { state.showMEPPlumbing = !state.showMEPPlumbing; }),
      toggleMEPHVAC: () => set((state) => { state.showMEPHVAC = !state.showMEPHVAC; }),

      setDoorWidth: (w) => set((state) => { state.doorWidth = w; }),
      setDoorSwing: (s) => set((state) => { state.doorSwing = s; }),
      setWindowWidth: (w) => set((state) => { state.windowWidth = w; }),
      setWindowSill: (s) => set((state) => { state.windowSill = s; }),

      setActivePlacementPreset: (presetKey) => set((state) => {
        state.activePlacementPreset = presetKey;
        if (!presetKey) state.placementRotation = 0;
      }),
      setPlacementRotation: (rotation) => set((state) => {
        state.placementRotation = (rotation % 360 + 360) % 360;
      }),
      rotatePlacement: (delta) => set((state) => {
        state.placementRotation = ((state.placementRotation + delta) % 360 + 360) % 360;
      }),
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
        showUnderlay: state.showUnderlay,
        underlayOpacity: state.underlayOpacity,
        showMEPElectrical: state.showMEPElectrical,
        showMEPPlumbing: state.showMEPPlumbing,
        showMEPHVAC: state.showMEPHVAC,
      }),
    }
  )
);
