import { Point2D } from "../domain/types";

export class Vector2D {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static fromPoints(p1: Point2D, p2: Point2D): Vector2D {
    return new Vector2D(p2.x - p1.x, p2.y - p1.y);
  }

  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  subtract(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  scale(factor: number): Vector2D {
    return new Vector2D(this.x * factor, this.y * factor);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2D {
    const len = this.length();
    if (len === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / len, this.y / len);
  }

  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vector2D): number {
    return this.x * v.y - this.y * v.x;
  }

  perpendicular(): Vector2D {
    return new Vector2D(-this.y, this.x);
  }

  distanceTo(p: Point2D): number {
    const dx = this.x - p.x;
    const dy = this.y - p.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  lerp(v: Vector2D, t: number): Vector2D {
    return new Vector2D(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  rotate(angleRadians: number): Vector2D {
    const cosA = Math.cos(angleRadians);
    const sinA = Math.sin(angleRadians);
    return new Vector2D(
      this.x * cosA - this.y * sinA,
      this.x * sinA + this.y * cosA
    );
  }

  toPoint(): Point2D {
    return { x: this.x, y: this.y };
  }
}
