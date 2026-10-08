import { describe, it, expect } from "vitest";
import { createProp3DMesh } from "@/core/geometry/furniture-3d";
import { Prop } from "@/core/domain/types";

describe("Phase 10: 3D Furniture & Interior Props Factory", () => {
  it("creates a detailed 3D bed with frame, mattress, and pillows", () => {
    const bedProp: Prop = {
      id: "p-bed",
      floorId: "fl-1",
      name: "King Bed",
      category: "bedroom",
      propType: "bed",
      position: { x: 3000, y: 3000 },
      rotation: 0,
      dimensions: { width: 1800, depth: 2000, height: 900 },
    };

    const mesh = createProp3DMesh(bedProp);
    expect(mesh).toBeDefined();
    expect(mesh.children.length).toBeGreaterThanOrEqual(4); // Frame, Headboard, Mattress, Pillows
  });

  it("creates a 3D sofa with base cushions, backrest, and armrests", () => {
    const sofaProp: Prop = {
      id: "p-sofa",
      floorId: "fl-1",
      name: "Modern Sofa",
      category: "living",
      propType: "sofa",
      position: { x: 2000, y: 2000 },
      rotation: 90,
      dimensions: { width: 2200, depth: 950, height: 850 },
    };

    const mesh = createProp3DMesh(sofaProp);
    expect(mesh).toBeDefined();
    expect(mesh.children.length).toBeGreaterThanOrEqual(3); // Seat, backrest, armrests
  });

  it("creates a 3D dining table with tabletop and 4 corner legs", () => {
    const tableProp: Prop = {
      id: "p-table",
      floorId: "fl-1",
      name: "Dining Table 6-Seater",
      category: "dining",
      propType: "dining_table",
      position: { x: 5000, y: 4000 },
      rotation: 0,
      dimensions: { width: 1600, depth: 900, height: 750 },
    };

    const mesh = createProp3DMesh(tableProp);
    expect(mesh).toBeDefined();
    expect(mesh.children.length).toBe(5); // Top + 4 legs
  });

  it("creates bathroom sanitaryware including toilet with cistern and bowl", () => {
    const wcProp: Prop = {
      id: "p-toilet",
      floorId: "fl-1",
      name: "Water Closet",
      category: "bathroom",
      propType: "toilet",
      position: { x: 1000, y: 1000 },
      rotation: 0,
      dimensions: { width: 450, depth: 650, height: 800 },
    };

    const mesh = createProp3DMesh(wcProp);
    expect(mesh).toBeDefined();
    expect(mesh.children.length).toBe(2); // Tank + bowl
  });
});
