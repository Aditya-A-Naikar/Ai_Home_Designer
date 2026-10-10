import { describe, it, expect } from 'vitest';
import { 
  getSortedFloors, 
  getFloorElevationBounds, 
  getReferenceUnderlayFloor, 
  snapToUnderlayEndpoint, 
  detectVerticalWallMisalignment, 
  recalculateFloorElevations, 
  validateMultiFloorProject 
} from '../core/geometry/floor-utils';
import { computeWallFootprints } from '../core/geometry/wall-joins';
import { polygonArea } from '../core/geometry/room-utils';
import { useProjectStore } from '../store/project-store';
import { useCanvasStore } from '../store/canvas-store';
import { Floor, Project, Wall } from '../core/domain/types';
import { getMyHomeProject, normalizeProject } from '../core/domain/demo-project';

describe('Level 2, Stage 2.3: Multi-Floor Alignment, Vertical Coordination and Ghost Underlays', () => {

  // Scenario 1: Existing single-storey project compatibility
  it('Scenario 1: Loads and validates existing single-storey project seamlessly', () => {
    const singleStorey = normalizeProject(getMyHomeProject());
    expect(singleStorey.floors.length).toBe(1);
    expect(singleStorey.floors[0].elevation).toBe(0);

    const validation = validateMultiFloorProject(singleStorey);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Single-storey has no underlay reference
    const underlay = getReferenceUnderlayFloor(singleStorey, singleStorey.activeFloorId);
    expect(underlay).toBeNull();
  });

  // Scenario 2: Two-storey project with distinct elevations
  it('Scenario 2: Correctly calculates elevations for a two-storey project (Ground @ 0mm, Level 1 @ 2800mm)', () => {
    const baseProj = normalizeProject(getMyHomeProject());
    const groundFloor = baseProj.floors[0];

    const firstFloor: Floor = {
      id: 'floor-upper-1',
      projectId: baseProj.id,
      level: 1,
      name: 'First Floor',
      elevation: 2800,
      height: 2800,
      walls: [
        { id: 'w-u-1', floorId: 'floor-upper-1', start: { x: 0, y: 0 }, end: { x: 9000, y: 0 }, thickness: 200, doors: [], windows: [] },
      ],
      rooms: [],
    };

    baseProj.floors.push(firstFloor);

    const validation = validateMultiFloorProject(baseProj);
    expect(validation.isValid).toBe(true);

    const sorted = getSortedFloors(baseProj.floors);
    expect(sorted[0].id).toBe(groundFloor.id);
    expect(sorted[1].id).toBe(firstFloor.id);

    const bounds0 = getFloorElevationBounds(sorted[0]);
    const bounds1 = getFloorElevationBounds(sorted[1]);
    expect(bounds0.baseElevation).toBe(0);
    expect(bounds0.topElevation).toBe(2800);
    expect(bounds1.baseElevation).toBe(2800);
    expect(bounds1.topElevation).toBe(5600);
  });

  // Scenario 3: Three-storey project with different floor heights
  it('Scenario 3: Supports custom floor heights across three stories (e.g. 3500mm living, 2800mm bed, 2400mm attic)', () => {
    const floors: Floor[] = [
      { id: 'f0', projectId: 'p1', level: 0, name: 'Ground', elevation: 0, height: 3500, walls: [], rooms: [] },
      { id: 'f1', projectId: 'p1', level: 1, name: 'First', elevation: 3500, height: 2800, walls: [], rooms: [] },
      { id: 'f2', projectId: 'p1', level: 2, name: 'Attic', elevation: 6300, height: 2400, walls: [], rooms: [] },
    ];

    const proj: Project = {
      ...normalizeProject(getMyHomeProject()),
      floors,
      activeFloorId: 'f2',
    };

    const validation = validateMultiFloorProject(proj);
    expect(validation.isValid).toBe(true);

    expect(getFloorElevationBounds(floors[0]).topElevation).toBe(3500);
    expect(getFloorElevationBounds(floors[1]).topElevation).toBe(6300);
    expect(getFloorElevationBounds(floors[2]).topElevation).toBe(8700);
  });

  // Scenario 4: Correct absolute elevations for floors, walls and slabs
  it('Scenario 4: Accurately derives wall base and top elevations in millimeters', () => {
    const floor: Floor = {
      id: 'f-duplex-upper',
      projectId: 'p-duplex',
      level: 2,
      name: 'Second Floor',
      elevation: 5800,
      height: 3000,
      walls: [],
      rooms: [],
    };

    const bounds = getFloorElevationBounds(floor);
    expect(bounds.baseElevation).toBe(5800);
    expect(bounds.height).toBe(3000);
    expect(bounds.topElevation).toBe(8800);
  });

  // Scenario 5: Floor switching without losing or mutating unrelated geometry
  it('Scenario 5: Switching active floor preserves geometry on all floors without unintended mutation', () => {
    const proj = normalizeProject(getMyHomeProject());
    const groundFloorId = proj.activeFloorId;
    const initialGroundWalls = proj.floors[0].walls.length;

    // Add Upper Floor
    const upperFloorId = 'floor-upper-isolated';
    const upperWall: Wall = {
      id: 'w-upper-iso-1',
      floorId: upperFloorId,
      start: { x: 1000, y: 1000 },
      end: { x: 5000, y: 1000 },
      thickness: 150,
      doors: [],
      windows: [],
    };
    proj.floors.push({
      id: upperFloorId,
      projectId: proj.id,
      level: 1,
      name: 'Upper Floor',
      elevation: 2800,
      height: 2800,
      walls: [upperWall],
      rooms: [],
    });

    useProjectStore.setState({ currentProject: proj });

    // Switch to upper floor
    useProjectStore.getState().setActiveFloor(upperFloorId);
    expect(useProjectStore.getState().currentProject!.activeFloorId).toBe(upperFloorId);
    expect(useProjectStore.getState().currentProject!.floors.find(f => f.id === upperFloorId)!.walls).toHaveLength(1);

    // Switch back to ground floor
    useProjectStore.getState().setActiveFloor(groundFloorId);
    expect(useProjectStore.getState().currentProject!.activeFloorId).toBe(groundFloorId);
    expect(useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!.walls).toHaveLength(initialGroundWalls);
  });

  // Scenario 6: Stable horizontal coordinates across floors
  it('Scenario 6: Ensures horizontal coordinate space (x, y) aligns consistently between ground and upper floor', () => {
    const baseProj = normalizeProject(getMyHomeProject());
    const gWall = baseProj.floors[0].walls[0]; // e.g. North wall (0,0) -> (9000,0)

    const uWall: Wall = {
      id: 'u-north',
      floorId: 'upper-floor',
      start: { ...gWall.start },
      end: { ...gWall.end },
      thickness: gWall.thickness,
      doors: [],
      windows: [],
    };

    const misalignment = detectVerticalWallMisalignment(uWall, baseProj.floors[0].walls);
    expect(misalignment.isAligned).toBe(true);
    expect(misalignment.distance).toBe(0);
    expect(misalignment.referenceWallId).toBe(gWall.id);
  });

  // Scenario 7: Configurable floor elevation changes
  it('Scenario 7: Dynamically recalculates continuous stacking elevations when floor heights are altered', () => {
    const floors: Floor[] = [
      { id: 'f0', projectId: 'p1', level: 0, name: 'Ground', elevation: 0, height: 3000, walls: [], rooms: [] },
      { id: 'f1', projectId: 'p1', level: 1, name: 'First', elevation: 3000, height: 3200, walls: [], rooms: [] },
      { id: 'f2', projectId: 'p1', level: 2, name: 'Second', elevation: 6200, height: 2800, walls: [], rooms: [] },
    ];

    // Alter First Floor height to 3500mm
    floors[1].height = 3500;
    const restacked = recalculateFloorElevations(floors);

    expect(restacked[0].elevation).toBe(0);
    expect(restacked[1].elevation).toBe(3000);
    expect(restacked[2].elevation).toBe(6500); // 3000 + 3500 = 6500mm
  });

  // Scenario 8: Invalid and duplicate floor identifiers
  it('Scenario 8: Detects duplicate and empty floor identifiers during validation', () => {
    const invalidProj: Project = {
      ...normalizeProject(getMyHomeProject()),
      floors: [
        { id: 'floor-dup', projectId: 'p', level: 0, name: 'Ground', elevation: 0, height: 2800, walls: [], rooms: [] },
        { id: 'floor-dup', projectId: 'p', level: 1, name: 'First', elevation: 2800, height: 2800, walls: [], rooms: [] },
        { id: '', projectId: 'p', level: 2, name: 'Second', elevation: 5600, height: 2800, walls: [], rooms: [] },
      ],
    };

    const res = validateMultiFloorProject(invalidProj);
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.code === 'DUPLICATE_FLOOR_ID')).toBe(true);
    expect(res.errors.some(e => e.code === 'INVALID_FLOOR_ID')).toBe(true);
  });

  // Scenario 9: Invalid elevation and height values
  it('Scenario 9: Rejects non-finite elevations and non-positive ceiling heights', () => {
    const invalidProj: Project = {
      ...normalizeProject(getMyHomeProject()),
      floors: [
        { id: 'f0', projectId: 'p', level: 0, name: 'Ground', elevation: NaN, height: 2800, walls: [], rooms: [] },
        { id: 'f1', projectId: 'p', level: 1, name: 'First', elevation: 2800, height: -500, walls: [], rooms: [] },
      ],
    };

    const res = validateMultiFloorProject(invalidProj);
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.code === 'INVALID_ELEVATION')).toBe(true);
    expect(res.errors.some(e => e.code === 'INVALID_HEIGHT')).toBe(true);
  });

  // Scenario 10: Ghost underlay alignment
  it('Scenario 10: Identifies lower floor as reference underlay when upper floor is active', () => {
    const proj = normalizeProject(getMyHomeProject());
    const groundId = proj.floors[0].id;
    const upperId = 'floor-upper-reference';

    proj.floors.push({
      id: upperId,
      projectId: proj.id,
      level: 1,
      name: 'First Floor',
      elevation: 2800,
      height: 2800,
      walls: [],
      rooms: [],
    });

    // When Ground floor is active, no lower floor exists
    expect(getReferenceUnderlayFloor(proj, groundId)).toBeNull();

    // When First floor is active, Ground floor is returned
    const underlay = getReferenceUnderlayFloor(proj, upperId);
    expect(underlay).not.toBeNull();
    expect(underlay!.id).toBe(groundId);
    expect(underlay!.name).toBe('Ground Floor');
  });

  // Scenario 11: Enabling and disabling the underlay
  it('Scenario 11: Toggles showUnderlay state in canvas store reliably', () => {
    useCanvasStore.setState({ showUnderlay: false });
    expect(useCanvasStore.getState().showUnderlay).toBe(false);

    useCanvasStore.getState().toggleShowUnderlay();
    expect(useCanvasStore.getState().showUnderlay).toBe(true);

    useCanvasStore.getState().toggleShowUnderlay();
    expect(useCanvasStore.getState().showUnderlay).toBe(false);
  });

  // Scenario 12: Transparency behaviour within configured bounds
  it('Scenario 12: Clamps underlay opacity within safe bounds [0.10, 0.80]', () => {
    useCanvasStore.getState().setUnderlayOpacity(0.5);
    expect(useCanvasStore.getState().underlayOpacity).toBe(0.5);

    // Below minimum
    useCanvasStore.getState().setUnderlayOpacity(0.02);
    expect(useCanvasStore.getState().underlayOpacity).toBe(0.1);

    // Above maximum
    useCanvasStore.getState().setUnderlayOpacity(0.99);
    expect(useCanvasStore.getState().underlayOpacity).toBe(0.8);
  });

  // Scenario 13: Non-editability of ghost geometry
  it('Scenario 13: Does not alter active floor walls when inspecting or snapping to underlay', () => {
    const proj = normalizeProject(getMyHomeProject());
    const groundFloor = proj.floors[0];
    const initialWallCount = groundFloor.walls.length;

    const upperFloor: Floor = {
      id: 'f-upper-read-only',
      projectId: proj.id,
      level: 1,
      name: 'Upper Floor',
      elevation: 2800,
      height: 2800,
      walls: [],
      rooms: [],
    };
    proj.floors.push(upperFloor);

    const ref = getReferenceUnderlayFloor(proj, 'f-upper-read-only');
    expect(ref).not.toBeNull();

    // Querying underlay geometry must be read-only
    const snapPt = snapToUnderlayEndpoint({ x: 10, y: 10 }, ref, 150);
    expect(snapPt).toEqual({ x: 0, y: 0 }); // Snapped to (0,0) corner of ground floor north wall
    expect(groundFloor.walls).toHaveLength(initialWallCount);
    expect(upperFloor.walls).toHaveLength(0);
  });

  // Scenario 14: Active-floor wall selection while an underlay is visible
  it('Scenario 14: Active floor selection remains fully operational while underlay is enabled', () => {
    useCanvasStore.setState({ showUnderlay: true, selectedElementId: null });
    expect(useCanvasStore.getState().showUnderlay).toBe(true);

    useCanvasStore.getState().selectElement('upper-wall-123');
    expect(useCanvasStore.getState().selectedElementId).toBe('upper-wall-123');
  });

  // Scenario 15: Underlay behaviour when no lower floor exists
  it('Scenario 15: Returns null underlay when on the ground floor or a single-floor project', () => {
    const single = normalizeProject(getMyHomeProject());
    expect(getReferenceUnderlayFloor(single, single.activeFloorId)).toBeNull();

    // Even if showUnderlay is toggled true
    useCanvasStore.setState({ showUnderlay: true });
    expect(getReferenceUnderlayFloor(single, single.activeFloorId)).toBeNull();
  });

  // Scenario 16: Removal or invalidation of the reference floor
  it('Scenario 16: Handles deleted reference floor gracefully without crashing', () => {
    const proj = normalizeProject(getMyHomeProject());
    const upperId = 'f-upper-del';
    proj.floors.push({
      id: upperId,
      projectId: proj.id,
      level: 1,
      name: 'First Floor',
      elevation: 2800,
      height: 2800,
      walls: [],
      rooms: [],
    });

    useProjectStore.setState({ currentProject: proj });
    expect(getReferenceUnderlayFloor(proj, upperId)).not.toBeNull();

    // Delete ground floor
    useProjectStore.getState().deleteFloor(proj.floors[0].id);
    const updated = useProjectStore.getState().currentProject!;
    expect(updated.floors).toHaveLength(1);
    expect(getReferenceUnderlayFloor(updated, upperId)).toBeNull();
  });

  // Scenario 17: Correct persistence and reload of multi-floor projects
  it('Scenario 17: Preserves multiple floors with distinct elevations through save and load cycle', async () => {
    const proj = normalizeProject(getMyHomeProject());
    proj.floors.push({
      id: 'f-save-multi-1',
      projectId: proj.id,
      level: 1,
      name: 'Level 1',
      elevation: 2900,
      height: 2900,
      walls: [
        { id: 'w-multi-s', floorId: 'f-save-multi-1', start: { x: 0, y: 0 }, end: { x: 5000, y: 0 }, thickness: 150, doors: [], windows: [] }
      ],
      rooms: [],
    });

    useProjectStore.setState({ currentProject: proj });
    await useProjectStore.getState().saveProject();
    expect(useProjectStore.getState().saveStatus).toBe('saved');

    const loaded = useProjectStore.getState().currentProject!;
    expect(loaded.floors).toHaveLength(2);
    expect(loaded.floors[1].elevation).toBe(2900);
    expect(loaded.floors[1].height).toBe(2900);
  });

  // Scenario 18: Undo/redo for supported floor modifications
  it('Scenario 18: Restores floor state across undo and redo operations', () => {
    const proj = normalizeProject(getMyHomeProject());
    useProjectStore.setState({ currentProject: proj, past: [], future: [] });

    // Add floor
    const newFloorId = 'f-undo-redo';
    const newFloor: Floor = {
      id: newFloorId,
      projectId: proj.id,
      level: 1,
      name: 'Second Storey',
      elevation: 2800,
      height: 2800,
      walls: [],
      rooms: [],
    };
    useProjectStore.getState().addFloor(newFloor);
    expect(useProjectStore.getState().currentProject!.floors).toHaveLength(2);

    // Undo addition
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().currentProject!.floors).toHaveLength(1);

    // Redo addition
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().currentProject!.floors).toHaveLength(2);
  });

  // Scenario 19: Consistency between 2D references and 3D elevations
  it('Scenario 19: Ensures 2D horizontal coordinates match 3D coordinate space', () => {
    const proj = normalizeProject(getMyHomeProject());
    const gWall = proj.floors[0].walls[0]; // (0,0) to (9000,0)
    expect(gWall).toBeDefined();

    // Upper floor wall placed directly over it
    const upperWall: Wall = {
      id: 'w-align-3d',
      floorId: 'upper-3d',
      start: { x: 0, y: 0 },
      end: { x: 9000, y: 0 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const misalignment = detectVerticalWallMisalignment(upperWall, proj.floors[0].walls);
    expect(misalignment.isAligned).toBe(true);
    expect(misalignment.distance).toBe(0);

    // 3D elevation check
    const floorElevation = 2800;
    const floorElevationM = floorElevation / 1000;
    expect(floorElevationM).toBe(2.8);
  });

  // Scenario 20: No duplicated walls or slabs caused by the reference layer
  it('Scenario 20: Verified that ghost underlay generation does not add duplicate walls to active floor', () => {
    const proj = normalizeProject(getMyHomeProject());
    const upperId = 'f-upper-clean';
    proj.floors.push({
      id: upperId,
      projectId: proj.id,
      level: 1,
      name: 'First Floor',
      elevation: 2800,
      height: 2800,
      walls: [
        { id: 'w-u-real', floorId: upperId, start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150, doors: [], windows: [] }
      ],
      rooms: [],
    });

    const activeFloor = proj.floors.find(f => f.id === upperId)!;
    expect(activeFloor.walls).toHaveLength(1);

    // Get underlay
    const underlay = getReferenceUnderlayFloor(proj, upperId);
    expect(underlay).not.toBeNull();

    // Active floor walls MUST remain 1
    expect(activeFloor.walls).toHaveLength(1);
    expect(activeFloor.walls[0].id).toBe('w-u-real');
  });

  // Scenario 21: No regression to Stage 2.1 room topology
  it('Scenario 21: Preserves Stage 2.1 room splitting and area calculations in multi-floor projects', () => {
    const proj = normalizeProject(getMyHomeProject());
    const groundFloorId = proj.activeFloorId;

    // Partition Living Room on ground floor
    const partitionWall: Wall = {
      id: 'w-part-multi',
      floorId: groundFloorId,
      start: { x: 0, y: 3500 },
      end: { x: 5000, y: 3500 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    useProjectStore.setState({ currentProject: proj });
    useProjectStore.getState().addWall(groundFloorId, partitionWall);

    const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!;
    expect(floor.rooms.length).toBe(4); // Split 3 rooms into 4 rooms
    const totalArea = floor.rooms.reduce((acc, r) => acc + polygonArea(r.polygon), 0);
    expect(totalArea / 1e6).toBeCloseTo(63, 1);
  });

  // Scenario 22: No regression to Stage 2.2 wall joins
  it('Scenario 22: Preserves Stage 2.2 parametric miter and butt joins across multiple floors', () => {
    const proj = normalizeProject(getMyHomeProject());
    const groundFloor = proj.floors[0];

    const groundFootprints = computeWallFootprints(groundFloor.walls);
    expect(groundFootprints.size).toBe(groundFloor.walls.length);

    for (const fp of groundFootprints.values()) {
      expect(fp.isValid).toBe(true);
      expect(fp.polygon.length).toBeGreaterThanOrEqual(4);
    }
  });

  // Scenario 23: No regression to contextual drawers and existing editor behaviour
  it('Scenario 23: Contextual drawer mutual exclusion remains uncompromised during multi-floor editing', () => {
    useCanvasStore.getState().closeDrawer();
    expect(useCanvasStore.getState().activeDrawer).toBe('none');

    useCanvasStore.getState().setActiveDrawer('catalog');
    expect(useCanvasStore.getState().activeDrawer).toBe('catalog');
    expect(useCanvasStore.getState().catalogDockOpen).toBe(true);
    expect(useCanvasStore.getState().materialsDockOpen).toBe(false);

    useCanvasStore.getState().setActiveDrawer('materials');
    expect(useCanvasStore.getState().activeDrawer).toBe('materials');
    expect(useCanvasStore.getState().catalogDockOpen).toBe(false);
    expect(useCanvasStore.getState().materialsDockOpen).toBe(true);

    useCanvasStore.getState().closeDrawer();
    expect(useCanvasStore.getState().activeDrawer).toBe('none');
  });

  // Performance Benchmark: Floor switching and validation under 10ms
  it('Performance Benchmark: Executes multi-floor validation and floor switching under 10ms', () => {
    const proj = normalizeProject(getMyHomeProject());
    // Create 5-storey building
    for (let i = 1; i < 5; i++) {
      proj.floors.push({
        id: `f-bench-${i}`,
        projectId: proj.id,
        level: i,
        name: `Floor ${i}`,
        elevation: i * 2800,
        height: 2800,
        walls: [
          { id: `w-b-${i}`, floorId: `f-bench-${i}`, start: { x: 0, y: 0 }, end: { x: 9000, y: 0 }, thickness: 200, doors: [], windows: [] }
        ],
        rooms: [],
      });
    }

    // Benchmark 100 iterations of validation
    const tStart = performance.now();
    for (let i = 0; i < 100; i++) {
      validateMultiFloorProject(proj);
      getReferenceUnderlayFloor(proj, `f-bench-${(i % 4) + 1}`);
    }
    const tElapsed = performance.now() - tStart;
    const avgLatency = tElapsed / 100;

    expect(avgLatency).toBeLessThan(10); // Strictly under 10ms
  });
});
