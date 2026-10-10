import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { getDemoProject } from '@/core/domain/demo-project';
import { generatePlanFromPrompt } from '@/core/ai/plan-generator';
import { JOURNEY_STEPS } from '@/features/canvas/components/user-journey-stepper';
import { applyDesignPresetToProject } from '@/core/geometry/design-presets';
import { Prop } from '@/core/domain/types';

describe('Reference Studio Unified Workflow & Contextual AI Execution', () => {
  beforeEach(() => {
    const demo = getDemoProject();
    useProjectStore.setState({
      currentProject: demo,
      past: [],
      future: [],
    });
    useCanvasStore.setState({
      activeStage: 4,
      viewMode: '3d',
      catalogDockOpen: true,
      materialsDockOpen: true,
      walkthroughActive: false,
      aiAdvisorOpen: true,
      selectedSubElement: null,
    });
  });

  describe('1. Seven-Stage User Journey Workflow', () => {
    it('defines all 7 stages matching the reference architectural pipeline', () => {
      expect(JOURNEY_STEPS).toHaveLength(7);
      expect(JOURNEY_STEPS[0].title).toBe('Start & Requirements');
      expect(JOURNEY_STEPS[1].title).toBe('2D Floor Plan');
      expect(JOURNEY_STEPS[2].title).toBe('Confirm & Edit');
      expect(JOURNEY_STEPS[3].title).toBe('3D Generation');
      expect(JOURNEY_STEPS[4].title).toBe('Customize Everything');
      expect(JOURNEY_STEPS[5].title).toBe('Walkthrough');
      expect(JOURNEY_STEPS[6].title).toBe('Save, Render & Export');
    });

    it('manages journey stage transitions and dock states in canvas store', () => {
      const { setActiveStage, setCatalogDockOpen, setMaterialsDockOpen, setWalkthroughActive, setViewMode } = useCanvasStore.getState();

      // Jump to Stage 2 (2D CAD Plan)
      setActiveStage(2);
      setViewMode('2d');
      setWalkthroughActive(false);
      expect(useCanvasStore.getState().activeStage).toBe(2);
      expect(useCanvasStore.getState().viewMode).toBe('2d');
      expect(useCanvasStore.getState().walkthroughActive).toBe(false);

      // Jump to Stage 5 (Customize Everything)
      setActiveStage(5);
      setViewMode('3d');
      setCatalogDockOpen(true);
      expect(useCanvasStore.getState().activeStage).toBe(5);
      expect(useCanvasStore.getState().viewMode).toBe('3d');
      expect(useCanvasStore.getState().catalogDockOpen).toBe(true);
      expect(useCanvasStore.getState().materialsDockOpen).toBe(false);

      setMaterialsDockOpen(true);
      expect(useCanvasStore.getState().materialsDockOpen).toBe(true);
      expect(useCanvasStore.getState().catalogDockOpen).toBe(false);

      // Jump to Stage 6 (First-Person Walkthrough)
      setActiveStage(6);
      setWalkthroughActive(true);
      expect(useCanvasStore.getState().activeStage).toBe(6);
      expect(useCanvasStore.getState().walkthroughActive).toBe(true);
    });
  });

  describe('2. Multi-Dock Customization & Floor Synchronicity', () => {
    it('applies bulk wall finish across all walls on the active floor', () => {
      const project = useProjectStore.getState().currentProject!;
      const floorId = project.floors[0].id;

      useProjectStore.getState().updateWallFinishBulk(floorId, 'all', undefined, 'venetian_plaster', '#f5f5f4');

      const updatedProject = useProjectStore.getState().currentProject!;
      const floor = updatedProject.floors.find(f => f.id === floorId)!;
      expect(floor.walls.length).toBeGreaterThan(0);
      floor.walls.forEach(w => {
        expect(w.finishId).toBe('venetian_plaster');
        expect(w.colorHex).toBe('#f5f5f4');
      });
    });

    it('applies bulk floor finish across all rooms on the active floor', () => {
      const project = useProjectStore.getState().currentProject!;
      const floorId = project.floors[0].id;

      useProjectStore.getState().updateFloorFinishBulk(floorId, 'herringbone_parquet');

      const updatedProject = useProjectStore.getState().currentProject!;
      const floor = updatedProject.floors.find(f => f.id === floorId)!;
      expect(floor.rooms.length).toBeGreaterThan(0);
      floor.rooms.forEach(r => {
        expect(r.floorFinishId).toBe('herringbone_parquet');
      });
    });

    it('applies complete architectural design presets across all levels', () => {
      const project = useProjectStore.getState().currentProject!;
      applyDesignPresetToProject(project, 'scandinavian');

      expect(project.activeDesignPreset).toBe('scandinavian');
      project.floors.forEach(fl => {
        fl.walls.forEach(w => {
          expect(w.finishId).toBe('white_plaster');
        });
        fl.rooms.forEach(r => {
          expect(r.floorFinishId).toBe('teak_hardwood');
        });
      });
    });
  });

  describe('3. Contextual AI Conversational Tool Execution', () => {
    it('executes contextual prop color update for selected or referenced prop', () => {
      const project = useProjectStore.getState().currentProject!;
      const activeFloor = project.floors[0];

      // Ensure a sofa exists on floor
      const sofa: Prop = {
        id: 'sofa-test-1',
        floorId: activeFloor.id,
        name: '3-Seater Sofa',
        category: 'living',
        propType: 'sofa',
        position: { x: 2000, y: 2000 },
        dimensions: { width: 2200, depth: 950, height: 850 },
        rotation: 0,
        color: '#475569',
      };
      useProjectStore.getState().addProp(activeFloor.id, sofa);

      // User asks AI to change sofa to emerald green with entity selected
      const result = generatePlanFromPrompt(
        'Change sofa color to emerald green',
        useProjectStore.getState().currentProject!,
        activeFloor.id,
        { type: 'prop', id: sofa.id }
      );

      expect(result.actions).toHaveLength(1);
      const action = result.actions[0];
      expect(action.type).toBe('update_prop');
      expect(action.propId).toBe('sofa-test-1');
      expect(action.propUpdates?.color).toBe('#065f46');

      // Apply the generated action to project store
      useProjectStore.getState().applyPlanGenerationActions(activeFloor.id, result.actions);

      const updatedFloor = useProjectStore.getState().currentProject!.floors[0];
      const updatedSofa = updatedFloor.props?.find(p => p.id === 'sofa-test-1');
      expect(updatedSofa?.color).toBe('#065f46');
    });

    it('executes contextual rotation update on target prop', () => {
      const project = useProjectStore.getState().currentProject!;
      const activeFloor = project.floors[0];

      const sofa: Prop = {
        id: 'sofa-rotate-test',
        floorId: activeFloor.id,
        name: 'L-Shape Sectional',
        category: 'living',
        propType: 'sofa',
        position: { x: 3000, y: 3000 },
        dimensions: { width: 2600, depth: 1800, height: 850 },
        rotation: 0,
        color: '#475569',
      };
      useProjectStore.getState().addProp(activeFloor.id, sofa);

      const result = generatePlanFromPrompt(
        'Rotate this sofa 90 degrees',
        useProjectStore.getState().currentProject!,
        activeFloor.id,
        { type: 'prop', id: sofa.id }
      );

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('update_prop');
      expect(result.actions[0].propUpdates?.rotation).toBeCloseTo(Math.PI / 2, 2);

      useProjectStore.getState().applyPlanGenerationActions(activeFloor.id, result.actions);

      const updatedSofa = useProjectStore.getState().currentProject!.floors[0].props?.find(p => p.id === 'sofa-rotate-test');
      expect(updatedSofa?.rotation).toBeCloseTo(Math.PI / 2, 2);
    });

    it('executes design preset application via conversational prompt', () => {
      const project = useProjectStore.getState().currentProject!;
      const activeFloor = project.floors[0];

      const result = generatePlanFromPrompt(
        'Apply Japandi design style preset',
        project,
        activeFloor.id
      );

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('apply_preset');
      expect(result.actions[0].presetId).toBe('japandi');

      useProjectStore.getState().applyPlanGenerationActions(activeFloor.id, result.actions);

      const updatedProject = useProjectStore.getState().currentProject!;
      expect(updatedProject.activeDesignPreset).toBe('japandi');
      updatedProject.floors.forEach(fl => {
        fl.walls.forEach(w => {
          expect(w.finishId).toBe('warm_greige');
        });
      });
    });

    it('executes bulk wall finish update via conversational prompt', () => {
      const project = useProjectStore.getState().currentProject!;
      const activeFloor = project.floors[0];

      const result = generatePlanFromPrompt(
        'Change wall finish to limewash',
        project,
        activeFloor.id
      );

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('update_wall_finish');
      expect(result.actions[0].wallFinish).toBe('white_plaster');

      useProjectStore.getState().applyPlanGenerationActions(activeFloor.id, result.actions);

      const updatedFloor = useProjectStore.getState().currentProject!.floors[0];
      updatedFloor.walls.forEach(w => {
        expect(w.finishId).toBe('white_plaster');
      });
    });

    it('executes bulk flooring update via conversational prompt', () => {
      const project = useProjectStore.getState().currentProject!;
      const activeFloor = project.floors[0];

      const result = generatePlanFromPrompt(
        'Change flooring to Italian marble',
        project,
        activeFloor.id
      );

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('update_floor_finish');
      expect(result.actions[0].floorFinish).toBe('italian_marble');

      useProjectStore.getState().applyPlanGenerationActions(activeFloor.id, result.actions);

      const updatedFloor = useProjectStore.getState().currentProject!.floors[0];
      updatedFloor.rooms.forEach(r => {
        expect(r.floorFinishId).toBe('italian_marble');
      });
    });
  });
});
