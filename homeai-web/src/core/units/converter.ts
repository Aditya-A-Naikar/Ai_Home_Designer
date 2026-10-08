/**
 * Pure mathematical unit converter.
 * Internal storage is strictly in Millimeters (mm).
 * Zero React/DOM dependencies — mobile and server portable.
 */

import { PreferredUnit, UnitSystem } from "../domain/types";

// Conversion constants
export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const MM_PER_METER = 1000;
export const MM_PER_CM = 10;

export const SQ_FT_PER_SQ_M = 10.7639;
export const SQ_MM_PER_SQ_M = 1_000_000;
export const SQ_MM_PER_SQ_FT = 92_903.04;

/**
 * Converts length in given unit to millimeters (mm).
 */
export function toMillimeters(value: number, fromUnit: PreferredUnit): number {
  switch (fromUnit) {
    case "mm":
      return value;
    case "cm":
      return value * MM_PER_CM;
    case "m":
      return value * MM_PER_METER;
    case "in":
      return value * MM_PER_INCH;
    case "ft":
      return value * MM_PER_FOOT;
  }
}

/**
 * Converts millimeters (mm) to target unit.
 */
export function fromMillimeters(mm: number, toUnit: PreferredUnit): number {
  switch (toUnit) {
    case "mm":
      return mm;
    case "cm":
      return mm / MM_PER_CM;
    case "m":
      return mm / MM_PER_METER;
    case "in":
      return mm / MM_PER_INCH;
    case "ft":
      return mm / MM_PER_FOOT;
  }
}

/**
 * Formats millimeters into a clean, localized string based on preferred unit.
 */
export function formatDimension(
  mm: number,
  unit: PreferredUnit,
  precision = 1
): string {
  const converted = fromMillimeters(mm, unit);

  if (unit === "ft") {
    const feet = Math.floor(converted);
    const inches = Math.round((converted - feet) * 12);
    if (inches === 12) {
      return `${feet + 1}' 0"`;
    }
    return `${feet}' ${inches}"`;
  }

  const rounded = Number(converted.toFixed(precision));
  return `${rounded} ${unit}`;
}

/**
 * Formats area in square millimeters to human-readable string based on unit system.
 */
export function formatArea(sqMm: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    const sqFt = Math.round(sqMm / SQ_MM_PER_SQ_FT);
    return `${sqFt.toLocaleString()} sq ft`;
  } else {
    const sqM = Number((sqMm / SQ_MM_PER_SQ_M).toFixed(1));
    return `${sqM.toLocaleString()} m²`;
  }
}
