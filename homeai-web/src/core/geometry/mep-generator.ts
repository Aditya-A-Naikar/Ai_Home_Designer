import { 
  Floor, 
  ElectricalPoint, 
  PlumbingFixture, 
  HVACPoint,
  Point2D
} from "@/core/domain/types";

/**
 * Computes polygon centroid in mm.
 */
function getPolygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  polygon.forEach(pt => {
    sumX += pt.x;
    sumY += pt.y;
  });
  return {
    x: Math.round(sumX / polygon.length),
    y: Math.round(sumY / polygon.length),
  };
}

/**
 * MEP Automated Generation Engine
 * Generates code-compliant, coordinated electrical, plumbing, and HVAC schematic layouts.
 */
export function generateDefaultMepLayout(floor: Floor): {
  electricalPoints: ElectricalPoint[];
  plumbingFixtures: PlumbingFixture[];
  hvacPoints: HVACPoint[];
} {
  const electricalPoints: ElectricalPoint[] = [];
  const plumbingFixtures: PlumbingFixture[] = [];
  const hvacPoints: HVACPoint[] = [];

  let pointIndex = 1;
  const genId = (prefix: string) => `${prefix}-${floor.id}-${pointIndex++}`;

  // 1. Process Rooms
  floor.rooms.forEach((room) => {
    if (!room.polygon || room.polygon.length < 3) return;
    const center = getPolygonCentroid(room.polygon);
    const roomName = (room.name || "").toLowerCase();

    // A. Habitable Rooms (Living, Bedroom, Dining, Study)
    if (
      roomName.includes("living") || 
      roomName.includes("bed") || 
      roomName.includes("dining") || 
      roomName.includes("study") || 
      roomName.includes("family")
    ) {
      // Ceiling Fan at center
      electricalPoints.push({
        id: genId("elec-fan"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "fan_ceiling",
        position: { x: center.x, y: center.y },
        circuitNumber: "C1",
      });

      // Recessed downlights
      electricalPoints.push({
        id: genId("elec-light"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "light_ceiling",
        position: { x: center.x - 1000, y: center.y - 800 },
        circuitNumber: "C1",
      });
      electricalPoints.push({
        id: genId("elec-light"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "light_ceiling",
        position: { x: center.x + 1000, y: center.y + 800 },
        circuitNumber: "C1",
      });

      // Switch plate near room entrance
      electricalPoints.push({
        id: genId("elec-sw"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "switch_plate",
        position: { x: room.polygon[0].x + 300, y: room.polygon[0].y + 300 },
      });

      // Convenience socket 6A
      electricalPoints.push({
        id: genId("elec-soc6"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "power_socket_6a",
        position: { x: room.polygon[1].x - 400, y: room.polygon[1].y + 200 },
      });

      // Air Conditioner in Bedrooms / Master Living
      if (roomName.includes("bed") || roomName.includes("master")) {
        hvacPoints.push({
          id: genId("hvac-ac"),
          floorId: floor.id,
          roomId: room.id,
          hvacType: "split_ac_indoor",
          position: { x: center.x, y: center.y - 1400 },
        });

        electricalPoints.push({
          id: genId("elec-soc16"),
          floorId: floor.id,
          roomId: room.id,
          pointType: "power_socket_16a",
          position: { x: center.x + 300, y: center.y - 1400 },
          circuitNumber: "C-AC",
        });
      }
    }

    // B. Kitchen Space
    else if (roomName.includes("kitchen") || roomName.includes("utility")) {
      electricalPoints.push({
        id: genId("elec-light"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "light_ceiling",
        position: { x: center.x, y: center.y },
        circuitNumber: "C2",
      });

      // Heavy 16A outlets for microwave/fridge
      electricalPoints.push({
        id: genId("elec-soc16"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "power_socket_16a",
        position: { x: center.x - 800, y: center.y + 500 },
        circuitNumber: "C-KIT",
      });

      // Kitchen Sink
      plumbingFixtures.push({
        id: genId("plumb-sink"),
        floorId: floor.id,
        roomId: room.id,
        fixtureType: "kitchen_sink",
        position: { x: center.x + 800, y: center.y },
        pipeDiameterMm: 75,
      });

      // Kitchen Exhaust
      hvacPoints.push({
        id: genId("hvac-exh"),
        floorId: floor.id,
        roomId: room.id,
        hvacType: "exhaust_fan",
        position: { x: center.x, y: center.y + 1200 },
      });
    }

    // C. Bathrooms / Toilet / Powder
    else if (
      roomName.includes("bath") || 
      roomName.includes("toilet") || 
      roomName.includes("powder") || 
      roomName.includes("ensuite")
    ) {
      electricalPoints.push({
        id: genId("elec-light"),
        floorId: floor.id,
        roomId: room.id,
        pointType: "light_ceiling",
        position: { x: center.x, y: center.y },
        circuitNumber: "C-WET",
      });

      // Water Closet (Toilet)
      plumbingFixtures.push({
        id: genId("plumb-wc"),
        floorId: floor.id,
        roomId: room.id,
        fixtureType: "water_closet",
        position: { x: center.x - 600, y: center.y },
        pipeDiameterMm: 110, // Standard 110mm soil stack
      });

      // Wash Basin
      plumbingFixtures.push({
        id: genId("plumb-basin"),
        floorId: floor.id,
        roomId: room.id,
        fixtureType: "wash_basin",
        position: { x: center.x + 600, y: center.y - 400 },
        pipeDiameterMm: 50,
      });

      // Shower Drain Trap
      plumbingFixtures.push({
        id: genId("plumb-drain"),
        floorId: floor.id,
        roomId: room.id,
        fixtureType: "shower_drain",
        position: { x: center.x + 400, y: center.y + 600 },
        pipeDiameterMm: 75,
      });

      // Vertical Plumbing Chase / Shaft (for duplex stacking)
      plumbingFixtures.push({
        id: genId("plumb-chase"),
        floorId: floor.id,
        roomId: room.id,
        fixtureType: "vertical_pipe_chase",
        position: { x: center.x - 800, y: center.y + 800 },
        pipeDiameterMm: 150,
      });

      // Exhaust Fan
      hvacPoints.push({
        id: genId("hvac-exh"),
        floorId: floor.id,
        roomId: room.id,
        hvacType: "exhaust_fan",
        position: { x: center.x - 800, y: center.y - 600 },
      });
    }
  });

  // 2. Main Distribution Board (DB) on Ground Level
  if (floor.level === 0 || floor.name.toLowerCase().includes("ground")) {
    const mainPos = floor.rooms[0]?.polygon?.[0] || { x: 1200, y: 1200 };
    electricalPoints.push({
      id: genId("elec-db"),
      floorId: floor.id,
      pointType: "distribution_board",
      position: { x: mainPos.x + 200, y: mainPos.y + 200 },
      circuitNumber: "MAIN-DB",
    });
  }

  // 3. Stairs Two-Way Light Switching
  floor.stairs?.forEach((stair) => {
    electricalPoints.push({
      id: genId("elec-2way"),
      floorId: floor.id,
      pointType: "stair_two_way",
      position: { x: stair.position.x - 500, y: stair.position.y },
      circuitNumber: "C-STAIR",
    });
    electricalPoints.push({
      id: genId("elec-light"),
      floorId: floor.id,
      pointType: "light_ceiling",
      position: { x: stair.position.x, y: stair.position.y },
      circuitNumber: "C-STAIR",
    });
  });

  return {
    electricalPoints,
    plumbingFixtures,
    hvacPoints,
  };
}
