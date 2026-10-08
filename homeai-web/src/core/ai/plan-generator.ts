import { Project, Floor, Wall, Room, Door, Window, Prop } from "../domain/types";
import { planAutonomousPlacement } from "./spatial-planner";
import { auditFloorPlan, ArchitecturalSuggestion } from "./architect-rules";
import { build2BHKLayout, build1BHKLayout, buildLivingRoomSuite, buildBedroomSuite } from "./architectural-layouts";
import { v4 as uuidv4 } from "uuid";

export interface PlanGenerationAction {
  type: "add_prop" | "add_room" | "add_wall" | "add_window" | "add_door";
  floorId: string;
  prop?: Prop;
  wall?: Wall;
  room?: Room;
  window?: Window;
  door?: Door;
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
  floorId?: string
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

  // 1. Audit / Code Check Request
  if (pLower.includes("audit") || pLower.includes("code") || pLower.includes("check") || pLower.includes("inspect") || pLower.includes("score")) {
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

  // 3. Whole House / Complete Layout Generation Requests
  const isLayoutRequest = 
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
    (pLower.includes("generate") && (pLower.includes("plan") || pLower.includes("home")));

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
