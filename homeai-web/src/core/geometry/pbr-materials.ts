/**
 * PBR Architectural Materials & Texture Generator
 * Provides realistic physical material presets and procedural canvas textures
 * for floors, walls, stairs, and glass in the WebGL 3D viewport.
 */

export type FloorFinishType = 
  | "teak_hardwood" 
  | "italian_marble" 
  | "polished_concrete" 
  | "slate_ceramic_tile"
  | "terrazzo";

export type WallFinishType =
  | "white_plaster"
  | "warm_greige"
  | "exposed_brick"
  | "charcoal_slate";

export interface PBRMaterialSpec {
  id: string;
  name: string;
  category: "floor" | "wall" | "stair" | "glass" | "metal";
  colorHex: number;
  roughness: number;
  metalness: number;
  transmission?: number;
  opacity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  description: string;
}

export const FLOOR_FINISHES: Record<FloorFinishType, PBRMaterialSpec> = {
  teak_hardwood: {
    id: "teak_hardwood",
    name: "Golden Teak Hardwood",
    category: "floor",
    colorHex: 0xc27838, // Warm rich timber
    roughness: 0.55,
    metalness: 0.05,
    clearcoat: 0.3,
    description: "Hand-scraped natural teak planks with satin oil luster",
  },
  italian_marble: {
    id: "italian_marble",
    name: "Calacatta Gold Marble",
    category: "floor",
    colorHex: 0xf8fafc, // Bright white with high reflectivity
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    description: "Bookmatched polished Italian marble with crystalline sheen",
  },
  polished_concrete: {
    id: "polished_concrete",
    name: "Polished Architectural Concrete",
    category: "floor",
    colorHex: 0x94a3b8, // Cool architectural grey
    roughness: 0.45,
    metalness: 0.1,
    clearcoat: 0.2,
    description: "Honed industrial concrete with subtle aggregate texture",
  },
  slate_ceramic_tile: {
    id: "slate_ceramic_tile",
    name: "Charcoal Slate Tile",
    category: "floor",
    colorHex: 0x334155, // Deep slate
    roughness: 0.75,
    metalness: 0.05,
    description: "600x600mm matte porcelain tiles with tight grout lines",
  },
  terrazzo: {
    id: "terrazzo",
    name: "Venetian White Terrazzo",
    category: "floor",
    colorHex: 0xe2e8f0,
    roughness: 0.3,
    metalness: 0.08,
    clearcoat: 0.5,
    description: "Cast Venetian stone with quartz and river-pebble chips",
  },
};

export const WALL_FINISHES: Record<WallFinishType, PBRMaterialSpec> = {
  white_plaster: {
    id: "white_plaster",
    name: "Architectural Chalk Plaster",
    category: "wall",
    colorHex: 0xffffff,
    roughness: 0.9,
    metalness: 0.02,
    description: "Pure matte mineral plaster with diffused light absorption",
  },
  warm_greige: {
    id: "warm_greige",
    name: "Nordic Warm Greige",
    category: "wall",
    colorHex: 0xe5e5e5,
    roughness: 0.85,
    metalness: 0.02,
    description: "Soft warm neutral with cozy ambient bounce",
  },
  exposed_brick: {
    id: "exposed_brick",
    name: "Kiln-Fired Red Brick",
    category: "wall",
    colorHex: 0x9a3412,
    roughness: 0.8,
    metalness: 0.05,
    description: "Exposed architectural clay masonry accent wall",
  },
  charcoal_slate: {
    id: "charcoal_slate",
    name: "Anthracite Textured Stone",
    category: "wall",
    colorHex: 0x1e293b,
    roughness: 0.7,
    metalness: 0.08,
    description: "Deep charcoal architectural feature stone",
  },
};

/**
 * Procedural texture generation helpers for realistic PBR surfaces
 * Uses offscreen HTML canvas when running in browser.
 */
export function createWoodPlankDataUrl(): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Base wood tone
  ctx.fillStyle = "#b45309";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle wood planks
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 2;
  for (let y = 32; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Wood grain noise
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 256;
    ctx.fillRect(rx, ry, Math.random() * 12 + 2, 1);
  }

  return canvas.toDataURL();
}

export function createTileGridDataUrl(): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Base porcelain
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, 128, 128);

  // Grout lines
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  return canvas.toDataURL();
}
