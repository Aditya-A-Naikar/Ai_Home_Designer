import * as THREE from "three";
import { Point2D, Room, Floor } from "@/core/domain/types";
import { isPointInPolygon } from "./room-utils";
import { getStairSurfaceElevation } from "./stair-utils";

/**
 * Phase 11 & Phase 17: Architectural First-Person 3D Walkthrough Controller
 * Handles WASD / Arrow keyboard navigation, mouse-look rotation, eye-height positioning,
 * real-time room occupancy detection, wall collision avoidance, and multi-storey stair climbing.
 */

export interface WalkthroughOptions {
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
  floors?: Floor[];
  centerOffset?: { x: number; z: number };
}

export interface WalkthroughState {
  isWalking: boolean;
  position: { x: number; y: number; z: number };
  yaw: number; // in radians
  pitch: number; // in radians
  currentRoomName: string | null;
}

export class WalkthroughController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public yaw: number = 0;
  public pitch: number = 0;
  public eyeHeightM: number = 1.65; // Human eye level: 1650mm
  public walkSpeed: number = 3.2; // meters/second
  public sprintSpeed: number = 6.0; // meters/second
  public isSprint: boolean = false;
  public playerRadiusM: number = 0.35; // Player collision radius

  private keys: { [key: string]: boolean } = {};
  public activeFloorElevationM: number = 0;
  private isEnabled: boolean = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, this.eyeHeightM, 0);
  }

  public enable(initialPosition?: { x: number; z: number }, floorElevationM: number = 0): void {
    this.isEnabled = true;
    this.activeFloorElevationM = floorElevationM;
    if (initialPosition) {
      this.position.set(initialPosition.x, floorElevationM + this.eyeHeightM, initialPosition.z);
    } else {
      this.position.set(0, floorElevationM + this.eyeHeightM, 0);
    }
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
  }

  public disable(): void {
    this.isEnabled = false;
    this.keys = {};
  }

  public handleKeyDown(code: string): void {
    if (!this.isEnabled) return;
    this.keys[code] = true;
    if (code === "ShiftLeft" || code === "ShiftRight") {
      this.isSprint = true;
    }
  }

  public handleKeyUp(code: string): void {
    if (!this.isEnabled) return;
    this.keys[code] = false;
    if (code === "ShiftLeft" || code === "ShiftRight") {
      this.isSprint = false;
    }
  }

  public handleMouseMove(deltaX: number, deltaY: number, sensitivity: number = 0.0025): void {
    if (!this.isEnabled) return;
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;

    // Clamp pitch between -80 deg and +80 deg (prevent gimbal lock / backflips)
    const maxPitch = (80 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public update(
    deltaSeconds: number,
    options?: { minX?: number; maxX?: number; minZ?: number; maxZ?: number } | WalkthroughOptions
  ): void {
    if (!this.isEnabled) return;

    const totalSpeed = (this.isSprint ? this.sprintSpeed : this.walkSpeed) * deltaSeconds;

    // Calculate forward & right movement vectors from yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveVector = new THREE.Vector3(0, 0, 0);

    if (this.keys["KeyW"] || this.keys["ArrowUp"]) {
      moveVector.add(forward);
    }
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) {
      moveVector.sub(forward);
    }
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) {
      moveVector.sub(right);
    }
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) {
      moveVector.add(right);
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
    }

    const floors = (options as WalkthroughOptions)?.floors;
    const centerOffset = (options as WalkthroughOptions)?.centerOffset || { x: 0, z: 0 };

    // Substepping prevents tunneling through walls for large timesteps
    const substeps = Math.max(1, Math.ceil(deltaSeconds / 0.05));
    const subSpeed = totalSpeed / substeps;

    for (let s = 0; s < substeps; s++) {
      if (moveVector.lengthSq() > 0) {
        this.position.x += moveVector.x * subSpeed;
        this.position.z += moveVector.z * subSpeed;
      }

      // --- Wall Collision Detection & Sliding per substep ---
      if (floors && floors.length > 0) {
        const currentFloor =
          floors.find((f) => Math.abs((f.elevation || 0) / 1000 - this.activeFloorElevationM) < 0.5) ||
          floors[0];

        if (currentFloor?.walls) {
          for (const wall of currentFloor.walls) {
            const sx = wall.start.x / 1000 - centerOffset.x;
            const sz = wall.start.y / 1000 - centerOffset.z;
            const ex = wall.end.x / 1000 - centerOffset.x;
            const ez = wall.end.y / 1000 - centerOffset.z;

            const wdx = ex - sx;
            const wdz = ez - sz;
            const segLenSq = wdx * wdx + wdz * wdz;
            if (segLenSq < 0.01) continue;

            const t = Math.max(
              0,
              Math.min(1, ((this.position.x - sx) * wdx + (this.position.z - sz) * wdz) / segLenSq)
            );
            const closestX = sx + t * wdx;
            const closestZ = sz + t * wdz;

            const distX = this.position.x - closestX;
            const distZ = this.position.z - closestZ;
            const dist = Math.hypot(distX, distZ);

            const wallThicknessM = (wall.thickness || 150) / 1000;
            const minDistance = this.playerRadiusM + wallThicknessM / 2;

            if (dist < minDistance && dist > 0.0001) {
              const wallLengthM = Math.sqrt(segLenSq);
              const playerOffsetOnWallM = t * wallLengthM;
              const inDoorway = wall.doors?.some((d) => {
                const doorOffsetM = d.offset / 1000;
                const doorHalfWidthM = (d.width / 1000) / 2;
                return Math.abs(playerOffsetOnWallM - doorOffsetM) <= doorHalfWidthM;
              });

              if (!inDoorway) {
                const overlap = minDistance - dist;
                this.position.x += (distX / dist) * overlap;
                this.position.z += (distZ / dist) * overlap;
              }
            }
          }
        }
      }
    }

    // --- Vertical Circulation & Stair Climbing Detection ---
    let onStair = false;
    let targetSurfaceElevationM = this.activeFloorElevationM;

    if (floors && floors.length > 0) {
      for (const floor of floors) {
        const floorElevM = (floor.elevation || 0) / 1000;
        const floorHeightM = (floor.height || 2800) / 1000;

        if (floor.stairs && floor.stairs.length > 0) {
          for (const st of floor.stairs) {
            const stairInfo = getStairSurfaceElevation(
              st,
              this.position.x,
              this.position.z,
              centerOffset,
              floorElevM,
              floorHeightM
            );

            if (stairInfo.inside) {
              onStair = true;
              targetSurfaceElevationM = stairInfo.elevationM;
              if (targetSurfaceElevationM >= floorElevM + floorHeightM * 0.75) {
                this.activeFloorElevationM = floorElevM + floorHeightM;
              } else if (targetSurfaceElevationM <= floorElevM + floorHeightM * 0.25) {
                this.activeFloorElevationM = floorElevM;
              }
              break;
            }
          }
        }
        if (onStair) break;
      }

      if (!onStair) {
        let bestElev = 0;
        for (const floor of floors) {
          const elev = (floor.elevation || 0) / 1000;
          if (this.position.y - this.eyeHeightM >= elev - 0.2) {
            if (elev > bestElev) bestElev = elev;
          }
        }
        targetSurfaceElevationM = bestElev;
        this.activeFloorElevationM = bestElev;
      }
    }

    // Smooth vertical progression (smooth stair steps & gravity lock)
    const targetY = targetSurfaceElevationM + this.eyeHeightM;
    const verticalBlend = Math.min(1, deltaSeconds * 12);
    this.position.y += (targetY - this.position.y) * verticalBlend;

    // Constrain position to plot boundaries if provided
    if (options) {
      if (typeof options.minX === "number") this.position.x = Math.max(options.minX, this.position.x);
      if (typeof options.maxX === "number") this.position.x = Math.min(options.maxX, this.position.x);
      if (typeof options.minZ === "number") this.position.z = Math.max(options.minZ, this.position.z);
      if (typeof options.maxZ === "number") this.position.z = Math.min(options.maxZ, this.position.z);
    }

    // Apply to camera
    this.camera.position.copy(this.position);

    // Apply rotation order YXZ
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * Identifies which room the user is currently standing inside across levels
   */
  public getCurrentRoom(
    rooms: Room[],
    centerOffset: { x: number; z: number },
    allFloors?: Floor[]
  ): string | null {
    if (!this.isEnabled) return null;

    let searchRooms = rooms;
    if (allFloors && allFloors.length > 0) {
      // Find floor closest to current player height
      const matchingFloor = allFloors.reduce((prev, curr) => {
        const prevDiff = Math.abs((prev.elevation || 0) / 1000 - this.activeFloorElevationM);
        const currDiff = Math.abs((curr.elevation || 0) / 1000 - this.activeFloorElevationM);
        return currDiff < prevDiff ? curr : prev;
      });
      if (matchingFloor && matchingFloor.rooms?.length > 0) {
        searchRooms = matchingFloor.rooms;
      }
    }

    if (!searchRooms || !searchRooms.length) return null;

    // Convert 3D world meters back to floor plan millimeters
    const pxMm = (this.position.x + centerOffset.x) * 1000;
    const pyMm = (this.position.z + centerOffset.z) * 1000;
    const point: Point2D = { x: pxMm, y: pyMm };

    for (const room of searchRooms) {
      if (room.polygon && room.polygon.length >= 3) {
        if (isPointInPolygon(point, room.polygon)) {
          return room.name;
        }
      }
    }
    return null;
  }
}
