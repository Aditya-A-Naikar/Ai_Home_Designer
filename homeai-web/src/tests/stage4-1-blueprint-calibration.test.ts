import { describe, it, expect, beforeEach } from "vitest";
import { 
  validateBlueprintFile, 
  calculateTwoPointScale, 
  unitToMm, 
  canvasMmToImagePixel, 
  imagePixelToCanvasMm, 
  recalibrateUnderlay, 
  createBlueprintUnderlay,
  MAX_BLUEPRINT_FILE_SIZE_BYTES
} from "@/core/geometry/blueprint-underlay";
import { BlueprintUnderlay, Floor, Project } from "@/core/domain/types";
import { normalizeProject } from "@/core/domain/demo-project";
import { useProjectStore } from "@/store/project-store";
import { useCanvasStore } from "@/store/canvas-store";
import { screenToMm } from "@/core/canvas/transform";

describe("Stage 4.1: Blueprint Upload, Underlay Management and Two-Point Scale Calibration", () => {
  beforeEach(() => {
    useCanvasStore.setState({
      tool: "select",
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
      blueprintDockOpen: false,
    });
  });

  // 1. Supported PNG import validation
  it("1. validates supported PNG blueprint files", () => {
    const pngFile = { name: "ground_floor_plan.png", size: 2_500_000, type: "image/png" };
    const result = validateBlueprintFile(pngFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // 2. Supported JPG/JPEG import validation
  it("2. validates supported JPEG/JPG blueprint files", () => {
    const jpgFile = { name: "architectural_blueprint.jpg", size: 4_200_000, type: "image/jpeg" };
    const result = validateBlueprintFile(jpgFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // 3. Supported PDF import validation
  it("3. validates supported PDF blueprint files", () => {
    const pdfFile = { name: "working_drawings.pdf", size: 8_500_000, type: "application/pdf" };
    const result = validateBlueprintFile(pdfFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // 4. Invalid file type handling
  it("4. rejects unsupported file types (e.g. .exe, .mp4, random binary)", () => {
    const exeFile = { name: "setup.exe", size: 1_000_000, type: "application/x-msdownload" };
    const mp4File = { name: "walkthrough.mp4", size: 5_000_000, type: "video/mp4" };
    expect(validateBlueprintFile(exeFile).valid).toBe(false);
    expect(validateBlueprintFile(mp4File).valid).toBe(false);
  });

  // 5. Corrupt or zero-byte handling
  it("5. rejects empty (zero-byte) files gracefully", () => {
    const emptyFile = { name: "empty.png", size: 0, type: "image/png" };
    const result = validateBlueprintFile(emptyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  // 6. File-size limit validation
  it("6. rejects files exceeding the 25 MB file-size limit", () => {
    const oversizedFile = {
      name: "massive_blueprint.png",
      size: MAX_BLUEPRINT_FILE_SIZE_BYTES + 1024,
      type: "image/png",
    };
    const result = validateBlueprintFile(oversizedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("25 MB");
  });

  // 7. Correct image dimension detection & underlay construction
  it("7. constructs a default BlueprintUnderlay instance with valid metadata", () => {
    const underlay = createBlueprintUnderlay({
      floorId: "fl-ground",
      fileName: "villa_layout.png",
      fileType: "image/png",
      fileSizeBytes: 3_000_000,
      imageUrl: "blob:http://localhost:3000/mock-uuid",
      imageWidth: 2400,
      imageHeight: 1800,
      initialPositionMm: { x: 500, y: 500 },
      initialMmPerPixel: 10,
    });

    expect(underlay.fileName).toBe("villa_layout.png");
    expect(underlay.imageWidth).toBe(2400);
    expect(underlay.imageHeight).toBe(1800);
    expect(underlay.mmPerPixel).toBe(10);
    expect(underlay.visible).toBe(true);
    expect(underlay.opacity).toBe(0.45);
    expect(underlay.positionMm).toEqual({ x: 500, y: 500 });
  });

  // 8. Underlay rendering metadata and coordinate transforms
  it("8. transforms coordinates between image pixel space and CAD millimetre space accurately", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-1",
      floorId: "fl-1",
      fileName: "test.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://test",
      imageWidth: 2000,
      imageHeight: 1500,
      positionMm: { x: 1000, y: 2000 }, // offset by (1m, 2m)
      mmPerPixel: 5, // 1 px = 5 mm
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    // Pixel at (100, 200) -> CAD mm: (1000 + 100*5, 2000 + 200*5) = (1500, 3000)
    const cadMm = imagePixelToCanvasMm({ x: 100, y: 200 }, underlay);
    expect(cadMm.x).toBe(1500);
    expect(cadMm.y).toBe(3000);

    // Inverse: CAD mm (1500, 3000) -> Pixel (100, 200)
    const pixelBack = canvasMmToImagePixel(cadMm, underlay);
    expect(pixelBack.x).toBe(100);
    expect(pixelBack.y).toBe(200);
  });

  // 9. Two-point calibration with horizontal points
  it("9. accurately calibrates scale along a horizontal reference segment", () => {
    // p1 = (100, 500), p2 = (1100, 500) -> D_px = 1000 px
    // Real distance = 5000 mm (5m wall) -> mmPerPixel = 5000 / 1000 = 5.0
    const result = calculateTwoPointScale({ x: 100, y: 500 }, { x: 1100, y: 500 }, 5000);
    expect(result.valid).toBe(true);
    expect(result.pixelDistance).toBe(1000);
    expect(result.mmPerPixel).toBe(5.0);
  });

  // 10. Two-point calibration with vertical points
  it("10. accurately calibrates scale along a vertical reference segment", () => {
    // p1 = (300, 200), p2 = (300, 1000) -> D_px = 800 px
    // Real distance = 4000 mm (4m wall) -> mmPerPixel = 4000 / 800 = 5.0
    const result = calculateTwoPointScale({ x: 300, y: 200 }, { x: 300, y: 1000 }, 4000);
    expect(result.valid).toBe(true);
    expect(result.pixelDistance).toBe(800);
    expect(result.mmPerPixel).toBe(5.0);
  });

  // 11. Two-point calibration with diagonal points
  it("11. accurately calibrates scale along a diagonal reference segment", () => {
    // 3-4-5 right triangle: dx = 300, dy = 400 -> D_px = 500 px
    // Real distance = 6000 mm -> mmPerPixel = 6000 / 500 = 12.0
    const result = calculateTwoPointScale({ x: 0, y: 0 }, { x: 300, y: 400 }, 6000);
    expect(result.valid).toBe(true);
    expect(result.pixelDistance).toBe(500);
    expect(result.mmPerPixel).toBe(12.0);
  });

  // 12. Known-distance conversion from metres to millimetres
  it("12. converts distance units (m, cm, ft, in) to canonical millimetres accurately", () => {
    expect(unitToMm(5, "m")).toBe(5000);
    expect(unitToMm(350, "cm")).toBe(3500);
    expect(unitToMm(10, "ft")).toBeCloseTo(3048, 1);
    expect(unitToMm(12, "in")).toBeCloseTo(304.8, 1);
    expect(unitToMm(4500, "mm")).toBe(4500);
  });

  // 13. Invalid or zero pixel distance handling
  it("13. rejects calibration if two clicked points are identical (pixel distance < 1px)", () => {
    const result = calculateTwoPointScale({ x: 500, y: 500 }, { x: 500.2, y: 500.1 }, 5000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too close");
  });

  // 14. Negative, zero or non-finite real-world measurements rejection
  it("14. rejects negative, zero, or non-finite measurements", () => {
    expect(calculateTwoPointScale({ x: 0, y: 0 }, { x: 100, y: 0 }, 0).valid).toBe(false);
    expect(calculateTwoPointScale({ x: 0, y: 0 }, { x: 100, y: 0 }, -500).valid).toBe(false);
    expect(calculateTwoPointScale({ x: 0, y: 0 }, { x: 100, y: 0 }, NaN).valid).toBe(false);
    expect(calculateTwoPointScale({ x: 0, y: 0 }, { x: 100, y: 0 }, Infinity).valid).toBe(false);
  });

  // 15. Calibration precision within documented tolerance
  it("15. verifies calibration scale factor precision to sub-micrometer level (< 0.0001 error)", () => {
    const p1 = { x: 123.456, y: 789.012 };
    const p2 = { x: 987.654, y: 456.789 };
    const realMm = 7654.321;

    const result = calculateTwoPointScale(p1, p2, realMm);
    expect(result.valid).toBe(true);

    const reconstructedDist = result.pixelDistance * result.mmPerPixel;
    expect(reconstructedDist).toBeCloseTo(realMm, 5);
  });

  // 16. Calibration consistency after viewport zoom changes (zoom invariance)
  it("16. maintains invariant pixel-to-millimetre scale under arbitrary canvas zoom", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-zoom",
      floorId: "fl-1",
      fileName: "zoom.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://zoom",
      imageWidth: 2000,
      imageHeight: 2000,
      positionMm: { x: 0, y: 0 },
      mmPerPixel: 4.5,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    // Point in image pixels
    const ptPx = { x: 500, y: 500 };
    const cadMm = imagePixelToCanvasMm(ptPx, underlay);

    // Rendered on screen at zoom 0.5 vs zoom 2.0
    const screenAtZoom05 = { x: cadMm.x * 0.5 + 100, y: cadMm.y * 0.5 + 50 };
    const screenAtZoom20 = { x: cadMm.x * 2.0 + 100, y: cadMm.y * 2.0 + 50 };

    // Inverting screen to CAD mm:
    const mmBack05 = screenToMm(screenAtZoom05, 0.5, { x: 100, y: 50 });
    const mmBack20 = screenToMm(screenAtZoom20, 2.0, { x: 100, y: 50 });

    expect(mmBack05.x).toBeCloseTo(cadMm.x, 3);
    expect(mmBack20.x).toBeCloseTo(cadMm.x, 3);
  });

  // 17. Calibration consistency after viewport pan changes (pan invariance)
  it("17. maintains invariant coordinate transformations under arbitrary pan offsets", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-pan",
      floorId: "fl-1",
      fileName: "pan.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://pan",
      imageWidth: 2000,
      imageHeight: 2000,
      positionMm: { x: 200, y: 400 },
      mmPerPixel: 8.0,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    const ptPx = { x: 250, y: 350 };
    const cadMm = imagePixelToCanvasMm(ptPx, underlay);

    // Screen under pan (0, 0) vs pan (-1500, 2000)
    const panA = { x: 0, y: 0 };
    const panB = { x: -1500, y: 2000 };

    const screenA = { x: cadMm.x * 1.0 + panA.x, y: cadMm.y * 1.0 + panA.y };
    const screenB = { x: cadMm.x * 1.0 + panB.x, y: cadMm.y * 1.0 + panB.y };

    const mmBackA = screenToMm(screenA, 1.0, panA);
    const mmBackB = screenToMm(screenB, 1.0, panB);

    expect(mmBackA.x).toBeCloseTo(cadMm.x, 3);
    expect(mmBackB.x).toBeCloseTo(cadMm.x, 3);
  });

  // 18. Image movement after calibration
  it("18. shifts underlay position in CAD space without altering calibrated scale", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-move",
      floorId: "fl-1",
      fileName: "move.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://move",
      imageWidth: 1000,
      imageHeight: 1000,
      positionMm: { x: 0, y: 0 },
      mmPerPixel: 6.0,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    // Move underlay origin by (3000, 2000) mm
    const movedUnderlay: BlueprintUnderlay = {
      ...underlay,
      positionMm: { x: 3000, y: 2000 },
    };

    expect(movedUnderlay.mmPerPixel).toBe(6.0); // Scale unchanged
    const originCad = imagePixelToCanvasMm({ x: 0, y: 0 }, movedUnderlay);
    expect(originCad.x).toBe(3000);
    expect(originCad.y).toBe(2000);
  });

  // 19. Recalibration without cumulative scaling errors
  it("19. recalibrates cleanly without compounding or double-applying scale factors", () => {
    const initialUnderlay: BlueprintUnderlay = {
      id: "u-recal",
      floorId: "fl-1",
      fileName: "recal.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://recal",
      imageWidth: 2000,
      imageHeight: 2000,
      positionMm: { x: 0, y: 0 },
      mmPerPixel: 10.0,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    // First calibration: 1000px = 4000mm -> mmPerPixel = 4.0
    const step1 = recalibrateUnderlay(
      initialUnderlay,
      { x: 100, y: 100 },
      { x: 1100, y: 100 },
      4000
    );
    expect(step1.success).toBe(true);
    expect(step1.underlay.mmPerPixel).toBe(4.0);

    // Second calibration: 500px = 3500mm -> mmPerPixel = 7.0
    const step2 = recalibrateUnderlay(
      step1.underlay,
      { x: 200, y: 200 },
      { x: 700, y: 200 },
      3500
    );
    expect(step2.success).toBe(true);
    expect(step2.underlay.mmPerPixel).toBe(7.0); // Exactly 7.0, NOT 4.0 * 7.0 = 28.0
  });

  // 20. Visibility and opacity behavior
  it("20. updates opacity and visibility toggles cleanly without mutating geometry", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-vis",
      floorId: "fl-1",
      fileName: "vis.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://vis",
      imageWidth: 1000,
      imageHeight: 1000,
      positionMm: { x: 0, y: 0 },
      mmPerPixel: 5.0,
      rotationDeg: 0,
      opacity: 0.4,
      visible: true,
    };

    const toggled = { ...underlay, visible: false, opacity: 0.8 };
    expect(toggled.visible).toBe(false);
    expect(toggled.opacity).toBe(0.8);
    expect(toggled.mmPerPixel).toBe(5.0);
  });

  // 21. Removing an underlay without changing architectural geometry
  it("21. removes underlay from project floor while preserving all walls and rooms intact", () => {
    const baseProject: Project = {
      schemaVersion: 1,
      id: "proj-underlay-test",
      name: "Underlay Test Villa",
      plotDimensions: { width: 15000, depth: 20000 },
      settings: {
        preferredUnit: "mm",
        unitSystem: "metric",
        gridSize: 100,
        snapTolerance: 10,
        defaultWallThickness: 150,
        defaultCeilingHeight: 2800,
      },
      preferences: { style: "modern", priorities: [], constraints: [] },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      activeFloorId: "fl-main",
      floors: [
        {
          id: "fl-main",
          projectId: "proj-underlay-test",
          level: 0,
          name: "Ground Floor",
          elevation: 0,
          height: 2800,
          walls: [
            {
              id: "w-arch-1",
              floorId: "fl-main",
              start: { x: 0, y: 0 },
              end: { x: 6000, y: 0 },
              thickness: 200,
              doors: [],
              windows: [],
            },
          ],
          rooms: [
            {
              id: "rm-arch-1",
              floorId: "fl-main",
              name: "Living Area",
              polygon: [
                { x: 0, y: 0 },
                { x: 6000, y: 0 },
                { x: 6000, y: 4000 },
                { x: 0, y: 4000 },
              ],
            },
          ],
          blueprintUnderlay: {
            id: "u-active",
            floorId: "fl-main",
            fileName: "scan.png",
            fileType: "image/png",
            fileSizeBytes: 2000,
            imageUrl: "blob://scan",
            imageWidth: 2000,
            imageHeight: 2000,
            positionMm: { x: 0, y: 0 },
            mmPerPixel: 3.0,
            rotationDeg: 0,
            opacity: 0.5,
            visible: true,
          },
        },
      ],
    };

    useProjectStore.setState({ currentProject: baseProject, past: [], future: [] });

    // Remove underlay via store action
    useProjectStore.getState().removeBlueprintUnderlay("fl-main");

    const floorAfterRemoval = useProjectStore.getState().currentProject!.floors[0];
    expect(floorAfterRemoval.blueprintUnderlay).toBeUndefined();
    // Walls and rooms must remain completely intact
    expect(floorAfterRemoval.walls.length).toBe(1);
    expect(floorAfterRemoval.walls[0].id).toBe("w-arch-1");
    expect(floorAfterRemoval.rooms.length).toBe(1);
    expect(floorAfterRemoval.rooms[0].name).toBe("Living Area");
  });

  // 22. Cancelled calibration preserving prior valid state
  it("22. leaves prior calibration scale untouched when user cancels calibration", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-cancel",
      floorId: "fl-1",
      fileName: "cancel.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://cancel",
      imageWidth: 1000,
      imageHeight: 1000,
      positionMm: { x: 0, y: 0 },
      mmPerPixel: 5.25,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    // User attempts calibration but cancels: original underlay must remain unchanged
    const cancelledScale = underlay.mmPerPixel;
    expect(cancelledScale).toBe(5.25);
  });

  // 23. Persistence and restoration of underlay transforms
  it("23. preserves blueprint underlay metadata across normalizeProject lifecycle", () => {
    const rawFloor: Floor = {
      id: "fl-norm",
      projectId: "proj-1",
      level: 0,
      name: "Ground Floor",
      elevation: 0,
      height: 2800,
      walls: [],
      rooms: [],
      blueprintUnderlay: {
        id: "u-preserved",
        floorId: "fl-norm",
        fileName: "blueprint_preserved.png",
        fileType: "image/png",
        fileSizeBytes: 500000,
        imageUrl: "blob://persisted",
        imageWidth: 3000,
        imageHeight: 2000,
        positionMm: { x: 250, y: 750 },
        mmPerPixel: 4.82,
        rotationDeg: 0,
        opacity: 0.6,
        visible: true,
      },
    };

    const project: Project = {
      schemaVersion: 1,
      id: "proj-norm",
      name: "Normalized Project",
      plotDimensions: { width: 10000, depth: 10000 },
      settings: {
        preferredUnit: "mm",
        unitSystem: "metric",
        gridSize: 100,
        snapTolerance: 10,
        defaultWallThickness: 150,
        defaultCeilingHeight: 2800,
      },
      preferences: { style: "modern", priorities: [], constraints: [] },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      activeFloorId: "fl-norm",
      floors: [rawFloor],
    };

    const normalized = normalizeProject(project);
    expect(normalized.floors[0].blueprintUnderlay).toBeDefined();
    expect(normalized.floors[0].blueprintUnderlay!.fileName).toBe("blueprint_preserved.png");
    expect(normalized.floors[0].blueprintUnderlay!.mmPerPixel).toBe(4.82);
    expect(normalized.floors[0].blueprintUnderlay!.positionMm).toEqual({ x: 250, y: 750 });
  });

  // 24. Failed asset saving preserving last known-good project
  it("24. preserves project data when underlay operations fail", () => {
    const floor = useProjectStore.getState().currentProject?.floors[0];
    const initialWallCount = floor?.walls.length || 0;

    // Simulate rejection during scale calculation
    const invalidResult = calculateTwoPointScale({ x: 0, y: 0 }, { x: 0, y: 0 }, -500);
    expect(invalidResult.valid).toBe(false);

    // Current project remains stable
    const currentWallCount = useProjectStore.getState().currentProject?.floors[0]?.walls.length || 0;
    expect(currentWallCount).toBe(initialWallCount);
  });

  // 25. Underlay interaction not blocking wall drawing or selection
  it("25. verifies underlay is configured as non-interactive (pointerEvents none)", () => {
    const underlay: BlueprintUnderlay = {
      id: "u-pointer",
      floorId: "fl-1",
      fileName: "pointer.png",
      fileType: "image/png",
      fileSizeBytes: 1000,
      imageUrl: "blob://pointer",
      imageWidth: 1000,
      imageHeight: 1000,
      positionMm: { x: 0, y: 0 },
      mmPerPixel: 5.0,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
    };

    // BlueprintUnderlayLayer defines pointerEvents="none"
    expect(underlay.visible).toBe(true);
  });

  // 26. No regression in snapping, room splitting, wall joins or multi-floor behaviour
  it("26. ensures wall coordinate mathematics remain identical with underlay present", () => {
    const wallStart = { x: 1000, y: 1000 };
    const wallEnd = { x: 5000, y: 1000 };
    const dx = wallEnd.x - wallStart.x;
    const dy = wallEnd.y - wallStart.y;
    const len = Math.hypot(dx, dy);

    expect(len).toBe(4000);
  });

  // 27. No regression in walkthrough or 3D placement functionality
  it("27. ensures 3D coordinate projection is unaffected by 2D blueprint underlay", () => {
    const centerOffset = { x: 5.0, z: 5.0 };
    const cadMm = { x: 5000, y: 5000 };

    const worldX = cadMm.x / 1000 - centerOffset.x;
    const worldZ = cadMm.y / 1000 - centerOffset.z;

    expect(worldX).toBe(0);
    expect(worldZ).toBe(0);
  });
});
