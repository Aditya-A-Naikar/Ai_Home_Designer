/**
 * HomeAI Designer — Canonical Domain Types
 * Single source of truth across 2D, 3D, AI, and Persistence layers.
 * All spatial coordinates and dimensions stored in MILLIMETERS (mm).
 */

export type UnitSystem = "metric" | "imperial";
export type PreferredUnit = "mm" | "cm" | "m" | "in" | "ft";

export type ArchitecturalStyle =
  | "modern"
  | "minimalist"
  | "traditional"
  | "antique"
  | "mixed"
  | "indian_traditional";

export type BuildingTypology =
  | "single_family"
  | "duplex_vertical"
  | "duplex_side_by_side"
  | "villa"
  | "apartment"
  | "townhouse";

export type CompassOrientation = "N" | "E" | "S" | "W" | "NE" | "NW" | "SE" | "SW";

export interface Setbacks {
  front: number; // in mm
  rear: number;  // in mm
  left: number;  // in mm
  right: number; // in mm
}

export interface SiteContext {
  roadFacing: CompassOrientation;
  northAngleDegrees: number; // 0 = Up (North), 90 = East, 180 = South, 270 = West
  roadWidthMm?: number;
  setbacks: Setbacks;
}

export type StairType =
  | "straight"
  | "dog_leg"
  | "open_well"
  | "spiral"
  | "cantilever";

export interface Staircase {
  id: string;
  floorId: string;
  name?: string;
  stairType: StairType;
  position: Point2D; // insertion center/corner in mm
  width: number; // total flight width in mm (e.g. 1000 - 1200 mm)
  length: number; // total flight length / run in mm (e.g. 2400 - 3600 mm)
  rotation: number; // in degrees: 0, 90, 180, 270
  treadMm: number; // standard tread depth 250 - 300 mm
  riserMm: number; // standard riser height 150 - 180 mm
  stepCount: number; // standard 16 - 18 risers
  direction: "up" | "down";
  handrail?: boolean;
}

export interface SlabVoid {
  id: string;
  floorId: string;
  name: string; // e.g. "Stairwell Opening", "Double Height Living Void"
  polygon: Point2D[]; // void boundary polygon in mm
}

export interface StructuralColumn {
  id: string;
  floorId: string;
  position: Point2D;
  width: number; // in mm (e.g. 230)
  depth: number; // in mm (e.g. 450)
  rotation: number; // 0 or 90
}

export interface Point2D {
  x: number; // in millimeters
  y: number; // in millimeters
}

export interface ProjectSettings {
  preferredUnit: PreferredUnit;
  unitSystem: UnitSystem;
  gridSize: number; // in mm, default: 100 mm (~4 inches)
  snapTolerance: number; // in screen pixels, default: 10 px
  defaultWallThickness: number; // in mm, default: 150 mm
  defaultCeilingHeight: number; // in mm, default: 2800 mm (~9.2 ft)
}

export interface DesignPreferences {
  style: ArchitecturalStyle;
  priorities: string[]; // e.g. ["natural light", "open concept", "privacy from street"]
  constraints: string[]; // e.g. ["vaastu compliant", "accessible bathroom"]
  budgetTier?: "budget" | "moderate" | "premium" | "luxury";
}

export interface ProjectMetadata {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  author?: string;
  description?: string;
}

export type DoorType =
  | "single_swing"
  | "double_entry"
  | "sliding_patio"
  | "pocket"
  | "bifold";

export interface Door {
  id: string;
  wallId: string;
  floorId: string;
  offset: number; // distance in mm from wall.start along centerline
  width: number; // in mm (standard 800 - 1500 mm)
  height: number; // in mm (standard 2100 mm)
  swingDirection: "inward_left" | "inward_right" | "outward_left" | "outward_right";
  doorType?: DoorType;
}

export type WindowType =
  | "sliding"
  | "casement"
  | "louver_ventilator"
  | "bay_window"
  | "fixed";

export interface Window {
  id: string;
  wallId: string;
  floorId: string;
  offset: number; // distance in mm from wall.start along centerline
  width: number; // in mm (standard 1000 - 2400 mm)
  height: number; // in mm (standard 1200 - 1500 mm)
  sillHeight: number; // in mm from floor elevation (standard 900 mm; 1500 mm for ventilators)
  windowType?: WindowType;
  chajjaSunshade?: boolean; // external weather shade projection
}

export type WallType =
  | "exterior_bearing" // 230 mm (9-inch brick)
  | "interior_partition" // 115 mm (4.5-inch partition)
  | "wet_chase" // 150 mm plumbing wall
  | "parapet"; // 100 mm terrace railing wall

export interface Wall {
  id: string;
  floorId: string;
  start: Point2D; // in mm
  end: Point2D; // in mm
  thickness: number; // in mm, default 150 mm
  height?: number; // optional override for ceiling height
  wallType?: WallType;
  doors: Door[];
  windows: Window[];
}

export interface Room {
  id: string;
  floorId: string;
  name: string; // e.g., "Living Room", "Master Bedroom"
  polygon: Point2D[]; // boundary vertices in mm
  color?: string; // hex color for 2D fill
  targetArea?: number; // target area in sq mm
}

export interface PropSpecification {
  screenSizeInches?: number;
  mountType?: "wall" | "console";
  resolution?: string;
  soundbar?: boolean;
  material?: string;
  seats?: number;
  bedSize?: "King" | "Queen" | "Single" | "Double";
  layout?: "straight" | "l_shape_left" | "l_shape_right" | "round";
  [key: string]: string | number | boolean | undefined;
}

export type PropCategory =
  | "living"
  | "bedroom"
  | "dining"
  | "entertainment"
  | "kitchen"
  | "bathroom"
  | "office"
  | "parking"
  | "circulation";

export type PropType =
  | "tv"
  | "sofa"
  | "bed"
  | "dining_table"
  | "wardrobe"
  | "desk"
  | "coffee_table"
  | "toilet"
  | "shower"
  | "sink"
  | "counter_straight"
  | "counter_l_shape"
  | "hob_cooktop"
  | "refrigerator"
  | "bathtub"
  | "car_sedan"
  | "car_suv";

export interface Prop {
  id: string;
  floorId: string;
  roomId?: string;
  name: string;
  category: PropCategory;
  propType: PropType;
  position: Point2D; // center position in mm
  rotation: number; // in degrees: 0, 90, 180, 270
  dimensions: {
    width: number; // in mm
    depth: number; // in mm
    height?: number; // in mm
  };
  color?: string; // hex color for 2D styling
  shape?: "rectangular" | "l_shape" | "curved" | "round";
  specifications?: PropSpecification;
}

export interface Floor {
  id: string;
  projectId: string;
  level: number; // 0 = Ground, 1 = 1st Floor, -1 = Basement
  name: string; // e.g. "Ground Floor"
  elevation: number; // in mm from ground level
  height: number; // ceiling height in mm (e.g. 2800 mm)
  walls: Wall[];
  rooms: Room[];
  props?: Prop[];
  stairs?: Staircase[];
  voids?: SlabVoid[];
  columns?: StructuralColumn[];
}

export interface DuplexConfig {
  internalStairs: boolean;
  doubleHeightVoid: boolean;
  stairType?: StairType;
}

export interface Project {
  schemaVersion: 1;
  id: string; // UUID v4
  name: string;
  plotDimensions: {
    width: number; // in mm
    depth: number; // in mm
  };
  typology?: BuildingTypology;
  siteContext?: SiteContext;
  duplexConfig?: DuplexConfig;
  settings: ProjectSettings;
  preferences: DesignPreferences;
  metadata: ProjectMetadata;
  activeFloorId: string;
  floors: Floor[];
}
