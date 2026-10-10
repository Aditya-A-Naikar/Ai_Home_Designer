import { describe, it, expect } from "vitest";
import { 
  parseFloorPlanImage, 
  calculatePolygonIoU 
} from "../core/ai/floor-plan-vision";

describe("Floor-Plan Vision & Vectorization Engine", () => {
  it("parses simulated raster/vector input into canonical BIM floor geometry", () => {
    const mockInput = {
      name: "Contemporary Master Floor Plan",
      widthPx: 1200,
      heightPx: 800,
      rawLines: [
        { start: { x: 0, y: 0 }, end: { x: 600, y: 0 }, thickness: 200 },
        { start: { x: 600, y: 0 }, end: { x: 600, y: 400 }, thickness: 200 },
        { start: { x: 600, y: 400 }, end: { x: 0, y: 400 }, thickness: 200 },
        { start: { x: 0, y: 400 }, end: { x: 0, y: 0 }, thickness: 200 },
      ],
      textAnnotations: [
        { text: "Living Room", position: { x: 300, y: 200 } },
        { text: "3500 x 4200", position: { x: 300, y: 240 } },
      ],
    };

    const result = parseFloorPlanImage(mockInput, {
      scaleMmPerPixel: 10,
      orthogonalizeAngles: true,
      minWallThicknessMm: 150,
      confidenceThreshold: 0.75,
    });

    expect(result).toBeDefined();
    expect(result.candidateFloor).toBeDefined();
    expect(result.candidateFloor.walls.length).toBeGreaterThanOrEqual(4);
    expect(result.candidateFloor.rooms.length).toBeGreaterThanOrEqual(1);

    // Verify rooms have valid names and closed polygons
    const room = result.candidateFloor.rooms[0];
    expect(room.name).toContain("Living Room");
    expect(room.polygon.length).toBeGreaterThanOrEqual(4);

    // Verify metrics pass quality gates
    expect(result.metrics).toBeDefined();
    expect(result.metrics.mAP50).toBeGreaterThanOrEqual(0.88);
    expect(result.metrics.wallIoU).toBeGreaterThanOrEqual(0.85);
    expect(result.metrics.isPassed).toBe(true);
  });

  it("accurately calculates polygon IoU for identical and disjoint shapes", () => {
    const squareA = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const squareB = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    // Identical polygons should have IoU = 1.0
    const iouIdentical = calculatePolygonIoU(squareA, squareB);
    expect(iouIdentical).toBeCloseTo(1.0, 2);

    // Disjoint polygons should have IoU = 0.0
    const squareDisjoint = [
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
      { x: 20, y: 30 },
    ];
    const iouDisjoint = calculatePolygonIoU(squareA, squareDisjoint);
    expect(iouDisjoint).toBe(0);

    // Half overlapping shapes: [0..10] x [0..10] area 100, [5..15] x [0..10] area 100
    // Intersection: [5..10] x [0..10] area 50. Union: 100 + 100 - 50 = 150. IoU: 50/150 = 0.3333
    const squareHalfOverlap = [
      { x: 5, y: 0 },
      { x: 15, y: 0 },
      { x: 15, y: 10 },
      { x: 5, y: 10 },
    ];
    const iouHalf = calculatePolygonIoU(squareA, squareHalfOverlap);
    expect(iouHalf).toBeCloseTo(0.333, 2);
  });

  it("handles degenerate polygons and empty inputs safely", () => {
    expect(calculatePolygonIoU([], [])).toBe(0);
    expect(calculatePolygonIoU([{ x: 0, y: 0 }], [{ x: 1, y: 1 }])).toBe(0);
  });
});
