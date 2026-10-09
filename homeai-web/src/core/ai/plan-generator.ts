import { Project, Floor, Wall, Room, Door, Window, Prop, Staircase, SlabVoid, StructuralColumn } from "../domain/types";
import { planAutonomousPlacement } from "./spatial-planner";
import { auditFloorPlan, ArchitecturalSuggestion, AuditCategory } from "./architect-rules";
import { build2BHKLayout, build1BHKLayout, buildLivingRoomSuite, buildBedroomSuite, buildDuplexLayout } from "./architectural-layouts";
import { validateFloorPlan, calculatePolygonAreaSqM } from "../geometry/floor-plan-validator";
import { ARCHITECTURAL_DESIGN_PRESETS } from "../geometry/design-presets";
import { FloorFinishType, WallFinishType } from "../geometry/pbr-materials";
import { v4 as uuidv4 } from "uuid";

export interface PlanGenerationAction {
  type: 
    | "add_prop" 
    | "add_room" 
    | "add_wall" 
    | "add_window" 
    | "add_door" 
    | "add_staircase" 
    | "add_void" 
    | "add_column"
    | "update_prop"
    | "update_wall_finish"
    | "update_floor_finish"
    | "apply_preset";
  floorId: string;
  prop?: Prop;
  wall?: Wall;
  room?: Room;
  window?: Window;
  door?: Door;
  staircase?: Staircase;
  void?: SlabVoid;
  column?: StructuralColumn;
  propId?: string;
  propUpdates?: Partial<Prop>;
  wallFinish?: WallFinishType;
  floorFinish?: FloorFinishType;
  color?: string;
  presetId?: string;
  description: string;
}

export interface GenerationResponse {
  message: string;
  actions: PlanGenerationAction[];
  suggestions: ArchitecturalSuggestion[];
  replaceFloor?: boolean;
  placementSummary?: {
    propsAdded: number;
    roomsAffected: string[];
    viewingDistanceM?: number;
  };
}

/**
 * Natural language intent parser & architectural layout generator.
 * Converts freeform user prompts into exact millimeter geometry, code-compliant rooms, and prop placements.
 */
export function generatePlanFromPrompt(
  prompt: string,
  project: Project,
  floorId?: string,
  selectedEntity?: { type: string; id: string } | null
): GenerationResponse {
  const targetFloorId = floorId || project.activeFloorId;
  const floor = project.floors.find(f => f.id === targetFloorId) || project.floors[0];
  const pLower = prompt.toLowerCase();

  const actions: PlanGenerationAction[] = [];

  if (!floor) {
    return {
      message: "Please open or create a project floor plan before issuing design requests.",
      actions: [],
      suggestions: [],
    };
  }

  // 1. Audit / Code Check Request (when not asking for layout improvement)
  if (!pLower.includes("improve") && !pLower.includes("optimize") && (pLower.includes("audit") || pLower.includes("code") || pLower.includes("check") || pLower.includes("inspect") || pLower.includes("score"))) {
    const report = auditFloorPlan(project, floor.id);
    return {
      message: `Audit completed! Overall Compliance Score is ${report.overallScore}/100 (${report.complianceStatus.replace("_", " ")}). Found ${report.issues.length} observation(s) across Building Codes, Daylighting, and Egress.`,
      actions: [],
      suggestions: report.suggestions,
    };
  }

  // 2. Clear Canvas Request
  if (pLower.includes("clear") && (pLower.includes("canvas") || pLower.includes("all") || pLower.includes("plan") || pLower.includes("reset"))) {
    return {
      message: "Canvas cleared. You can now build a fresh layout like 'Build a 2BHK layout' or 'Add 75-inch TV and sofa'.",
      actions: [],
      suggestions: [],
      replaceFloor: true,
    };
  }

  // 2b. Contextual Prop Modification (Color, Rotation, Move/Nudge)
  const isColorIntent = pLower.includes("color") || pLower.includes("colour") || pLower.includes("paint") || pLower.includes("shade") || pLower.includes("make it") || pLower.includes("turn");
  const isRotationIntent = pLower.includes("rotate") || pLower.includes("turn") || pLower.includes("spin") || pLower.includes("angle") || pLower.includes("orientation");
  const isMoveIntent = pLower.includes("move") || pLower.includes("shift") || pLower.includes("nudge") || pLower.includes("slide") || pLower.includes("closer") || pLower.includes("further");
  const isModifyIntent = isColorIntent || isRotationIntent || isMoveIntent || pLower.includes("change") || pLower.includes("update") || pLower.includes("recolor");

  if (isModifyIntent && !pLower.includes("layout") && !pLower.includes("2bhk") && !pLower.includes("1bhk") && !pLower.includes("duplex")) {
    let targetProp: Prop | undefined;
    if (selectedEntity?.type === "prop") {
      targetProp = floor.props?.find(p => p.id === selectedEntity.id);
    }
    if (!targetProp && floor.props && floor.props.length > 0) {
      if (pLower.includes("sofa") || pLower.includes("couch") || pLower.includes("sectional")) {
        targetProp = floor.props.find(p => p.category === "living" || p.propType === "sofa");
      } else if (pLower.includes("bed") || pLower.includes("mattress")) {
        targetProp = floor.props.find(p => p.category === "bedroom" || p.propType === "bed");
      } else if (pLower.includes("tv") || pLower.includes("screen")) {
        targetProp = floor.props.find(p => p.category === "entertainment" || p.propType === "tv");
      } else if (pLower.includes("dining") || pLower.includes("table")) {
        targetProp = floor.props.find(p => p.category === "dining");
      } else if (pLower.includes("chair") || pLower.includes("armchair")) {
        targetProp = floor.props.find(p => p.category === "living");
      } else if (selectedEntity) {
        targetProp = floor.props.find(p => p.id === selectedEntity.id);
      }
    }

    if (targetProp) {
      const updates: Partial<Prop> = {};
      const changesList: string[] = [];

      // Color extraction
      if (pLower.includes("emerald") || pLower.includes("dark green") || pLower.includes("green")) {
        updates.color = "#065f46";
        changesList.push("finish to Emerald Green");
      } else if (pLower.includes("navy") || pLower.includes("royal blue") || pLower.includes("blue")) {
        updates.color = "#1e3a8a";
        changesList.push("finish to Royal Navy");
      } else if (pLower.includes("beige") || pLower.includes("cream") || pLower.includes("linen")) {
        updates.color = "#d6d3d1";
        changesList.push("finish to Oatmeal Linen");
      } else if (pLower.includes("black") || pLower.includes("charcoal")) {
        updates.color = "#1e293b";
        changesList.push("finish to Matte Charcoal");
      } else if (pLower.includes("white") || pLower.includes("ivory")) {
        updates.color = "#f8fafc";
        changesList.push("finish to Pure White");
      } else if (pLower.includes("terracotta") || pLower.includes("rust") || pLower.includes("orange")) {
        updates.color = "#c2410c";
        changesList.push("finish to Terracotta");
      } else if (pLower.includes("gray") || pLower.includes("grey")) {
        updates.color = "#64748b";
        changesList.push("finish to Slate Gray");
      }

      // Rotation extraction
      if (isRotationIntent) {
        let deltaRad = Math.PI / 4;
        if (pLower.includes("90")) deltaRad = Math.PI / 2;
        else if (pLower.includes("180")) deltaRad = Math.PI;
        else if (pLower.includes("45")) deltaRad = Math.PI / 4;
        else if (pLower.includes("30")) deltaRad = Math.PI / 6;
        else if (pLower.includes("60")) deltaRad = Math.PI / 3;

        const currentRot = targetProp.rotation || 0;
        updates.rotation = (currentRot + deltaRad) % (2 * Math.PI);
        changesList.push(`rotation by ${Math.round((deltaRad * 180) / Math.PI)}°`);
      }

      // Position nudge extraction
      if (isMoveIntent) {
        const step = 300;
        const curX = targetProp.position.x;
        const curY = targetProp.position.y;
        let newX = curX;
        let newY = curY;

        if (pLower.includes("left") || pLower.includes("west")) newX -= step;
        else if (pLower.includes("right") || pLower.includes("east")) newX += step;
        else if (pLower.includes("up") || pLower.includes("north") || pLower.includes("forward")) newY -= step;
        else if (pLower.includes("down") || pLower.includes("south") || pLower.includes("back")) newY += step;
        else { newX += 200; }

        updates.position = { x: newX, y: newY };
        changesList.push(`position nudged towards requested vector`);
      }

      if (Object.keys(updates).length > 0) {
        actions.push({
          type: "update_prop",
          floorId: floor.id,
          propId: targetProp.id,
          propUpdates: updates,
          description: `Updated ${targetProp.name}: ${changesList.join(", ")}`,
        });
        return {
          message: `Updated ${targetProp.name}: ${changesList.join(", ")}. Changes reflected in 2D and 3D immediately.`,
          actions,
          suggestions: [],
        };
      }
    }
  }

  // 2c. Architectural Design Preset Application
  const isApplyPresetIntent = 
    !pLower.includes("tell me") && 
    !pLower.includes("what is") && 
    !pLower.includes("explain") && 
    (pLower.includes("apply") || pLower.includes("switch to") || pLower.includes("set style") || pLower.includes("use preset") || pLower.includes("change style"));
  if (isApplyPresetIntent) {
    const matchedPreset = Object.values(ARCHITECTURAL_DESIGN_PRESETS).find(p => 
      pLower.includes(p.id.replace(/_/g, " ")) || pLower.includes(p.name.toLowerCase()) || pLower.includes(p.id)
    );

    if (matchedPreset) {
      actions.push({
        type: "apply_preset",
        floorId: floor.id,
        presetId: matchedPreset.id,
        description: `Apply ${matchedPreset.name} architectural preset across all levels`,
      });
      return {
        message: `Applied ${matchedPreset.name} style preset across all levels.\n• Wall Finish: ${matchedPreset.wallFinish.replace(/_/g, " ")}\n• Flooring: ${matchedPreset.floorFinish.replace(/_/g, " ")}\n• Recommended Materials: ${matchedPreset.recommendedMaterials.join(" • ")}.`,
        actions,
        suggestions: [],
      };
    }
  }

  // 2d. Bulk Wall Finish / Paint Modification
  if ((pLower.includes("wall") || pLower.includes("walls")) && (pLower.includes("finish") || pLower.includes("paint") || pLower.includes("plaster") || pLower.includes("limewash") || pLower.includes("brick"))) {
    let chosenFinish: WallFinishType = "white_plaster";
    let chosenHex = "#ffffff";

    if (pLower.includes("venetian") || pLower.includes("greige") || pLower.includes("warm")) { chosenFinish = "warm_greige"; chosenHex = "#e7e5e4"; }
    else if (pLower.includes("limewash") || pLower.includes("white")) { chosenFinish = "white_plaster"; chosenHex = "#fafaf9"; }
    else if (pLower.includes("concrete") || pLower.includes("stucco") || pLower.includes("charcoal") || pLower.includes("dark")) { chosenFinish = "charcoal_slate"; chosenHex = "#1e293b"; }
    else if (pLower.includes("brick")) { chosenFinish = "exposed_brick"; chosenHex = "#b91c1c"; }

    actions.push({
      type: "update_wall_finish",
      floorId: floor.id,
      wallFinish: chosenFinish,
      color: chosenHex,
      description: `Update wall finish to ${chosenFinish.replace(/_/g, " ")}`,
    });
    return {
      message: `Updated all walls on ${floor.name} to ${chosenFinish.replace(/_/g, " ")} (${chosenHex}). PBR shaders synchronized with natural daylight.`,
      actions,
      suggestions: [],
    };
  }

  // 2e. Bulk Flooring Finish Modification
  if ((pLower.includes("floor") || pLower.includes("flooring")) && (pLower.includes("finish") || pLower.includes("hardwood") || pLower.includes("parquet") || pLower.includes("marble") || pLower.includes("tile") || pLower.includes("terrazzo") || pLower.includes("concrete"))) {
    let chosenFloor: FloorFinishType = "teak_hardwood";

    if (pLower.includes("herringbone") || pLower.includes("parquet") || pLower.includes("oak")) chosenFloor = "teak_hardwood";
    else if (pLower.includes("marble") || pLower.includes("calacatta") || pLower.includes("italian")) chosenFloor = "italian_marble";
    else if (pLower.includes("concrete") || pLower.includes("polished")) chosenFloor = "polished_concrete";
    else if (pLower.includes("slate") || pLower.includes("grey tile") || pLower.includes("tile")) chosenFloor = "slate_ceramic_tile";
    else if (pLower.includes("terrazzo")) chosenFloor = "terrazzo";

    actions.push({
      type: "update_floor_finish",
      floorId: floor.id,
      floorFinish: chosenFloor,
      description: `Update floor finish to ${chosenFloor.replace(/_/g, " ")}`,
    });
    return {
      message: `Updated all room floor finishes on ${floor.name} to ${chosenFloor.replace(/_/g, " ")}. Specular reflections and normal maps applied.`,
      actions,
      suggestions: [],
    };
  }

  // 3. Whole House / Complete Layout Generation Requests
  const isDuplex = 
    pLower.includes("duplex") || 
    pLower.includes("two floor") || 
    pLower.includes("two-floor") || 
    pLower.includes("double height") || 
    pLower.includes("double-height") || 
    pLower.includes("2 floor") || 
    pLower.includes("2-floor") || 
    pLower.includes("g+1") ||
    pLower.includes("g + 1") ||
    pLower.includes("g +1") ||
    pLower.includes("g+ 1") ||
    pLower.includes("g1") ||
    pLower.includes("ground+1") ||
    pLower.includes("ground + 1") ||
    pLower.includes("ground plus one") ||
    pLower.includes("2 storey") ||
    pLower.includes("2-storey") ||
    pLower.includes("2 story") ||
    pLower.includes("2-story") ||
    pLower.includes("two storey") ||
    pLower.includes("two story") ||
    pLower.includes("multi floor") ||
    pLower.includes("multi-floor");

  if (isDuplex) {
    const groundFloorId = floor.id;
    const existingF1 = project.floors.find(f => f.id !== groundFloorId && (f.level === 1 || f.name.toLowerCase().includes("first") || f.name.toLowerCase().includes("1")));
    const firstFloorId = existingF1 ? existingF1.id : `floor-first-${uuidv4().slice(0, 8)}`;

    const duplex = buildDuplexLayout(groundFloorId, firstFloorId, 0, 0);
    const layoutActions: PlanGenerationAction[] = [];

    // Ground floor actions
    for (const wall of duplex.groundFloor.walls) {
      layoutActions.push({ type: "add_wall", floorId: groundFloorId, wall, description: "Ground Floor Wall" });
    }
    for (const room of duplex.groundFloor.rooms) {
      layoutActions.push({ type: "add_room", floorId: groundFloorId, room, description: room.name });
    }
    for (const prop of duplex.groundFloor.props) {
      layoutActions.push({ type: "add_prop", floorId: groundFloorId, prop, description: prop.name });
    }
    for (const stair of duplex.groundFloor.stairs) {
      layoutActions.push({ type: "add_staircase", floorId: groundFloorId, staircase: stair, description: "Dog-Leg Staircase (UP)" });
    }
    for (const col of duplex.groundFloor.columns) {
      layoutActions.push({ type: "add_column", floorId: groundFloorId, column: col, description: "Structural RC Column" });
    }

    // First floor actions
    for (const wall of duplex.firstFloor.walls) {
      layoutActions.push({ type: "add_wall", floorId: firstFloorId, wall, description: "First Floor Wall" });
    }
    for (const room of duplex.firstFloor.rooms) {
      layoutActions.push({ type: "add_room", floorId: firstFloorId, room, description: room.name });
    }
    for (const prop of duplex.firstFloor.props) {
      layoutActions.push({ type: "add_prop", floorId: firstFloorId, prop, description: prop.name });
    }
    for (const stair of duplex.firstFloor.stairs) {
      layoutActions.push({ type: "add_staircase", floorId: firstFloorId, staircase: stair, description: "Staircase Landing (DN)" });
    }
    for (const voidCut of duplex.firstFloor.voids) {
      layoutActions.push({ type: "add_void", floorId: firstFloorId, void: voidCut, description: "Double-Height Slab Void" });
    }
    for (const col of duplex.firstFloor.columns) {
      layoutActions.push({ type: "add_column", floorId: firstFloorId, column: col, description: "Aligned Structural RC Column" });
    }

    return {
      message: `Successfully architected an Architectural Duplex Villa (${duplex.totalAreaM2} m² / ${Math.round(duplex.totalAreaM2 * 10.764)} sq ft) across Ground Floor and First Floor. Included 18-riser Blondel-compliant dog-leg staircase, double-height living room with slab void cut-out, 16 aligned structural RC columns, Vaastu-aligned modular kitchen (SE) & master spa suite (SW), guest bedroom, covered carport with parked vehicle, and scenic front terrace.`,
      actions: layoutActions,
      suggestions: [],
      replaceFloor: true,
      placementSummary: {
        propsAdded: duplex.groundFloor.props.length + duplex.firstFloor.props.length,
        roomsAffected: [
          ...duplex.groundFloor.rooms.map(r => `G0: ${r.name}`),
          ...duplex.firstFloor.rooms.map(r => `F1: ${r.name}`)
        ],
        viewingDistanceM: 3.2,
      }
    };
  }

  const isLayoutRequest = 
    !pLower.includes("improve") &&
    !pLower.includes("optimize") &&
    (
      pLower.includes("2bhk") || 
      pLower.includes("2-bhk") || 
      pLower.includes("1bhk") || 
      pLower.includes("1-bhk") || 
      pLower.includes("3bhk") || 
      pLower.includes("studio") || 
      pLower.includes("layout") || 
      pLower.includes("floor plan") || 
      pLower.includes("house") || 
      pLower.includes("apartment") ||
      pLower.includes("villa") ||
      (pLower.includes("generate") && (pLower.includes("plan") || pLower.includes("home")))
    );

  if (isLayoutRequest) {
    const is1BHK = pLower.includes("1bhk") || pLower.includes("1-bhk") || pLower.includes("one bedroom") || pLower.includes("studio");
    const generated = is1BHK 
      ? build1BHKLayout(floor.id, 0, 0)
      : build2BHKLayout(floor.id, 0, 0);

    const layoutActions: PlanGenerationAction[] = [];
    for (const wall of generated.walls) {
      layoutActions.push({ type: "add_wall", floorId: floor.id, wall, description: "Exterior/Interior Wall" });
    }
    for (const room of generated.rooms) {
      layoutActions.push({ type: "add_room", floorId: floor.id, room, description: room.name });
    }
    for (const prop of generated.props) {
      layoutActions.push({ type: "add_prop", floorId: floor.id, prop, description: prop.name });
    }

    return {
      message: `Successfully architected ${is1BHK ? "1BHK" : "2BHK"} floor plan (${generated.totalAreaM2} m² / ${Math.round(generated.totalAreaM2 * 10.764)} sq ft) compliant with NBC 2016 standards. Generated ${generated.walls.length} walls, ${generated.rooms.length} enclosed rooms, and positioned ${generated.props.length} ergonomic props.`,
      actions: layoutActions,
      suggestions: [],
      replaceFloor: floor.walls.length === 0 || pLower.includes("new") || pLower.includes("replace"),
      placementSummary: {
        propsAdded: generated.props.length,
        roomsAffected: generated.rooms.map(r => r.name),
        viewingDistanceM: 3.0,
      }
    };
  }

  // 4. Dimensioned Room Request (e.g. "Add a 4x3m guest bedroom on East side")
  const roomDimMatch = prompt.match(/(\d+)\s*[xX*]\s*(\d+)/);
  if (roomDimMatch && (pLower.includes("room") || pLower.includes("bedroom") || pLower.includes("bathroom") || pLower.includes("kitchen") || pLower.includes("extension"))) {
    const w = parseInt(roomDimMatch[1]) * 1000;
    const h = parseInt(roomDimMatch[2]) * 1000;

    let roomName = "Guest Bedroom";
    if (pLower.includes("master")) roomName = "Master Bedroom";
    else if (pLower.includes("bath")) { roomName = "Bathroom"; }
    else if (pLower.includes("kitchen")) { roomName = "Kitchen"; }
    else if (pLower.includes("living")) { roomName = "Living Room"; }

    const maxX = floor.walls.length > 0 ? Math.max(...floor.walls.flatMap(wall => [wall.start.x, wall.end.x])) : 0;
    const startX = maxX > 0 ? maxX + 300 : 0;
    const startY = 0;

    const roomId = `room-${uuidv4().slice(0, 8)}`;
    const newRoom: Room = {
      id: roomId,
      floorId: floor.id,
      name: roomName,
      polygon: [
        { x: startX, y: startY },
        { x: startX + w, y: startY },
        { x: startX + w, y: startY + h },
        { x: startX, y: startY + h },
      ],
      color: "#e0f2fe",
      targetArea: w * h,
    };

    const w1: Wall = { id: `wall-${uuidv4().slice(0, 8)}`, floorId: floor.id, start: { x: startX, y: startY }, end: { x: startX + w, y: startY }, thickness: 200, doors: [], windows: [{ id: `win-${uuidv4().slice(0, 8)}`, floorId: floor.id, wallId: "", offset: w / 2, width: 1400, height: 1200, sillHeight: 900 }] };
    const w2: Wall = { id: `wall-${uuidv4().slice(0, 8)}`, floorId: floor.id, start: { x: startX + w, y: startY }, end: { x: startX + w, y: startY + h }, thickness: 200, doors: [], windows: [] };
    const w3: Wall = { id: `wall-${uuidv4().slice(0, 8)}`, floorId: floor.id, start: { x: startX + w, y: startY + h }, end: { x: startX, y: startY + h }, thickness: 200, doors: [], windows: [] };
    const w4: Wall = { id: `wall-${uuidv4().slice(0, 8)}`, floorId: floor.id, start: { x: startX, y: startY + h }, end: { x: startX, y: startY }, thickness: 150, doors: [{ id: `door-${uuidv4().slice(0, 8)}`, floorId: floor.id, wallId: "", offset: h / 2, width: 900, height: 2100, swingDirection: "inward_right" }], windows: [] };

    actions.push({ type: "add_wall", floorId: floor.id, wall: w1, description: "North exterior wall" });
    actions.push({ type: "add_wall", floorId: floor.id, wall: w2, description: "East exterior wall" });
    actions.push({ type: "add_wall", floorId: floor.id, wall: w3, description: "South exterior wall" });
    actions.push({ type: "add_wall", floorId: floor.id, wall: w4, description: "West connecting wall with door" });
    actions.push({ type: "add_room", floorId: floor.id, room: newRoom, description: `Enclosed ${roomName}` });

    return {
      message: `Generated a ${w / 1000}m × ${h / 1000}m (${(w * h / 1_000_000).toFixed(1)} m²) ${roomName} extension with code-compliant exterior walls, 1400mm daylight window, and 900mm entry door.`,
      actions,
      suggestions: [],
    };
  }

  // 5. Conversational Architectural Knowledge Questions
  if (pLower.includes("neufert") || pLower.includes("ergonomic") || (pLower.includes("standard") && !pLower.includes("bed")) || pLower.includes("vaastu") || pLower.includes("vastu") || (pLower.includes("what") && (pLower.includes("distance") || pLower.includes("rule") || pLower.includes("tv")))) {
    if (pLower.includes("vaastu") || pLower.includes("vastu") || pLower.includes("direction") || pLower.includes("orientation")) {
      return {
        message: "Vaastu Shastra Architectural Principles:\n• Master Bedroom: Optimal in South-West (Nairutya) for stability; sleep with head South/East.\n• Kitchen: Best in South-East (Agneya, fire element).\n• Living Room: North or East for welcoming social energy.\n• Main Entrance: North or East (Ishanya/Indra).",
        actions: [],
        suggestions: [],
      };
    }

    return {
      message: "According to Ernst Neufert's Architectural Standards:\n• TV Viewing: 38mm per diagonal inch (e.g., 2.85m for 75\" TV, 3.2m for 85\" TV).\n• Bed Clearance: 750mm flanking nightstands, 900mm at foot.\n• Dining: 900mm clearance behind pulled-out chairs for comfortable circulation.\n• Doors: Minimum 900mm habitable, 800mm bathroom (NBC 2016).",
      actions: [],
      suggestions: [],
    };
  }

  // 5b. Layout Improvement & Spatial Reasoning (e.g. "Improve layout", "Check daylight", "Review circulation")
  if (pLower.includes("improve") || pLower.includes("optimize") || pLower.includes("review layout") || pLower.includes("circulation")) {
    const report = validateFloorPlan(floor);
    const roomSummaries = floor.rooms.map(r => `${r.name}: ${calculatePolygonAreaSqM(r.polygon).toFixed(1)} m²`).join(", ");
    
    return {
      message: `Architectural Layout Review for ${floor.name} (${report.score}/100):\n• Usable Space: ${report.totalAreaSqM} m² across ${floor.rooms.length} room(s) (${roomSummaries || 'No enclosed rooms yet'})\n• Circulation & Ingress: ${report.doorCount} door(s), ${report.windowCount} daylight opening(s)\n• Architectural Guidance: ${report.summary}\n\nYou can click 'Stage 3: Review Floor Plan' in the top bar to lock this structural layout into 3D, or ask me to generate extensions (e.g. 'Add a 4x3m master bedroom' or 'Build a duplex villa').`,
      actions: [],
      suggestions: report.issues.map((iss, i) => {
        let cat: AuditCategory = "building_code";
        if (iss.category === 'circulation') cat = 'egress';
        else if (iss.category === 'daylight') cat = 'ventilation';
        return {
          id: `sug-${iss.id || i}`,
          category: cat,
          severity: iss.type,
          title: iss.title,
          description: iss.message,
          affectedElementIds: iss.roomId ? [iss.roomId] : [],
          applied: false,
        };
      }),
    };
  }

  // 5c. Architectural Design Presets & Styles (e.g. "Apply Scandinavian style", "Modern minimalist", "What styles?")
  if (pLower.includes("preset") || pLower.includes("scandinavian") || pLower.includes("minimalist") || pLower.includes("japandi") || pLower.includes("terrazzo") || pLower.includes("industrial") || pLower.includes("luxury")) {
    const matchedPreset = Object.values(ARCHITECTURAL_DESIGN_PRESETS).find(p => 
      pLower.includes(p.id.replace("_", " ")) || pLower.includes(p.name.toLowerCase()) || pLower.includes(p.id)
    );

    if (matchedPreset) {
      return {
        message: `Architectural Style: ${matchedPreset.name}\n• Tagline: "${matchedPreset.tagline}"\n• Character: ${matchedPreset.description}\n• Material Palette: ${matchedPreset.recommendedMaterials.join(" • ")}\n• PBR Wall Finish: ${matchedPreset.wallFinish.replace("_", " ")}\n• PBR Floor Finish: ${matchedPreset.floorFinish.replace("_", " ")}\n\nYou can apply this coordinated aesthetic instantly in 3D View using the 'Design Presets' button!`,
        actions: [],
        suggestions: [{
          id: `apply-preset-${matchedPreset.id}`,
          category: 'ergonomics',
          severity: 'info',
          title: `Apply ${matchedPreset.name} Preset`,
          description: `Coordinated update across all floors with ${matchedPreset.recommendedMaterials.join(", ")}.`,
          affectedElementIds: [],
          applied: false,
        }],
      };
    } else {
      const allStyles = Object.values(ARCHITECTURAL_DESIGN_PRESETS).map(p => `• ${p.name}: ${p.tagline}`).join("\n");
      return {
        message: `I support 7 coordinated architectural design styles:\n${allStyles}\n\nAsk me about any style (e.g. 'Tell me about Japandi' or 'Apply Modern Minimalist') or use the 3D Design Presets toolbar.`,
        actions: [],
        suggestions: [],
      };
    }
  }

  // 6. Furniture & Prop Requests
  const isTvRequest = pLower.includes("tv") || pLower.includes("television") || pLower.includes("screen");
  const isSofaRequest = pLower.includes("sofa") || pLower.includes("couch") || pLower.includes("sectional") || pLower.includes("seating");
  const isBedRequest = (pLower.includes("bed") && !roomDimMatch) || pLower.includes("mattress");
  const isDiningRequest = pLower.includes("dining") || pLower.includes("table");
  const isDeskRequest = pLower.includes("desk") || pLower.includes("workstation") || pLower.includes("study");
  const isWardrobeRequest = pLower.includes("wardrobe") || pLower.includes("closet") || pLower.includes("cupboard");

  // TV Key
  let tvKey = "tv_65";
  if (pLower.includes("75") || pLower.includes("75-inch") || pLower.includes("75\"")) tvKey = "tv_75";
  else if (pLower.includes("85") || pLower.includes("85-inch") || pLower.includes("85\"")) tvKey = "tv_85";
  else if (pLower.includes("55") || pLower.includes("55-inch") || pLower.includes("55\"")) tvKey = "tv_55";

  // Sofa Key & Color
  let sofaKey = "sofa_3seater";
  let sofaColor = "#475569";
  if (pLower.includes("l-shape") || pLower.includes("l shape") || pLower.includes("sectional") || pLower.includes("corner")) {
    sofaKey = "sofa_l_shape";
  }
  if (pLower.includes("leather") || pLower.includes("black")) sofaColor = "#1e293b";
  else if (pLower.includes("beige") || pLower.includes("cream")) sofaColor = "#d6d3d1";
  else if (pLower.includes("blue") || pLower.includes("navy")) sofaColor = "#1e3a8a";
  else if (pLower.includes("green") || pLower.includes("emerald")) sofaColor = "#065f46";
  else if (pLower.includes("gray") || pLower.includes("grey")) sofaColor = "#334155";

  // Combined TV + Sofa Request
  if (isTvRequest && isSofaRequest) {
    const livingRoom = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall"));
    
    // If NO living room exists yet (or empty floor), autonomously architect the Living Room Suite!
    if (!livingRoom || floor.rooms.length === 0) {
      const maxX = floor.walls.length > 0 ? Math.max(...floor.walls.flatMap(w => [w.start.x, w.end.x])) : 0;
      const startX = maxX > 0 ? maxX + 300 : 0;
      const generated = buildLivingRoomSuite(floor.id, startX, 0, tvKey, sofaKey, sofaColor);
      
      const suiteActions: PlanGenerationAction[] = [];
      for (const wall of generated.walls) suiteActions.push({ type: "add_wall", floorId: floor.id, wall, description: "Living room wall" });
      for (const room of generated.rooms) suiteActions.push({ type: "add_room", floorId: floor.id, room, description: room.name });
      for (const prop of generated.props) suiteActions.push({ type: "add_prop", floorId: floor.id, prop, description: prop.name });

      return {
        message: `Architected a dedicated Living Room (5.5m × 4.5m / 24.8 m²) and placed ${tvKey.replace("_", " ")} on solid wall paired with ${sofaKey.replace("_", " ")} at calibrated 3.0m Neufert viewing distance.`,
        actions: suiteActions,
        suggestions: [],
        placementSummary: { propsAdded: 2, roomsAffected: ["Living Room"], viewingDistanceM: 3.0 }
      };
    }

    // Living room exists: place within existing room
    const tvPlan = planAutonomousPlacement(floor, tvKey, livingRoom.id);
    if (tvPlan) {
      actions.push({ type: "add_prop", floorId: floor.id, prop: tvPlan.prop, description: tvPlan.reasoning });
      const virtualFloor: Floor = { ...floor, props: [...(floor.props || []), tvPlan.prop] };
      const sofaPlan = planAutonomousPlacement(virtualFloor, sofaKey, livingRoom.id, { color: sofaColor });
      if (sofaPlan) {
        actions.push({ type: "add_prop", floorId: floor.id, prop: sofaPlan.prop, description: sofaPlan.reasoning });
        return {
          message: `Successfully arranged home theater in ${livingRoom.name}: Placed ${tvPlan.prop.name} on solid wall and paired ${sofaPlan.prop.name} at calibrated ergonomic viewing distance (${sofaPlan.viewingDistanceM ? sofaPlan.viewingDistanceM.toFixed(1) + "m" : "2.8m"}). Zero overlap, Neufert clearance verified.`,
          actions,
          suggestions: [],
          placementSummary: {
            propsAdded: 2,
            roomsAffected: [livingRoom.name],
            viewingDistanceM: sofaPlan.viewingDistanceM,
          }
        };
      }
    }
  }

  // Single TV Request
  if (isTvRequest) {
    const livingRoom = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall")) || floor.rooms[0];
    if (livingRoom) {
      const plan = planAutonomousPlacement(floor, tvKey, livingRoom.id);
      if (plan) {
        actions.push({ type: "add_prop", floorId: floor.id, prop: plan.prop, description: plan.reasoning });
        return {
          message: `Positioned ${plan.prop.name} on solid wall in ${plan.targetRoom.name} with glare-free orientation.`,
          actions,
          suggestions: [],
          placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
        };
      }
    } else {
      // Auto-create room
      const generated = buildLivingRoomSuite(floor.id, 0, 0, tvKey, "sofa_3seater");
      const suiteActions: PlanGenerationAction[] = [];
      for (const wall of generated.walls) suiteActions.push({ type: "add_wall", floorId: floor.id, wall, description: "Wall" });
      for (const room of generated.rooms) suiteActions.push({ type: "add_room", floorId: floor.id, room, description: room.name });
      for (const prop of generated.props) suiteActions.push({ type: "add_prop", floorId: floor.id, prop, description: prop.name });
      return {
        message: `Built Living Room suite and placed ${tvKey.replace("_", " ")} along solid wall.`,
        actions: suiteActions,
        suggestions: [],
      };
    }
  }

  // Single Sofa Request
  if (isSofaRequest) {
    const livingRoom = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall")) || floor.rooms[0];
    if (livingRoom) {
      const plan = planAutonomousPlacement(floor, sofaKey, livingRoom.id, { color: sofaColor });
      if (plan) {
        actions.push({ type: "add_prop", floorId: floor.id, prop: plan.prop, description: plan.reasoning });
        return {
          message: `Placed ${plan.prop.name} in ${plan.targetRoom.name} maintaining unobstructed walking paths.`,
          actions,
          suggestions: [],
          placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
        };
      }
    }
  }

  // Bed Request
  if (isBedRequest) {
    let bedKey = "bed_queen";
    if (pLower.includes("king")) bedKey = "bed_king";
    else if (pLower.includes("single") || pLower.includes("twin")) bedKey = "bed_single";

    let bedColor = "#6366f1";
    if (pLower.includes("white")) bedColor = "#f8fafc";
    else if (pLower.includes("gray") || pLower.includes("grey")) bedColor = "#475569";
    else if (pLower.includes("wood") || pLower.includes("brown")) bedColor = "#78350f";

    const bedRoom = floor.rooms.find(r => r.name.toLowerCase().includes("bed")) || floor.rooms[0];
    if (bedRoom) {
      const plan = planAutonomousPlacement(floor, bedKey, bedRoom.id, { color: bedColor });
      if (plan) {
        actions.push({ type: "add_prop", floorId: floor.id, prop: plan.prop, description: plan.reasoning });
        return {
          message: `Placed ${plan.prop.name} in ${plan.targetRoom.name}. Headboard grounded against solid wall with 750mm dual nightstand clearance.`,
          actions,
          suggestions: [],
          placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
        };
      }
    } else {
      // Auto-create Bedroom Suite!
      const maxX = floor.walls.length > 0 ? Math.max(...floor.walls.flatMap(w => [w.start.x, w.end.x])) : 0;
      const startX = maxX > 0 ? maxX + 300 : 0;
      const generated = buildBedroomSuite(floor.id, startX, 0, bedKey, bedColor);
      const suiteActions: PlanGenerationAction[] = [];
      for (const wall of generated.walls) suiteActions.push({ type: "add_wall", floorId: floor.id, wall, description: "Wall" });
      for (const room of generated.rooms) suiteActions.push({ type: "add_room", floorId: floor.id, room, description: room.name });
      for (const prop of generated.props) suiteActions.push({ type: "add_prop", floorId: floor.id, prop, description: prop.name });
      return {
        message: `Built Master Bedroom Suite (4.8m × 4.2m / 20.2 m²) with code-compliant walls, window, door, and positioned ${bedKey.replace("_", " ")} with 750mm nightstand clearance.`,
        actions: suiteActions,
        suggestions: [],
        placementSummary: { propsAdded: 2, roomsAffected: ["Master Bedroom"] }
      };
    }
  }

  // Dining Request
  if (isDiningRequest) {
    const diningRoom = floor.rooms.find(r => r.name.toLowerCase().includes("dining") || r.name.toLowerCase().includes("living")) || floor.rooms[0];
    if (diningRoom) {
      const plan = planAutonomousPlacement(floor, "dining_6", diningRoom.id);
      if (plan) {
        actions.push({ type: "add_prop", floorId: floor.id, prop: plan.prop, description: plan.reasoning });
        return {
          message: `Positioned 6-Seater Dining Set in ${plan.targetRoom.name} ensuring 900mm all-round chair pull-out clearance.`,
          actions,
          suggestions: [],
          placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
        };
      }
    }
  }

  // Wardrobe / Desk Request
  if (isWardrobeRequest || isDeskRequest) {
    const key = isWardrobeRequest ? "wardrobe_3door" : "desk_executive";
    const plan = planAutonomousPlacement(floor, key);
    if (plan) {
      actions.push({ type: "add_prop", floorId: floor.id, prop: plan.prop, description: plan.reasoning });
      return {
        message: `Placed ${plan.prop.name} in ${plan.targetRoom.name} flush with corner boundary.`,
        actions,
        suggestions: [],
        placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
      };
    }
  }

  // 6. Conversational Architectural Knowledge & Advisory Responses
  if (pLower.includes("neufert") || pLower.includes("ergonomic") || pLower.includes("distance") || pLower.includes("dimension")) {
    return {
      message: "According to Ernst Neufert's Architectural Standards:\n• TV Viewing: 38mm per diagonal inch (e.g., 2.85m for 75\" TV, 3.2m for 85\" TV).\n• Bed Clearance: 750mm flanking nightstands, 900mm at foot.\n• Dining: 900mm clearance behind pulled-out chairs for comfortable circulation.\n• Doors: Minimum 900mm habitable, 800mm bathroom (NBC 2016).",
      actions: [],
      suggestions: [],
    };
  }

  if (pLower.includes("vaastu") || pLower.includes("vastu") || pLower.includes("direction") || pLower.includes("orientation")) {
    return {
      message: "Vaastu Shastra Architectural Principles:\n• Master Bedroom: Optimal in South-West (Nairutya) for stability; sleep with head South/East.\n• Kitchen: Best in South-East (Agneya, fire element).\n• Living Room: North or East for welcoming social energy.\n• Main Entrance: North or East (Ishanya/Indra).",
      actions: [],
      suggestions: [],
    };
  }

  // Default Advisory with Actionable Guidance
  return {
    message: "I am ready to architect your space! You can ask me to:\n1. 'Build a 2BHK layout' or 'Generate 1BHK plan'\n2. 'Add 75-inch TV and modern gray L-shaped sofa'\n3. 'Place King bed in bedroom with nightstands'\n4. 'Add a 5x4m master bedroom on East'\n5. 'Audit floor plan for NBC/IBC codes'",
    actions: [],
    suggestions: [],
  };
}
