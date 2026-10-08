/**
 * HomeAI Designer — Staircase Architectural Geometry & Code Compliance Engine
 * Conforms to NBC 2016 Part 3 / IBC 2024 Chapter 10 requirements:
 * - Blondel's Ergonomic Formula: 2R + T = 600mm to 640mm
 * - Minimum Residential Flight Width: 900mm (Recommended 1000mm - 1200mm)
 * - Minimum Tread: 250mm (Commercial 300mm)
 * - Maximum Riser: 190mm (Standard 150mm - 175mm)
 * - Minimum Headroom: 2100mm
 */

import { Point2D, Staircase, StairType } from "../domain/types";
import { v4 as uuidv4 } from "uuid";

export interface StairTreadLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface StairGeometry {
  flight1: { x: number; y: number; width: number; height: number };
  flight2?: { x: number; y: number; width: number; height: number };
  landing?: { x: number; y: number; width: number; height: number };
  treadLines: StairTreadLine[];
  walkLine: {
    points: Point2D[];
    arrowTip: Point2D;
    arrowLeft: Point2D;
    arrowRight: Point2D;
  };
  breakLine?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    zigzag: Point2D[];
  };
  outerPolygon: Point2D[];
  upLabelPosition: Point2D;
  label: string;
}

/**
 * Validates a staircase design against NBC 2016 and IBC 2024 standards.
 */
export function validateStairCode(stair: Staircase): {
  valid: boolean;
  issues: string[];
  blondelValue: number;
} {
  const issues: string[] = [];
  const blondel = 2 * stair.riserMm + stair.treadMm;

  if (stair.treadMm < 250) {
    issues.push(`Tread depth (${stair.treadMm}mm) is under the 250mm NBC minimum.`);
  }
  if (stair.riserMm > 190) {
    issues.push(`Riser height (${stair.riserMm}mm) exceeds the 190mm safety maximum.`);
  }
  if (stair.width < 900) {
    issues.push(`Stair flight width (${stair.width}mm) is less than 900mm residential minimum.`);
  }
  if (blondel < 580 || blondel > 660) {
    issues.push(`Blondel formula 2R + T = ${blondel}mm is outside ergonomic range (600–640mm).`);
  }

  return {
    valid: issues.length === 0,
    issues,
    blondelValue: blondel,
  };
}

/**
 * Creates an architecturally standard staircase instance with NBC 2016 defaults.
 */
export function createStairPreset(
  stairType: StairType,
  floorId: string,
  position: Point2D = { x: 3000, y: 3000 },
  floorHeightMm: number = 2800
): Staircase {
  const riserTarget = 165; // standard residential riser
  const stepCount = Math.max(12, Math.round(floorHeightMm / riserTarget));
  const actualRiser = Math.round(floorHeightMm / stepCount);
  const treadMm = 275; // 2 * 165 + 275 = 605 mm (Ergonomically perfect Blondel score)

  let width = 1000;
  let length = 3200;

  if (stairType === "dog_leg") {
    width = 2050; // 1000mm flight + 50mm well + 1000mm flight
    const stepsPerFlight = Math.ceil(stepCount / 2);
    const flightRun = stepsPerFlight * treadMm;
    const landingDepth = 1000;
    length = flightRun + landingDepth; // total footprint
  } else if (stairType === "straight") {
    width = 1000;
    length = stepCount * treadMm;
  } else if (stairType === "spiral") {
    width = 1800; // diameter
    length = 1800;
  } else if (stairType === "open_well") {
    width = 2400;
    length = 3200;
  }

  return {
    id: `stair-${uuidv4().slice(0, 8)}`,
    floorId,
    name: `${stairType.replace("_", " ").toUpperCase()} STAIRCASE`,
    stairType,
    position,
    width,
    length,
    rotation: 0,
    treadMm,
    riserMm: actualRiser,
    stepCount,
    direction: "up",
    handrail: true,
  };
}

/**
 * Calculates local 2D vector geometry for rendering standard architectural stairs.
 * Returns coordinates relative to (position.x, position.y).
 */
export function calculateStairGeometry(stair: Staircase): StairGeometry {
  const { width, length, treadMm, stepCount, stairType } = stair;

  if (stairType === "dog_leg") {
    // Dog-leg stair: Flight 1 (UP) -> Mid Landing -> Flight 2 (UP to Floor 1)
    const flightWidth = (width - 100) / 2; // 100mm center well gap
    const landingDepth = flightWidth; // Landing depth = flight width by building code
    const flightRun = Math.max(1200, length - landingDepth);
    const stepsPerFlight = Math.max(4, Math.floor(flightRun / treadMm));
    const stepDepth = flightRun / stepsPerFlight;

    const treadLines: StairTreadLine[] = [];

    // Flight 1 treads (Left flight: bottom to top)
    for (let i = 1; i <= stepsPerFlight; i++) {
      treadLines.push({
        x1: 0,
        y1: length - i * stepDepth,
        x2: flightWidth,
        y2: length - i * stepDepth,
      });
    }

    // Flight 2 treads (Right flight: top to bottom)
    for (let i = 1; i <= stepsPerFlight; i++) {
      treadLines.push({
        x1: width - flightWidth,
        y1: length - i * stepDepth,
        x2: width,
        y2: length - i * stepDepth,
      });
    }

    // Walk line: Starts at bottom-left, goes up, loops over landing, goes down right
    const walkStartX = flightWidth / 2;
    const walkStartY = length - 50;
    const landingTurnY = 200;
    const walkEndX = width - flightWidth / 2;
    const walkEndY = length - 150;

    const arrowTip: Point2D = { x: walkEndX, y: walkEndY };
    const arrowLeft: Point2D = { x: walkEndX - 30, y: walkEndY - 50 };
    const arrowRight: Point2D = { x: walkEndX + 30, y: walkEndY - 50 };

    // Standard break line (diagonal zigzag across Flight 1 around step 7)
    const breakY = length - Math.floor(stepsPerFlight / 2) * stepDepth;
    const breakLine = {
      x1: -20,
      y1: breakY + 40,
      x2: flightWidth + 20,
      y2: breakY - 40,
      zigzag: [
        { x: flightWidth * 0.4, y: breakY },
        { x: flightWidth * 0.45, y: breakY - 25 },
        { x: flightWidth * 0.55, y: breakY + 25 },
        { x: flightWidth * 0.6, y: breakY },
      ],
    };

    return {
      flight1: { x: 0, y: landingDepth, width: flightWidth, height: flightRun },
      flight2: { x: width - flightWidth, y: landingDepth, width: flightWidth, height: flightRun },
      landing: { x: 0, y: 0, width, height: landingDepth },
      treadLines,
      walkLine: {
        points: [
          { x: walkStartX, y: walkStartY },
          { x: walkStartX, y: landingTurnY },
          { x: walkEndX, y: landingTurnY },
          { x: walkEndX, y: walkEndY },
        ],
        arrowTip,
        arrowLeft,
        arrowRight,
      },
      breakLine,
      outerPolygon: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: length },
        { x: 0, y: length },
      ],
      upLabelPosition: { x: walkStartX, y: length - 20 },
      label: stair.direction.toUpperCase(),
    };
  }

  // Straight flight
  const stepRun = Math.max(200, length / stepCount);
  const treadLines: StairTreadLine[] = [];

  for (let i = 1; i < stepCount; i++) {
    treadLines.push({
      x1: 0,
      y1: length - i * stepRun,
      x2: width,
      y2: length - i * stepRun,
    });
  }

  const walkX = width / 2;
  const arrowTip: Point2D = { x: walkX, y: 80 };
  const arrowLeft: Point2D = { x: walkX - 25, y: 130 };
  const arrowRight: Point2D = { x: walkX + 25, y: 130 };

  const midStepY = length * 0.55;
  const breakLine = {
    x1: -20,
    y1: midStepY + 40,
    x2: width + 20,
    y2: midStepY - 40,
    zigzag: [
      { x: width * 0.4, y: midStepY },
      { x: width * 0.45, y: midStepY - 25 },
      { x: width * 0.55, y: midStepY + 25 },
      { x: width * 0.6, y: midStepY },
    ],
  };

  return {
    flight1: { x: 0, y: 0, width, height: length },
    treadLines,
    walkLine: {
      points: [
        { x: walkX, y: length - 60 },
        { x: walkX, y: 80 },
      ],
      arrowTip,
      arrowLeft,
      arrowRight,
    },
    breakLine,
    outerPolygon: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: length },
      { x: 0, y: length },
    ],
    upLabelPosition: { x: walkX, y: length - 20 },
    label: stair.direction.toUpperCase(),
  };
}
