import { Project } from "@/core/domain/types";
import { FloorFinishType, WallFinishType } from "@/core/geometry/pbr-materials";

/**
 * Phase 16: Advanced AI Generation & Photorealism Engine
 * Synthesizes magazine-quality architectural rendering prompts, camera parameters,
 * and cinematic post-processing profiles.
 */

export type RenderAestheticStyle =
  | "architectural_digest"
  | "scandinavian_minimalist"
  | "japandi_serenity"
  | "warm_brutalism"
  | "luxury_penthouse";

export type LightingMood =
  | "golden_hour"
  | "crisp_noon"
  | "blue_hour"
  | "moody_overcast";

export interface RenderSynthesisConfig {
  aesthetic: RenderAestheticStyle;
  lighting: LightingMood;
  roomName: string;
  floorFinish: FloorFinishType;
  wallFinish: WallFinishType;
  focalLengthMm: 24 | 35 | 50;
  twoPointPerspective: boolean;
}

export interface PhotorealisticPromptPackage {
  positivePrompt: string;
  negativePrompt: string;
  cameraSettings: {
    lens: string;
    aperture: string;
    iso: number;
    shutter: string;
    perspective: string;
  };
  lightingDescription: string;
  materialDetails: string;
}

export function synthesizePhotorealisticPrompt(
  project: Project,
  config: RenderSynthesisConfig
): PhotorealisticPromptPackage {
  const aestheticMap: Record<RenderAestheticStyle, string> = {
    architectural_digest:
      "Architectural Digest feature, high-end editorial photography, refined minimalism, museum-grade spatial proportions, curated designer furniture",
    scandinavian_minimalist:
      "Nordic modernism, abundant natural daylight, muted organic tones, clean oak and birch accents, hygge serenity",
    japandi_serenity:
      "Japandi interior architecture, wabi-sabi elegance, low-profile minimalist joinery, natural slatted wood screens, textured limestone",
    warm_brutalism:
      "Warm board-formed architectural concrete, expansive double-height volumes, sculptural light play, lush interior tropical courtyard",
    luxury_penthouse:
      "Ultra-luxury contemporary penthouse, floor-to-ceiling panoramic architectural glazing, bookmatched marble, bespoke bronze details",
  };

  const lightingMap: Record<LightingMood, string> = {
    golden_hour:
      "Warm low-angle sunbeams cast through tall glazing, long cinematic soft shadows, 3200K golden sunlight warmth, dust motes in sunbeams",
    crisp_noon:
      "Crisp architectural daylight, neutral 5600K balanced illumination, soft ambient bounce from ceilings, sharp clean geometric shadows",
    blue_hour:
      "Cool twilight blue ambient exterior sky, warm 2700K recessed interior architectural linear LEDs, high contrast atmospheric glow",
    moody_overcast:
      "Soft diffuse daylight through cloudy sky, zero harsh shadows, high dynamic range interior illumination, soft gradients",
  };

  const floorMaterialDesc = config.floorFinish.replace(/_/g, " ");
  const wallMaterialDesc = config.wallFinish.replace(/_/g, " ");

  const positivePrompt = [
    `Award-winning architectural photograph of a luxury ${config.roomName.toLowerCase()} in a modern ${project.name}`,
    aestheticMap[config.aesthetic],
    lightingMap[config.lighting],
    `Premium ${floorMaterialDesc} flooring with soft specular reflection`,
    `Seamless ${wallMaterialDesc} wall finishes with architectural shadow gaps`,
    config.twoPointPerspective ? "Strict two-point architectural perspective with perfectly vertical walls" : "Dynamic three-point eye-level view",
    `Shot on Hasselblad H6D-100c, ${config.focalLengthMm}mm prime architectural tilt-shift lens`,
    "Unreal Engine 5.4 Lumen global illumination, 8K ultra-detailed photorealism, ray-traced reflections, hyper-realistic materiality"
  ].join(", ");

  const negativePrompt = [
    "blurry",
    "distorted perspective",
    "crooked walls",
    "oversaturated",
    "grainy",
    "cartoon",
    "3d render artifacts",
    "floating furniture",
    "fisheye distortion",
    "amateur snapshot",
    "low resolution",
    "cluttered junk",
    "deformed stairs"
  ].join(", ");

  return {
    positivePrompt,
    negativePrompt,
    cameraSettings: {
      lens: `${config.focalLengthMm}mm Tilt-Shift Prime`,
      aperture: config.focalLengthMm === 24 ? "f/8.0" : "f/4.0",
      iso: 100,
      shutter: "1/125s",
      perspective: config.twoPointPerspective ? "2-Point Tilt-Shift (Zero Vertical Convergence)" : "Eye-Level (1.65m Datum)",
    },
    lightingDescription: lightingMap[config.lighting],
    materialDetails: `Floor: ${floorMaterialDesc.toUpperCase()} • Walls: ${wallMaterialDesc.toUpperCase()}`,
  };
}

/**
 * Applies cinematic architectural grading to an HTML5 canvas element
 * (Color grading, contrast curve, subtle vignette, and bloom warmth).
 */
export function applyCinematicPostProcess(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  lighting: LightingMood
): void {
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  targetCanvas.width = sourceCanvas.width;
  targetCanvas.height = sourceCanvas.height;

  // 1. Draw base rendered image
  ctx.drawImage(sourceCanvas, 0, 0);

  // 2. Apply Warm/Cool Color Grade Overlay based on Lighting Mood
  ctx.save();
  if (lighting === "golden_hour") {
    ctx.fillStyle = "rgba(251, 191, 36, 0.08)"; // Warm Amber Wash
    ctx.globalCompositeOperation = "color";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  } else if (lighting === "blue_hour") {
    ctx.fillStyle = "rgba(59, 130, 246, 0.12)"; // Twilight Blue Wash
    ctx.globalCompositeOperation = "color";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  } else if (lighting === "moody_overcast") {
    ctx.fillStyle = "rgba(148, 163, 184, 0.06)";
    ctx.globalCompositeOperation = "color";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  }
  ctx.restore();

  // 3. Subtle Architectural Radial Vignette
  ctx.save();
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
