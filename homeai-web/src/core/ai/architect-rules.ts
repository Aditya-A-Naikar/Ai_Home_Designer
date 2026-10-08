import { Project, Room, Wall } from "../domain/types";
import { polygonArea, polygonCentroid } from "../geometry/room-utils";
import { wallLength } from "../geometry/wall-utils";

export type AuditSeverity = "error" | "warning" | "info";
export type AuditCategory = "building_code" | "ventilation" | "egress" | "ergonomics" | "vaastu";

export interface ActionPayload {
  type: "add_window" | "widen_door" | "add_prop" | "add_wall" | "modify_wall";
  floorId: string;
  wallId?: string;
  doorId?: string;
  roomId?: string;
  params: Record<string, unknown>;
}

export interface ArchitecturalSuggestion {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  codeReference?: string;
  affectedElementIds: string[];
  action?: ActionPayload;
  applied: boolean;
}

export interface AuditIssue {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  codeReference?: string;
  elementId?: string;
}

export interface CategoryScore {
  name: string;
  score: number;
  totalChecks: number;
  passedChecks: number;
}

export interface AuditReport {
  overallScore: number; // 0 - 100
  complianceStatus: "compliant" | "minor_issues" | "action_required";
  categoryScores: Record<AuditCategory, CategoryScore>;
  issues: AuditIssue[];
  suggestions: ArchitecturalSuggestion[];
  stats: {
    totalAreaM2: number;
    roomCount: number;
    windowAreaM2: number;
    glazingRatioPercent: number;
  };
}

// Minimum room standards (NBC 2016 / IBC) in sq millimeters
export const CODE_STANDARDS = {
  MIN_LIVING_AREA: 11_000_000, // 11.0 m²
  MIN_BEDROOM_AREA: 9_500_000, // 9.5 m²
  MIN_KITCHEN_AREA: 4_500_000, // 4.5 m²
  MIN_BATHROOM_AREA: 1_800_000, // 1.8 m²
  MIN_HABITABLE_WIDTH: 2400, // 2.4m in mm
  MIN_WINDOW_GLAZING_RATIO: 0.10, // 10% of floor area
  MIN_MAIN_DOOR_WIDTH: 900, // 900mm
  MIN_ROOM_DOOR_WIDTH: 800, // 800mm
  MIN_BATH_DOOR_WIDTH: 750, // 750mm
};

/**
 * Runs a complete architectural audit of a floor plan according to NBC/IBC building codes,
 * Neufert ergonomic standards, and Vaastu orientation principles.
 */
export function auditFloorPlan(project: Project, floorId?: string): AuditReport {
  const targetFloorId = floorId || project.activeFloorId;
  const floor = project.floors.find(f => f.id === targetFloorId) || project.floors[0];

  const issues: AuditIssue[] = [];
  const suggestions: ArchitecturalSuggestion[] = [];

  const checksBuildingCode = { total: 0, passed: 0 };
  const checksVentilation = { total: 0, passed: 0 };
  const checksEgress = { total: 0, passed: 0 };
  const checksErgonomics = { total: 0, passed: 0 };
  const checksVaastu = { total: 0, passed: 0 };

  if (!floor) {
    return createEmptyReport();
  }

  const rooms = floor.rooms;
  const walls = floor.walls;
  const props = floor.props || [];

  let totalAreaMm2 = 0;
  let totalGlazedMm2 = 0;

  // 1. Audit Each Room
  rooms.forEach((room) => {
    const area = polygonArea(room.polygon);
    totalAreaMm2 += area;
    const areaM2 = area / 1_000_000;
    const nameLower = room.name.toLowerCase();

    // Check minimum room area
    checksBuildingCode.total++;
    let minRequiredArea = 0;
    let standardName = "";

    if (nameLower.includes("living") || nameLower.includes("hall")) {
      minRequiredArea = CODE_STANDARDS.MIN_LIVING_AREA;
      standardName = "Living Room (NBC Part 3, Sec 4.1)";
    } else if (nameLower.includes("bed")) {
      minRequiredArea = CODE_STANDARDS.MIN_BEDROOM_AREA;
      standardName = "Habitable Bedroom (NBC Part 3, Sec 4.2)";
    } else if (nameLower.includes("kitchen")) {
      minRequiredArea = CODE_STANDARDS.MIN_KITCHEN_AREA;
      standardName = "Kitchen Area (NBC Part 3, Sec 4.3)";
    } else if (nameLower.includes("bath") || nameLower.includes("toilet") || nameLower.includes("wc")) {
      minRequiredArea = CODE_STANDARDS.MIN_BATHROOM_AREA;
      standardName = "Sanitary Facility (NBC Part 3, Sec 4.5)";
    }

    if (minRequiredArea > 0) {
      if (area < minRequiredArea) {
        const requiredM2 = (minRequiredArea / 1_000_000).toFixed(1);
        issues.push({
          id: `issue-area-${room.id}`,
          category: "building_code",
          severity: "warning",
          title: `Undersized ${room.name}`,
          description: `${room.name} area is ${areaM2.toFixed(1)} m², below standard requirement of ${requiredM2} m² (${standardName}).`,
          codeReference: "NBC 2016 Part 3",
          elementId: room.id,
        });
      } else {
        checksBuildingCode.passed++;
      }
    } else {
      checksBuildingCode.passed++;
    }

    // 2. Daylight & Ventilation Ratio (Windows on room perimeter)
    const roomWalls = findWallsForRoom(room, walls);
    let roomWindowGlazedMm2 = 0;
    const potentialExteriorWall: Wall | undefined = roomWalls.find(w => w.thickness >= 200) || roomWalls[0];

    roomWalls.forEach(w => {
      w.windows.forEach(win => {
        // approximate window area = width * height (default 1200mm height)
        roomWindowGlazedMm2 += win.width * (win.height || 1200);
      });
    });

    totalGlazedMm2 += roomWindowGlazedMm2;
    const isHabitable = !nameLower.includes("bath") && !nameLower.includes("toilet") && !nameLower.includes("store") && !nameLower.includes("corridor");

    if (isHabitable) {
      checksVentilation.total++;
      const currentRatio = roomWindowGlazedMm2 / (area || 1);
      const targetGlazedMm2 = area * CODE_STANDARDS.MIN_WINDOW_GLAZING_RATIO;

      if (currentRatio < CODE_STANDARDS.MIN_WINDOW_GLAZING_RATIO) {
        const currentPercent = (currentRatio * 100).toFixed(1);
        issues.push({
          id: `issue-vent-${room.id}`,
          category: "ventilation",
          severity: "warning",
          title: `Insufficient Daylight in ${room.name}`,
          description: `Glazing ratio is ${currentPercent}% (NBC requires minimum 10.0% of floor area for natural light and cross ventilation).`,
          codeReference: "NBC 2016 Part 8 / IBC Sec 1205",
          elementId: room.id,
        });

        // Provide actionable auto-fix suggestion if there's a perimeter wall
        if (potentialExteriorWall) {
          const neededWidth = Math.min(1800, Math.max(1000, Math.round((targetGlazedMm2 - roomWindowGlazedMm2) / 1200 / 100) * 100));
          const wLen = wallLength(potentialExteriorWall);
          const offset = Math.min(wLen - neededWidth / 2 - 200, Math.max(neededWidth / 2 + 200, wLen / 2));

          suggestions.push({
            id: `sug-window-${room.id}`,
            category: "ventilation",
            severity: "warning",
            title: `Add ${neededWidth}mm Window to ${room.name}`,
            description: `Install a code-compliant high-efficiency window to achieve >10% natural daylighting.`,
            codeReference: "NBC Clause 4.2",
            affectedElementIds: [room.id, potentialExteriorWall.id],
            applied: false,
            action: {
              type: "add_window",
              floorId: floor.id,
              wallId: potentialExteriorWall.id,
              roomId: room.id,
              params: {
                width: neededWidth,
                height: 1200,
                offset,
                sillHeight: 900
              }
            }
          });
        }
      } else {
        checksVentilation.passed++;
      }
    }

    // 3. Vaastu / Solar Orientation Check
    checksVaastu.total++;
    const centroid = polygonCentroid(room.polygon);
    const plotCenter = {
      x: project.plotDimensions.width / 2,
      y: project.plotDimensions.depth / 2
    };

    const isEast = centroid.x > plotCenter.x;
    const isSouth = centroid.y > plotCenter.y;

    if (nameLower.includes("master") && nameLower.includes("bed")) {
      // SW is optimal for Master Bedroom
      if (isSouth && !isEast) {
        checksVaastu.passed++;
      } else if (!isSouth && isEast) {
        issues.push({
          id: `issue-vaastu-${room.id}`,
          category: "vaastu",
          severity: "info",
          title: "Master Bedroom Orientation",
          description: "Master Bedroom located in NE quadrant. In traditional Vaastu principles, South-West provides optimal grounding and rest.",
          codeReference: "Vaastu Shastra Principles",
          elementId: room.id,
        });
      } else {
        checksVaastu.passed++;
      }
    } else if (nameLower.includes("kitchen")) {
      // SE is optimal for Kitchen (Agni)
      if (isSouth && isEast) {
        checksVaastu.passed++;
      } else {
        issues.push({
          id: `issue-vaastu-${room.id}`,
          category: "vaastu",
          severity: "info",
          title: "Kitchen Solar Alignment",
          description: "Kitchen positioned outside South-East quadrant. South-East maximizes morning ultraviolet exposure for hygienic food prep.",
          codeReference: "Bioclimatic Design",
          elementId: room.id,
        });
      }
    } else {
      checksVaastu.passed++;
    }
  });

  // 4. Audit Doors & Egress Clearance
  walls.forEach(w => {
    w.doors.forEach(d => {
      checksEgress.total++;
      if (d.width < CODE_STANDARDS.MIN_ROOM_DOOR_WIDTH) {
        issues.push({
          id: `issue-door-${d.id}`,
          category: "egress",
          severity: "warning",
          title: `Narrow Doorway (${d.width}mm)`,
          description: `Door width is ${d.width}mm. Building codes specify minimum 800mm clear width for accessible residential passage.`,
          codeReference: "IBC Chapter 10 / ADA Sec 404",
          elementId: d.id,
        });

        suggestions.push({
          id: `sug-door-${d.id}`,
          category: "egress",
          severity: "warning",
          title: `Widen Door to 900mm Standard`,
          description: `Expand doorway from ${d.width}mm to 900mm for code-compliant universal accessibility.`,
          affectedElementIds: [d.id, w.id],
          applied: false,
          action: {
            type: "widen_door",
            floorId: floor.id,
            wallId: w.id,
            doorId: d.id,
            params: { width: 900 }
          }
        });
      } else {
        checksEgress.passed++;
      }
    });
  });

  // 5. Ergonomics & Prop Ergonomics
  props.forEach(prop => {
    checksErgonomics.total++;
    if (prop.propType === "tv") {
      const seating = props.find(p => p.propType === "sofa");
      if (seating) {
        const dx = (prop.position.x - seating.position.x) / 1000;
        const dy = (prop.position.y - seating.position.y) / 1000;
        const distM = Math.sqrt(dx * dx + dy * dy);
        const inches = prop.specifications?.screenSizeInches || 65;
        const idealMinM = inches * 0.035; // e.g. 65" -> 2.27m
        const idealMaxM = inches * 0.052; // e.g. 65" -> 3.38m

        if (distM < idealMinM || distM > idealMaxM) {
          issues.push({
            id: `issue-tv-dist-${prop.id}`,
            category: "ergonomics",
            severity: "info",
            title: `TV Ergonomics: Distance ${distM.toFixed(1)}m`,
            description: `Viewing distance from ${inches}" TV to sofa is ${distM.toFixed(1)}m. SMPTE/THX ergonomic recommendation is ${idealMinM.toFixed(1)}m - ${idealMaxM.toFixed(1)}m.`,
            codeReference: "SMPTE / THX Viewing Standards",
            elementId: prop.id,
          });
        } else {
          checksErgonomics.passed++;
        }
      } else {
        checksErgonomics.passed++;
      }
    } else {
      checksErgonomics.passed++;
    }
  });

  if (checksErgonomics.total === 0) {
    checksErgonomics.total = 1;
    checksErgonomics.passed = 1;
  }

  // Calculate scores
  const scoreCategory = (c: { total: number; passed: number }) => {
    if (c.total === 0) return 100;
    return Math.round((c.passed / c.total) * 100);
  };

  const scoreBC = scoreCategory(checksBuildingCode);
  const scoreVent = scoreCategory(checksVentilation);
  const scoreEgress = scoreCategory(checksEgress);
  const scoreErgo = scoreCategory(checksErgonomics);
  const scoreVaastu = scoreCategory(checksVaastu);

  // Overall weighted score
  const overallScore = Math.round(
    scoreBC * 0.30 +
    scoreVent * 0.25 +
    scoreEgress * 0.20 +
    scoreErgo * 0.15 +
    scoreVaastu * 0.10
  );

  const complianceStatus =
    overallScore >= 90 ? "compliant" : overallScore >= 70 ? "minor_issues" : "action_required";

  return {
    overallScore,
    complianceStatus,
    categoryScores: {
      building_code: { name: "Building Codes", score: scoreBC, totalChecks: checksBuildingCode.total, passedChecks: checksBuildingCode.passed },
      ventilation: { name: "Ventilation & Light", score: scoreVent, totalChecks: checksVentilation.total, passedChecks: checksVentilation.passed },
      egress: { name: "Doors & Egress", score: scoreEgress, totalChecks: checksEgress.total, passedChecks: checksEgress.passed },
      ergonomics: { name: "Ergonomics & Layout", score: scoreErgo, totalChecks: checksErgonomics.total, passedChecks: checksErgonomics.passed },
      vaastu: { name: "Orientation & Vaastu", score: scoreVaastu, totalChecks: checksVaastu.total, passedChecks: checksVaastu.passed },
    },
    issues,
    suggestions,
    stats: {
      totalAreaM2: totalAreaMm2 / 1_000_000,
      roomCount: rooms.length,
      windowAreaM2: totalGlazedMm2 / 1_000_000,
      glazingRatioPercent: totalAreaMm2 > 0 ? (totalGlazedMm2 / totalAreaMm2) * 100 : 0,
    }
  };
}

function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

function findWallsForRoom(room: Room, walls: Wall[]): Wall[] {
  const roomWalls: Wall[] = [];
  const poly = room.polygon;

  walls.forEach(w => {
    // Check if midpoint of wall lies within or on the polygon boundary
    const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
    let touches = false;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const dist = distToSegment(mid, p1, p2);
      if (dist < 200) {
        touches = true;
        break;
      }
    }
    if (touches) {
      roomWalls.push(w);
    }
  });

  return roomWalls;
}

function createEmptyReport(): AuditReport {
  return {
    overallScore: 100,
    complianceStatus: "compliant",
    categoryScores: {
      building_code: { name: "Building Codes", score: 100, totalChecks: 0, passedChecks: 0 },
      ventilation: { name: "Ventilation & Light", score: 100, totalChecks: 0, passedChecks: 0 },
      egress: { name: "Doors & Egress", score: 100, totalChecks: 0, passedChecks: 0 },
      ergonomics: { name: "Ergonomics & Layout", score: 100, totalChecks: 0, passedChecks: 0 },
      vaastu: { name: "Orientation & Vaastu", score: 100, totalChecks: 0, passedChecks: 0 },
    },
    issues: [],
    suggestions: [],
    stats: {
      totalAreaM2: 0,
      roomCount: 0,
      windowAreaM2: 0,
      glazingRatioPercent: 0,
    }
  };
}
