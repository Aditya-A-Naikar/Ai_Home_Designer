import { describe, it, expect } from "vitest";
import { calculateProjectBOQ } from "@/core/geometry/boq-calculator";
import { Project } from "@/core/domain/types";

describe("Phase 11: Bill of Quantities (BOQ), Material Takeoff & Cost Estimator", () => {
  const sampleProject: Project = {
    schemaVersion: 1,
    id: "prj-boq-test",
    name: "Modern Duplex Villa",
    plotDimensions: { width: 15000, depth: 12000 },
    settings: {
      unitSystem: "metric",
      preferredUnit: "m",
      gridSize: 100,
      snapTolerance: 10,
      defaultWallThickness: 200,
      defaultCeilingHeight: 3000,
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
    activeFloorId: "fl-1",
    floors: [
      {
        id: "fl-1",
        projectId: "prj-boq-test",
        level: 0,
        name: "Ground Floor",
        elevation: 0,
        height: 3000,
        rooms: [
          {
            id: "rm-1",
            floorId: "fl-1",
            name: "Living Room",
            polygon: [
              { x: 0, y: 0 },
              { x: 6000, y: 0 },
              { x: 6000, y: 5000 },
              { x: 0, y: 5000 },
            ],
          },
          {
            id: "rm-2",
            floorId: "fl-1",
            name: "Kitchen",
            polygon: [
              { x: 6000, y: 0 },
              { x: 10000, y: 0 },
              { x: 10000, y: 5000 },
              { x: 6000, y: 5000 },
            ],
          },
        ],
        walls: [
          {
            id: "w-1",
            floorId: "fl-1",
            start: { x: 0, y: 0 },
            end: { x: 10000, y: 0 },
            thickness: 200,
            doors: [
              {
                id: "d-1",
                wallId: "w-1",
                floorId: "fl-1",
                offset: 2000,
                width: 1000,
                height: 2100,
                swingDirection: "inward_right",
              },
            ],
            windows: [
              {
                id: "win-1",
                wallId: "w-1",
                floorId: "fl-1",
                offset: 6000,
                width: 1500,
                height: 1200,
                sillHeight: 900,
              },
            ],
          },
        ],
        stairs: [
          {
            id: "stair-1",
            floorId: "fl-1",
            stairType: "dog_leg",
            position: { x: 2000, y: 2000 },
            width: 1000,
            length: 2500,
            rotation: 0,
            treadMm: 280,
            riserMm: 166.7,
            stepCount: 18,
            direction: "up",
          },
        ],
        columns: [
          {
            id: "col-1",
            floorId: "fl-1",
            position: { x: 0, y: 0 },
            width: 300,
            depth: 450,
            rotation: 0,
          },
        ],
      },
    ],
  };

  it("calculates accurate floor area metrics and RCC concrete takeoff", () => {
    const boq = calculateProjectBOQ(sampleProject, "standard", "INR");

    // 30m² + 20m² = 50m² carpet area
    expect(boq.carpetAreaM2).toBe(50);
    expect(boq.builtUpAreaM2).toBeGreaterThanOrEqual(50);

    // Concrete volume should account for 150mm slab + column
    expect(boq.concreteVolumeM3).toBeGreaterThan(7.5);
    // Steel rebar should be calculated at ~85kg per m³
    expect(boq.steelRebarKg).toBeGreaterThan(600);
  });

  it("deducts openings from gross masonry volume accurately", () => {
    const boq = calculateProjectBOQ(sampleProject, "standard", "INR");

    // Wall 1 is 10m long, 3m high, 0.2m thick = 6.0 m³ gross
    // Door is 1.0m x 2.1m x 0.2m = 0.42 m³
    // Window is 1.5m x 1.2m x 0.2m = 0.36 m³
    // Expected net = 6.0 - 0.78 = 5.22 m³
    expect(boq.masonryVolumeM3).toBeCloseTo(5.22, 1);
    expect(boq.brickCountNos).toBeGreaterThan(2500); // 500 bricks per m³
  });

  it("dynamically recalculates costs when switching between economy, standard, and premium tiers", () => {
    const economy = calculateProjectBOQ(sampleProject, "economy", "INR");
    const standard = calculateProjectBOQ(sampleProject, "standard", "INR");
    const premium = calculateProjectBOQ(sampleProject, "premium", "INR");

    expect(standard.grandTotal).toBeGreaterThan(economy.grandTotal);
    expect(premium.grandTotal).toBeGreaterThan(standard.grandTotal);

    // Should include 5% contingency
    expect(standard.contingencyAmount).toBeCloseTo(standard.subtotal * 0.05, 1);
    expect(standard.grandTotal).toBeCloseTo(standard.subtotal + standard.contingencyAmount, 1);
  });

  it("correctly converts prices across currencies (USD, EUR, GBP)", () => {
    const inr = calculateProjectBOQ(sampleProject, "standard", "INR");
    const usd = calculateProjectBOQ(sampleProject, "standard", "USD");
    const eur = calculateProjectBOQ(sampleProject, "standard", "EUR");

    expect(usd.currency).toBe("USD");
    expect(eur.currency).toBe("EUR");

    // USD total should be approximately INR / 86.5
    expect(Math.abs(usd.grandTotal - inr.grandTotal / 86.5)).toBeLessThan(5);
  });
});
