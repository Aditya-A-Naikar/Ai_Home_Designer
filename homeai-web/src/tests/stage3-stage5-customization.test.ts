import { describe, it, expect, beforeEach } from 'vitest';
import { validateFloorPlan, calculatePolygonAreaSqM } from '@/core/geometry/floor-plan-validator';
import { ARCHITECTURAL_DESIGN_PRESETS } from '@/core/geometry/design-presets';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { getDemoProject } from '@/core/domain/demo-project';
import { generatePlanFromPrompt } from '@/core/ai/plan-generator';
import { Floor } from '@/core/domain/types';

describe('Stage 3 & Stage 5 — Floor Plan Confirmation, Presets & 3D Customization', () => {
  beforeEach(() => {
    const project = getDemoProject();
    project.floorPlanStatus = 'draft';
    useProjectStore.setState({
      currentProject: project,
      past: [],
      future: [],
    });
  });

  describe('Architectural Floor Plan Validator', () => {
    it('detects incomplete perimeter wall enclosure (< 3 walls)', () => {
      const emptyFloor: Floor = {
        id: 'fl-1',
        projectId: 'p-1',
        name: 'Ground Floor',
        level: 0,
        elevation: 0,
        height: 2800,
        walls: [],
        rooms: [],
      };

      const report = validateFloorPlan(emptyFloor);
      expect(report.passed).toBe(false);
      expect(report.issues.some(i => i.id === 'insufficient-walls')).toBe(true);
      expect(report.score).toBeLessThan(100);
    });

    it('calculates polygon area accurately in square meters', () => {
      // 5m x 4m rectangle = 20 m²
      const polygon = [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 4000 },
        { x: 0, y: 4000 },
      ];
      const area = calculatePolygonAreaSqM(polygon);
      expect(area).toBeCloseTo(20.0, 1);
    });

    it('validates habitable room areas, doors and fenestration ratios', () => {
      const floor: Floor = {
        id: 'fl-1',
        projectId: 'p-1',
        name: 'Ground Floor',
        level: 0,
        elevation: 0,
        height: 2800,
        walls: [
          {
            id: 'w1',
            floorId: 'fl-1',
            start: { x: 0, y: 0 },
            end: { x: 5000, y: 0 },
            thickness: 200,
            doors: [],
            windows: [{ id: 'win1', floorId: 'fl-1', wallId: 'w1', offset: 2500, width: 1400, height: 1200, sillHeight: 900 }],
          },
          {
            id: 'w2',
            floorId: 'fl-1',
            start: { x: 5000, y: 0 },
            end: { x: 5000, y: 4000 },
            thickness: 200,
            doors: [],
            windows: [],
          },
          {
            id: 'w3',
            floorId: 'fl-1',
            start: { x: 5000, y: 4000 },
            end: { x: 0, y: 4000 },
            thickness: 200,
            doors: [{ id: 'd1', floorId: 'fl-1', wallId: 'w3', offset: 2500, width: 900, height: 2100, swingDirection: 'inward_right' }],
            windows: [],
          },
          {
            id: 'w4',
            floorId: 'fl-1',
            start: { x: 0, y: 4000 },
            end: { x: 0, y: 0 },
            thickness: 200,
            doors: [],
            windows: [],
          },
        ],
        rooms: [
          {
            id: 'r1',
            floorId: 'fl-1',
            name: 'Living Room',
            polygon: [
              { x: 0, y: 0 },
              { x: 5000, y: 0 },
              { x: 5000, y: 4000 },
              { x: 0, y: 4000 },
            ],
          },
        ],
      };

      const report = validateFloorPlan(floor);
      expect(report.passed).toBe(true);
      expect(report.totalAreaSqM).toBeCloseTo(20.0, 1);
      expect(report.doorCount).toBe(1);
      expect(report.windowCount).toBe(1);
      expect(report.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Stage 3 — Floor Plan Confirmation & Baseline Locking', () => {
    it('locks floor plan baseline and transitions to 3D studio', () => {
      const store = useProjectStore.getState();

      // Initially in draft mode
      expect(store.currentProject?.floorPlanStatus).toBe('draft');

      // Add a room and walls so confirmation is valid
      const activeFloorId = store.currentProject!.activeFloorId;
      store.addWall(activeFloorId, {
        id: 'w-test',
        floorId: activeFloorId,
        start: { x: 0, y: 0 },
        end: { x: 4000, y: 0 },
        thickness: 200,
        doors: [],
        windows: [],
      });
      store.addRoom(activeFloorId, {
        id: 'r-test',
        floorId: activeFloorId,
        name: 'Master Suite',
        polygon: [
          { x: 0, y: 0 },
          { x: 4000, y: 0 },
          { x: 4000, y: 4000 },
          { x: 0, y: 4000 },
        ],
      });

      const confirmResult = store.confirmFloorPlan();
      expect(confirmResult.success).toBe(true);

      const updated = useProjectStore.getState().currentProject;
      expect(updated?.floorPlanStatus).toBe('confirmed');
      expect(updated?.designBaseline).toBeDefined();
      expect(updated?.designBaseline?.version).toBe(1);
      expect(useCanvasStore.getState().viewMode).toBe('3d');

      // Reopening unlocks the plan and returns to 2D
      store.reopenFloorPlanForEditing();
      const reopened = useProjectStore.getState().currentProject;
      expect(reopened?.floorPlanStatus).toBe('draft');
      expect(useCanvasStore.getState().viewMode).toBe('2d');
    });
  });

  describe('Coordinated Design Presets', () => {
    it('registers all 7 coordinated architectural presets', () => {
      const keys = Object.keys(ARCHITECTURAL_DESIGN_PRESETS);
      expect(keys).toContain('modern_minimalist');
      expect(keys).toContain('contemporary_luxury');
      expect(keys).toContain('scandinavian');
      expect(keys).toContain('japandi');
      expect(keys).toContain('warm_natural');
      expect(keys).toContain('industrial_loft');
      expect(keys).toContain('mediterranean_terrazzo');
    });

    it('applies design preset across all rooms and walls', () => {
      const store = useProjectStore.getState();
      const activeFloorId = store.currentProject!.activeFloorId;

      store.addRoom(activeFloorId, {
        id: 'r1',
        floorId: activeFloorId,
        name: 'Salon',
        polygon: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }],
      });
      store.addWall(activeFloorId, {
        id: 'w1',
        floorId: activeFloorId,
        start: { x: 0, y: 0 },
        end: { x: 3000, y: 0 },
        thickness: 150,
        doors: [],
        windows: [],
      });

      store.applyDesignPreset('contemporary_luxury');

      const updated = useProjectStore.getState().currentProject;
      const floor = updated?.floors.find(f => f.id === activeFloorId);
      expect(floor?.rooms[0].floorFinishId).toBe('italian_marble');
      expect(floor?.walls[0].finishId).toBe('warm_greige');
      expect(updated?.activeDesignPreset).toBe('contemporary_luxury');
    });
  });

  describe('3D Surface & Prop Customization', () => {
    it('updates wall finish and color without disturbing coordinates', () => {
      const store = useProjectStore.getState();
      const activeFloorId = store.currentProject!.activeFloorId;

      store.addWall(activeFloorId, {
        id: 'w-custom',
        floorId: activeFloorId,
        start: { x: 100, y: 200 },
        end: { x: 3100, y: 200 },
        thickness: 200,
        doors: [],
        windows: [],
      });

      store.updateWallFinish(activeFloorId, 'w-custom', 'exposed_brick', '#b91c1c');

      const wall = useProjectStore.getState().currentProject?.floors[0].walls.find(w => w.id === 'w-custom');
      expect(wall?.finishId).toBe('exposed_brick');
      expect(wall?.colorHex).toBe('#b91c1c');
      // Coordinates remain untouched
      expect(wall?.start.x).toBe(100);
      expect(wall?.end.x).toBe(3100);
    });

    it('updates room floor finish individually and in bulk', () => {
      const store = useProjectStore.getState();
      const activeFloorId = store.currentProject!.activeFloorId;

      store.addRoom(activeFloorId, {
        id: 'r-tile',
        floorId: activeFloorId,
        name: 'Bath',
        polygon: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 2000 }],
      });

      store.updateRoomFloorFinish(activeFloorId, 'r-tile', 'slate_tile');
      let room = useProjectStore.getState().currentProject?.floors[0].rooms.find(r => r.id === 'r-tile');
      expect(room?.floorFinishId).toBe('slate_tile');

      store.updateFloorFinishBulk(activeFloorId, 'terrazzo');
      room = useProjectStore.getState().currentProject?.floors[0].rooms.find(r => r.id === 'r-tile');
      expect(room?.floorFinishId).toBe('terrazzo');
    });

    it('customizes prop rotation, position and color', () => {
      const store = useProjectStore.getState();
      const activeFloorId = store.currentProject!.activeFloorId;

      store.addProp(activeFloorId, {
        id: 'prop-sofa',
        floorId: activeFloorId,
        name: '3-Seater Sofa',
        category: 'living',
        propType: 'sofa',
        position: { x: 2000, y: 2000 },
        rotation: 0,
        dimensions: { width: 2200, depth: 900, height: 850 },
      });

      store.updatePropCustomization(activeFloorId, 'prop-sofa', {
        rotation: 90,
        color: '#1e3a8a',
        position: { x: 2500, y: 2000 },
      });

      const prop = useProjectStore.getState().currentProject?.floors[0].props?.find(p => p.id === 'prop-sofa');
      expect(prop?.rotation).toBe(90);
      expect(prop?.color).toBe('#1e3a8a');
      expect(prop?.position.x).toBe(2500);
    });
  });

  describe('AI Architect Layout Review & Style Queries', () => {
    it('handles layout improvement request with validation insights', () => {
      const project = useProjectStore.getState().currentProject!;
      const res = generatePlanFromPrompt('Please improve my layout and check daylighting', project);
      expect(res.message).toContain('Architectural Layout Review');
    });

    it('handles architectural style queries and explains palettes', () => {
      const project = useProjectStore.getState().currentProject!;
      const res = generatePlanFromPrompt('Tell me about Scandinavian style', project);
      expect(res.message).toContain('Scandinavian');
      expect(res.message).toContain('Material Palette');
    });
  });
});
