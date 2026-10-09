import { 
  BuildingTypology, 
  ArchitecturalStyle, 
  CompassOrientation, 
  StairType, 
  Project, 
  ProjectAiBrief, 
  SiteContext,
  PreferredUnit,
  UnitSystem
} from "../domain/types";
import { createProject } from "../domain/project-factory";
import { projectRepository } from "../../infrastructure/persistence/local-storage-project-repository";
import { buildDuplexLayout, build2BHKLayout, build1BHKLayout, buildBedroomSuite } from "./architectural-layouts";
import { applyDesignPresetToProject, ARCHITECTURAL_DESIGN_PRESETS } from "../geometry/design-presets";

export interface StructuredProjectMemory {
  projectName: string;
  typology: BuildingTypology;
  floorsCount: number;
  bhkCount: number;
  bathroomsCount: number;
  architecturalStyle: ArchitecturalStyle;
  designPresetId: string;
  orientation: CompassOrientation;
  plotDimensions: { widthM: number; depthM: number };
  budgetTier: "budget" | "moderate" | "premium" | "luxury";
  stairType: StairType;
  amenities: string[];
  vaastuCompliant: boolean;
  buildingCode: "nbc" | "ibc";
  priorities: string[];
  isBriefComplete: boolean;
  missingFields: string[];
  consultantSummary: string;
}

export interface ConversationalTurnResult {
  reply: string;
  updatedMemory: StructuredProjectMemory;
  suggestedPrompts: string[];
  isReadyForLaunch: boolean;
}

/**
 * Initializes default structured architectural memory for a new project.
 */
export function createDefaultProjectMemory(): StructuredProjectMemory {
  return {
    projectName: "New Architectural Residence",
    typology: "duplex_vertical",
    floorsCount: 2,
    bhkCount: 3,
    bathroomsCount: 3,
    architecturalStyle: "modern",
    designPresetId: "modern_minimalist",
    orientation: "N",
    plotDimensions: { widthM: 15, depthM: 12 },
    budgetTier: "premium",
    stairType: "dog_leg",
    amenities: ["double_height", "puja_room", "home_office", "balcony_sitout", "powder_room"],
    vaastuCompliant: true,
    buildingCode: "nbc",
    priorities: ["Maximum Natural Light", "Open Floor Plan", "Passive Cross-Ventilation"],
    isBriefComplete: false,
    missingFields: ["typology", "bedrooms", "style"],
    consultantSummary: "Initial project intake in progress.",
  };
}

/**
 * Parses user message and conversation context to extract architectural parameters
 * and generate consultative AI architect dialogue.
 */
export function processConversationalIntakeTurn(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  currentMemory: StructuredProjectMemory = createDefaultProjectMemory()
): ConversationalTurnResult {
  const msg = userMessage.toLowerCase();
  const mem: StructuredProjectMemory = {
    ...currentMemory,
    amenities: [...currentMemory.amenities],
    priorities: [...currentMemory.priorities],
  };

  // 1. Detect Building Typology
  if (msg.includes("duplex") || msg.includes("g+1") || msg.includes("g + 1") || msg.includes("two floor") || msg.includes("2 floor") || msg.includes("2-floor") || msg.includes("two-floor")) {
    mem.typology = "duplex_vertical";
    mem.floorsCount = 2;
  } else if (msg.includes("villa") || msg.includes("mansion") || msg.includes("estate")) {
    mem.typology = "villa";
    mem.floorsCount = Math.max(2, mem.floorsCount);
  } else if (msg.includes("apartment") || msg.includes("flat") || msg.includes("penthouse") || msg.includes("condo")) {
    mem.typology = "apartment";
    mem.floorsCount = 1;
  } else if (msg.includes("townhouse") || msg.includes("row house") || msg.includes("rowhouse")) {
    mem.typology = "townhouse";
    mem.floorsCount = 2;
  } else if (msg.includes("bungalow") || msg.includes("single family") || msg.includes("single-family") || msg.includes("single floor") || msg.includes("1 floor")) {
    mem.typology = "single_family";
    mem.floorsCount = 1;
  }

  // 2. Detect BHK / Bedroom count
  const bedRegex = /(\d+)\s*(-|\s)?\s*(bhk|bed|bedroom)/i;
  const match = msg.match(bedRegex);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n) && n >= 1 && n <= 8) {
      mem.bhkCount = n;
      mem.bathroomsCount = n;
    }
  } else if (msg.includes("one bed") || msg.includes("studio")) {
    mem.bhkCount = 1;
    mem.bathroomsCount = 1;
  } else if (msg.includes("two bed")) {
    mem.bhkCount = 2;
    mem.bathroomsCount = 2;
  } else if (msg.includes("three bed")) {
    mem.bhkCount = 3;
    mem.bathroomsCount = 3;
  } else if (msg.includes("four bed")) {
    mem.bhkCount = 4;
    mem.bathroomsCount = 4;
  } else if (msg.includes("five bed")) {
    mem.bhkCount = 5;
    mem.bathroomsCount = 5;
  }

  // 3. Detect Bathrooms override
  const bathMatch = msg.match(/(\d+)\s*(bath|bathroom|toilet|washroom)/);
  if (bathMatch) {
    const baths = parseInt(bathMatch[1], 10);
    if (!isNaN(baths) && baths > 0 && baths <= 8) {
      mem.bathroomsCount = baths;
    }
  }

  // 4. Detect Levels override
  if (msg.includes("3 floor") || msg.includes("3-floor") || msg.includes("g+2") || msg.includes("three floor") || msg.includes("3 level")) {
    mem.floorsCount = 3;
  } else if (msg.includes("single floor") || msg.includes("single storey") || msg.includes("1 level") || msg.includes("one level")) {
    mem.floorsCount = 1;
  }

  // 5. Detect Architectural Style & Design Presets
  if (msg.includes("scandinavian") || msg.includes("nordic") || msg.includes("hygge")) {
    mem.architecturalStyle = "scandinavian";
    mem.designPresetId = "scandinavian";
  } else if (msg.includes("japandi") || msg.includes("zen") || msg.includes("wabi")) {
    mem.architecturalStyle = "japandi";
    mem.designPresetId = "japandi";
  } else if (msg.includes("minimal") || msg.includes("clean line")) {
    mem.architecturalStyle = "minimalist";
    mem.designPresetId = "modern_minimalist";
  } else if (msg.includes("luxury") || msg.includes("contemporary") || msg.includes("marble") || msg.includes("brass")) {
    mem.architecturalStyle = "modern";
    mem.designPresetId = "contemporary_luxury";
  } else if (msg.includes("industrial") || msg.includes("loft") || msg.includes("raw concrete") || msg.includes("brick")) {
    mem.architecturalStyle = "industrial";
    mem.designPresetId = "industrial_loft";
  } else if (msg.includes("terrazzo") || msg.includes("mediterranean") || msg.includes("coastal")) {
    mem.architecturalStyle = "modern";
    mem.designPresetId = "mediterranean_terrazzo";
  } else if (msg.includes("traditional indian") || msg.includes("kerala") || msg.includes("chettinad") || msg.includes("courtyard")) {
    mem.architecturalStyle = "indian_traditional";
    mem.designPresetId = "warm_natural";
  } else if (msg.includes("traditional") || msg.includes("classic")) {
    mem.architecturalStyle = "traditional";
    mem.designPresetId = "warm_natural";
  }

  // 6. Detect Compass Orientation
  if (msg.includes("north-east") || msg.includes("northeast") || msg.includes("ne facing") || msg.includes("ishan")) {
    mem.orientation = "NE";
  } else if (msg.includes("north-west") || msg.includes("northwest") || msg.includes("nw facing")) {
    mem.orientation = "NW";
  } else if (msg.includes("south-east") || msg.includes("southeast") || msg.includes("se facing")) {
    mem.orientation = "SE";
  } else if (msg.includes("south-west") || msg.includes("southwest") || msg.includes("sw facing")) {
    mem.orientation = "SW";
  } else if (msg.includes("north facing") || msg.includes("road in north") || msg.includes("faces north")) {
    mem.orientation = "N";
  } else if (msg.includes("east facing") || msg.includes("road in east") || msg.includes("faces east")) {
    mem.orientation = "E";
  } else if (msg.includes("south facing") || msg.includes("road in south") || msg.includes("faces south")) {
    mem.orientation = "S";
  } else if (msg.includes("west facing") || msg.includes("road in west") || msg.includes("faces west")) {
    mem.orientation = "W";
  }

  // 7. Detect Specific Space Amenities
  const addAmenity = (id: string) => {
    if (!mem.amenities.includes(id)) mem.amenities.push(id);
  };

  if (msg.includes("puja") || msg.includes("pooja") || msg.includes("prayer") || msg.includes("mandir")) {
    addAmenity("puja_room");
  }
  if (msg.includes("office") || msg.includes("study") || msg.includes("work from home") || msg.includes("desk space")) {
    addAmenity("home_office");
  }
  if (msg.includes("double height") || msg.includes("double-height") || msg.includes("mezzanine") || msg.includes("void")) {
    addAmenity("double_height");
  }
  if (msg.includes("balcony") || msg.includes("terrace") || msg.includes("sitout") || msg.includes("deck")) {
    addAmenity("balcony_sitout");
  }
  if (msg.includes("car porch") || msg.includes("garage") || msg.includes("parking") || msg.includes("driveway")) {
    addAmenity("car_porch");
  }
  if (msg.includes("powder room") || msg.includes("half bath") || msg.includes("guest toilet")) {
    addAmenity("powder_room");
  }
  if (msg.includes("walk in closet") || msg.includes("walk-in closet") || msg.includes("dressing room")) {
    addAmenity("walk_in_closet");
  }
  if (msg.includes("utility") || msg.includes("laundry") || msg.includes("wash yard")) {
    addAmenity("utility_laundry");
  }

  // 8. Detect Staircase Typology
  if (msg.includes("dog leg") || msg.includes("dog-leg") || msg.includes("u-shape") || msg.includes("l-shape")) {
    mem.stairType = "dog_leg";
  } else if (msg.includes("straight stair") || msg.includes("linear stair") || msg.includes("straight flight")) {
    mem.stairType = "straight";
  } else if (msg.includes("open well") || msg.includes("open-well") || msg.includes("grand stair")) {
    mem.stairType = "open_well";
  } else if (msg.includes("spiral") || msg.includes("helical") || msg.includes("circular stair")) {
    mem.stairType = "spiral";
  } else if (msg.includes("floating") || msg.includes("cantilever")) {
    mem.stairType = "cantilever";
  }

  // 9. Detect Vaastu & Building Codes
  if (msg.includes("vaastu") || msg.includes("vastu") || msg.includes("feng shui") || msg.includes("auspicious")) {
    mem.vaastuCompliant = true;
  }
  if (msg.includes("ibc") || msg.includes("international building code")) {
    mem.buildingCode = "ibc";
  } else if (msg.includes("nbc") || msg.includes("national building code")) {
    mem.buildingCode = "nbc";
  }

  // 10. Detect Budget / Luxury Tier
  if (msg.includes("luxury") || msg.includes("ultra luxury") || msg.includes("high-end")) {
    mem.budgetTier = "luxury";
  } else if (msg.includes("premium") || msg.includes("designer")) {
    mem.budgetTier = "premium";
  } else if (msg.includes("budget") || msg.includes("economical") || msg.includes("cost-effective") || msg.includes("affordable")) {
    mem.budgetTier = "budget";
  }

  // 11. Custom Project Naming Inference
  if (mem.projectName === "New Architectural Residence" || mem.projectName.includes("Architectural")) {
    const styleLabel = mem.architecturalStyle.charAt(0).toUpperCase() + mem.architecturalStyle.slice(1);
    const typologyLabel = mem.typology === "duplex_vertical" ? "Duplex" : mem.typology === "villa" ? "Villa" : mem.typology === "apartment" ? "Apartment" : "Residence";
    mem.projectName = `${mem.bhkCount}BHK ${styleLabel} ${typologyLabel}`;
  }

  // 12. Determine missing required fields
  const missing: string[] = [];
  const fullText = (history.map(h => h.content).join(" ") + " " + userMessage).toLowerCase();

  const hasTypology = fullText.includes("duplex") || fullText.includes("villa") || fullText.includes("apartment") || fullText.includes("bungalow") || fullText.includes("house") || fullText.includes("home");
  const hasBedrooms = fullText.includes("bhk") || fullText.includes("bed") || fullText.includes("room");
  const hasStyle = fullText.includes("modern") || fullText.includes("scandinavian") || fullText.includes("japandi") || fullText.includes("minimal") || fullText.includes("traditional") || fullText.includes("industrial") || fullText.includes("luxury");
  const hasOrientation = fullText.includes("north") || fullText.includes("south") || fullText.includes("east") || fullText.includes("west") || fullText.includes("facing");

  if (!hasTypology) missing.push("typology");
  if (!hasBedrooms) missing.push("bedrooms");
  if (!hasStyle) missing.push("style");
  if (!hasOrientation) missing.push("orientation");

  mem.missingFields = missing;

  // Sync preset if architecturalStyle is set
  if (mem.architecturalStyle === "scandinavian" && (!mem.designPresetId || mem.designPresetId === "modern_minimalist")) {
    mem.designPresetId = "scandinavian";
  } else if (mem.architecturalStyle === "japandi" && (!mem.designPresetId || mem.designPresetId === "modern_minimalist")) {
    mem.designPresetId = "japandi";
  }

  // Check if user is asking to proceed / initialize
  const isProceedIntent = 
    msg.includes("confirm") || 
    msg.includes("proceed") || 
    msg.includes("launch cad") || 
    msg.includes("launch") || 
    msg.includes("looks good") || 
    msg.includes("perfect") || 
    msg.includes("start project") || 
    msg.includes("generate layout");

  // Brief is complete if user has explicit proceed intent OR (core criteria complete and not just first turn)
  const coreComplete = hasTypology && hasBedrooms && hasStyle;
  mem.isBriefComplete = isProceedIntent || (coreComplete && history.length >= 2);

  // 13. Generate Consultative AI Architect Response
  let reply = "";
  const suggestedPrompts: string[] = [];

  const presetSpec = ARCHITECTURAL_DESIGN_PRESETS[mem.designPresetId] || ARCHITECTURAL_DESIGN_PRESETS.modern_minimalist;

  if (mem.isBriefComplete) {
    reply = `Excellent! I have compiled your complete Architectural Project Brief:

• **Project**: ${mem.projectName}
• **Typology**: ${mem.typology === "duplex_vertical" ? "G+1 Vertical Duplex" : mem.typology === "villa" ? "Independent Luxury Villa" : mem.typology === "apartment" ? "Urban Apartment" : "Single-Family Bungalow"} (${mem.floorsCount} Level${mem.floorsCount > 1 ? "s" : ""})
• **Spatial Programme**: ${mem.bhkCount} Bedrooms • ${mem.bathroomsCount} Bathrooms • Living & Dining • Kitchen
• **Design Aesthetic**: ${presetSpec.name} (${presetSpec.tagline})
• **Site Orientation**: ${mem.orientation}-Facing frontage • ${mem.vaastuCompliant ? "Vaastu Shastra Compliant" : "NBC 2024 Standards"}
• **Included Amenities**: ${mem.amenities.map(a => a.replace(/_/g, " ")).join(", ")}

Your requirements are fully mapped into our BIM engine. Click **"Launch CAD Studio"** below to generate the precision millimeter floor plan and enter the interactive 2D/3D workspace.`;

    suggestedPrompts.push("Launch CAD Studio", "Change to Scandinavian style", "Add double-height mezzanine");
  } else if (missing.includes("bedrooms")) {
    reply = `A ${mem.typology === "duplex_vertical" ? "Duplex residence" : mem.typology} is a wonderful starting foundation! How many bedrooms and bathrooms would you like to accommodate in this design (e.g. 3BHK with 3 attached baths, or a 4BHK family layout)?`;
    suggestedPrompts.push("3BHK with 3 bathrooms", "4BHK luxury suite", "2BHK compact layout");
  } else if (missing.includes("style")) {
    reply = `Got it: programming a ${mem.bhkCount}BHK ${mem.typology === "duplex_vertical" ? "Duplex" : mem.typology}. What architectural style and interior atmosphere do you envision? We can tailor materials for **Scandinavian Hygge** (blonde teak & plaster), **Japandi Zen** (warm greige & timber), **Modern Minimalist**, or **Contemporary Luxury** (marble & brass).`;
    suggestedPrompts.push("Scandinavian Hygge with natural wood", "Japandi Zen minimalist", "Contemporary Luxury with marble");
  } else if (missing.includes("orientation")) {
    reply = `Understood — ${mem.bhkCount}BHK in ${presetSpec.name} aesthetic. To ensure optimal natural daylighting and thermal orientation, which direction does your plot or entrance face (North, East, South, or West)?`;
    suggestedPrompts.push("North-facing entrance (Vaastu aligned)", "East-facing frontage", "West-facing roadside");
  } else {
    reply = `I have updated your design parameters for ${mem.projectName}: ${mem.bhkCount}BHK ${mem.typology.replace("_", " ")} in ${presetSpec.name} style facing ${mem.orientation}. Would you like to include any specific spaces like a double-height living void, dedicated home studio, or puja room?`;
    suggestedPrompts.push("Add double-height void & home office", "Include puja room and balcony", "Looks great, proceed to CAD!");
  }

  mem.consultantSummary = `${mem.bhkCount}BHK ${mem.typology} • ${presetSpec.name} • ${mem.orientation}-Facing`;

  return {
    reply,
    updatedMemory: mem,
    suggestedPrompts,
    isReadyForLaunch: mem.isBriefComplete,
  };
}

/**
 * Instantiates, populates with architectural BIM geometry, and persists
 * a project directly from the structured AI intake memory.
 */
export async function instantiateProjectFromMemory(
  memory: StructuredProjectMemory
): Promise<Project> {
  const isDuplex = memory.typology === "duplex_vertical" || memory.typology === "duplex_side_by_side" || memory.floorsCount >= 2;
  const initialFloorCount = isDuplex ? Math.max(2, memory.floorsCount) : 1;

  const preferredUnit: PreferredUnit = "m";
  const unitSystem: UnitSystem = "metric";

  const plotWidthMm = memory.plotDimensions.widthM * 1000;
  const plotDepthMm = memory.plotDimensions.depthM * 1000;

  const siteContext: SiteContext = {
    roadFacing: memory.orientation,
    northAngleDegrees: memory.orientation === "N" ? 0 : memory.orientation === "E" ? 90 : memory.orientation === "S" ? 180 : 270,
    setbacks: {
      front: 3000,
      rear: 1500,
      left: 1500,
      right: 1500,
    },
  };

  // 1. Create base project via factory
  const project = createProject({
    name: memory.projectName,
    plotWidthMm,
    plotDepthMm,
    preferredUnit,
    unitSystem,
    floorsCount: initialFloorCount,
    style: memory.architecturalStyle,
    typology: memory.typology,
    siteContext,
    duplexConfig: isDuplex ? {
      internalStairs: true,
      doubleHeightVoid: memory.amenities.includes("double_height"),
      stairType: memory.stairType,
    } : undefined,
    priorities: memory.priorities,
    constraints: memory.vaastuCompliant ? ["Vaastu Shastra Compliant"] : [],
    description: memory.consultantSummary,
  });

  // 2. Populate Architectural Layout based on typology & bedroom count
  if (isDuplex && project.floors.length >= 2) {
    const duplexData = buildDuplexLayout(project.floors[0].id, project.floors[1].id);
    
    // Assign Ground Floor
    project.floors[0].walls = duplexData.groundFloor.walls;
    project.floors[0].rooms = duplexData.groundFloor.rooms;
    project.floors[0].props = duplexData.groundFloor.props;
    project.floors[0].stairs = duplexData.groundFloor.stairs;
    project.floors[0].columns = duplexData.groundFloor.columns;
    project.floors[0].voids = duplexData.groundFloor.voids;

    // Assign First Floor
    project.floors[1].walls = duplexData.firstFloor.walls;
    project.floors[1].rooms = duplexData.firstFloor.rooms;
    project.floors[1].props = duplexData.firstFloor.props;
    project.floors[1].stairs = duplexData.firstFloor.stairs;
    project.floors[1].columns = duplexData.firstFloor.columns;
    project.floors[1].voids = duplexData.firstFloor.voids;

  } else if (memory.bhkCount === 1) {
    const layout = build1BHKLayout(project.floors[0].id);
    project.floors[0].walls = layout.walls;
    project.floors[0].rooms = layout.rooms;
    project.floors[0].props = layout.props;

  } else {
    // 2BHK / 3BHK Single Level
    const layout = build2BHKLayout(project.floors[0].id);
    project.floors[0].walls = layout.walls;
    project.floors[0].rooms = layout.rooms;
    project.floors[0].props = layout.props;

    if (memory.bhkCount >= 3) {
      // Append additional bedroom suite
      const suite = buildBedroomSuite(project.floors[0].id, 11000, 4500, "Bedroom 3 Suite");
      project.floors[0].walls.push(...suite.walls);
      project.floors[0].rooms.push(...suite.rooms);
      if (project.floors[0].props) {
        project.floors[0].props.push(...suite.props);
      }
    }
  }

  // 3. Apply Architectural Design Preset
  applyDesignPresetToProject(project, memory.designPresetId);

  // 4. Attach Structured AI Brief
  const aiBrief: ProjectAiBrief = {
    clientVision: memory.consultantSummary,
    targetTypology: memory.typology,
    targetLevels: memory.floorsCount,
    bhkCount: memory.bhkCount,
    bathroomsCount: memory.bathroomsCount,
    architecturalStyle: memory.architecturalStyle,
    designPresetId: memory.designPresetId,
    siteOrientation: memory.orientation,
    amenities: memory.amenities,
    budgetTier: memory.budgetTier,
    consultantNotes: `Algorithmic BIM layout instantiated with ${memory.vaastuCompliant ? "Vaastu" : "NBC"} orientation rules.`,
    generatedAt: new Date().toISOString(),
  };
  project.aiBrief = aiBrief;

  // 5. Persist to repository
  await projectRepository.save(project);

  return project;
}
