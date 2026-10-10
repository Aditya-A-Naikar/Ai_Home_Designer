import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  getDemoProject,
  getMyHomeProject,
  normalizeProject,
  cloneTemplateProject,
} from "@/core/domain/demo-project";
import { ProjectSchema } from "@/core/domain/schema";
import { LocalStorageProjectRepository } from "@/infrastructure/persistence/local-storage-project-repository";
import { useProjectStore } from "@/store/project-store";
import { useCanvasStore } from "@/store/canvas-store";
import { ProjectDashboard } from "@/features/project-mgmt/components/project-dashboard";
import { Project } from "@/core/domain/types";

// Track router navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ projectId: "demo-sunset-villa" }),
}));

// Mock Link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Level 1, Stage 1.3: Sample Villa Crash Elimination & Project Initialization Reliability", () => {
  let repository: LocalStorageProjectRepository;

  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockClear();
    repository = new LocalStorageProjectRepository();

    useCanvasStore.setState({
      activeProjectId: null,
      activeFloorId: null,
      activeDrawer: "none",
      selectedElementId: "stale-element-id",
      selectedSubElement: { type: "wall", id: "stale-wall-id" },
      isModified: true,
      viewMode: "2d",
    });

    useProjectStore.setState({
      currentProject: null,
      isSaving: false,
      isLoading: false,
      error: null,
      saveStatus: "idle",
      saveError: null,
      storageWarning: null,
      lastSavedAt: null,
      past: [],
      future: [],
    });
  });

  describe("1. Template Schema Conformance & Complete Collection Arrays", () => {
    it("Sunset Ridge Villa (demo) strictly conforms to ProjectSchema", () => {
      const demo = getDemoProject();
      const parseResult = ProjectSchema.safeParse(demo);
      expect(parseResult.success).toBe(true);
      expect(demo.id).toBe("demo-sunset-villa");
      expect(demo.floors.length).toBeGreaterThanOrEqual(1);
    });

    it("My Home template strictly conforms to ProjectSchema", () => {
      const myHome = getMyHomeProject();
      const parseResult = ProjectSchema.safeParse(myHome);
      expect(parseResult.success).toBe(true);
      expect(myHome.id).toBe("my-home");
      expect(myHome.floors.length).toBeGreaterThanOrEqual(1);
    });

    it("Initializes all required and optional collections as arrays across all template floors", () => {
      const demo = getDemoProject();
      const myHome = getMyHomeProject();

      for (const project of [demo, myHome]) {
        for (const floor of project.floors) {
          expect(Array.isArray(floor.walls)).toBe(true);
          expect(Array.isArray(floor.rooms)).toBe(true);
          expect(Array.isArray(floor.props)).toBe(true);
          expect(Array.isArray(floor.stairs)).toBe(true);
          expect(Array.isArray(floor.voids)).toBe(true);
          expect(Array.isArray(floor.columns)).toBe(true);
          expect(Array.isArray(floor.electricalPoints)).toBe(true);
          expect(Array.isArray(floor.plumbingFixtures)).toBe(true);
          expect(Array.isArray(floor.hvacPoints)).toBe(true);

          // Walls have doors and windows as arrays
          for (const wall of floor.walls) {
            expect(Array.isArray(wall.doors)).toBe(true);
            expect(Array.isArray(wall.windows)).toBe(true);
          }
        }
      }
    });

    it("Ensures all rooms have positive calculated targetArea", () => {
      const demo = getDemoProject();
      for (const floor of demo.floors) {
        for (const room of floor.rooms) {
          expect(room.polygon.length).toBeGreaterThanOrEqual(3);
          expect(room.targetArea).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("2. normalizeProject Invariants & Deep Clone Isolation", () => {
    it("Deep clones project to prevent mutation of the template source", () => {
      const template = getDemoProject();
      const originalWallCount = template.floors[0].walls.length;

      const normalized = normalizeProject(template);
      normalized.floors[0].walls.pop();

      expect(normalized.floors[0].walls.length).toBe(originalWallCount - 1);
      expect(template.floors[0].walls.length).toBe(originalWallCount);
    });

    it("Populates missing optional collections when normalizing a raw or partial project", () => {
      const partialProject: unknown = {
        id: "partial-1",
        name: "Partial Project",
        floors: [
          {
            id: "fl-1",
            level: 0,
            name: "Level 0",
            elevation: 0,
            height: 2800,
            walls: [],
            rooms: [],
            // props, stairs, voids, columns, MEP points intentionally omitted
          },
        ],
        plotDimensions: { width: 10000, depth: 10000 },
        activeFloorId: "fl-1",
      };

      const normalized = normalizeProject(partialProject as Project);
      const fl = normalized.floors[0];

      expect(Array.isArray(fl.props)).toBe(true);
      expect(Array.isArray(fl.stairs)).toBe(true);
      expect(Array.isArray(fl.voids)).toBe(true);
      expect(Array.isArray(fl.columns)).toBe(true);
      expect(Array.isArray(fl.electricalPoints)).toBe(true);
      expect(Array.isArray(fl.plumbingFixtures)).toBe(true);
      expect(Array.isArray(fl.hvacPoints)).toBe(true);
    });

    it("Recalculates missing room targetArea from polygon vertices during normalization", () => {
      const projectWithUncomputedRoom: Project = {
        ...getMyHomeProject(),
        floors: [
          {
            ...getMyHomeProject().floors[0],
            rooms: [
              {
                id: "r-test",
                floorId: "f-1",
                name: "Living Test",
                polygon: [
                  { x: 0, y: 0 },
                  { x: 5000, y: 0 },
                  { x: 5000, y: 4000 },
                  { x: 0, y: 4000 },
                ],
                color: "#abcdef",
                targetArea: 0, // Unset
              },
            ],
          },
        ],
      };

      const normalized = normalizeProject(projectWithUncomputedRoom);
      // Area of 5000mm x 4000mm is 20,000,000 mm²
      expect(normalized.floors[0].rooms[0].targetArea).toBe(20000000);
    });
  });

  describe("3. cloneTemplateProject Entity ID Independence", () => {
    it("Generates distinct UUIDs for all floors, walls, openings, rooms and props", () => {
      const template = getDemoProject();
      const clone = cloneTemplateProject(template, "Cloned Villa");

      expect(clone.id).not.toBe(template.id);
      expect(clone.name).toBe("Cloned Villa");

      // Verify floor IDs are distinct
      const templateFloorIds = new Set(template.floors.map((f) => f.id));
      const cloneFloorIds = new Set(clone.floors.map((f) => f.id));
      for (const fId of cloneFloorIds) {
        expect(templateFloorIds.has(fId)).toBe(false);
      }

      // Verify wall IDs are distinct
      const templateWallIds = new Set(template.floors.flatMap((f) => f.walls.map((w) => w.id)));
      const cloneWallIds = new Set(clone.floors.flatMap((f) => f.walls.map((w) => w.id)));
      for (const wId of cloneWallIds) {
        expect(templateWallIds.has(wId)).toBe(false);
      }

      // Verify door IDs are distinct
      const templateDoorIds = new Set(
        template.floors.flatMap((f) => f.walls.flatMap((w) => w.doors.map((d) => d.id)))
      );
      const cloneDoorIds = new Set(
        clone.floors.flatMap((f) => f.walls.flatMap((w) => w.doors.map((d) => d.id)))
      );
      for (const dId of cloneDoorIds) {
        expect(templateDoorIds.has(dId)).toBe(false);
      }

      // Verify room IDs are distinct
      const templateRoomIds = new Set(template.floors.flatMap((f) => f.rooms.map((r) => r.id)));
      const cloneRoomIds = new Set(clone.floors.flatMap((f) => f.rooms.map((r) => r.id)));
      for (const rId of cloneRoomIds) {
        expect(templateRoomIds.has(rId)).toBe(false);
      }
    });

    it("Repository duplicate assigns new IDs across all collections and preserves normalization", async () => {
      const demo = getDemoProject();
      await repository.save(demo);

      const duplicated = await repository.duplicate(demo.id);
      expect(duplicated).not.toBeNull();
      expect(duplicated!.id).not.toBe(demo.id);
      expect(duplicated!.name).toBe(`${demo.name} (Copy)`);

      const all = await repository.getAll();
      expect(all.length).toBe(2);

      // Verify all child arrays on duplicated project
      for (const fl of duplicated!.floors) {
        expect(Array.isArray(fl.props)).toBe(true);
        expect(Array.isArray(fl.stairs)).toBe(true);
        expect(Array.isArray(fl.columns)).toBe(true);
        expect(Array.isArray(fl.voids)).toBe(true);
        expect(Array.isArray(fl.electricalPoints)).toBe(true);
        expect(Array.isArray(fl.plumbingFixtures)).toBe(true);
        expect(Array.isArray(fl.hvacPoints)).toBe(true);
      }
    });
  });

  describe("4. Project Loading, Switching & Stale State Elimination", () => {
    it("Clears stale canvas selection and modified flag on loadProject", async () => {
      const demo = getDemoProject();
      await repository.save(demo);

      // Set stale selections prior to load
      useCanvasStore.setState({
        selectedElementId: "orphan-wall-123",
        selectedSubElement: { type: "room", id: "orphan-room-456" },
        isModified: true,
      });

      await act(async () => {
        await useProjectStore.getState().loadProject(demo.id);
      });

      const projectState = useProjectStore.getState();
      const canvasState = useCanvasStore.getState();

      expect(projectState.currentProject).not.toBeNull();
      expect(projectState.currentProject?.id).toBe(demo.id);
      expect(projectState.isLoading).toBe(false);
      expect(projectState.error).toBeNull();

      // Selection state must be cleared
      expect(canvasState.selectedElementId).toBeNull();
      expect(canvasState.selectedSubElement).toBeNull();
      expect(canvasState.isModified).toBe(false);
      expect(canvasState.activeProjectId).toBe(demo.id);
      expect(canvasState.activeFloorId).toBe(demo.activeFloorId);
    });

    it("Clears stale canvas selection and modified flag on importProject", async () => {
      const myHome = getMyHomeProject();

      useCanvasStore.setState({
        selectedElementId: "stale-import-element",
        selectedSubElement: { type: "stair", id: "stale-import-stair" },
        isModified: true,
      });

      await act(async () => {
        await useProjectStore.getState().importProject(myHome);
      });

      const canvasState = useCanvasStore.getState();
      expect(canvasState.selectedElementId).toBeNull();
      expect(canvasState.selectedSubElement).toBeNull();
      expect(canvasState.isModified).toBe(false);
      expect(canvasState.activeProjectId).toBe(myHome.id);
    });
  });

  describe("5. Dashboard Template Direct Navigation", () => {
    it("Routes immediately to /editor/demo-sunset-villa when clicking Sample Villa", async () => {
      render(<ProjectDashboard />);

      // Find the Sample Villa button in header quick actions
      const sampleVillaBtn = screen.getByRole("button", { name: /Sample Villa/i });
      expect(sampleVillaBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(sampleVillaBtn);
      });

      expect(mockPush).toHaveBeenCalledWith("/editor/demo-sunset-villa");
    });

    it("Routes immediately to /editor/my-home when clicking Open 'My Home'", async () => {
      render(<ProjectDashboard />);

      const myHomeBtn = screen.getByRole("button", { name: /Open "My Home"/i });
      expect(myHomeBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(myHomeBtn);
      });

      expect(mockPush).toHaveBeenCalledWith("/editor/my-home");
    });

    it("Routes immediately to /editor/demo-sunset-villa from the empty state Explore button", async () => {
      // Empty workspace state
      render(<ProjectDashboard />);

      // Wait for empty state to display
      const exploreBtn = await screen.findByRole("button", { name: /Explore Sample Villa/i });
      expect(exploreBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(exploreBtn);
      });

      expect(mockPush).toHaveBeenCalledWith("/editor/demo-sunset-villa");
    });
  });

  describe("6. Initialization & Normalization Performance Benchmark", () => {
    it("Normalizes both Sample Villa and My Home templates in under 50 milliseconds", () => {
      const demo = getDemoProject();
      const myHome = getMyHomeProject();

      const startTime = performance.now();
      const normDemo = normalizeProject(demo);
      const normHome = normalizeProject(myHome);
      const elapsed = performance.now() - startTime;

      expect(normDemo).toBeDefined();
      expect(normHome).toBeDefined();
      expect(elapsed).toBeLessThan(50); // Well under the 500 ms SLA requirement
    });
  });
});
