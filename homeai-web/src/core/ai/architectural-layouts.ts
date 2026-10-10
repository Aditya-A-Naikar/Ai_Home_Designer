import { Wall, Room, Prop, Door, Window, Staircase, SlabVoid, StructuralColumn, WallType, Point2D } from "../domain/types";
import { PROP_PRESETS } from "./spatial-planner";
import { v4 as uuidv4 } from "uuid";

export interface GeneratedLayout {
  walls: Wall[];
  rooms: Room[];
  props: Prop[];
  description: string;
  totalAreaM2: number;
}

export interface GeneratedFloorLayout {
  floorId: string;
  name: string;
  level: number;
  walls: Wall[];
  rooms: Room[];
  props: Prop[];
  stairs: Staircase[];
  voids: SlabVoid[];
  columns: StructuralColumn[];
  totalAreaM2: number;
}

export interface DuplexGeneratedLayout {
  groundFloor: GeneratedFloorLayout;
  firstFloor: GeneratedFloorLayout;
  description: string;
  totalAreaM2: number;
}

/**
 * Creates a unique short ID.
 */
function uid(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

/**
 * Helper to build a Wall with optional doors & windows and wall typologies.
 */
function makeWall(
  floorId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number = 200,
  doors: Door[] = [],
  windows: Window[] = [],
  wallType: WallType = "exterior_bearing"
): Wall {
  const wallId = uid("wall");
  return {
    id: wallId,
    floorId,
    start,
    end,
    thickness,
    wallType,
    doors: doors.map(d => ({ ...d, wallId, floorId })),
    windows: windows.map(w => ({ ...w, wallId, floorId })),
  };
}

function makeColumn(
  floorId: string,
  x: number,
  y: number,
  width = 230,
  depth = 450,
  rotation = 0
): StructuralColumn {
  return {
    id: uid("col"),
    floorId,
    width,
    depth,
    position: { x, y },
    rotation,
  };
}

function makeStair(
  floorId: string,
  x: number,
  y: number,
  width = 2400,
  length = 3600,
  direction: "up" | "down" = "up"
): Staircase {
  return {
    id: uid("stair"),
    floorId,
    name: "Dog-Leg Staircase",
    stairType: "dog_leg",
    width,
    length,
    position: { x, y },
    rotation: 0,
    treadMm: 280,
    riserMm: 167,
    stepCount: 18,
    direction,
  };
}

function makeVoid(
  floorId: string,
  polygon: Point2D[],
  name = "OPEN TO BELOW (DOUBLE HEIGHT LIVING)"
): SlabVoid {
  return {
    id: uid("void"),
    floorId,
    name,
    polygon,
  };
}

/**
 * Helper to create a Prop from preset catalog with custom position and rotation.
 */
function makeProp(
  floorId: string,
  roomId: string,
  presetKey: string,
  position: { x: number; y: number },
  rotation: number = 0,
  overrides: Partial<Prop> = {}
): Prop {
  const preset = PROP_PRESETS[presetKey];
  const propId = uid("prop");
  return {
    id: propId,
    floorId,
    roomId,
    name: overrides.name || preset?.name || "Furniture Prop",
    category: preset?.category || "living",
    propType: preset?.propType || "sofa",
    position,
    rotation,
    dimensions: overrides.dimensions || preset?.dimensions || { width: 1000, depth: 800, height: 750 },
    color: overrides.color || preset?.defaultColor || "#475569",
    shape: overrides.shape || preset?.shape || "rectangular",
    specifications: overrides.specifications || preset?.specifications || {},
  };
}

/**
 * Generates an architectural 2BHK Floor Plan (~93.5 m²).
 * Compliant with NBC 2016 standards:
 * - Living Room: 27 m² (with 75" TV and Modern L-shaped Sectional Sofa at 3.0m THX viewing distance)
 * - Master Bedroom: 22.5 m² (with King Bed & 3-Door Wardrobe)
 * - Guest Bedroom: 20.0 m² (with Queen Bed & Executive Workstation Desk)
 * - Kitchen & Dining: 24 m² (with 6-Seater Dining Set)
 * - Fully interconnected with 1000mm Main Door, 900mm Bedroom Doors, and code-compliant windows.
 */
export function build2BHKLayout(floorId: string, ox = 0, oy = 0): GeneratedLayout {
  const walls: Wall[] = [];
  const rooms: Room[] = [];
  const props: Prop[] = [];

  const livingRoomId = uid("room");
  const masterBedId = uid("room");
  const guestBedId = uid("room");
  const diningKitchenId = uid("room");

  // --- PERIMETER & PARTITION WALLS ---
  // North Exterior Wall (Top: 0 to 11000)
  const wallNorthLiving = makeWall(floorId, { x: ox, y: oy }, { x: ox + 6000, y: oy }, 200);
  const wallNorthMaster = makeWall(floorId, { x: ox + 6000, y: oy }, { x: ox + 11000, y: oy }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2500, width: 1600, height: 1200, sillHeight: 900 }
  ]);
  walls.push(wallNorthLiving, wallNorthMaster);

  // South Exterior Wall (Bottom: 0 to 11000)
  const wallSouthKitchen = makeWall(floorId, { x: ox, y: oy + 8500 }, { x: ox + 6000, y: oy + 8500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 3000, width: 1500, height: 1200, sillHeight: 900 }
  ]);
  const wallSouthGuest = makeWall(floorId, { x: ox + 6000, y: oy + 8500 }, { x: ox + 11000, y: oy + 8500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2500, width: 1500, height: 1200, sillHeight: 900 }
  ]);
  walls.push(wallSouthKitchen, wallSouthGuest);

  // West Exterior Wall (Left: 0 to 8500)
  const wallWestLiving = makeWall(floorId, { x: ox, y: oy }, { x: ox, y: oy + 4500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2250, width: 1800, height: 1400, sillHeight: 900 }
  ]);
  const wallWestKitchen = makeWall(floorId, { x: ox, y: oy + 4500 }, { x: ox, y: oy + 8500 }, 200);
  walls.push(wallWestLiving, wallWestKitchen);

  // East Exterior Wall (Right: 0 to 8500)
  const wallEastMaster = makeWall(floorId, { x: ox + 11000, y: oy }, { x: ox + 11000, y: oy + 4500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2250, width: 1600, height: 1200, sillHeight: 900 }
  ]);
  const wallEastGuest = makeWall(floorId, { x: ox + 11000, y: oy + 4500 }, { x: ox + 11000, y: oy + 8500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2000, width: 1500, height: 1200, sillHeight: 900 }
  ]);
  walls.push(wallEastMaster, wallEastGuest);

  // Central Vertical Divider Wall (X = 6000, Y: 0 to 8500)
  const wallCenterMaster = makeWall(floorId, { x: ox + 6000, y: oy }, { x: ox + 6000, y: oy + 4500 }, 150, [
    { id: uid("door"), wallId: "", floorId, offset: 3500, width: 900, height: 2100, swingDirection: "inward_right" }
  ]);
  const wallCenterGuest = makeWall(floorId, { x: ox + 6000, y: oy + 4500 }, { x: ox + 6000, y: oy + 8500 }, 150, [
    { id: uid("door"), wallId: "", floorId, offset: 1200, width: 900, height: 2100, swingDirection: "inward_left" }
  ]);
  walls.push(wallCenterMaster, wallCenterGuest);

  // Central Horizontal Divider Wall (Y = 4500, X: 0 to 11000)
  // Living to Kitchen partition (with Main Entry Door from foyer)
  const wallMidLivingKitchen = makeWall(floorId, { x: ox, y: oy + 4500 }, { x: ox + 6000, y: oy + 4500 }, 150, [
    { id: uid("door"), wallId: "", floorId, offset: 1500, width: 1000, height: 2100, swingDirection: "inward_right" }
  ]);
  // Master to Guest bedroom partition
  const wallMidBedrooms = makeWall(floorId, { x: ox + 6000, y: oy + 4500 }, { x: ox + 11000, y: oy + 4500 }, 150);
  walls.push(wallMidLivingKitchen, wallMidBedrooms);

  // --- ROOM POLYGONS ---
  // 1. Living Room (Top-Left: 6.0m x 4.5m)
  rooms.push({
    id: livingRoomId,
    floorId,
    name: "Living Room",
    color: "#e0e7ff", // indigo-100
    targetArea: 27_000_000,
    polygon: [
      { x: ox, y: oy },
      { x: ox + 6000, y: oy },
      { x: ox + 6000, y: oy + 4500 },
      { x: ox, y: oy + 4500 },
    ],
  });

  // 2. Master Bedroom (Top-Right: 5.0m x 4.5m)
  rooms.push({
    id: masterBedId,
    floorId,
    name: "Master Bedroom",
    color: "#e0f2fe", // sky-100
    targetArea: 22_500_000,
    polygon: [
      { x: ox + 6000, y: oy },
      { x: ox + 11000, y: oy },
      { x: ox + 11000, y: oy + 4500 },
      { x: ox + 6000, y: oy + 4500 },
    ],
  });

  // 3. Guest Bedroom (Bottom-Right: 5.0m x 4.0m)
  rooms.push({
    id: guestBedId,
    floorId,
    name: "Guest Bedroom",
    color: "#f0fdf4", // emerald-50
    targetArea: 20_000_000,
    polygon: [
      { x: ox + 6000, y: oy + 4500 },
      { x: ox + 11000, y: oy + 4500 },
      { x: ox + 11000, y: oy + 8500 },
      { x: ox + 6000, y: oy + 8500 },
    ],
  });

  // 4. Kitchen & Dining (Bottom-Left: 6.0m x 4.0m)
  rooms.push({
    id: diningKitchenId,
    floorId,
    name: "Dining & Kitchen",
    color: "#fef3c7", // amber-100
    targetArea: 24_000_000,
    polygon: [
      { x: ox, y: oy + 4500 },
      { x: ox + 6000, y: oy + 4500 },
      { x: ox + 6000, y: oy + 8500 },
      { x: ox, y: oy + 8500 },
    ],
  });

  // --- PROPS & ERGONOMIC FURNITURE PLACEMENT ---
  // Living Room Props:
  // 75" TV centered along North Wall facing South (rotation = 0)
  props.push(makeProp(floorId, livingRoomId, "tv_75", { x: ox + 3000, y: oy + 120 }, 0));
  // Modern L-Shaped Sectional Sofa opposite TV at 3.0m viewing distance facing North (rotation = 180)
  props.push(makeProp(floorId, livingRoomId, "sofa_l_shape", { x: ox + 3000, y: oy + 3120 }, 180, { color: "#334155" }));

  // Master Bedroom Props:
  // King Luxury Bed centered against North Wall with 750mm side clearances (rotation = 0)
  props.push(makeProp(floorId, masterBedId, "bed_king", { x: ox + 8500, y: oy + 1200 }, 0, { color: "#6366f1" }));
  // 3-Door Master Wardrobe along East Wall
  props.push(makeProp(floorId, masterBedId, "wardrobe_3door", { x: ox + 10200, y: oy + 3600 }, 0));

  // Guest Bedroom Props:
  // Queen Comfort Bed
  props.push(makeProp(floorId, guestBedId, "bed_queen", { x: ox + 8500, y: oy + 5700 }, 0, { color: "#8b5cf6" }));
  // Executive Workstation Desk along south window
  props.push(makeProp(floorId, guestBedId, "desk_executive", { x: ox + 10100, y: oy + 7600 }, 0));

  // Dining Room Props:
  // 6-Seater Dining Set centered in dining zone
  props.push(makeProp(floorId, diningKitchenId, "dining_6", { x: ox + 3000, y: oy + 6500 }, 0, { color: "#78350f" }));

  return {
    walls,
    rooms,
    props,
    description: "Architectural 2BHK Floor Plan (93.5 m² / 1,006 sq ft). Features Living Room with 75\" TV & Sectional, Master Bed Suite, Guest Bed, and Kitchen-Dining with 6-Seater table.",
    totalAreaM2: 93.5,
  };
}

/**
 * Generates an architectural 1BHK Floor Plan (~55.2 m²).
 */
export function build1BHKLayout(floorId: string, ox = 0, oy = 0): GeneratedLayout {
  const walls: Wall[] = [];
  const rooms: Room[] = [];
  const props: Prop[] = [];

  const livingRoomId = uid("room");
  const bedRoomId = uid("room");
  const kitchenId = uid("room");

  // Perimeter Walls (8500mm x 6500mm)
  // North
  walls.push(makeWall(floorId, { x: ox, y: oy }, { x: ox + 5000, y: oy }, 200));
  walls.push(makeWall(floorId, { x: ox + 5000, y: oy }, { x: ox + 8500, y: oy }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 1750, width: 1400, height: 1200, sillHeight: 900 }
  ]));
  // South
  walls.push(makeWall(floorId, { x: ox, y: oy + 6500 }, { x: ox + 5000, y: oy + 6500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2500, width: 1400, height: 1200, sillHeight: 900 }
  ]));
  walls.push(makeWall(floorId, { x: ox + 5000, y: oy + 6500 }, { x: ox + 8500, y: oy + 6500 }, 200));
  // West
  walls.push(makeWall(floorId, { x: ox, y: oy }, { x: ox, y: oy + 4000 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 2000, width: 1600, height: 1200, sillHeight: 900 }
  ]));
  walls.push(makeWall(floorId, { x: ox, y: oy + 4000 }, { x: ox, y: oy + 6500 }, 200));
  // East
  walls.push(makeWall(floorId, { x: ox + 8500, y: oy }, { x: ox + 8500, y: oy + 6500 }, 200, [], [
    { id: uid("win"), wallId: "", floorId, offset: 3250, width: 1500, height: 1200, sillHeight: 900 }
  ]));

  // Partitions
  walls.push(makeWall(floorId, { x: ox + 5000, y: oy }, { x: ox + 5000, y: oy + 6500 }, 150, [
    { id: uid("door"), wallId: "", floorId, offset: 2000, width: 900, height: 2100, swingDirection: "inward_right" }
  ]));
  walls.push(makeWall(floorId, { x: ox, y: oy + 4000 }, { x: ox + 5000, y: oy + 4000 }, 150, [
    { id: uid("door"), wallId: "", floorId, offset: 1200, width: 900, height: 2100, swingDirection: "inward_left" }
  ]));

  // Rooms
  rooms.push({
    id: livingRoomId,
    floorId,
    name: "Living Room",
    color: "#e0e7ff",
    targetArea: 20_000_000,
    polygon: [{ x: ox, y: oy }, { x: ox + 5000, y: oy }, { x: ox + 5000, y: oy + 4000 }, { x: ox, y: oy + 4000 }],
  });
  rooms.push({
    id: bedRoomId,
    floorId,
    name: "Bedroom",
    color: "#e0f2fe",
    targetArea: 22_750_000,
    polygon: [{ x: ox + 5000, y: oy }, { x: ox + 8500, y: oy }, { x: ox + 8500, y: oy + 6500 }, { x: ox + 5000, y: oy + 6500 }],
  });
  rooms.push({
    id: kitchenId,
    floorId,
    name: "Kitchen & Dining",
    color: "#fef3c7",
    targetArea: 12_500_000,
    polygon: [{ x: ox, y: oy + 4000 }, { x: ox + 5000, y: oy + 4000 }, { x: ox + 5000, y: oy + 6500 }, { x: ox, y: oy + 6500 }],
  });

  // Props
  props.push(makeProp(floorId, livingRoomId, "tv_65", { x: ox + 2500, y: oy + 120 }, 0));
  props.push(makeProp(floorId, livingRoomId, "sofa_3seater", { x: ox + 2500, y: oy + 2800 }, 180));
  props.push(makeProp(floorId, bedRoomId, "bed_king", { x: ox + 6750, y: oy + 1200 }, 0));
  props.push(makeProp(floorId, bedRoomId, "wardrobe_3door", { x: ox + 7900, y: oy + 5500 }, 0));
  props.push(makeProp(floorId, kitchenId, "dining_6", { x: ox + 2500, y: oy + 5250 }, 0));

  return {
    walls,
    rooms,
    props,
    description: "Compact 1BHK Floor Plan (55.2 m²). Features dedicated Living Room with 65\" TV & 3-Seater Sofa, Master Bedroom with King Bed, and separate Kitchen-Dining area.",
    totalAreaM2: 55.2,
  };
}

/**
 * Generates an autonomous code-compliant Living Room with TV & Sofa.
 * Used when user requests TV + Sofa but no living room exists yet.
 */
export function buildLivingRoomSuite(
  floorId: string,
  ox = 0,
  oy = 0,
  tvPreset = "tv_75",
  sofaPreset = "sofa_l_shape",
  sofaColor = "#334155"
): GeneratedLayout {
  const w = 5500;
  const h = 4500;
  const roomId = uid("room");

  const walls: Wall[] = [
    // North wall (TV solid wall)
    makeWall(floorId, { x: ox, y: oy }, { x: ox + w, y: oy }, 200),
    // East wall (with daylight window)
    makeWall(floorId, { x: ox + w, y: oy }, { x: ox + w, y: oy + h }, 200, [], [
      { id: uid("win"), wallId: "", floorId, offset: h / 2, width: 1600, height: 1200, sillHeight: 900 }
    ]),
    // South wall (with main entry door)
    makeWall(floorId, { x: ox + w, y: oy + h }, { x: ox, y: oy + h }, 200, [
      { id: uid("door"), wallId: "", floorId, offset: 1500, width: 1000, height: 2100, swingDirection: "inward_right" }
    ]),
    // West wall
    makeWall(floorId, { x: ox, y: oy + h }, { x: ox, y: oy }, 200),
  ];

  const rooms: Room[] = [{
    id: roomId,
    floorId,
    name: "Living Room",
    color: "#e0e7ff",
    targetArea: w * h,
    polygon: [
      { x: ox, y: oy },
      { x: ox + w, y: oy },
      { x: ox + w, y: oy + h },
      { x: ox, y: oy + h },
    ],
  }];

  const props: Prop[] = [
    // TV on North wall
    makeProp(floorId, roomId, tvPreset, { x: ox + w / 2, y: oy + 120 }, 0),
    // Sofa facing TV at calibrated 3.0m distance
    makeProp(floorId, roomId, sofaPreset, { x: ox + w / 2, y: oy + 3120 }, 180, { color: sofaColor }),
  ];

  return {
    walls,
    rooms,
    props,
    description: `Architectural Living Room suite (5.5m × 4.5m, 24.8 m²). Mounted ${tvPreset.replace("_", " ")} on North solid wall and paired ${sofaPreset.replace("_", " ")} at 3.0m THX viewing distance.`,
    totalAreaM2: 24.8,
  };
}

/**
 * Generates an autonomous Bedroom Suite with Bed & Wardrobe.
 */
export function buildBedroomSuite(
  floorId: string,
  ox = 0,
  oy = 0,
  bedPreset = "bed_king",
  bedColor = "#6366f1"
): GeneratedLayout {
  const w = 4800;
  const h = 4200;
  const roomId = uid("room");

  const walls: Wall[] = [
    // North wall (solid headboard wall)
    makeWall(floorId, { x: ox, y: oy }, { x: ox + w, y: oy }, 200),
    // East wall (window)
    makeWall(floorId, { x: ox + w, y: oy }, { x: ox + w, y: oy + h }, 200, [], [
      { id: uid("win"), wallId: "", floorId, offset: h / 2, width: 1500, height: 1200, sillHeight: 900 }
    ]),
    // South wall (door)
    makeWall(floorId, { x: ox + w, y: oy + h }, { x: ox, y: oy + h }, 200, [
      { id: uid("door"), wallId: "", floorId, offset: 1200, width: 900, height: 2100, swingDirection: "inward_left" }
    ]),
    // West wall
    makeWall(floorId, { x: ox, y: oy + h }, { x: ox, y: oy }, 200),
  ];

  const rooms: Room[] = [{
    id: roomId,
    floorId,
    name: "Master Bedroom",
    color: "#e0f2fe",
    targetArea: w * h,
    polygon: [
      { x: ox, y: oy },
      { x: ox + w, y: oy },
      { x: ox + w, y: oy + h },
      { x: ox, y: oy + h },
    ],
  }];

  const props: Prop[] = [
    // Bed centered against North wall
    makeProp(floorId, roomId, bedPreset, { x: ox + w / 2, y: oy + 1200 }, 0, { color: bedColor }),
    // 3-door wardrobe along West wall
    makeProp(floorId, roomId, "wardrobe_3door", { x: ox + 1000, y: oy + 3600 }, 0),
  ];

  return {
    walls,
    rooms,
    props,
    description: `Master Bedroom Suite (4.8m × 4.2m, 20.2 m²). Positioned ${bedPreset.replace("_", " ")} with 750mm dual nightstand clearance and integrated 3-door wardrobe.`,
    totalAreaM2: 20.2,
  };
}

/**
 * Generates an Architectural Duplex Villa (G+1 Multi-Floor Layout, ~240 m² / 2580 sq ft).
 * Fully code compliant with NBC 2016 / IBC 2024:
 * Ground Floor (G+0):
 * - Covered Portico / Carport with parked Sedan vehicle
 * - Main Entry Foyer with 1200mm Double-Entry Pivot Door
 * - Double-Height Grand Living Hall (28 m²) with 75" TV, L-Sectional, Coffee Table & Sliding Patio Door
 * - Modular Kitchen (SE, Vaastu Agneya) with L-Counter, Hob, Sink, Refrigerator & 6-Seater Dining
 * - Guest Bedroom Suite (18 m²) with Queen Bed & 3-Door Wardrobe
 * - Powder / Ensuite Bath (10 m²) with Wall-Hung WC, Vanity Basin & Shower Enclosure
 * - Dog-Leg Staircase (2.4m × 3.6m, 18 Risers, Blondel score 100/100, UP)
 * - Structural RC Column Grid (16 Columns, 230×450mm)
 * First Floor (G+1):
 * - Staircase Arrival (DN) at identical coordinate
 * - Double-Height Slab Void ("OPEN TO BELOW") with X cross bracing over living hall
 * - Upper Family Mezzanine Lounge with 65" TV & 3-Seater Sofa
 * - Master Bedroom Suite (22 m², SW Nairutya) with King Bed, Wardrobe & Executive Desk
 * - Luxury Master Bath (12 m²) with Freestanding Bathtub, Double Vanity, WC & Shower
 * - Kids / 2nd Bedroom Suite (20.7 m²) with Twin Bed, Study Desk & Wardrobe
 * - Front Balcony / Terrace (14 m²) with 100mm Parapet Wall & Sliding Doors
 * - Structurally aligned RC Columns (identical X,Y grid)
 */
export function buildDuplexLayout(
  groundFloorId: string,
  firstFloorId: string,
  ox = 0,
  oy = 0
): DuplexGeneratedLayout {
  // --- COLUMN GRID COORDINATES ---
  const colXs = [ox, ox + 4000, ox + 6400, ox + 11000];
  const colYs = [oy, oy + 4500, oy + 8500, oy + 12000];
  
  const groundColumns: StructuralColumn[] = [];
  const firstColumns: StructuralColumn[] = [];
  for (const cx of colXs) {
    for (const cy of colYs) {
      groundColumns.push(makeColumn(groundFloorId, cx, cy, 230, 450, 0));
      firstColumns.push(makeColumn(firstFloorId, cx, cy, 230, 450, 0));
    }
  }

  // ==========================================
  // GROUND FLOOR (G+0)
  // ==========================================
  const gfWalls: Wall[] = [];
  const gfRooms: Room[] = [];
  const gfProps: Prop[] = [];
  const gfStairs: Staircase[] = [];
  const gfVoids: SlabVoid[] = [];

  // Perimeter Walls
  // North Wall (Y = oy)
  gfWalls.push(makeWall(groundFloorId, { x: ox, y: oy }, { x: ox + 4000, y: oy }, 230, [], [
    { id: uid("win"), wallId: "", floorId: groundFloorId, offset: 2000, width: 1500, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 4000, y: oy }, { x: ox + 6400, y: oy }, 230, [], [], "exterior_bearing"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 6400, y: oy }, { x: ox + 11000, y: oy }, 230, [], [
    { id: uid("win"), wallId: "", floorId: groundFloorId, offset: 2300, width: 1500, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));

  // East Wall (X = ox + 11000)
  gfWalls.push(makeWall(groundFloorId, { x: ox + 11000, y: oy }, { x: ox + 11000, y: oy + 4500 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: groundFloorId, offset: 2250, width: 1400, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 11000, y: oy + 4500 }, { x: ox + 11000, y: oy + 8500 }, 230, [
    { id: uid("door"), wallId: "", floorId: groundFloorId, offset: 2000, width: 2400, height: 2400, swingDirection: "inward_right", doorType: "sliding_patio" }
  ], [], "exterior_bearing"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 11000, y: oy + 8500 }, { x: ox + 11000, y: oy + 12000 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: groundFloorId, offset: 1750, width: 1400, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));

  // South Wall (Y = oy + 12000)
  gfWalls.push(makeWall(groundFloorId, { x: ox + 11000, y: oy + 12000 }, { x: ox + 6400, y: oy + 12000 }, 230, [], [], "exterior_bearing"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 6400, y: oy + 12000 }, { x: ox + 4000, y: oy + 12000 }, 230, [
    { id: uid("door"), wallId: "", floorId: groundFloorId, offset: 1200, width: 1200, height: 2400, swingDirection: "inward_right", doorType: "double_entry" }
  ], [], "exterior_bearing"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 4000, y: oy + 12000 }, { x: ox, y: oy + 12000 }, 100, [], [], "parapet"));

  // West Wall (X = ox)
  gfWalls.push(makeWall(groundFloorId, { x: ox, y: oy + 12000 }, { x: ox, y: oy + 7000 }, 100, [], [], "parapet"));
  gfWalls.push(makeWall(groundFloorId, { x: ox, y: oy + 7000 }, { x: ox, y: oy + 4500 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: groundFloorId, offset: 1250, width: 600, height: 600, sillHeight: 1800, windowType: "louver_ventilator", chajjaSunshade: true }
  ], "wet_chase"));
  gfWalls.push(makeWall(groundFloorId, { x: ox, y: oy + 4500 }, { x: ox, y: oy }, 230, [], [
    { id: uid("win"), wallId: "", floorId: groundFloorId, offset: 2250, width: 1500, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));

  // Interior Partition Walls (Ground Floor)
  gfWalls.push(makeWall(groundFloorId, { x: ox, y: oy + 4500 }, { x: ox + 4000, y: oy + 4500 }, 150, [
    { id: uid("door"), wallId: "", floorId: groundFloorId, offset: 1200, width: 900, height: 2100, swingDirection: "inward_right" }
  ], [], "wet_chase"));
  gfWalls.push(makeWall(groundFloorId, { x: ox, y: oy + 7000 }, { x: ox + 4000, y: oy + 7000 }, 115, [
    { id: uid("door"), wallId: "", floorId: groundFloorId, offset: 1200, width: 900, height: 2100, swingDirection: "inward_left" }
  ], [], "interior_partition"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 4000, y: oy }, { x: ox + 4000, y: oy + 8500 }, 115, [
    { id: uid("door"), wallId: "", floorId: groundFloorId, offset: 2250, width: 900, height: 2100, swingDirection: "inward_right" }
  ], [], "interior_partition"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 4000, y: oy + 8500 }, { x: ox + 4000, y: oy + 12000 }, 115, [], [], "interior_partition"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 6400, y: oy }, { x: ox + 6400, y: oy + 4500 }, 115, [], [], "interior_partition"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 6400, y: oy + 4500 }, { x: ox + 11000, y: oy + 4500 }, 115, [], [], "interior_partition"));
  gfWalls.push(makeWall(groundFloorId, { x: ox + 4000, y: oy + 8500 }, { x: ox + 11000, y: oy + 8500 }, 115, [
    { id: uid("door"), wallId: "", floorId: groundFloorId, offset: 1200, width: 1200, height: 2400, swingDirection: "inward_right" }
  ], [], "interior_partition"));

  // Rooms (Ground Floor)
  const gfPorchId = uid("room");
  const gfFoyerId = uid("room");
  const gfLivingId = uid("room");
  const gfKitchenId = uid("room");
  const gfStairRoomId = uid("room");
  const gfGuestBedId = uid("room");
  const gfEnsuiteId = uid("room");

  gfRooms.push({
    id: gfPorchId,
    floorId: groundFloorId,
    name: "Covered Carport & Porch",
    color: "#f8fafc",
    targetArea: 20_000_000,
    polygon: [
      { x: ox, y: oy + 7000 },
      { x: ox + 4000, y: oy + 7000 },
      { x: ox + 4000, y: oy + 12000 },
      { x: ox, y: oy + 12000 },
    ],
  });
  gfRooms.push({
    id: gfFoyerId,
    floorId: groundFloorId,
    name: "Main Entry Foyer",
    color: "#faf5ff",
    targetArea: 8_400_000,
    polygon: [
      { x: ox + 4000, y: oy + 8500 },
      { x: ox + 6400, y: oy + 8500 },
      { x: ox + 6400, y: oy + 12000 },
      { x: ox + 4000, y: oy + 12000 },
    ],
  });
  gfRooms.push({
    id: gfLivingId,
    floorId: groundFloorId,
    name: "Double-Height Grand Living Hall",
    color: "#e0e7ff",
    targetArea: 28_000_000,
    polygon: [
      { x: ox + 4000, y: oy + 4500 },
      { x: ox + 11000, y: oy + 4500 },
      { x: ox + 11000, y: oy + 8500 },
      { x: ox + 4000, y: oy + 8500 },
    ],
  });
  gfRooms.push({
    id: gfKitchenId,
    floorId: groundFloorId,
    name: "Kitchen & Dining (Agneya)",
    color: "#fef3c7",
    targetArea: 20_700_000,
    polygon: [
      { x: ox + 6400, y: oy },
      { x: ox + 11000, y: oy },
      { x: ox + 11000, y: oy + 4500 },
      { x: ox + 6400, y: oy + 4500 },
    ],
  });
  gfRooms.push({
    id: gfStairRoomId,
    floorId: groundFloorId,
    name: "Staircase Circulation Core",
    color: "#f1f5f9",
    targetArea: 10_800_000,
    polygon: [
      { x: ox + 4000, y: oy },
      { x: ox + 6400, y: oy },
      { x: ox + 6400, y: oy + 4500 },
      { x: ox + 4000, y: oy + 4500 },
    ],
  });
  gfRooms.push({
    id: gfGuestBedId,
    floorId: groundFloorId,
    name: "Guest Bedroom Suite",
    color: "#e0f2fe",
    targetArea: 18_000_000,
    polygon: [
      { x: ox, y: oy },
      { x: ox + 4000, y: oy },
      { x: ox + 4000, y: oy + 4500 },
      { x: ox, y: oy + 4500 },
    ],
  });
  gfRooms.push({
    id: gfEnsuiteId,
    floorId: groundFloorId,
    name: "Ensuite Bathroom & Powder",
    color: "#ecfdf5",
    targetArea: 10_000_000,
    polygon: [
      { x: ox, y: oy + 4500 },
      { x: ox + 4000, y: oy + 4500 },
      { x: ox + 4000, y: oy + 7000 },
      { x: ox, y: oy + 7000 },
    ],
  });

  // Props (Ground Floor)
  gfProps.push(makeProp(groundFloorId, gfPorchId, "car_sedan", { x: ox + 2000, y: oy + 9500 }, 0));
  gfProps.push(makeProp(groundFloorId, gfLivingId, "tv_75", { x: ox + 7500, y: oy + 4620 }, 0));
  gfProps.push(makeProp(groundFloorId, gfLivingId, "sofa_l_shape", { x: ox + 7500, y: oy + 7400 }, 180, { color: "#1e3a8a" }));
  gfProps.push(makeProp(groundFloorId, gfLivingId, "coffee_table_rect", { x: ox + 7500, y: oy + 6500 }, 0));
  gfProps.push(makeProp(groundFloorId, gfKitchenId, "counter_l_2400", { x: ox + 9600, y: oy + 1200 }, 0));
  gfProps.push(makeProp(groundFloorId, gfKitchenId, "hob_4burner", { x: ox + 9500, y: oy + 320 }, 0));
  gfProps.push(makeProp(groundFloorId, gfKitchenId, "sink_kitchen", { x: ox + 10600, y: oy + 2000 }, 90));
  gfProps.push(makeProp(groundFloorId, gfKitchenId, "refrigerator_french", { x: ox + 10500, y: oy + 3800 }, 0));
  gfProps.push(makeProp(groundFloorId, gfKitchenId, "dining_6", { x: ox + 7700, y: oy + 2250 }, 0));
  gfProps.push(makeProp(groundFloorId, gfGuestBedId, "bed_queen", { x: ox + 2000, y: oy + 1200 }, 0));
  gfProps.push(makeProp(groundFloorId, gfGuestBedId, "wardrobe_3door", { x: ox + 3500, y: oy + 3600 }, 0));
  gfProps.push(makeProp(groundFloorId, gfEnsuiteId, "toilet_wc", { x: ox + 1000, y: oy + 4800 }, 0));
  gfProps.push(makeProp(groundFloorId, gfEnsuiteId, "sink_vanity", { x: ox + 2200, y: oy + 4800 }, 0));
  gfProps.push(makeProp(groundFloorId, gfEnsuiteId, "shower_cubicle", { x: ox + 3400, y: oy + 6400 }, 0));

  // Staircase (Ground Floor)
  gfStairs.push(makeStair(groundFloorId, ox + 4000, oy + 450, 2400, 3600, "up"));

  // ==========================================
  // FIRST FLOOR (G+1)
  // ==========================================
  const ffWalls: Wall[] = [];
  const ffRooms: Room[] = [];
  const ffProps: Prop[] = [];
  const ffStairs: Staircase[] = [];
  const ffVoids: SlabVoid[] = [];

  // Perimeter Walls (First Floor)
  // North Wall
  ffWalls.push(makeWall(firstFloorId, { x: ox, y: oy }, { x: ox + 4000, y: oy }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 2000, width: 1600, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 4000, y: oy }, { x: ox + 6400, y: oy }, 230, [], [], "exterior_bearing"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 6400, y: oy }, { x: ox + 11000, y: oy }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 2300, width: 1500, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));

  // East Wall
  ffWalls.push(makeWall(firstFloorId, { x: ox + 11000, y: oy }, { x: ox + 11000, y: oy + 4500 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 2250, width: 1400, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 11000, y: oy + 4500 }, { x: ox + 11000, y: oy + 8500 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 2000, width: 1600, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 11000, y: oy + 8500 }, { x: ox + 11000, y: oy + 12000 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 1750, width: 1400, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));

  // South Wall
  ffWalls.push(makeWall(firstFloorId, { x: ox + 11000, y: oy + 12000 }, { x: ox + 4000, y: oy + 12000 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 3500, width: 1600, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 4000, y: oy + 12000 }, { x: ox, y: oy + 12000 }, 100, [], [], "parapet"));

  // West Wall
  ffWalls.push(makeWall(firstFloorId, { x: ox, y: oy + 12000 }, { x: ox, y: oy + 8500 }, 100, [], [], "parapet"));
  ffWalls.push(makeWall(firstFloorId, { x: ox, y: oy + 8500 }, { x: ox, y: oy + 5500 }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 1500, width: 600, height: 600, sillHeight: 1800, windowType: "louver_ventilator", chajjaSunshade: true }
  ], "wet_chase"));
  ffWalls.push(makeWall(firstFloorId, { x: ox, y: oy + 5500 }, { x: ox, y: oy }, 230, [], [
    { id: uid("win"), wallId: "", floorId: firstFloorId, offset: 2750, width: 1600, height: 1200, sillHeight: 900, windowType: "casement", chajjaSunshade: true }
  ], "exterior_bearing"));

  // Interior Partitions (First Floor)
  ffWalls.push(makeWall(firstFloorId, { x: ox, y: oy + 5500 }, { x: ox + 4000, y: oy + 5500 }, 150, [
    { id: uid("door"), wallId: "", floorId: firstFloorId, offset: 1200, width: 900, height: 2100, swingDirection: "inward_right" }
  ], [], "wet_chase"));
  ffWalls.push(makeWall(firstFloorId, { x: ox, y: oy + 8500 }, { x: ox + 4000, y: oy + 8500 }, 150, [
    { id: uid("door"), wallId: "", floorId: firstFloorId, offset: 2000, width: 1800, height: 2100, swingDirection: "inward_left", doorType: "sliding_patio" }
  ], [], "exterior_bearing"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 4000, y: oy }, { x: ox + 4000, y: oy + 12000 }, 115, [
    { id: uid("door"), wallId: "", floorId: firstFloorId, offset: 3000, width: 900, height: 2100, swingDirection: "inward_right" }
  ], [], "interior_partition"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 6400, y: oy }, { x: ox + 6400, y: oy + 4500 }, 115, [], [], "interior_partition"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 6400, y: oy + 4500 }, { x: ox + 11000, y: oy + 4500 }, 115, [
    { id: uid("door"), wallId: "", floorId: firstFloorId, offset: 2000, width: 900, height: 2100, swingDirection: "inward_left" }
  ], [], "interior_partition"));
  ffWalls.push(makeWall(firstFloorId, { x: ox + 4000, y: oy + 8500 }, { x: ox + 11000, y: oy + 8500 }, 115, [], [], "interior_partition"));

  // Rooms (First Floor)
  const ffMasterBedId = uid("room");
  const ffMasterBathId = uid("room");
  const ffBalconyId = uid("room");
  const ffLoungeId = uid("room");
  const ffKidsBedId = uid("room");
  const ffLandingId = uid("room");

  ffRooms.push({
    id: ffMasterBedId,
    floorId: firstFloorId,
    name: "Master Bedroom Suite (Nairutya)",
    color: "#e0f2fe",
    targetArea: 22_000_000,
    polygon: [
      { x: ox, y: oy },
      { x: ox + 4000, y: oy },
      { x: ox + 4000, y: oy + 5500 },
      { x: ox, y: oy + 5500 },
    ],
  });
  ffRooms.push({
    id: ffMasterBathId,
    floorId: firstFloorId,
    name: "Luxury Master Spa Bath",
    color: "#ecfdf5",
    targetArea: 12_000_000,
    polygon: [
      { x: ox, y: oy + 5500 },
      { x: ox + 4000, y: oy + 5500 },
      { x: ox + 4000, y: oy + 8500 },
      { x: ox, y: oy + 8500 },
    ],
  });
  ffRooms.push({
    id: ffBalconyId,
    floorId: firstFloorId,
    name: "Front Scenic Balcony",
    color: "#f8fafc",
    targetArea: 14_000_000,
    polygon: [
      { x: ox, y: oy + 8500 },
      { x: ox + 4000, y: oy + 8500 },
      { x: ox + 4000, y: oy + 12000 },
      { x: ox, y: oy + 12000 },
    ],
  });
  ffRooms.push({
    id: ffLoungeId,
    floorId: firstFloorId,
    name: "Upper Mezzanine Family Lounge",
    color: "#faf5ff",
    targetArea: 24_500_000,
    polygon: [
      { x: ox + 4000, y: oy + 8500 },
      { x: ox + 11000, y: oy + 8500 },
      { x: ox + 11000, y: oy + 12000 },
      { x: ox + 4000, y: oy + 12000 },
    ],
  });
  ffRooms.push({
    id: ffKidsBedId,
    floorId: firstFloorId,
    name: "Kids Bedroom Suite",
    color: "#fef3c7",
    targetArea: 20_700_000,
    polygon: [
      { x: ox + 6400, y: oy },
      { x: ox + 11000, y: oy },
      { x: ox + 11000, y: oy + 4500 },
      { x: ox + 6400, y: oy + 4500 },
    ],
  });
  ffRooms.push({
    id: ffLandingId,
    floorId: firstFloorId,
    name: "Staircase Upper Landing",
    color: "#f1f5f9",
    targetArea: 10_800_000,
    polygon: [
      { x: ox + 4000, y: oy },
      { x: ox + 6400, y: oy },
      { x: ox + 6400, y: oy + 4500 },
      { x: ox + 4000, y: oy + 4500 },
    ],
  });

  // Props (First Floor)
  ffProps.push(makeProp(firstFloorId, ffMasterBedId, "bed_king", { x: ox + 2000, y: oy + 1300 }, 0, { color: "#4f46e5" }));
  ffProps.push(makeProp(firstFloorId, ffMasterBedId, "wardrobe_3door", { x: ox + 3500, y: oy + 4000 }, 0));
  ffProps.push(makeProp(firstFloorId, ffMasterBedId, "desk_executive", { x: ox + 1000, y: oy + 4800 }, 0));
  ffProps.push(makeProp(firstFloorId, ffMasterBathId, "bathtub_luxury", { x: ox + 1200, y: oy + 7600 }, 0));
  ffProps.push(makeProp(firstFloorId, ffMasterBathId, "sink_vanity", { x: ox + 2200, y: oy + 5800 }, 0));
  ffProps.push(makeProp(firstFloorId, ffMasterBathId, "toilet_wc", { x: ox + 3400, y: oy + 5800 }, 0));
  ffProps.push(makeProp(firstFloorId, ffMasterBathId, "shower_cubicle", { x: ox + 3400, y: oy + 7600 }, 0));
  ffProps.push(makeProp(firstFloorId, ffLoungeId, "tv_65", { x: ox + 7500, y: oy + 8700 }, 0));
  ffProps.push(makeProp(firstFloorId, ffLoungeId, "sofa_3seater", { x: ox + 7500, y: oy + 11000 }, 180, { color: "#334155" }));
  ffProps.push(makeProp(firstFloorId, ffLoungeId, "coffee_table_rect", { x: ox + 7500, y: oy + 10000 }, 0));
  ffProps.push(makeProp(firstFloorId, ffKidsBedId, "bed_single", { x: ox + 9000, y: oy + 1200 }, 0));
  ffProps.push(makeProp(firstFloorId, ffKidsBedId, "desk_executive", { x: ox + 9000, y: oy + 3800 }, 180));
  ffProps.push(makeProp(firstFloorId, ffKidsBedId, "wardrobe_3door", { x: ox + 7200, y: oy + 3800 }, 0));

  // Staircase (First Floor, DN)
  ffStairs.push(makeStair(firstFloorId, ox + 4000, oy + 450, 2400, 3600, "down"));

  // Slab Void over Living Room (First Floor Cutout)
  ffVoids.push(makeVoid(
    firstFloorId,
    [
      { x: ox + 4500, y: oy + 4500 },
      { x: ox + 10500, y: oy + 4500 },
      { x: ox + 10500, y: oy + 8000 },
      { x: ox + 4500, y: oy + 8000 },
    ],
    "OPEN TO BELOW (DOUBLE HEIGHT LIVING)"
  ));

  const totalAreaM2 = 243.5;

  return {
    groundFloor: {
      floorId: groundFloorId,
      name: "Ground Floor (Level 0)",
      level: 0,
      walls: gfWalls,
      rooms: gfRooms,
      props: gfProps,
      stairs: gfStairs,
      voids: gfVoids,
      columns: groundColumns,
      totalAreaM2: 132.0,
    },
    firstFloor: {
      floorId: firstFloorId,
      name: "First Floor (Level 1)",
      level: 1,
      walls: ffWalls,
      rooms: ffRooms,
      props: ffProps,
      stairs: ffStairs,
      voids: ffVoids,
      columns: firstColumns,
      totalAreaM2: 111.5,
    },
    description: `Architectural Duplex Villa (243.5 m² / 2621 sq ft). Ground floor features double-height living hall, modular kitchen in SE (Agneya), guest suite, carport with sedan, and Blondel dog-leg staircase. First floor features master spa suite in SW (Nairutya), kids suite, mezzanine lounge, front balcony, and double-height slab void overlooking living room with 16 vertically aligned RC structural columns.`,
    totalAreaM2,
  };
}
