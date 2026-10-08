import { describe, it, expect } from "vitest";
import {
  createStairPreset,
  calculateStairGeometry,
  validateStairCode,
} from "@/core/geometry/stair-utils";
import { Staircase } from "@/core/domain/types";

describe("Staircase Geometry Engine & Code Compliance", () => {
  it("creates an architecturally valid dog-leg stair preset compliant with Blondel formula", () => {
    const stair = createStairPreset("dog_leg", "floor-1");
    expect(stair.stairType).toBe("dog_leg");
    expect(stair.width).toBeGreaterThanOrEqual(2000);
    expect(stair.treadMm).toBeGreaterThanOrEqual(250);
    expect(stair.riserMm).toBeLessThanOrEqual(190);

    const check = validateStairCode(stair);
    expect(check.valid).toBe(true);
    expect(check.blondelValue).toBeGreaterThanOrEqual(600);
    expect(check.blondelValue).toBeLessThanOrEqual(640);
  });

  it("calculates dog-leg stair tread lines and 180-degree walk line", () => {
    const stair = createStairPreset("dog_leg", "floor-1");
    const geom = calculateStairGeometry(stair);

    expect(geom.landing).toBeDefined();
    expect(geom.flight1).toBeDefined();
    expect(geom.flight2).toBeDefined();
    expect(geom.treadLines.length).toBeGreaterThan(6);
    expect(geom.walkLine.points.length).toBe(4);
    expect(geom.outerPolygon.length).toBe(4);
  });

  it("calculates straight stair geometry with break line", () => {
    const stair = createStairPreset("straight", "floor-1");
    const geom = calculateStairGeometry(stair);

    expect(geom.flight1).toBeDefined();
    expect(geom.treadLines.length).toBe(stair.stepCount - 1);
    expect(geom.breakLine).toBeDefined();
    expect(geom.label).toBe("UP");
  });

  it("flags non-compliant stairs violating NBC safety codes", () => {
    const badStair: Staircase = {
      id: "bad-1",
      floorId: "f1",
      stairType: "straight",
      position: { x: 0, y: 0 },
      width: 700, // too narrow (< 900mm)
      length: 2000,
      rotation: 0,
      treadMm: 200, // too shallow (< 250mm)
      riserMm: 220, // dangerously steep (> 190mm)
      stepCount: 10,
      direction: "up",
    };

    const check = validateStairCode(badStair);
    expect(check.valid).toBe(false);
    expect(check.issues.length).toBeGreaterThanOrEqual(3);
    expect(check.issues.some((i) => i.includes("Tread"))).toBe(true);
    expect(check.issues.some((i) => i.includes("Riser"))).toBe(true);
    expect(check.issues.some((i) => i.includes("width"))).toBe(true);
  });
});
