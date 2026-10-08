import {
  ArchitecturalStyle,
  Floor,
  PreferredUnit,
  Project,
  UnitSystem,
} from "./types";
import { ProjectSchema } from "./schema";

export interface CreateProjectParams {
  name: string;
  plotWidthMm: number;
  plotDepthMm: number;
  preferredUnit: PreferredUnit;
  unitSystem: UnitSystem;
  floorsCount: number; // 1, 2, or 3
  style: ArchitecturalStyle;
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
 * Initializes default floors and settings.
 */
export function createProject(params: CreateProjectParams): Project {
  const projectId = generateId();
  const now = new Date().toISOString();

  const floorCount = Math.max(1, Math.min(params.floorsCount, 5));
  const floors: Floor[] = [];

  for (let i = 0; i < floorCount; i++) {
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
