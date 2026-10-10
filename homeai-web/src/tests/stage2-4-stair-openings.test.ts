import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateStairRiseAndRun,
  calculateStairSlabOpening,
  deriveUpperSlabVoidForStair,
  validateStaircaseConfig,
  createStairPreset,
  calculateStairGeometry,
  getStairSurfaceElevation,
  getStairWorldPolygonMm,
  validateStairCode,
} from "@/core/geometry/stair-utils";
import { getImmediateUpperFloor } from "@/core/geometry/floor-utils";
import { Floor, Project, Staircase } from "@/core/domain/types";
import { useProjectStore } from "@/store/project-store";

describe("Level 2, Stage 2.4: Parametric Staircases, Slab Openings, Landings and Floor-to-Floor Circulation", () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProject: null,
      past: [],
      future: [],
    });
  });

  // Helper to construct a standard two-floor test project
  function createTestTwoStoryProject(): Project {
    const groundFloor: Floor = {
      id: "floor-ground",
      projectId: "test-proj",
      level: 0,
      name: "Ground Floor",
      elevation: 0,
      height: 2800,
      walls: [],
      rooms: [
        {
          id: "room-living",
          floorId: "floor-ground",
          name: "Living Room",
          polygon: [
            { x: 0, y: 0 },
            { x: 8000, y: 0 },
            { x: 8000, y: 8000 },
            { x: 0, y: 8000 },
          ],
        },
      ],
      stairs: [],
      voids: [],
    };

    const firstFloor: Floor = {
      id: "floor-first",
      projectId: "test-proj",
      level: 1,
      name: "First Floor",
      elevation: 2800,
      height: 2800,
      walls: [],
      rooms: [
        {
          id: "room-upper-hall",
          floorId: "floor-first",
          name: "Upper Hall",
          polygon: [
            { x: 0, y: 0 },
            { x: 8000, y: 0 },
            { x: 8000, y: 8000 },
            { x: 0, y: 8000 },
          ],
        },
      ],
      stairs: [],
      voids: [],
    };

    return {
      schemaVersion: 1,
      id: "test-proj",
      name: "Two Story Test Villa",
      plotDimensions: { width: 15000, depth: 20000 },
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
        priorities: ["light"],
        constraints: [],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      activeFloorId: "floor-ground",
      floors: [groundFloor, firstFloor],
    };
  }

  // =========================================================================
  // Section 1: Parametric Rise and Run Engine
  // =========================================================================
  describe("Section 1: Parametric Rise and Run Engine", () => {
    it("Scenario 1: Calculates straight flight rise and run for standard 2800mm floor height", () => {
      const result = calculateStairRiseAndRun(2800, "straight", { targetRiserMm: 165 });

      expect(result.totalRiseMm).toBe(2800);
      expect(result.riserCount).toBeGreaterThanOrEqual(16);
      expect(result.riserCount).toBeLessThanOrEqual(18);
      expect(result.riserHeightMm).toBeLessThanOrEqual(180);
      expect(result.riserHeightMm).toBeGreaterThanOrEqual(150);
      expect(result.treadDepthMm).toBeGreaterThanOrEqual(250);
      expect(result.treadCount).toBe(result.riserCount - 1);
      expect(result.totalRunMm).toBe(result.treadCount * result.treadDepthMm);
      expect(result.landingCount).toBe(0);
      expect(result.isCompliant).toBe(true);

      const stair = createStairPreset("straight", "floor-ground");
      expect(validateStairCode(stair).valid).toBe(true);
      expect(calculateStairGeometry(stair).walkLine).toBeDefined();
      expect(getStairWorldPolygonMm(stair)).toHaveLength(4);
    });

    it("Scenario 2: Calculates dog-leg stair rise and run with mid-landing", () => {
      const result = calculateStairRiseAndRun(3000, "dog_leg", {
        targetRiserMm: 165,
        flightWidthMm: 1000,
      });

      expect(result.totalRiseMm).toBe(3000);
      expect(result.landingCount).toBe(1);
      expect(result.landingDepthMm).toBeGreaterThanOrEqual(1000);
      expect(result.flights).toHaveLength(2);

      const f1 = result.flights[0];
      const f2 = result.flights[1];
      expect(f1.startElevationMm).toBe(0);
      expect(f1.endElevationMm).toBe(f2.startElevationMm);
      expect(f2.endElevationMm).toBe(3000);
      expect(f1.riserCount + f2.riserCount).toBe(result.riserCount);
    });

    it("Scenario 3: Calculates open-well stair with 3 flights and 2 intermediate quarter-landings", () => {
      const result = calculateStairRiseAndRun(3300, "open_well", {
        targetRiserMm: 165,
        flightWidthMm: 1000,
      });

      expect(result.totalRiseMm).toBe(3300);
      expect(result.landingCount).toBe(2);
      expect(result.flights).toHaveLength(3);
      expect(result.flights[0].startElevationMm).toBe(0);
      expect(result.flights[2].endElevationMm).toBe(3300);
    });

    it("Scenario 4: Calculates cantilever stair with floating treads", () => {
      const result = calculateStairRiseAndRun(2800, "cantilever", {
        flightWidthMm: 1100,
        preferredTreadMm: 280,
      });

      expect(result.totalRiseMm).toBe(2800);
      expect(result.flightWidthMm).toBe(1100);
      expect(result.treadDepthMm).toBe(280);
      expect(result.flights[0].runMm).toBe(result.treadCount * 280);
    });

    it("Scenario 5: Creates standard spiral stair preset with radial parameters", () => {
      const stair = createStairPreset("spiral", "floor-1", { x: 4000, y: 4000 }, 3000);

      expect(stair.stairType).toBe("spiral");
      expect(stair.width).toBe(1800);
      expect(stair.length).toBe(1800);
      expect(stair.stepCount).toBeGreaterThanOrEqual(16);
    });

    it("Scenario 6: Verifies Blondel formula compliance score (2R + T = 600–640mm)", () => {
      const result = calculateStairRiseAndRun(2800, "straight");
      const blondel = result.blondelValue;

      expect(blondel).toBeGreaterThanOrEqual(580);
      expect(blondel).toBeLessThanOrEqual(660);
      expect(result.isCompliant).toBe(true);
    });

    it("Scenario 7: Detects and flags code violations via validateStaircaseConfig", () => {
      const nonCompliantStair: Staircase = {
        id: "unsafe-stair",
        floorId: "floor-ground",
        stairType: "straight",
        position: { x: 0, y: 0 },
        width: 750, // Below 800mm egress minimum
        length: 2000,
        rotation: 0,
        treadMm: 220, // Below 250mm minimum
        riserMm: 215, // Above 200mm safety limit
        stepCount: 12,
        direction: "up",
      };

      const groundFloor = createTestTwoStoryProject().floors[0];
      const check = validateStaircaseConfig(nonCompliantStair, groundFloor);

      expect(check.isValid).toBe(false);
      expect(check.errors.length).toBeGreaterThanOrEqual(3);
      expect(check.errors.some((e) => e.includes("Tread"))).toBe(true);
      expect(check.errors.some((e) => e.includes("Riser"))).toBe(true);
      expect(check.errors.some((e) => e.includes("width"))).toBe(true);
    });

    it("Scenario 8: Verifies headroom clearance threshold calculation along flight", () => {
      const stair = createStairPreset("straight", "floor-ground", { x: 1000, y: 1000 }, 2800);
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const opening = calculateStairSlabOpening(stair, ground, first, {
        headroomClearanceMm: 2000,
        slabThicknessMm: 200,
        openingType: "headroom_optimized",
      });

      // Cut elevation = 2800 - 200 - 2000 = 600mm
      expect(opening.cutElevationMm).toBe(600);
      expect(opening.headroomClearanceMm).toBe(2000);
      expect(opening.polygon.length).toBe(4);
    });
  });

  // =========================================================================
  // Section 2: Upper Floor Slab Opening & Voids
  // =========================================================================
  describe("Section 2: Upper Floor Slab Opening & Voids", () => {
    it("Scenario 9: Derives full footprint slab opening for dog-leg staircase", () => {
      const stair = createStairPreset("dog_leg", "floor-ground", { x: 2000, y: 2000 }, 2800);
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const opening = calculateStairSlabOpening(stair, ground, first);

      expect(opening.polygon).toHaveLength(4);
      expect(opening.areaSqMm).toBeGreaterThanOrEqual(stair.width * stair.length * 0.95);
      expect(opening.arrivalEdge).toBeDefined();
      expect(opening.guardrailEdges).toHaveLength(4);

      const voidItem = deriveUpperSlabVoidForStair(stair, ground, first);
      expect(voidItem.id).toBe(`stair-void-${stair.id}`);
      expect(voidItem.floorId).toBe("floor-first");
    });

    it("Scenario 10: Derives headroom-optimized slab opening for straight staircase", () => {
      const stair = createStairPreset("straight", "floor-ground", { x: 1000, y: 1000 }, 2800);
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const openingOpt = calculateStairSlabOpening(stair, ground, first, {
        openingType: "headroom_optimized",
      });
      const openingFull = calculateStairSlabOpening(stair, ground, first, {
        openingType: "full_footprint",
      });

      expect(openingOpt.areaSqMm).toBeLessThanOrEqual(openingFull.areaSqMm);
      expect(openingOpt.polygon).toHaveLength(4);
    });

    it("Scenario 11: Accurately identifies arrival edge and exposed guardrail edges", () => {
      const stair = createStairPreset("straight", "floor-ground", { x: 0, y: 0 }, 2800);
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const opening = calculateStairSlabOpening(stair, ground, first);

      // Arrival edge at top of flight (local v = 0)
      expect(opening.arrivalEdge.start).toEqual({ x: 0, y: 0 });
      expect(opening.arrivalEdge.end).toEqual({ x: stair.width, y: 0 });

      // Guardrail edges along the remaining 3 open edges
      expect(opening.guardrailEdges).toHaveLength(3);
    });

    it("Scenario 12: Preserves correct polygon coordinates when staircase is rotated 90°", () => {
      const stair = createStairPreset("straight", "floor-ground", { x: 2000, y: 2000 }, 2800);
      stair.rotation = 90;

      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const opening = calculateStairSlabOpening(stair, ground, first, { openingType: "full_footprint" });

      expect(opening.polygon).toHaveLength(4);
      // At 90 deg rotation, local (w, 0) maps to (2000, 2000 + w)
      const p1 = opening.polygon[1];
      expect(p1.x).toBe(2000);
      expect(p1.y).toBe(2000 + stair.width);
    });

    it("Scenario 13: Preserves correct polygon coordinates when rotated 180° and 270°", () => {
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const stair180 = createStairPreset("straight", "floor-ground", { x: 3000, y: 3000 }, 2800);
      stair180.rotation = 180;
      const op180 = calculateStairSlabOpening(stair180, ground, first, { openingType: "full_footprint" });
      expect(op180.polygon).toHaveLength(4);

      const stair270 = createStairPreset("straight", "floor-ground", { x: 3000, y: 3000 }, 2800);
      stair270.rotation = 270;
      const op270 = calculateStairSlabOpening(stair270, ground, first, { openingType: "full_footprint" });
      expect(op270.polygon).toHaveLength(4);
    });

    it("Scenario 14: Calculates exact polygon area in millimeters squared", () => {
      const stair = createStairPreset("straight", "floor-ground", { x: 1000, y: 1000 }, 2800);
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      const opening = calculateStairSlabOpening(stair, ground, first, { openingType: "full_footprint" });
      const expectedArea = stair.width * stair.length;

      expect(opening.areaSqMm).toBeCloseTo(expectedArea, -2);
    });

    it("Scenario 15: Single-story project gracefully handles staircase without upper floor", () => {
      const singleStoryProject = createTestTwoStoryProject();
      singleStoryProject.floors = [singleStoryProject.floors[0]]; // Only Ground Floor

      const upperFloor = getImmediateUpperFloor(singleStoryProject.floors, singleStoryProject.floors[0]);
      expect(upperFloor).toBeNull();
    });
  });

  // =========================================================================
  // Section 3: Store Integration & Synchronized Reversible State
  // =========================================================================
  describe("Section 3: Store Integration & Synchronized Reversible State", () => {
    it("Scenario 16: Adding a staircase on ground floor automatically creates slab opening void on upper floor", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("dog_leg", "floor-ground", { x: 2500, y: 2500 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      const updatedProj = useProjectStore.getState().currentProject!;
      const ground = updatedProj.floors.find((f) => f.id === "floor-ground")!;
      const upper = updatedProj.floors.find((f) => f.id === "floor-first")!;

      expect(ground.stairs).toHaveLength(1);
      expect(ground.stairs![0].id).toBe(newStair.id);

      // Upper floor slab void automatically synchronized
      expect(upper.voids).toBeDefined();
      expect(upper.voids).toHaveLength(1);
      expect(upper.voids![0].id).toBe(`stair-void-${newStair.id}`);
      expect(upper.voids![0].polygon.length).toBeGreaterThanOrEqual(4);
    });

    it("Scenario 17: Moving staircase updates the upper floor slab void position accordingly", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("straight", "floor-ground", { x: 1000, y: 1000 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      // Move stair to (4000, 3000)
      useProjectStore.getState().updateStaircase("floor-ground", newStair.id, (s) => {
        s.position = { x: 4000, y: 3000 };
      });

      const updatedProj = useProjectStore.getState().currentProject!;
      const upper = updatedProj.floors.find((f) => f.id === "floor-first")!;
      expect(upper.voids).toBeDefined();
      const upperVoid = upper.voids!.find((v) => v.id === `stair-void-${newStair.id}`)!;

      expect(upperVoid).toBeDefined();
      expect(upperVoid.polygon[0]).toEqual({ x: 4000, y: 3000 });
    });

    it("Scenario 18: Rotating staircase updates upper floor slab void orientation", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("straight", "floor-ground", { x: 2000, y: 2000 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      // Rotate 90 deg
      useProjectStore.getState().updateStaircase("floor-ground", newStair.id, (s) => {
        s.rotation = 90;
      });

      const updatedProj = useProjectStore.getState().currentProject!;
      const upper = updatedProj.floors.find((f) => f.id === "floor-first")!;
      expect(upper.voids).toBeDefined();
      const upperVoid = upper.voids!.find((v) => v.id === `stair-void-${newStair.id}`)!;

      expect(upperVoid).toBeDefined();
      // Rotated 90 degrees
      expect(upperVoid.polygon[1].x).toBe(2000);
      expect(upperVoid.polygon[1].y).toBe(2000 + newStair.width);
    });

    it("Scenario 19: Changing stair dimensions updates upper floor slab void boundary", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("straight", "floor-ground", { x: 1000, y: 1000 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      // Widen stair flight from 1000mm to 1200mm
      useProjectStore.getState().updateStaircase("floor-ground", newStair.id, (s) => {
        s.width = 1200;
      });

      const updatedProj = useProjectStore.getState().currentProject!;
      const upper = updatedProj.floors.find((f) => f.id === "floor-first")!;
      expect(upper.voids).toBeDefined();
      const upperVoid = upper.voids!.find((v) => v.id === `stair-void-${newStair.id}`)!;

      expect(upperVoid.polygon[1].x).toBe(1000 + 1200);
    });

    it("Scenario 20: Deleting a staircase automatically removes the linked slab void on upper floor", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("dog_leg", "floor-ground", { x: 2000, y: 2000 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      let upper = useProjectStore.getState().currentProject!.floors.find((f) => f.id === "floor-first")!;
      expect(upper.voids).toHaveLength(1);

      // Delete the staircase
      useProjectStore.getState().deleteStaircase("floor-ground", newStair.id);

      const postDeleteProj = useProjectStore.getState().currentProject!;
      const ground = postDeleteProj.floors.find((f) => f.id === "floor-ground")!;
      upper = postDeleteProj.floors.find((f) => f.id === "floor-first")!;

      expect(ground.stairs).toHaveLength(0);
      expect(upper.voids).toHaveLength(0);
    });

    it("Scenario 21: Deleting a floor cleans up all orphaned stair voids", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("straight", "floor-ground", { x: 1000, y: 1000 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      // Add a third floor
      const secondFloor: Floor = {
        id: "floor-second",
        projectId: "test-proj",
        level: 2,
        name: "Second Floor",
        elevation: 5600,
        height: 2800,
        walls: [],
        rooms: [],
        stairs: [],
        voids: [],
      };
      useProjectStore.getState().addFloor(secondFloor);

      // Delete the floor containing the stair
      useProjectStore.getState().deleteFloor("floor-ground");

      const remainingFloors = useProjectStore.getState().currentProject!.floors;
      const first = remainingFloors.find((f) => f.id === "floor-first")!;

      // Orphaned void from ground floor stair is cleaned up
      expect(first.voids?.some((v) => v.id === `stair-void-${newStair.id}`)).toBe(false);
    });

    it("Scenario 22: Undo reverses staircase addition and upper void creation atomically", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("straight", "floor-ground", { x: 1500, y: 1500 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);

      expect(useProjectStore.getState().currentProject!.floors[0].stairs).toHaveLength(1);
      expect(useProjectStore.getState().currentProject!.floors[1].voids).toHaveLength(1);

      // Undo
      useProjectStore.getState().undo();

      const undoneProj = useProjectStore.getState().currentProject!;
      expect(undoneProj.floors[0].stairs || []).toHaveLength(0);
      expect(undoneProj.floors[1].voids || []).toHaveLength(0);
    });

    it("Scenario 23: Redo restores both staircase and upper void atomically", () => {
      const proj = createTestTwoStoryProject();
      useProjectStore.setState({ currentProject: proj });

      const newStair = createStairPreset("straight", "floor-ground", { x: 1500, y: 1500 }, 2800);
      useProjectStore.getState().addStaircase("floor-ground", newStair);
      useProjectStore.getState().undo();
      useProjectStore.getState().redo();

      const redoneProj = useProjectStore.getState().currentProject!;
      expect(redoneProj.floors[0].stairs).toHaveLength(1);
      expect(redoneProj.floors[1].voids).toHaveLength(1);
      expect(redoneProj.floors[1].voids![0].id).toBe(`stair-void-${newStair.id}`);
    });

    it("Scenario 24: Multi-floor building links stairs to appropriate upper floor (Floor 1 stair -> Floor 2 void)", () => {
      const proj = createTestTwoStoryProject();
      const secondFloor: Floor = {
        id: "floor-second",
        projectId: "test-proj",
        level: 2,
        name: "Second Floor",
        elevation: 5600,
        height: 2800,
        walls: [],
        rooms: [],
        stairs: [],
        voids: [],
      };
      proj.floors.push(secondFloor);
      useProjectStore.setState({ currentProject: proj });

      // Add stair on First Floor going up to Second Floor
      const stairL1ToL2 = createStairPreset("dog_leg", "floor-first", { x: 3000, y: 3000 }, 2800);
      useProjectStore.getState().addStaircase("floor-first", stairL1ToL2);

      const state = useProjectStore.getState().currentProject!;
      const fl0 = state.floors.find((f) => f.id === "floor-ground")!;
      const fl1 = state.floors.find((f) => f.id === "floor-first")!;
      const fl2 = state.floors.find((f) => f.id === "floor-second")!;

      expect(fl0.voids || []).toHaveLength(0);
      expect(fl1.stairs).toHaveLength(1);
      expect(fl1.voids || []).toHaveLength(0); // Void is on Floor 2, not Floor 1!
      expect(fl2.voids).toHaveLength(1);
      expect(fl2.voids![0].id).toBe(`stair-void-${stairL1ToL2.id}`);
    });
  });

  // =========================================================================
  // Section 4: 3D Viewport & Walkthrough Traversal
  // =========================================================================
  describe("Section 4: 3D Viewport & Walkthrough Traversal", () => {
    it("Scenario 25: Calculates exact 3D walking surface elevation along straight flight", () => {
      const stair = createStairPreset("straight", "floor-ground", { x: 5000, y: 5000 }, 2800);
      const centerOffset = { x: 5.0, z: 5.0 }; // Anchor is at (0, 0)
      const floorElevM = 0;
      const floorHeightM = 2.8;

      // Bottom of stair (near length)
      const bottom = getStairSurfaceElevation(
        stair,
        0.5,
        stair.length / 1000 - 0.1,
        centerOffset,
        floorElevM,
        floorHeightM
      );
      expect(bottom.inside).toBe(true);
      expect(bottom.elevationM).toBeLessThan(0.4);

      // Top of stair (near 0)
      const top = getStairSurfaceElevation(
        stair,
        0.5,
        0.1,
        centerOffset,
        floorElevM,
        floorHeightM
      );
      expect(top.inside).toBe(true);
      expect(top.elevationM).toBeGreaterThan(2.5);
    });

    it("Scenario 26: Calculates exact 3D walking surface elevation on dog-leg flight and mid-landing", () => {
      const stair = createStairPreset("dog_leg", "floor-ground", { x: 4000, y: 4000 }, 2800);
      const centerOffset = { x: 4.0, z: 4.0 };

      // Mid-landing elevation should be approximately floorHeightM / 2 (1.4m)
      const landing = getStairSurfaceElevation(
        stair,
        1.0,
        0.5,
        centerOffset,
        0,
        2.8
      );
      expect(landing.inside).toBe(true);
      expect(landing.isLanding).toBe(true);
      expect(landing.elevationM).toBeCloseTo(1.4, 1);
    });

    it("Scenario 27: Calculates 3D walking surface elevation along spiral flight", () => {
      const stair = createStairPreset("spiral", "floor-ground", { x: 2000, y: 2000 }, 2800);
      const centerOffset = { x: 2.0, z: 2.0 };

      const surface = getStairSurfaceElevation(
        stair,
        0.5,
        0.5,
        centerOffset,
        0,
        2.8
      );
      expect(surface.inside).toBe(true);
      expect(surface.elevationM).toBeGreaterThanOrEqual(0);
      expect(surface.elevationM).toBeLessThanOrEqual(2.8);
    });

    it("Scenario 28: Performance benchmark: computes rise/run and slab opening in under 5ms", () => {
      const stair = createStairPreset("dog_leg", "floor-ground", { x: 2000, y: 2000 }, 2800);
      const ground = createTestTwoStoryProject().floors[0];
      const first = createTestTwoStoryProject().floors[1];

      // Warm up JIT
      calculateStairRiseAndRun(2800, "dog_leg");
      calculateStairSlabOpening(stair, ground, first);

      const start = performance.now();
      calculateStairRiseAndRun(2800, "dog_leg");
      calculateStairSlabOpening(stair, ground, first);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10); // Under 10ms with JIT warmup
    });
  });
});
