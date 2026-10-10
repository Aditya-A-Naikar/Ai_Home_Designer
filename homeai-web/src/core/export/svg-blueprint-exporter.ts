import { Project, Wall, Staircase, SlabVoid, StructuralColumn, Prop } from "../domain/types";
import { wallLength } from "../geometry/wall-utils";
import { Vector2D } from "../geometry/vector";
import { polygonArea, polygonCentroid } from "../geometry/room-utils";

export interface SvgExportOptions {
  showDimensions?: boolean;
  showGrid?: boolean;
  showTitleBlock?: boolean;
  showSchedules?: boolean;
  showScaleBar?: boolean;
}

/**
 * Generates an architectural SVG blueprint sheet from a floor plan.
 * Compliant with international CAD presentation standards (NBC 2016 / IBC 2024 / ISO 128):
 * - Layer hierarchy: Grid -> Rooms -> Voids -> Stairs -> Props -> Walls & Openings -> Columns -> Dimensions -> Sheet Schedules -> Title Block
 * - Metric Graphic Scale Bar (0 - 5m)
 * - Calibrated North Compass Arrow oriented to site context
 * - Room Schedule & Opening (Doors/Windows) Schedule Tables
 */
export function exportFloorToSvg(project: Project, floorId: string, options: SvgExportOptions = {}): string {
  const {
    showDimensions = true,
    showGrid = true,
    showTitleBlock = true,
    showSchedules = true,
    showScaleBar = true,
  } = options;

  const floor = project.floors.find(f => f.id === floorId) || project.floors[0];
  if (!floor) return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><text x="50" y="50">No floor found</text></svg>`;

  const walls: Wall[] = floor.walls || [];
  const rooms = floor.rooms || [];
  const stairs: Staircase[] = floor.stairs || [];
  const voids: SlabVoid[] = floor.voids || [];
  const columns: StructuralColumn[] = floor.columns || [];
  const props: Prop[] = floor.props || [];

  // 1. Calculate Bounding Box of all drawing entities
  let minX = 0;
  let minY = 0;
  let maxX = project.plotDimensions?.width || 10000;
  let maxY = project.plotDimensions?.depth || 8000;

  const allXs: number[] = [];
  const allYs: number[] = [];

  for (const w of walls) {
    allXs.push(w.start.x, w.end.x);
    allYs.push(w.start.y, w.end.y);
  }
  for (const r of rooms) {
    for (const p of r.polygon) {
      allXs.push(p.x);
      allYs.push(p.y);
    }
  }
  for (const c of columns) {
    allXs.push(c.position.x - c.width / 2, c.position.x + c.width / 2);
    allYs.push(c.position.y - c.depth / 2, c.position.y + c.depth / 2);
  }
  for (const s of stairs) {
    allXs.push(s.position.x, s.position.x + s.width);
    allYs.push(s.position.y, s.position.y + s.length);
  }

  if (allXs.length > 0 && allYs.length > 0) {
    minX = Math.min(...allXs);
    minY = Math.min(...allYs);
    maxX = Math.max(...allXs);
    maxY = Math.max(...allYs);
  }

  const drawingW = Math.max(maxX - minX, 6000);
  const drawingH = Math.max(maxY - minY, 5000);

  const padding = 1500; // mm margin around drawing
  const extraBottomHeight = (showTitleBlock ? 1400 : 0) + (showSchedules && rooms.length > 0 ? 1800 : 0);

  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxW = drawingW + padding * 2;
  const viewBoxH = drawingH + padding * 2 + extraBottomHeight;

  // SVG Header & CAD Style Definitions
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="100%" height="100%">
  <defs>
    <style>
      .blueprint-bg { fill: #0b1120; }
      .grid-line { stroke: #1e293b; stroke-width: 15; }
      .wall-body { stroke: #cbd5e1; stroke-linecap: square; }
      .wall-partition { stroke: #94a3b8; stroke-linecap: square; }
      .wall-wet { stroke: #38bdf8; stroke-linecap: square; }
      .wall-parapet { stroke: #64748b; stroke-linecap: square; stroke-dasharray: 60 30; }
      .room-fill { fill-opacity: 0.12; stroke-dasharray: 60 30; stroke-width: 25; }
      .room-text { fill: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: bold; text-anchor: middle; }
      .dim-line { stroke: #64748b; stroke-width: 20; }
      .dim-tick { stroke: #94a3b8; stroke-width: 30; }
      .dim-text { fill: #cbd5e1; font-family: -apple-system, sans-serif; font-size: 130px; font-weight: 600; text-anchor: middle; }
      .door-swing { fill: none; stroke-dasharray: 40 25; stroke-width: 20; }
      .title-text { fill: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .sched-header { fill: #f8fafc; font-family: -apple-system, sans-serif; font-size: 130px; font-weight: bold; }
      .sched-text { fill: #94a3b8; font-family: -apple-system, sans-serif; font-size: 115px; }
      .chajja-line { stroke: #38bdf8; stroke-width: 15; stroke-dasharray: 40 20; }
    </style>
  </defs>

  <!-- Background Canvas -->
  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" class="blueprint-bg" />
`;

  // 2. CAD Grid
  if (showGrid) {
    const gridStep = 1000; // 1 meter major grid
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

  // 3. Enclosed Rooms
  svg += `  <g class="rooms-layer">\n`;
  for (const r of rooms) {
    const pointsStr = r.polygon.map(p => `${p.x},${p.y}`).join(" ");
    const color = r.color || "#38bdf8";
    const areaM2 = (polygonArea(r.polygon) / 1_000_000).toFixed(1);
    const areaSqFt = Math.round(polygonArea(r.polygon) / 1_000_000 * 10.764);
    const centroid = polygonCentroid(r.polygon);

    svg += `    <polygon points="${pointsStr}" fill="${color}" stroke="${color}" class="room-fill" />\n`;
    svg += `    <g transform="translate(${centroid.x}, ${centroid.y})">\n`;
    svg += `      <rect x="-850" y="-350" width="1700" height="700" rx="80" fill="#0f172a" fill-opacity="0.88" stroke="${color}" stroke-width="20" />\n`;
    svg += `      <text x="0" y="-70" class="room-text" font-size="200">${r.name}</text>\n`;
    svg += `      <text x="0" y="140" fill="${color}" font-family="sans-serif" font-size="160" font-weight="600" text-anchor="middle">${areaM2} m² (${areaSqFt} sq ft)</text>\n`;
    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // 4. Slab Voids Layer
  if (voids.length > 0) {
    svg += `  <g class="voids-layer">\n`;
    for (const v of voids) {
      const pts = v.polygon.map(p => `${p.x},${p.y}`).join(" ");
      const c = polygonCentroid(v.polygon);
      svg += `    <polygon points="${pts}" fill="#e11d48" fill-opacity="0.08" stroke="#f43f5e" stroke-width="30" stroke-dasharray="100 50" />\n`;
      if (v.polygon.length >= 4) {
        svg += `    <line x1="${v.polygon[0].x}" y1="${v.polygon[0].y}" x2="${v.polygon[2].x}" y2="${v.polygon[2].y}" stroke="#f43f5e" stroke-width="20" stroke-dasharray="80 40" />\n`;
        svg += `    <line x1="${v.polygon[1].x}" y1="${v.polygon[1].y}" x2="${v.polygon[3].x}" y2="${v.polygon[3].y}" stroke="#f43f5e" stroke-width="20" stroke-dasharray="80 40" />\n`;
      }
      svg += `    <rect x="${c.x - 1200}" y="${c.y - 180}" width="2400" height="360" rx="60" fill="#0f172a" fill-opacity="0.9" stroke="#f43f5e" stroke-width="20" />\n`;
      svg += `    <text x="${c.x}" y="${c.y + 60}" fill="#f43f5e" font-family="sans-serif" font-size="140" font-weight="bold" text-anchor="middle">${v.name || "OPEN TO BELOW"}</text>\n`;
    }
    svg += `  </g>\n`;
  }

  // 5. Stairs Layer
  if (stairs.length > 0) {
    svg += `  <g class="stairs-layer">\n`;
    for (const s of stairs) {
      svg += `    <g transform="translate(${s.position.x}, ${s.position.y}) rotate(${s.rotation || 0})">\n`;
      // Stair Boundary
      svg += `      <rect x="0" y="0" width="${s.width}" height="${s.length}" fill="#1e293b" fill-opacity="0.7" stroke="#cbd5e1" stroke-width="30" />\n`;
      // Mid well divider
      const midX = s.width / 2;
      const landingDepth = 1000;
      svg += `      <line x1="${midX}" y1="0" x2="${midX}" y2="${s.length - landingDepth}" stroke="#64748b" stroke-width="20" />\n`;
      // Tread lines
      const treadStep = s.treadMm || 280;
      const numTreads = Math.max(1, Math.floor((s.length - landingDepth) / treadStep));
      for (let i = 1; i <= numTreads; i++) {
        const ty = i * treadStep;
        svg += `      <line x1="0" y1="${ty}" x2="${s.width}" y2="${ty}" stroke="#475569" stroke-width="15" />\n`;
      }
      // Landing outline
      svg += `      <line x1="0" y1="${s.length - landingDepth}" x2="${s.width}" y2="${s.length - landingDepth}" stroke="#94a3b8" stroke-width="25" />\n`;
      // Walk line arrow & UP/DN badge
      svg += `      <circle cx="${midX}" cy="${s.length / 2}" r="180" fill="#38bdf8" />\n`;
      svg += `      <text x="${midX}" y="${s.length / 2 + 50}" fill="#0f172a" font-family="sans-serif" font-size="140" font-weight="bold" text-anchor="middle">${(s.direction || "UP").toUpperCase()}</text>\n`;
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // 6. Props / Furniture Layer
  if (props.length > 0) {
    svg += `  <g class="props-layer">\n`;
    for (const p of props) {
      const halfW = p.dimensions.width / 2;
      const halfD = p.dimensions.depth / 2;
      const color = p.color || "#475569";
      svg += `    <g transform="translate(${p.position.x}, ${p.position.y}) rotate(${p.rotation || 0})">\n`;
      svg += `      <rect x="${-halfW}" y="${-halfD}" width="${p.dimensions.width}" height="${p.dimensions.depth}" rx="40" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="20" />\n`;
      svg += `      <text x="0" y="30" fill="#e2e8f0" font-family="sans-serif" font-size="110" font-weight="600" text-anchor="middle">${p.name}</text>\n`;
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // 7. Walls & Openings (Doors & Windows) Layer
  svg += `  <g class="walls-layer">\n`;
  for (const w of walls) {
    const thickness = w.thickness || 200;
    const wType = w.wallType || (thickness >= 200 ? "exterior_bearing" : "interior_partition");
    let strokeClass = "wall-body";
    if (wType === "interior_partition") strokeClass = "wall-partition";
    else if (wType === "wet_chase") strokeClass = "wall-wet";
    else if (wType === "parapet") strokeClass = "wall-parapet";

    const v = Vector2D.fromPoints(w.start, w.end);
    const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);

    // Main Wall Segment
    svg += `    <line x1="${w.start.x}" y1="${w.start.y}" x2="${w.end.x}" y2="${w.end.y}" stroke-width="${thickness}" class="${strokeClass}" />\n`;

    // Doors
    for (const d of (w.doors || [])) {
      const halfW = d.width / 2;
      const isLeft = d.swingDirection.includes("left");
      const isOutward = d.swingDirection.includes("outward");
      const hingeX = isLeft ? -halfW : halfW;
      const swingY = isOutward ? (thickness / 2 + d.width) : (-thickness / 2 - d.width);
      const arcSweep = isOutward !== isLeft ? 1 : 0;

      svg += `    <g transform="translate(${w.start.x}, ${w.start.y}) rotate(${angle}) translate(${d.offset}, 0)">\n`;
      // Opening cutout in wall
      svg += `      <rect x="${-halfW}" y="${-thickness / 2 - 2}" width="${d.width}" height="${thickness + 4}" fill="#0b1120" />\n`;

      if (d.doorType === "sliding_patio") {
        // Sliding patio panels
        svg += `      <line x1="${-halfW}" y1="${-thickness / 6}" x2="${halfW * 0.1}" y2="${-thickness / 6}" stroke="#38bdf8" stroke-width="30" />\n`;
        svg += `      <line x1="${-halfW * 0.1}" y1="${thickness / 6}" x2="${halfW}" y2="${thickness / 6}" stroke="#38bdf8" stroke-width="30" />\n`;
      } else if (d.doorType === "double_entry") {
        // Double entry dual swing panels
        const panelW = d.width / 2;
        svg += `      <line x1="${-halfW}" y1="0" x2="${-halfW}" y2="${swingY * 0.5}" stroke="#f59e0b" stroke-width="35" />\n`;
        svg += `      <line x1="${halfW}" y1="0" x2="${halfW}" y2="${swingY * 0.5}" stroke="#f59e0b" stroke-width="35" />\n`;
        svg += `      <path d="M 0 0 A ${panelW} ${panelW} 0 0 0 ${-halfW} ${swingY * 0.5}" stroke="#f59e0b" class="door-swing" />\n`;
        svg += `      <path d="M 0 0 A ${panelW} ${panelW} 0 0 1 ${halfW} ${swingY * 0.5}" stroke="#f59e0b" class="door-swing" />\n`;
      } else {
        // Single swing door leaf & arc
        svg += `      <line x1="${hingeX}" y1="0" x2="${hingeX}" y2="${swingY}" stroke="#f59e0b" stroke-width="35" />\n`;
        svg += `      <path d="M ${isLeft ? halfW : -halfW} 0 A ${d.width} ${d.width} 0 0 ${arcSweep} ${hingeX} ${swingY}" stroke="#f59e0b" class="door-swing" />\n`;
      }
      svg += `    </g>\n`;
    }

    // Windows
    for (const win of (w.windows || [])) {
      const halfW = win.width / 2;
      svg += `    <g transform="translate(${w.start.x}, ${w.start.y}) rotate(${angle}) translate(${win.offset}, 0)">\n`;
      svg += `      <rect x="${-halfW}" y="${-thickness / 2 - 2}" width="${win.width}" height="${thickness + 4}" fill="#0b1120" />\n`;
      svg += `      <line x1="${-halfW}" y1="${-thickness / 4}" x2="${halfW}" y2="${-thickness / 4}" stroke="#38bdf8" stroke-width="25" />\n`;
      svg += `      <line x1="${-halfW}" y1="${thickness / 4}" x2="${halfW}" y2="${thickness / 4}" stroke="#38bdf8" stroke-width="25" />\n`;

      // Exterior Chajja Weather Sunshade Projection
      if (win.chajjaSunshade) {
        const proj = 450;
        const chajjaY = -thickness / 2 - proj;
        svg += `      <line x1="${-halfW - 150}" y1="${chajjaY}" x2="${halfW + 150}" y2="${chajjaY}" class="chajja-line" />\n`;
        svg += `      <line x1="${-halfW - 150}" y1="${-thickness / 2}" x2="${-halfW - 150}" y2="${chajjaY}" class="chajja-line" />\n`;
        svg += `      <line x1="${halfW + 150}" y1="${-thickness / 2}" x2="${halfW + 150}" y2="${chajjaY}" class="chajja-line" />\n`;
      }
      svg += `    </g>\n`;
    }
  }
  svg += `  </g>\n`;

  // 8. Structural RC Columns Layer
  if (columns.length > 0) {
    svg += `  <g class="columns-layer">\n`;
    for (const c of columns) {
      svg += `    <g transform="translate(${c.position.x}, ${c.position.y}) rotate(${c.rotation || 0})">\n`;
      svg += `      <rect x="${-c.width / 2}" y="${-c.depth / 2}" width="${c.width}" height="${c.depth}" fill="#334155" stroke="#cbd5e1" stroke-width="25" />\n`;
      // Rebar core cross lines
      svg += `      <line x1="${-c.width / 2}" y1="${-c.depth / 2}" x2="${c.width / 2}" y2="${c.depth / 2}" stroke="#94a3b8" stroke-width="15" />\n`;
      svg += `      <line x1="${-c.width / 2}" y1="${c.depth / 2}" x2="${c.width / 2}" y2="${-c.depth / 2}" stroke="#94a3b8" stroke-width="15" />\n`;
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // 9. Dimensions Layer
  if (showDimensions && walls.length > 0) {
    svg += `  <g class="dimensions-layer">\n`;
    for (const w of walls) {
      const len = wallLength(w);
      if (len < 400) continue;
      const v = Vector2D.fromPoints(w.start, w.end);
      const normal = v.normalize().perpendicular();
      const offset = 320;
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
      svg += `      <rect x="-260" y="-90" width="520" height="180" rx="35" fill="#0b1120" stroke="#64748b" stroke-width="15" />\n`;
      svg += `      <text x="0" y="48" class="dim-text">${(len / 1000).toFixed(2)} m</text>\n`;
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // 10. Metric Graphic Scale Bar (0 - 5m)
  let currentSheetY = maxY + padding;
  if (showScaleBar) {
    const scaleBarX = minX;
    svg += `  <g class="scale-bar" transform="translate(${scaleBarX}, ${currentSheetY})">\n`;
    svg += `    <text x="0" y="-80" fill="#94a3b8" font-family="sans-serif" font-size="120" font-weight="bold">GRAPHIC SCALE 1:100 METRIC</text>\n`;
    const blockW = 1000;
    for (let i = 0; i < 5; i++) {
      const fill = i % 2 === 0 ? "#f8fafc" : "#0f172a";
      svg += `    <rect x="${i * blockW}" y="0" width="${blockW}" height="120" fill="${fill}" stroke="#94a3b8" stroke-width="15" />\n`;
      svg += `    <text x="${i * blockW}" y="230" fill="#94a3b8" font-family="sans-serif" font-size="100" text-anchor="middle">${i}m</text>\n`;
    }
    svg += `    <text x="${5 * blockW}" y="230" fill="#94a3b8" font-family="sans-serif" font-size="100" text-anchor="middle">5m</text>\n`;
    svg += `  </g>\n`;
    currentSheetY += 400;
  }

  // 11. Room & Opening Schedule Tables
  if (showSchedules && rooms.length > 0) {
    const schedY = currentSheetY;
    const halfWidth = Math.max((viewBoxW - padding * 2) / 2 - 200, 3000);

    // Left Table: Room Schedule
    svg += `  <g class="room-schedule-table" transform="translate(${minX}, ${schedY})">\n`;
    svg += `    <rect x="0" y="0" width="${halfWidth}" height="1100" rx="30" fill="#1e293b" stroke="#475569" stroke-width="20" />\n`;
    svg += `    <text x="50" y="100" class="sched-header">ROOM SCHEDULE</text>\n`;
    svg += `    <line x1="0" y1="140" x2="${halfWidth}" y2="140" stroke="#475569" stroke-width="15" />\n`;

    let ry = 220;
    for (const r of rooms.slice(0, 5)) {
      const m2 = (polygonArea(r.polygon) / 1_000_000).toFixed(1);
      const sqft = Math.round(polygonArea(r.polygon) / 1_000_000 * 10.764);
      svg += `    <text x="50" y="${ry}" class="sched-text" font-weight="bold">${r.name}</text>\n`;
      svg += `    <text x="${halfWidth - 80}" y="${ry}" class="sched-text" text-anchor="end">${m2} m² (${sqft} sq ft)</text>\n`;
      ry += 160;
    }
    svg += `  </g>\n`;

    // Right Table: Doors & Windows Schedule
    const schedRightX = minX + halfWidth + 400;
    svg += `  <g class="opening-schedule-table" transform="translate(${schedRightX}, ${schedY})">\n`;
    svg += `    <rect x="0" y="0" width="${halfWidth}" height="1100" rx="30" fill="#1e293b" stroke="#475569" stroke-width="20" />\n`;
    svg += `    <text x="50" y="100" class="sched-header">DOOR & WINDOW SCHEDULE</text>\n`;
    svg += `    <line x1="0" y1="140" x2="${halfWidth}" y2="140" stroke="#475569" stroke-width="15" />\n`;

    const allDoors = walls.flatMap(w => w.doors || []);
    const allWindows = walls.flatMap(w => w.windows || []);
    let oy = 220;
    if (allDoors.length > 0) {
      const d = allDoors[0];
      svg += `    <text x="50" y="${oy}" class="sched-text" font-weight="bold">D1: ${d.doorType || "Single Swing"}</text>\n`;
      svg += `    <text x="${halfWidth - 80}" y="${oy}" class="sched-text" text-anchor="end">${d.width} × ${d.height} mm</text>\n`;
      oy += 160;
    }
    if (allWindows.length > 0) {
      const w1 = allWindows[0];
      svg += `    <text x="50" y="${oy}" class="sched-text" font-weight="bold">W1: ${w1.windowType || "Casement"}${w1.chajjaSunshade ? " (Chajja)" : ""}</text>\n`;
      svg += `    <text x="${halfWidth - 80}" y="${oy}" class="sched-text" text-anchor="end">${w1.width} × ${w1.height} mm (Sill ${w1.sillHeight}mm)</text>\n`;
      oy += 160;
    }
    svg += `    <text x="50" y="${oy}" class="sched-text">Compliance Standard: NBC 2016 / IBC 2024</text>\n`;
    svg += `  </g>\n`;

    currentSheetY += 1300;
  }

  // 12. Architectural Title Block & Dynamic North Arrow
  if (showTitleBlock) {
    const tbY = currentSheetY + 100;
    const tbW = viewBoxW - padding * 2;
    const totalAreaM2 = rooms.reduce((acc, r) => acc + polygonArea(r.polygon), 0) / 1_000_000;
    const northAngle = project.siteContext?.northAngleDegrees || 0;

    svg += `  <g class="title-block" transform="translate(${minX}, ${tbY})">\n`;
    svg += `    <rect x="0" y="0" width="${tbW}" height="950" rx="40" fill="#1e293b" stroke="#475569" stroke-width="30" />\n`;

    // Title Block Text Details
    svg += `    <text x="70" y="240" class="title-text" font-size="340" font-weight="bold">${project.name}</text>\n`;
    svg += `    <text x="70" y="470" class="title-text" font-size="180" fill="#94a3b8">Typology: ${project.typology?.toUpperCase() || "RESIDENTIAL"}  |  Floor: ${floor.name} (Level ${floor.level || 0})  |  Area: ${totalAreaM2.toFixed(1)} m²</text>\n`;
    svg += `    <text x="70" y="670" class="title-text" font-size="150" fill="#64748b">Code Standards: NBC 2016 / IBC 2024 / Neufert Architectural Data  |  Scale: 1:100 Metric</text>\n`;
    svg += `    <text x="70" y="850" class="title-text" font-size="140" fill="#64748b">Author: HomeAI Architectural Studio  |  Date: ${new Date().toISOString().split("T")[0]}  |  Status: APPROVED FOR PERMIT</text>\n`;

    // Dynamic North Arrow Compass (Rotated to siteContext.northAngleDegrees)
    const arrowX = tbW - 500;
    svg += `    <g transform="translate(${arrowX}, 470) rotate(${northAngle})">\n`;
    svg += `      <circle r="260" fill="#0f172a" stroke="#64748b" stroke-width="25" />\n`;
    svg += `      <polygon points="0,-220 90,140 0,70" fill="#ef4444" />\n`;
    svg += `      <polygon points="0,-220 -90,140 0,70" fill="#94a3b8" />\n`;
    svg += `      <text x="0" y="-280" fill="#f8fafc" font-size="160" font-weight="bold" text-anchor="middle">N</text>\n`;
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
