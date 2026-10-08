import { describe, it, expect, beforeEach } from "vitest";
import {
  toMillimeters,
  fromMillimeters,
  formatDimension,
  formatArea,
} from "@/core/units/converter";
import { createProject } from "@/core/domain/project-factory";
import { ProjectSchema } from "@/core/domain/schema";
import { getDemoProject } from "@/core/domain/demo-project";
import { LocalStorageProjectRepository } from "@/infrastructure/persistence/local-storage-project-repository";

// =====================================================
// PHASE 2 — Unit & Integration Test Suite
// =====================================================

describe("Unit Converter", () => {
  it("converts meters to millimeters accurately", () => {
    expect(toMillimeters(10, "m")).toBe(10_000);
    expect(fromMillimeters(10_000, "m")).toBe(10);
  });

  it("converts feet and inches to millimeters accurately", () => {
    expect(toMillimeters(1, "ft")).toBe(304.8);
    expect(toMillimeters(1, "in")).toBe(25.4);
  });

  it("formats dimensions with correct units", () => {
    expect(formatDimension(5000, "m")).toBe("5 m");
    expect(formatDimension(3048, "ft")).toBe("10' 0\"");
  });

  it("formats area in metric and imperial correctly", () => {
    // 100 sq meters = 100,000,000 sq mm
    expect(formatArea(100_000_000, "metric")).toBe("100 m²");
    // approx 1076 sq ft
    expect(formatArea(100_000_000, "imperial")).toContain("sq ft");
  });
});

describe("Project Factory & Schemas", () => {
  it("creates a valid Project instance that passes ProjectSchema validation", () => {
    const project = createProject({
      name: "Cedar House",
      plotWidthMm: 12000,
      plotDepthMm: 10000,
      preferredUnit: "m",
      unitSystem: "metric",
      floorsCount: 2,
      style: "modern",
      priorities: ["natural light"],
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Cedar House");
    expect(project.floors.length).toBe(2);
    expect(project.floors[0].name).toBe("Ground Floor");
    expect(project.floors[1].name).toBe("First Floor");
    expect(project.activeFloorId).toBe(project.floors[0].id);

    // Schema validation assertion
    const validated = ProjectSchema.safeParse(project);
    expect(validated.success).toBe(true);
  });

  it("produces a valid canonical demo project", () => {
    const demo = getDemoProject();
    const validated = ProjectSchema.safeParse(demo);
    expect(validated.success).toBe(true);
    expect(demo.floors[0].walls.length).toBeGreaterThan(0);
    expect(demo.floors[0].rooms.length).toBeGreaterThan(0);
  });
});

describe("LocalStorageProjectRepository", () => {
  let repo: LocalStorageProjectRepository;

  beforeEach(() => {
    window.localStorage.clear();
    repo = new LocalStorageProjectRepository();
  });

  it("saves and retrieves a project by ID", async () => {
    const project = createProject({
      name: "Pine Cottage",
      plotWidthMm: 14000,
      plotDepthMm: 8000,
      preferredUnit: "m",
      unitSystem: "metric",
      floorsCount: 1,
      style: "minimalist",
      priorities: [],
    });

    await repo.save(project);
    const retrieved = await repo.getById(project.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Pine Cottage");
  });

  it("duplicates a project with new IDs and updated title", async () => {
    const project = createProject({
      name: "Lakeside Villa",
      plotWidthMm: 20000,
      plotDepthMm: 15000,
      preferredUnit: "m",
      unitSystem: "metric",
      floorsCount: 1,
      style: "modern",
      priorities: [],
    });

    await repo.save(project);
    const copy = await repo.duplicate(project.id);

    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe(project.id);
    expect(copy?.name).toBe("Lakeside Villa (Copy)");
    expect(copy?.floors[0].id).not.toBe(project.floors[0].id);

    const all = await repo.getAll();
    expect(all.length).toBe(2);
  });

  it("deletes a project successfully", async () => {
    const project = createProject({
      name: "Temporary Project",
      plotWidthMm: 10000,
      plotDepthMm: 10000,
      preferredUnit: "m",
      unitSystem: "metric",
      floorsCount: 1,
      style: "modern",
      priorities: [],
    });

    await repo.save(project);
    expect((await repo.getAll()).length).toBe(1);

    await repo.delete(project.id);
    expect((await repo.getAll()).length).toBe(0);
    expect(await repo.getById(project.id)).toBeNull();
  });

  it("filters out corrupted entries without crashing", async () => {
    // Store valid project
    const valid = createProject({
      name: "Valid Project",
      plotWidthMm: 10000,
      plotDepthMm: 10000,
      preferredUnit: "m",
      unitSystem: "metric",
      floorsCount: 1,
      style: "modern",
      priorities: [],
    });
    // Write corrupt item alongside valid project
    window.localStorage.setItem(
      "homeai_projects_v1",
      JSON.stringify([valid, { corrupt: true, id: 123 }])
    );

    const all = await repo.getAll();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe("Valid Project");
  });
});
