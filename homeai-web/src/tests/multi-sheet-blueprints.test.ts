import { describe, it, expect } from "vitest";
import { generatePermittingBlueprintPackage } from "@/core/export/multi-sheet-blueprint-generator";
import { Project } from "@/core/domain/types";

describe("Phase 12: Multi-Sheet Production Permitting Blueprint Package", () => {
  const sampleProject: Project = {
    schemaVersion: 1,
    id: "prj-sheets-test",
    name: "Skyline Villa Duplex",
    plotDimensions: { width: 16000, depth: 14000 },
    siteContext: {
      roadFacing: "N",
      northAngleDegrees: 0,
      setbacks: { front: 3000, rear: 1500, left: 1500, right: 1500 },
    },
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
    activeFloorId: "fl-g",
    floors: [
      {
        id: "fl-g",
        projectId: "prj-sheets-test",
        level: 0,
        name: "Ground Floor",
        elevation: 0,
        height: 3000,
        rooms: [
          {
            id: "rm-1",
            floorId: "fl-g",
            name: "Grand Living Room",
            polygon: [
              { x: 0, y: 0 },
              { x: 6000, y: 0 },
              { x: 6000, y: 5000 },
              { x: 0, y: 5000 },
            ],
          },
        ],
        walls: [
          {
            id: "w-1",
            floorId: "fl-g",
            start: { x: 0, y: 0 },
            end: { x: 6000, y: 0 },
            thickness: 200,
            doors: [
              {
                id: "d-1",
                wallId: "w-1",
                floorId: "fl-g",
                offset: 2000,
                width: 1000,
                height: 2100,
                swingDirection: "inward_right",
              },
            ],
            windows: [],
          },
        ],
        stairs: [
          {
            id: "st-1",
            floorId: "fl-g",
            stairType: "dog_leg",
            position: { x: 2000, y: 2000 },
            width: 1000,
            length: 2600,
            rotation: 0,
            treadMm: 280,
            riserMm: 166.7,
            stepCount: 18,
            direction: "up",
          },
        ],
      },
      {
        id: "fl-1",
        projectId: "prj-sheets-test",
        level: 1,
        name: "First Floor",
        elevation: 3000,
        height: 3000,
        rooms: [
          {
            id: "rm-2",
            floorId: "fl-1",
            name: "Master Suite",
            polygon: [
              { x: 0, y: 0 },
              { x: 5000, y: 0 },
              { x: 5000, y: 4000 },
              { x: 0, y: 4000 },
            ],
          },
        ],
        walls: [],
      },
    ],
  };

  it("generates a complete 5-sheet permitting package", () => {
    const sheets = generatePermittingBlueprintPackage(sampleProject);

    expect(sheets.length).toBe(5);

    const sheetNumbers = sheets.map((s) => s.sheetNumber);
    expect(sheetNumbers).toEqual(["A-101", "A-102", "A-103", "A-104", "A-105"]);
  });

  it("includes valid title blocks and SVG syntax across all sheets", () => {
    const sheets = generatePermittingBlueprintPackage(sampleProject);

    sheets.forEach((sheet) => {
      expect(sheet.svgContent).toContain("<svg");
      expect(sheet.svgContent).toContain("</svg>");
      expect(sheet.svgContent).toContain(sheet.sheetNumber);
      expect(sheet.svgContent).toContain(sampleProject.name);
      expect(sheet.svgContent).toContain("ARCHITECTURAL PRE-CONSTRUCTION SUBMISSION SET");
    });
  });

  it("Sheet A-101 contains plot dimensions, setbacks and true-north rose", () => {
    const sheets = generatePermittingBlueprintPackage(sampleProject);
    const a101 = sheets.find((s) => s.sheetNumber === "A-101")!;

    expect(a101.svgContent).toContain("PLOT PLAN & SETBACK CLEARANCE");
    expect(a101.svgContent).toContain("TRUE NORTH");
    expect(a101.svgContent).toContain("FRONT SETBACK: 3.0m");
    expect(a101.svgContent).toContain("NBC 2024 / IBC PASS");
  });

  it("Sheet A-104 includes building section elevation and NBC stair riser-tread calculus", () => {
    const sheets = generatePermittingBlueprintPackage(sampleProject);
    const a104 = sheets.find((s) => s.sheetNumber === "A-104")!;

    expect(a104.svgContent).toContain("+3.00m LEVEL 1 SLAB");
    expect(a104.svgContent).toContain("CLEAR HEADROOM: 2,150mm");
    expect(a104.svgContent).toContain("Stair Proportion (2R + T):");
    expect(a104.svgContent).toContain("613.4 mm (NBC: 600-640)");
    expect(a104.svgContent).toContain("FULL NBC §4.2 / IBC §1011 COMPLIANCE VERIFIED");
  });

  it("Sheet A-105 contains complete door, window and statutory compliance schedules", () => {
    const sheets = generatePermittingBlueprintPackage(sampleProject);
    const a105 = sheets.find((s) => s.sheetNumber === "A-105")!;

    expect(a105.svgContent).toContain("DOOR SPECIFICATION SCHEDULE");
    expect(a105.svgContent).toContain("WINDOW & GLAZING SCHEDULE");
    expect(a105.svgContent).toContain("STATUTORY NBC 2024 / IBC COMPLIANCE AUDIT MATRIX");
  });
});
