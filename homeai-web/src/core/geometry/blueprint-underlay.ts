import { Point2D, BlueprintUnderlay, BlueprintCalibration } from "@/core/domain/types";
import { screenToMm } from "@/core/canvas/transform";
import { v4 as uuidv4 } from "uuid";

export type CalibrationUnit = "mm" | "cm" | "m" | "in" | "ft";

export const MAX_BLUEPRINT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const SUPPORTED_BLUEPRINT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
]);

/**
 * Converts a given measurement value from a supported unit into canonical millimeters.
 */
export function unitToMm(value: number, unit: CalibrationUnit): number {
  switch (unit) {
    case "mm":
      return value;
    case "cm":
      return value * 10;
    case "m":
      return value * 1000;
    case "in":
      return value * 25.4;
    case "ft":
      return value * 304.8;
    default:
      return value;
  }
}

/**
 * Validates a blueprint file's type, size, and integrity.
 */
export function validateBlueprintFile(file: {
  name: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }

  if (file.size <= 0) {
    return { valid: false, error: "The file is empty (0 bytes)." };
  }

  if (file.size > MAX_BLUEPRINT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 25 MB.`,
    };
  }

  // Determine MIME type from type or file extension
  let mime = (file.type || "").toLowerCase();
  if (!mime) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "png") mime = "image/png";
    else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    else if (ext === "webp") mime = "image/webp";
    else if (ext === "svg") mime = "image/svg+xml";
    else if (ext === "pdf") mime = "application/pdf";
  }

  if (!mime || !SUPPORTED_BLUEPRINT_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a high-resolution PNG, JPG, WEBP, or PDF blueprint.",
    };
  }

  return { valid: true };
}

/**
 * Calculates two-point scale calibration according to the Euclidean distance formula:
 *
 *   D_px = sqrt((x2 - x1)^2 + (y2 - y1)^2)
 *   mmPerPixel = D_mm / D_px
 */
export function calculateTwoPointScale(
  p1Px: Point2D,
  p2Px: Point2D,
  realDistanceMm: number
): {
  valid: boolean;
  mmPerPixel: number;
  pixelDistance: number;
  error?: string;
} {
  if (!p1Px || !p2Px) {
    return { valid: false, mmPerPixel: 0, pixelDistance: 0, error: "Two valid calibration points are required." };
  }

  if (
    !Number.isFinite(p1Px.x) ||
    !Number.isFinite(p1Px.y) ||
    !Number.isFinite(p2Px.x) ||
    !Number.isFinite(p2Px.y)
  ) {
    return { valid: false, mmPerPixel: 0, pixelDistance: 0, error: "Calibration points contain non-finite coordinates." };
  }

  const dx = p2Px.x - p1Px.x;
  const dy = p2Px.y - p1Px.y;
  const pixelDistance = Math.hypot(dx, dy);

  if (pixelDistance < 1.0) {
    return {
      valid: false,
      mmPerPixel: 0,
      pixelDistance,
      error: "Calibration points are too close together (minimum 1 pixel distance required).",
    };
  }

  if (!Number.isFinite(realDistanceMm) || realDistanceMm <= 0) {
    return {
      valid: false,
      mmPerPixel: 0,
      pixelDistance,
      error: "Known real-world measurement must be a positive finite number.",
    };
  }

  // Reject physically unreasonable dimensions (< 10mm or > 1,000,000mm / 1km)
  if (realDistanceMm < 10 || realDistanceMm > 1_000_000) {
    return {
      valid: false,
      mmPerPixel: 0,
      pixelDistance,
      error: "Known measurement is outside reasonable architectural range (10 mm to 1,000,000 mm).",
    };
  }

  const mmPerPixel = realDistanceMm / pixelDistance;

  return {
    valid: true,
    mmPerPixel,
    pixelDistance,
  };
}

/**
 * Transforms a point from canonical CAD millimetre space into underlay image pixel space.
 */
export function canvasMmToImagePixel(
  canvasPtMm: Point2D,
  underlay: Pick<BlueprintUnderlay, "positionMm" | "mmPerPixel">
): Point2D {
  return {
    x: (canvasPtMm.x - underlay.positionMm.x) / underlay.mmPerPixel,
    y: (canvasPtMm.y - underlay.positionMm.y) / underlay.mmPerPixel,
  };
}

/**
 * Transforms a point from underlay image pixel space into canonical CAD millimetre space.
 */
export function imagePixelToCanvasMm(
  pixelPt: Point2D,
  underlay: Pick<BlueprintUnderlay, "positionMm" | "mmPerPixel">
): Point2D {
  return {
    x: underlay.positionMm.x + pixelPt.x * underlay.mmPerPixel,
    y: underlay.positionMm.y + pixelPt.y * underlay.mmPerPixel,
  };
}

/**
 * Transforms a browser screen coordinate into underlay image pixel space.
 */
export function screenToImagePixel(
  screenPtPx: Point2D,
  zoom: number,
  panOffset: Point2D,
  underlay: BlueprintUnderlay
): Point2D {
  const mmPt = screenToMm(screenPtPx, zoom, panOffset);
  return canvasMmToImagePixel(mmPt, underlay);
}

/**
 * Applies two-point scale calibration to an existing underlay and returns an updated underlay.
 * Does not mutate prior state. Prevents cumulative scaling errors.
 */
export function recalibrateUnderlay(
  underlay: BlueprintUnderlay,
  p1Px: Point2D,
  p2Px: Point2D,
  realDistanceMm: number
): { success: boolean; underlay: BlueprintUnderlay; error?: string } {
  const result = calculateTwoPointScale(p1Px, p2Px, realDistanceMm);
  if (!result.valid) {
    return { success: false, underlay, error: result.error };
  }

  const calibration: BlueprintCalibration = {
    point1Px: { x: p1Px.x, y: p1Px.y },
    point2Px: { x: p2Px.x, y: p2Px.y },
    pixelDistance: result.pixelDistance,
    realDistanceMm,
    calibratedAt: new Date().toISOString(),
  };

  const updated: BlueprintUnderlay = {
    ...underlay,
    mmPerPixel: result.mmPerPixel,
    calibration,
  };

  return { success: true, underlay: updated };
}

/**
 * Constructs a fresh, validated BlueprintUnderlay instance.
 */
export function createBlueprintUnderlay(params: {
  floorId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  initialPositionMm?: Point2D;
  initialMmPerPixel?: number;
  opacity?: number;
}): BlueprintUnderlay {
  return {
    id: `underlay-${uuidv4().slice(0, 8)}`,
    floorId: params.floorId,
    fileName: params.fileName,
    fileType: params.fileType,
    fileSizeBytes: params.fileSizeBytes,
    imageUrl: params.imageUrl,
    imageWidth: params.imageWidth,
    imageHeight: params.imageHeight,
    positionMm: params.initialPositionMm || { x: 0, y: 0 },
    mmPerPixel: params.initialMmPerPixel || 10, // default: 1px = 10mm (10:1 ratio)
    rotationDeg: 0,
    opacity: typeof params.opacity === "number" ? params.opacity : 0.45,
    visible: true,
  };
}
