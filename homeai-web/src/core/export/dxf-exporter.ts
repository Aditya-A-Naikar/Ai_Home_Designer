import { Project, Floor } from "@/core/domain/types";
import { polygonArea } from "@/core/geometry/room-utils";

/**
 * AutoCAD DXF (Drawing Exchange Format) R12 / 2000 ASCII Generator
 * Standard engineering CAD interchange format compatible with AutoCAD, Revit,
 * Rhino, SketchUp, and LibreCAD.
 */

interface DxfEntity {
  toString(): string;
}

class DxfLine implements DxfEntity {
  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public layer: string = "WALLS",
    public color: number = 7 // White / Black in AutoCAD
  ) {}

  toString(): string {
    return [
      "  0",
      "LINE",
      "  8",
      this.layer,
      " 62",
      this.color.toString(),
      " 10",
      this.x1.toFixed(3),
      " 20",
      this.y1.toFixed(3),
      " 30",
      "0.000",
      " 11",
      this.x2.toFixed(3),
      " 21",
      this.y2.toFixed(3),
      " 31",
      "0.000",
    ].join("\n");
  }
}

class DxfCircle implements DxfEntity {
  constructor(
    public cx: number,
    public cy: number,
    public radius: number,
    public layer: string = "DOORS",
    public color: number = 30 // Orange
  ) {}

  toString(): string {
    return [
      "  0",
      "CIRCLE",
      "  8",
      this.layer,
      " 62",
      this.color.toString(),
      " 10",
      this.cx.toFixed(3),
      " 20",
      this.cy.toFixed(3),
      " 30",
      "0.000",
      " 40",
      this.radius.toFixed(3),
    ].join("\n");
  }
}

class DxfText implements DxfEntity {
  constructor(
    public text: string,
    public x: number,
    public y: number,
    public height: number = 200, // in mm
    public layer: string = "ROOM_TEXT",
    public color: number = 1 // Red
  ) {}

  toString(): string {
    return [
      "  0",
      "TEXT",
      "  8",
      this.layer,
      " 62",
      this.color.toString(),
      " 10",
      this.x.toFixed(3),
      " 20",
      this.y.toFixed(3),
      " 30",
      "0.000",
      " 40",
      this.height.toFixed(3),
      "  1",
      this.text,
    ].join("\n");
  }
}

class DxfPolyline implements DxfEntity {
  constructor(
    public points: { x: number; y: number }[],
    public closed: boolean = true,
    public layer: string = "ROOM_POLYGONS",
    public color: number = 4 // Cyan
  ) {}

  toString(): string {
    const lines: string[] = [
      "  0",
      "POLYLINE",
      "  8",
      this.layer,
      " 62",
      this.color.toString(),
      " 66",
      "1",
      " 10",
      "0.000",
      " 20",
      "0.000",
      " 30",
      "0.000",
      " 70",
      this.closed ? "1" : "0",
    ];

    this.points.forEach((pt) => {
      lines.push(
        "  0",
        "VERTEX",
        "  8",
        this.layer,
        " 10",
        pt.x.toFixed(3),
        " 20",
        pt.y.toFixed(3),
        " 30",
        "0.000"
      );
    });

    lines.push("  0", "SEQEND");
    return lines.join("\n");
  }
}

/**
 * Generates an AutoCAD standard DXF R12 string for a specific floor in the project.
 */
export function generateFloorDxf(project: Project, floorId: string): string {
  const floor: Floor | undefined = project.floors.find((f) => f.id === floorId) || project.floors[0];
  if (!floor) return "";

  const entities: DxfEntity[] = [];

  // 1. Boundary Plot Lines
  const plotW = project.plotDimensions.width;
  const plotD = project.plotDimensions.depth;
  entities.push(new DxfLine(0, 0, plotW, 0, "BOUNDARY", 8));
  entities.push(new DxfLine(plotW, 0, plotW, plotD, "BOUNDARY", 8));
  entities.push(new DxfLine(plotW, plotD, 0, plotD, "BOUNDARY", 8));
  entities.push(new DxfLine(0, plotD, 0, 0, "BOUNDARY", 8));

  // 2. Structural & Partition Walls
  floor.walls.forEach((wall) => {
    const isExterior = (wall.thickness || 150) >= 200;
    const layer = isExterior ? "WALLS_EXTERIOR" : "WALLS_INTERIOR";
    const color = isExterior ? 7 : 8; // 7 = White/Black, 8 = Gray
    entities.push(new DxfLine(wall.start.x, wall.start.y, wall.end.x, wall.end.y, layer, color));

    // Wall Openings - Doors
    wall.doors?.forEach((door) => {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const wallLen = Math.hypot(dx, dy) || 1;
      const uX = dx / wallLen;
      const uY = dy / wallLen;

      const doorCenterX = wall.start.x + uX * door.offset;
      const doorCenterY = wall.start.y + uY * door.offset;

      entities.push(new DxfCircle(doorCenterX, doorCenterY, door.width / 2, "DOORS", 30));
      entities.push(new DxfText(`D: ${door.width}mm`, doorCenterX, doorCenterY + door.width / 2, 120, "DOORS", 30));
    });

    // Wall Openings - Windows
    wall.windows?.forEach((win) => {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const wallLen = Math.hypot(dx, dy) || 1;
      const uX = dx / wallLen;
      const uY = dy / wallLen;

      const halfW = win.width / 2;
      const startX = wall.start.x + uX * (win.offset - halfW);
      const startY = wall.start.y + uY * (win.offset - halfW);
      const endX = wall.start.x + uX * (win.offset + halfW);
      const endY = wall.start.y + uY * (win.offset + halfW);

      entities.push(new DxfLine(startX, startY, endX, endY, "WINDOWS", 140)); // Blue
      entities.push(new DxfText(`W: ${win.width}x${win.height || 1200}`, startX, startY + 150, 120, "WINDOWS", 140));
    });
  });

  // 3. Room Polygons & Area Text
  floor.rooms.forEach((room) => {
    if (room.polygon && room.polygon.length >= 3) {
      entities.push(new DxfPolyline(room.polygon, true, "ROOM_POLYGONS", 4));

      const cx = room.polygon.reduce((sum, p) => sum + p.x, 0) / room.polygon.length;
      const cy = room.polygon.reduce((sum, p) => sum + p.y, 0) / room.polygon.length;
      const areaM2 = (polygonArea(room.polygon) / 1_000_000).toFixed(1);

      entities.push(new DxfText(room.name.toUpperCase(), cx, cy + 100, 200, "ROOM_TEXT", 2));
      entities.push(new DxfText(`${areaM2} SQ.M`, cx, cy - 120, 150, "ROOM_TEXT", 7));
    }
  });

  // 4. Vertical Duplex Staircases
  floor.stairs?.forEach((stair) => {
    const hw = stair.width / 2;
    const hl = stair.length / 2;
    const pts = [
      { x: stair.position.x - hw, y: stair.position.y - hl },
      { x: stair.position.x + hw, y: stair.position.y - hl },
      { x: stair.position.x + hw, y: stair.position.y + hl },
      { x: stair.position.x - hw, y: stair.position.y + hl },
    ];
    entities.push(new DxfPolyline(pts, true, "STAIRS", 30));

    // Treads
    const numRisers = stair.stepCount || 18;
    for (let i = 1; i < numRisers; i++) {
      const ty = stair.position.y - hl + (stair.length / numRisers) * i;
      entities.push(new DxfLine(stair.position.x - hw, ty, stair.position.x + hw, ty, "STAIRS", 30));
    }

    entities.push(new DxfText(`STAIR UP (${numRisers}R)`, stair.position.x, stair.position.y, 160, "STAIRS", 30));
  });

  // 5. Structural Columns
  floor.columns?.forEach((col) => {
    const hw = col.width / 2;
    const hd = col.depth / 2;
    const pts = [
      { x: col.position.x - hw, y: col.position.y - hd },
      { x: col.position.x + hw, y: col.position.y - hd },
      { x: col.position.x + hw, y: col.position.y + hd },
      { x: col.position.x - hw, y: col.position.y + hd },
    ];
    entities.push(new DxfPolyline(pts, true, "COLUMNS", 1)); // Red structural
  });

  // Assemble full DXF file structure
  const dxfHeader = [
    "  0",
    "SECTION",
    "  2",
    "HEADER",
    "  9",
    "$ACADVER",
    "  1",
    "AC1009", // AutoCAD R12 standard ASCII compatibility
    "  9",
    "$INSUNITS",
    " 70",
    "4", // 4 = Millimeters
    "  0",
    "ENDSEC",
  ].join("\n");

  const dxfTables = [
    "  0",
    "SECTION",
    "  2",
    "TABLES",
    "  0",
    "TABLE",
    "  2",
    "LAYER",
    " 70",
    "8",
    // Layers definition
    "  0", "LAYER", "  2", "WALLS_EXTERIOR", " 70", "0", " 62", "7", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "WALLS_INTERIOR", " 70", "0", " 62", "8", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "DOORS", " 70", "0", " 62", "30", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "WINDOWS", " 70", "0", " 62", "140", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "STAIRS", " 70", "0", " 62", "30", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "COLUMNS", " 70", "0", " 62", "1", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "ROOM_POLYGONS", " 70", "0", " 62", "4", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "ROOM_TEXT", " 70", "0", " 62", "2", "  6", "CONTINUOUS",
    "  0", "LAYER", "  2", "BOUNDARY", " 70", "0", " 62", "8", "  6", "CONTINUOUS",
    "  0",
    "ENDTAB",
    "  0",
    "ENDSEC",
  ].join("\n");

  const dxfEntities = [
    "  0",
    "SECTION",
    "  2",
    "ENTITIES",
    ...entities.map((e) => e.toString()),
    "  0",
    "ENDSEC",
    "  0",
    "EOF",
  ].join("\n");

  return `${dxfHeader}\n${dxfTables}\n${dxfEntities}\n`;
}

/**
 * Triggers a client-side download of the active floor in AutoCAD DXF format.
 */
export function downloadFloorDxf(project: Project, floorId: string): void {
  const dxfContent = generateFloorDxf(project, floorId);
  const blob = new Blob([dxfContent], { type: "application/dxf;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const floor = project.floors.find((f) => f.id === floorId);
  const floorName = floor ? floor.name.toLowerCase().replace(/\s+/g, "-") : "ground-floor";
  const projSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  link.href = url;
  link.download = `${projSlug}-${floorName}-cad.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
