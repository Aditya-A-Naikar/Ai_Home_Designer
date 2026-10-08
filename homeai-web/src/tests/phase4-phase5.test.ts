import { describe, it, expect, beforeEach } from 'vitest';
import { 
  projectPointOntoWall, 
  getNearestWall, 
  snapToOrtho, 
  doorPositionValid, 
  windowPositionValid,
  snapToGrid,
  snapToEndpoint
} from '../core/geometry/wall-utils';
import { autoDetectRooms, getRoomColor } from '../core/geometry/room-utils';
import { useProjectStore } from '../store/project-store';
import { Wall, Door, Window, Project } from '../core/domain/types';

describe('Phase 4: Wall, Door, Window & Room Geometry', () => {
  const wall: Wall = {
    id: 'w1',
    floorId: 'f1',
    start: { x: 0, y: 0 },
    end: { x: 2000, y: 0 },
    thickness: 150,
    doors: [],
    windows: [],
  };

  it('projects a point perpendicularly onto a wall', () => {
    const proj = projectPointOntoWall({ x: 500, y: 200 }, wall);
    expect(proj.offset).toBe(500);
    expect(proj.point).toEqual({ x: 500, y: 0 });
    expect(proj.distance).toBe(200);
  });

  it('finds the nearest wall within tolerance', () => {
    const walls = [wall];
    const nearest = getNearestWall({ x: 1000, y: 50 }, walls, 200);
    expect(nearest).not.toBeNull();
    expect(nearest?.wall.id).toBe('w1');
    expect(nearest?.offset).toBe(1000);
  });

  it('validates door and window offset boundaries', () => {
    // Wall is 2000mm long. Door is 900mm wide (half-width is 450mm).
    // Valid range: 450mm to 1550mm
    expect(doorPositionValid(wall, 1000, 900)).toBe(true);
    expect(doorPositionValid(wall, 200, 900)).toBe(false); // too close to start
    expect(doorPositionValid(wall, 1800, 900)).toBe(false); // too close to end

    // Window 1200mm wide (half-width 600mm). Valid: 600mm to 1400mm
    expect(windowPositionValid(wall, 1000, 1200)).toBe(true);
    expect(windowPositionValid(wall, 500, 1200)).toBe(false);
  });

  it('auto-detects enclosed room from a 4-wall perimeter loop', () => {
    const closedWalls: Wall[] = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150, doors: [], windows: [] },
      { id: 'w2', floorId: 'f1', start: { x: 4000, y: 0 }, end: { x: 4000, y: 3000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w3', floorId: 'f1', start: { x: 4000, y: 3000 }, end: { x: 0, y: 3000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 3000 }, end: { x: 0, y: 0 }, thickness: 150, doors: [], windows: [] },
    ];

    const detected = autoDetectRooms(closedWalls, 'f1');
    expect(detected.length).toBeGreaterThanOrEqual(1);
    expect(detected[0].polygon.length).toBe(4);
    // 4000 * 3000 = 12,000,000 sq mm = 12 sq m
    expect(detected[0].targetArea).toBe(12000000);
  });

  it('assigns color themes based on room name keywords', () => {
    expect(getRoomColor('Master Bathroom')).toBe('#ccfbf1');
    expect(getRoomColor('Guest Bedroom')).toBe('#f3e8ff');
    expect(getRoomColor('Chef Kitchen')).toBe('#fef3c7');
    expect(getRoomColor('Living Room')).toBe('#e0f2fe');
  });
});

describe('Phase 5: Snapping, Pan, Zoom & Undo/Redo Engine', () => {
  it('snaps angles to orthogonal (horizontal / vertical / 45-deg)', () => {
    const start = { x: 0, y: 0 };
    
    // Nearly horizontal
    const h = snapToOrtho(start, { x: 1000, y: 50 });
    expect(h).toEqual({ x: 1000, y: 0 });

    // Nearly vertical
    const v = snapToOrtho(start, { x: 60, y: 1500 });
    expect(v).toEqual({ x: 0, y: 1500 });
  });

  it('snaps points to grid and vertex endpoints', () => {
    expect(snapToGrid({ x: 149, y: 251 }, 100)).toEqual({ x: 100, y: 300 });

    const walls: Wall[] = [
      { id: 'w1', floorId: 'f1', start: { x: 500, y: 500 }, end: { x: 1000, y: 500 }, thickness: 150, doors: [], windows: [] }
    ];

    expect(snapToEndpoint({ x: 510, y: 505 }, walls, 30)).toEqual({ x: 500, y: 500 });
    expect(snapToEndpoint({ x: 200, y: 200 }, walls, 30)).toBeNull();
  });

  describe('Project Store Undo/Redo & Element Mutations', () => {
    beforeEach(() => {
      const mockProject: Project = {
        schemaVersion: 1,
        id: 'test-p1',
        name: 'Test House',
        plotDimensions: { width: 10000, depth: 10000 },
        settings: {
          preferredUnit: 'mm',
          unitSystem: 'metric',
          gridSize: 100,
          snapTolerance: 10,
          defaultWallThickness: 150,
          defaultCeilingHeight: 2800,
        },
        preferences: {
          style: 'modern',
          priorities: [],
          constraints: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activeFloorId: 'f1',
        floors: [
          {
            id: 'f1',
            projectId: 'test-p1',
            level: 0,
            name: 'Ground Floor',
            elevation: 0,
            height: 2800,
            walls: [
              {
                id: 'w1',
                floorId: 'f1',
                start: { x: 0, y: 0 },
                end: { x: 3000, y: 0 },
                thickness: 150,
                doors: [],
                windows: [],
              }
            ],
            rooms: [],
          }
        ],
      };

      useProjectStore.setState({
        currentProject: mockProject,
        past: [],
        future: [],
      });
    });

    it('adds a door and supports undo/redo', () => {
      const door: Door = {
        id: 'd1',
        wallId: 'w1',
        floorId: 'f1',
        offset: 1000,
        width: 900,
        height: 2100,
        swingDirection: 'inward_right',
      };

      const store = useProjectStore.getState();
      store.addDoor('f1', 'w1', door);

      let current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].doors.length).toBe(1);

      // Undo
      useProjectStore.getState().undo();
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].doors.length).toBe(0);

      // Redo
      useProjectStore.getState().redo();
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].doors.length).toBe(1);
    });

    it('adds a window and supports updates and deletion', () => {
      const win: Window = {
        id: 'win1',
        wallId: 'w1',
        floorId: 'f1',
        offset: 1500,
        width: 1200,
        height: 1200,
        sillHeight: 900,
      };

      const store = useProjectStore.getState();
      store.addWindow('f1', 'w1', win);

      let current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].windows.length).toBe(1);

      // Update window width
      store.updateWindow('f1', 'w1', 'win1', (w) => { w.width = 1500; });
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].windows[0].width).toBe(1500);

      // Delete window
      store.deleteWindow('f1', 'w1', 'win1');
      current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].windows.length).toBe(0);
    });

    it('updates wall endpoints when dragged', () => {
      const store = useProjectStore.getState();
      store.updateWallEndpoints('f1', 'w1', { x: 100, y: 100 }, { x: 3500, y: 100 });

      const current = useProjectStore.getState().currentProject!;
      expect(current.floors[0].walls[0].start).toEqual({ x: 100, y: 100 });
      expect(current.floors[0].walls[0].end).toEqual({ x: 3500, y: 100 });
    });
  });
});
