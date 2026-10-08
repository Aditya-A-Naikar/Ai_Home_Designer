import { describe, it, expect } from 'vitest';
import { Vector2D } from '../core/geometry/vector';
import { wallLength, wallAngle, wallMidpoint, snapToGrid } from '../core/geometry/wall-utils';
import { polygonArea, polygonCentroid, isPointInPolygon } from '../core/geometry/room-utils';
import { mmToScreen, screenToMm, fitToContent } from '../core/canvas/transform';
import { Wall } from '../core/domain/types';

describe('Vector2D', () => {
  it('calculates length correctly', () => {
    const v = new Vector2D(3, 4);
    expect(v.length()).toBe(5);
  });
  it('adds and subtracts correctly', () => {
    const v1 = new Vector2D(1, 2);
    const v2 = new Vector2D(3, 4);
    expect(v1.add(v2).toPoint()).toEqual({ x: 4, y: 6 });
    expect(v1.subtract(v2).toPoint()).toEqual({ x: -2, y: -2 });
  });
});

describe('Wall Utils', () => {
  const wall: Wall = {
    id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 1000, y: 0 },
    thickness: 150, doors: [], windows: []
  };
  
  it('calculates wall length', () => {
    expect(wallLength(wall)).toBe(1000);
  });

  it('calculates wall midpoint', () => {
    expect(wallMidpoint(wall)).toEqual({ x: 500, y: 0 });
  });

  it('snaps to grid', () => {
    expect(snapToGrid({ x: 145, y: 155 }, 100)).toEqual({ x: 100, y: 200 });
  });
});

describe('Room Utils', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1000, y: 1000 },
    { x: 0, y: 1000 }
  ];

  it('calculates polygon area', () => {
    expect(polygonArea(square)).toBe(1000000); // 1,000,000 sq mm = 1 sq m
  });

  it('calculates polygon centroid', () => {
    expect(polygonCentroid(square)).toEqual({ x: 500, y: 500 });
  });

  it('checks if point is in polygon', () => {
    expect(isPointInPolygon({ x: 500, y: 500 }, square)).toBe(true);
    expect(isPointInPolygon({ x: -100, y: 500 }, square)).toBe(false);
  });
});

describe('Transform Engine', () => {
  it('converts mm to screen', () => {
    const screenPt = mmToScreen({ x: 1000, y: 2000 }, 0.5, { x: 100, y: 100 });
    // 1000 * 0.5 + 100 = 600
    // 2000 * 0.5 + 100 = 1100
    expect(screenPt).toEqual({ x: 600, y: 1100 });
  });

  it('converts screen to mm', () => {
    const mmPt = screenToMm({ x: 600, y: 1100 }, 0.5, { x: 100, y: 100 });
    expect(mmPt).toEqual({ x: 1000, y: 2000 });
  });
});
