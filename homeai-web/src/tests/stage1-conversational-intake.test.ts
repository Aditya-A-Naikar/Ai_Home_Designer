import { describe, it, expect, beforeEach } from "vitest";
import {
  createDefaultProjectMemory,
  processConversationalIntakeTurn,
  instantiateProjectFromMemory,
  StructuredProjectMemory,
} from "@/core/ai/conversational-intake";
import { projectRepository } from "@/infrastructure/persistence/local-storage-project-repository";

describe("Stage 1 — AI Architectural Conversational Intake Engine", () => {
  beforeEach(async () => {
    // Clear in-memory repo
    const all = await projectRepository.getAll();
    for (const p of all) {
      await projectRepository.delete(p.id);
    }
  });

  it("initializes default architectural memory with valid starting attributes", () => {
    const memory = createDefaultProjectMemory();
    expect(memory.typology).toBe("duplex_vertical");
    expect(memory.floorsCount).toBe(2);
    expect(memory.bhkCount).toBe(3);
    expect(memory.bathroomsCount).toBe(3);
    expect(memory.isBriefComplete).toBe(false);
    expect(memory.missingFields.length).toBeGreaterThan(0);
  });

  it("extracts duplex typology, 3BHK programme, and Scandinavian style from natural language", () => {
    const initial = createDefaultProjectMemory();
    const result = processConversationalIntakeTurn(
      "I want to build a 3BHK modern duplex G+1 with Scandinavian hygge style",
      [],
      initial
    );

    expect(result.updatedMemory.typology).toBe("duplex_vertical");
    expect(result.updatedMemory.floorsCount).toBe(2);
    expect(result.updatedMemory.bhkCount).toBe(3);
    expect(result.updatedMemory.architecturalStyle).toBe("scandinavian");
    expect(result.updatedMemory.designPresetId).toBe("scandinavian");
    expect(result.reply).toBeDefined();
  });

  it("extracts luxury villa typology, 4BHK count, and Japandi Zen aesthetic", () => {
    const initial = createDefaultProjectMemory();
    const result = processConversationalIntakeTurn(
      "Designing a 4-bedroom luxury villa with private courtyard and Japandi zen aesthetics",
      [],
      initial
    );

    expect(result.updatedMemory.typology).toBe("villa");
    expect(result.updatedMemory.bhkCount).toBe(4);
    expect(result.updatedMemory.architecturalStyle).toBe("japandi");
    expect(result.updatedMemory.designPresetId).toBe("japandi");
    expect(result.updatedMemory.budgetTier).toBe("luxury");
  });

  it("extracts urban apartment typology, 2BHK, and North-East Vaastu orientation", () => {
    const initial = createDefaultProjectMemory();
    const result = processConversationalIntakeTurn(
      "2BHK urban apartment facing North-East with Vaastu compliance and home office",
      [],
      initial
    );

    expect(result.updatedMemory.typology).toBe("apartment");
    expect(result.updatedMemory.bhkCount).toBe(2);
    expect(result.updatedMemory.floorsCount).toBe(1);
    expect(result.updatedMemory.orientation).toBe("NE");
    expect(result.updatedMemory.vaastuCompliant).toBe(true);
    expect(result.updatedMemory.amenities).toContain("home_office");
  });

  it("prompts for missing bedrooms when user only provides vague typology", () => {
    const initial = createDefaultProjectMemory();
    const result = processConversationalIntakeTurn(
      "I want to build a modern house",
      [],
      initial
    );

    expect(result.updatedMemory.isBriefComplete).toBe(false);
    expect(result.reply.toLowerCase()).toContain("bedroom");
    expect(result.suggestedPrompts.length).toBeGreaterThan(0);
  });

  it("marks brief complete and outputs executive project brief on explicit confirmation", () => {
    const mem: StructuredProjectMemory = {
      ...createDefaultProjectMemory(),
      typology: "duplex_vertical",
      bhkCount: 3,
      architecturalStyle: "scandinavian",
      orientation: "N",
    };

    const history = [
      { role: "assistant" as const, content: "What are your requirements?" },
      { role: "user" as const, content: "3BHK duplex with Scandinavian hygge style" },
    ];

    const result = processConversationalIntakeTurn(
      "Everything looks great, confirm and launch CAD!",
      history,
      mem
    );

    expect(result.isReadyForLaunch).toBe(true);
    expect(result.updatedMemory.isBriefComplete).toBe(true);
    expect(result.reply).toContain("Architectural Project Brief");
    expect(result.reply).toContain("Scandinavian Hygge");
    expect(result.reply).toContain("G+1 Vertical Duplex");
  });

  it("instantiates and persists duplex project with G+1 pre-seeded layouts and design presets", async () => {
    const mem: StructuredProjectMemory = {
      ...createDefaultProjectMemory(),
      projectName: "Nordic Haven Duplex",
      typology: "duplex_vertical",
      floorsCount: 2,
      bhkCount: 3,
      bathroomsCount: 3,
      architecturalStyle: "scandinavian",
      designPresetId: "scandinavian",
      orientation: "N",
      vaastuCompliant: true,
      amenities: ["double_height", "puja_room", "home_office"],
      isBriefComplete: true,
    };

    const project = await instantiateProjectFromMemory(mem);

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Nordic Haven Duplex");
    expect(project.floors.length).toBe(2);
    expect(project.activeDesignPreset).toBe("scandinavian");
    expect(project.aiBrief).toBeDefined();
    expect(project.aiBrief?.targetTypology).toBe("duplex_vertical");
    expect(project.aiBrief?.architecturalStyle).toBe("scandinavian");

    // Ground Floor checks
    const gf = project.floors[0];
    expect(gf.walls.length).toBeGreaterThan(5);
    expect(gf.rooms.length).toBeGreaterThan(0);
    expect(gf.stairs?.length).toBeGreaterThan(0);
    expect(gf.columns?.length).toBeGreaterThan(0);

    // First Floor checks
    const ff = project.floors[1];
    expect(ff.walls.length).toBeGreaterThan(5);
    expect(ff.rooms.length).toBeGreaterThan(0);

    // Preset verification: walls should have white_plaster finish, rooms teak_hardwood
    expect(gf.walls[0].finishId).toBe("white_plaster");
    expect(gf.rooms[0].floorFinishId).toBe("teak_hardwood");

    // Persistence check
    const saved = await projectRepository.getById(project.id);
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe("Nordic Haven Duplex");
  });

  it("instantiates single-level 2BHK project with verified walls and props", async () => {
    const mem: StructuredProjectMemory = {
      ...createDefaultProjectMemory(),
      projectName: "Compact Zen 2BHK",
      typology: "apartment",
      floorsCount: 1,
      bhkCount: 2,
      bathroomsCount: 2,
      architecturalStyle: "japandi",
      designPresetId: "japandi",
      orientation: "E",
      vaastuCompliant: false,
      amenities: ["balcony_sitout"],
      isBriefComplete: true,
    };

    const project = await instantiateProjectFromMemory(mem);

    expect(project.floors.length).toBe(1);
    expect(project.activeDesignPreset).toBe("japandi");
    const floor = project.floors[0];
    expect(floor.walls.length).toBeGreaterThan(4);
    expect(floor.rooms.length).toBeGreaterThan(0);
    expect(floor.props?.length).toBeGreaterThan(0);

    // Preset verification
    expect(floor.walls[0].finishId).toBe("warm_greige");
    expect(floor.rooms[0].floorFinishId).toBe("teak_hardwood");
  });
});
