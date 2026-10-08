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

// Stub: returns empty array. Phase 4+ will use planar graph (Half-Edge) cycle detection.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autoDetectRooms(_walls: Wall[], _floorId: string): Room[] {
  return [];
}
