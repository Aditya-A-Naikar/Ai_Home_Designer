import { Project } from "../domain/types";
import { wallLength } from "../geometry/wall-utils";
import { Vector2D } from "../geometry/vector";
import { polygonArea, polygonCentroid } from "../geometry/room-utils";

export interface SvgExportOptions {
  showDimensions?: boolean;
  showGrid?: boolean;
  showTitleBlock?: boolean;
}

/**
 * Generates a clean, standalone, printable architectural SVG blueprint from a floor plan.
 */
export function exportFloorToSvg(project: Project, floorId: string, options: SvgExportOptions = {}): string {
  const { showDimensions = true, showGrid = true, showTitleBlock = true } = options;
  const floor = project.floors.find(f => f.id === floorId) || project.floors[0];
  if (!floor) return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><text x="50" y="50">No floor found</text></svg>`;

  const walls = floor.walls;
  const rooms = floor.rooms;

  // Calculate bounding box of walls
  let minX = 0;
  let minY = 0;
  let maxX = project.plotDimensions.width || 10000;
  let maxY = project.plotDimensions.depth || 8000;

  if (walls.length > 0) {
    minX = Math.min(...walls.flatMap(w => [w.start.x, w.end.x]));
    minY = Math.min(...walls.flatMap(w => [w.start.y, w.end.y]));
    maxX = Math.max(...walls.flatMap(w => [w.start.x, w.end.x]));
    maxY = Math.max(...walls.flatMap(w => [w.start.y, w.end.y]));
  }

  const padding = 1500; // mm margin around drawing
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxW = (maxX - minX) + padding * 2;
  const viewBoxH = (maxY - minY) + padding * 2 + (showTitleBlock ? 1200 : 0);

  // SVG Header
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="100%" height="100%">
  <defs>
    <style>
      .blueprint-bg { fill: #0f172a; }
      .grid-line { stroke: #1e293b; stroke-width: 15; }
      .wall-body { stroke: #cbd5e1; stroke-linecap: square; }
      .wall-partition { stroke: #94a3b8; stroke-linecap: square; }
      .room-fill { fill-opacity: 0.15; stroke-dasharray: 60 30; stroke-width: 25; }
      .room-text { fill: #f8fafc; font-family: -apple-system, sans-serif; font-weight: bold; text-anchor: middle; }
      .dim-line { stroke: #64748b; stroke-width: 20; }
      .dim-tick { stroke: #94a3b8; stroke-width: 30; }
      .dim-text { fill: #cbd5e1; font-family: -apple-system, sans-serif; font-size: 140px; font-weight: 600; text-anchor: middle; }
      .door-swing { fill: none; stroke-dasharray: 40 25; stroke-width: 20; }
      .title-text { fill: #f8fafc; font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" class="blueprint-bg" />
`;

  // Grid
  if (showGrid) {
    const gridStep = 1000; // 1 meter grid
    const startGridX = Math.floor(viewBoxX / gridStep) * gridStep;
    const endGridX = Math.ceil((viewBoxX + viewBoxW) / gridStep) * gridStep;
    const startGridY = Math.floor(viewBoxY / gridStep) * gridStep;
    const endGridY = Math.ceil((viewBoxY + viewBoxH) / gridStep) * gridStep;

    svg += `  <g class="grid-layer">\n`;
    for (let x = startGridX; x <= endGridX; x += gridStep) {
      svg += `    <line x1="${x}" y1="${viewBoxY}" x2="${x}" y2="${viewBoxY + viewBoxH}" class="grid-line" />\n`;
    }
    for (let y = startGridY; y <= endGridY; y += gridStep) {
      svg += `    <line x1="${viewBoxX}" y1="${y}" x2="${viewBoxX + viewBoxW}" y2="${y}" class="grid-line" />\n`;
    }
    svg += `  </g>\n`;
  }

  // Rooms
  svg += `  <g class="rooms-layer">\n`;
  for (const r of rooms) {
    const pointsStr = r.polygon.map(p => `${p.x},${p.y}`).join(" ");
    const color = r.color || "#38bdf8";
    const areaM2 = (polygonArea(r.polygon) / 1_000_000).toFixed(1);
    const centroid = polygonCentroid(r.polygon);

    svg += `    <polygon points="${pointsStr}" fill="${color}" stroke="${color}" class="room-fill" />\n`;
    svg += `    <g transform="translate(${centroid.x}, ${centroid.y})">\n`;
    svg += `      <rect x="-800" y="-300" width="1600" height="600" rx="80" fill="#0f172a" fill-opacity="0.85" stroke="${color}" stroke-width="20" />\n`;
    svg += `      <text x="0" y="-40" class="room-text" font-size="200">${r.name}</text>\n`;
    svg += `      <text x="0" y="160" fill="${color}" font-family="sans-serif" font-size="160" font-weight="600" text-anchor="middle">${areaM2} m²</text>\n`;
    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // Walls & Doors & Windows
  svg += `  <g class="walls-layer">\n`;
  for (const w of walls) {
    const isExterior = w.thickness >= 200;
    const strokeClass = isExterior ? "wall-body" : "wall-partition";
    const v = Vector2D.fromPoints(w.start, w.end);
    const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);

    // Wall line
    svg += `    <line x1="${w.start.x}" y1="${w.start.y}" x2="${w.end.x}" y2="${w.end.y}" stroke-width="${w.thickness}" class="${strokeClass}" />\n`;

    // Doors
    for (const d of w.doors) {
      const halfW = d.width / 2;
      const isLeft = d.swingDirection.includes("left");
      const isOutward = d.swingDirection.includes("outward");
      const hingeX = isLeft ? -halfW : halfW;
      const swingY = isOutward ? (w.thickness / 2 + d.width) : (-w.thickness / 2 - d.width);
      const arcSweep = isOutward !== isLeft ? 1 : 0;

      svg += `    <g transform="translate(${w.start.x}, ${w.start.y}) rotate(${angle}) translate(${d.offset}, 0)">\n`;
      // Opening cutout
      svg += `      <rect x="${-halfW}" y="${-w.thickness / 2 - 2}" width="${d.width}" height="${w.thickness + 4}" fill="#0f172a" />\n`;
      // Door leaf
      svg += `      <line x1="${hingeX}" y1="0" x2="${hingeX}" y2="${swingY}" stroke="#f59e0b" stroke-width="35" />\n`;
      // Swing arc
      svg += `      <path d="M ${isLeft ? halfW : -halfW} 0 A ${d.width} ${d.width} 0 0 ${arcSweep} ${hingeX} ${swingY}" stroke="#f59e0b" class="door-swing" />\n`;
      svg += `    </g>\n`;
    }

    // Windows
    for (const win of w.windows) {
      const halfW = win.width / 2;
      svg += `    <g transform="translate(${w.start.x}, ${w.start.y}) rotate(${angle}) translate(${win.offset}, 0)">\n`;
      svg += `      <rect x="${-halfW}" y="${-w.thickness / 2 - 2}" width="${win.width}" height="${w.thickness + 4}" fill="#0f172a" />\n`;
      svg += `      <line x1="${-halfW}" y1="${-w.thickness / 4}" x2="${halfW}" y2="${-w.thickness / 4}" stroke="#38bdf8" stroke-width="25" />\n`;
      svg += `      <line x1="${-halfW}" y1="${w.thickness / 4}" x2="${halfW}" y2="${w.thickness / 4}" stroke="#38bdf8" stroke-width="25" />\n`;
      svg += `    </g>\n`;
    }
  }
  svg += `  </g>\n`;

  // Dimensions
  if (showDimensions) {
    svg += `  <g class="dimensions-layer">\n`;
    for (const w of walls) {
      const len = wallLength(w);
      if (len < 300) continue;
      const v = Vector2D.fromPoints(w.start, w.end);
      const normal = v.normalize().perpendicular();
      const offset = 300;
      const p1 = new Vector2D(w.start.x, w.start.y).add(normal.scale(offset));
      const p2 = new Vector2D(w.end.x, w.end.y).add(normal.scale(offset));
      const mid = new Vector2D((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);
      const flipText = angle > 90 || angle < -90;
      const textAngle = flipText ? angle + 180 : angle;

      svg += `    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="dim-line" />\n`;
      svg += `    <line x1="${p1.x - 40}" y1="${p1.y - 40}" x2="${p1.x + 40}" y2="${p1.y + 40}" class="dim-tick" />\n`;
      svg += `    <line x1="${p2.x - 40}" y1="${p2.y - 40}" x2="${p2.x + 40}" y2="${p2.y + 40}" class="dim-tick" />\n`;
      svg += `    <g transform="translate(${mid.x}, ${mid.y}) rotate(${textAngle})">\n`;
      svg += `      <rect x="-240" y="-80" width="480" height="160" rx="30" fill="#0f172a" stroke="#64748b" stroke-width="15" />\n`;
      svg += `      <text x="0" y="45" class="dim-text">${(len / 1000).toFixed(2)} m</text>\n`;
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // Architectural Title Block & North Arrow
  if (showTitleBlock) {
    const tbY = maxY + padding - 200;
    const totalAreaM2 = rooms.reduce((acc, r) => acc + polygonArea(r.polygon), 0) / 1_000_000;

    svg += `  <g class="title-block" transform="translate(${minX}, ${tbY})">\n`;
    svg += `    <rect x="0" y="0" width="${maxX - minX}" height="800" rx="40" fill="#1e293b" stroke="#475569" stroke-width="30" />\n`;
    svg += `    <text x="60" y="240" class="title-text" font-size="320" font-weight="bold">${project.name}</text>\n`;
    svg += `    <text x="60" y="460" class="title-text" font-size="180" fill="#94a3b8">Floor: ${floor.name}  |  Total Area: ${totalAreaM2.toFixed(1)} m²  |  Unit: ${project.settings.preferredUnit}</text>\n`;
    svg += `    <text x="60" y="650" class="title-text" font-size="140" fill="#64748b">Generated by HomeAI Designer  |  Scale: 1:100 Metric  |  Date: ${new Date().toISOString().split("T")[0]}</text>\n`;

    // North Arrow Icon
    const arrowX = (maxX - minX) - 400;
    svg += `    <g transform="translate(${arrowX}, 400)">\n`;
    svg += `      <circle r="220" fill="none" stroke="#64748b" stroke-width="20" />\n`;
    svg += `      <polygon points="0,-180 80,120 0,60" fill="#ef4444" />\n`;
    svg += `      <polygon points="0,-180 -80,120 0,60" fill="#94a3b8" />\n`;
    svg += `      <text x="0" y="-230" fill="#f8fafc" font-size="140" font-weight="bold" text-anchor="middle">N</text>\n`;
    svg += `    </g>\n`;

    svg += `  </g>\n`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Triggers a browser download of the floor plan as a .svg blueprint.
 */
export function downloadFloorSvg(project: Project, floorId: string): void {
  if (typeof window === "undefined") return;

  const svgContent = exportFloorToSvg(project, floorId);
  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const sanitizedName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizedName}-blueprint.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
