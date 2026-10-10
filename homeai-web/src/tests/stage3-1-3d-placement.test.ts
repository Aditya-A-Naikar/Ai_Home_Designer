import { describe, it, expect, beforeEach } from "vitest";
import {
  isWallOrientedProp,
  threeWorldToProjectMm,
  projectMmToThreeWorld,
  getPropFootprintPolygon,
  normalizeAngleDegrees,
  findNearestWallSnap,
  checkPropCollisions,
  calculate3DPlacement,
} from "@/core/geometry/placement-3d";
import { Floor, Project, Wall, Room, Door, Prop } from "@/core/domain/types";
import { useProjectStore } from "@/store/project-store";
import { PROP_PRESETS } from "@/core/ai/spatial-planner";

describe("Level 3, Stage 3.1: Direct 3D Furniture Placement, Surface Snapping and Intelligent Wall Alignment", () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProject: null,
      past: [],
      future: [],
    });
  });

  // Helper: Standard 5m x 4m room surrounded by 4 walls
  // North wall: (0, 0) -> (5000, 0)
  // East wall: (5000, 0) -> (5000, 4000)
  // South wall: (5000, 4000) -> (0, 4000)
  // West wall: (0, 4000) -> (0, 0)
  function createStandardRoomSetup() {
    const doorSouth: Door = {
      id: "door-south",
      wallId: "wall-south",
      floorId: "floor-1",
      offset: 2500, // midpoint of south wall
      width: 900,
      height: 2100,
      swingDirection: "inward_left",
    };

    const walls: Wall[] = [
      {
        id: "wall-north",
        floorId: "floor-1",
        start: { x: 0, y: 0 },
        end: { x: 5000, y: 0 },
        thickness: 200,
        height: 2800,
        wallType: "exterior_bearing",
        doors: [],
        windows: [],
      },
      {
        id: "wall-east",
        floorId: "floor-1",
        start: { x: 5000, y: 0 },
        end: { x: 5000, y: 4000 },
        thickness: 200,
        height: 2800,
        wallType: "exterior_bearing",
        doors: [],
        windows: [],
      },
      {
        id: "wall-south",
        floorId: "floor-1",
        start: { x: 5000, y: 4000 },
        end: { x: 0, y: 4000 },
        thickness: 200,
        height: 2800,
        wallType: "exterior_bearing",
        doors: [doorSouth],
        windows: [],
      },
      {
        id: "wall-west",
        floorId: "floor-1",
        start: { x: 0, y: 4000 },
        end: { x: 0, y: 0 },
        thickness: 200,
        height: 2800,
        wallType: "exterior_bearing",
        doors: [],
        windows: [],
      },
    ];

    const rooms: Room[] = [
      {
        id: "room-living",
        floorId: "floor-1",
        name: "Living Room",
        polygon: [
          { x: 0, y: 0 },
          { x: 5000, y: 0 },
          { x: 5000, y: 4000 },
          { x: 0, y: 4000 },
        ],
      },
    ];

    const doors: Door[] = [doorSouth];

    return { walls, rooms, doors };
  }

  // Helper: Create a single-floor project for store tests
  function createTestProject(): Project {
    const { walls, rooms } = createStandardRoomSetup();
    const floor: Floor = {
      id: "floor-1",
      projectId: "proj-1",
      level: 0,
      name: "Ground Floor",
      elevation: 0,
      height: 2800,
      walls,
      rooms,
      props: [],
    };

    return {
      schemaVersion: 1,
      id: "proj-1",
      name: "3D Placement Test Project",
      plotDimensions: { width: 10000, depth: 10000 },
      settings: {
        preferredUnit: "mm",
        unitSystem: "metric",
        gridSize: 100,
        snapTolerance: 10,
        defaultWallThickness: 150,
        defaultCeilingHeight: 2800,
      },
      preferences: {
        style: "modern",
        priorities: [],
        constraints: [],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      activeFloorId: "floor-1",
      floors: [floor],
    };
  }

  // -------------------------------------------------------------
  // 1. Coordinate Conversion & Round-Trip Invariance
  // -------------------------------------------------------------
  describe("1. Coordinate Systems & Math Conversion", () => {
    it("converts Three.js world meters to canonical project millimeters", () => {
      const worldPos = { x: 2.5, y: 0, z: 1.8 };
      const centerOffset = { x: 1.0, z: 0.5 };

      const projectMm = threeWorldToProjectMm(worldPos, centerOffset);
      expect(projectMm.x).toBe(3500); // (2.5 + 1.0) * 1000
      expect(projectMm.y).toBe(2300); // (1.8 + 0.5) * 1000
    });

    it("converts canonical project millimeters to Three.js world coordinates", () => {
      const projectMm = { x: 3500, y: 2300 };
      const centerOffset = { x: 1.0, z: 0.5 };

      const worldPos = projectMmToThreeWorld(projectMm, centerOffset);
      expect(worldPos.x).toBeCloseTo(2.5, 5);
      expect(worldPos.z).toBeCloseTo(1.8, 5);
    });

    it("guarantees round-trip coordinate invariance between world meters and project millimeters", () => {
      const originalMm = { x: 4250, y: 1750 };
      const centerOffset = { x: 2.2, z: 1.1 };

      const world = projectMmToThreeWorld(originalMm, centerOffset);
      const convertedBack = threeWorldToProjectMm(world, centerOffset);

      expect(convertedBack.x).toBe(originalMm.x);
      expect(convertedBack.y).toBe(originalMm.y);
    });

    it("normalizes arbitrary angles to [0, 360) range", () => {
      expect(normalizeAngleDegrees(0)).toBe(0);
      expect(normalizeAngleDegrees(90)).toBe(90);
      expect(normalizeAngleDegrees(360)).toBe(0);
      expect(normalizeAngleDegrees(450)).toBe(90);
      expect(normalizeAngleDegrees(-90)).toBe(270);
      expect(normalizeAngleDegrees(-45)).toBe(315);
    });
  });

  // -------------------------------------------------------------
  // 2. Wall-Oriented vs Freestanding Typology Detection
  // -------------------------------------------------------------
  describe("2. Typology Classification", () => {
    it("identifies architectural wall-oriented props (sofa, bed, tv, wardrobe, desk, counter, sink)", () => {
      expect(isWallOrientedProp("living", "sofa")).toBe(true);
      expect(isWallOrientedProp("bedroom", "bed")).toBe(true);
      expect(isWallOrientedProp("living", "tv")).toBe(true);
      expect(isWallOrientedProp("bedroom", "wardrobe")).toBe(true);
      expect(isWallOrientedProp("office", "desk")).toBe(true);
      expect(isWallOrientedProp("kitchen", "counter_straight")).toBe(true);
      expect(isWallOrientedProp("bathroom", "sink")).toBe(true);
      expect(isWallOrientedProp("bathroom", "toilet")).toBe(true);
      expect(isWallOrientedProp("bathroom", "bathtub")).toBe(true);
    });

    it("identifies freestanding props (dining table, coffee table, plant, rugs)", () => {
      expect(isWallOrientedProp("dining", "dining_table")).toBe(false);
      expect(isWallOrientedProp("living", "coffee_table")).toBe(false);
      expect(isWallOrientedProp("decor", "plant")).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 3. Prop Footprint Polygon
  // -------------------------------------------------------------
  describe("3. Footprint Polygon Computation", () => {
    it("computes unrotated 4-corner footprint rectangle", () => {
      const center = { x: 2000, y: 1500 };
      const dims = { width: 1000, depth: 600 };
      const polygon = getPropFootprintPolygon(center, dims, 0);

      expect(polygon).toHaveLength(4);
      // Top-left (back-left): (2000 - 500, 1500 - 300) = (1500, 1200)
      expect(polygon[0]).toEqual({ x: 1500, y: 1200 });
      // Top-right (back-right): (2000 + 500, 1500 - 300) = (2500, 1200)
      expect(polygon[1]).toEqual({ x: 2500, y: 1200 });
      // Bottom-right (front-right): (2000 + 500, 1500 + 300) = (2500, 1800)
      expect(polygon[2]).toEqual({ x: 2500, y: 1800 });
      // Bottom-left (front-left): (2000 - 500, 1500 + 300) = (1500, 1800)
      expect(polygon[3]).toEqual({ x: 1500, y: 1800 });
    });

    it("computes 90-degree rotated footprint corners correctly", () => {
      const center = { x: 2000, y: 1500 };
      const dims = { width: 1000, depth: 600 };
      const polygon = getPropFootprintPolygon(center, dims, 90);

      expect(polygon).toHaveLength(4);
      // At 90 deg rotation, width aligns along Y and depth along X
      const minX = Math.min(...polygon.map((p) => p.x));
      const maxX = Math.max(...polygon.map((p) => p.x));
      const minY = Math.min(...polygon.map((p) => p.y));
      const maxY = Math.max(...polygon.map((p) => p.y));

      expect(maxX - minX).toBeCloseTo(600, 0);
      expect(maxY - minY).toBeCloseTo(1000, 0);
    });
  });

  // -------------------------------------------------------------
  // 4. Intelligent Magnetic Wall Snapping & Inward Alignment
  // -------------------------------------------------------------
  describe("4. Intelligent Magnetic Wall Snapping & Alignment", () => {
    it("snaps sofa flush to North wall with front facing into the room (+Y)", () => {
      const { walls } = createStandardRoomSetup();
      // Sofa: width 2000, depth 900
      // North wall: Y=0, thickness 200. Room is in +Y direction.
      // Cursor near North wall: (2500, 200)
      const dims = { width: 2000, depth: 900 };
      const cursor = { x: 2500, y: 200 };

      const snap = findNearestWallSnap(cursor, dims, walls, { snapToleranceMm: 350, wallClearanceMm: 10 });
      expect(snap).toBeDefined();
      if (!snap) return;

      expect(snap.wall.id).toBe("wall-north");
      // Inward normal should point down (+Y) into the room
      expect(snap.normalVector.x).toBeCloseTo(0, 2);
      expect(snap.normalVector.y).toBeCloseTo(1, 2);

      // Rotation should be 0 deg so front faces +Y
      expect(snap.snappedRotationDeg).toBe(0);

      // Snapped position offset: Wall Y (0) + half-thickness (100) + half-depth (450) + clearance (10) = 560
      expect(snap.snappedPositionMm.x).toBe(2500);
      expect(snap.snappedPositionMm.y).toBe(560);
    });

    it("snaps sofa flush to South wall with front facing into the room (-Y)", () => {
      const { walls } = createStandardRoomSetup();
      // South wall: Y=4000, thickness 200. Room is in -Y direction.
      // Cursor near South wall: (2500, 3850)
      const dims = { width: 2000, depth: 900 };
      const cursor = { x: 2500, y: 3850 };

      const snap = findNearestWallSnap(cursor, dims, walls, { snapToleranceMm: 350, wallClearanceMm: 10 });
      expect(snap).toBeDefined();
      if (!snap) return;

      expect(snap.wall.id).toBe("wall-south");
      // Inward normal points up (-Y) into room
      expect(snap.normalVector.x).toBeCloseTo(0, 2);
      expect(snap.normalVector.y).toBeCloseTo(-1, 2);

      // Rotation should be 180 deg so front faces -Y
      expect(snap.snappedRotationDeg).toBe(180);

      // Snapped position offset: Wall Y (4000) - half-thickness (100) - half-depth (450) - clearance (10) = 3440
      expect(snap.snappedPositionMm.x).toBe(2500);
      expect(snap.snappedPositionMm.y).toBe(3440);
    });

    it("snaps bed flush to West wall with front facing East into the room (+X)", () => {
      const { walls } = createStandardRoomSetup();
      // West wall: X=0, thickness 200. Room is in +X direction.
      // Bed: width 1800, depth 2000. Cursor at (150, 2000)
      const dims = { width: 1800, depth: 2000 };
      const cursor = { x: 150, y: 2000 };

      const snap = findNearestWallSnap(cursor, dims, walls, { snapToleranceMm: 350, wallClearanceMm: 10 });
      expect(snap).toBeDefined();
      if (!snap) return;

      expect(snap.wall.id).toBe("wall-west");
      // Normal points right (+X)
      expect(snap.normalVector.x).toBeCloseTo(1, 2);
      expect(snap.normalVector.y).toBeCloseTo(0, 2);

      // Rotation should be 270 deg so front points East (+X)
      expect(snap.snappedRotationDeg).toBe(270);

      // Snapped X: Wall X (0) + half-thickness (100) + half-depth (1000) + clearance (10) = 1110
      expect(snap.snappedPositionMm.x).toBe(1110);
      expect(snap.snappedPositionMm.y).toBe(2000);
    });

    it("snaps wardrobe flush to East wall with front facing West into the room (-X)", () => {
      const { walls } = createStandardRoomSetup();
      // East wall: X=5000, thickness 200. Room is in -X direction.
      // Wardrobe: width 1600, depth 600. Cursor at (4850, 2000)
      const dims = { width: 1600, depth: 600 };
      const cursor = { x: 4850, y: 2000 };

      const snap = findNearestWallSnap(cursor, dims, walls, { snapToleranceMm: 350, wallClearanceMm: 10 });
      expect(snap).toBeDefined();
      if (!snap) return;

      expect(snap.wall.id).toBe("wall-east");
      // Normal points left (-X)
      expect(snap.normalVector.x).toBeCloseTo(-1, 2);
      expect(snap.normalVector.y).toBeCloseTo(0, 2);

      // Rotation should be 90 deg so front points West (-X)
      expect(snap.snappedRotationDeg).toBe(90);

      // Snapped X: Wall X (5000) - half-thickness (100) - half-depth (300) - clearance (10) = 4590
      expect(snap.snappedPositionMm.x).toBe(4590);
      expect(snap.snappedPositionMm.y).toBe(2000);
    });

    it("clamps position along wall segment to prevent corner overhang", () => {
      const { walls } = createStandardRoomSetup();
      // North wall: from X=0 to X=5000.
      // Sofa width 2000 (half-width 1000). Cursor placed at extreme corner X=300
      const dims = { width: 2000, depth: 900 };
      const cursor = { x: 300, y: 200 };

      const snap = findNearestWallSnap(cursor, dims, walls, { snapToleranceMm: 350, wallClearanceMm: 10 });
      expect(snap).toBeDefined();
      if (!snap) return;

      // Position should be clamped to at least halfWidth + clearance (1000 + 10 = 1010)
      expect(snap.snappedPositionMm.x).toBeGreaterThanOrEqual(1010);
    });

    it("does not snap when cursor is beyond snapToleranceMm", () => {
      const { walls } = createStandardRoomSetup();
      // Cursor in center of room: (2500, 2000). Distance to nearest wall is 2000mm >> 350mm
      const dims = { width: 2000, depth: 900 };
      const cursor = { x: 2500, y: 2000 };

      const snap = findNearestWallSnap(cursor, dims, walls, { snapToleranceMm: 350 });
      expect(snap).toBeNull();
    });

    it("snaps correctly to angled 45-degree diagonal walls", () => {
      // 45 deg wall: (0, 0) -> (4000, 4000)
      const diagonalWall: Wall = {
        id: "wall-diag",
        floorId: "floor-1",
        start: { x: 0, y: 0 },
        end: { x: 4000, y: 4000 },
        thickness: 200,
        height: 2800,
        wallType: "exterior_bearing",
        doors: [],
        windows: [],
      };

      const dims = { width: 1000, depth: 500 };
      // Point close to midpoint (2000, 2000), shifted perpendicular:
      // Wall vector is (1, 1). Perpendicular is (-1, 1) / sqrt(2).
      const cursor = { x: 1850, y: 2150 };

      const snap = findNearestWallSnap(cursor, dims, [diagonalWall], { snapToleranceMm: 400 });
      expect(snap).toBeDefined();
      if (!snap) return;

      expect(snap.wall.id).toBe("wall-diag");
      // Wall angle is 45 deg, snapped rotation should be aligned
      expect([45, 135, 225, 315]).toContain(snap.snappedRotationDeg);
    });
  });

  // -------------------------------------------------------------
  // 5. Freestanding Item Placement & Grid Snapping
  // -------------------------------------------------------------
  describe("5. Freestanding Items & Grid Snapping", () => {
    it("places dining table at exact cursor position without magnetic wall snapping", () => {
      const { walls, rooms } = createStandardRoomSetup();
      const diningPreset = PROP_PRESETS["dining-table-6"] || {
        name: "6-Seater Dining Table",
        category: "dining",
        propType: "dining_table",
        dimensions: { width: 1600, depth: 900, height: 750 },
        defaultColor: "#475569",
        shape: "rectangular",
      };

      const cursor = { x: 2200, y: 1800 };
      const placement = calculate3DPlacement(
        cursor,
        {
          category: diningPreset.category,
          propType: diningPreset.propType,
          dimensions: diningPreset.dimensions,
        },
        walls,
        rooms,
        { manualRotationDeg: 45 }
      );

      expect(placement.isSnappedToWall).toBe(false);
      expect(placement.positionMm.x).toBe(2200);
      expect(placement.positionMm.y).toBe(1800);
      expect(placement.rotationDeg).toBe(45);
      expect(placement.isValid).toBe(true);
      expect(placement.roomId).toBe("room-living");
    });

    it("snaps freestanding item coordinates to grid when gridSnapMm is specified", () => {
      const { walls, rooms } = createStandardRoomSetup();
      const cursor = { x: 2237, y: 1883 };

      const placement = calculate3DPlacement(
        cursor,
        {
          category: "decor",
          propType: "plant",
          dimensions: { width: 400, depth: 400 },
        },
        walls,
        rooms,
        { gridSnapMm: 50 }
      );

      expect(placement.positionMm.x).toBe(2250); // 2237 rounded to nearest 50
      expect(placement.positionMm.y).toBe(1900); // 1883 rounded to nearest 50
    });

    it("snaps freestanding item to wall if allowFreestandingSnap is explicitly enabled", () => {
      const { walls, rooms } = createStandardRoomSetup();
      const cursor = { x: 2500, y: 180 };

      const placement = calculate3DPlacement(
        cursor,
        {
          category: "dining",
          propType: "dining_table",
          dimensions: { width: 1600, depth: 900 },
        },
        walls,
        rooms,
        { allowFreestandingSnap: true, snapToleranceMm: 350 }
      );

      expect(placement.isSnappedToWall).toBe(true);
      expect(placement.snappedWallId).toBe("wall-north");
    });
  });

  // -------------------------------------------------------------
  // 6. Collision Detection (Walls & Door Egress Corridors)
  // -------------------------------------------------------------
  describe("6. Collision Detection", () => {
    it("reports collision when prop penetrates an intersecting wall", () => {
      const { walls, rooms } = createStandardRoomSetup();
      // Partition wall inside room: (2500, 1000) -> (2500, 3000)
      const partitionWall: Wall = {
        id: "wall-partition",
        floorId: "floor-1",
        start: { x: 2500, y: 1000 },
        end: { x: 2500, y: 3000 },
        thickness: 150,
        height: 2800,
        wallType: "interior_partition",
        doors: [],
        windows: [],
      };

      const allWalls = [...walls, partitionWall];

      // Place a large sofa centered directly across the partition wall: (2500, 2000)
      const footprint = getPropFootprintPolygon({ x: 2500, y: 2000 }, { width: 2000, depth: 900 }, 0);
      const collision = checkPropCollisions(footprint, allWalls, rooms);

      expect(collision.hasCollision).toBe(true);
      expect(collision.issues.some((issue) => issue.includes("penetrates solid wall"))).toBe(true);
    });

    it("does not flag collision against its own host wall when properly snapped flush", () => {
      const { walls, rooms } = createStandardRoomSetup();
      // Sofa snapped flush to wall-north: center at (2500, 560), back at Y=110, clear of wall face (Y=100)
      const footprint = getPropFootprintPolygon({ x: 2500, y: 560 }, { width: 2000, depth: 900 }, 0);
      const collision = checkPropCollisions(footprint, walls, rooms, "wall-north");

      expect(collision.hasCollision).toBe(false);
      expect(collision.issues).toHaveLength(0);
    });

    it("detects and flags collision when furniture blocks a door egress corridor", () => {
      const { walls, rooms, doors } = createStandardRoomSetup();
      // Door is on South wall at offset 2500: (2500, 4000), width 900.
      // Placing a wardrobe at (2500, 3500) directly in front of the door clearance corridor
      const wardrobePolygon = getPropFootprintPolygon(
        { x: 2500, y: 3500 },
        { width: 1200, depth: 600 },
        0
      );

      const collision = checkPropCollisions(wardrobePolygon, walls, rooms, undefined, doors);
      expect(collision.hasCollision).toBe(true);
      expect(collision.issues.some((i) => i.includes("door egress corridor"))).toBe(true);
    });

    it("allows furniture placement outside the door clearance envelope", () => {
      const { walls, rooms, doors } = createStandardRoomSetup();
      // Door is at (2500, 4000). Place wardrobe at (1000, 3500) far away from the door
      const wardrobePolygon = getPropFootprintPolygon(
        { x: 1000, y: 3500 },
        { width: 1200, depth: 600 },
        0
      );

      const collision = checkPropCollisions(wardrobePolygon, walls, rooms, undefined, doors);
      expect(collision.hasCollision).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 7. Room Containment & Master Placement Coordinator
  // -------------------------------------------------------------
  describe("7. Master calculate3DPlacement & Room Containment", () => {
    it("associates enclosing roomId when placed inside the room polygon", () => {
      const { walls, rooms } = createStandardRoomSetup();
      const sofaPreset = PROP_PRESETS["sofa-3-seater"] || {
        name: "3-Seater Sofa",
        category: "living",
        propType: "sofa",
        dimensions: { width: 2200, depth: 950 },
      };

      const placement = calculate3DPlacement(
        { x: 2500, y: 200 },
        {
          category: sofaPreset.category,
          propType: sofaPreset.propType,
          dimensions: sofaPreset.dimensions,
        },
        walls,
        rooms
      );

      expect(placement.isValid).toBe(true);
      expect(placement.roomId).toBe("room-living");
      expect(placement.isSnappedToWall).toBe(true);
      expect(placement.snappedWallId).toBe("wall-north");
    });

    it("marks placement invalid if position is placed outside all room boundaries", () => {
      const { walls, rooms } = createStandardRoomSetup();
      // Position outside the (0..5000, 0..4000) room boundary: (7000, 7000)
      const placement = calculate3DPlacement(
        { x: 7000, y: 7000 },
        {
          category: "living",
          propType: "sofa",
          dimensions: { width: 2000, depth: 900 },
        },
        walls,
        rooms
      );

      expect(placement.isValid).toBe(false);
      expect(placement.roomId).toBeUndefined();
      expect(placement.validationIssues).toContain("Object position is outside room boundaries.");
    });
  });

  // -------------------------------------------------------------
  // 8. Keyboard Rotation Increments
  // -------------------------------------------------------------
  describe("8. Keyboard Rotation Steps", () => {
    it("cycles through 90-degree increments accurately", () => {
      let angle = 0;
      angle = normalizeAngleDegrees(angle + 90);
      expect(angle).toBe(90);

      angle = normalizeAngleDegrees(angle + 90);
      expect(angle).toBe(180);

      angle = normalizeAngleDegrees(angle + 90);
      expect(angle).toBe(270);

      angle = normalizeAngleDegrees(angle + 90);
      expect(angle).toBe(0);
    });

    it("reverses rotation through -90 degree increments accurately", () => {
      let angle = 0;
      angle = normalizeAngleDegrees(angle - 90);
      expect(angle).toBe(270);

      angle = normalizeAngleDegrees(angle - 90);
      expect(angle).toBe(180);

      angle = normalizeAngleDegrees(angle - 90);
      expect(angle).toBe(90);

      angle = normalizeAngleDegrees(angle - 90);
      expect(angle).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 9. Project Store Integration & Undo/Redo Reversibility
  // -------------------------------------------------------------
  describe("9. Project Store Integration & Undo/Redo", () => {
    it("successfully commits 3D placed prop to project store on active floor", () => {
      const project = createTestProject();
      useProjectStore.setState({ currentProject: project });

      const { addProp } = useProjectStore.getState();
      const newProp: Prop = {
        id: "prop-sofa-1",
        floorId: "floor-1",
        roomId: "room-living",
        name: "3-Seater Sofa",
        category: "living",
        propType: "sofa",
        position: { x: 2500, y: 560 },
        rotation: 0,
        elevationOffsetMm: 0,
        dimensions: { width: 2000, depth: 900, height: 850 },
        color: "#334155",
        finishColor: "#334155",
        shape: "rectangular",
      };

      addProp("floor-1", newProp);

      const updatedProject = useProjectStore.getState().currentProject;
      const placedProp = updatedProject?.floors[0]?.props?.[0];
      expect(placedProp).toBeDefined();
      expect(placedProp?.id).toBe("prop-sofa-1");
      expect(placedProp?.position).toEqual({ x: 2500, y: 560 });
      expect(placedProp?.rotation).toBe(0);
    });

    it("reverses prop addition upon undo and restores on redo", () => {
      const project = createTestProject();
      useProjectStore.setState({ currentProject: project, past: [], future: [] });

      const { addProp, undo, redo } = useProjectStore.getState();
      const newProp: Prop = {
        id: "prop-tv-1",
        floorId: "floor-1",
        roomId: "room-living",
        name: "65-inch 4K TV & Media Unit",
        category: "living",
        propType: "tv",
        position: { x: 2500, y: 3440 },
        rotation: 180,
        elevationOffsetMm: 450,
        dimensions: { width: 1600, depth: 400, height: 1000 },
        color: "#0f172a",
        finishColor: "#0f172a",
        shape: "rectangular",
      };

      addProp("floor-1", newProp);
      expect(useProjectStore.getState().currentProject?.floors[0]?.props).toHaveLength(1);

      // Undo
      undo();
      expect(useProjectStore.getState().currentProject?.floors[0]?.props).toHaveLength(0);

      // Redo
      redo();
      const restoredProp = useProjectStore.getState().currentProject?.floors[0]?.props?.[0];
      expect(restoredProp).toBeDefined();
      expect(restoredProp?.id).toBe("prop-tv-1");
    });

    it("updates prop customization in 3D (rotation and position) cleanly", () => {
      const project = createTestProject();
      const existingProp: Prop = {
        id: "prop-desk-1",
        floorId: "floor-1",
        roomId: "room-living",
        name: "Study Desk",
        category: "office",
        propType: "desk",
        position: { x: 1200, y: 560 },
        rotation: 0,
        elevationOffsetMm: 0,
        dimensions: { width: 1400, depth: 700, height: 750 },
        color: "#3e2723",
        finishColor: "#3e2723",
        shape: "rectangular",
      };
      project.floors[0].props = [existingProp];
      useProjectStore.setState({ currentProject: project, past: [], future: [] });

      const { updatePropCustomization } = useProjectStore.getState();
      updatePropCustomization("floor-1", "prop-desk-1", {
        rotation: 90,
        position: { x: 1500, y: 600 },
      });

      const updatedProp = useProjectStore.getState().currentProject?.floors[0]?.props?.[0];
      expect(updatedProp).toBeDefined();
      expect(updatedProp?.rotation).toBe(90);
      expect(updatedProp?.position).toEqual({ x: 1500, y: 600 });
    });
  });

  // -------------------------------------------------------------
  // 10. Real-Time Performance Benchmark (<5ms Budget)
  // -------------------------------------------------------------
  describe("10. Computational Geometry Performance Benchmark", () => {
    it("executes 100 consecutive 3D placement and collision queries in under 50ms (<0.5ms each)", () => {
      const { walls, rooms } = createStandardRoomSetup();
      const dims = { width: 2000, depth: 900 };

      const startTime = performance.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        // Varying cursor position along room perimeter
        const testX = 500 + (i * 35) % 4000;
        const testY = 200 + (i * 25) % 3600;

        calculate3DPlacement(
          { x: testX, y: testY },
          {
            category: "living",
            propType: "sofa",
            dimensions: dims,
          },
          walls,
          rooms,
          {
            snapToleranceMm: 350,
            wallClearanceMm: 10,
          }
        );
      }

      const totalTimeMs = performance.now() - startTime;
      const avgTimePerQueryMs = totalTimeMs / iterations;

      expect(totalTimeMs).toBeLessThan(50); // Total for 100 queries under 50ms
      expect(avgTimePerQueryMs).toBeLessThan(1.0); // Less than 1ms per frame, ensuring 60fps+
    });
  });
});
