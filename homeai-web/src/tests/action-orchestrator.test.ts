import { describe, it, expect } from "vitest";
import { orchestrateDesignAction, SOFA_COLOR_SWATCHES, CARPET_COLOR_SWATCHES } from "../core/ai/action-orchestrator";
import { Project } from "../core/domain/types";

describe("AI Architectural Action Orchestrator", () => {
  const mockProject: Project = {
    schemaVersion: 1,
    id: "proj-test-123",
    name: "Modern Test Villa",
    plotDimensions: { width: 10000, depth: 10000 },
    settings: {
      unitSystem: "metric",
      preferredUnit: "m",
      gridSize: 100,
      snapTolerance: 10,
      defaultWallThickness: 200,
      defaultCeilingHeight: 2800,
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
    activeFloorId: "floor-1",
    floors: [
      {
        id: "floor-1",
        name: "Ground Floor",
        projectId: "proj-test-123",
        level: 0,
        elevation: 0,
        height: 2800,
        walls: [
          {
            id: "wall-north",
            floorId: "floor-1",
            start: { x: 0, y: 0 },
            end: { x: 5000, y: 0 },
            thickness: 200,
            doors: [],
            windows: [
              {
                id: "win-1",
                floorId: "floor-1",
                wallId: "wall-north",
                offset: 2500,
                width: 1800,
                height: 1500,
                sillHeight: 900,
              },
            ],
          },
        ],
        rooms: [
          {
            id: "room-living-1",
            name: "Living Room",
            floorId: "floor-1",
            polygon: [
              { x: 0, y: 0 },
              { x: 5000, y: 0 },
              { x: 5000, y: 4000 },
              { x: 0, y: 4000 },
            ],
            color: "#f8fafc",
            targetArea: 20000000,
          },
        ],
        props: [
          {
            id: "prop-sofa-1",
            floorId: "floor-1",
            name: "Three-Seater Sofa",
            category: "living",
            propType: "sofa",
            roomId: "room-living-1",
            position: { x: 2000, y: 2000 },
            rotation: 0,
            color: "#64748b",
            finishMaterial: "fabric",
            dimensions: { width: 2200, depth: 950, height: 850 },
          },
        ],
      },
    ],
  };

  it("orchestrates micro-edit intent: green sofa and matching carpet with Before/After diff", () => {
    const proposal = orchestrateDesignAction(
      "Make this sofa dark green and move it closer to the window. Also add a matching carpet",
      mockProject,
      { type: "prop", id: "prop-sofa-1" }
    );

    expect(proposal).not.toBeNull();
    if (!proposal) return;

    // Verify transaction metadata
    expect(proposal.transactionId).toBeTruthy();
    expect(proposal.rollbackToken).toBeTruthy();
    expect(proposal.userPrompt).toContain("dark green");
    expect(proposal.explanation).toContain("Three-Seater Sofa");

    // Verify Before/After preview
    expect(proposal.diffPreview.before.color).toBe("#64748b");
    expect(proposal.diffPreview.after.color).toBe("#166534"); // Emerald / dark green
    expect(proposal.diffPreview.after.position.y).toBeLessThan(proposal.diffPreview.before.position.y); // Closer to north window

    // Verify Neufert clearance checks
    expect(proposal.diffPreview.clearanceChecks.length).toBeGreaterThanOrEqual(2);
    expect(proposal.diffPreview.clearanceChecks.every(c => c.status === "pass")).toBe(true);

    // Verify swatches
    expect(proposal.swatchGroups.length).toBeGreaterThanOrEqual(2);
    expect(proposal.swatchGroups[0].title).toContain("Sofa");
    expect(proposal.swatchGroups[1].title).toContain("Carpet");

    // Verify actions generated for targeted object vs whole room
    expect(proposal.actionsTargetObject.length).toBeGreaterThanOrEqual(1);
    expect(proposal.actionsWholeRoom.length).toBeGreaterThanOrEqual(2); // updates sofa AND adds carpet
  });

  it("provides predefined coordinated swatch options for designer styling", () => {
    expect(SOFA_COLOR_SWATCHES.length).toBeGreaterThanOrEqual(4);
    expect(CARPET_COLOR_SWATCHES.length).toBeGreaterThanOrEqual(4);
    expect(SOFA_COLOR_SWATCHES.some(s => s.hex === "#166534")).toBe(true);
  });
});
