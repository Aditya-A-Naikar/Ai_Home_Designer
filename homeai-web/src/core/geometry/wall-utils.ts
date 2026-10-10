import { Point2D, Wall } from "../domain/types";
import { Vector2D } from "./vector";

export function wallLength(wall: Wall): number {
  return Vector2D.fromPoints(wall.start, wall.end).length();
}

export function wallAngle(wall: Wall): number {
  const v = Vector2D.fromPoints(wall.start, wall.end);
  return Math.atan2(v.y, v.x);
}

export function wallMidpoint(wall: Wall): Point2D {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2,
  };
}

export function wallNormal(wall: Wall): Vector2D {
  return Vector2D.fromPoints(wall.start, wall.end).normalize().perpendicular();
}

export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function snapToEndpoint(point: Point2D, walls: Wall[], tolerance: number): Point2D | null {
  for (const w of walls) {
    if (new Vector2D(w.start.x, w.start.y).distanceTo(point) <= tolerance) {
      return w.start;
    }
    if (new Vector2D(w.end.x, w.end.y).distanceTo(point) <= tolerance) {
      return w.end;
    }
  }
  return null;
}

// Simple bounding-box/segment intersection test
function onSegment(p: Point2D, q: Point2D, r: Point2D): boolean {
  if (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  ) {
    return true;
  }
  return false;
}

function orientation(p: Point2D, q: Point2D, r: Point2D): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (val === 0) return 0; // collinear
  return val > 0 ? 1 : 2; // clock or counterclock wise
}

export function wallsIntersect(w1: Wall, w2: Wall): boolean {
  const p1 = w1.start, q1 = w1.end, p2 = w2.start, q2 = w2.end;
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

export function pointOnWall(point: Point2D, wall: Wall, tolerance: number): boolean {
  const v = Vector2D.fromPoints(wall.start, wall.end);
  const len = v.length();
  if (len === 0) return new Vector2D(wall.start.x, wall.start.y).distanceTo(point) <= tolerance;
  
  const vToPoint = Vector2D.fromPoints(wall.start, point);
  const dot = v.dot(vToPoint);
  const projLen = Math.max(0, Math.min(len, dot / len));
  const projPoint = new Vector2D(wall.start.x, wall.start.y).add(v.normalize().scale(projLen)).toPoint();
  
  return new Vector2D(projPoint.x, projPoint.y).distanceTo(point) <= tolerance;
}

export function doorPositionValid(wall: Wall, offset: number, width: number): boolean {
  return offset >= width / 2 && offset <= wallLength(wall) - width / 2;
}

export function windowPositionValid(wall: Wall, offset: number, width: number): boolean {
  return offset >= width / 2 && offset <= wallLength(wall) - width / 2;
}

export interface WallProjection {
  point: Point2D;
  offset: number;
  distance: number;
  wall: Wall;
}

export function projectPointOntoWall(point: Point2D, wall: Wall): WallProjection {
  const v = Vector2D.fromPoints(wall.start, wall.end);
  const len = v.length();
  if (len === 0) {
    const dist = new Vector2D(wall.start.x, wall.start.y).distanceTo(point);
    return { point: wall.start, offset: 0, distance: dist, wall };
  }
  const vToPoint = Vector2D.fromPoints(wall.start, point);
  const dot = v.dot(vToPoint);
  const projLen = Math.max(0, Math.min(len, dot / len));
  const projPoint = new Vector2D(wall.start.x, wall.start.y).add(v.normalize().scale(projLen)).toPoint();
  const dist = new Vector2D(projPoint.x, projPoint.y).distanceTo(point);
  return { point: projPoint, offset: projLen, distance: dist, wall };
}

export function getNearestWall(point: Point2D, walls: Wall[], maxDistance: number = 300): WallProjection | null {
  let nearest: WallProjection | null = null;
  let minDistance = maxDistance;

  for (const wall of walls) {
    const proj = projectPointOntoWall(point, wall);
    if (proj.distance <= minDistance) {
      minDistance = proj.distance;
      nearest = proj;
    }
  }

  return nearest;
}

export function snapToOrtho(start: Point2D, point: Point2D): Point2D {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Snap to horizontal (0 / 180 deg) or vertical (90 / 270 deg) or 45 degree diagonal
  if (absDx > absDy * 2) {
    return { x: point.x, y: start.y };
  } else if (absDy > absDx * 2) {
    return { x: start.x, y: point.y };
  } else {
    // 45 degree diagonal snap
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const avg = (absDx + absDy) / 2;
    return { x: start.x + signX * avg, y: start.y + signY * avg };
  }
}

// Stage 2.2: Re-export wall join calculations and footprint algorithms
export * from "./wall-joins";
