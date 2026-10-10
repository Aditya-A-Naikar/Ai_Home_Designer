import { describe, it, expect } from "vitest";
import { generateDefaultMepLayout } from "@/core/geometry/mep-generator";
import { Floor } from "@/core/domain/types";
import { FloorSchema } from "@/core/domain/schema";

describe("Phase 10: MEP Schematics (Electrical, Plumbing & Mechanical Engine)", () => {
  const sampleFloor: Floor = {
    id: "fl-ground",
    projectId: "prj-test",
    level: 0,
    name: "Ground Floor",
    elevation: 0,
    height: 3000,
    walls: [],
    rooms: [
      {
        id: "rm-living",
        floorId: "fl-ground",
        name: "Living Room",
        polygon: [
          { x: 0, y: 0 },
          { x: 5000, y: 0 },
          { x: 5000, y: 4000 },
          { x: 0, y: 4000 },
        ],
      },
      {
        id: "rm-bed",
        floorId: "fl-ground",
        name: "Master Bedroom",
        polygon: [
          { x: 5000, y: 0 },
          { x: 9000, y: 0 },
          { x: 9000, y: 4000 },
          { x: 5000, y: 4000 },
        ],
      },
      {
        id: "rm-bath",
        floorId: "fl-ground",
        name: "Ensuite Bathroom",
        polygon: [
          { x: 9000, y: 0 },
          { x: 12000, y: 0 },
          { x: 12000, y: 2500 },
          { x: 9000, y: 2500 },
        ],
      },
      {
        id: "rm-kit",
        floorId: "fl-ground",
        name: "Kitchen",
        polygon: [
          { x: 0, y: 4000 },
          { x: 4000, y: 4000 },
          { x: 4000, y: 7000 },
          { x: 0, y: 7000 },
        ],
      },
    ],
    stairs: [
      {
        id: "stair-1",
        floorId: "fl-ground",
        stairType: "dog_leg",
        position: { x: 3000, y: 3500 },
        width: 1000,
        length: 2600,
        rotation: 0,
        treadMm: 280,
        riserMm: 166.7,
        stepCount: 18,
        direction: "up",
      },
    ],
  };

  it("generates electrical schematic points according to code standards", () => {
    const mep = generateDefaultMepLayout(sampleFloor);

    expect(mep.electricalPoints.length).toBeGreaterThanOrEqual(10);

    // Should include main distribution board on ground floor
    const dbPoint = mep.electricalPoints.find((p) => p.pointType === "distribution_board");
    expect(dbPoint).toBeDefined();

    // Should include ceiling fans in living and bedroom
    const fans = mep.electricalPoints.filter((p) => p.pointType === "fan_ceiling");
    expect(fans.length).toBeGreaterThanOrEqual(2);

    // Should include 2-way switch near staircase
    const twoWay = mep.electricalPoints.find((p) => p.pointType === "stair_two_way");
    expect(twoWay).toBeDefined();
    expect(twoWay?.circuitNumber).toBe("C-STAIR");

    // Should include 16A heavy power points for AC and kitchen appliances
    const power16 = mep.electricalPoints.filter((p) => p.pointType === "power_socket_16a");
    expect(power16.length).toBeGreaterThanOrEqual(2);
  });

  it("generates sanitary and plumbing fixtures for wet spaces", () => {
    const mep = generateDefaultMepLayout(sampleFloor);

    // Bathroom fixtures: WC, basin, shower drain, vertical chase
    const wc = mep.plumbingFixtures.find((p) => p.fixtureType === "water_closet");
    expect(wc).toBeDefined();
    expect(wc?.pipeDiameterMm).toBe(110); // Standard 110mm soil stack

    const sink = mep.plumbingFixtures.find((p) => p.fixtureType === "kitchen_sink");
    expect(sink).toBeDefined();

    const chase = mep.plumbingFixtures.find((p) => p.fixtureType === "vertical_pipe_chase");
    expect(chase).toBeDefined();
    expect(chase?.pipeDiameterMm).toBeGreaterThanOrEqual(110);
  });

  it("generates HVAC points for bedrooms and wet ventilation", () => {
    const mep = generateDefaultMepLayout(sampleFloor);

    // Split AC in master bedroom
    const splitAc = mep.hvacPoints.find((p) => p.hvacType === "split_ac_indoor");
    expect(splitAc).toBeDefined();

    // Exhaust fans in bath and kitchen
    const exhausts = mep.hvacPoints.filter((p) => p.hvacType === "exhaust_fan");
    expect(exhausts.length).toBeGreaterThanOrEqual(2);
  });

  it("produces valid Floor schema with MEP data", () => {
    const mep = generateDefaultMepLayout(sampleFloor);
    const enrichedFloor: Floor = {
      ...sampleFloor,
      electricalPoints: mep.electricalPoints,
      plumbingFixtures: mep.plumbingFixtures,
      hvacPoints: mep.hvacPoints,
    };

    const parseResult = FloorSchema.safeParse(enrichedFloor);
    expect(parseResult.success).toBe(true);
  });
});
