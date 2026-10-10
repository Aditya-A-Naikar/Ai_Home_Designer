import { Point2D, Wall } from "../domain/types";

export type JoinType = 'miter' | 'butt' | 'bevel' | 'square';

export interface WallFootprint {
  wallId: string;
  polygon: Point2D[];           // Ordered closed polygon of the physical wall boundary
  startJoin: JoinType;
  endJoin: JoinType;
  startCap: [Point2D, Point2D];  // [Left, Right] at wall start
  endCap: [Point2D, Point2D];    // [Right, Left] at wall end
  isValid: boolean;
}

export interface WallJunction {
  id: string;
  point: Point2D;
  type: 'L' | 'T' | 'X' | 'collinear' | 'free';
  wallConnections: Array<{
    wallId: string;
    endpoint: 'start' | 'end';
    directionAway: Point2D;
    thickness: number;
    angle: number;
  }>;
}

export const MITER_LIMIT = 2.5;
export const JUNCTION_TOLERANCE = 30; // mm snap distance to cluster junction points

function distance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function crossProduct(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.y - v1.y * v2.x;
}

function dotProduct(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.x + v1.y * v2.y;
}

function normalizeVector(v: Point2D): Point2D {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function intersectLines(
  p1: Point2D,
  d1: Point2D,
  p2: Point2D,
  d2: Point2D
): Point2D | null {
  const denom = crossProduct(d1, d2);
  if (Math.abs(denom) < 1e-6) return null; // parallel or collinear
  const diff = { x: p2.x - p1.x, y: p2.y - p1.y };
  const t = crossProduct(diff, d2) / denom;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

function projectPointOntoSegment(
  pt: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { point: { ...a }, t: 0, distance: distance(pt, a) };
  }
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { point: proj, t, distance: distance(pt, proj) };
}

function cleanPolygonVertices(pts: Point2D[]): Point2D[] {
  if (pts.length < 3) return pts;
  const result: Point2D[] = [];
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const prev = result[result.length - 1];
    if (!prev || distance(cur, prev) > 0.5) {
      result.push(cur);
    }
  }
  if (result.length > 2 && distance(result[0], result[result.length - 1]) <= 0.5) {
    result.pop();
  }
  return result;
}

function isSimplePolygon(polygon: Point2D[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a1 = polygon[i];
    const a2 = polygon[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i || j === (i + 1) % n || i === (j + 1) % n) continue;
      const b1 = polygon[j];
      const b2 = polygon[(j + 1) % n];
      const inter = intersectLines(a1, { x: a2.x - a1.x, y: a2.y - a1.y }, b1, { x: b2.x - b1.x, y: b2.y - b1.y });
      if (inter) {
        const da = distance(a1, a2);
        const db = distance(b1, b2);
        if (da > 0 && db > 0) {
          const ta = dotProduct({ x: inter.x - a1.x, y: inter.y - a1.y }, { x: a2.x - a1.x, y: a2.y - a1.y }) / (da * da);
          const tb = dotProduct({ x: inter.x - b1.x, y: inter.y - b1.y }, { x: b2.x - b1.x, y: b2.y - b1.y }) / (db * db);
          if (ta > 0.005 && ta < 0.995 && tb > 0.005 && tb < 0.995) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

interface EndpointCap {
  left: Point2D;
  right: Point2D;
  joinType: JoinType;
}

/**
 * Computes the left and right corner points for an L-junction between two walls.
 */
export function calculateLJoin(
  w1: Wall,
  end1: 'start' | 'end',
  w2: Wall,
  end2: 'start' | 'end'
): {
  cap1: { left: Point2D; right: Point2D; joinType: JoinType };
  cap2: { left: Point2D; right: Point2D; joinType: JoinType };
} {
  const pt1 = end1 === 'start' ? w1.start : w1.end;
  const opp1 = end1 === 'start' ? w1.end : w1.start;
  const pt2 = end2 === 'start' ? w2.start : w2.end;
  const opp2 = end2 === 'start' ? w2.end : w2.start;

  const junction = { x: (pt1.x + pt2.x) / 2, y: (pt1.y + pt2.y) / 2 };

  // Directions away from junction
  const d1 = normalizeVector({ x: opp1.x - junction.x, y: opp1.y - junction.y });
  const d2 = normalizeVector({ x: opp2.x - junction.x, y: opp2.y - junction.y });

  // Normal vectors pointing to the left when facing away from junction
  const n1 = { x: -d1.y, y: d1.x };
  const n2 = { x: -d2.y, y: d2.x };

  const h1 = (w1.thickness || 150) / 2;
  const h2 = (w2.thickness || 150) / 2;

  const cp = crossProduct(d1, d2);
  const dp = dotProduct(d1, d2);

  // If nearly collinear opposing (angle ~ 180 degrees)
  if (dp < -0.995) {
    const cap1 = {
      left: { x: junction.x + h1 * n1.x, y: junction.y + h1 * n1.y },
      right: { x: junction.x - h1 * n1.x, y: junction.y - h1 * n1.y },
      joinType: 'butt' as JoinType,
    };
    const cap2 = {
      left: { x: junction.x + h2 * n2.x, y: junction.y + h2 * n2.y },
      right: { x: junction.x - h2 * n2.x, y: junction.y - h2 * n2.y },
      joinType: 'butt' as JoinType,
    };
    return { cap1, cap2 };
  }

  // General L-junction corner
  let innerCorner: Point2D | null = null;
  let outerCorner: Point2D | null = null;

  if (cp > 0) {
    // w2 turns left relative to w1:
    // Inner corner: left of w1 meets right of w2
    const p1Left = { x: junction.x + h1 * n1.x, y: junction.y + h1 * n1.y };
    const p2Right = { x: junction.x - h2 * n2.x, y: junction.y - h2 * n2.y };
    innerCorner = intersectLines(p1Left, d1, p2Right, d2);

    // Outer corner: right of w1 meets left of w2
    const p1Right = { x: junction.x - h1 * n1.x, y: junction.y - h1 * n1.y };
    const p2Left = { x: junction.x + h2 * n2.x, y: junction.y + h2 * n2.y };
    outerCorner = intersectLines(p1Right, d1, p2Left, d2);
  } else {
    // w2 turns right relative to w1:
    // Inner corner: right of w1 meets left of w2
    const p1Right = { x: junction.x - h1 * n1.x, y: junction.y - h1 * n1.y };
    const p2Left = { x: junction.x + h2 * n2.x, y: junction.y + h2 * n2.y };
    innerCorner = intersectLines(p1Right, d1, p2Left, d2);

    // Outer corner: left of w1 meets right of w2
    const p1Left = { x: junction.x + h1 * n1.x, y: junction.y + h1 * n1.y };
    const p2Right = { x: junction.x - h2 * n2.x, y: junction.y - h2 * n2.y };
    outerCorner = intersectLines(p1Left, d1, p2Right, d2);
  }

  // Fallback to square cap if intersection failed (near parallel)
  const fallbackOuter = { x: junction.x, y: junction.y };
  const fallbackInner = { x: junction.x, y: junction.y };
  const actualOuter = outerCorner || fallbackOuter;
  const actualInner = innerCorner || fallbackInner;

  // Miter limit check on outer corner distance
  const maxThickness = Math.max(w1.thickness || 150, w2.thickness || 150);
  const outerDist = distance(junction, actualOuter);
  const exceedsMiter = outerDist > MITER_LIMIT * maxThickness;

  const joinType: JoinType = exceedsMiter ? 'bevel' : 'miter';

  // Map inner and outer corners back to w1 and w2 left/right
  // Note: For w1, when looking away from junction:
  // If cp > 0, left is inner, right is outer.
  // If cp <= 0, left is outer, right is inner.
  let w1Left = cp > 0 ? actualInner : actualOuter;
  let w1Right = cp > 0 ? actualOuter : actualInner;

  // For w2, when looking away from junction:
  // If cp > 0, left is outer, right is inner.
  // If cp <= 0, left is inner, right is outer.
  let w2Left = cp > 0 ? actualOuter : actualInner;
  let w2Right = cp > 0 ? actualInner : actualOuter;

  // If miter limit exceeded, bevel/clamp the outer corner
  if (exceedsMiter) {
    const bisector = normalizeVector({ x: -(d1.x + d2.x), y: -(d1.y + d2.y) });
    const clampedOuter = {
      x: junction.x + MITER_LIMIT * maxThickness * bisector.x,
      y: junction.y + MITER_LIMIT * maxThickness * bisector.y,
    };
    if (cp > 0) {
      w1Right = clampedOuter;
      w2Left = clampedOuter;
    } else {
      w1Left = clampedOuter;
      w2Right = clampedOuter;
    }
  }

  return {
    cap1: { left: w1Left, right: w1Right, joinType },
    cap2: { left: w2Left, right: w2Right, joinType },
  };
}

/**
 * Computes the T-junction contact cap for a terminating wall butting against a continuing wall.
 */
export function calculateTJoin(
  continuousWall: Wall,
  terminatingWall: Wall,
  terminatingEnd: 'start' | 'end'
): EndpointCap {
  const termPt = terminatingEnd === 'start' ? terminatingWall.start : terminatingWall.end;
  const termOpp = terminatingEnd === 'start' ? terminatingWall.end : terminatingWall.start;

  // Continuing wall direction & normal
  const cDir = normalizeVector({
    x: continuousWall.end.x - continuousWall.start.x,
    y: continuousWall.end.y - continuousWall.start.y,
  });
  const cNorm = { x: -cDir.y, y: cDir.x };
  const hC = (continuousWall.thickness || 150) / 2;

  // Terminating wall direction away from junction
  const tDir = normalizeVector({
    x: termOpp.x - termPt.x,
    y: termOpp.y - termPt.y,
  });
  const tNorm = { x: -tDir.y, y: tDir.x };
  const hT = (terminatingWall.thickness || 150) / 2;

  // Project termPt onto continuous wall centerline
  const proj = projectPointOntoSegment(termPt, continuousWall.start, continuousWall.end);
  const junctionCenter = proj.point;

  // Determine which side of continuous wall the terminating wall lies on
  const side = dotProduct(tDir, cNorm) >= 0 ? 1 : -1;
  const facePt = {
    x: junctionCenter.x + side * hC * cNorm.x,
    y: junctionCenter.y + side * hC * cNorm.y,
  };

  // Left & right offset lines of terminating wall
  const tLeftPt = { x: junctionCenter.x + hT * tNorm.x, y: junctionCenter.y + hT * tNorm.y };
  const tRightPt = { x: junctionCenter.x - hT * tNorm.x, y: junctionCenter.y - hT * tNorm.y };

  const leftContact = intersectLines(tLeftPt, tDir, facePt, cDir) || facePt;
  const rightContact = intersectLines(tRightPt, tDir, facePt, cDir) || facePt;

  return {
    left: leftContact,
    right: rightContact,
    joinType: 'butt',
  };
}

/**
 * Derives clean, closed, non-overlapping 2D physical footprint polygons for all walls on a floor.
 */
export function computeWallFootprints(walls: Wall[]): Map<string, WallFootprint> {
  const footprints = new Map<string, WallFootprint>();
  if (walls.length === 0) return footprints;

  // 1. Filter out degenerate walls
  const validWalls = walls.filter(w => distance(w.start, w.end) >= 1.0);

  // 2. Map of custom resolved caps: key = `${wallId}:${endpoint}`
  const resolvedCaps = new Map<string, EndpointCap>();

  // Helper to mark cap
  const getCapKey = (wallId: string, endpoint: 'start' | 'end') => `${wallId}:${endpoint}`;

  // 3. Detect T-Junctions (endpoint touching interior of another wall)
  for (const wTerm of validWalls) {
    for (const endpoint of ['start', 'end'] as const) {
      const pt = endpoint === 'start' ? wTerm.start : wTerm.end;
      const key = getCapKey(wTerm.id, endpoint);
      if (resolvedCaps.has(key)) continue;

      for (const wCont of validWalls) {
        if (wCont.id === wTerm.id) continue;
        const proj = projectPointOntoSegment(pt, wCont.start, wCont.end);
        // Interior projection: not at the very ends of the continuing wall
        if (proj.distance <= JUNCTION_TOLERANCE && proj.t > 0.01 && proj.t < 0.99) {
          const cap = calculateTJoin(wCont, wTerm, endpoint);
          resolvedCaps.set(key, cap);
          break;
        }
      }
    }
  }

  // 4. Group remaining endpoints into clusters (Endpoint-to-Endpoint junctions)
  interface EndpointRef {
    wall: Wall;
    endpoint: 'start' | 'end';
    pt: Point2D;
    opp: Point2D;
  }
  const endpointClusters: EndpointRef[][] = [];

  for (const wall of validWalls) {
    for (const ep of ['start', 'end'] as const) {
      const key = getCapKey(wall.id, ep);
      if (resolvedCaps.has(key)) continue;

      const pt = ep === 'start' ? wall.start : wall.end;
      const opp = ep === 'start' ? wall.end : wall.start;
      const ref: EndpointRef = { wall, endpoint: ep, pt, opp };

      let added = false;
      for (const cluster of endpointClusters) {
        if (distance(cluster[0].pt, pt) <= JUNCTION_TOLERANCE) {
          cluster.push(ref);
          added = true;
          break;
        }
      }
      if (!added) {
        endpointClusters.push([ref]);
      }
    }
  }

  // 5. Resolve Endpoint Clusters
  for (const cluster of endpointClusters) {
    if (cluster.length === 1) {
      // Free end: default square cap
      const ref = cluster[0];
      const dirAway = normalizeVector({ x: ref.opp.x - ref.pt.x, y: ref.opp.y - ref.pt.y });
      const norm = { x: -dirAway.y, y: dirAway.x };
      const h = (ref.wall.thickness || 150) / 2;
      resolvedCaps.set(getCapKey(ref.wall.id, ref.endpoint), {
        left: { x: ref.pt.x + h * norm.x, y: ref.pt.y + h * norm.y },
        right: { x: ref.pt.x - h * norm.x, y: ref.pt.y - h * norm.y },
        joinType: 'square',
      });
    } else if (cluster.length === 2) {
      // L-junction or 2-wall collinear junction
      const ref1 = cluster[0];
      const ref2 = cluster[1];
      const lResult = calculateLJoin(ref1.wall, ref1.endpoint, ref2.wall, ref2.endpoint);
      resolvedCaps.set(getCapKey(ref1.wall.id, ref1.endpoint), lResult.cap1);
      resolvedCaps.set(getCapKey(ref2.wall.id, ref2.endpoint), lResult.cap2);
    } else if (cluster.length === 3) {
      // 3-way junction: check if two are collinear continuing walls
      let cont1Idx = -1, cont2Idx = -1, termIdx = -1;
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          const d1 = normalizeVector({ x: cluster[i].opp.x - cluster[i].pt.x, y: cluster[i].opp.y - cluster[i].pt.y });
          const d2 = normalizeVector({ x: cluster[j].opp.x - cluster[j].pt.x, y: cluster[j].opp.y - cluster[j].pt.y });
          if (dotProduct(d1, d2) < -0.9) {
            cont1Idx = i;
            cont2Idx = j;
            termIdx = 3 - i - j;
            break;
          }
        }
        if (cont1Idx !== -1) break;
      }

      if (cont1Idx !== -1 && termIdx !== -1) {
        // Flat butt connection between continuing walls
        const r1 = cluster[cont1Idx];
        const r2 = cluster[cont2Idx];
        const rTerm = cluster[termIdx];

        const d1 = normalizeVector({ x: r1.opp.x - r1.pt.x, y: r1.opp.y - r1.pt.y });
        const n1 = { x: -d1.y, y: d1.x };
        const h1 = (r1.wall.thickness || 150) / 2;
        const h2 = (r2.wall.thickness || 150) / 2;

        resolvedCaps.set(getCapKey(r1.wall.id, r1.endpoint), {
          left: { x: r1.pt.x + h1 * n1.x, y: r1.pt.y + h1 * n1.y },
          right: { x: r1.pt.x - h1 * n1.x, y: r1.pt.y - h1 * n1.y },
          joinType: 'butt',
        });
        resolvedCaps.set(getCapKey(r2.wall.id, r2.endpoint), {
          left: { x: r2.pt.x - h2 * n1.x, y: r2.pt.y - h2 * n1.y },
          right: { x: r2.pt.x + h2 * n1.x, y: r2.pt.y + h2 * n1.y },
          joinType: 'butt',
        });

        // Terminating wall butts against continuous line face
        const dTerm = normalizeVector({ x: rTerm.opp.x - rTerm.pt.x, y: rTerm.opp.y - rTerm.pt.y });
        const side = dotProduct(dTerm, n1) >= 0 ? 1 : -1;
        const facePt = { x: rTerm.pt.x + side * h1 * n1.x, y: rTerm.pt.y + side * h1 * n1.y };
        const hTerm = (rTerm.wall.thickness || 150) / 2;
        const nTerm = { x: -dTerm.y, y: dTerm.x };
        const tL = intersectLines({ x: rTerm.pt.x + hTerm * nTerm.x, y: rTerm.pt.y + hTerm * nTerm.y }, dTerm, facePt, d1) || facePt;
        const tR = intersectLines({ x: rTerm.pt.x - hTerm * nTerm.x, y: rTerm.pt.y - hTerm * nTerm.y }, dTerm, facePt, d1) || facePt;

        resolvedCaps.set(getCapKey(rTerm.wall.id, rTerm.endpoint), {
          left: tL,
          right: tR,
          joinType: 'butt',
        });
      } else {
        // Fallback for non-collinear 3-way junction
        for (const ref of cluster) {
          const d = normalizeVector({ x: ref.opp.x - ref.pt.x, y: ref.opp.y - ref.pt.y });
          const n = { x: -d.y, y: d.x };
          const h = (ref.wall.thickness || 150) / 2;
          resolvedCaps.set(getCapKey(ref.wall.id, ref.endpoint), {
            left: { x: ref.pt.x + h * n.x, y: ref.pt.y + h * n.y },
            right: { x: ref.pt.x - h * n.x, y: ref.pt.y - h * n.y },
            joinType: 'butt',
          });
        }
      }
    } else {
      // 4-way Cross Junction or complex junction
      // Find the pair with greatest thickness / length to serve as through wall
      cluster.sort((a, b) => (b.wall.thickness || 150) - (a.wall.thickness || 150));
      for (const ref of cluster) {
        const d = normalizeVector({ x: ref.opp.x - ref.pt.x, y: ref.opp.y - ref.pt.y });
        const n = { x: -d.y, y: d.x };
        const h = (ref.wall.thickness || 150) / 2;
        resolvedCaps.set(getCapKey(ref.wall.id, ref.endpoint), {
          left: { x: ref.pt.x + h * n.x, y: ref.pt.y + h * n.y },
          right: { x: ref.pt.x - h * n.x, y: ref.pt.y - h * n.y },
          joinType: 'butt',
        });
      }
    }
  }

  // 6. Build closed footprint polygon for each wall
  for (const wall of validWalls) {
    const startCap = resolvedCaps.get(getCapKey(wall.id, 'start'));
    const endCap = resolvedCaps.get(getCapKey(wall.id, 'end'));

    const wallDir = normalizeVector({ x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y });
    const wallNorm = { x: -wallDir.y, y: wallDir.x };
    const h = (wall.thickness || 150) / 2;

    const sLeft = startCap ? startCap.left : { x: wall.start.x + h * wallNorm.x, y: wall.start.y + h * wallNorm.y };
    const sRight = startCap ? startCap.right : { x: wall.start.x - h * wallNorm.x, y: wall.start.y - h * wallNorm.y };

    const eLeft = endCap ? endCap.right : { x: wall.end.x + h * wallNorm.x, y: wall.end.y + h * wallNorm.y };
    const eRight = endCap ? endCap.left : { x: wall.end.x - h * wallNorm.x, y: wall.end.y - h * wallNorm.y };

    const rawPoly = [sLeft, eLeft, eRight, sRight];
    const cleanPoly = cleanPolygonVertices(rawPoly);
    const valid = cleanPoly.length >= 3 && isSimplePolygon(cleanPoly);

    footprints.set(wall.id, {
      wallId: wall.id,
      polygon: valid ? cleanPoly : rawPoly,
      startJoin: startCap ? startCap.joinType : 'square',
      endJoin: endCap ? endCap.joinType : 'square',
      startCap: [sLeft, sRight],
      endCap: [eRight, eLeft],
      isValid: valid,
    });
  }

  return footprints;
}

/**
 * Computes endpoint trim offsets along wall centerline for 3D volumetric extrusion,
 * preventing box penetration and z-fighting at T-junctions and butt connections.
 */
export function getWallTrimOffsets(
  wall: Wall,
  footprint?: WallFootprint
): { startTrim: number; endTrim: number } {
  if (!footprint) return { startTrim: 0, endTrim: 0 };

  const wallLen = distance(wall.start, wall.end);
  if (wallLen < 1.0) return { startTrim: 0, endTrim: 0 };

  const wallDir = normalizeVector({ x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y });
  let startTrim = 0;
  let endTrim = 0;

  if (footprint.startJoin === 'butt' && footprint.startCap) {
    const midStart = {
      x: (footprint.startCap[0].x + footprint.startCap[1].x) / 2,
      y: (footprint.startCap[0].y + footprint.startCap[1].y) / 2,
    };
    const sOffset = dotProduct({ x: midStart.x - wall.start.x, y: midStart.y - wall.start.y }, wallDir);
    if (sOffset > 0) {
      startTrim = sOffset;
    }
  }

  if (footprint.endJoin === 'butt' && footprint.endCap) {
    const midEnd = {
      x: (footprint.endCap[0].x + footprint.endCap[1].x) / 2,
      y: (footprint.endCap[0].y + footprint.endCap[1].y) / 2,
    };
    const eOffset = dotProduct({ x: wall.end.x - midEnd.x, y: wall.end.y - midEnd.y }, wallDir);
    if (eOffset > 0) {
      endTrim = eOffset;
    }
  }

  // Safety clamps: ensure trimmed wall maintains at least 10mm positive length
  const maxAllowableTrim = Math.max(0, wallLen - 10);
  startTrim = Math.max(0, Math.min(maxAllowableTrim, startTrim));
  endTrim = Math.max(0, Math.min(wallLen - startTrim - 10, endTrim));

  return { startTrim, endTrim };
}

