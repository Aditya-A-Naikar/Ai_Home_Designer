/**
 * HomeAI Designer — Staircase Architectural Geometry & Code Compliance Engine
 * Conforms to NBC 2016 Part 3 / IBC 2024 Chapter 10 requirements:
 * - Blondel's Ergonomic Formula: 2R + T = 600mm to 640mm
 * - Minimum Residential Flight Width: 900mm (Recommended 1000mm - 1200mm)
 * - Minimum Tread: 250mm (Commercial 300mm)
 * - Maximum Riser: 190mm (Standard 150mm - 175mm)
 * - Minimum Headroom: 2000mm (Recommended 2100mm)
 */

import { Point2D, Staircase, StairType, Floor, SlabVoid } from "../domain/types";
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

export interface StairRiseAndRunOptions {
  targetRiserMm?: number;
  preferredTreadMm?: number;
  flightWidthMm?: number;
  minHeadroomMm?: number;
}

export interface FlightSegment {
  flightNumber: number;
  riserCount: number;
  treadCount: number;
  runMm: number;
  widthMm: number;
  startElevationMm: number;
  endElevationMm: number;
}

export interface StairRiseAndRunResult {
  totalRiseMm: number;
  riserCount: number;
  riserHeightMm: number;
  treadCount: number;
  treadDepthMm: number;
  totalRunMm: number;
  flightWidthMm: number;
  landingDepthMm?: number;
  landingCount: number;
  flights: FlightSegment[];
  blondelValue: number;
  isCompliant: boolean;
  complianceIssues: string[];
}

export interface StairSlabOpeningOptions {
  headroomClearanceMm?: number; // default 2000mm
  slabThicknessMm?: number; // default 200mm
  openingType?: "headroom_optimized" | "full_footprint";
  marginMm?: number; // default 0
}

export interface EdgeSegment {
  start: Point2D;
  end: Point2D;
}

export interface StairSlabOpeningResult {
  polygon: Point2D[];
  arrivalEdge: EdgeSegment;
  guardrailEdges: EdgeSegment[];
  areaSqMm: number;
  headroomClearanceMm: number;
  cutElevationMm: number;
}

export interface StairValidationDetail {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  blondelValue: number;
  metrics: {
    totalRiseMm: number;
    riserMm: number;
    treadMm: number;
    stepCount: number;
    widthMm: number;
    lengthMm: number;
    blondelScore: number;
    headroomClearanceMm: number;
  };
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
 * Comprehensive parametric architectural validation for a staircase within the multi-floor context.
 */
export function validateStaircaseConfig(
  stair: Staircase,
  lowerFloor: Floor,
  upperFloor?: Floor | null
): StairValidationDetail {
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalRise = upperFloor
    ? Math.max(1000, (upperFloor.elevation || 0) - (lowerFloor.elevation || 0))
    : lowerFloor.height || 2800;

  const blondel = 2 * stair.riserMm + stair.treadMm;

  if (stair.treadMm < 250) {
    errors.push(`Tread depth (${stair.treadMm}mm) is below code minimum of 250mm.`);
  }
  if (stair.riserMm > 200) {
    errors.push(`Riser height (${stair.riserMm}mm) exceeds building code safety limit of 200mm.`);
  } else if (stair.riserMm > 190) {
    warnings.push(`Riser height (${stair.riserMm}mm) exceeds standard residential guideline of 190mm.`);
  } else if (stair.riserMm < 140) {
    warnings.push(`Riser height (${stair.riserMm}mm) is unusually shallow (< 140mm).`);
  }

  if (stair.width < 800) {
    errors.push(`Stair width (${stair.width}mm) is below emergency egress minimum of 800mm.`);
  } else if (stair.width < 900) {
    warnings.push(`Stair width (${stair.width}mm) is below recommended residential standard of 900mm.`);
  }

  if (blondel < 580 || blondel > 660) {
    warnings.push(`Blondel score 2R + T = ${blondel}mm is outside optimal ergonomic envelope (600–640mm).`);
  }

  const calculatedRise = stair.stepCount * stair.riserMm;
  if (Math.abs(calculatedRise - totalRise) > 50) {
    warnings.push(
      `Total stair rise (${calculatedRise}mm = ${stair.stepCount} × ${stair.riserMm}mm) deviates from floor-to-floor height (${totalRise}mm).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    blondelValue: blondel,
    metrics: {
      totalRiseMm: totalRise,
      riserMm: stair.riserMm,
      treadMm: stair.treadMm,
      stepCount: stair.stepCount,
      widthMm: stair.width,
      lengthMm: stair.length,
      blondelScore: blondel,
      headroomClearanceMm: 2000,
    },
  };
}

/**
 * Calculates exact parametric rise and run for any staircase typology based on total vertical rise.
 */
export function calculateStairRiseAndRun(
  totalRiseMm: number,
  stairType: StairType = "straight",
  options?: StairRiseAndRunOptions
): StairRiseAndRunResult {
  const targetRiser = options?.targetRiserMm || 165;
  const preferredTread = options?.preferredTreadMm;
  const flightWidth = options?.flightWidthMm || 1000;

  const riserCount = Math.max(2, Math.round(totalRiseMm / targetRiser));
  const riserHeightMm = Math.round(totalRiseMm / riserCount);
  const treadDepthMm = preferredTread || Math.max(250, Math.min(320, 620 - 2 * riserHeightMm));
  const blondelValue = 2 * riserHeightMm + treadDepthMm;

  const complianceIssues: string[] = [];
  if (riserHeightMm > 190) {
    complianceIssues.push(`Riser ${riserHeightMm}mm exceeds 190mm threshold.`);
  }
  if (treadDepthMm < 250) {
    complianceIssues.push(`Tread ${treadDepthMm}mm is under 250mm minimum.`);
  }
  if (blondelValue < 580 || blondelValue > 660) {
    complianceIssues.push(`Blondel formula ${blondelValue}mm is outside 600-640mm optimal range.`);
  }

  if (stairType === "dog_leg") {
    const flight1Risers = Math.ceil(riserCount / 2);
    const flight2Risers = riserCount - flight1Risers;
    const flight1Treads = Math.max(1, flight1Risers - 1);
    const flight2Treads = Math.max(1, flight2Risers - 1);
    const landingDepthMm = Math.max(flightWidth, 900);
    const flight1Run = flight1Treads * treadDepthMm;
    const flight2Run = flight2Treads * treadDepthMm;
    const totalRunMm = Math.max(flight1Run, flight2Run) + landingDepthMm;
    const midElevationMm = flight1Risers * riserHeightMm;

    const flights: FlightSegment[] = [
      {
        flightNumber: 1,
        riserCount: flight1Risers,
        treadCount: flight1Treads,
        runMm: flight1Run,
        widthMm: flightWidth,
        startElevationMm: 0,
        endElevationMm: midElevationMm,
      },
      {
        flightNumber: 2,
        riserCount: flight2Risers,
        treadCount: flight2Treads,
        runMm: flight2Run,
        widthMm: flightWidth,
        startElevationMm: midElevationMm,
        endElevationMm: totalRiseMm,
      },
    ];

    return {
      totalRiseMm,
      riserCount,
      riserHeightMm,
      treadCount: flight1Treads + flight2Treads,
      treadDepthMm,
      totalRunMm,
      flightWidthMm: flightWidth,
      landingDepthMm,
      landingCount: 1,
      flights,
      blondelValue,
      isCompliant: complianceIssues.length === 0,
      complianceIssues,
    };
  }

  if (stairType === "open_well") {
    const f1Risers = Math.ceil(riserCount / 3);
    const f2Risers = Math.ceil((riserCount - f1Risers) / 2);
    const f3Risers = Math.max(1, riserCount - f1Risers - f2Risers);
    const landingDepthMm = Math.max(flightWidth, 900);
    const f1Run = Math.max(1, f1Risers - 1) * treadDepthMm;
    const f2Run = Math.max(1, f2Risers - 1) * treadDepthMm;
    const f3Run = Math.max(1, f3Risers - 1) * treadDepthMm;
    const totalRunMm = Math.max(f1Run, f3Run) + landingDepthMm;

    const elev1 = f1Risers * riserHeightMm;
    const elev2 = elev1 + f2Risers * riserHeightMm;

    const flights: FlightSegment[] = [
      {
        flightNumber: 1,
        riserCount: f1Risers,
        treadCount: Math.max(1, f1Risers - 1),
        runMm: f1Run,
        widthMm: flightWidth,
        startElevationMm: 0,
        endElevationMm: elev1,
      },
      {
        flightNumber: 2,
        riserCount: f2Risers,
        treadCount: Math.max(1, f2Risers - 1),
        runMm: f2Run,
        widthMm: flightWidth,
        startElevationMm: elev1,
        endElevationMm: elev2,
      },
      {
        flightNumber: 3,
        riserCount: f3Risers,
        treadCount: Math.max(1, f3Risers - 1),
        runMm: f3Run,
        widthMm: flightWidth,
        startElevationMm: elev2,
        endElevationMm: totalRiseMm,
      },
    ];

    return {
      totalRiseMm,
      riserCount,
      riserHeightMm,
      treadCount: (f1Risers - 1) + (f2Risers - 1) + (f3Risers - 1),
      treadDepthMm,
      totalRunMm,
      flightWidthMm: flightWidth,
      landingDepthMm,
      landingCount: 2,
      flights,
      blondelValue,
      isCompliant: complianceIssues.length === 0,
      complianceIssues,
    };
  }

  // Straight flight or Cantilever
  const treadCount = Math.max(1, riserCount - 1);
  const totalRunMm = treadCount * treadDepthMm;

  return {
    totalRiseMm,
    riserCount,
    riserHeightMm,
    treadCount,
    treadDepthMm,
    totalRunMm,
    flightWidthMm: flightWidth,
    landingCount: 0,
    flights: [
      {
        flightNumber: 1,
        riserCount,
        treadCount,
        runMm: totalRunMm,
        widthMm: flightWidth,
        startElevationMm: 0,
        endElevationMm: totalRiseMm,
      },
    ],
    blondelValue,
    isCompliant: complianceIssues.length === 0,
    complianceIssues,
  };
}

/**
 * Calculates the exact 2D slab opening cutout on the upper floor slab and associated guardrail edges.
 * Handles both full footprint voids and NBC/IBC headroom-clearance-optimized openings.
 */
export function calculateStairSlabOpening(
  stair: Staircase,
  lowerFloor: Floor,
  upperFloor: Floor,
  options?: StairSlabOpeningOptions
): StairSlabOpeningResult {
  const headroomRequired = options?.headroomClearanceMm ?? 2000;
  const slabThickness = options?.slabThicknessMm ?? 200;
  const openingType = options?.openingType ?? "headroom_optimized";

  const totalRise = Math.max(1000, (upperFloor.elevation || 0) - (lowerFloor.elevation || 0));
  const { width, length, rotation = 0, position, stairType } = stair;

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const transformLocalToWorld = (u: number, v: number): Point2D => ({
    x: Math.round(position.x + (u * cos - v * sin)),
    y: Math.round(position.y + (u * sin + v * cos)),
  });

  // Calculate cut elevation along flight where vertical clearance breaches headroom
  // Clearance = (totalRise - slabThickness) - yStair
  // Breach when Clearance < headroomRequired => yStair > totalRise - slabThickness - headroomRequired
  const cutElevationMm = Math.max(0, totalRise - slabThickness - headroomRequired);

  let localPolygon: Point2D[];
  let localArrivalEdge: { start: Point2D; end: Point2D };
  let localGuardrailEdges: Array<{ start: Point2D; end: Point2D }>;

  if (stairType === "dog_leg") {
    const flightWidth = (width - 100) / 2;
    // For dog-leg stairs, upper flight arrives at top right (v = length, u in [width - flightWidth, width])
    // The entire upper flight and landing must be open to provide headroom.
    // Full rectangular footprint is standard for architectural dog-leg stairwells.
    localPolygon = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: length },
      { x: 0, y: length },
    ];

    // Upper arrival edge: top end of Flight 2
    localArrivalEdge = {
      start: { x: width - flightWidth, y: length },
      end: { x: width, y: length },
    };

    // Guardrail edges around the exposed perimeter (excluding arrival edge)
    localGuardrailEdges = [
      { start: { x: 0, y: length }, end: { x: 0, y: 0 } },
      { start: { x: 0, y: 0 }, end: { x: width, y: 0 } },
      { start: { x: width, y: 0 }, end: { x: width, y: length } },
      { start: { x: 0, y: length }, end: { x: width - flightWidth, y: length } },
    ];
  } else {
    // Straight or Cantilever stair
    // Ascends from v = length (0mm) to v = 0 (totalRise)
    let cutV = length;
    if (openingType === "headroom_optimized" && cutElevationMm > 0) {
      // Fraction of flight above ground: t = cutElevationMm / totalRise
      const t = cutElevationMm / totalRise;
      // Since v goes from length (t=0) down to 0 (t=1):
      cutV = Math.round(length * (1 - t));
      cutV = Math.max(Math.round(length * 0.35), Math.min(length, cutV));
    }

    localPolygon = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: cutV },
      { x: 0, y: cutV },
    ];

    // Arrival edge at top of flight (v = 0)
    localArrivalEdge = {
      start: { x: 0, y: 0 },
      end: { x: width, y: 0 },
    };

    // 3 exposed perimeter edges requiring guardrails
    localGuardrailEdges = [
      { start: { x: width, y: 0 }, end: { x: width, y: cutV } },
      { start: { x: width, y: cutV }, end: { x: 0, y: cutV } },
      { start: { x: 0, y: cutV }, end: { x: 0, y: 0 } },
    ];
  }

  // Transform polygon to world mm
  const polygon = localPolygon.map((p) => transformLocalToWorld(p.x, p.y));

  const arrivalEdge: EdgeSegment = {
    start: transformLocalToWorld(localArrivalEdge.start.x, localArrivalEdge.start.y),
    end: transformLocalToWorld(localArrivalEdge.end.x, localArrivalEdge.end.y),
  };

  const guardrailEdges: EdgeSegment[] = localGuardrailEdges.map((e) => ({
    start: transformLocalToWorld(e.start.x, e.start.y),
    end: transformLocalToWorld(e.end.x, e.end.y),
  }));

  // Polygon area in mm²
  let areaSqMm = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    areaSqMm += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  areaSqMm = Math.abs(areaSqMm) / 2;

  return {
    polygon,
    arrivalEdge,
    guardrailEdges,
    areaSqMm,
    headroomClearanceMm: headroomRequired,
    cutElevationMm,
  };
}

/**
 * Derives a canonical upper-floor SlabVoid for a given staircase connecting upward.
 */
export function deriveUpperSlabVoidForStair(
  stair: Staircase,
  lowerFloor: Floor,
  upperFloor: Floor,
  options?: StairSlabOpeningOptions
): SlabVoid {
  const opening = calculateStairSlabOpening(stair, lowerFloor, upperFloor, options);
  return {
    id: `stair-void-${stair.id}`,
    floorId: upperFloor.id,
    name: `${stair.name || "Staircase"} Opening`,
    polygon: opening.polygon,
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
  } else if (stairType === "cantilever") {
    width = 1000;
    length = stepCount * treadMm;
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

  // Straight flight or Cantilever
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

/**
 * Calculates the exact 3D stair walking surface elevation at a given world coordinate (in meters).
 * Returns { inside: boolean, elevationM: number, isLanding: boolean }.
 */
export function getStairSurfaceElevation(
  stair: Staircase,
  worldX: number,
  worldZ: number,
  centerOffset: { x: number; z: number },
  floorElevationM: number = 0,
  floorHeightM: number = 2.8
): { inside: boolean; elevationM: number; isLanding: boolean } {
  const anchorX = stair.position.x / 1000 - centerOffset.x;
  const anchorZ = stair.position.y / 1000 - centerOffset.z;
  const stairWidthM = (stair.width || 1000) / 1000;
  const stairLengthM = (stair.length || 2400) / 1000;

  // Delta from anchor
  const dx = worldX - anchorX;
  const dz = worldZ - anchorZ;

  // Un-rotate by stair.rotation
  const rotRad = ((stair.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  const u = dx * cos + dz * sin;
  const v = -dx * sin + dz * cos;

  // Check if inside bounding rectangle
  if (u < 0 || u > stairWidthM || v < 0 || v > stairLengthM) {
    return { inside: false, elevationM: floorElevationM, isLanding: false };
  }

  const stairType = stair.stairType || "straight";

  if (stairType === "dog_leg") {
    const flightWM = (stairWidthM - 0.1) / 2;
    const landingDepthM = flightWM;
    const flightRunM = Math.max(0.5, stairLengthM - landingDepthM);
    const midElevationM = floorElevationM + floorHeightM / 2;

    // Mid landing area
    if (v < landingDepthM) {
      return { inside: true, elevationM: midElevationM, isLanding: true };
    }

    // Flight 1 (Left flight: bottom to landing)
    if (u <= flightWM + 0.05) {
      const t = Math.max(0, Math.min(1, (stairLengthM - v) / flightRunM));
      return {
        inside: true,
        elevationM: floorElevationM + t * (floorHeightM / 2),
        isLanding: false,
      };
    }

    // Flight 2 (Right flight: landing to upper floor)
    if (u >= stairWidthM - flightWM - 0.05) {
      const t = Math.max(0, Math.min(1, (v - landingDepthM) / flightRunM));
      return {
        inside: true,
        elevationM: midElevationM + t * (floorHeightM / 2),
        isLanding: false,
      };
    }

    // Central well gap between flights
    return { inside: false, elevationM: floorElevationM, isLanding: false };
  }

  if (stairType === "spiral") {
    const centerX = stairWidthM / 2;
    const centerZ = stairLengthM / 2;
    const maxRadius = Math.min(stairWidthM, stairLengthM) / 2;
    const radius = Math.hypot(u - centerX, v - centerZ);
    if (radius > maxRadius) {
      return { inside: false, elevationM: floorElevationM, isLanding: false };
    }
    const angle = (Math.atan2(v - centerZ, u - centerX) + Math.PI) / (2 * Math.PI);
    return {
      inside: true,
      elevationM: floorElevationM + angle * floorHeightM,
      isLanding: false,
    };
  }

  // Straight stair or Cantilever: ascending from v = stairLengthM to v = 0
  const t = Math.max(0, Math.min(1, (stairLengthM - v) / stairLengthM));
  return {
    inside: true,
    elevationM: floorElevationM + t * floorHeightM,
    isLanding: false,
  };
}

/**
 * Calculates the 2D polygon bounding box of the staircase in project mm.
 */
export function getStairWorldPolygonMm(stair: Staircase): Point2D[] {
  const { width, length, rotation = 0, position } = stair;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners: Point2D[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: 0, y: length },
  ];

  return localCorners.map((pt) => ({
    x: Math.round(position.x + (pt.x * cos - pt.y * sin)),
    y: Math.round(position.y + (pt.x * sin + pt.y * cos)),
  }));
}
