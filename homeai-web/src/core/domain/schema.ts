import { z } from "zod";

export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const UnitSystemSchema = z.enum(["metric", "imperial"]);
export const PreferredUnitSchema = z.enum(["mm", "cm", "m", "in", "ft"]);

export const ArchitecturalStyleSchema = z.enum([
  "modern",
  "minimalist",
  "traditional",
  "antique",
  "mixed",
  "indian_traditional",
]);

export const ProjectSettingsSchema = z.object({
  preferredUnit: PreferredUnitSchema,
  unitSystem: UnitSystemSchema,
  gridSize: z.number().positive().default(100),
  snapTolerance: z.number().nonnegative().default(10),
  defaultWallThickness: z.number().positive().default(150),
  defaultCeilingHeight: z.number().positive().default(2800),
});

export const DesignPreferencesSchema = z.object({
  style: ArchitecturalStyleSchema,
  priorities: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  budgetTier: z.enum(["budget", "moderate", "premium", "luxury"]).optional(),
});

export const ProjectMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.string().optional(),
  description: z.string().optional(),
});

export const DoorSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  floorId: z.string(),
  offset: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  swingDirection: z.enum([
    "inward_left",
    "inward_right",
    "outward_left",
    "outward_right",
  ]),
});

export const WindowSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  floorId: z.string(),
  offset: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  sillHeight: z.number().nonnegative(),
});

export const WallSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  start: Point2DSchema,
  end: Point2DSchema,
  thickness: z.number().positive().default(150),
  height: z.number().positive().optional(),
  doors: z.array(DoorSchema).default([]),
  windows: z.array(WindowSchema).default([]),
});

export const RoomSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  name: z.string().min(1),
  polygon: z.array(Point2DSchema).min(3),
  color: z.string().optional(),
  targetArea: z.number().positive().optional(),
});

export const FloorSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  level: z.number().int(),
  name: z.string().min(1),
  elevation: z.number().default(0),
  height: z.number().positive().default(2800),
  walls: z.array(WallSchema).default([]),
  rooms: z.array(RoomSchema).default([]),
});

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string().min(1, "Project name is required"),
  plotDimensions: z.object({
    width: z.number().positive("Plot width must be positive"),
    depth: z.number().positive("Plot depth must be positive"),
  }),
  settings: ProjectSettingsSchema,
  preferences: DesignPreferencesSchema,
  metadata: ProjectMetadataSchema,
  activeFloorId: z.string(),
  floors: z.array(FloorSchema).min(1, "At least one floor is required"),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;
