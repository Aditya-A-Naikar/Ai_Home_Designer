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
  | "indian_traditional"
  | "scandinavian"
  | "japandi"
  | "industrial";

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
  finishId?: string; // e.g. 'white_plaster', 'warm_greige', 'exposed_brick', 'charcoal_slate'
  colorHex?: string; // hex color for custom paint
  wallpaperPattern?: string; // e.g. 'geometric', 'fluted_panel', 'damask'
}

export interface Room {
  id: string;
  floorId: string;
  name: string; // e.g., "Living Room", "Master Bedroom"
  polygon: Point2D[]; // boundary vertices in mm
  color?: string; // hex color for 2D fill
  targetArea?: number; // target area in sq mm
  floorFinishId?: string; // e.g. 'teak_hardwood', 'italian_marble', 'polished_concrete', 'slate_ceramic_tile', 'terrazzo'
  wallFinishId?: string; // default wall finish for surfaces enclosed in room
  ceilingFinishId?: string;
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
  finishMaterial?: string; // 'fabric' | 'leather' | 'velvet' | 'wood' | 'marble' | 'chrome'
  finishColor?: string; // hex color
  bladeCount?: number; // for ceiling fans
  lightOutputLumens?: number; // for lighting fixtures
  [key: string]: string | number | boolean | undefined;
}

export type PropCategory =
  | "living"
  | "bedroom"
  | "dining"
  | "entertainment"
  | "kitchen"
  | "bathroom"
  | "lighting"
  | "decor"
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
  | "side_table"
  | "bookshelf"
  | "ceiling_fan"
  | "pendant_light"
  | "chandelier"
  | "recessed_light"
  | "toilet"
  | "shower"
  | "sink"
  | "counter_straight"
  | "counter_l_shape"
  | "hob_cooktop"
  | "refrigerator"
  | "bathtub"
  | "car_sedan"
  | "car_suv"
  | "plant"
  | "curtain";

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
  finishMaterial?: string; // 'fabric' | 'leather' | 'wood' | 'marble' | 'chrome'
  finishColor?: string; // hex color code for 3D PBR rendering
  elevationOffsetMm?: number; // vertical mounting offset (e.g. 2400mm for ceiling fans & lights)
  shape?: "rectangular" | "l_shape" | "curved" | "round";
  specifications?: PropSpecification;
}

export type ElectricalPointType =
  | "distribution_board"
  | "switch_plate"
  | "power_socket_16a"
  | "power_socket_6a"
  | "light_ceiling"
  | "light_wall"
  | "fan_ceiling"
  | "stair_two_way";

export interface ElectricalPoint {
  id: string;
  floorId: string;
  roomId?: string;
  pointType: ElectricalPointType;
  position: Point2D; // in mm
  wallId?: string;
  circuitNumber?: string;
}

export type PlumbingFixtureType =
  | "water_closet"
  | "wash_basin"
  | "shower_drain"
  | "kitchen_sink"
  | "vertical_pipe_chase"
  | "rainwater_downpipe";

export interface PlumbingFixture {
  id: string;
  floorId: string;
  roomId?: string;
  fixtureType: PlumbingFixtureType;
  position: Point2D; // in mm
  pipeDiameterMm: number; // e.g. 110, 75, 32
}

export type HVACType =
  | "split_ac_indoor"
  | "split_ac_outdoor"
  | "exhaust_fan";

export interface HVACPoint {
  id: string;
  floorId: string;
  roomId?: string;
  hvacType: HVACType;
  position: Point2D; // in mm
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
  electricalPoints?: ElectricalPoint[];
  plumbingFixtures?: PlumbingFixture[];
  hvacPoints?: HVACPoint[];
  blueprintUnderlay?: BlueprintUnderlay;
}

export interface BlueprintCalibration {
  point1Px: Point2D;
  point2Px: Point2D;
  pixelDistance: number;
  realDistanceMm: number;
  calibratedAt: string; // ISO 8601
}

export interface BlueprintUnderlay {
  id: string;
  floorId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  imageUrl: string; // Object URL or asset URI
  imageWidth: number; // original image pixel width
  imageHeight: number; // original image pixel height
  positionMm: Point2D; // top-left position in mm
  mmPerPixel: number; // calibration scale factor (mm per image pixel)
  rotationDeg: number; // rotation in degrees: 0, 90, 180, 270
  opacity: number; // 0.0 to 1.0
  visible: boolean;
  calibration?: BlueprintCalibration;
}

export interface DuplexConfig {
  internalStairs: boolean;
  doubleHeightVoid: boolean;
  stairType?: StairType;
}

export type FloorPlanStatus = "draft" | "under_review" | "confirmed";

export interface DesignBaseline {
  confirmedAt: string; // ISO 8601
  version: number;
  snapshotJson: string; // Serialized floors & walls geometry snapshot
  summary: {
    roomCount: number;
    wallCount: number;
    stairCount: number;
    totalAreaSqM: number;
  };
}

export interface ProjectAiBrief {
  clientVision: string;
  targetTypology: BuildingTypology;
  targetLevels: number;
  bhkCount: number;
  bathroomsCount: number;
  architecturalStyle: ArchitecturalStyle;
  designPresetId: string;
  siteOrientation: CompassOrientation;
  amenities: string[];
  budgetTier?: "budget" | "moderate" | "premium" | "luxury";
  consultantNotes: string;
  generatedAt: string;
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
  floorPlanStatus?: FloorPlanStatus; // 'draft' | 'under_review' | 'confirmed'
  designBaseline?: DesignBaseline;
  designVersion?: number;
  activeDesignPreset?: string;
  aiBrief?: ProjectAiBrief;
}
