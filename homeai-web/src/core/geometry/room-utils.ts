import { Point2D, Wall, Room } from "../domain/types";
import { Vector2D } from "./vector";
import { v4 as uuidv4 } from "uuid";

export function polygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area / 2);
}

export function polygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };
  if (polygon.length === 1) return polygon[0];
  if (polygon.length === 2) {
    return {
      x: (polygon[0].x + polygon[1].x) / 2,
      y: (polygon[0].y + polygon[1].y) / 2,
    };
  }
  
  let x = 0;
  let y = 0;
  let signedArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const a = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    signedArea += a;
    x += (polygon[i].x + polygon[j].x) * a;
    y += (polygon[i].y + polygon[j].y) * a;
  }
  signedArea *= 0.5;
  x /= 6 * signedArea;
  y /= 6 * signedArea;
  
  return { x: Math.abs(x), y: Math.abs(y) };
}

export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    const intersect = yi > point.y !== yj > point.y &&
      point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

export function polygonPerimeter(polygon: Point2D[]): number {
  let perimeter = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    perimeter += new Vector2D(p1.x, p1.y).distanceTo(p2);
  }
  return perimeter;
}

export const ROOM_TYPE_PRESETS = [
  { name: 'Living Room', color: '#e0f2fe', defaultAreaM2: 24 },
  { name: 'Master Bedroom', color: '#ede9fe', defaultAreaM2: 18 },
  { name: 'Bedroom', color: '#f3e8ff', defaultAreaM2: 14 },
  { name: 'Kitchen', color: '#fef3c7', defaultAreaM2: 12 },
  { name: 'Bathroom', color: '#ccfbf1', defaultAreaM2: 6 },
  { name: 'Dining Room', color: '#ffedd5', defaultAreaM2: 15 },
  { name: 'Home Office', color: '#f1f5f9', defaultAreaM2: 10 },
  { name: 'Balcony', color: '#ecfdf5', defaultAreaM2: 5 },
] as const;

export function getRoomColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bath') || lower.includes('powder') || lower.includes('wash')) return '#ccfbf1';
  if (lower.includes('bed') || lower.includes('guest')) return '#f3e8ff';
  if (lower.includes('kitchen') || lower.includes('pantry')) return '#fef3c7';
  if (lower.includes('living') || lower.includes('lounge') || lower.includes('hall')) return '#e0f2fe';
  if (lower.includes('dining')) return '#ffedd5';
  if (lower.includes('office') || lower.includes('study')) return '#f1f5f9';
  if (lower.includes('balcony') || lower.includes('patio') || lower.includes('terrace')) return '#ecfdf5';
  return '#f8fafc';
}

interface Vertex {
  id: number;
  pt: Point2D;
}

export function autoDetectRooms(walls: Wall[], floorId: string): Room[] {
  if (walls.length < 3) return [];

  const tolerance = 50; // mm snap distance to treat endpoints as same vertex
  const vertices: Vertex[] = [];

  function getOrCreateVertex(pt: Point2D): number {
    for (let i = 0; i < vertices.length; i++) {
      if (new Vector2D(vertices[i].pt.x, vertices[i].pt.y).distanceTo(pt) <= tolerance) {
        return vertices[i].id;
      }
    }
    const newId = vertices.length;
    vertices.push({ id: newId, pt });
    return newId;
  }

  // Build adjacency list
  const adj: Map<number, Set<number>> = new Map();
  for (const w of walls) {
    const u = getOrCreateVertex(w.start);
    const v = getOrCreateVertex(w.end);
    if (u === v) continue;
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  }

  // Find 3, 4, 5, or 6-vertex simple cycles
  const cycles: number[][] = [];
  const visited: Set<number> = new Set();

  function findCycles(current: number, start: number, path: number[], maxDepth: number) {
    if (path.length > maxDepth) return;
    const neighbors = adj.get(current);
    if (!neighbors) return;

    for (const next of neighbors) {
      if (next === start && path.length >= 3) {
        // Found a cycle
        const normalized = normalizeCycle(path);
        if (!isDuplicateCycle(cycles, normalized)) {
          cycles.push(normalized);
        }
      } else if (!path.includes(next) && !visited.has(next)) {
        findCycles(next, start, [...path, next], maxDepth);
      }
    }
  }

  function normalizeCycle(c: number[]): number[] {
    const min = Math.min(...c);
    const idx = c.indexOf(min);
    const rotated = [...c.slice(idx), ...c.slice(0, idx)];
    // Ensure clockwise or standard orientation
    if (rotated.length > 2 && rotated[1] > rotated[rotated.length - 1]) {
      return [rotated[0], ...rotated.slice(1).reverse()];
    }
    return rotated;
  }

  function isDuplicateCycle(existing: number[][], cand: number[]): boolean {
    const candKey = cand.join(',');
    return existing.some(e => e.join(',') === candKey);
  }

  for (let i = 0; i < vertices.length; i++) {
    findCycles(i, i, [i], 8);
    visited.add(i);
  }

  const rooms: Room[] = [];
  let roomIndex = 1;

  for (const cycle of cycles) {
    const polygon = cycle.map(id => vertices[id].pt);
    const area = polygonArea(polygon);
    // Ignore tiny artifacts (< 1 sq meter = 1,000,000 sq mm)
    if (area < 1_000_000) continue;

    const preset = ROOM_TYPE_PRESETS[(roomIndex - 1) % ROOM_TYPE_PRESETS.length];
    rooms.push({
      id: `room-detected-${floorId}-${roomIndex}`,
      floorId,
      name: `${preset.name} ${roomIndex}`,
      polygon,
      color: preset.color,
      targetArea: area,
    });
    roomIndex++;
  }

  return rooms;
}

export function signedPolygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return area / 2;
}

function pointDistance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function projectPointOntoSegment(
  pt: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { point: { ...a }, t: 0, distance: pointDistance(pt, a) };
  }
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { point: proj, t, distance: pointDistance(pt, proj) };
}

export function snapPointToPolygonBoundary(
  pt: Point2D,
  polygon: Point2D[],
  tolerance: number = 60
): { point: Point2D; edgeIndex: number; isVertex: boolean; vertexIndex?: number } | null {
  // 1. Vertex snap
  let bestVertex = -1;
  let minVDist = tolerance;
  for (let i = 0; i < polygon.length; i++) {
    const d = pointDistance(pt, polygon[i]);
    if (d <= minVDist) {
      minVDist = d;
      bestVertex = i;
    }
  }
  if (bestVertex !== -1) {
    return {
      point: { ...polygon[bestVertex] },
      edgeIndex: bestVertex,
      isVertex: true,
      vertexIndex: bestVertex,
    };
  }

  // 2. Edge snap
  let bestEdge = -1;
  let minEDist = tolerance;
  let bestProj: Point2D | null = null;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const proj = projectPointOntoSegment(pt, a, b);
    if (proj.distance <= minEDist && proj.t > 0.0001 && proj.t < 0.9999) {
      minEDist = proj.distance;
      bestEdge = i;
      bestProj = proj.point;
    }
  }
  if (bestEdge !== -1 && bestProj) {
    return {
      point: bestProj,
      edgeIndex: bestEdge,
      isVertex: false,
    };
  }
  return null;
}

export function segmentIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): { point: Point2D; t: number; u: number } | null {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-7) return null;

  const t = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denom;
  const u = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denom;

  const eps = 1e-6;
  if (t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps) {
    const clampedT = Math.max(0, Math.min(1, t));
    const clampedU = Math.max(0, Math.min(1, u));
    return {
      point: {
        x: p1.x + clampedT * dx1,
        y: p1.y + clampedT * dy1,
      },
      t: clampedT,
      u: clampedU,
    };
  }
  return null;
}

export interface BoundaryIntersectionRecord {
  point: Point2D;
  t: number;
  edgeIndex: number;
  u: number;
}

export function findBoundaryIntersections(
  polygon: Point2D[],
  p1: Point2D,
  p2: Point2D
): BoundaryIntersectionRecord[] {
  const records: BoundaryIntersectionRecord[] = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const inter = segmentIntersection(p1, p2, a, b);
    if (inter) {
      const duplicate = records.some((r) => pointDistance(r.point, inter.point) < 1.0);
      if (!duplicate) {
        records.push({
          point: inter.point,
          t: inter.t,
          edgeIndex: i,
          u: inter.u,
        });
      }
    }
  }

  records.sort((a, b) => a.t - b.t);
  return records;
}

export function buildPathAlongBoundary(
  fromPt: Point2D,
  fromEdge: number,
  toPt: Point2D,
  toEdge: number,
  polygon: Point2D[]
): Point2D[] {
  const path: Point2D[] = [{ ...fromPt }];
  const n = polygon.length;

  const nextVertexIdx = (fromEdge + 1) % n;
  if (pointDistance(fromPt, polygon[nextVertexIdx]) > 1.0) {
    path.push({ ...polygon[nextVertexIdx] });
  }

  let cur = nextVertexIdx;
  while (cur !== toEdge) {
    cur = (cur + 1) % n;
    if (cur !== toEdge) {
      path.push({ ...polygon[cur] });
    }
  }

  const startToEdgeVertex = polygon[toEdge];
  const last = path[path.length - 1];
  if (
    pointDistance(last, startToEdgeVertex) > 1.0 &&
    pointDistance(fromPt, startToEdgeVertex) > 1.0 &&
    pointDistance(toPt, startToEdgeVertex) > 1.0
  ) {
    path.push({ ...startToEdgeVertex });
  }

  if (pointDistance(path[path.length - 1], toPt) > 1.0) {
    path.push({ ...toPt });
  }

  return path;
}

export function cleanPolygon(poly: Point2D[]): Point2D[] {
  if (poly.length < 3) return poly;
  const result: Point2D[] = [];
  for (let i = 0; i < poly.length; i++) {
    const pt = poly[i];
    const prev = result[result.length - 1];
    if (!prev || pointDistance(pt, prev) > 1.0) {
      result.push(pt);
    }
  }
  if (result.length > 2 && pointDistance(result[0], result[result.length - 1]) <= 1.0) {
    result.pop();
  }
  return result;
}

export function simplifyCollinearVertices(poly: Point2D[]): Point2D[] {
  if (poly.length < 4) return poly;
  const result: Point2D[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const curr = poly[i];
    const next = poly[(i + 1) % n];
    const cross = (curr.y - prev.y) * (next.x - curr.x) - (curr.x - prev.x) * (next.y - curr.y);
    const dot = (curr.x - prev.x) * (next.x - curr.x) + (curr.y - prev.y) * (next.y - curr.y);
    if (Math.abs(cross) < 1e-2 && dot > 0) {
      continue;
    }
    result.push(curr);
  }
  return result;
}

export function isSimplePolygon(polygon: Point2D[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a1 = polygon[i];
    const a2 = polygon[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i || j === (i + 1) % n || i === (j + 1) % n) continue;
      const b1 = polygon[j];
      const b2 = polygon[(j + 1) % n];
      const inter = segmentIntersection(a1, a2, b1, b2);
      if (inter && inter.t > 0.001 && inter.t < 0.999 && inter.u > 0.001 && inter.u < 0.999) {
        return false;
      }
    }
  }
  return true;
}

export function splitPolygonBySegment(
  polygon: Point2D[],
  start: Point2D,
  end: Point2D,
  tolerance: number = 60
): [Point2D[], Point2D[]] | null {
  if (polygon.length < 3) return null;
  const wallLen = pointDistance(start, end);
  if (wallLen < 50) return null;

  // Check endpoint containment vs snapping
  const sInside = isPointInPolygon(start, polygon);
  const eInside = isPointInPolygon(end, polygon);
  const sSnap = snapPointToPolygonBoundary(start, polygon, tolerance);
  const eSnap = snapPointToPolygonBoundary(end, polygon, tolerance);

  // Requirement 7: Reject a wall that terminates inside a room
  if (sInside && !sSnap) return null;
  if (eInside && !eSnap) return null;

  const p1 = sSnap ? sSnap.point : start;
  const p2 = eSnap ? eSnap.point : end;

  const inters = findBoundaryIntersections(polygon, p1, p2);
  if (inters.length !== 2) {
    return null;
  }

  const [cutA, cutB] = inters;
  if (cutA.edgeIndex === cutB.edgeIndex) {
    return null; // Same edge cut
  }

  // Check segment interior is inside polygon
  const midPt = {
    x: (cutA.point.x + cutB.point.x) / 2,
    y: (cutA.point.y + cutB.point.y) / 2,
  };
  if (!isPointInPolygon(midPt, polygon)) {
    return null;
  }

  const path1 = buildPathAlongBoundary(cutA.point, cutA.edgeIndex, cutB.point, cutB.edgeIndex, polygon);
  const path2 = buildPathAlongBoundary(cutB.point, cutB.edgeIndex, cutA.point, cutA.edgeIndex, polygon);

  const clean1 = cleanPolygon(path1);
  const clean2 = cleanPolygon(path2);

  if (clean1.length < 3 || clean2.length < 3) return null;

  const area1 = polygonArea(clean1);
  const area2 = polygonArea(clean2);
  const origArea = polygonArea(polygon);

  // Minimum 1 sq meter area requirement (1,000,000 sq mm)
  if (area1 < 1_000_000 || area2 < 1_000_000) return null;

  // Area conservation check
  if (Math.abs((area1 + area2) - origArea) > 5000) return null;

  // Simplicity check
  if (!isSimplePolygon(clean1) || !isSimplePolygon(clean2)) return null;

  // Ensure consistent orientation with original polygon
  const origSign = signedPolygonArea(polygon);
  const final1 = (signedPolygonArea(clean1) * origSign < 0) ? [...clean1].reverse() : clean1;
  const final2 = (signedPolygonArea(clean2) * origSign < 0) ? [...clean2].reverse() : clean2;

  return [final1, final2];
}

export function generateSecondaryRoomName(baseName: string, areaSqMm: number): string {
  const match = baseName.match(/^(.*?)\s*(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10);
    return `${prefix} ${num + 1}`.trim();
  }
  const areaSqM = Math.round(areaSqMm / 1_000_000);
  if (baseName.toLowerCase().includes('living') && areaSqM <= 15) {
    return 'Dining Room';
  }
  if (baseName.toLowerCase().includes('bed') && areaSqM <= 10) {
    return 'Home Office';
  }
  return `${baseName} 2`;
}

export function splitRoomByPartitionWall(
  room: Room,
  wall: Wall,
  tolerance: number = 60
): { primaryRoom: Room; secondaryRoom: Room } | null {
  const result = splitPolygonBySegment(room.polygon, wall.start, wall.end, tolerance);
  if (!result) return null;

  const [poly1, poly2] = result;
  const area1 = polygonArea(poly1);
  const area2 = polygonArea(poly2);

  // Deterministic preservation: Primary room is the larger one
  const isPoly1Primary = area1 >= area2;
  const primaryPoly = isPoly1Primary ? poly1 : poly2;
  const secondaryPoly = isPoly1Primary ? poly2 : poly1;
  const primaryArea = isPoly1Primary ? area1 : area2;
  const secondaryArea = isPoly1Primary ? area2 : area1;

  const secondaryName = generateSecondaryRoomName(room.name, secondaryArea);

  const primaryRoom: Room = {
    ...room,
    polygon: primaryPoly,
    targetArea: primaryArea,
  };

  const secondaryRoom: Room = {
    id: uuidv4(),
    floorId: room.floorId,
    name: secondaryName,
    polygon: secondaryPoly,
    color: getRoomColor(secondaryName) || room.color,
    targetArea: secondaryArea,
    floorFinishId: room.floorFinishId,
    wallFinishId: room.wallFinishId,
  };

  return { primaryRoom, secondaryRoom };
}

export function mergePolygonsAlongSharedEdge(
  poly1: Point2D[],
  poly2: Point2D[],
  wallStart: Point2D,
  wallEnd: Point2D,
  tolerance: number = 60
): Point2D[] | null {
  const n1 = poly1.length;
  const n2 = poly2.length;
  let e1 = -1;
  let e2 = -1;

  for (let i = 0; i < n1; i++) {
    const a = poly1[i];
    const b = poly1[(i + 1) % n1];
    if (
      (pointDistance(a, wallStart) <= tolerance && pointDistance(b, wallEnd) <= tolerance) ||
      (pointDistance(a, wallEnd) <= tolerance && pointDistance(b, wallStart) <= tolerance)
    ) {
      e1 = i;
      break;
    }
  }

  for (let j = 0; j < n2; j++) {
    const a = poly2[j];
    const b = poly2[(j + 1) % n2];
    if (
      (pointDistance(a, wallStart) <= tolerance && pointDistance(b, wallEnd) <= tolerance) ||
      (pointDistance(a, wallEnd) <= tolerance && pointDistance(b, wallStart) <= tolerance)
    ) {
      e2 = j;
      break;
    }
  }

  if (e1 === -1 || e2 === -1) return null;

  const a1 = poly1[e1];

  const path1: Point2D[] = [];
  let cur1 = (e1 + 1) % n1;
  while (cur1 !== e1) {
    path1.push(poly1[cur1]);
    cur1 = (cur1 + 1) % n1;
  }
  path1.push(poly1[e1]);

  const a2 = poly2[e2];

  const path2: Point2D[] = [];
  if (pointDistance(a2, a1) <= tolerance) {
    let cur2 = (e2 - 1 + n2) % n2;
    while (cur2 !== (e2 + 1) % n2) {
      path2.push(poly2[cur2]);
      cur2 = (cur2 - 1 + n2) % n2;
    }
    path2.push(poly2[(e2 + 1) % n2]);
  } else {
    let cur2 = (e2 + 2) % n2;
    while (cur2 !== e2) {
      path2.push(poly2[cur2]);
      cur2 = (cur2 + 1) % n2;
    }
    path2.push(poly2[e2]);
  }

  const merged = simplifyCollinearVertices(cleanPolygon([...path1, ...path2]));
  if (merged.length < 3 || !isSimplePolygon(merged)) return null;

  return merged;
}

export function mergeRoomsAlongSharedWall(
  room1: Room,
  room2: Room,
  wall: Wall,
  tolerance: number = 60
): Room | null {
  const mergedPoly = mergePolygonsAlongSharedEdge(room1.polygon, room2.polygon, wall.start, wall.end, tolerance);
  if (!mergedPoly) return null;

  const area = polygonArea(mergedPoly);
  return {
    ...room1,
    polygon: mergedPoly,
    targetArea: area,
  };
}
