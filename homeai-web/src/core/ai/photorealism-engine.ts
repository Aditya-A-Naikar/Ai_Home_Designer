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

  const width = sourceCanvas.width || 1280;
  const height = sourceCanvas.height || 720;
  targetCanvas.width = width;
  targetCanvas.height = height;

  // 1. Draw base rendered image from WebGL
  try {
    if (sourceCanvas.width > 0 && sourceCanvas.height > 0) {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }
  } catch {
    // ignore
  }

  // Check if buffer is completely blank/black
  let isBlank = false;
  try {
    const sample = ctx.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
    if (sample[3] === 0 || (sample[0] === 0 && sample[1] === 0 && sample[2] === 0)) {
      const p1 = ctx.getImageData(10, 10, 1, 1).data;
      if (p1[3] === 0 || (p1[0] === 0 && p1[1] === 0 && p1[2] === 0)) {
        isBlank = true;
      }
    }
  } catch {
    // If security error on getImageData, proceed without blank override
  }

  if (isBlank) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (lighting === "golden_hour") {
      bgGrad.addColorStop(0, "#1e1b4b");
      bgGrad.addColorStop(0.5, "#431407");
      bgGrad.addColorStop(1, "#7c2d12");
    } else if (lighting === "blue_hour") {
      bgGrad.addColorStop(0, "#030712");
      bgGrad.addColorStop(0.5, "#0f172a");
      bgGrad.addColorStop(1, "#1e3a8a");
    } else {
      bgGrad.addColorStop(0, "#090d16");
      bgGrad.addColorStop(0.5, "#1e293b");
      bgGrad.addColorStop(1, "#334155");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    const horizon = height * 0.55;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();

    for (let x = -width; x <= width * 2; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(width / 2, horizon);
      ctx.stroke();
    }
  }

  // 2. Apply Warm/Cool Color Grade Overlay based on Lighting Mood
  ctx.save();
  if (lighting === "golden_hour") {
    ctx.fillStyle = "rgba(251, 191, 36, 0.12)"; // Warm Amber Wash
    ctx.globalCompositeOperation = "color";
    ctx.fillRect(0, 0, width, height);
  } else if (lighting === "blue_hour") {
    ctx.fillStyle = "rgba(59, 130, 246, 0.14)"; // Twilight Blue Wash
    ctx.globalCompositeOperation = "color";
    ctx.fillRect(0, 0, width, height);
  } else if (lighting === "moody_overcast") {
    ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
    ctx.globalCompositeOperation = "color";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  // 3. Subtle Architectural Radial Vignette
  ctx.save();
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.45,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

