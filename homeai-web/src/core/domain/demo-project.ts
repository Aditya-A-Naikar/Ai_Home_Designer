import { Project } from "./types";
import { ProjectSchema } from "./schema";

/**
 * Creates a fully articulated demo project with realistic rooms, walls, doors, and windows.
 * Coordinates are in millimeters (mm).
 */
export function getDemoProject(): Project {
  const projectId = "demo-sunset-villa";
  const floorId = "demo-floor-ground";
  const now = new Date().toISOString();

  // Wall IDs
  const w1 = "wall-north";
  const w2 = "wall-east";
  const w3 = "wall-south";
  const w4 = "wall-west";
  const w5 = "wall-interior-1";
  const w6 = "wall-interior-2";

  const demoProject: Project = {
    schemaVersion: 1,
    id: projectId,
    name: "Sunset Ridge Villa (Demo)",
    plotDimensions: {
      width: 15000, // 15 meters (approx 49 ft)
      depth: 12000, // 12 meters (approx 39 ft)
    },
    settings: {
      preferredUnit: "m",
      unitSystem: "metric",
      gridSize: 100,
      snapTolerance: 10,
      defaultWallThickness: 150,
      defaultCeilingHeight: 2800,
    },
    preferences: {
      style: "modern",
      priorities: ["Natural light", "Open concept living", "Spacious kitchen"],
      constraints: ["North-facing entrance", "Cross ventilation"],
      budgetTier: "premium",
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      description: "A 3-bedroom modern concept villa with open floor plan and garden patio.",
    },
    activeFloorId: floorId,
    floors: [
      {
        id: floorId,
        projectId,
        level: 0,
        name: "Ground Floor",
        elevation: 0,
        height: 2800,
        walls: [
          // Exterior North wall (0,0) -> (12000, 0)
          {
            id: w1,
            floorId,
            start: { x: 0, y: 0 },
            end: { x: 12000, y: 0 },
            thickness: 200,
            doors: [
              {
                id: "door-main-entrance",
                wallId: w1,
                floorId,
                offset: 2000,
                width: 1000,
                height: 2100,
                swingDirection: "inward_left",
              },
            ],
            windows: [
              {
                id: "window-north-living",
                wallId: w1,
                floorId,
                offset: 6000,
                width: 1800,
                height: 1400,
                sillHeight: 900,
              },
            ],
          },
          // Exterior East wall (12000, 0) -> (12000, 9000)
          {
            id: w2,
            floorId,
            start: { x: 12000, y: 0 },
            end: { x: 12000, y: 9000 },
            thickness: 200,
            doors: [],
            windows: [
              {
                id: "window-east-kitchen",
                wallId: w2,
                floorId,
                offset: 2000,
                width: 1400,
                height: 1200,
                sillHeight: 1050,
              },
            ],
          },
          // Exterior South wall (12000, 9000) -> (0, 9000)
          {
            id: w3,
            floorId,
            start: { x: 12000, y: 9000 },
            end: { x: 0, y: 9000 },
            thickness: 200,
            doors: [
              {
                id: "door-patio-slider",
                wallId: w3,
                floorId,
                offset: 4000,
                width: 2400,
                height: 2100,
                swingDirection: "outward_right",
              },
            ],
            windows: [
              {
                id: "window-south-bedroom",
                wallId: w3,
                floorId,
                offset: 8000,
                width: 1500,
                height: 1400,
                sillHeight: 900,
              },
            ],
          },
          // Exterior West wall (0, 9000) -> (0, 0)
          {
            id: w4,
            floorId,
            start: { x: 0, y: 9000 },
            end: { x: 0, y: 0 },
            thickness: 200,
            doors: [],
            windows: [
              {
                id: "window-west-bath",
                wallId: w4,
                floorId,
                offset: 4000,
                width: 900,
                height: 900,
                sillHeight: 1400,
              },
            ],
          },
          // Interior Wall 1: dividing Living / Kitchen from Bedroom
          {
            id: w5,
            floorId,
            start: { x: 0, y: 5000 },
            end: { x: 7000, y: 5000 },
            thickness: 150,
            doors: [
              {
                id: "door-bedroom",
                wallId: w5,
                floorId,
                offset: 1000,
                width: 900,
                height: 2100,
                swingDirection: "inward_right",
              },
            ],
            windows: [],
          },
          // Interior Wall 2: dividing Kitchen from Living
          {
            id: w6,
            floorId,
            start: { x: 7000, y: 0 },
            end: { x: 7000, y: 5000 },
            thickness: 150,
            doors: [
              {
                id: "door-kitchen-entry",
                wallId: w6,
                floorId,
                offset: 2500,
                width: 900,
                height: 2100,
                swingDirection: "inward_left",
              },
            ],
            windows: [],
          },
        ],
        rooms: [
          {
            id: "room-living",
            floorId,
            name: "Living Room",
            polygon: [
              { x: 0, y: 0 },
              { x: 7000, y: 0 },
              { x: 7000, y: 5000 },
              { x: 0, y: 5000 },
            ],
            color: "#e0e7ff",
            targetArea: 35_000_000, // 35 m²
          },
          {
            id: "room-kitchen",
            floorId,
            name: "Kitchen & Dining",
            polygon: [
              { x: 7000, y: 0 },
              { x: 12000, y: 0 },
              { x: 12000, y: 5000 },
              { x: 7000, y: 5000 },
            ],
            color: "#dcfce7",
            targetArea: 25_000_000, // 25 m²
          },
          {
            id: "room-master-bedroom",
            floorId,
            name: "Master Bedroom",
            polygon: [
              { x: 0, y: 5000 },
              { x: 12000, y: 5000 },
              { x: 12000, y: 9000 },
              { x: 0, y: 9000 },
            ],
            color: "#fef3c7",
            targetArea: 48_000_000, // 48 m²
          },
        ],
      },
    ],
  };

  return ProjectSchema.parse(demoProject);
}
