import { FloorFinishType, WallFinishType } from "./pbr-materials";
import { Project } from "../domain/types";

export interface DesignPresetSpec {
  id: string;
  name: string;
  tagline: string;
  description: string;
  wallFinish: WallFinishType;
  floorFinish: FloorFinishType;
  accentWallFinish?: WallFinishType;
  primaryColor: string;
  accentColor: string;
  furnitureStyle: "minimalist" | "luxury" | "natural" | "industrial" | "classic";
  recommendedMaterials: string[];
}

export const ARCHITECTURAL_DESIGN_PRESETS: Record<string, DesignPresetSpec> = {
  modern_minimalist: {
    id: "modern_minimalist",
    name: "Modern Minimalist",
    tagline: "Clean lines, maximum natural light, zero visual clutter",
    description: "Chalk plaster walls paired with honed architectural concrete floors and anodized charcoal metal accents. Prioritizes pure geometry and functional space.",
    wallFinish: "white_plaster",
    floorFinish: "polished_concrete",
    primaryColor: "#ffffff",
    accentColor: "#0284c7",
    furnitureStyle: "minimalist",
    recommendedMaterials: ["Chalk Plaster", "Polished Concrete", "Anodized Charcoal Steel", "Low-Profile Linen"],
  },
  contemporary_luxury: {
    id: "contemporary_luxury",
    name: "Contemporary Luxury",
    tagline: "Calacatta marble, brushed brass, warm neutrals",
    description: "Refined Nordic warm greige walls combined with bookmatched Calacatta Gold marble floors, fluted walnut panels, and brushed brass fixtures.",
    wallFinish: "warm_greige",
    floorFinish: "italian_marble",
    primaryColor: "#f5f5f4",
    accentColor: "#d97706",
    furnitureStyle: "luxury",
    recommendedMaterials: ["Calacatta Gold Marble", "Warm Greige Mineral Plaster", "Brushed Brass", "Italian Velvet"],
  },
  scandinavian: {
    id: "scandinavian",
    name: "Scandinavian Hygge",
    tagline: "Blonde hardwood, breathable textiles, organic warmth",
    description: "Chalk white plaster walls complemented by golden teak hardwood planks, muted earthy ceramics, and airy open-plan spatial flow.",
    wallFinish: "white_plaster",
    floorFinish: "teak_hardwood",
    primaryColor: "#fafafa",
    accentColor: "#059669",
    furnitureStyle: "natural",
    recommendedMaterials: ["Golden Teak Planks", "Chalk Plaster", "Natural Linen", "Matte Black Hardware"],
  },
  japandi: {
    id: "japandi",
    name: "Japandi Zen",
    tagline: "Japanese minimalism meets Scandinavian craft",
    description: "Soft tactile greige mineral plaster with dark smoked timber accents, low-slung furniture, and harmonious architectural proportions.",
    wallFinish: "warm_greige",
    floorFinish: "teak_hardwood",
    accentWallFinish: "charcoal_slate",
    primaryColor: "#e7e5e4",
    accentColor: "#78350f",
    furnitureStyle: "minimalist",
    recommendedMaterials: ["Smoked Timber", "Tactile Mineral Plaster", "Anthracite Stone", "Unbleached Cotton"],
  },
  warm_natural: {
    id: "warm_natural",
    name: "Warm Earth & Timber",
    tagline: "Exposed clay masonry, warm timber, earthy comfort",
    description: "Exposed architectural red brick accent surfaces paired with golden teak wood floors and cozy ambient lighting.",
    wallFinish: "warm_greige",
    floorFinish: "teak_hardwood",
    accentWallFinish: "exposed_brick",
    primaryColor: "#fef3c7",
    accentColor: "#c2410c",
    furnitureStyle: "natural",
    recommendedMaterials: ["Kiln-Fired Red Brick", "Golden Teak", "Cognac Leather", "Hand-Woven Wool"],
  },
  industrial_loft: {
    id: "industrial_loft",
    name: "Industrial Urban Loft",
    tagline: "Exposed brick, honed concrete, structural steel",
    description: "Kiln-fired brick masonry walls with structural concrete floors, raw steel mullions, and vintage factory aesthetics.",
    wallFinish: "exposed_brick",
    floorFinish: "polished_concrete",
    accentWallFinish: "charcoal_slate",
    primaryColor: "#9a3412",
    accentColor: "#dc2626",
    furnitureStyle: "industrial",
    recommendedMaterials: ["Architectural Brick", "Honed Concrete", "Raw Iron", "Distressed Leather"],
  },
  mediterranean_terrazzo: {
    id: "mediterranean_terrazzo",
    name: "Mediterranean Terrazzo",
    tagline: "Venetian terrazzo, sun-drenched plaster, breezy terraces",
    description: "White chalk plaster walls with cast Venetian terrazzo floors containing quartz and river-pebble chips, ideal for sunlit coastal villas.",
    wallFinish: "white_plaster",
    floorFinish: "terrazzo",
    primaryColor: "#ffffff",
    accentColor: "#0284c7",
    furnitureStyle: "classic",
    recommendedMaterials: ["Venetian Terrazzo", "Chalk Mineral Plaster", "Tempered Clear Glass", "Marine-Grade Teak"],
  },
};

/**
 * Applies an architectural design preset to all walls and rooms across all floors of a Project.
 */
export function applyDesignPresetToProject(project: Project, presetId: string): Project {
  const preset = ARCHITECTURAL_DESIGN_PRESETS[presetId];
  if (!preset) return project;

  project.activeDesignPreset = presetId;
  project.floors.forEach((floor) => {
    floor.rooms.forEach((r) => {
      r.floorFinishId = preset.floorFinish;
      r.wallFinishId = preset.wallFinish;
    });
    floor.walls.forEach((w) => {
      w.finishId = preset.wallFinish;
      w.colorHex = preset.primaryColor;
    });
  });

  return project;
}
