import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { WalkthroughController, isSolidProp } from "@/core/geometry/walkthrough-controller";
import { Floor, Wall, Prop, Staircase, StructuralColumn } from "@/core/domain/types";
import { createStairPreset } from "@/core/geometry/stair-utils";

describe("Stage 3.4: Collision-Aware First-Person Walkthrough and Optimization", () => {
  const createTestWall = (
    id: string,
    start: { x: number; y: number },
    end: { x: number; y: number },
    thickness: number = 200,
    doors: Wall["doors"] = [],
    windows: Wall["windows"] = []
  ): Wall => ({
    id,
    floorId: "fl-ground",
    start,
    end,
    thickness,
    doors,
    windows,
  });

  const createBaseFloor = (walls: Wall[] = [], props: Prop[] = [], stairs: Staircase[] = []): Floor => ({
    id: "fl-ground",
    projectId: "proj-collision",
    level: 0,
    name: "Ground Floor",
    elevation: 0,
    height: 2800,
    walls,
    rooms: [],
    props,
    stairs,
  });

  const centerOffset = { x: 0, z: 0 };

  // 1. Normal walking on a level floor
  it("1. supports normal walking on a level floor maintaining base eye level 1.65m", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);
    const floor = createBaseFloor();

    controller.enable({ x: 0, z: 0 }, 0);
    expect(controller.position.y).toBe(1.65);

    controller.handleKeyDown("KeyW");
    controller.update(0.2, { floors: [floor], centerOffset });

    expect(controller.position.z).toBeCloseTo(-3.2 * 0.2, 2);
    expect(controller.position.y).toBe(1.65);
    expect(camera.position.y).toBe(1.65);
  });

  // 2. Forward and backward movement
  it("2. supports forward and backward movement symmetrically", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);
    const floor = createBaseFloor();

    controller.enable({ x: 0, z: 0 }, 0);

    // Forward
    controller.handleKeyDown("KeyW");
    controller.update(0.1, { floors: [floor], centerOffset });
    const forwardZ = controller.position.z;
    expect(forwardZ).toBeLessThan(0);

    // Stop forward, move backward
    controller.handleKeyUp("KeyW");
    controller.handleKeyDown("KeyS");
    controller.update(0.1, { floors: [floor], centerOffset });

    expect(controller.position.z).toBeCloseTo(0, 3);
  });

  // 3. Lateral and diagonal movement without speed multiplication
  it("3. normalizes diagonal movement without speed multiplication", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);
    const floor = createBaseFloor();

    // Straight forward
    controller.enable({ x: 0, z: 0 }, 0);
    controller.handleKeyDown("KeyW");
    controller.update(1.0, { floors: [floor], centerOffset });
    const straightDist = Math.hypot(controller.position.x, controller.position.z);

    // Diagonal forward + right
    controller.enable({ x: 0, z: 0 }, 0);
    controller.handleKeyDown("KeyW");
    controller.handleKeyDown("KeyD");
    controller.update(1.0, { floors: [floor], centerOffset });
    const diagonalDist = Math.hypot(controller.position.x, controller.position.z);

    // Both distances must equal walkSpeed (3.2 m/s), NOT 3.2 * sqrt(2) = 4.52 m/s
    expect(straightDist).toBeCloseTo(3.2, 2);
    expect(diagonalDist).toBeCloseTo(3.2, 2);
  });

  // 4. Movement-speed consistency under different frame intervals
  it("4. maintains consistent speed across varying frame intervals (frame-rate independence)", () => {
    const camera1 = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller1 = new WalkthroughController(camera1);
    const floor = createBaseFloor();

    // 60 FPS: 60 frames of 1/60s
    controller1.enable({ x: 0, z: 0 }, 0);
    controller1.handleKeyDown("KeyW");
    for (let i = 0; i < 60; i++) {
      controller1.update(1 / 60, { floors: [floor], centerOffset });
    }

    // 30 FPS: 30 frames of 1/30s
    const camera2 = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller2 = new WalkthroughController(camera2);
    controller2.enable({ x: 0, z: 0 }, 0);
    controller2.handleKeyDown("KeyW");
    for (let i = 0; i < 30; i++) {
      controller2.update(1 / 30, { floors: [floor], centerOffset });
    }

    expect(controller1.position.z).toBeCloseTo(controller2.position.z, 2);
    expect(controller1.position.z).toBeCloseTo(-3.2, 1);
  });

  // 5. Collision with a thin wall at normal speed
  it("5. stops player from penetrating a thin 100mm wall at normal walk speed", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const thinWall = createTestWall("w-thin", { x: -3000, y: 0 }, { x: 3000, y: 0 }, 100);
    const floor = createBaseFloor([thinWall]);

    // Player starts at Z = 0.5m and walks forward toward Z = 0
    controller.enable({ x: 0, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");

    // Update for 0.5 seconds (would move 1.6m without collision)
    controller.update(0.5, { floors: [floor], centerOffset });

    // Clearance = playerRadius (0.35) + wallThickness/2 (0.05) = 0.40m
    expect(controller.position.z).toBeGreaterThanOrEqual(0.395);
  });

  // 6. Collision with a thin wall at high speed (sprint tunneling prevention)
  it("6. prevents tunneling through a thin wall even at high sprint speed", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const thinWall = createTestWall("w-thin-sprint", { x: -3000, y: 0 }, { x: 3000, y: 0 }, 100);
    const floor = createBaseFloor([thinWall]);

    // Sprinting directly toward wall from Z = 0.45m (speed 6.0 m/s)
    controller.enable({ x: 0, z: 0.45 }, 0);
    controller.handleKeyDown("ShiftLeft");
    controller.handleKeyDown("KeyW");

    // Single large timestep delta 0.1s
    controller.update(0.1, { floors: [floor], centerOffset });

    // CCD substepping ensures player does not tunnel through to Z < 0
    expect(controller.position.z).toBeGreaterThanOrEqual(0.395);
  });

  // 7. Sliding along a wall
  it("7. allows smooth sliding along wall surface when approaching at an angle", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const wall = createTestWall("w-slide", { x: -5000, y: 0 }, { x: 5000, y: 0 }, 200);
    const floor = createBaseFloor([wall]);

    // Player is against wall at Z = 0.45m (radius 0.35 + thickness/2 0.1)
    controller.enable({ x: 0, z: 0.45 }, 0);

    // Move forward and right diagonally (KeyW + KeyD)
    controller.handleKeyDown("KeyW");
    controller.handleKeyDown("KeyD");

    controller.update(0.5, { floors: [floor], centerOffset });

    // Z cannot penetrate wall (must stay >= 0.44m)
    expect(controller.position.z).toBeGreaterThanOrEqual(0.44);
    // X slides along the wall surface to the right (> 0)
    expect(controller.position.x).toBeGreaterThan(0.5);
  });

  // 8. Collision at an L-junction
  it("8. resolves corner collisions cleanly at an L-junction without sticking or penetrating", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const wall1 = createTestWall("w-l1", { x: 0, y: 0 }, { x: 5000, y: 0 }, 200);
    const wall2 = createTestWall("w-l2", { x: 0, y: 0 }, { x: 0, y: 5000 }, 200);
    const floor = createBaseFloor([wall1, wall2]);

    // Player starts at (0.6, 0.6) and walks toward corner (forward -Z and left -X)
    controller.enable({ x: 0.6, z: 0.6 }, 0);
    controller.handleKeyDown("KeyW");
    controller.handleKeyDown("KeyA");

    controller.update(0.5, { floors: [floor], centerOffset });

    // Both X and Z must respect the minimum clearance (0.45m)
    expect(controller.position.x).toBeGreaterThanOrEqual(0.44);
    expect(controller.position.z).toBeGreaterThanOrEqual(0.44);
  });

  // 9. Collision near a T-junction
  it("9. resolves collision near a T-junction smoothly", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const crossbar = createTestWall("w-t-cross", { x: -5000, y: 0 }, { x: 5000, y: 0 }, 200);
    const stem = createTestWall("w-t-stem", { x: 0, y: 0 }, { x: 0, y: 5000 }, 200);
    const floor = createBaseFloor([crossbar, stem]);

    // Player walks into junction from (0.5, 0.5) toward (-X, -Z)
    controller.enable({ x: 0.5, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");
    controller.handleKeyDown("KeyA");

    controller.update(0.3, { floors: [floor], centerOffset });

    expect(controller.position.x).toBeGreaterThanOrEqual(0.44);
    expect(controller.position.z).toBeGreaterThanOrEqual(0.44);
  });

  // 10. Walking through a valid doorway
  it("10. allows unobstructed passage through a valid doorway opening", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const wallWithDoor = createTestWall("w-door", { x: -5000, y: 0 }, { x: 5000, y: 0 }, 200, [
      {
        id: "d-center",
        wallId: "w-door",
        floorId: "fl-ground",
        offset: 5000, // center (X=0)
        width: 1000,
        height: 2100,
        swingDirection: "inward_left",
      },
    ]);
    const floor = createBaseFloor([wallWithDoor]);

    // Player aligned with doorway at (0, 0.5) walks forward (-Z)
    controller.enable({ x: 0, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");
    controller.update(0.5, { floors: [floor], centerOffset });

    // Passed through doorway to Z < 0.4
    expect(controller.position.z).toBeLessThan(0.4);
  });

  // 11. Rejection of movement through a solid wall
  it("11. strictly blocks movement through a solid wall without doorway", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const solidWall = createTestWall("w-solid", { x: -5000, y: 0 }, { x: 5000, y: 0 }, 200);
    const floor = createBaseFloor([solidWall]);

    controller.enable({ x: 0, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");
    controller.update(1.0, { floors: [floor], centerOffset });

    // Blocked at minDistance = 0.35 + 0.1 = 0.45m
    expect(controller.position.z).toBeGreaterThanOrEqual(0.44);
  });

  // 12. Collision with supported furniture bounds
  it("12. prevents movement through solid furniture (e.g. dining table, sofa)", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const diningTable: Prop = {
      id: "prop-table",
      floorId: "fl-ground",
      name: "Dining Table",
      category: "dining",
      propType: "dining_table",
      position: { x: 0, y: 0 }, // at (0, 0) in mm -> (0, 0) in world meters
      rotation: 0,
      dimensions: { width: 1800, depth: 900, height: 750 },
    };
    const floor = createBaseFloor([], [diningTable]);

    // Half depth = 0.45m. Player radius = 0.35m. Min Z = 0.45 + 0.35 = 0.80m
    controller.enable({ x: 0, z: 1.2 }, 0);
    controller.handleKeyDown("KeyW"); // walk toward table (-Z)

    controller.update(0.5, { floors: [floor], centerOffset });

    // Player stopped before penetrating the table
    expect(controller.position.z).toBeGreaterThanOrEqual(0.79);
  });

  // 13. Movement through a narrow valid passage
  it("13. allows traversal through a narrow valid passage between furniture", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    // Two furniture pieces separated by 1.4m gap at X = 0
    const sofaLeft: Prop = {
      id: "prop-sofa-l",
      floorId: "fl-ground",
      name: "Sofa Left",
      category: "living",
      propType: "sofa",
      position: { x: -1200, y: 0 }, // X = -1.2m, width 1.0m -> right edge at -0.7m
      rotation: 0,
      dimensions: { width: 1000, depth: 800, height: 800 },
    };
    const sofaRight: Prop = {
      id: "prop-sofa-r",
      floorId: "fl-ground",
      name: "Sofa Right",
      category: "living",
      propType: "sofa",
      position: { x: 1200, y: 0 }, // X = 1.2m, width 1.0m -> left edge at +0.7m
      rotation: 0,
      dimensions: { width: 1000, depth: 800, height: 800 },
    };
    const floor = createBaseFloor([], [sofaLeft, sofaRight]);

    controller.enable({ x: 0, z: 1.0 }, 0);
    controller.handleKeyDown("KeyW");
    controller.update(0.5, { floors: [floor], centerOffset });

    // Player navigated through the center of the passage
    expect(controller.position.z).toBeLessThan(0.5);
    expect(Math.abs(controller.position.x)).toBeLessThan(0.1);
  });

  // 14. Correct eye height above walking surface
  it("14. sets and maintains exact eye height of 1.65m above elevated floor level", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const firstFloor: Floor = {
      id: "fl-first",
      projectId: "proj-collision",
      level: 1,
      name: "First Floor",
      elevation: 3200, // 3.2m elevation
      height: 2800,
      walls: [],
      rooms: [],
    };

    controller.enable({ x: 2, z: 2 }, 3.2);
    controller.update(0.1, { floors: [firstFloor], centerOffset });

    expect(controller.position.y).toBeCloseTo(3.2 + 1.65, 3);
    expect(camera.position.y).toBeCloseTo(4.85, 3);
  });

  // 15. Staircase traversal between connected floors
  it("15. climbs staircase dynamically increasing eye elevation", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const stair = createStairPreset("dog_leg", "fl-ground", { x: 0, y: 0 });
    const floor = createBaseFloor([], [], [stair]);

    // Position at bottom step of stair
    const startZ = stair.length / 1000 - 0.2;
    controller.enable({ x: 0.5, z: startZ }, 0);
    expect(controller.position.y).toBe(1.65);

    // Climb forward into the staircase
    controller.handleKeyDown("KeyW");
    controller.update(0.5, { floors: [floor], centerOffset });

    expect(controller.position.y).toBeGreaterThan(1.65);
  });

  // 16. Landing transitions on dog-leg stairs
  it("16. maintains stable mid-landing elevation on dog-leg stairs", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const stair = createStairPreset("dog_leg", "fl-ground", { x: 0, y: 0 }, 2800);
    const floor = createBaseFloor([], [], [stair]);

    // Landing on dog-leg is at v < landingDepth (top end of stair rectangle: y < 1.0m)
    // In world coords: x = 1.0m, z = 0.5m
    controller.enable({ x: 1.0, z: 0.5 }, 0);

    // Update multiple frames to let vertical blend converge
    for (let i = 0; i < 20; i++) {
      controller.update(0.05, { floors: [floor], centerOffset });
    }

    // Mid landing elevation for 2.8m floor height is 1.4m. Eye height = 1.4 + 1.65 = 3.05m
    expect(controller.position.y).toBeCloseTo(3.05, 1);
  });

  // 17. Prevention of movement through a slab outside a valid opening
  it("17. prevents vertical camera penetration into upper ceiling slab outside openings", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const groundFloor = createBaseFloor();
    const upperFloor: Floor = {
      id: "fl-upper",
      projectId: "proj-collision",
      level: 1,
      name: "First Floor",
      elevation: 2800, // 2.8m
      height: 2800,
      walls: [],
      rooms: [],
    };

    controller.enable({ x: 0, z: 0 }, 0);
    // Even if initial elevation is elevated, ceiling clamp keeps head below slab
    controller.position.y = 3.0; // above ceiling
    controller.update(0.1, { floors: [groundFloor, upperFloor], centerOffset });

    // Head elevation (eye + 0.15m) cannot exceed upperFloor.elevation (2.8m)
    expect(controller.position.y).toBeLessThan(2.8);
  });

  // 18. Exclusion of non-solid reference geometry from physical collision
  it("18. excludes non-solid props like ceiling lights and curtains from collision", () => {
    const ceilingLight: Prop = {
      id: "prop-light",
      floorId: "fl-ground",
      name: "Pendant Light",
      category: "lighting",
      propType: "pendant_light",
      position: { x: 0, y: 0 },
      rotation: 0,
      dimensions: { width: 500, depth: 500, height: 600 },
      elevationOffsetMm: 2200,
    };
    const curtain: Prop = {
      id: "prop-curtain",
      floorId: "fl-ground",
      name: "Curtain",
      category: "decor",
      propType: "curtain",
      position: { x: 0, y: 0 },
      rotation: 0,
      dimensions: { width: 2000, depth: 100, height: 2600 },
    };

    expect(isSolidProp(ceilingLight)).toBe(false);
    expect(isSolidProp(curtain)).toBe(false);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);
    const floor = createBaseFloor([], [ceilingLight, curtain]);

    controller.enable({ x: 0, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");
    controller.update(0.3, { floors: [floor], centerOffset });

    // Player passes freely through non-solid ceiling light / curtain
    expect(controller.position.z).toBeLessThan(0.4);
  });

  // 19. Invalid or missing staircase connections handled gracefully
  it("19. handles missing or incomplete staircase safely without exceptions or NaN positions", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const brokenStair: Staircase = {
      id: "stair-broken",
      floorId: "fl-ground",
      name: "Broken Stair",
      stairType: "straight",
      position: { x: 0, y: 0 },
      width: 0, // zero width
      length: 0,
      rotation: 0,
      treadMm: 0,
      riserMm: 0,
      stepCount: 0,
      direction: "up",
    };
    const floor = createBaseFloor([], [], [brokenStair]);

    controller.enable({ x: 0, z: 0 }, 0);
    controller.handleKeyDown("KeyW");

    expect(() => {
      controller.update(0.1, { floors: [floor], centerOffset });
    }).not.toThrow();

    expect(Number.isFinite(controller.position.x)).toBe(true);
    expect(Number.isFinite(controller.position.y)).toBe(true);
    expect(Number.isFinite(controller.position.z)).toBe(true);
  });

  // 20. Correct reset and recovery from an invalid player position
  it("20. recovers gracefully from NaN or corrupt player coordinates", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    controller.enable({ x: 2, z: 2 }, 0);
    // Inject corrupt NaN coordinates
    controller.position.set(NaN, NaN, NaN);

    // Update should detect corruption and recover to last valid position
    controller.update(0.1);

    expect(Number.isFinite(controller.position.x)).toBe(true);
    expect(Number.isFinite(controller.position.y)).toBe(true);
    expect(Number.isFinite(controller.position.z)).toBe(true);
    expect(controller.position.x).toBe(2);
    expect(controller.position.z).toBe(2);
  });

  // 21. Pointer-lock state and enable/disable lifecycle
  it("21. tracks activation and deactivation state cleanly", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    expect(controller.active).toBe(false);
    controller.enable({ x: 1, z: 1 }, 0);
    expect(controller.active).toBe(true);

    controller.disable();
    expect(controller.active).toBe(false);

    // Movement when disabled does nothing
    controller.handleKeyDown("KeyW");
    controller.update(0.5);
    expect(controller.position.x).toBe(1);
    expect(controller.position.z).toBe(1);
  });

  // 22. Mouse-look pitch clamping
  it("22. clamps mouse-look pitch to prevent unnatural disorienting inversion", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);
    controller.enable({ x: 0, z: 0 }, 0);

    // Large vertical mouse move downward
    controller.handleMouseMove(0, 5000);
    expect(controller.pitch).toBeLessThanOrEqual((80 * Math.PI) / 180);

    // Large vertical mouse move upward
    controller.handleMouseMove(0, -10000);
    expect(controller.pitch).toBeGreaterThanOrEqual((-80 * Math.PI) / 180);
  });

  // 23. Preserves canonical wall and furniture models without mutation
  it("23. does not mutate canonical wall, door, or furniture objects during collision resolution", () => {
    const wall = createTestWall("w-freeze", { x: -2000, y: 0 }, { x: 2000, y: 0 }, 200);
    const prop: Prop = {
      id: "prop-freeze",
      floorId: "fl-ground",
      name: "Table",
      category: "dining",
      propType: "dining_table",
      position: { x: 0, y: 0 },
      rotation: 0,
      dimensions: { width: 1000, depth: 1000, height: 750 },
    };

    // Deep freeze canonical objects to guarantee zero mutation
    Object.freeze(wall);
    Object.freeze(wall.start);
    Object.freeze(wall.end);
    Object.freeze(prop);
    Object.freeze(prop.position);
    Object.freeze(prop.dimensions);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);
    const floor = createBaseFloor([wall], [prop]);

    controller.enable({ x: 0, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");

    expect(() => {
      controller.update(0.2, { floors: [floor], centerOffset });
    }).not.toThrow();
  });

  // 24. Structural column collision
  it("24. resolves collision against structural columns using OBB bounds", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const col: StructuralColumn = {
      id: "col-rect",
      floorId: "fl-ground",
      position: { x: 0, y: 0 }, // 400x400 column at (0, 0)
      width: 400,
      depth: 400,
      rotation: 0,
    };
    const floor: Floor = {
      ...createBaseFloor(),
      columns: [col],
    };

    // Half depth = 0.2m, player radius = 0.35m -> minDist = 0.55m
    controller.enable({ x: 0, z: 0.8 }, 0);
    controller.handleKeyDown("KeyW");
    controller.update(0.3, { floors: [floor], centerOffset });

    expect(controller.position.z).toBeGreaterThanOrEqual(0.54);
  });
});
