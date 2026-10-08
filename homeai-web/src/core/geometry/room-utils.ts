import { Point2D, Wall, Room } from "../domain/types";
import { Vector2D } from "./vector";

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
