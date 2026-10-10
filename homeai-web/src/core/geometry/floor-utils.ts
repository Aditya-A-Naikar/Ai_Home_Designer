import { Floor, Project, Wall, Point2D } from "../domain/types";

export interface FloorValidationError {
  code: string;
  floorId?: string;
  message: string;
}

export interface FloorValidationWarning {
  code: string;
  floorId?: string;
  message: string;
}

export interface MultiFloorValidationResult {
  isValid: boolean;
  errors: FloorValidationError[];
  warnings: FloorValidationWarning[];
}

export interface FloorElevationBounds {
  baseElevation: number; // In mm
  topElevation: number;  // In mm
  height: number;        // In mm
}

export interface WallMisalignmentResult {
  isAligned: boolean;
  distance: number; // In mm
  referenceWallId?: string;
}

export const DEFAULT_CEILING_HEIGHT = 2800; // mm (~9.2 ft)
export const MIN_CEILING_HEIGHT = 1800;     // mm minimum habitable headroom
export const MIN_SLAB_THICKNESS = 100;      // mm minimum structural slab
export const ALIGNMENT_SNAP_TOLERANCE = 150; // mm snap distance to lower floor walls

/**
 * Deterministically sorts floors by level ascending, breaking ties by elevation ascending.
 */
export function getSortedFloors(floors: Floor[]): Floor[] {
  return [...floors].sort((a, b) => {
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    return (a.elevation || 0) - (b.elevation || 0);
  });
}

/**
 * Derives the floor elevation bounds in millimeters (base elevation, top elevation, height).
 */
export function getFloorElevationBounds(floor: Floor): FloorElevationBounds {
  const base = Number.isFinite(floor.elevation) ? floor.elevation : 0;
  const height = Number.isFinite(floor.height) && floor.height > 0 ? floor.height : DEFAULT_CEILING_HEIGHT;
  return {
    baseElevation: base,
    topElevation: base + height,
    height,
  };
}

/**
 * Finds the immediate floor below the active floor to serve as the ghost underlay reference.
 * Returns null if the active floor is the lowest floor or if only one floor exists.
 */
export function getReferenceUnderlayFloor(project: Project | null, activeFloorId: string | null): Floor | null {
  if (!project || !activeFloorId || !project.floors || project.floors.length <= 1) {
    return null;
  }

  const sorted = getSortedFloors(project.floors);
  const activeIndex = sorted.findIndex((f) => f.id === activeFloorId);

  if (activeIndex <= 0) {
    // Lowest floor has no lower floor underlay
    return null;
  }

  return sorted[activeIndex - 1];
}

/**
 * Snaps a 2D point to the nearest endpoint of the underlay floor's walls if within tolerance.
 * Non-destructive and read-only.
 */
export function snapToUnderlayEndpoint(
  point: Point2D,
  underlayFloor: Floor | null,
  tolerance: number = ALIGNMENT_SNAP_TOLERANCE
): Point2D | null {
  if (!underlayFloor || !underlayFloor.walls || underlayFloor.walls.length === 0) {
    return null;
  }

  let closestPt: Point2D | null = null;
  let minDistance = tolerance;

  for (const wall of underlayFloor.walls) {
    const dStart = Math.hypot(wall.start.x - point.x, wall.start.y - point.y);
    if (dStart < minDistance) {
      minDistance = dStart;
      closestPt = { x: wall.start.x, y: wall.start.y };
    }

    const dEnd = Math.hypot(wall.end.x - point.x, wall.end.y - point.y);
    if (dEnd < minDistance) {
      minDistance = dEnd;
      closestPt = { x: wall.end.x, y: wall.end.y };
    }
  }

  // Also check underlay columns
  if (underlayFloor.columns) {
    for (const col of underlayFloor.columns) {
      const dCol = Math.hypot(col.position.x - point.x, col.position.y - point.y);
      if (dCol < minDistance) {
        minDistance = dCol;
        closestPt = { x: col.position.x, y: col.position.y };
      }
    }
  }

  return closestPt;
}

/**
 * Detects whether an upper floor wall is vertically aligned with any lower floor wall
 * within a given tolerance in millimeters.
 */
export function detectVerticalWallMisalignment(
  upperWall: Wall,
  lowerWalls: Wall[],
  toleranceMm: number = ALIGNMENT_SNAP_TOLERANCE
): WallMisalignmentResult {
  if (!lowerWalls || lowerWalls.length === 0) {
    return { isAligned: false, distance: Infinity };
  }

  let minDistance = Infinity;
  let refWallId: string | undefined;

  const uMid = {
    x: (upperWall.start.x + upperWall.end.x) / 2,
    y: (upperWall.start.y + upperWall.end.y) / 2,
  };

  for (const lWall of lowerWalls) {
    // Check midpoint distance and endpoint alignment
    const lMid = {
      x: (lWall.start.x + lWall.end.x) / 2,
      y: (lWall.start.y + lWall.end.y) / 2,
    };
    const distMid = Math.hypot(uMid.x - lMid.x, uMid.y - lMid.y);

    const distStarts = Math.hypot(upperWall.start.x - lWall.start.x, upperWall.start.y - lWall.start.y);
    const distEnds = Math.hypot(upperWall.end.x - lWall.end.x, upperWall.end.y - lWall.end.y);

    const distRevStarts = Math.hypot(upperWall.start.x - lWall.end.x, upperWall.start.y - lWall.end.y);
    const distRevEnds = Math.hypot(upperWall.end.x - lWall.start.x, upperWall.end.y - lWall.start.y);

    const endpointDist = Math.min(
      Math.max(distStarts, distEnds),
      Math.max(distRevStarts, distRevEnds)
    );

    const effectiveDist = Math.min(distMid, endpointDist);
    if (effectiveDist < minDistance) {
      minDistance = effectiveDist;
      refWallId = lWall.id;
    }
  }

  return {
    isAligned: minDistance <= toleranceMm,
    distance: minDistance,
    referenceWallId: minDistance <= toleranceMm ? refWallId : undefined,
  };
}

/**
 * Recalculates continuous vertical stacking elevations for floors based on ceiling heights.
 */
export function recalculateFloorElevations(
  floors: Floor[],
  defaultCeilingHeight: number = DEFAULT_CEILING_HEIGHT
): Floor[] {
  const sorted = getSortedFloors(floors);
  let currentElevation = 0;

  return sorted.map((floor) => {
    const h = floor.height > 0 ? floor.height : defaultCeilingHeight;
    const elev = currentElevation;
    currentElevation += h;
    return {
      ...floor,
      elevation: elev,
      height: h,
    };
  });
}

/**
 * Validates multi-floor project geometry, elevations, heights, IDs, and vertical consistency.
 */
export function validateMultiFloorProject(project: Project): MultiFloorValidationResult {
  const errors: FloorValidationError[] = [];
  const warnings: FloorValidationWarning[] = [];

  if (!project.floors || project.floors.length === 0) {
    errors.push({
      code: "NO_FLOORS",
      message: "Project must contain at least one floor.",
    });
    return { isValid: false, errors, warnings };
  }

  // 1. Check for duplicate or empty floor IDs
  const seenIds = new Set<string>();
  for (const floor of project.floors) {
    if (!floor.id || floor.id.trim() === "") {
      errors.push({
        code: "INVALID_FLOOR_ID",
        floorId: floor.id,
        message: "Floor must have a non-empty unique identifier.",
      });
    } else if (seenIds.has(floor.id)) {
      errors.push({
        code: "DUPLICATE_FLOOR_ID",
        floorId: floor.id,
        message: `Duplicate floor ID detected: ${floor.id}.`,
      });
    } else {
      seenIds.add(floor.id);
    }
  }

  // 2. Check active floor existence
  if (!project.activeFloorId || !project.floors.some((f) => f.id === project.activeFloorId)) {
    warnings.push({
      code: "ACTIVE_FLOOR_NOT_FOUND",
      message: `Active floor ID (${project.activeFloorId}) is not in project floors list.`,
    });
  }

  // 3. Check individual elevation and height numbers
  for (const floor of project.floors) {
    if (!Number.isFinite(floor.elevation)) {
      errors.push({
        code: "INVALID_ELEVATION",
        floorId: floor.id,
        message: `Floor "${floor.name}" has invalid non-finite elevation: ${floor.elevation}.`,
      });
    }

    if (!Number.isFinite(floor.height) || floor.height <= 0) {
      errors.push({
        code: "INVALID_HEIGHT",
        floorId: floor.id,
        message: `Floor "${floor.name}" has invalid height: ${floor.height}mm. Must be greater than 0.`,
      });
    } else if (floor.height < MIN_CEILING_HEIGHT) {
      warnings.push({
        code: "LOW_CEILING_HEIGHT",
        floorId: floor.id,
        message: `Floor "${floor.name}" ceiling height (${floor.height}mm) is below standard habitable minimum (${MIN_CEILING_HEIGHT}mm).`,
      });
    }
  }

  // 4. Check vertical stacking order and overlapping elevations
  const sorted = getSortedFloors(project.floors);
  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    const upper = sorted[i + 1];

    // Levels check
    if (upper.level <= lower.level) {
      warnings.push({
        code: "INCONSISTENT_FLOOR_LEVELS",
        floorId: upper.id,
        message: `Floor "${upper.name}" level (${upper.level}) is not greater than "${lower.name}" level (${lower.level}).`,
      });
    }

    // Elevation overlap check
    const lowerBounds = getFloorElevationBounds(lower);
    if (upper.elevation < lower.elevation + MIN_SLAB_THICKNESS) {
      errors.push({
        code: "OVERLAPPING_FLOOR_SLABS",
        floorId: upper.id,
        message: `Floor "${upper.name}" elevation (${upper.elevation}mm) overlaps with or penetrates floor "${lower.name}" (${lower.elevation}mm).`,
      });
    } else if (upper.elevation < lowerBounds.topElevation) {
      warnings.push({
        code: "INTERPENETRATING_FLOOR_VOLUMES",
        floorId: upper.id,
        message: `Floor "${upper.name}" elevation (${upper.elevation}mm) is lower than "${lower.name}" ceiling height (${lowerBounds.topElevation}mm). Review floor heights.`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Finds the immediate floor directly above the specified floor by vertical stacking.
 * Returns null if the specified floor is the topmost floor.
 */
export function getImmediateUpperFloor(floors: Floor[], currentFloor: Floor): Floor | null {
  if (!floors || floors.length <= 1) return null;
  const sorted = getSortedFloors(floors);
  const curIdx = sorted.findIndex((f) => f.id === currentFloor.id);
  if (curIdx >= 0 && curIdx < sorted.length - 1) {
    return sorted[curIdx + 1];
  }
  // Fallback by elevation comparison if IDs not matched in sorted list
  const higherFloors = sorted.filter((f) => (f.elevation || 0) > (currentFloor.elevation || 0));
  return higherFloors.length > 0 ? higherFloors[0] : null;
}

