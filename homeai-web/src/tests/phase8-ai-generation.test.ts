import { describe, it, expect, beforeEach } from 'vitest';
import { getMyHomeProject } from '@/core/domain/demo-project';
import { PROP_PRESETS, planAutonomousPlacement } from '@/core/ai/spatial-planner';
import { generatePlanFromPrompt } from '@/core/ai/plan-generator';
import { useProjectStore } from '@/store/project-store';

describe('Phase 8: AI + 2D Plan Direct Generation & Ergonomic Props System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Props Preset Catalog & Ergonomic Specs', () => {
    it('contains comprehensive presets for TVs, Sofas, Beds, Dining, and Desks', () => {
      expect(PROP_PRESETS.tv_55).toBeDefined();
      expect(PROP_PRESETS.tv_65).toBeDefined();
      expect(PROP_PRESETS.tv_75).toBeDefined();
      expect(PROP_PRESETS.tv_85).toBeDefined();

      expect(PROP_PRESETS.sofa_3seater).toBeDefined();
      expect(PROP_PRESETS.sofa_l_shape).toBeDefined();
      expect(PROP_PRESETS.bed_king).toBeDefined();
      expect(PROP_PRESETS.bed_queen).toBeDefined();
      expect(PROP_PRESETS.dining_6).toBeDefined();

      // Verify millimeter dimensional precision & Neufert clearance
      expect(PROP_PRESETS.tv_75.dimensions.width).toBe(1680);
      expect(PROP_PRESETS.tv_75.clearance.front).toBeGreaterThanOrEqual(2500); // viewing distance zone
      expect(PROP_PRESETS.bed_king.dimensions.width).toBe(1950);
      expect(PROP_PRESETS.bed_king.clearance.sides).toBeGreaterThanOrEqual(700); // 700mm nightstand walk zone
    });
  });

  describe('Autonomous AI Spatial Placement Engine', () => {
    it('autonomously places a TV against a solid wall facing the living room', () => {
      const project = getMyHomeProject();
      const floor = project.floors[0];

      const plan = planAutonomousPlacement(floor, 'tv_75');
      expect(plan).toBeDefined();
      expect(plan?.targetRoom.name).toBe('Living Room');
      expect(plan?.prop.propType).toBe('tv');
      expect(plan?.prop.dimensions.width).toBe(1680);
      expect(plan?.reasoning).toContain('TV');
    });

    it('pairs a sofa directly opposite a TV at calibrated Neufert viewing distance', () => {
      const project = getMyHomeProject();
      const floor = project.floors[0];

      // 1. Place 75" TV
      const tvPlan = planAutonomousPlacement(floor, 'tv_75');
      expect(tvPlan).toBeDefined();

      // 2. Place paired sofa on floor that contains the TV
      const floorWithTv = {
        ...floor,
        props: [tvPlan!.prop]
      };

      const sofaPlan = planAutonomousPlacement(floorWithTv, 'sofa_l_shape');
      expect(sofaPlan).toBeDefined();
      expect(sofaPlan?.prop.propType).toBe('sofa');
      expect(sofaPlan?.viewingDistanceM).toBeGreaterThanOrEqual(2.2);
      expect(sofaPlan?.viewingDistanceM).toBeLessThanOrEqual(3.6);
      expect(sofaPlan?.reasoning).toContain('viewing distance');
    });

    it('positions a King size bed with headboard grounded against solid wall', () => {
      const project = getMyHomeProject();
      const floor = project.floors[0];

      const plan = planAutonomousPlacement(floor, 'bed_king');
      expect(plan).toBeDefined();
      expect(plan?.targetRoom.name).toBe('Bedroom');
      expect(plan?.prop.propType).toBe('bed');
      expect(plan?.prop.dimensions.width).toBe(1950);
      expect(plan?.reasoning).toContain('Headboard');
    });
  });

  describe('Natural Language Co-Pilot & Direct Canvas Mutations', () => {
    it('handles natural language command for 75" TV and L-shaped sofa', () => {
      const project = getMyHomeProject();
      const result = generatePlanFromPrompt(
        'Add a 75-inch TV and modern gray L-shaped sofa to the Living Room',
        project
      );

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('add_prop');
      expect(result.actions[0].prop?.propType).toBe('tv');
      expect(result.actions[1].type).toBe('add_prop');
      expect(result.actions[1].prop?.propType).toBe('sofa');
      expect(result.placementSummary?.propsAdded).toBe(2);
      expect(result.message).toContain('75"');
    });

    it('handles natural language command for bedroom bed placement', () => {
      const project = getMyHomeProject();
      const result = generatePlanFromPrompt(
        'Place a King size bed in the bedroom with nightstand clearance',
        project
      );

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('add_prop');
      expect(result.actions[0].prop?.propType).toBe('bed');
      expect(result.actions[0].prop?.dimensions.width).toBe(1950);
    });

    it('generates a new room extension with walls, window, and door from dimensions prompt', () => {
      const project = getMyHomeProject();
      const result = generatePlanFromPrompt(
        'Add a 4x3m guest bedroom on East side',
        project
      );

      // Should create 4 perimeter walls and 1 room
      expect(result.actions.filter(a => a.type === 'add_wall')).toHaveLength(4);
      expect(result.actions.filter(a => a.type === 'add_room')).toHaveLength(1);
      expect(result.message).toContain('4m × 3m');
    });

    it('triggers building code audit from natural language inquiry', () => {
      const project = getMyHomeProject();
      const result = generatePlanFromPrompt(
        'Audit my floor plan for code compliance and daylight',
        project
      );

      expect(result.message).toContain('Audit completed');
      expect(result.message).toContain('Compliance Score');
    });
  });

  describe('Project Store Prop Actions with Undo / Redo History', () => {
    it('adds, updates, deletes props with undo/redo capability', async () => {
      const store = useProjectStore.getState();
      const myHome = getMyHomeProject();
      await store.importProject(myHome);

      const floorId = myHome.activeFloorId;

      // 1. Add Prop
      const testProp = {
        id: 'prop-unit-test-1',
        floorId,
        name: 'Custom Armchair',
        category: 'living' as const,
        propType: 'sofa' as const,
        position: { x: 3000, y: 3000 },
        rotation: 0,
        dimensions: { width: 900, depth: 900 },
        color: '#3b82f6',
      };

      store.addProp(floorId, testProp);
      let current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].props).toHaveLength(1);
      expect(current.floors[0].props![0].name).toBe('Custom Armchair');

      // 2. Update Prop (rotation and color)
      store.updateProp(floorId, 'prop-unit-test-1', (p) => {
        p.rotation = 90;
        p.color = '#ef4444';
      });
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].props![0].rotation).toBe(90);
      expect(current.floors[0].props![0].color).toBe('#ef4444');

      // 3. Undo update
      store.undo();
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].props![0].rotation).toBe(0);

      // 4. Redo update
      store.redo();
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].props![0].rotation).toBe(90);

      // 5. Delete Prop
      store.deleteProp(floorId, 'prop-unit-test-1');
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].props).toHaveLength(0);

      // 6. Undo deletion
      store.undo();
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].props).toHaveLength(1);
    });
  });
});
