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

export interface Door {
  id: string;
  wallId: string;
  floorId: string;
  offset: number; // distance in mm from wall.start along centerline
  width: number; // in mm (standard 800 - 1000 mm)
  height: number; // in mm (standard 2100 mm)
  swingDirection: "inward_left" | "inward_right" | "outward_left" | "outward_right";
}

export interface Window {
  id: string;
  wallId: string;
  floorId: string;
  offset: number; // distance in mm from wall.start along centerline
  width: number; // in mm (standard 1000 - 1500 mm)
  height: number; // in mm (standard 1200 - 1400 mm)
  sillHeight: number; // in mm from floor elevation (standard 900 mm)
}

export interface Wall {
  id: string;
  floorId: string;
  start: Point2D; // in mm
  end: Point2D; // in mm
  thickness: number; // in mm, default 150 mm
  height?: number; // optional override for ceiling height
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

export interface Floor {
  id: string;
  projectId: string;
  level: number; // 0 = Ground, 1 = 1st Floor, -1 = Basement
  name: string; // e.g. "Ground Floor"
  elevation: number; // in mm from ground level
  height: number; // ceiling height in mm (e.g. 2800 mm)
  walls: Wall[];
  rooms: Room[];
}

export interface Project {
  schemaVersion: 1;
  id: string; // UUID v4
  name: string;
  plotDimensions: {
    width: number; // in mm
    depth: number; // in mm
  };
  settings: ProjectSettings;
  preferences: DesignPreferences;
  metadata: ProjectMetadata;
  activeFloorId: string;
  floors: Floor[];
}
