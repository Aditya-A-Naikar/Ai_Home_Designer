import * as THREE from "three";
import { Prop } from "@/core/domain/types";

/**
 * Procedural 3D Architectural Furniture & Interior Props Factory
 * Generates crisp architectural CAD models with proper geometry, scales, and materials.
 */

// Shared reusable materials to keep GPU draw calls low and FPS high
const woodMat = new THREE.MeshStandardMaterial({
  color: 0x3e2723, // Deep Teak Wood
  roughness: 0.5,
  metalness: 0.1,
});

const fabricMat = new THREE.MeshStandardMaterial({
  color: 0x334155, // Charcoal Slate Fabric
  roughness: 0.85,
  metalness: 0.0,
});

const bedLinenMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9, // Crisp White Linen
  roughness: 0.9,
  metalness: 0.0,
});

const pillowMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, // White
  roughness: 0.95,
  metalness: 0.0,
});

const marbleMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc, // Calacatta / Marble white
  roughness: 0.2,
  metalness: 0.1,
});

const ceramicMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, // Glossy white porcelain
  roughness: 0.15,
  metalness: 0.05,
});

const chromeMat = new THREE.MeshStandardMaterial({
  color: 0xd1d5db, // Polished Chrome
  roughness: 0.1,
  metalness: 0.9,
});

const darkGlassMat = new THREE.MeshPhysicalMaterial({
  color: 0x0f172a,
  roughness: 0.1,
  metalness: 0.2,
  transmission: 0.6,
  transparent: true,
  opacity: 0.7,
});

const carPaintMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b, // Metallic graphite
  roughness: 0.3,
  metalness: 0.7,
});

export function createProp3DMesh(prop: Prop): THREE.Group {
  const group = new THREE.Group();
  const widthM = (prop.dimensions?.width || 1000) / 1000;
  const depthM = (prop.dimensions?.depth || 1000) / 1000;
  const heightM = (prop.dimensions?.height || 800) / 1000;

  const type = prop.propType || "sofa";

  if (type === "bed") {
    // Bed frame
    const frameGeo = new THREE.BoxGeometry(widthM, 0.3, depthM);
    const frame = new THREE.Mesh(frameGeo, woodMat);
    frame.position.set(0, 0.15, 0);
    frame.castShadow = true;
    group.add(frame);

    // Headboard
    const headboardH = 0.9;
    const headboardGeo = new THREE.BoxGeometry(widthM, headboardH, 0.1);
    const headboard = new THREE.Mesh(headboardGeo, woodMat);
    headboard.position.set(0, headboardH / 2, -depthM / 2 + 0.05);
    headboard.castShadow = true;
    group.add(headboard);

    // Mattress
    const matGeo = new THREE.BoxGeometry(widthM * 0.94, 0.25, depthM * 0.9);
    const mat = new THREE.Mesh(matGeo, bedLinenMat);
    mat.position.set(0, 0.4, 0.05);
    mat.castShadow = true;
    group.add(mat);

    // Pillows
    const pillowW = widthM > 1.4 ? (widthM * 0.4) : (widthM * 0.7);
    const pGeo = new THREE.BoxGeometry(pillowW, 0.1, 0.35);
    if (widthM > 1.4) {
      // 2 pillows
      const p1 = new THREE.Mesh(pGeo, pillowMat);
      p1.position.set(-widthM * 0.23, 0.55, -depthM / 2 + 0.3);
      group.add(p1);

      const p2 = new THREE.Mesh(pGeo, pillowMat);
      p2.position.set(widthM * 0.23, 0.55, -depthM / 2 + 0.3);
      group.add(p2);
    } else {
      const p1 = new THREE.Mesh(pGeo, pillowMat);
      p1.position.set(0, 0.55, -depthM / 2 + 0.3);
      group.add(p1);
    }
  } else if (type === "sofa") {
    // Base seat cushion
    const seatH = 0.45;
    const seatGeo = new THREE.BoxGeometry(widthM, seatH, depthM * 0.85);
    const seat = new THREE.Mesh(seatGeo, fabricMat);
    seat.position.set(0, seatH / 2, 0);
    seat.castShadow = true;
    group.add(seat);

    // Backrest
    const backH = 0.4;
    const backGeo = new THREE.BoxGeometry(widthM, backH, depthM * 0.2);
    const back = new THREE.Mesh(backGeo, fabricMat);
    back.position.set(0, seatH + backH / 2, -depthM * 0.4 + 0.08);
    back.castShadow = true;
    group.add(back);

    // Armrests
    const armW = 0.14;
    const armH = 0.25;
    const armGeo = new THREE.BoxGeometry(armW, armH, depthM * 0.85);

    const armLeft = new THREE.Mesh(armGeo, fabricMat);
    armLeft.position.set(-widthM / 2 + armW / 2, seatH + armH / 2, 0);
    group.add(armLeft);

    const armRight = new THREE.Mesh(armGeo, fabricMat);
    armRight.position.set(widthM / 2 - armW / 2, seatH + armH / 2, 0);
    group.add(armRight);
  } else if (type === "dining_table") {
    // Tabletop
    const topThick = 0.05;
    const topH = 0.75;
    const topGeo = new THREE.BoxGeometry(widthM, topThick, depthM);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.set(0, topH, 0);
    top.castShadow = true;
    group.add(top);

    // 4 Corner Legs
    const legW = 0.06;
    const legGeo = new THREE.BoxGeometry(legW, topH, legW);
    const legOffsets = [
      [-widthM / 2 + legW, -depthM / 2 + legW],
      [widthM / 2 - legW, -depthM / 2 + legW],
      [widthM / 2 - legW, depthM / 2 - legW],
      [-widthM / 2 + legW, depthM / 2 - legW],
    ];
    legOffsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(ox, topH / 2, oz);
      leg.castShadow = true;
      group.add(leg);
    });
  } else if (type === "coffee_table") {
    const tableH = 0.42;
    const topGeo = new THREE.BoxGeometry(widthM, 0.04, depthM);
    const top = new THREE.Mesh(topGeo, marbleMat);
    top.position.set(0, tableH, 0);
    top.castShadow = true;
    group.add(top);

    const baseGeo = new THREE.BoxGeometry(widthM * 0.8, tableH, depthM * 0.8);
    const base = new THREE.Mesh(baseGeo, woodMat);
    base.position.set(0, tableH / 2, 0);
    base.castShadow = true;
    group.add(base);
  } else if (type === "desk") {
    const deskH = 0.76;
    const topGeo = new THREE.BoxGeometry(widthM, 0.04, depthM);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.set(0, deskH, 0);
    top.castShadow = true;
    group.add(top);

    // Side metal legs
    const legGeo = new THREE.BoxGeometry(0.05, deskH, depthM * 0.9);
    const l1 = new THREE.Mesh(legGeo, chromeMat);
    l1.position.set(-widthM / 2 + 0.05, deskH / 2, 0);
    group.add(l1);

    const l2 = new THREE.Mesh(legGeo, chromeMat);
    l2.position.set(widthM / 2 - 0.05, deskH / 2, 0);
    group.add(l2);
  } else if (type === "wardrobe") {
    const wardH = heightM || 2.2;
    const bodyGeo = new THREE.BoxGeometry(widthM, wardH, depthM);
    const body = new THREE.Mesh(bodyGeo, woodMat);
    body.position.set(0, wardH / 2, 0);
    body.castShadow = true;
    group.add(body);

    // Handles
    const handleGeo = new THREE.BoxGeometry(0.02, 0.4, 0.02);
    const h1 = new THREE.Mesh(handleGeo, chromeMat);
    h1.position.set(-0.05, wardH * 0.5, depthM / 2 + 0.015);
    group.add(h1);
    const h2 = new THREE.Mesh(handleGeo, chromeMat);
    h2.position.set(0.05, wardH * 0.5, depthM / 2 + 0.015);
    group.add(h2);
  } else if (type.includes("counter") || type === "hob_cooktop" || type === "sink") {
    const counterH = 0.9;
    const baseGeo = new THREE.BoxGeometry(widthM, counterH - 0.05, depthM);
    const base = new THREE.Mesh(baseGeo, woodMat);
    base.position.set(0, (counterH - 0.05) / 2, 0);
    base.castShadow = true;
    group.add(base);

    // Granite Countertop
    const topGeo = new THREE.BoxGeometry(widthM + 0.02, 0.05, depthM + 0.02);
    const top = new THREE.Mesh(topGeo, marbleMat);
    top.position.set(0, counterH - 0.025, 0);
    top.castShadow = true;
    group.add(top);

    if (type === "hob_cooktop") {
      // 4 Burner rings
      const burnerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
      const bMat = chromeMat;
      const b1 = new THREE.Mesh(burnerGeo, bMat);
      b1.position.set(-0.2, counterH + 0.01, -0.1);
      group.add(b1);
      const b2 = new THREE.Mesh(burnerGeo, bMat);
      b2.position.set(0.2, counterH + 0.01, -0.1);
      group.add(b2);
      const b3 = new THREE.Mesh(burnerGeo, bMat);
      b3.position.set(-0.2, counterH + 0.01, 0.1);
      group.add(b3);
      const b4 = new THREE.Mesh(burnerGeo, bMat);
      b4.position.set(0.2, counterH + 0.01, 0.1);
      group.add(b4);
    } else if (type === "sink") {
      // Chrome Faucet
      const faucetGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12);
      const faucet = new THREE.Mesh(faucetGeo, chromeMat);
      faucet.position.set(0, counterH + 0.125, -depthM * 0.3);
      group.add(faucet);
    }
  } else if (type === "refrigerator") {
    const fridgeH = 1.85;
    const fridgeGeo = new THREE.BoxGeometry(widthM, fridgeH, depthM);
    const fridge = new THREE.Mesh(fridgeGeo, chromeMat);
    fridge.position.set(0, fridgeH / 2, 0);
    fridge.castShadow = true;
    group.add(fridge);
  } else if (type === "toilet") {
    // Cistern
    const tankGeo = new THREE.BoxGeometry(widthM * 0.8, 0.45, depthM * 0.35);
    const tank = new THREE.Mesh(tankGeo, ceramicMat);
    tank.position.set(0, 0.55, -depthM * 0.3);
    tank.castShadow = true;
    group.add(tank);

    // Bowl
    const bowlGeo = new THREE.CylinderGeometry(widthM * 0.32, widthM * 0.25, 0.42, 16);
    const bowl = new THREE.Mesh(bowlGeo, ceramicMat);
    bowl.position.set(0, 0.21, 0.08);
    bowl.castShadow = true;
    group.add(bowl);
  } else if (type === "bathtub") {
    const tubGeo = new THREE.BoxGeometry(widthM, 0.55, depthM);
    const tub = new THREE.Mesh(tubGeo, ceramicMat);
    tub.position.set(0, 0.275, 0);
    tub.castShadow = true;
    group.add(tub);
  } else if (type === "shower") {
    const showerH = 2.0;
    const trayGeo = new THREE.BoxGeometry(widthM, 0.08, depthM);
    const tray = new THREE.Mesh(trayGeo, ceramicMat);
    tray.position.set(0, 0.04, 0);
    group.add(tray);

    const glassGeo = new THREE.BoxGeometry(widthM, showerH, 0.02);
    const glass = new THREE.Mesh(glassGeo, darkGlassMat);
    glass.position.set(0, showerH / 2, depthM / 2 - 0.01);
    group.add(glass);
  } else if (type === "car_sedan" || type === "car_suv") {
    const carH = 1.35;
    // Lower body
    const bodyGeo = new THREE.BoxGeometry(widthM, carH * 0.45, depthM);
    const body = new THREE.Mesh(bodyGeo, carPaintMat);
    body.position.set(0, 0.35, 0);
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(widthM * 0.85, carH * 0.5, depthM * 0.55);
    const cabin = new THREE.Mesh(cabinGeo, carPaintMat);
    cabin.position.set(0, 0.75, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshield glass
    const glassGeo = new THREE.BoxGeometry(widthM * 0.86, carH * 0.35, depthM * 0.56);
    const glass = new THREE.Mesh(glassGeo, darkGlassMat);
    glass.position.set(0, 0.75, 0);
    group.add(glass);
  } else {
    // Default architectural prop block
    const blockGeo = new THREE.BoxGeometry(widthM, heightM || 0.7, depthM);
    const block = new THREE.Mesh(blockGeo, woodMat);
    block.position.set(0, (heightM || 0.7) / 2, 0);
    block.castShadow = true;
    group.add(block);
  }

  return group;
}
