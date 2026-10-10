import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { WalkthroughController } from "@/core/geometry/walkthrough-controller";
import { Room, Floor, Wall } from "@/core/domain/types";
import { createStairPreset } from "@/core/geometry/stair-utils";

describe("Phase 11: First-Person 3D Walkthrough Controller", () => {
  it("initializes at standard human eye height of 1.65m", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    controller.enable({ x: 2, z: 3 }, 0);
    expect(controller.position.y).toBe(1.65);
    expect(camera.position.x).toBe(2);
    expect(camera.position.z).toBe(3);
  });

  it("moves forward when W key is pressed", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    controller.enable({ x: 0, z: 0 }, 0);
    controller.handleKeyDown("KeyW");

    // Update with 1 second delta
    controller.update(1.0);

    // Initial yaw = 0 means forward is -Z
    expect(controller.position.z).toBeLessThan(0);
    expect(controller.position.y).toBe(1.65); // Eye height preserved
  });

  it("clamps vertical pitch to prevent unnatural gimbal flips", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    controller.enable({ x: 0, z: 0 }, 0);
    // Simulate severe mouse movements
    controller.handleMouseMove(0, 10000); // look down
    expect(controller.pitch).toBeLessThanOrEqual((80 * Math.PI) / 180);

    controller.handleMouseMove(0, -20000); // look up
    expect(controller.pitch).toBeGreaterThanOrEqual((-80 * Math.PI) / 180);
  });

  it("detects current room occupancy correctly", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const rooms: Room[] = [
      {
        id: "rm-living",
        floorId: "fl-1",
        name: "Living Room",
        polygon: [
          { x: 0, y: 0 },
          { x: 5000, y: 0 },
          { x: 5000, y: 4000 },
          { x: 0, y: 4000 },
        ],
      },
      {
        id: "rm-kitchen",
        floorId: "fl-1",
        name: "Kitchen",
        polygon: [
          { x: 5000, y: 0 },
          { x: 9000, y: 0 },
          { x: 9000, y: 4000 },
          { x: 5000, y: 4000 },
        ],
      },
    ];

    const centerOffset = { x: 4.5, z: 2.0 };

    // Point inside living room: (2000, 2000) mm -> 3D position = (2 - 4.5, 2 - 2) = (-2.5, 0)
    controller.enable({ x: -2.5, z: 0 }, 0);
    const detectedRoom = controller.getCurrentRoom(rooms, centerOffset);
    expect(detectedRoom).toBe("Living Room");
  });

  it("climbs staircases dynamically updating eye height", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    const stair = createStairPreset("dog_leg", "fl-1", { x: 0, y: 0 });
    const floor: Floor = {
      id: "fl-1",
      projectId: "proj-1",
      level: 0,
      name: "Ground Floor",
      elevation: 0,
      height: 2800,
      walls: [],
      rooms: [],
      stairs: [stair],
    };

    const centerOffset = { x: 0, z: 0 };
    // Start at bottom of Flight 1: x = 0.5m, z = stair.length/1000 - 0.2m
    const initialZ = stair.length / 1000 - 0.2;
    controller.enable({ x: 0.5, z: initialZ }, 0);
    expect(controller.position.y).toBe(1.65);

    // Update with stair context
    controller.update(0.5, {
      floors: [floor],
      centerOffset,
    });

    // Eye height should now be above base eye height 1.65m
    expect(controller.position.y).toBeGreaterThan(1.65);
  });

  it("prevents passing through solid walls while sliding smoothly", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    // Solid wall along X axis from (-5, 0) to (5, 0) at Z = 0
    const wall: Wall = {
      id: "w-solid",
      floorId: "fl-1",
      start: { x: -5000, y: 0 },
      end: { x: 5000, y: 0 },
      thickness: 200,
      doors: [],
      windows: [],
    };

    const floor: Floor = {
      id: "fl-1",
      projectId: "proj-1",
      level: 0,
      name: "Ground Floor",
      elevation: 0,
      height: 2800,
      walls: [wall],
      rooms: [],
    };

    const centerOffset = { x: 0, z: 0 };
    // Player starts at (0, 0.5) and tries to walk forward into wall at Z=0
    controller.enable({ x: 0, z: 0.5 }, 0);
    // Face directly towards wall (forward is -Z, yaw = 0)
    controller.handleKeyDown("KeyW");

    controller.update(0.5, {
      floors: [floor],
      centerOffset,
    });

    // Minimum distance from wall center: playerRadius (0.35) + wallThickness/2 (0.1) = 0.45m
    expect(controller.position.z).toBeGreaterThanOrEqual(0.44);
  });

  it("allows walking through open doorways without collision blockage", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const controller = new WalkthroughController(camera);

    // Wall with door in the center: from (-5000, 0) to (5000, 0) (length 10000mm, door offset 5000mm)
    const wallWithDoor: Wall = {
      id: "w-door",
      floorId: "fl-1",
      start: { x: -5000, y: 0 },
      end: { x: 5000, y: 0 },
      thickness: 200,
      doors: [
        {
          id: "d-1",
          wallId: "w-door",
          floorId: "fl-1",
          offset: 5000, // center of wall
          width: 1200,
          height: 2100,
          swingDirection: "inward_left",
        },
      ],
      windows: [],
    };

    const floor: Floor = {
      id: "fl-1",
      projectId: "proj-1",
      level: 0,
      name: "Ground Floor",
      elevation: 0,
      height: 2800,
      walls: [wallWithDoor],
      rooms: [],
    };

    const centerOffset = { x: 0, z: 0 };
    // Player starts at (0, 0.5) aligned with doorway (x=0 is offset 5000) and walks through
    controller.enable({ x: 0, z: 0.5 }, 0);
    controller.handleKeyDown("KeyW");

    controller.update(0.5, {
      floors: [floor],
      centerOffset,
    });

    // Player passes through the doorway to Z < 0.4m
    expect(controller.position.z).toBeLessThan(0.4);
  });
});
