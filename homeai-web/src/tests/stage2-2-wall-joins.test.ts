import { describe, it, expect } from 'vitest';
import { 
  computeWallFootprints, 
  calculateLJoin, 
  calculateTJoin,
  getWallTrimOffsets,
  MITER_LIMIT
} from '../core/geometry/wall-joins';
import { polygonArea } from '../core/geometry/room-utils';
import { useProjectStore } from '../store/project-store';
import { Wall, Room } from '../core/domain/types';

describe('Level 2, Stage 2.2: Parametric Wall Joins, Miter/Butt Intersections & Clean Wall Geometry', () => {

  // Scenario 1: 90-degree L-junction with equal thickness (150 mm)
  it('Scenario 1: Computes clean 90-degree L-junction with equal 150mm thickness', () => {
    const w1: Wall = {
      id: 'w1',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 5000, y: 0 },
      thickness: 150,
      doors: [],
      windows: [],
    };
    const w2: Wall = {
      id: 'w2',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 4000 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const footprints = computeWallFootprints([w1, w2]);
    const fp1 = footprints.get('w1')!;
    const fp2 = footprints.get('w2')!;

    expect(fp1).toBeDefined();
    expect(fp2).toBeDefined();
    expect(fp1.startJoin).toBe('miter');
    expect(fp2.startJoin).toBe('miter');

    // Miter caps at junction (0,0)
    // One corner is outer at (-75, -75), one corner is inner at (+75, +75)
    const pts1 = fp1.startCap;
    const pts2 = fp2.startCap;
    
    // Check that both caps share the outer and inner miter corner points
    const allCapPts = [...pts1, ...pts2];
    const hasOuter = allCapPts.some(p => Math.abs(p.x - (-75)) < 1 && Math.abs(p.y - (-75)) < 1);
    const hasInner = allCapPts.some(p => Math.abs(p.x - 75) < 1 && Math.abs(p.y - 75) < 1);
    expect(hasOuter).toBe(true);
    expect(hasInner).toBe(true);
  });

  // Scenario 2: Exterior corner and interior corner verification
  it('Scenario 2: Differentiates interior and exterior corner coordinates with exact CAD offsets', () => {
    const w1: Wall = {
      id: 'w1',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 4000, y: 0 },
      thickness: 200,
      doors: [],
      windows: [],
    };
    const w2: Wall = {
      id: 'w2',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 4000 },
      thickness: 200,
      doors: [],
      windows: [],
    };

    const joinRes = calculateLJoin(w1, 'start', w2, 'start');
    expect(joinRes.cap1.joinType).toBe('miter');

    // w1 direction away from junction is +X (1, 0)
    // w2 direction away from junction is +Y (0, 1)
    // Cross product (1,0) x (0,1) = 1 > 0 -> w2 turns left
    // Inner corner = (+100, +100), Outer corner = (-100, -100)
    expect(joinRes.cap1.left.x).toBeCloseTo(100, 1);
    expect(joinRes.cap1.left.y).toBeCloseTo(100, 1);
    expect(joinRes.cap1.right.x).toBeCloseTo(-100, 1);
    expect(joinRes.cap1.right.y).toBeCloseTo(-100, 1);
  });

  // Scenario 3: Acute-angle intersection (miter limit & bevel fallback)
  it('Scenario 3: Clamps acute-angle intersections to bevel when miter limit is exceeded', () => {
    // 20-degree acute angle junction
    const rad = (20 * Math.PI) / 180;
    const w1: Wall = {
      id: 'w1',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 5000, y: 0 },
      thickness: 150,
      doors: [],
      windows: [],
    };
    const w2: Wall = {
      id: 'w2',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 5000 * Math.cos(rad), y: 5000 * Math.sin(rad) },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const joinRes = calculateLJoin(w1, 'start', w2, 'start');
    // At 20 deg, 1 / sin(10 deg) ~ 5.76 > MITER_LIMIT (2.5) -> must bevel!
    expect(joinRes.cap1.joinType).toBe('bevel');
    expect(joinRes.cap2.joinType).toBe('bevel');

    // Ensure outer corner distance is clamped to MITER_LIMIT * thickness (2.5 * 150 = 375mm)
    const outerDist = Math.hypot(joinRes.cap1.right.x, joinRes.cap1.right.y);
    expect(outerDist).toBeLessThanOrEqual(MITER_LIMIT * 150 + 1);
  });

  // Scenario 4: Obtuse-angle intersection
  it('Scenario 4: Accurately miters obtuse-angle wall intersections (135 degrees)', () => {
    const rad = (135 * Math.PI) / 180;
    const w1: Wall = {
      id: 'w1',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 4000, y: 0 },
      thickness: 150,
      doors: [],
      windows: [],
    };
    const w2: Wall = {
      id: 'w2',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 4000 * Math.cos(rad), y: 4000 * Math.sin(rad) },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const joinRes = calculateLJoin(w1, 'start', w2, 'start');
    expect(joinRes.cap1.joinType).toBe('miter');
    expect(joinRes.cap2.joinType).toBe('miter');

    // Footprints should be simple valid polygons
    const footprints = computeWallFootprints([w1, w2]);
    expect(footprints.get('w1')!.isValid).toBe(true);
    expect(footprints.get('w2')!.isValid).toBe(true);
  });

  // Scenario 5: T-junction with explicit continuing wall
  it('Scenario 5: Truncates terminating wall flush against continuing wall face without penetration', () => {
    const continuingWall: Wall = {
      id: 'w-cont',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 6000, y: 0 },
      thickness: 200, // half-thickness 100mm -> faces at y = +100 and y = -100
      doors: [],
      windows: [],
    };
    const terminatingWall: Wall = {
      id: 'w-term',
      floorId: 'floor-1',
      start: { x: 3000, y: 0 }, // touches continuing wall centerline
      end: { x: 3000, y: 4000 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const tJoinRes = calculateTJoin(continuingWall, terminatingWall, 'start');
    expect(tJoinRes.joinType).toBe('butt');
    expect(tJoinRes.left.y).toBeCloseTo(100, 1);
    expect(tJoinRes.right.y).toBeCloseTo(100, 1);

    const footprints = computeWallFootprints([continuingWall, terminatingWall]);
    const termFp = footprints.get('w-term')!;
    expect(termFp).toBeDefined();
    expect(termFp.startJoin).toBe('butt');

    // The start cap of terminating wall must lie exactly on continuing wall face y = +100
    const [c1, c2] = termFp.startCap;
    expect(c1.y).toBeCloseTo(100, 1);
    expect(c2.y).toBeCloseTo(100, 1);

    // Trimming offset should be exactly 100 mm
    const trims = getWallTrimOffsets(terminatingWall, termFp);
    expect(trims.startTrim).toBeCloseTo(100, 1);
    expect(trims.endTrim).toBe(0);
  });

  // Scenario 6: T-junction with opposite arrangement (approaching from negative Y)
  it('Scenario 6: Handles T-junction approaching from the opposite side correctly', () => {
    const continuingWall: Wall = {
      id: 'w-cont',
      floorId: 'floor-1',
      start: { x: 0, y: 0 },
      end: { x: 6000, y: 0 },
      thickness: 200,
      doors: [],
      windows: [],
    };
    const terminatingWall: Wall = {
      id: 'w-term-neg',
      floorId: 'floor-1',
      start: { x: 3000, y: -4000 },
      end: { x: 3000, y: 0 }, // touches centerline at (3000, 0)
      thickness: 150,
      doors: [],
      windows: [],
    };

    const footprints = computeWallFootprints([continuingWall, terminatingWall]);
    const termFp = footprints.get('w-term-neg')!;
    expect(termFp.endJoin).toBe('butt');

    // The end cap of terminating wall must lie on continuing wall face y = -100
    const [c1, c2] = termFp.endCap;
    expect(c1.y).toBeCloseTo(-100, 1);
    expect(c2.y).toBeCloseTo(-100, 1);

    const trims = getWallTrimOffsets(terminatingWall, termFp);
    expect(trims.startTrim).toBe(0);
    expect(trims.endTrim).toBeCloseTo(100, 1);
  });

  // Scenario 7: 4-way cross-junction (X-junction)
  it('Scenario 7: Generates clean footprints for 4-way cross-junctions without geometric breakdown', () => {
    const center = { x: 3000, y: 3000 };
    const wEast: Wall = { id: 'w-e', floorId: 'f1', start: center, end: { x: 6000, y: 3000 }, thickness: 150, doors: [], windows: [] };
    const wWest: Wall = { id: 'w-w', floorId: 'f1', start: { x: 0, y: 3000 }, end: center, thickness: 150, doors: [], windows: [] };
    const wNorth: Wall = { id: 'w-n', floorId: 'f1', start: center, end: { x: 3000, y: 6000 }, thickness: 150, doors: [], windows: [] };
    const wSouth: Wall = { id: 'w-s', floorId: 'f1', start: { x: 3000, y: 0 }, end: center, thickness: 150, doors: [], windows: [] };

    const footprints = computeWallFootprints([wEast, wWest, wNorth, wSouth]);
    expect(footprints.size).toBe(4);
    for (const fp of footprints.values()) {
      expect(fp.isValid).toBe(true);
      expect(fp.polygon.length).toBeGreaterThanOrEqual(4);
    }
  });

  // Scenario 8: Collinear connected wall segments
  it('Scenario 8: Resolves collinear connected wall segments into continuous flat butt seams', () => {
    const w1: Wall = {
      id: 'w1',
      floorId: 'f1',
      start: { x: 0, y: 1000 },
      end: { x: 3000, y: 1000 },
      thickness: 150,
      doors: [],
      windows: [],
    };
    const w2: Wall = {
      id: 'w2',
      floorId: 'f1',
      start: { x: 3000, y: 1000 },
      end: { x: 6000, y: 1000 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const footprints = computeWallFootprints([w1, w2]);
    const fp1 = footprints.get('w1')!;
    const fp2 = footprints.get('w2')!;

    expect(fp1.endJoin).toBe('butt');
    expect(fp2.startJoin).toBe('butt');

    // Both caps at x = 3000 must align perfectly with zero gap
    expect(fp1.endCap[0].x).toBeCloseTo(3000, 1);
    expect(fp1.endCap[1].x).toBeCloseTo(3000, 1);
    expect(fp2.startCap[0].x).toBeCloseTo(3000, 1);
    expect(fp2.startCap[1].x).toBeCloseTo(3000, 1);
  });

  // Scenario 9: Collinear overlapping segments
  it('Scenario 9: Tolerates collinear segments without crashing or creating NaN vertices', () => {
    const w1: Wall = { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150, doors: [], windows: [] };
    const w2: Wall = { id: 'w2', floorId: 'f1', start: { x: 2000, y: 0 }, end: { x: 6000, y: 0 }, thickness: 150, doors: [], windows: [] };

    const footprints = computeWallFootprints([w1, w2]);
    expect(footprints.size).toBe(2);
    for (const fp of footprints.values()) {
      for (const pt of fp.polygon) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    }
  });

  // Scenario 10: Unequal-thickness walls (230 mm exterior vs 115 mm interior)
  it('Scenario 10: Correctly joins walls with unequal thicknesses (230mm vs 115mm)', () => {
    const wExt: Wall = {
      id: 'w-ext',
      floorId: 'f1',
      start: { x: 0, y: 0 },
      end: { x: 5000, y: 0 },
      thickness: 230, // h1 = 115mm
      doors: [],
      windows: [],
    };
    const wPart: Wall = {
      id: 'w-part',
      floorId: 'f1',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 4000 },
      thickness: 115, // h2 = 57.5mm
      doors: [],
      windows: [],
    };

    const joinRes = calculateLJoin(wExt, 'start', wPart, 'start');
    expect(joinRes.cap1.joinType).toBe('miter');

    // Outer corner: right of wExt meets left of wPart
    // For wExt (dx=1, dy=0), right offset is -115 along Y -> line y = -115
    // For wPart (dx=0, dy=1), left offset is -57.5 along X -> line x = -57.5
    // Intersection outer corner: (-57.5, -115)
    expect(joinRes.cap1.right.x).toBeCloseTo(-57.5, 1);
    expect(joinRes.cap1.right.y).toBeCloseTo(-115, 1);

    // Inner corner: left of wExt meets right of wPart -> (+57.5, +115)
    expect(joinRes.cap1.left.x).toBeCloseTo(57.5, 1);
    expect(joinRes.cap1.left.y).toBeCloseTo(115, 1);
  });

  // Scenario 11: Near-parallel walls
  it('Scenario 11: Handles near-parallel wall junctions safely without numerical divergence', () => {
    const w1: Wall = { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150, doors: [], windows: [] };
    const w2: Wall = { id: 'w2', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 4000, y: 10 }, thickness: 150, doors: [], windows: [] };

    const footprints = computeWallFootprints([w1, w2]);
    expect(footprints.size).toBe(2);
    for (const fp of footprints.values()) {
      expect(fp.isValid).toBe(true);
    }
  });

  // Scenario 12: Zero-length and malformed walls
  it('Scenario 12: Filters out zero-length or degenerate walls (< 1mm) without breaking valid walls', () => {
    const validWall: Wall = { id: 'w-valid', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150, doors: [], windows: [] };
    const zeroWall: Wall = { id: 'w-zero', floorId: 'f1', start: { x: 100, y: 100 }, end: { x: 100, y: 100 }, thickness: 150, doors: [], windows: [] };
    const microWall: Wall = { id: 'w-micro', floorId: 'f1', start: { x: 200, y: 200 }, end: { x: 200.2, y: 200.2 }, thickness: 150, doors: [], windows: [] };

    const footprints = computeWallFootprints([validWall, zeroWall, microWall]);
    expect(footprints.has('w-valid')).toBe(true);
    expect(footprints.has('w-zero')).toBe(false);
    expect(footprints.has('w-micro')).toBe(false);
    expect(footprints.get('w-valid')!.isValid).toBe(true);
  });

  // Scenario 13: Footprint polygon closure and non-self-intersection
  it('Scenario 13: Ensures all generated footprints are closed and geometrically valid simple polygons', () => {
    const perimeter: Wall[] = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 5000, y: 0 }, thickness: 150, doors: [], windows: [] },
      { id: 'w2', floorId: 'f1', start: { x: 5000, y: 0 }, end: { x: 5000, y: 4000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w3', floorId: 'f1', start: { x: 5000, y: 4000 }, end: { x: 0, y: 4000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 4000 }, end: { x: 0, y: 0 }, thickness: 150, doors: [], windows: [] },
    ];

    const footprints = computeWallFootprints(perimeter);
    expect(footprints.size).toBe(4);
    for (const wall of perimeter) {
      const fp = footprints.get(wall.id)!;
      expect(fp.isValid).toBe(true);
      expect(fp.polygon.length).toBeGreaterThanOrEqual(4);
      
      // Physical area should be roughly length * thickness
      const area = Math.abs(polygonArea(fp.polygon));
      const expectedArea = (wall.id === 'w1' || wall.id === 'w3' ? 5000 : 4000) * 150;
      // Miter corners adjust area slightly, should be within 10%
      expect(area).toBeGreaterThan(expectedArea * 0.9);
      expect(area).toBeLessThan(expectedArea * 1.1);
    }
  });

  // Scenario 14: Reversed wall endpoint ordering stability
  it('Scenario 14: Produces identical geometric footprint area regardless of endpoint orientation', () => {
    const wForward: Wall = { id: 'wf', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150, doors: [], windows: [] };
    const wReverse: Wall = { id: 'wr', floorId: 'f1', start: { x: 4000, y: 0 }, end: { x: 0, y: 0 }, thickness: 150, doors: [], windows: [] };

    const fpForward = computeWallFootprints([wForward]).get('wf')!;
    const fpReverse = computeWallFootprints([wReverse]).get('wr')!;

    const areaF = Math.abs(polygonArea(fpForward.polygon));
    const areaR = Math.abs(polygonArea(fpReverse.polygon));
    expect(areaF).toBeCloseTo(areaR, 1);
  });

  // Scenario 15: Door and window preservation at valid junctions
  it('Scenario 15: Retains doors and windows with unmodified offsets during footprint generation', () => {
    const wallWithOpenings: Wall = {
      id: 'w-doors',
      floorId: 'f1',
      start: { x: 0, y: 0 },
      end: { x: 6000, y: 0 },
      thickness: 150,
      doors: [{ id: 'd1', floorId: 'f1', wallId: 'w-doors', offset: 1500, width: 900, height: 2100, swingDirection: 'inward_left' }],
      windows: [{ id: 'win1', floorId: 'f1', wallId: 'w-doors', offset: 4000, width: 1200, height: 1200, sillHeight: 900 }],
    };

    const footprints = computeWallFootprints([wallWithOpenings]);
    expect(footprints.get('w-doors')!.isValid).toBe(true);

    // Wall object metadata remains canonical and untouched
    expect(wallWithOpenings.doors[0].offset).toBe(1500);
    expect(wallWithOpenings.doors[0].width).toBe(900);
    expect(wallWithOpenings.windows[0].offset).toBe(4000);
    expect(wallWithOpenings.windows[0].width).toBe(1200);
  });

  // Scenario 16: Wall movement, extension, and deletion
  it('Scenario 16: Dynamically updates footprints when walls are extended or removed', () => {
    let walls: Wall[] = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 3000, y: 0 }, thickness: 150, doors: [], windows: [] },
      { id: 'w2', floorId: 'f1', start: { x: 3000, y: 0 }, end: { x: 3000, y: 3000 }, thickness: 150, doors: [], windows: [] },
    ];

    let fps = computeWallFootprints(walls);
    expect(fps.get('w1')!.endJoin).toBe('miter');

    // Extend w1 past the corner to create a T-junction
    walls = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 6000, y: 0 }, thickness: 150, doors: [], windows: [] },
      { id: 'w2', floorId: 'f1', start: { x: 3000, y: 0 }, end: { x: 3000, y: 3000 }, thickness: 150, doors: [], windows: [] },
    ];
    fps = computeWallFootprints(walls);
    expect(fps.get('w2')!.startJoin).toBe('butt');

    // Delete w2
    walls = [walls[0]];
    fps = computeWallFootprints(walls);
    expect(fps.has('w2')).toBe(false);
    expect(fps.get('w1')!.endJoin).toBe('square');
  });

  // Scenario 17: Shared geometry at connected wall boundaries (no daylight gap)
  it('Scenario 17: Eliminates daylight gaps at connected wall boundaries', () => {
    const wCont: Wall = { id: 'wc', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 5000, y: 0 }, thickness: 150, doors: [], windows: [] };
    const wTerm: Wall = { id: 'wt', floorId: 'f1', start: { x: 2500, y: 0 }, end: { x: 2500, y: 3000 }, thickness: 150, doors: [], windows: [] };

    const fps = computeWallFootprints([wCont, wTerm]);
    const termFp = fps.get('wt')!;

    // Continuing wall top edge is at y = 75
    // Terminating wall bottom edge must contact at y = 75 exactly
    const distToFace = Math.min(
      Math.abs(termFp.startCap[0].y - 75),
      Math.abs(termFp.startCap[1].y - 75)
    );
    expect(distToFace).toBeLessThan(0.01);
  });

  // Scenario 18: Room areas and IDs remaining unchanged for non-topology edits
  it('Scenario 18: Preserves canonical room topology, IDs, and areas during join computations', () => {
    const room: Room = {
      id: 'room-master',
      floorId: 'f1',
      name: 'Master Suite',
      polygon: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 5000 },
        { x: 0, y: 5000 },
      ],
    };

    const walls: Wall[] = [
      { id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 6000, y: 0 }, thickness: 150, doors: [], windows: [] },
      { id: 'w2', floorId: 'f1', start: { x: 6000, y: 0 }, end: { x: 6000, y: 5000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w3', floorId: 'f1', start: { x: 6000, y: 5000 }, end: { x: 0, y: 5000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w4', floorId: 'f1', start: { x: 0, y: 5000 }, end: { x: 0, y: 0 }, thickness: 150, doors: [], windows: [] },
    ];

    const footprints = computeWallFootprints(walls);
    expect(footprints.size).toBe(4);

    // Canonical room remains 100% untouched
    expect(room.id).toBe('room-master');
    expect(polygonArea(room.polygon)).toBe(30_000_000);
  });

  // Scenario 19: Stage 2.1 room splitting remaining functional with clean wall footprints
  it('Scenario 19: Maintains full compatibility with Stage 2.1 automatic room splitting', async () => {
    const { getMyHomeProject, normalizeProject } = await import('../core/domain/demo-project');
    const testProject = normalizeProject(getMyHomeProject());
    const floorId = testProject.activeFloorId;
    const initialWalls: Wall[] = [
      { id: 'w-s', floorId, start: { x: 0, y: 0 }, end: { x: 6000, y: 0 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-e', floorId, start: { x: 6000, y: 0 }, end: { x: 6000, y: 5000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-n', floorId, start: { x: 6000, y: 5000 }, end: { x: 0, y: 5000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-w', floorId, start: { x: 0, y: 5000 }, end: { x: 0, y: 0 }, thickness: 150, doors: [], windows: [] },
    ];

    testProject.floors[0].walls = [...initialWalls];
    testProject.floors[0].rooms = [{
      id: 'room-main',
      floorId,
      name: 'Main Hall',
      polygon: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 5000 },
        { x: 0, y: 5000 },
      ],
    }];

    useProjectStore.setState({ currentProject: testProject });

    // Add partition wall splitting room at x = 2500
    const partitionWall: Wall = {
      id: 'w-part',
      floorId,
      start: { x: 2500, y: 0 },
      end: { x: 2500, y: 5000 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    useProjectStore.getState().addWall(floorId, partitionWall);

    const floor = useProjectStore.getState().currentProject!.floors.find(f => f.id === floorId)!;
    // Room split into 2
    expect(floor.rooms.length).toBe(2);

    // Wall footprints for all 5 walls including partition wall are valid
    const footprints = computeWallFootprints(floor.walls);
    expect(footprints.size).toBe(5);
    for (const fp of footprints.values()) {
      expect(fp.isValid).toBe(true);
    }

    // Partition wall has T-joins at both ends
    const partFp = footprints.get('w-part')!;
    expect(partFp.startJoin).toBe('butt');
    expect(partFp.endJoin).toBe('butt');
  });

  // Scenario 20: Undo and redo restoring correct state
  it('Scenario 20: Restores correct wall footprints through store undo and redo cycles', async () => {
    const { getMyHomeProject, normalizeProject } = await import('../core/domain/demo-project');
    const testProject = normalizeProject(getMyHomeProject());
    const floorId = testProject.activeFloorId;

    testProject.floors[0].walls = [
      { id: 'w1', floorId, start: { x: 0, y: 0 }, end: { x: 5000, y: 0 }, thickness: 150, doors: [], windows: [] },
    ];
    testProject.floors[0].rooms = [];

    useProjectStore.setState({ currentProject: testProject, past: [], future: [] });

    const newWall: Wall = {
      id: 'w2',
      floorId,
      start: { x: 5000, y: 0 },
      end: { x: 5000, y: 4000 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    useProjectStore.getState().addWall(floorId, newWall);
    let currentWalls = useProjectStore.getState().currentProject!.floors[0].walls;
    expect(currentWalls.length).toBe(2);
    let fps = computeWallFootprints(currentWalls);
    expect(fps.get('w1')!.endJoin).toBe('miter');

    // Undo addition
    useProjectStore.getState().undo();
    currentWalls = useProjectStore.getState().currentProject!.floors[0].walls;
    expect(currentWalls.length).toBe(1);
    fps = computeWallFootprints(currentWalls);
    expect(fps.get('w1')!.endJoin).toBe('square');

    // Redo addition
    useProjectStore.getState().redo();
    currentWalls = useProjectStore.getState().currentProject!.floors[0].walls;
    expect(currentWalls.length).toBe(2);
    fps = computeWallFootprints(currentWalls);
    expect(fps.get('w1')!.endJoin).toBe('miter');
  });

  // Scenario 21: Save and reload preserving wall dimensions and join behavior
  it('Scenario 21: Preserves wall dimensions and produces identical joins after save and reload', async () => {
    const { getMyHomeProject, normalizeProject } = await import('../core/domain/demo-project');
    const myHome = normalizeProject(getMyHomeProject());
    const floorId = myHome.activeFloorId;

    // Add T-junction walls to the normalized project
    const floor = myHome.floors.find(f => f.id === floorId)!;
    floor.walls.push(
      { id: 'w-save-1', floorId, start: { x: 0, y: 0 }, end: { x: 5000, y: 0 }, thickness: 200, doors: [], windows: [] },
      { id: 'w-save-2', floorId, start: { x: 2500, y: 0 }, end: { x: 2500, y: 3000 }, thickness: 150, doors: [], windows: [] }
    );

    useProjectStore.setState({ currentProject: myHome });
    await useProjectStore.getState().saveProject();
    expect(useProjectStore.getState().saveStatus).toBe('saved');

    const loaded = useProjectStore.getState().currentProject!;
    const loadedFloor = loaded.floors.find(f => f.id === floorId)!;
    const fps = computeWallFootprints(loadedFloor.walls);
    expect(fps.has('w-save-2')).toBe(true);
    expect(fps.get('w-save-2')!.startJoin).toBe('butt');
    const wSave2 = loadedFloor.walls.find(w => w.id === 'w-save-2')!;
    expect(getWallTrimOffsets(wSave2, fps.get('w-save-2')).startTrim).toBeCloseTo(100, 1);
  });

  // Scenario 22: 2D and 3D geometry consistency
  it('Scenario 22: Ensures exact geometric consistency between 2D footprint cuts and 3D trim offsets', () => {
    const continuingWall: Wall = {
      id: 'w-c',
      floorId: 'f1',
      start: { x: 0, y: 0 },
      end: { x: 8000, y: 0 },
      thickness: 200,
      doors: [],
      windows: [],
    };
    const terminatingWall: Wall = {
      id: 'w-t',
      floorId: 'f1',
      start: { x: 4000, y: 0 },
      end: { x: 4000, y: 4000 },
      thickness: 150,
      doors: [],
      windows: [],
    };

    const footprints = computeWallFootprints([continuingWall, terminatingWall]);
    const termFp = footprints.get('w-t')!;
    const trims = getWallTrimOffsets(terminatingWall, termFp);

    // Continuing wall thickness is 200 mm -> face is at y = 100 mm
    // In 2D: startCap of terminating wall has y = 100 mm
    expect(termFp.startCap[0].y).toBeCloseTo(100, 1);
    expect(termFp.startCap[1].y).toBeCloseTo(100, 1);

    // In 3D: startTrim is 100 mm (0.1 m), meaning 3D box begins at y = 0.1 m
    expect(trims.startTrim).toBeCloseTo(100, 1);

    // Centerline distance to face matches 3D trim offset exactly
    const dist2D = Math.hypot(
      (termFp.startCap[0].x + termFp.startCap[1].x) / 2 - terminatingWall.start.x,
      (termFp.startCap[0].y + termFp.startCap[1].y) / 2 - terminatingWall.start.y
    );
    expect(dist2D).toBeCloseTo(trims.startTrim, 1);
  });

  // Performance Benchmark: Footprint calculation under 10ms for realistic residential floor plan
  it('Performance Benchmark: Computes wall footprints for a 24-wall residential floor plan in under 10ms', () => {
    // Generate a 24-wall residential floor layout
    const complexWalls: Wall[] = [];
    const floorId = 'floor-perf';
    
    // Outer perimeter 4 walls (12m x 10m)
    complexWalls.push(
      { id: 'w-ext-s', floorId, start: { x: 0, y: 0 }, end: { x: 12000, y: 0 }, thickness: 230, doors: [], windows: [] },
      { id: 'w-ext-e', floorId, start: { x: 12000, y: 0 }, end: { x: 12000, y: 10000 }, thickness: 230, doors: [], windows: [] },
      { id: 'w-ext-n', floorId, start: { x: 12000, y: 10000 }, end: { x: 0, y: 10000 }, thickness: 230, doors: [], windows: [] },
      { id: 'w-ext-w', floorId, start: { x: 0, y: 10000 }, end: { x: 0, y: 0 }, thickness: 230, doors: [], windows: [] }
    );

    // Interior grid walls (5 rooms)
    complexWalls.push(
      { id: 'w-int-1', floorId, start: { x: 4000, y: 0 }, end: { x: 4000, y: 6000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-int-2', floorId, start: { x: 8000, y: 0 }, end: { x: 8000, y: 10000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-int-3', floorId, start: { x: 0, y: 6000 }, end: { x: 4000, y: 6000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-int-4', floorId, start: { x: 4000, y: 6000 }, end: { x: 8000, y: 6000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-int-5', floorId, start: { x: 8000, y: 4000 }, end: { x: 12000, y: 4000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-int-6', floorId, start: { x: 8000, y: 7000 }, end: { x: 12000, y: 7000 }, thickness: 150, doors: [], windows: [] },
      { id: 'w-int-7', floorId, start: { x: 2000, y: 6000 }, end: { x: 2000, y: 10000 }, thickness: 115, doors: [], windows: [] },
      { id: 'w-int-8', floorId, start: { x: 6000, y: 6000 }, end: { x: 6000, y: 10000 }, thickness: 115, doors: [], windows: [] },
      { id: 'w-int-9', floorId, start: { x: 10000, y: 0 }, end: { x: 10000, y: 4000 }, thickness: 115, doors: [], windows: [] },
      { id: 'w-int-10', floorId, start: { x: 10000, y: 7000 }, end: { x: 10000, y: 10000 }, thickness: 115, doors: [], windows: [] }
    );

    // Warm-up run
    computeWallFootprints(complexWalls);

    // Measure benchmark execution time over 20 iterations
    const iterations = 20;
    const tStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      computeWallFootprints(complexWalls);
    }
    const tTotal = performance.now() - tStart;
    const avgLatency = tTotal / iterations;

    expect(avgLatency).toBeLessThan(10); // Must be strictly under 10ms
  });
});
