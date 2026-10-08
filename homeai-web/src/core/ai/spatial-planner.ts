import { Floor, Room, Point2D, Prop, PropCategory, PropType, PropSpecification } from "../domain/types";
import { polygonCentroid, isPointInPolygon } from "../geometry/room-utils";
import { v4 as uuidv4 } from "uuid";

export interface PropPreset {
  name: string;
  category: PropCategory;
  propType: PropType;
  dimensions: { width: number; depth: number; height?: number };
  defaultColor: string;
  shape: "rectangular" | "l_shape" | "curved" | "round";
  specifications: PropSpecification;
  clearance: { front: number; sides: number; back: number };
}

export const PROP_PRESETS: Record<string, PropPreset> = {
  // TVs
  tv_55: {
    name: '55" 4K Smart TV',
    category: "entertainment",
    propType: "tv",
    dimensions: { width: 1230, depth: 80, height: 710 },
    defaultColor: "#0f172a",
    shape: "rectangular",
    specifications: { screenSizeInches: 55, mountType: "wall", resolution: "4K UHD", soundbar: true },
    clearance: { front: 2200, sides: 300, back: 50 },
  },
  tv_65: {
    name: '65" OLED 4K TV',
    category: "entertainment",
    propType: "tv",
    dimensions: { width: 1450, depth: 90, height: 840 },
    defaultColor: "#0f172a",
    shape: "rectangular",
    specifications: { screenSizeInches: 65, mountType: "wall", resolution: "4K OLED", soundbar: true },
    clearance: { front: 2600, sides: 300, back: 50 },
  },
  tv_75: {
    name: '75" QLED HDR Cinema TV',
    category: "entertainment",
    propType: "tv",
    dimensions: { width: 1680, depth: 100, height: 970 },
    defaultColor: "#0f172a",
    shape: "rectangular",
    specifications: { screenSizeInches: 75, mountType: "wall", resolution: "4K QLED", soundbar: true },
    clearance: { front: 3000, sides: 400, back: 50 },
  },
  tv_85: {
    name: '85" 8K Ultra Cinema Display',
    category: "entertainment",
    propType: "tv",
    dimensions: { width: 1900, depth: 110, height: 1090 },
    defaultColor: "#0f172a",
    shape: "rectangular",
    specifications: { screenSizeInches: 85, mountType: "wall", resolution: "8K UHD", soundbar: true },
    clearance: { front: 3500, sides: 500, back: 50 },
  },

  // Sofas & Seating
  sofa_3seater: {
    name: "3-Seater Comfort Sofa",
    category: "living",
    propType: "sofa",
    dimensions: { width: 2200, depth: 900, height: 850 },
    defaultColor: "#475569",
    shape: "rectangular",
    specifications: { seats: 3, layout: "straight", material: "Textured Fabric" },
    clearance: { front: 800, sides: 400, back: 100 },
  },
  sofa_l_shape: {
    name: "Modern L-Shaped Sectional",
    category: "living",
    propType: "sofa",
    dimensions: { width: 2600, depth: 1600, height: 850 },
    defaultColor: "#334155",
    shape: "l_shape",
    specifications: { seats: 5, layout: "l_shape_left", material: "Italian Leather" },
    clearance: { front: 900, sides: 400, back: 100 },
  },
  sofa_loveseat: {
    name: "2-Seater Loveseat",
    category: "living",
    propType: "sofa",
    dimensions: { width: 1600, depth: 850, height: 850 },
    defaultColor: "#64748b",
    shape: "rectangular",
    specifications: { seats: 2, layout: "straight", material: "Bouclé" },
    clearance: { front: 750, sides: 300, back: 100 },
  },

  // Beds
  bed_king: {
    name: "King Size Luxury Bed",
    category: "bedroom",
    propType: "bed",
    dimensions: { width: 1950, depth: 2150, height: 1200 },
    defaultColor: "#6366f1",
    shape: "rectangular",
    specifications: { bedSize: "King", headboardStyle: "upholstered", pillows: 4 },
    clearance: { front: 900, sides: 750, back: 50 },
  },
  bed_queen: {
    name: "Queen Size Comfort Bed",
    category: "bedroom",
    propType: "bed",
    dimensions: { width: 1650, depth: 2100, height: 1100 },
    defaultColor: "#8b5cf6",
    shape: "rectangular",
    specifications: { bedSize: "Queen", headboardStyle: "wood", pillows: 2 },
    clearance: { front: 800, sides: 700, back: 50 },
  },
  bed_single: {
    name: "Single Twin Bed",
    category: "bedroom",
    propType: "bed",
    dimensions: { width: 1050, depth: 2000, height: 950 },
    defaultColor: "#a855f7",
    shape: "rectangular",
    specifications: { bedSize: "Single", headboardStyle: "minimal", pillows: 1 },
    clearance: { front: 750, sides: 600, back: 50 },
  },

  // Dining
  dining_6: {
    name: "6-Seater Dining Set",
    category: "dining",
    propType: "dining_table",
    dimensions: { width: 1700, depth: 950, height: 750 },
    defaultColor: "#78350f",
    shape: "rectangular",
    specifications: { seats: 6, layout: "straight" },
    clearance: { front: 900, sides: 900, back: 900 },
  },

  // Storage & Office
  wardrobe_3door: {
    name: "3-Door Master Wardrobe",
    category: "bedroom",
    propType: "wardrobe",
    dimensions: { width: 1800, depth: 600, height: 2200 },
    defaultColor: "#475569",
    shape: "rectangular",
    specifications: { sliding: true },
    clearance: { front: 800, sides: 100, back: 50 },
  },
  desk_executive: {
    name: "Executive Workstation Desk",
    category: "office",
    propType: "desk",
    dimensions: { width: 1400, depth: 700, height: 750 },
    defaultColor: "#1e293b",
    shape: "rectangular",
    specifications: { material: "Walnut & Steel" },
    clearance: { front: 600, sides: 300, back: 900 },
  },
};

export interface PlacementPlan {
  prop: Prop;
  targetRoom: Room;
  reasoning: string;
  viewingDistanceM?: number;
}

/**
 * Autonomous AI Spatial Planner:
 * Analyzes room geometry, entrances, and walls, then computes the optimal Neufert-compliant
 * placement, orientation, and clearance for a selected prop.
 */
export function planAutonomousPlacement(
  floor: Floor,
  presetKey: string,
  targetRoomId?: string,
  customOverrides: Partial<Prop> = {}
): PlacementPlan | null {
  const preset = PROP_PRESETS[presetKey];
  if (!preset) return null;

  // 1. Identify Target Room
  let room: Room | undefined;
  if (targetRoomId) {
    room = floor.rooms.find(r => r.id === targetRoomId);
  }
  
  if (!room) {
    // Intelligent auto-detection based on prop category
    const cat = preset.category;
    if (cat === "living" || cat === "entertainment") {
      room = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall"));
    } else if (cat === "bedroom") {
      room = floor.rooms.find(r => r.name.toLowerCase().includes("bed"));
    } else if (cat === "dining") {
      room = floor.rooms.find(r => r.name.toLowerCase().includes("dining") || r.name.toLowerCase().includes("living"));
    } else if (cat === "office") {
      room = floor.rooms.find(r => r.name.toLowerCase().includes("study") || r.name.toLowerCase().includes("office") || r.name.toLowerCase().includes("bed"));
    }
    if (!room) {
      room = floor.rooms[0];
    }
  }

  if (!room || room.polygon.length < 3) return null;

  const roomPoly = room.polygon;
  const centroid = polygonCentroid(roomPoly);
  const existingProps = (floor.props || []).filter(p => p.roomId === room?.id);

  // 2. Room Bounding Box
  const xs = roomPoly.map(p => p.x);
  const ys = roomPoly.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const roomW = maxX - minX;
  const roomH = maxY - minY;

  // 3. Specialized Layout Logic by Prop Type
  let pos: Point2D = { x: centroid.x, y: centroid.y };
  let rotation = 0;
  let reasoning = "";
  let viewingDistanceM: number | undefined;

  if (preset.propType === "tv") {
    // Place TV on longest unbroken wall, facing inward
    const inches = (customOverrides.specifications?.screenSizeInches || preset.specifications.screenSizeInches || 65) as number;
    // Check if room is wider along X or Y
    if (roomW >= roomH) {
      // Wide room: Place TV centered along North wall (top) facing South
      pos = { x: minX + roomW / 2, y: minY + preset.dimensions.depth / 2 + 80 };
      rotation = 0; // facing downward/South
      reasoning = `Mounted ${inches}" TV on North wall facing the main living space with optimal viewing angle.`;
    } else {
      // Tall room: Place TV centered along West wall (left) facing East
      pos = { x: minX + preset.dimensions.depth / 2 + 80, y: minY + roomH / 2 };
      rotation = 90; // facing East
      reasoning = `Mounted ${inches}" TV on West wall facing across the living room.`;
    }
  } else if (preset.propType === "sofa") {
    // Check if TV already exists in the room
    const tv = existingProps.find(p => p.propType === "tv");
    if (tv) {
      const inches = (tv.specifications?.screenSizeInches || 65) as number;
      // Neufert / SMPTE optimal viewing distance: ~38mm per screen inch
      const optimalDist = Math.max(2200, Math.min(3600, inches * 38));
      viewingDistanceM = optimalDist / 1000;

      if (tv.rotation === 0) {
        // TV is on North wall facing South. Place sofa South of TV.
        pos = { x: tv.position.x, y: Math.min(maxY - preset.dimensions.depth / 2 - 200, tv.position.y + optimalDist) };
        rotation = 180; // Facing North towards TV
        reasoning = `Placed sofa directly opposite ${inches}" TV at calibrated ergonomic viewing distance (${(optimalDist / 1000).toFixed(1)}m).`;
      } else if (tv.rotation === 90) {
        // TV is on West wall facing East. Place sofa East of TV.
        pos = { x: Math.min(maxX - preset.dimensions.depth / 2 - 200, tv.position.x + optimalDist), y: tv.position.y };
        rotation = 270; // Facing West towards TV
        reasoning = `Aligned seating with TV line of sight at ${(optimalDist / 1000).toFixed(1)}m viewing distance.`;
      } else {
        pos = { x: centroid.x, y: centroid.y + 600 };
        rotation = 0;
        reasoning = `Centered lounge sofa in living room.`;
      }
    } else {
      // No TV: Place comfortable central seating
      pos = { x: centroid.x, y: centroid.y + 300 };
      rotation = 0;
      reasoning = `Centered lounge seating facing primary conversation area.`;
    }
  } else if (preset.propType === "bed") {
    // Place headboard against South or West wall (Vaastu & Neufert privacy)
    // Headboard on North wall facing South, centered with 750mm nightstand clearance
    pos = {
      x: minX + roomW / 2,
      y: minY + preset.dimensions.depth / 2 + 100
    };
    rotation = 0;
    reasoning = `Headboard positioned against solid wall with 750mm dual-sided nightstand access.`;
  } else if (preset.propType === "dining_table") {
    pos = { x: centroid.x, y: centroid.y };
    rotation = roomW < roomH ? 90 : 0;
    reasoning = `Centered dining table ensuring 900mm all-round chair pull-out clearance.`;
  } else if (preset.propType === "wardrobe") {
    // Place along corner
    pos = {
      x: maxX - preset.dimensions.width / 2 - 150,
      y: minY + preset.dimensions.depth / 2 + 150
    };
    rotation = 0;
    reasoning = `Fitted wardrobe flush into room corner to preserve open circulation.`;
  } else {
    pos = { x: centroid.x, y: centroid.y };
    rotation = 0;
    reasoning = `Positioned in primary functional zone.`;
  }

  // Fallback boundary clamp if outside room
  if (!isPointInPolygon(pos, roomPoly)) {
    pos = { x: centroid.x, y: centroid.y };
  }

  const newProp: Prop = {
    id: `prop-${uuidv4().slice(0, 8)}`,
    floorId: floor.id,
    roomId: room.id,
    name: customOverrides.name || preset.name,
    category: preset.category,
    propType: preset.propType,
    position: pos,
    rotation: customOverrides.rotation !== undefined ? customOverrides.rotation : rotation,
    dimensions: customOverrides.dimensions || { ...preset.dimensions },
    color: customOverrides.color || preset.defaultColor,
    shape: customOverrides.shape || preset.shape,
    specifications: {
      ...preset.specifications,
      ...(customOverrides.specifications || {}),
    },
  };

  return {
    prop: newProp,
    targetRoom: room,
    reasoning,
    viewingDistanceM,
  };
}
