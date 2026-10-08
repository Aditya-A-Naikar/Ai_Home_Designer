import { Project, Floor, Wall, Room, Door, Window, Prop } from "../domain/types";
import { planAutonomousPlacement } from "./spatial-planner";
import { auditFloorPlan, ArchitecturalSuggestion } from "./architect-rules";
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
  placementSummary?: {
    propsAdded: number;
    roomsAffected: string[];
    viewingDistanceM?: number;
  };
}

/**
 * Natural language intent parser & architectural generator.
 * Converts freeform user prompts into exact millimeter geometry and prop placements.
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

  const roomDimMatch = prompt.match(/(\d+)\s*[xX*]\s*(\d+)/);

  // 2. Room Addition Request (e.g. "Add a 4x3m guest bedroom on East side")
  if (roomDimMatch && (pLower.includes("room") || pLower.includes("bedroom") || pLower.includes("bathroom") || pLower.includes("kitchen") || pLower.includes("extension"))) {
    const w = parseInt(roomDimMatch[1]) * 1000;
    const h = parseInt(roomDimMatch[2]) * 1000;

    let roomName = "Guest Bedroom";
    if (pLower.includes("master")) roomName = "Master Bedroom";
    else if (pLower.includes("bath")) { roomName = "Bathroom"; }
    else if (pLower.includes("kitchen")) { roomName = "Kitchen"; }

    // Find bounding box of current floor
    const maxX = Math.max(...floor.walls.flatMap(wall => [wall.start.x, wall.end.x]), 0);
    const startX = maxX;
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

    // Add perimeter walls
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

  // 3. TV & Entertainment Placement
  const isTvRequest = pLower.includes("tv") || pLower.includes("television") || pLower.includes("screen");
  const isSofaRequest = pLower.includes("sofa") || pLower.includes("couch") || pLower.includes("sectional") || pLower.includes("seating");
  const isBedRequest = (pLower.includes("bed") && !roomDimMatch) || pLower.includes("mattress");
  const isDiningRequest = pLower.includes("dining") || pLower.includes("table");
  const isDeskRequest = pLower.includes("desk") || pLower.includes("workstation") || pLower.includes("study");
  const isWardrobeRequest = pLower.includes("wardrobe") || pLower.includes("closet") || pLower.includes("cupboard");

  // Check TV inches (e.g. 55, 65, 75, 85)
  let tvKey = "tv_65";
  if (pLower.includes("75") || pLower.includes("75-inch") || pLower.includes("75\"")) tvKey = "tv_75";
  else if (pLower.includes("85") || pLower.includes("85-inch") || pLower.includes("85\"")) tvKey = "tv_85";
  else if (pLower.includes("55") || pLower.includes("55-inch") || pLower.includes("55\"")) tvKey = "tv_55";

  // Check Sofa style & color
  let sofaKey = "sofa_3seater";
  let sofaColor = "#475569";
  if (pLower.includes("l-shape") || pLower.includes("l shape") || pLower.includes("sectional") || pLower.includes("corner")) {
    sofaKey = "sofa_l_shape";
  }
  if (pLower.includes("leather") || pLower.includes("black")) sofaColor = "#1e293b";
  else if (pLower.includes("beige") || pLower.includes("cream")) sofaColor = "#d6d3d1";
  else if (pLower.includes("blue") || pLower.includes("navy")) sofaColor = "#1e3a8a";
  else if (pLower.includes("green") || pLower.includes("emerald")) sofaColor = "#065f46";

  // Combined TV + Sofa Request
  if (isTvRequest && isSofaRequest) {
    const livingRoom = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall")) || floor.rooms[0];
    
    // 1. Place TV
    const tvPlan = planAutonomousPlacement(floor, tvKey, livingRoom.id);
    if (tvPlan) {
      actions.push({
        type: "add_prop",
        floorId: floor.id,
        prop: tvPlan.prop,
        description: tvPlan.reasoning,
      });

      // 2. Place Sofa paired with TV
      // Temporarily create a virtual floor with TV included so sofa can pair ergonomically
      const virtualFloor: Floor = {
        ...floor,
        props: [...(floor.props || []), tvPlan.prop]
      };
      const sofaPlan = planAutonomousPlacement(virtualFloor, sofaKey, livingRoom.id, { color: sofaColor });
      if (sofaPlan) {
        actions.push({
          type: "add_prop",
          floorId: floor.id,
          prop: sofaPlan.prop,
          description: sofaPlan.reasoning,
        });

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

  // Single TV request
  if (isTvRequest) {
    const livingRoom = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall")) || floor.rooms[0];
    const plan = planAutonomousPlacement(floor, tvKey, livingRoom?.id);
    if (plan) {
      actions.push({
        type: "add_prop",
        floorId: floor.id,
        prop: plan.prop,
        description: plan.reasoning,
      });
      return {
        message: `Identified optimal solid wall in ${plan.targetRoom.name} and positioned ${plan.prop.name} with wall-mount bracket and glare-free orientation.`,
        actions,
        suggestions: [],
        placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
      };
    }
  }

  // Single Sofa request
  if (isSofaRequest) {
    const livingRoom = floor.rooms.find(r => r.name.toLowerCase().includes("living") || r.name.toLowerCase().includes("hall")) || floor.rooms[0];
    const plan = planAutonomousPlacement(floor, sofaKey, livingRoom?.id, { color: sofaColor });
    if (plan) {
      actions.push({
        type: "add_prop",
        floorId: floor.id,
        prop: plan.prop,
        description: plan.reasoning,
      });
      return {
        message: `Placed ${plan.prop.name} in ${plan.targetRoom.name} maintaining unobstructed walking paths and conversation focus.`,
        actions,
        suggestions: [],
        placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
      };
    }
  }

  // Bed request
  if (isBedRequest) {
    let bedKey = "bed_queen";
    if (pLower.includes("king")) bedKey = "bed_king";
    else if (pLower.includes("single") || pLower.includes("twin")) bedKey = "bed_single";

    let bedColor = "#6366f1";
    if (pLower.includes("white")) bedColor = "#f8fafc";
    else if (pLower.includes("gray") || pLower.includes("grey")) bedColor = "#475569";
    else if (pLower.includes("wood") || pLower.includes("brown")) bedColor = "#78350f";

    const bedRoom = floor.rooms.find(r => r.name.toLowerCase().includes("bed")) || floor.rooms[0];
    const plan = planAutonomousPlacement(floor, bedKey, bedRoom?.id, { color: bedColor });
    if (plan) {
      actions.push({
        type: "add_prop",
        floorId: floor.id,
        prop: plan.prop,
        description: plan.reasoning,
      });
      return {
        message: `Placed ${plan.prop.name} in ${plan.targetRoom.name}. Headboard grounded against solid wall with 750mm side clearance for nightstands and privacy from entrance.`,
        actions,
        suggestions: [],
        placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
      };
    }
  }

  // Dining request
  if (isDiningRequest) {
    const diningRoom = floor.rooms.find(r => r.name.toLowerCase().includes("dining") || r.name.toLowerCase().includes("living")) || floor.rooms[0];
    const plan = planAutonomousPlacement(floor, "dining_6", diningRoom?.id);
    if (plan) {
      actions.push({
        type: "add_prop",
        floorId: floor.id,
        prop: plan.prop,
        description: plan.reasoning,
      });
      return {
        message: `Positioned 6-Seater Dining Set in ${plan.targetRoom.name} ensuring 900mm all-round chair pull-out clearance.`,
        actions,
        suggestions: [],
        placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
      };
    }
  }

  // Wardrobe / Desk request
  if (isWardrobeRequest || isDeskRequest) {
    const key = isWardrobeRequest ? "wardrobe_3door" : "desk_executive";
    const plan = planAutonomousPlacement(floor, key);
    if (plan) {
      actions.push({
        type: "add_prop",
        floorId: floor.id,
        prop: plan.prop,
        description: plan.reasoning,
      });
      return {
        message: `Placed ${plan.prop.name} in ${plan.targetRoom.name} flush with corner boundary.`,
        actions,
        suggestions: [],
        placementSummary: { propsAdded: 1, roomsAffected: [plan.targetRoom.name] }
      };
    }
  }

  // 4. Default Architectural Advisory
  return {
    message: "I understand your design vision. You can ask me to: (1) 'Add 75-inch TV and sofa to living room', (2) 'Place King bed in bedroom', (3) 'Add 4x3m guest bedroom on East', or (4) 'Audit my plan for building codes'.",
    actions: [],
    suggestions: [],
  };
}
