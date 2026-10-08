import { describe, it, expect } from "vitest";
import { synthesizePhotorealisticPrompt } from "@/core/ai/photorealism-engine";
import { Project } from "@/core/domain/types";

describe("Phase 16: Advanced AI Generation & Photorealism Engine", () => {
  const sampleProject: Project = {
    schemaVersion: 1,
    id: "prj-render-test",
    name: "Aura Residence",
    plotDimensions: { width: 14000, depth: 12000 },
    settings: {
      unitSystem: "metric",
      preferredUnit: "m",
      gridSize: 100,
      snapTolerance: 10,
      defaultWallThickness: 200,
      defaultCeilingHeight: 3000,
    },
    preferences: {
      style: "modern",
      priorities: ["light"],
      constraints: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activeFloorId: "fl-1",
    floors: [],
  };

  it("synthesizes high-end architectural prompts with lighting and materials", () => {
    const promptPkg = synthesizePhotorealisticPrompt(sampleProject, {
      aesthetic: "architectural_digest",
      lighting: "golden_hour",
      roomName: "Grand Double-Height Living Room",
      floorFinish: "italian_marble",
      wallFinish: "white_plaster",
      focalLengthMm: 35,
      twoPointPerspective: true,
    });

    expect(promptPkg.positivePrompt).toContain("Architectural Digest feature");
    expect(promptPkg.positivePrompt).toContain("grand double-height living room");
    expect(promptPkg.positivePrompt).toContain("italian marble");
    expect(promptPkg.positivePrompt).toContain("golden sunlight");
    expect(promptPkg.positivePrompt).toContain("35mm");
    expect(promptPkg.negativePrompt).toContain("blurry");
    expect(promptPkg.cameraSettings.lens).toContain("35mm");
  });

  it("includes two-point tilt-shift perspective for vertical wall alignment", () => {
    const promptPkg = synthesizePhotorealisticPrompt(sampleProject, {
      aesthetic: "japandi_serenity",
      lighting: "crisp_noon",
      roomName: "Primary Suite",
      floorFinish: "teak_hardwood",
      wallFinish: "warm_greige",
      focalLengthMm: 24,
      twoPointPerspective: true,
    });

    expect(promptPkg.positivePrompt).toContain("Strict two-point architectural perspective");
    expect(promptPkg.cameraSettings.perspective).toContain("2-Point Tilt-Shift");
  });
});
