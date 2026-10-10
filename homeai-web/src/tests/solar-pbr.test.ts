import { describe, it, expect } from "vitest";
import { calculateSolarPosition } from "@/core/geometry/solar-study";
import { FLOOR_FINISHES, WALL_FINISHES } from "@/core/geometry/pbr-materials";

describe("Phase 9: Solar Study & True-North Daylighting Engine", () => {
  it("calculates high noon solar position with maximum altitude", () => {
    const result = calculateSolarPosition({
      timeHours: 12.0,
      season: "equinox",
      latitudeDeg: 28.6,
      northAngleDeg: 0,
    });

    expect(result.isDaylight).toBe(true);
    // At equinox noon at 28.6 deg lat, altitude is ~61.4 deg
    expect(result.altitudeDeg).toBeGreaterThan(55);
    expect(result.altitudeDeg).toBeLessThan(65);
    expect(result.sunPosition.y).toBeGreaterThan(35); // Sun high in sky
    expect(result.lightIntensity).toBeGreaterThan(1.2);
    expect(result.timeFormatted).toBe("12:00 PM");
  });

  it("calculates morning golden hour with warm light and low altitude", () => {
    const result = calculateSolarPosition({
      timeHours: 6.5, // 6:30 AM
      season: "equinox",
      latitudeDeg: 28.6,
      northAngleDeg: 0,
    });

    expect(result.timeFormatted).toBe("06:30 AM");
    expect(result.altitudeDeg).toBeLessThan(15);
    if (result.isDaylight) {
      expect(result.colorHex).toBe("#fbbf24"); // Amber gold
    }
  });

  it("handles night hours correctly with zero sunlight", () => {
    const result = calculateSolarPosition({
      timeHours: 23.0, // 11:00 PM
      season: "winter_solstice",
      latitudeDeg: 28.6,
      northAngleDeg: 0,
    });

    expect(result.isDaylight).toBe(false);
    expect(result.altitudeDeg).toBe(0);
    expect(result.timeFormatted).toBe("11:00 PM");
    expect(result.lightIntensity).toBeLessThan(0.1);
  });

  it("respects project True-North orientation angle", () => {
    const northUp = calculateSolarPosition({
      timeHours: 9.0,
      season: "equinox",
      latitudeDeg: 28.6,
      northAngleDeg: 0,
    });

    const eastUp = calculateSolarPosition({
      timeHours: 9.0,
      season: "equinox",
      latitudeDeg: 28.6,
      northAngleDeg: 90,
    });

    // Rotating project north rotates relative azimuth
    expect(eastUp.relativeAzimuthDeg).not.toBe(northUp.relativeAzimuthDeg);
    expect(eastUp.sunPosition.x).not.toBe(northUp.sunPosition.x);
  });

  it("supports seasonal variations (summer vs winter solstice)", () => {
    const summerNoon = calculateSolarPosition({
      timeHours: 12.0,
      season: "summer_solstice",
      latitudeDeg: 28.6,
    });

    const winterNoon = calculateSolarPosition({
      timeHours: 12.0,
      season: "winter_solstice",
      latitudeDeg: 28.6,
    });

    // Summer sun is significantly higher in the sky than winter sun
    expect(summerNoon.altitudeDeg).toBeGreaterThan(winterNoon.altitudeDeg + 35);
  });
});

describe("Phase 9: PBR Architectural Materials", () => {
  it("provides comprehensive floor finishes with physically valid PBR parameters", () => {
    const finishes = Object.values(FLOOR_FINISHES);
    expect(finishes.length).toBeGreaterThanOrEqual(4);

    finishes.forEach((finish) => {
      expect(finish.roughness).toBeGreaterThanOrEqual(0);
      expect(finish.roughness).toBeLessThanOrEqual(1);
      expect(finish.metalness).toBeGreaterThanOrEqual(0);
      expect(finish.metalness).toBeLessThanOrEqual(1);
      expect(finish.name).toBeDefined();
    });

    // Italian marble should have high reflectivity / low roughness and clearcoat
    expect(FLOOR_FINISHES.italian_marble.roughness).toBeLessThan(0.25);
    expect(FLOOR_FINISHES.italian_marble.clearcoat).toBeGreaterThan(0.5);

    // Teak hardwood should have warm wood tone
    expect(FLOOR_FINISHES.teak_hardwood.roughness).toBeGreaterThan(0.4);
  });

  it("provides architectural wall finishes with matte absorption", () => {
    const walls = Object.values(WALL_FINISHES);
    expect(walls.length).toBeGreaterThanOrEqual(3);

    walls.forEach((wall) => {
      expect(wall.roughness).toBeGreaterThan(0.6); // Non-glossy architectural walls
      expect(wall.metalness).toBeLessThan(0.1); // Dielectric plaster / brick
    });
  });
});
