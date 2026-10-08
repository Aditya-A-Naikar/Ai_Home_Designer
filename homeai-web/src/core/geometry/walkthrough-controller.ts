import * as THREE from "three";
import { Point2D, Room } from "@/core/domain/types";
import { isPointInPolygon } from "./room-utils";

/**
 * Phase 11: Architectural First-Person 3D Walkthrough Controller
 * Handles WASD / Arrow keyboard navigation, mouse-look rotation, eye-height positioning,
 * and real-time room occupancy detection.
 */

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

  private keys: { [key: string]: boolean } = {};
  private activeFloorElevationM: number = 0;
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

  public update(deltaSeconds: number, bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }): void {
    if (!this.isEnabled) return;

    const speed = (this.isSprint ? this.sprintSpeed : this.walkSpeed) * deltaSeconds;

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
      moveVector.normalize().multiplyScalar(speed);
      this.position.add(moveVector);
    }

    // Lock eye height to active floor elevation datum
    this.position.y = this.activeFloorElevationM + this.eyeHeightM;

    // Constrain position to plot boundaries if provided
    if (bounds) {
      this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));
      this.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, this.position.z));
    }

    // Apply to camera
    this.camera.position.copy(this.position);

    // Apply rotation order YXZ
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * Identifies which room the user is currently standing inside
   */
  public getCurrentRoom(rooms: Room[], centerOffset: { x: number; z: number }): string | null {
    if (!this.isEnabled || !rooms.length) return null;

    // Convert 3D world meters back to floor plan millimeters
    const pxMm = (this.position.x + centerOffset.x) * 1000;
    const pyMm = (this.position.z + centerOffset.z) * 1000;
    const point: Point2D = { x: pxMm, y: pyMm };

    for (const room of rooms) {
      if (room.polygon && room.polygon.length >= 3) {
        if (isPointInPolygon(point, room.polygon)) {
          return room.name;
        }
      }
    }
    return null;
  }
}
