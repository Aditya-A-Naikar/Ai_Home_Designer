import {
  ArchitecturalStyle,
  BuildingTypology,
  DuplexConfig,
  Floor,
  PreferredUnit,
  Project,
  SiteContext,
  UnitSystem,
} from "./types";
import { ProjectSchema } from "./schema";

export interface CreateProjectParams {
  name: string;
  plotWidthMm: number;
  plotDepthMm: number;
  preferredUnit: PreferredUnit;
  unitSystem: UnitSystem;
  floorsCount: number; // 1, 2, 3, etc.
  style: ArchitecturalStyle;
  typology?: BuildingTypology;
  siteContext?: SiteContext;
  duplexConfig?: DuplexConfig;
  priorities: string[];
  constraints?: string[];
  description?: string;
}

/**
 * Creates a unique identifier (UUID v4 format fallback without external crypto library).
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Factory function to instantiate a valid, normalized Project model.
 * Initializes default floors, duplex configuration, site context, and settings.
 */
export function createProject(params: CreateProjectParams): Project {
  const projectId = generateId();
  const now = new Date().toISOString();

  const isDuplex = params.typology === "duplex_vertical" || params.typology === "duplex_side_by_side";
  const count = typeof params.floorsCount === "number" && !isNaN(params.floorsCount) ? params.floorsCount : 1;
  const initialFloorCount = isDuplex ? Math.max(2, count) : Math.max(1, Math.min(count, 5));
  const floors: Floor[] = [];

  for (let i = 0; i < initialFloorCount; i++) {
    const floorId = generateId();
    let name = "Ground Floor";
    if (i === 1) name = "First Floor";
    if (i === 2) name = "Second Floor";
    if (i > 2) name = `Floor ${i}`;

    floors.push({
      id: floorId,
      projectId,
      level: i,
      name,
      elevation: i * 2800, // 2800 mm per floor
      height: 2800,
      walls: [],
      rooms: [],
      props: [],
      stairs: [],
      voids: [],
      columns: [],
      electricalPoints: [],
      plumbingFixtures: [],
      hvacPoints: [],
    });
  }

  const rawProject: Project = {
    schemaVersion: 1,
    id: projectId,
    name: params.name.trim(),
    plotDimensions: {
      width: params.plotWidthMm,
      depth: params.plotDepthMm,
    },
    typology: params.typology || (isDuplex ? "duplex_vertical" : "single_family"),
    siteContext: params.siteContext || {
      roadFacing: "N",
      northAngleDegrees: 0,
      setbacks: {
        front: 3000,
        rear: 1500,
        left: 1500,
        right: 1500,
      },
    },
    duplexConfig: params.duplexConfig || (isDuplex ? {
      internalStairs: true,
      doubleHeightVoid: false,
      stairType: "dog_leg",
    } : undefined),
    settings: {
      preferredUnit: params.preferredUnit,
      unitSystem: params.unitSystem,
      gridSize: 100, // 100 mm default grid
      snapTolerance: 10,
      defaultWallThickness: 150,
      defaultCeilingHeight: 2800,
    },
    preferences: {
      style: params.style,
      priorities: params.priorities,
      constraints: params.constraints || [],
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      description: params.description,
    },
    activeFloorId: floors[0].id,
    floors,
  };

  // Validate through Zod to guarantee data integrity
  return ProjectSchema.parse(rawProject);
}
