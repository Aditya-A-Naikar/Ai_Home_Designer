import { describe, it, expect } from "vitest";
import { generateFloorDxf } from "@/core/export/dxf-exporter";
import { Project } from "@/core/domain/types";

describe("Phase 12: AutoCAD DXF Exporter", () => {
  const sampleProject: Project = {
    schemaVersion: 1,
    id: "prj-dxf",
    name: "Eco Villa CAD",
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
        projectId: "prj-dxf",
        level: 0,
        name: "Ground Floor",
        elevation: 0,
        height: 3000,
        walls: [
          {
            id: "w-1",
            floorId: "fl-1",
            start: { x: 0, y: 0 },
            end: { x: 8000, y: 0 },
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
                offset: 5000,
                width: 1500,
                height: 1200,
                sillHeight: 900,
              },
            ],
          },
        ],
        rooms: [
          {
            id: "rm-1",
            floorId: "fl-1",
            name: "Living Area",
            polygon: [
              { x: 0, y: 0 },
              { x: 6000, y: 0 },
              { x: 6000, y: 5000 },
              { x: 0, y: 5000 },
            ],
          },
        ],
        stairs: [
          {
            id: "st-1",
            floorId: "fl-1",
            stairType: "straight",
            position: { x: 3000, y: 3000 },
            width: 1000,
            length: 2800,
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

  it("generates valid AutoCAD R12 ASCII DXF structure", () => {
    const dxf = generateFloorDxf(sampleProject, "fl-1");

    expect(dxf).toContain("SECTION\n  2\nHEADER");
    expect(dxf).toContain("$ACADVER\n  1\nAC1009");
    expect(dxf).toContain("$INSUNITS\n 70\n4"); // Millimeters
    expect(dxf).toContain("SECTION\n  2\nTABLES");
    expect(dxf).toContain("WALLS_EXTERIOR");
    expect(dxf).toContain("DOORS");
    expect(dxf).toContain("WINDOWS");
    expect(dxf).toContain("STAIRS");
    expect(dxf).toContain("COLUMNS");
    expect(dxf).toContain("ROOM_POLYGONS");
    expect(dxf).toContain("SECTION\n  2\nENTITIES");
    expect(dxf).toContain("EOF");
  });

  it("includes wall lines, openings, and calculated room areas", () => {
    const dxf = generateFloorDxf(sampleProject, "fl-1");

    // Wall line from 0,0 to 8000,0
    expect(dxf).toContain("8000.000");
    // Door diameter & label
    expect(dxf).toContain("D: 1000mm");
    // Window label
    expect(dxf).toContain("W: 1500x1200");
    // Room label and area text (30.0 SQ.M)
    expect(dxf).toContain("LIVING AREA");
    expect(dxf).toContain("30.0 SQ.M");
  });
});
