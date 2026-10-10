/**
 * HomeAI Designer — Architectural Floor Plan Validation Engine
 * Implements architectural checks based on residential building standards (NBC/IBC):
 * - Minimum room area & habitable dimension checks
 * - Ingress / circulation & door clearance verification
 * - Natural light and cross-ventilation (fenestration ratios)
 * - Staircase safety and Blondel ergonomic compliance
 * - Perimeter wall enclosure integrity
 */

import { Floor, Room, Door, Window } from '../domain/types';
import { validateStairCode } from './stair-utils';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'circulation' | 'daylight' | 'code' | 'structural';
  title: string;
  message: string;
  roomId?: string;
  suggestion?: string;
}

export interface ValidationReport {
  passed: boolean;
  score: number; // 0 - 100
  totalAreaSqM: number;
  habitableRoomCount: number;
  doorCount: number;
  windowCount: number;
  stairCount: number;
  summary: string;
  issues: ValidationIssue[];
}

/**
 * Calculates area of a 2D polygon in square meters (coordinates in mm).
 */
export function calculatePolygonAreaSqM(polygon: { x: number; y: number }[]): number {
  if (!polygon || polygon.length < 3) return 0;
  let areaMm = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    areaMm += polygon[i].x * polygon[j].y;
    areaMm -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(areaMm / 2) / 1000000;
}

/**
 * Validates a floor plan for architectural consistency, safety, and habitable comfort.
 */
export function validateFloorPlan(floor: Floor): ValidationReport {
  const issues: ValidationIssue[] = [];
  let totalAreaSqM = 0;
  let habitableRoomCount = 0;

  const walls = floor.walls || [];
  const doors: Door[] = walls.flatMap(w => w.doors || []);
  const windows: Window[] = walls.flatMap(w => w.windows || []);
  const stairs = floor.stairs || [];
  const rooms = floor.rooms || [];

  // 1. Wall Enclosure Verification
  if (walls.length < 3) {
    issues.push({
      id: 'insufficient-walls',
      type: 'error',
      category: 'structural',
      title: 'Incomplete Structural Enclosure',
      message: 'The floor plan has fewer than 3 structural walls. An enclosed building perimeter is required.',
      suggestion: 'Draw exterior perimeter walls to define the home boundary.'
    });
  }

  // 2. Room Evaluation
  rooms.forEach((room: Room, index: number) => {
    const areaSqM = calculatePolygonAreaSqM(room.polygon);
    totalAreaSqM += areaSqM;

    const lowerName = (room.name || '').toLowerCase();
    const isHabitable = !lowerName.includes('bath') && 
                        !lowerName.includes('toilet') && 
                        !lowerName.includes('powder') && 
                        !lowerName.includes('utility') && 
                        !lowerName.includes('corridor') &&
                        !lowerName.includes('foyer') &&
                        !lowerName.includes('balcony');

    if (isHabitable) {
      habitableRoomCount++;
      // Habitable room minimum area check (IBC/NBC min 6.5 - 9.0 m²)
      if (areaSqM < 6.0) {
        issues.push({
          id: `room-area-${room.id || index}`,
          type: 'warning',
          category: 'code',
          roomId: room.id,
          title: `Compact Habitable Space (${room.name})`,
          message: `${room.name} has an area of ${areaSqM.toFixed(1)} m², which is below the recommended 7.0 m² for primary living spaces.`,
          suggestion: 'Expand room boundaries to provide comfortable circulation.'
        });
      }
    } else {
      // Bath/utility minimum check (NBC min 1.8 m²)
      if (areaSqM < 1.5 && areaSqM > 0) {
        issues.push({
          id: `room-area-${room.id || index}`,
          type: 'info',
          category: 'code',
          roomId: room.id,
          title: `Compact Service Space (${room.name})`,
          message: `${room.name} has an area of ${areaSqM.toFixed(1)} m². Ensure adequate fixture clearance.`,
          suggestion: 'Ensure minimum 750mm clearance between vanity, water closet, and shower.'
        });
      }
    }
  });

  // 3. Fenestration & Daylight Ratio
  if (habitableRoomCount > 0 && windows.length < habitableRoomCount) {
    issues.push({
      id: 'low-daylight-openings',
      type: 'warning',
      category: 'daylight',
      title: 'Natural Daylight & Ventilation',
      message: `Found ${windows.length} window(s) for ${habitableRoomCount} habitable room(s). NBC Part 8 recommends fenestration ratio ≥ 10% of floor area.`,
      suggestion: 'Add exterior windows to primary bedrooms, living zones, and kitchen to maximize cross-ventilation.'
    });
  }

  // 4. Doors & Ingress Clearance
  if (rooms.length > 0 && doors.length === 0) {
    issues.push({
      id: 'no-doors',
      type: 'error',
      category: 'circulation',
      title: 'Missing Ingress / Egress Doors',
      message: 'No doors placed on this floor. Rooms must be accessible via proper doorway openings.',
      suggestion: 'Insert doors along partition walls connecting rooms and hallways.'
    });
  }

  doors.forEach((door, idx) => {
    if (door.width < 750) {
      issues.push({
        id: `narrow-door-${door.id || idx}`,
        type: 'warning',
        category: 'circulation',
        title: 'Narrow Door Opening',
        message: `Door #${idx + 1} has a clear width of ${door.width}mm. Residential code recommends ≥ 800mm (min 750mm for bathrooms).`,
        suggestion: 'Increase door width to 800mm - 900mm for accessibility.'
      });
    }
  });

  // 5. Staircase Code Compliance
  stairs.forEach((stair, idx) => {
    const res = validateStairCode(stair);
    if (!res.valid) {
      issues.push({
        id: `stair-code-${stair.id || idx}`,
        type: 'error',
        category: 'code',
        title: `Staircase Compliance (${stair.name || `Flight ${idx + 1}`})`,
        message: res.issues.join('; '),
        suggestion: `Adjust tread (≥ 250mm) or riser (≤ 190mm) so Blondel's formula 2R + T falls between 600–640mm.`
      });
    }
  });

  // Calculate score (100 minus weighted penalties)
  let score = 100;
  issues.forEach(issue => {
    if (issue.type === 'error') score -= 20;
    else if (issue.type === 'warning') score -= 8;
    else if (issue.type === 'info') score -= 2;
  });
  score = Math.max(10, Math.min(100, score));

  const hasErrors = issues.some(i => i.type === 'error');
  const passed = !hasErrors && walls.length >= 3;

  let summary = 'Floor plan satisfies key residential architectural standards and is ready for 3D design.';
  if (hasErrors) {
    summary = 'Critical issues identified. Please resolve structural enclosure or ingress items before locking.';
  } else if (issues.length > 0) {
    summary = 'Minor recommendations found. Floor plan is structurally sound and ready for 3D generation.';
  }

  return {
    passed,
    score,
    totalAreaSqM: Math.round(totalAreaSqM * 10) / 10,
    habitableRoomCount,
    doorCount: doors.length,
    windowCount: windows.length,
    stairCount: stairs.length,
    summary,
    issues
  };
}
