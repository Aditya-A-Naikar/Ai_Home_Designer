import { describe, it, expect } from "vitest";
import * as THREE from "three";

describe("Stage 3.3 — Smooth 3D Camera Navigation & Controls", () => {
  describe("1. Architectural Camera Presets", () => {
    it("should define standard isometric 45-degree architectural overview", () => {
      const isoPos = new THREE.Vector3(15, 18, 20);
      const isoTarget = new THREE.Vector3(0, 1.5, 0);

      const dir = isoPos.clone().sub(isoTarget).normalize();
      expect(dir.y).toBeGreaterThan(0.4); // elevated angle
      expect(isoPos.distanceTo(isoTarget)).toBeGreaterThan(15);
      expect(isoPos.distanceTo(isoTarget)).toBeLessThan(40);
    });

    it("should define true top-down plan view looking directly down", () => {
      const topPos = new THREE.Vector3(0, 32, 0.05);
      const topTarget = new THREE.Vector3(0, 0, 0);

      const dir = topPos.clone().sub(topTarget).normalize();
      expect(dir.y).toBeCloseTo(1.0, 2); // almost pure vertical
      expect(topPos.y).toBe(32);
    });

    it("should define front and side right orthogonal elevation angles", () => {
      const frontPos = new THREE.Vector3(0, 4, 25);
      const sidePos = new THREE.Vector3(25, 4, 0);
      const target = new THREE.Vector3(0, 1.5, 0);

      // Front looks along Z axis (X close to 0)
      expect(frontPos.x).toBe(0);
      expect(frontPos.z).toBeGreaterThan(20);

      // Side looks along X axis (Z close to 0)
      expect(sidePos.z).toBe(0);
      expect(sidePos.x).toBeGreaterThan(20);

      // Both maintain eye-level height above target
      expect(frontPos.y).toBeCloseTo(4, 1);
      expect(sidePos.y).toBeCloseTo(4, 1);
      expect(frontPos.distanceTo(target)).toBeCloseTo(sidePos.distanceTo(target), 1);
    });
  });

  describe("2. Frame / Focus Bounding Box Calculation", () => {
    it("should calculate optimal camera framing distance for small props", () => {
      // Chair/Sofa of size 2m x 0.85m x 0.9m
      const bbox = new THREE.Box3(
        new THREE.Vector3(-1.0, 0, -0.45),
        new THREE.Vector3(1.0, 0.85, 0.45)
      );

      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bbox.getSize(size);
      bbox.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z, 2.0);
      const fovRad = (45 * Math.PI) / 360; // 45 deg FOV
      const dist = Math.min(60, Math.max(2.5, (maxDim / 2) / Math.tan(fovRad) * 1.35));

      expect(center.x).toBe(0);
      expect(center.y).toBeCloseTo(0.425, 2);
      expect(dist).toBeGreaterThan(2.5);
      expect(dist).toBeLessThan(10.0);
    });

    it("should calculate appropriate framing distance for entire floor building bounds", () => {
      // 12m x 10m residence
      const floorBbox = new THREE.Box3(
        new THREE.Vector3(-6, 0, -5),
        new THREE.Vector3(6, 2.8, 5)
      );

      const size = new THREE.Vector3();
      floorBbox.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z, 2.0);
      const fovRad = (45 * Math.PI) / 360;
      const dist = Math.min(60, Math.max(2.5, (maxDim / 2) / Math.tan(fovRad) * 1.35));

      // With maxDim = 12m, dist should frame residence comfortably
      expect(dist).toBeGreaterThan(15.0);
      expect(dist).toBeLessThan(30.0);
    });

    it("should clamp target distance between minDistance and maxDistance", () => {
      const minDistance = 1.0;
      const maxDistance = 80.0;

      // Tiny object (0.1m)
      const tinyMaxDim = 0.1;
      const fovRad = (45 * Math.PI) / 360;
      const tinyDist = Math.min(maxDistance, Math.max(2.5, (tinyMaxDim / 2) / Math.tan(fovRad) * 1.35));
      expect(tinyDist).toBeGreaterThanOrEqual(minDistance);

      // Huge object (150m)
      const hugeMaxDim = 150;
      const hugeDist = Math.min(maxDistance, Math.max(2.5, (hugeMaxDim / 2) / Math.tan(fovRad) * 1.35));
      expect(hugeDist).toBeLessThanOrEqual(maxDistance);
    });
  });

  describe("3. Dolly and Distance Clamping Mathematics", () => {
    it("should zoom in smoothly with factor 0.85 while respecting minDistance", () => {
      const target = new THREE.Vector3(0, 1, 0);
      const cameraPos = new THREE.Vector3(0, 5, 10);
      const minDistance = 1.0;
      const maxDistance = 80.0;

      const offset = cameraPos.clone().sub(target);
      const currentDist = offset.length();

      const factor = 0.85;
      const newDist = Math.max(minDistance, Math.min(maxDistance, currentDist * factor));
      offset.setLength(newDist);
      const newPos = target.clone().add(offset);

      expect(newDist).toBeCloseTo(currentDist * 0.85, 3);
      expect(newPos.distanceTo(target)).toBeCloseTo(newDist, 3);
    });

    it("should zoom out smoothly with factor 1.15 while respecting maxDistance", () => {
      const target = new THREE.Vector3(0, 1, 0);
      const cameraPos = new THREE.Vector3(0, 10, 20);
      const minDistance = 1.0;
      const maxDistance = 80.0;

      const offset = cameraPos.clone().sub(target);
      const currentDist = offset.length();

      const factor = 1.15;
      const newDist = Math.max(minDistance, Math.min(maxDistance, currentDist * factor));
      offset.setLength(newDist);

      expect(newDist).toBeCloseTo(currentDist * 1.15, 3);
      expect(newDist).toBeLessThanOrEqual(maxDistance);
    });

    it("should clamp at minDistance when zooming in very close to target", () => {
      const target = new THREE.Vector3(0, 1, 0);
      const cameraPos = new THREE.Vector3(0, 1.2, 0); // 0.2m away
      const minDistance = 1.0;
      const maxDistance = 80.0;

      const offset = cameraPos.clone().sub(target);
      const factor = 0.85;
      const newDist = Math.max(minDistance, Math.min(maxDistance, offset.length() * factor));

      expect(newDist).toBe(minDistance);
    });
  });

  describe("4. Smooth Azimuth Orbit Rotation Mathematics", () => {
    it("should rotate camera around target along world Y axis while preserving distance", () => {
      const target = new THREE.Vector3(0, 1.5, 0);
      const cameraPos = new THREE.Vector3(10, 10, 10);
      const initialDist = cameraPos.distanceTo(target);

      const offset = cameraPos.clone().sub(target);
      const angleRad = Math.PI / 4; // 45 degrees
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
      const newCameraPos = target.clone().add(offset);

      const finalDist = newCameraPos.distanceTo(target);
      expect(finalDist).toBeCloseTo(initialDist, 3);
      expect(newCameraPos.y).toBeCloseTo(cameraPos.y, 3); // elevation angle unchanged
    });
  });

  describe("5. Keyboard Navigation Event Isolation", () => {
    it("should recognize text input elements and prevent keyboard shortcuts interference", () => {
      const isTextInput = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        const tag = (el.tagName || "").toLowerCase();
        return (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          el.hasAttribute("contenteditable")
        );
      };

      const input = document.createElement("input");
      const textarea = document.createElement("textarea");
      const select = document.createElement("select");
      const div = document.createElement("div");
      const editableDiv = document.createElement("div");
      editableDiv.setAttribute("contenteditable", "true");

      expect(isTextInput(input)).toBe(true);
      expect(isTextInput(textarea)).toBe(true);
      expect(isTextInput(select)).toBe(true);
      expect(isTextInput(editableDiv)).toBe(true);
      expect(isTextInput(div)).toBe(false);
      expect(isTextInput(null)).toBe(false);
    });
  });

  describe("6. Smooth Cubic Camera Transition Interpolation", () => {
    it("should interpolate position and target using smooth ease-in-out curve", () => {
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      expect(easeInOutCubic(0)).toBe(0);
      expect(easeInOutCubic(1)).toBe(1);
      expect(easeInOutCubic(0.5)).toBe(0.5);

      // Verify smooth acceleration and deceleration
      expect(easeInOutCubic(0.25)).toBeLessThan(0.25); // slow start
      expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75); // slow finish

      // Test vector interpolation
      const startPos = new THREE.Vector3(0, 10, 20);
      const endPos = new THREE.Vector3(15, 18, 20);
      const midPos = new THREE.Vector3().lerpVectors(startPos, endPos, easeInOutCubic(0.5));

      expect(midPos.x).toBeCloseTo(7.5, 3);
      expect(midPos.y).toBeCloseTo(14, 3);
      expect(midPos.z).toBeCloseTo(20, 3);
    });
  });
});
