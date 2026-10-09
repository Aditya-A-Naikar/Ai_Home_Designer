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
  "scandinavian",
  "japandi",
  "industrial",
]);

export const BuildingTypologySchema = z.enum([
  "single_family",
  "duplex_vertical",
  "duplex_side_by_side",
  "villa",
  "apartment",
  "townhouse",
]);

export const CompassOrientationSchema = z.enum([
  "N",
  "E",
  "S",
  "W",
  "NE",
  "NW",
  "SE",
  "SW",
]);

export const SetbacksSchema = z.object({
  front: z.number().nonnegative(),
  rear: z.number().nonnegative(),
  left: z.number().nonnegative(),
  right: z.number().nonnegative(),
});

export const SiteContextSchema = z.object({
  roadFacing: CompassOrientationSchema,
  northAngleDegrees: z.number().default(0),
  roadWidthMm: z.number().positive().optional(),
  setbacks: SetbacksSchema,
});

export const StairTypeSchema = z.enum([
  "straight",
  "dog_leg",
  "open_well",
  "spiral",
  "cantilever",
]);

export const StaircaseSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  name: z.string().optional(),
  stairType: StairTypeSchema,
  position: Point2DSchema,
  width: z.number().positive().default(1000),
  length: z.number().positive().default(2800),
  rotation: z.number().default(0),
  treadMm: z.number().positive().default(250),
  riserMm: z.number().positive().default(175),
  stepCount: z.number().int().positive().default(17),
  direction: z.enum(["up", "down"]).default("up"),
  handrail: z.boolean().optional(),
});

export const SlabVoidSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  name: z.string().min(1),
  polygon: z.array(Point2DSchema).min(3),
});

export const StructuralColumnSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  position: Point2DSchema,
  width: z.number().positive().default(230),
  depth: z.number().positive().default(450),
  rotation: z.number().default(0),
});

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

export const DoorTypeSchema = z.enum([
  "single_swing",
  "double_entry",
  "sliding_patio",
  "pocket",
  "bifold",
]);

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
  doorType: DoorTypeSchema.optional(),
});

export const WindowTypeSchema = z.enum([
  "sliding",
  "casement",
  "louver_ventilator",
  "bay_window",
  "fixed",
]);

export const WindowSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  floorId: z.string(),
  offset: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  sillHeight: z.number().nonnegative(),
  windowType: WindowTypeSchema.optional(),
  chajjaSunshade: z.boolean().optional(),
});

export const WallTypeSchema = z.enum([
  "exterior_bearing",
  "interior_partition",
  "wet_chase",
  "parapet",
]);

export const WallSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  start: Point2DSchema,
  end: Point2DSchema,
  thickness: z.number().positive().default(150),
  height: z.number().positive().optional(),
  wallType: WallTypeSchema.optional(),
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

export const PropSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  roomId: z.string().optional(),
  name: z.string().min(1),
  category: z.enum([
    "living",
    "bedroom",
    "dining",
    "entertainment",
    "kitchen",
    "bathroom",
    "office",
    "parking",
    "circulation",
  ]),
  propType: z.enum([
    "tv",
    "sofa",
    "bed",
    "dining_table",
    "wardrobe",
    "desk",
    "coffee_table",
    "toilet",
    "shower",
    "sink",
    "counter_straight",
    "counter_l_shape",
    "hob_cooktop",
    "refrigerator",
    "bathtub",
    "car_sedan",
    "car_suv",
  ]),
  position: Point2DSchema,
  rotation: z.number().default(0),
  dimensions: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive().optional(),
  }),
  color: z.string().optional(),
  shape: z.enum(["rectangular", "l_shape", "curved", "round"]).optional(),
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const ElectricalPointTypeSchema = z.enum([
  "distribution_board",
  "switch_plate",
  "power_socket_16a",
  "power_socket_6a",
  "light_ceiling",
  "light_wall",
  "fan_ceiling",
  "stair_two_way",
]);

export const ElectricalPointSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  roomId: z.string().optional(),
  pointType: ElectricalPointTypeSchema,
  position: Point2DSchema,
  wallId: z.string().optional(),
  circuitNumber: z.string().optional(),
});

export const PlumbingFixtureTypeSchema = z.enum([
  "water_closet",
  "wash_basin",
  "shower_drain",
  "kitchen_sink",
  "vertical_pipe_chase",
  "rainwater_downpipe",
]);

export const PlumbingFixtureSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  roomId: z.string().optional(),
  fixtureType: PlumbingFixtureTypeSchema,
  position: Point2DSchema,
  pipeDiameterMm: z.number().positive().default(110),
});

export const HVACTypeSchema = z.enum([
  "split_ac_indoor",
  "split_ac_outdoor",
  "exhaust_fan",
]);

export const HVACPointSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  roomId: z.string().optional(),
  hvacType: HVACTypeSchema,
  position: Point2DSchema,
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
  props: z.array(PropSchema).default([]),
  stairs: z.array(StaircaseSchema).optional(),
  voids: z.array(SlabVoidSchema).optional(),
  columns: z.array(StructuralColumnSchema).optional(),
  electricalPoints: z.array(ElectricalPointSchema).optional(),
  plumbingFixtures: z.array(PlumbingFixtureSchema).optional(),
  hvacPoints: z.array(HVACPointSchema).optional(),
});

export const DuplexConfigSchema = z.object({
  internalStairs: z.boolean().default(true),
  doubleHeightVoid: z.boolean().default(false),
  stairType: StairTypeSchema.optional(),
});

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string().min(1, "Project name is required"),
  plotDimensions: z.object({
    width: z.number().positive("Plot width must be positive"),
    depth: z.number().positive("Plot depth must be positive"),
  }),
  typology: BuildingTypologySchema.optional(),
  siteContext: SiteContextSchema.optional(),
  duplexConfig: DuplexConfigSchema.optional(),
  settings: ProjectSettingsSchema,
  preferences: DesignPreferencesSchema,
  metadata: ProjectMetadataSchema,
  activeFloorId: z.string(),
  floors: z.array(FloorSchema).min(1, "At least one floor is required"),
  floorPlanStatus: z.enum(["draft", "under_review", "confirmed"]).optional(),
  designBaseline: z.any().optional(),
  designVersion: z.number().optional(),
  activeDesignPreset: z.string().optional(),
  aiBrief: z.any().optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;
