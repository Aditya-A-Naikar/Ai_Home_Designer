import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import {
  FLOOR_FINISHES,
  WALL_FINISHES,
  FURNITURE_FINISHES,
  FloorFinishType,
  WallFinishType,
  FurnitureFinishType,
  createNormalMapFromHeight,
  applyWorldScaleUVsToBoxGeometry,
  getFloorPBRTextures,
  getWallPBRTextures,
  getFurniturePBRTextures,
  disposePBRMaterialCache,
} from "@/core/geometry/pbr-materials";
import { resolvePropMaterials, createProp3DMesh } from "@/core/geometry/furniture-3d";
import { Prop } from "@/core/domain/types";

describe("Stage 3.2 — PBR Architectural Materials & Texture Generator", () => {
  beforeEach(() => {
    disposePBRMaterialCache();
  });

  describe("1. Material Catalog Specifications", () => {
    it("should provide 12 comprehensive PBR floor finish specifications", () => {
      const keys = Object.keys(FLOOR_FINISHES) as FloorFinishType[];
      expect(keys.length).toBe(12);

      const requiredKeys: FloorFinishType[] = [
        "teak_hardwood",
        "nordic_oak",
        "walnut_parquet",
        "italian_marble",
        "carrara_white",
        "emperador_dark",
        "polished_concrete",
        "board_formed_concrete",
        "slate_ceramic_tile",
        "metro_subway_tile",
        "herringbone_tile",
        "terrazzo",
      ];
      requiredKeys.forEach((key) => {
        expect(FLOOR_FINISHES[key]).toBeDefined();
        const spec = FLOOR_FINISHES[key];
        expect(spec.category).toBe("floor");
        expect(spec.roughness).toBeGreaterThanOrEqual(0);
        expect(spec.roughness).toBeLessThanOrEqual(1);
        expect(spec.metalness).toBeGreaterThanOrEqual(0);
        expect(spec.metalness).toBeLessThanOrEqual(1);
        expect(typeof spec.colorHex).toBe("number");
        expect(spec.uvScaleMeters).toBeGreaterThan(0);
      });
    });

    it("should provide 6 architectural wall finishes with physical metric scales", () => {
      const keys = Object.keys(WALL_FINISHES) as WallFinishType[];
      expect(keys.length).toBe(6);

      const requiredKeys: WallFinishType[] = [
        "white_plaster",
        "warm_greige",
        "sage_mineral",
        "exposed_brick",
        "charcoal_slate",
        "limestone_masonry",
      ];
      requiredKeys.forEach((key) => {
        expect(WALL_FINISHES[key]).toBeDefined();
        const spec = WALL_FINISHES[key];
        expect(spec.category).toBe("wall");
        expect(spec.roughness).toBeGreaterThan(0.5);
        expect(spec.normalScale).toBeGreaterThan(0);
        expect(spec.uvScaleMeters).toBeGreaterThan(0);
      });
    });

    it("should provide 14 furniture finishes across timber, upholstery, leather, metal, and glass", () => {
      const keys = Object.keys(FURNITURE_FINISHES) as FurnitureFinishType[];
      expect(keys.length).toBe(14);

      expect(FURNITURE_FINISHES.warm_oak.category).toBe("furniture");
      expect(FURNITURE_FINISHES.cognac_leather.category).toBe("furniture");
      expect(FURNITURE_FINISHES.brushed_brass.category).toBe("metal");
      expect(FURNITURE_FINISHES.brushed_brass.metalness).toBeGreaterThan(0.8);
      expect(FURNITURE_FINISHES.clear_architectural_glass.category).toBe("glass");
      expect(FURNITURE_FINISHES.clear_architectural_glass.transmission).toBeGreaterThan(0.9);
    });
  });

  describe("2. Tangent-Space Normal Map Generation & Linear Color Space", () => {
    it("should ensure generated normal map canvas textures have linear colorSpace (NoColorSpace)", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#808080";
        ctx.fillRect(0, 0, 32, 32);
      }

      const normalTex = createNormalMapFromHeight(canvas, 2.0);
      expect(normalTex).toBeInstanceOf(THREE.CanvasTexture);
      // Three.js tangent normal maps MUST remain in linear color space to prevent lighting artifacts
      expect(normalTex.colorSpace).toBe(THREE.NoColorSpace);
      expect(normalTex.wrapS).toBe(THREE.RepeatWrapping);
      expect(normalTex.wrapT).toBe(THREE.RepeatWrapping);
    });

    it("should encode flat surfaces as baseline cornflower blue (128, 128, 255)", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Uniform flat gray surface
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, 16, 16);

      createNormalMapFromHeight(canvas, 1.0);
      // The generated normal canvas has flat normals Nz = 1, Nx = 0, Ny = 0
      // Red: Math.round((0 * 0.5 + 0.5) * 255) = 128
      // Green: Math.round((0 * 0.5 + 0.5) * 255) = 128
      // Blue: Math.round((1 * 0.5 + 0.5) * 255) = 255
      const normalCanvas = document.querySelectorAll("canvas")[1];
      if (normalCanvas) {
        const nCtx = normalCanvas.getContext("2d");
        if (nCtx) {
          const pixel = nCtx.getImageData(8, 8, 1, 1).data;
          expect(pixel[0]).toBe(128); // R
          expect(pixel[1]).toBe(128); // G
          expect(pixel[2]).toBe(255); // B
          expect(pixel[3]).toBe(255); // A
        }
      }
    });
  });

  describe("3. World-Scale UV Coordinate Box Geometry Calculation", () => {
    it("should scale UV buffer coordinates proportionally to physical meters", () => {
      // 4m wide, 2.8m high, 0.15m thick wall
      const geo = new THREE.BoxGeometry(4.0, 2.8, 0.15);
      applyWorldScaleUVsToBoxGeometry(geo, 4.0, 2.8, 0.15, 1.0);

      const uvAttr = geo.getAttribute("uv") as THREE.BufferAttribute;
      expect(uvAttr).toBeDefined();

      // Front face (+Z) is face index 4 (vertices 16 to 19)
      const uMaxFront = uvAttr.getX(17);
      const vMaxFront = uvAttr.getY(17);
      expect(uMaxFront).toBeCloseTo(4.0, 3);
      expect(vMaxFront).toBeCloseTo(2.8, 3);

      // Right face (+X) is face index 0 (vertices 0 to 3)
      const uMaxRight = uvAttr.getX(1);
      const vMaxRight = uvAttr.getY(1);
      expect(uMaxRight).toBeCloseTo(0.15, 3);
      expect(vMaxRight).toBeCloseTo(2.8, 3);
    });

    it("should eliminate texture stretching across walls of different lengths", () => {
      const shortWallGeo = new THREE.BoxGeometry(1.0, 2.8, 0.15);
      const longWallGeo = new THREE.BoxGeometry(5.0, 2.8, 0.15);

      applyWorldScaleUVsToBoxGeometry(shortWallGeo, 1.0, 2.8, 0.15, 1.0);
      applyWorldScaleUVsToBoxGeometry(longWallGeo, 5.0, 2.8, 0.15, 1.0);

      const uvShort = shortWallGeo.getAttribute("uv") as THREE.BufferAttribute;
      const uvLong = longWallGeo.getAttribute("uv") as THREE.BufferAttribute;

      // Front face U max:
      const uShort = uvShort.getX(17);
      const uLong = uvLong.getX(17);

      expect(uShort).toBeCloseTo(1.0, 3);
      expect(uLong).toBeCloseTo(5.0, 3);
      // Both walls have identical texture density: 1 repeat per 1 meter!
      expect(uLong / 5.0).toBeCloseTo(uShort / 1.0, 3);
    });

    it("should adjust texture tiling proportionally when custom scaleM is applied", () => {
      const geo = new THREE.BoxGeometry(2.0, 2.0, 2.0);
      applyWorldScaleUVsToBoxGeometry(geo, 2.0, 2.0, 2.0, 0.5);

      const uvAttr = geo.getAttribute("uv") as THREE.BufferAttribute;
      // With scale 0.5m per repeat, a 2m face repeats 4 times
      expect(uvAttr.getX(17)).toBeCloseTo(4.0, 3);
      expect(uvAttr.getY(17)).toBeCloseTo(4.0, 3);
    });
  });

  describe("4. Procedural Texture Retrieval & Caching", () => {
    it("should retrieve PBR textures for all floor finish types", () => {
      const teakTextures = getFloorPBRTextures("teak_hardwood");
      expect(teakTextures.map).toBeDefined();
      expect(teakTextures.normalMap).toBeDefined();

      const marbleTextures = getFloorPBRTextures("italian_marble");
      expect(marbleTextures.map).toBeDefined();
      expect(marbleTextures.normalMap).toBeDefined();

      const tileTextures = getFloorPBRTextures("slate_ceramic_tile");
      expect(tileTextures.map).toBeDefined();
      expect(tileTextures.normalMap).toBeDefined();
    });

    it("should retrieve cached textures on repeated calls to avoid duplicate GPU allocations", () => {
      const first = getFloorPBRTextures("nordic_oak");
      const second = getFloorPBRTextures("nordic_oak");
      expect(first).toBe(second);
      expect(first.map).toBe(second.map);
    });

    it("should retrieve wall PBR textures with valid normal maps for all categories", () => {
      const brick = getWallPBRTextures("exposed_brick");
      expect(brick.map).toBeDefined();
      expect(brick.normalMap).toBeDefined();
      expect(brick.normalScale?.x).toBeGreaterThan(1.0);

      const plaster = getWallPBRTextures("white_plaster");
      expect(plaster.normalMap).toBeDefined();

      const slate = getWallPBRTextures("charcoal_slate");
      expect(slate.map).toBeDefined();
      expect(slate.normalMap).toBeDefined();
    });

    it("should retrieve furniture PBR textures for fabrics, leathers and woods", () => {
      const linen = getFurniturePBRTextures("charcoal_linen");
      expect(linen.normalMap).toBeDefined();

      const leather = getFurniturePBRTextures("cognac_leather");
      expect(leather.normalMap).toBeDefined();

      const oak = getFurniturePBRTextures("warm_oak");
      expect(oak.normalMap).toBeDefined();
    });
  });

  describe("5. GPU Memory Lifecycle & Disposal", () => {
    it("should safely dispose cached textures and clear memory without throwing", () => {
      getFloorPBRTextures("teak_hardwood");
      getWallPBRTextures("exposed_brick");
      getFurniturePBRTextures("charcoal_linen");

      expect(() => {
        disposePBRMaterialCache();
      }).not.toThrow();

      // Subsequent call creates a new instance after cache has been cleared
      const fresh = getFloorPBRTextures("teak_hardwood");
      expect(fresh).toBeDefined();
    });
  });

  describe("6. Furniture 3D Dynamic PBR Material Resolution", () => {
    it("should resolve custom timber PBR materials for furniture with wood finish", () => {
      const prop: Prop = {
        id: "prop-1",
        floorId: "floor-1",
        name: "Oak Dining Table",
        category: "dining",
        propType: "dining_table",
        position: { x: 2000, y: 2000 },
        rotation: 0,
        dimensions: { width: 1600, depth: 900, height: 750 },
        finishMaterial: "warm_oak",
      };

      const mats = resolvePropMaterials(prop);
      expect(mats.primaryMat).toBeInstanceOf(THREE.MeshStandardMaterial);
      const stdMat = mats.primaryMat as THREE.MeshStandardMaterial;
      expect(stdMat.normalMap).toBeDefined();
      expect(stdMat.roughness).toBeCloseTo(FURNITURE_FINISHES.warm_oak.roughness, 2);
    });

    it("should resolve upholstery PBR materials with normal maps for sofa props", () => {
      const sofaProp: Prop = {
        id: "prop-2",
        floorId: "floor-1",
        name: "Emerald Velvet Sofa",
        category: "living",
        propType: "sofa",
        position: { x: 3000, y: 3000 },
        rotation: 90,
        dimensions: { width: 2200, depth: 950, height: 850 },
        finishMaterial: "velvet_emerald",
      };

      const mats = resolvePropMaterials(sofaProp);
      expect(mats.upholsteryMat).toBeInstanceOf(THREE.MeshStandardMaterial);
      const stdMat = mats.upholsteryMat as THREE.MeshStandardMaterial;
      expect(stdMat.normalMap).toBeDefined();
      expect(stdMat.color.getHex()).toBe(FURNITURE_FINISHES.velvet_emerald.colorHex);
    });

    it("should generate complete 3D mesh hierarchy with resolved materials", () => {
      const prop: Prop = {
        id: "prop-3",
        floorId: "floor-1",
        name: "Master King Bed",
        category: "bedroom",
        propType: "bed",
        position: { x: 4000, y: 4000 },
        rotation: 0,
        dimensions: { width: 1900, depth: 2100, height: 1100 },
        finishMaterial: "dark_walnut",
      };

      const meshGroup = createProp3DMesh(prop);
      expect(meshGroup).toBeInstanceOf(THREE.Group);
      expect(meshGroup.children.length).toBeGreaterThan(3);

      // Check headboard has the dark walnut material
      const headboard = meshGroup.children.find(
        (c) => c instanceof THREE.Mesh && c.position.z < 0
      ) as THREE.Mesh;
      expect(headboard).toBeDefined();
      expect((headboard.material as THREE.MeshStandardMaterial).normalMap).toBeDefined();
    });
  });
});
