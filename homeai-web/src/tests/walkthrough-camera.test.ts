import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { WalkthroughController } from "@/core/geometry/walkthrough-controller";
import { Room } from "@/core/domain/types";

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
});
