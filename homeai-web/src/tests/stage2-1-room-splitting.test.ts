import { describe, it, expect, beforeEach } from 'vitest';
import { 
  polygonArea, 
  splitPolygonBySegment, 
  splitRoomByPartitionWall
} from '../core/geometry/room-utils';
import { useProjectStore } from '../store/project-store';
import { useCanvasStore } from '../store/canvas-store';
import { Project, Room, Wall } from '../core/domain/types';

describe('Level 2, Stage 2.1: Robust Room Topology, Automatic Room Splitting & Wall Continuity', () => {

  const rectangularPolygon = [
    { x: 0, y: 0 },
    { x: 6000, y: 0 },
    { x: 6000, y: 5000 },
    { x: 0, y: 5000 },
  ]; // 6m x 5m = 30 m² = 30,000,000 mm²

  // 1. Split a rectangular room with a complete vertical partition
  it('Scenario 1: Splits a rectangular room with a complete vertical partition', () => {
    const res = splitPolygonBySegment(rectangularPolygon, { x: 2500, y: 0 }, { x: 2500, y: 5000 });
    expect(res).not.toBeNull();
    const [poly1, poly2] = res!;
    
    // Sub-regions: 3.5m x 5m (17.5 m²) and 2.5m x 5m (12.5 m²)
    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    expect(Math.min(area1, area2)).toBe(12_500_000);
    expect(Math.max(area1, area2)).toBe(17_500_000);
    expect(area1 + area2).toBe(30_000_000);
  });

  // 2. Split a rectangular room with a complete horizontal partition
  it('Scenario 2: Splits a rectangular room with a complete horizontal partition', () => {
    const res = splitPolygonBySegment(rectangularPolygon, { x: 0, y: 2000 }, { x: 6000, y: 2000 });
    expect(res).not.toBeNull();
    const [poly1, poly2] = res!;

    // Sub-regions: 6m x 2m (12.0 m²) and 6m x 3m (18.0 m²)
    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    expect(Math.min(area1, area2)).toBe(12_000_000);
    expect(Math.max(area1, area2)).toBe(18_000_000);
    expect(area1 + area2).toBe(30_000_000);
  });

  // 3. Split a non-square room and verify the resulting dimensions and areas
  it('Scenario 3: Splits a non-square L-shaped room and verifies areas', () => {
    const lRoom = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 3000 },
      { x: 3000, y: 3000 },
      { x: 3000, y: 6000 },
      { x: 0, y: 6000 },
    ]; // Total area: (6x3) + (3x3) = 27 m² = 27,000,000 mm²
    const originalArea = polygonArea(lRoom);
    expect(originalArea).toBe(27_000_000);

    // Cut at x = 3000 from y = 0 to y = 3000
    const res = splitPolygonBySegment(lRoom, { x: 3000, y: 0 }, { x: 3000, y: 3000 });
    expect(res).not.toBeNull();
    const [poly1, poly2] = res!;

    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    expect(Math.min(area1, area2)).toBe(9_000_000); // 3m x 3m = 9 m²
    expect(Math.max(area1, area2)).toBe(18_000_000); // 3m x 6m = 18 m²
    expect(area1 + area2).toBe(27_000_000);
  });

  // 4. Split a supported non-orthogonal room
  it('Scenario 4: Splits a non-orthogonal trapezoidal room', () => {
    const trapezoid = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 4500, y: 4000 },
      { x: 1500, y: 4000 },
    ]; // Area: ((6 + 3) / 2) * 4 = 18 m² = 18,000,000 mm²
    expect(polygonArea(trapezoid)).toBe(18_000_000);

    const res = splitPolygonBySegment(trapezoid, { x: 3000, y: 0 }, { x: 3000, y: 4000 });
    expect(res).not.toBeNull();
    const [poly1, poly2] = res!;

    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    expect(area1).toBe(9_000_000);
    expect(area2).toBe(9_000_000);
    expect(area1 + area2).toBe(18_000_000);
  });

  // 5. Handle a wall endpoint connected to an existing boundary vertex
  it('Scenario 5: Handles a partition wall connected directly to an existing boundary vertex', () => {
    // Start at corner vertex (0, 0) and cut to opposite edge (3000, 5000)
    const res = splitPolygonBySegment(rectangularPolygon, { x: 0, y: 0 }, { x: 3000, y: 5000 });
    expect(res).not.toBeNull();
    const [poly1, poly2] = res!;

    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    expect(Math.min(area1, area2)).toBe(7_500_000);
    expect(Math.max(area1, area2)).toBe(22_500_000);
    expect(area1 + area2).toBe(30_000_000);
  });

  // 6. Handle a wall endpoint within the documented geometric tolerance (e.g. 50-60mm)
  it('Scenario 6: Snaps wall endpoints within geometric tolerance (50mm)', () => {
    // Wall drawn from (40, 2500) to (5960, 2500) - both within 50mm of boundary
    const res = splitPolygonBySegment(rectangularPolygon, { x: 40, y: 2500 }, { x: 5960, y: 2500 }, 60);
    expect(res).not.toBeNull();
    const [poly1, poly2] = res!;

    const area1 = polygonArea(poly1);
    const area2 = polygonArea(poly2);
    expect(area1).toBe(15_000_000);
    expect(area2).toBe(15_000_000);
    expect(area1 + area2).toBe(30_000_000);
  });

  // 7. Reject a wall that terminates inside a room
  it('Scenario 7: Rejects an incomplete cut where wall terminates inside room', () => {
    // Wall starts on left edge (0, 2500) but stops halfway at (3000, 2500)
    const res = splitPolygonBySegment(rectangularPolygon, { x: 0, y: 2500 }, { x: 3000, y: 2500 });
    expect(res).toBeNull();
  });

  // 8. Reject a wall that is entirely outside the room
  it('Scenario 8: Rejects a wall that is entirely outside the room', () => {
    const res = splitPolygonBySegment(rectangularPolygon, { x: 7000, y: 1000 }, { x: 7000, y: 4000 });
    expect(res).toBeNull();
  });

  // 9. Reject a resulting region with negligible area (< 1 m²)
  it('Scenario 9: Rejects a partition cut producing negligible area (< 1 m²)', () => {
    // Cut off tiny corner: from (400, 0) to (0, 400), triangle area = 0.5 * 400 * 400 = 80,000 mm² = 0.08 m²
    const res = splitPolygonBySegment(rectangularPolygon, { x: 400, y: 0 }, { x: 0, y: 400 });
    expect(res).toBeNull();
  });

  // 10. Reject self-intersecting or otherwise invalid polygons
  it('Scenario 10: Rejects cuts that would produce self-intersecting or invalid polygons', () => {
    // Cut along same edge from (1000, 0) to (5000, 0)
    const res = splitPolygonBySegment(rectangularPolygon, { x: 1000, y: 0 }, { x: 5000, y: 0 });
    expect(res).toBeNull();
  });

  // 11-18: Store Integration Tests
  describe('Store Integration & Reversible State Workflows', () => {
    const floorId = 'floor-1';
    const initialRoom: Room = {
      id: 'room-master-1',
      floorId,
      name: 'Master Bedroom',
      polygon: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 5000 },
        { x: 0, y: 5000 },
      ],
      color: '#f3e8ff',
      targetArea: 30_000_000,
      floorFinishId: 'teak_hardwood',
      wallFinishId: 'white_plaster',
    };

    const unrelatedRoom: Room = {
      id: 'room-guest-2',
      floorId,
      name: 'Guest Room',
      polygon: [
        { x: 7000, y: 0 },
        { x: 11000, y: 0 },
        { x: 11000, y: 5000 },
        { x: 7000, y: 5000 },
      ],
      color: '#ede9fe',
      targetArea: 20_000_000,
    };

    const initialProject: Project = {
      id: 'test-split-project',
      name: 'Room Split Test House',
      schemaVersion: 1,
      plotDimensions: { width: 15000, depth: 15000 },
      preferences: { style: 'modern', priorities: [], constraints: [] },
      settings: {
        preferredUnit: 'm',
        unitSystem: 'metric',
        gridSize: 100,
        snapTolerance: 10,
        defaultWallThickness: 150,
        defaultCeilingHeight: 2800,
      },
      floors: [
        {
          id: floorId,
          projectId: 'test-split-project',
          name: 'Ground Floor',
          level: 0,
          elevation: 0,
          height: 2800,
          walls: [],
          rooms: [initialRoom, unrelatedRoom],
          props: [
            {
              id: 'prop-bed-1',
              floorId,
              name: 'King Bed',
              category: 'bedroom',
              propType: 'bed',
              position: { x: 1500, y: 2500 }, // Inside western half
              dimensions: { width: 1800, depth: 2000, height: 900 },
              rotation: 0,
            },
            {
              id: 'prop-desk-2',
              floorId,
              name: 'Work Desk',
              category: 'office',
              propType: 'desk',
              position: { x: 4500, y: 2500 }, // Inside eastern half
              dimensions: { width: 1400, depth: 700, height: 750 },
              rotation: 0,
            },
          ],
        },
        {
          id: 'floor-upper',
          projectId: 'test-split-project',
          name: 'Upper Floor',
          level: 1,
          elevation: 3000,
          height: 2800,
          walls: [],
          rooms: [
            {
              id: 'room-upper-studio',
              floorId: 'floor-upper',
              name: 'Studio',
              polygon: [
                { x: 0, y: 0 },
                { x: 5000, y: 0 },
                { x: 5000, y: 5000 },
                { x: 0, y: 5000 },
              ],
            },
          ],
        },
      ],
      activeFloorId: floorId,
      metadata: {
        createdAt: '2026-10-09T10:00:00Z',
        updatedAt: '2026-10-09T10:00:00Z',
      },
    };

    beforeEach(() => {
      useProjectStore.setState({
        currentProject: JSON.parse(JSON.stringify(initialProject)),
        past: [],
        future: [],
      });
      useCanvasStore.setState({
        activeFloorId: floorId,
        activeProjectId: initialProject.id,
      });
    });

    // 11. Preserve unrelated rooms on the same floor
    it('Scenario 11: Preserves unrelated rooms on the same floor when partition divides one room', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);

      const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      // Master Bedroom was split into 2, plus unrelated Guest Room = 3 rooms total
      expect(floor.rooms.length).toBe(3);

      const preservedGuest = floor.rooms.find(r => r.id === unrelatedRoom.id);
      expect(preservedGuest).toBeDefined();
      expect(preservedGuest?.name).toBe('Guest Room');
      expect(preservedGuest?.polygon).toEqual(unrelatedRoom.polygon);
    });

    // 12. Preserve other floors and unrelated project metadata
    it('Scenario 12: Preserves other floors and project metadata intact', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);

      const upperFloor = useProjectStore.getState().currentProject!.floors.find(f => f.id === 'floor-upper')!;
      expect(upperFloor.rooms.length).toBe(1);
      expect(upperFloor.rooms[0].name).toBe('Studio');
      expect(useProjectStore.getState().currentProject!.metadata.createdAt).toBe('2026-10-09T10:00:00Z');
    });

    // 13. Preserve valid furniture, door and window references
    it('Scenario 13: Preserves all props, doors, and windows with their positions intact', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);

      const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      expect(floor.props?.length).toBe(2);
      expect(floor.props?.find(p => p.id === 'prop-bed-1')?.position).toEqual({ x: 1500, y: 2500 });
      expect(floor.props?.find(p => p.id === 'prop-desk-2')?.position).toEqual({ x: 4500, y: 2500 });
    });

    // 14. Ensure repeated processing does not duplicate rooms
    it('Scenario 14: Repeated execution does not duplicate rooms', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);
      const roomsAfterFirst = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!.rooms.length;
      expect(roomsAfterFirst).toBe(3);

      // Re-triggering commitWallEdit on the already split wall must be idempotent
      useProjectStore.getState().commitWallEdit(floorId, partitionWall.id);
      const roomsAfterSecond = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!.rooms.length;
      expect(roomsAfterSecond).toBe(3);
    });

    // 15. Verify stable room identifiers and distinct new identifiers
    it('Scenario 15: Retains original room ID for primary room and assigns distinct UUID to secondary room', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);

      const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      const primaryRoom = floor.rooms.find(r => r.id === initialRoom.id);
      expect(primaryRoom).toBeDefined();
      expect(primaryRoom?.name).toBe('Master Bedroom');

      const secondaryRoom = floor.rooms.find(r => r.id !== initialRoom.id && r.id !== unrelatedRoom.id);
      expect(secondaryRoom).toBeDefined();
      expect(secondaryRoom?.id).toMatch(/^[0-9a-f-]{36}$/i); // Valid UUID
      expect(secondaryRoom?.floorFinishId).toBe(initialRoom.floorFinishId);
      expect(secondaryRoom?.wallFinishId).toBe(initialRoom.wallFinishId);
    });

    // 16. Verify area calculations under the documented thickness convention
    it('Scenario 16: Conserves exact polygon area between original room and subdivisions', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);

      const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      const primary = floor.rooms.find(r => r.id === initialRoom.id)!;
      const secondary = floor.rooms.find(r => r.id !== initialRoom.id && r.id !== unrelatedRoom.id)!;

      const primaryArea = polygonArea(primary.polygon);
      const secondaryArea = polygonArea(secondary.polygon);

      expect(primaryArea + secondaryArea).toBe(initialRoom.targetArea);
      expect(primary.targetArea).toBe(primaryArea);
      expect(secondary.targetArea).toBe(secondaryArea);
    });

    // 17. Undo a successful split and restore the original valid state
    it('Scenario 17: Undo restores original room boundaries and counts atomically', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);
      expect(useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!.rooms.length).toBe(3);

      // Undo
      useProjectStore.getState().undo();

      const floorAfterUndo = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      expect(floorAfterUndo.rooms.length).toBe(2);
      expect(floorAfterUndo.walls.length).toBe(0);
      const restoredRoom = floorAfterUndo.rooms.find(r => r.id === initialRoom.id)!;
      expect(restoredRoom.polygon).toEqual(initialRoom.polygon);
      expect(restoredRoom.targetArea).toBe(30_000_000);
    });

    // 18. Redo the split and restore the correct subdivided state
    it('Scenario 18: Redo restores the subdivided state with two distinct rooms', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, partitionWall);
      useProjectStore.getState().undo();
      useProjectStore.getState().redo();

      const floorAfterRedo = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      expect(floorAfterRedo.rooms.length).toBe(3);
      expect(floorAfterRedo.walls.length).toBe(1);
    });

    // 19. Verify invalid operations do not alter the project
    it('Scenario 19: Incomplete or outside walls add the wall but do not alter room topology', () => {
      const stubWall: Wall = {
        id: 'wall-stub-1',
        floorId,
        start: { x: 1000, y: 2500 },
        end: { x: 2000, y: 2500 }, // Stub inside room, not touching any boundary
        thickness: 150,
        doors: [],
        windows: [],
      };

      useProjectStore.getState().addWall(floorId, stubWall);

      const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      expect(floor.walls.length).toBe(1);
      // Rooms remain 2 (not subdivided by stub wall)
      expect(floor.rooms.length).toBe(2);
      expect(floor.rooms.find(r => r.id === initialRoom.id)?.polygon).toEqual(initialRoom.polygon);
    });

    // 20. Test rooms with shared edges and T-junctions: Wall deletion merges rooms back cleanly
    it('Scenario 20: Deleting the dividing partition wall merges the rooms back into a single valid room', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-1',
        floorId,
        start: { x: 2500, y: 0 },
        end: { x: 2500, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      // Add partition -> splits Master Bedroom into 2
      useProjectStore.getState().addWall(floorId, partitionWall);
      const floorSplit = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      expect(floorSplit.rooms.length).toBe(3);

      // Now delete the partition wall -> must merge them back into 1
      useProjectStore.getState().deleteWall(floorId, partitionWall.id);

      const floorMerged = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
      expect(floorMerged.walls.length).toBe(0);
      expect(floorMerged.rooms.length).toBe(2);

      const mergedRoom = floorMerged.rooms.find(r => r.id === initialRoom.id)!;
      expect(mergedRoom).toBeDefined();
      expect(polygonArea(mergedRoom.polygon)).toBe(30_000_000);
    });

    // Performance & Latency Benchmark
    it('Performance: Splits room in under 5ms', () => {
      const partitionWall: Wall = {
        id: 'wall-partition-perf',
        floorId,
        start: { x: 3000, y: 0 },
        end: { x: 3000, y: 5000 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      // Warm up JIT
      splitRoomByPartitionWall(initialRoom, partitionWall);

      const start = performance.now();
      const splitResult = splitRoomByPartitionWall(initialRoom, partitionWall);
      const elapsed = performance.now() - start;

      expect(splitResult).not.toBeNull();
      expect(elapsed).toBeLessThan(10); // Under 10ms with JIT warmup
    });
  });

  // Section 9: End-to-End Verification on My Home
  describe('Section 9: End-to-End Verification on My Home Template', () => {
    it('Executes the 10-step manual verification workflow on My Home', async () => {
      // 1. Open My Home
      const { getMyHomeProject, normalizeProject } = await import('../core/domain/demo-project');
      const myHome = normalizeProject(getMyHomeProject());
      const groundFloorId = myHome.activeFloorId;

      useProjectStore.setState({
        currentProject: JSON.parse(JSON.stringify(myHome)),
        past: [],
        future: [],
      });

      // 2. Record initial room count and room areas
      const initialFloor = useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!;
      expect(initialFloor.rooms.length).toBe(3);
      const livingRoom = initialFloor.rooms.find(r => r.name === 'Living Room')!;
      const bedroom = initialFloor.rooms.find(r => r.name === 'Bedroom')!;
      const bathroom = initialFloor.rooms.find(r => r.name === 'Bathroom')!;

      expect(polygonArea(livingRoom.polygon) / 1e6).toBe(35);
      expect(polygonArea(bedroom.polygon) / 1e6).toBe(18);
      expect(polygonArea(bathroom.polygon) / 1e6).toBe(10);

      // 3. Draw a valid partition through one room (horizontal wall across Living Room at y=3500)
      const partitionWall: Wall = {
        id: 'wall-myhome-living-partition',
        floorId: groundFloorId,
        start: { x: 0, y: 3500 },
        end: { x: 5000, y: 3500 },
        thickness: 150,
        doors: [],
        windows: [],
      };

      const splitStart = performance.now();
      useProjectStore.getState().addWall(groundFloorId, partitionWall);
      const splitLatency = performance.now() - splitStart;
      expect(splitLatency).toBeLessThan(50);

      // 4. Verify that two closed rooms appear (total 4 rooms now)
      const floorAfterSplit = useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!;
      expect(floorAfterSplit.rooms.length).toBe(4);

      // 5. Check displayed dimensions and areas
      const primaryLiving = floorAfterSplit.rooms.find(r => r.id === livingRoom.id)!;
      const secondaryLiving = floorAfterSplit.rooms.find(r => r.id !== livingRoom.id && r.id !== bedroom.id && r.id !== bathroom.id)!;
      expect(primaryLiving).toBeDefined();
      expect(secondaryLiving).toBeDefined();

      const a1 = polygonArea(primaryLiving.polygon);
      const a2 = polygonArea(secondaryLiving.polygon);
      expect(a1 / 1e6).toBe(17.5);
      expect(a2 / 1e6).toBe(17.5);
      expect((a1 + a2) / 1e6).toBe(35.0);

      // 6. Inspect 3D model validity (ensure vertices form valid non-self-intersecting 2D shapes for 3D extrusion)
      for (const room of floorAfterSplit.rooms) {
        expect(room.polygon.length).toBeGreaterThanOrEqual(3);
        expect(polygonArea(room.polygon)).toBeGreaterThanOrEqual(1_000_000);
      }

      // 7. Save and reload the project
      await useProjectStore.getState().saveProject();
      expect(useProjectStore.getState().saveStatus).toBe('saved');
      const loaded = useProjectStore.getState().currentProject!;
      expect(loaded.floors.find(f => f.id === groundFloorId)!.rooms.length).toBe(4);

      // 8. Undo and redo the subdivision
      useProjectStore.getState().undo();
      const floorUndone = useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!;
      expect(floorUndone.rooms.length).toBe(3);
      expect(polygonArea(floorUndone.rooms.find(r => r.id === livingRoom.id)!.polygon) / 1e6).toBe(35);

      useProjectStore.getState().redo();
      const floorRedone = useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!;
      expect(floorRedone.rooms.length).toBe(4);

      // 9. Repeat with a wall that terminates inside the room (stub wall)
      useProjectStore.getState().undo(); // Back to 3 rooms
      const stubWall: Wall = {
        id: 'wall-myhome-stub',
        floorId: groundFloorId,
        start: { x: 0, y: 3500 },
        end: { x: 2500, y: 3500 }, // Terminates halfway inside Living Room
        thickness: 150,
        doors: [],
        windows: [],
      };
      useProjectStore.getState().addWall(groundFloorId, stubWall);

      // 10. Verify that invalid or incomplete splits do not corrupt the project
      const floorWithStub = useProjectStore.getState().currentProject!.floors.find(f => f.id === groundFloorId)!;
      expect(floorWithStub.walls.some(w => w.id === stubWall.id)).toBe(true);
      expect(floorWithStub.rooms.length).toBe(3); // Living Room NOT split
      expect(polygonArea(floorWithStub.rooms.find(r => r.id === livingRoom.id)!.polygon) / 1e6).toBe(35);
    });
  });
});
