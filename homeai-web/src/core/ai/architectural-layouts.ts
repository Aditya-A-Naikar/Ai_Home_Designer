import { Wall, Room, Prop, Door, Window } from "../domain/types";
import { PROP_PRESETS } from "./spatial-planner";
import { v4 as uuidv4 } from "uuid";

export interface GeneratedLayout {
  walls: Wall[];
  rooms: Room[];
  props: Prop[];
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
 * Helper to build a Wall with optional doors & windows.
 */
function makeWall(
  floorId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number = 200,
  doors: Door[] = [],
  windows: Window[] = []
): Wall {
  const wallId = uid("wall");
  return {
    id: wallId,
    floorId,
    start,
    end,
    thickness,
    doors: doors.map(d => ({ ...d, wallId, floorId })),
    windows: windows.map(w => ({ ...w, wallId, floorId })),
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
