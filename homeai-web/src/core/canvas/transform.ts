import { Point2D, Wall } from "../domain/types";

export function mmToScreen(
  pointMm: Point2D,
  zoom: number,
  panOffset: Point2D,
  canvasOrigin: Point2D = { x: 0, y: 0 }
): Point2D {
  return {
    x: (pointMm.x * zoom) + panOffset.x + canvasOrigin.x,
    y: (pointMm.y * zoom) + panOffset.y + canvasOrigin.y,
  };
}

export function screenToMm(
  pointPx: Point2D,
  zoom: number,
  panOffset: Point2D,
  canvasOrigin: Point2D = { x: 0, y: 0 }
): Point2D {
  return {
    x: (pointPx.x - panOffset.x - canvasOrigin.x) / zoom,
    y: (pointPx.y - panOffset.y - canvasOrigin.y) / zoom,
  };
}

export function getViewBounds(
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  panOffset: Point2D
) {
  const topLeft = screenToMm({ x: 0, y: 0 }, zoom, panOffset);
  const bottomRight = screenToMm({ x: canvasWidth, y: canvasHeight }, zoom, panOffset);
  
  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
  };
}

export function fitToContent(
  walls: Wall[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 50
): { zoom: number; panOffset: Point2D } {
  if (walls.length === 0) return { zoom: 1, panOffset: { x: canvasWidth / 2, y: canvasHeight / 2 } };

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  walls.forEach(w => {
    minX = Math.min(minX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  });

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const zoomX = availableWidth / (contentWidth || 1);
  const zoomY = availableHeight / (contentHeight || 1);
  
  const zoom = Math.min(zoomX, zoomY, 5); // Max zoom 5
  
  const centerX = minX + contentWidth / 2;
  const centerY = minY + contentHeight / 2;
  
  const panOffset = {
    x: (canvasWidth / 2) - (centerX * zoom),
    y: (canvasHeight / 2) - (centerY * zoom)
  };
  
  return { zoom, panOffset };
}
