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

export interface FloorPBRTextures {
  map?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  bumpScale?: number;
}

export interface WallPBRTextures {
  map?: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  bumpScale?: number;
}

import * as THREE from "three";

const floorTextureCache: Partial<Record<FloorFinishType, FloorPBRTextures>> = {};
const wallTextureCache: Partial<Record<WallFinishType, WallPBRTextures>> = {};

export function getFloorPBRTextures(finishType: FloorFinishType): FloorPBRTextures {
  if (typeof document === "undefined") return {};
  if (floorTextureCache[finishType]) {
    return floorTextureCache[finishType]!;
  }

  const result: FloorPBRTextures = {};

  if (finishType === "teak_hardwood") {
    // 1. Teak Planks Diffuse Map
    const cMap = document.createElement("canvas");
    cMap.width = 512;
    cMap.height = 512;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#c27838";
      ctx.fillRect(0, 0, 512, 512);

      const plankH = 64;
      const tones = ["#b45309", "#c27838", "#d97706", "#a16207", "#b45309", "#c27838", "#92400e", "#d97706"];
      for (let row = 0; row < 8; row++) {
        const y = row * plankH;
        ctx.fillStyle = tones[row % tones.length];
        ctx.fillRect(0, y, 512, plankH - 2);

        // Staggered plank ends
        const offset = (row % 3) * 160;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect((offset + 250) % 512, y, 3, plankH - 2);
        ctx.fillRect((offset + 500) % 512, y, 3, plankH - 2);

        // Wood grain striations
        ctx.strokeStyle = "rgba(120, 53, 15, 0.22)";
        ctx.lineWidth = 1;
        for (let g = 0; g < 6; g++) {
          const gy = y + 8 + g * 9;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.bezierCurveTo(150, gy + (Math.sin(g) * 3), 350, gy - (Math.cos(g) * 3), 512, gy);
          ctx.stroke();
        }
      }

      // Plank grooves
      ctx.fillStyle = "rgba(40, 20, 5, 0.6)";
      for (let row = 1; row < 8; row++) {
        ctx.fillRect(0, row * plankH - 2, 512, 2);
      }

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(3, 3);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;
    }

    // 2. Teak Roughness & Bump Map
    const cBump = document.createElement("canvas");
    cBump.width = 256;
    cBump.height = 256;
    const bCtx = cBump.getContext("2d");
    if (bCtx) {
      bCtx.fillStyle = "#888888";
      bCtx.fillRect(0, 0, 256, 256);
      bCtx.fillStyle = "#222222";
      for (let y = 32; y < 256; y += 32) {
        bCtx.fillRect(0, y - 2, 256, 2);
      }
      const bumpTex = new THREE.CanvasTexture(cBump);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(3, 3);
      result.bumpMap = bumpTex;
      result.bumpScale = 0.005;
    }
  } else if (finishType === "italian_marble") {
    // Calacatta Gold Marble Veins Map
    const cMap = document.createElement("canvas");
    cMap.width = 512;
    cMap.height = 512;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fafbfc";
      ctx.fillRect(0, 0, 512, 512);

      // Soft feather smoke veins
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.filter = "blur(6px)";
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.bezierCurveTo(180, 160, 280, 240, 480, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(250, 220);
      ctx.bezierCurveTo(340, 280, 420, 320, 512, 380);
      ctx.stroke();

      ctx.filter = "none";

      // Sharp golden vein filigree
      ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.bezierCurveTo(170, 150, 290, 250, 480, 512);
      ctx.stroke();

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(2, 2);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;
    }
  } else if (finishType === "slate_ceramic_tile") {
    // 600x600 Tile Grid
    const cMap = document.createElement("canvas");
    cMap.width = 256;
    cMap.height = 256;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, 256, 256);

      // Recessed mortar joints
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.beginPath();
      ctx.moveTo(128, 0);
      ctx.lineTo(128, 256);
      ctx.moveTo(0, 128);
      ctx.lineTo(256, 128);
      ctx.stroke();

      // Slate cleft grain
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      for (let i = 0; i < 300; i++) {
        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 10 + 2, 2);
      }

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(4, 4);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;

      const bumpTex = new THREE.CanvasTexture(cMap);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(4, 4);
      result.bumpMap = bumpTex;
      result.bumpScale = 0.008;
    }
  } else if (finishType === "polished_concrete") {
    // Honed Industrial Concrete
    const cMap = document.createElement("canvas");
    cMap.width = 256;
    cMap.height = 256;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(0, 0, 256, 256);

      // Aggregate specks
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(71, 85, 105, 0.15)" : "rgba(241, 245, 249, 0.25)";
        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 3 + 1, Math.random() * 3 + 1);
      }

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(4, 4);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;

      const bumpTex = new THREE.CanvasTexture(cMap);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(4, 4);
      result.bumpMap = bumpTex;
      result.bumpScale = 0.003;
    }
  } else if (finishType === "terrazzo") {
    // Venetian Terrazzo Aggregates
    const cMap = document.createElement("canvas");
    cMap.width = 256;
    cMap.height = 256;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(0, 0, 256, 256);

      const colors = ["#475569", "#b45309", "#ffffff", "#64748b", "#cbd5e1"];
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        const rx = Math.random() * 256;
        const ry = Math.random() * 256;
        const rw = Math.random() * 5 + 2;
        const rh = Math.random() * 5 + 2;
        ctx.fillRect(rx, ry, rw, rh);
      }

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(3, 3);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;
    }
  }

  floorTextureCache[finishType] = result;
  return result;
}

export function getWallPBRTextures(finishType: WallFinishType): WallPBRTextures {
  if (typeof document === "undefined") return {};
  if (wallTextureCache[finishType]) {
    return wallTextureCache[finishType]!;
  }

  const result: WallPBRTextures = {};

  if (finishType === "exposed_brick") {
    const cMap = document.createElement("canvas");
    cMap.width = 256;
    cMap.height = 256;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#e2e8f0"; // Mortar base
      ctx.fillRect(0, 0, 256, 256);

      const brickH = 32;
      const brickW = 64;
      const brickColors = ["#9a3412", "#c2410c", "#7c2d12", "#b45309", "#9a3412"];

      for (let r = 0; r < 8; r++) {
        const y = r * brickH;
        const xOffset = (r % 2 === 0) ? 0 : -brickW / 2;
        for (let c = -1; c < 5; c++) {
          const x = c * brickW + xOffset;
          ctx.fillStyle = brickColors[(r + c + 10) % brickColors.length];
          ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
        }
      }

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(4, 4);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;

      const bumpTex = new THREE.CanvasTexture(cMap);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(4, 4);
      result.bumpMap = bumpTex;
      result.bumpScale = 0.015;
    }
  } else if (finishType === "charcoal_slate") {
    const cMap = document.createElement("canvas");
    cMap.width = 256;
    cMap.height = 256;
    const ctx = cMap.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for (let y = 16; y < 256; y += 16) {
        ctx.fillRect(0, y, 256, 2);
      }

      const mapTex = new THREE.CanvasTexture(cMap);
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.RepeatWrapping;
      mapTex.repeat.set(3, 3);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      result.map = mapTex;

      const bumpTex = new THREE.CanvasTexture(cMap);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(3, 3);
      result.bumpMap = bumpTex;
      result.bumpScale = 0.018;
    }
  } else {
    // Mineral Plaster Stipple Bump (Chalk Plaster & Warm Greige)
    const cBump = document.createElement("canvas");
    cBump.width = 128;
    cBump.height = 128;
    const ctx = cBump.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#888888";
      ctx.fillRect(0, 0, 128, 128);

      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
      }

      const bumpTex = new THREE.CanvasTexture(cBump);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(6, 6);
      result.bumpMap = bumpTex;
      result.bumpScale = 0.005;
    }
  }

  wallTextureCache[finishType] = result;
  return result;
}

