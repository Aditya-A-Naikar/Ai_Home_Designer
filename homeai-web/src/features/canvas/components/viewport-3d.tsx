"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { 
  RotateCcw, 
  Sliders, 
  LayoutGrid, 
  Sun, 
  Palette,
  Compass,
  Sparkles,
  Footprints,
  Camera
} from 'lucide-react';
import { 
  calculateSolarPosition, 
  Season 
} from '@/core/geometry/solar-study';
import { 
  FLOOR_FINISHES, 
  WALL_FINISHES, 
  FloorFinishType, 
  WallFinishType,
  getFloorPBRTextures,
  getWallPBRTextures 
} from '@/core/geometry/pbr-materials';
import { Door, Window, Staircase } from '@/core/domain/types';
import { isPointInPolygon } from '@/core/geometry/room-utils';
import { createProp3DMesh } from '@/core/geometry/furniture-3d';
import { WalkthroughController } from '@/core/geometry/walkthrough-controller';
import { AIRenderStudioModal } from './ai-render-studio-modal';
import { Viewport3DCustomizer, Selected3DEntity } from './viewport-3d-customizer';
import { PROP_PRESETS } from '@/core/ai/spatial-planner';
import { Prop } from '@/core/domain/types';
import { v4 as uuidv4 } from 'uuid';

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentProject, addProp, deleteProp, updatePropCustomization } = useProjectStore();
  const { setViewMode, selectSubElement, walkthroughActive, setWalkthroughActive } = useCanvasStore();

  const [selected3DEntity, setSelected3DEntity] = useState<Selected3DEntity | null>(null);

  const [selectedFloorFilter, setSelectedFloorFilter] = useState<'all' | string>('all');
  const [cutawayMode, setCutawayMode] = useState<boolean>(true); // default cutaway at 1.2m
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');

  // Phase 9: Solar Daylighting & PBR Material State
  const [timeOfDay, setTimeOfDay] = useState<number>(10.5); // 10:30 AM
  const [season, setSeason] = useState<Season>('equinox');
  const [showSolarTray, setShowSolarTray] = useState<boolean>(false);
  const [showMaterialTray, setShowMaterialTray] = useState<boolean>(false);
  const [floorFinish, setFloorFinish] = useState<FloorFinishType>('teak_hardwood');
  const [wallFinish, setWallFinish] = useState<WallFinishType>('white_plaster');

  // Phase 11 & Phase 16: Walkthrough & AI Render Studio (Synced directly with global canvas store)
  const walkthroughMode = walkthroughActive;
  const setWalkthroughMode = setWalkthroughActive;
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [currentLevelName, setCurrentLevelName] = useState<string>('Ground Floor');
  const [currentLevelElevationM, setCurrentLevelElevationM] = useState<number>(0);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [showRenderStudio, setShowRenderStudio] = useState<boolean>(false);
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);
  const walkthroughControllerRef = useRef<WalkthroughController | null>(null);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Compute building bounding box center (in meters)
  const centerOffset = useMemo(() => {
    if (!currentProject || currentProject.floors.length === 0) return { x: 0, z: 0 };
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    let found = false;

    currentProject.floors.forEach(floor => {
      floor.walls.forEach(w => {
        found = true;
        minX = Math.min(minX, w.start.x / 1000, w.end.x / 1000);
        minZ = Math.min(minZ, w.start.y / 1000, w.end.y / 1000);
        maxX = Math.max(maxX, w.start.x / 1000, w.end.x / 1000);
        maxZ = Math.max(maxZ, w.start.y / 1000, w.end.y / 1000);
      });
    });

    if (!found) return { x: 0, z: 0 };
    return {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2
    };
  }, [currentProject]);

  // Compute live True-North solar calculations
  const solarData = useMemo(() => {
    const northAngle = currentProject?.siteContext?.northAngleDegrees ?? 0;
    return calculateSolarPosition({
      timeHours: timeOfDay,
      season,
      northAngleDeg: northAngle,
    });
  }, [timeOfDay, season, currentProject]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !currentProject) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate-50 studio background

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 18, 20);
    cameraRef.current = camera;

    // 3. Renderer with Soft Contact Shadows, preserveDrawingBuffer, & ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls & Walkthrough Controller
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Restrict going below ground
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;

    setActiveCanvas(renderer.domElement);
    const wtController = new WalkthroughController(camera);
    walkthroughControllerRef.current = wtController;

    if (walkthroughMode) {
      controls.enabled = false;
      wtController.enable({ x: 0, z: 0 }, 0);
    }

    // 5. Dynamic Solar Lighting Engine (True-North Daylight)
    const ambientLight = new THREE.AmbientLight(0xffffff, solarData.ambientIntensity);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x64748b, solarData.ambientIntensity * 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(
      new THREE.Color(solarData.colorHex),
      solarData.lightIntensity
    );
    sunLight.position.set(
      solarData.sunPosition.x,
      solarData.sunPosition.y,
      solarData.sunPosition.z
    );
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 30;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 6. Ground Plane & Architectural CAD Grid
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0xf1f5f9, 
      roughness: 0.9, 
      metalness: 0.05 
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const gridHelper = new THREE.GridHelper(60, 60, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 7. PBR Architectural Materials
    const activeWallSpec = WALL_FINISHES[wallFinish];
    const activeFloorSpec = FLOOR_FINISHES[floorFinish];
    const floorTextures = getFloorPBRTextures(floorFinish);
    const wallTextures = getWallPBRTextures(wallFinish);

    const wallExteriorMat = new THREE.MeshStandardMaterial({
      color: activeWallSpec.colorHex,
      roughness: activeWallSpec.roughness,
      metalness: activeWallSpec.metalness,
      map: wallTextures.map || null,
      bumpMap: wallTextures.bumpMap || null,
      bumpScale: wallTextures.bumpScale || 0.005,
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Structural concrete core
      roughness: 0.65,
      metalness: 0.1,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.92,
      opacity: 0.75,
      transparent: true,
      roughness: 0.05,
      ior: 1.52,
      reflectivity: 0.6,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Anodized architectural charcoal
      roughness: 0.35,
      metalness: 0.7,
    });

    const woodTreadMat = new THREE.MeshStandardMaterial({
      color: activeFloorSpec.id === 'teak_hardwood' ? 0xc27838 : 0x78350f,
      roughness: 0.45,
      metalness: 0.05,
      map: floorTextures.map || null,
      bumpMap: floorTextures.bumpMap || null,
      bumpScale: 0.004,
    });

    const riserMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.7,
      metalness: 0.02,
    });

    const skirtingMat = new THREE.MeshStandardMaterial({
      color: activeFloorSpec.id === 'teak_hardwood' ? 0x92400e : 0x334155,
      roughness: 0.45,
      metalness: 0.05,
    });

    const wallCapMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5,
    });

    const doorJambMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.6,
    });

    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.1,
    });

    const brassHandleMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Brushed Brass
      roughness: 0.25,
      metalness: 0.85,
    });

    const windowSillMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Architectural stone sill
      roughness: 0.75,
      metalness: 0.05,
    });

    // --- Architectural Component Builders ---
    function createDetailedDoor(widthM: number, heightM: number, thicknessM: number): THREE.Group {
      const group = new THREE.Group();
      const jambW = 0.05;
      const jambDepth = thicknessM + 0.02;

      // Outer Jambs
      const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, heightM, jambDepth), doorJambMat);
      leftJamb.position.set(-widthM / 2 + jambW / 2, heightM / 2, 0);
      leftJamb.castShadow = true;
      group.add(leftJamb);

      const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, heightM, jambDepth), doorJambMat);
      rightJamb.position.set(widthM / 2 - jambW / 2, heightM / 2, 0);
      rightJamb.castShadow = true;
      group.add(rightJamb);

      const topJamb = new THREE.Mesh(new THREE.BoxGeometry(widthM, jambW, jambDepth), doorJambMat);
      topJamb.position.set(0, heightM - jambW / 2, 0);
      topJamb.castShadow = true;
      group.add(topJamb);

      // Inset Door Panel
      const leafW = widthM - jambW * 2;
      const leafH = heightM - jambW;
      const leafThick = 0.04;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, leafThick), doorLeafMat);
      leaf.position.set(0, leafH / 2, -0.01);
      leaf.castShadow = true;
      group.add(leaf);

      // Brushed Brass Lever Handle & Backplate
      const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.005), brassHandleMat);
      backplate.position.set(widthM / 2 - jambW - 0.08, 0.95, leafThick / 2 + 0.002);
      group.add(backplate);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), brassHandleMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(widthM / 2 - jambW - 0.08, 0.95, leafThick / 2 + 0.02);
      group.add(handle);

      // Stainless Steel Butt Hinges
      [0.25, heightM - 0.25].forEach((hingeY) => {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 12), frameMat);
        hinge.position.set(-widthM / 2 + jambW + 0.005, hingeY, -0.01);
        group.add(hinge);
      });

      // Protective Kick Plate along bottom of door leaf
      const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.02, 0.08, 0.003), brassHandleMat);
      kickPlate.position.set(0, 0.05, leafThick / 2 + 0.001);
      group.add(kickPlate);

      return group;
    }

    function createDetailedWindow(widthM: number, heightM: number, thicknessM: number): THREE.Group {
      const group = new THREE.Group();
      const frameW = 0.05;
      const frameD = thicknessM + 0.01;

      // Outer Perimeter Frame
      const leftF = new THREE.Mesh(new THREE.BoxGeometry(frameW, heightM, frameD), frameMat);
      leftF.position.set(-widthM / 2 + frameW / 2, heightM / 2, 0);
      leftF.castShadow = true;
      group.add(leftF);

      const rightF = new THREE.Mesh(new THREE.BoxGeometry(frameW, heightM, frameD), frameMat);
      rightF.position.set(widthM / 2 - frameW / 2, heightM / 2, 0);
      rightF.castShadow = true;
      group.add(rightF);

      const topF = new THREE.Mesh(new THREE.BoxGeometry(widthM, frameW, frameD), frameMat);
      topF.position.set(0, heightM - frameW / 2, 0);
      topF.castShadow = true;
      group.add(topF);

      const btmF = new THREE.Mesh(new THREE.BoxGeometry(widthM, frameW, frameD), frameMat);
      btmF.position.set(0, frameW / 2, 0);
      btmF.castShadow = true;
      group.add(btmF);

      // Center Mullion for wide windows
      if (widthM > 1.2) {
        const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.035, heightM - frameW * 2, frameD * 0.9), frameMat);
        mullionV.position.set(0, heightM / 2, 0);
        group.add(mullionV);
      }

      // Double-Glazed Glass Pane
      const glassW = widthM - frameW * 2;
      const glassH = heightM - frameW * 2;
      const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(glassW, glassH, 0.015), glassMat);
      glassMesh.position.set(0, heightM / 2, 0);
      group.add(glassMesh);

      // Exterior Window Sill with Projection and Drip Edge
      const sillDepth = thicknessM / 2 + 0.08;
      const sillMesh = new THREE.Mesh(
        new THREE.BoxGeometry(widthM + 0.08, 0.04, sillDepth),
        windowSillMat
      );
      sillMesh.position.set(0, -0.02, sillDepth / 2 - thicknessM / 4);
      sillMesh.castShadow = true;
      group.add(sillMesh);

      // Exterior Concrete Sunshade / Chajja (Lintel projection)
      const chajjaDepth = 0.35;
      const chajja = new THREE.Mesh(
        new THREE.BoxGeometry(widthM + 0.16, 0.05, chajjaDepth),
        columnMat
      );
      chajja.position.set(0, heightM + 0.025, chajjaDepth / 2 - thicknessM / 4);
      chajja.castShadow = true;
      group.add(chajja);

      return group;
    }

    function createDetailedStaircase(st: Staircase, totalHeightM: number): THREE.Group {
      const group = new THREE.Group();
      const stairWidthM = (st.width || 1000) / 1000;
      const stairLengthM = (st.length || 2400) / 1000;
      const steps = Math.max(12, st.stepCount || 18);
      const stairType = st.stairType || "straight";

      if (stairType === "dog_leg") {
        const flightWM = (stairWidthM - 0.1) / 2;
        const landingDepthM = flightWM;
        const flightRunM = Math.max(0.6, stairLengthM - landingDepthM);
        const stepsPerFlight = Math.ceil(steps / 2);
        const riserH = (totalHeightM / 2) / stepsPerFlight;
        const treadL = flightRunM / stepsPerFlight;

        // Flight 1: Left Flight (ascending from z = stairLengthM to z = landingDepthM)
        for (let i = 0; i < stepsPerFlight; i++) {
          const stepY = i * riserH;
          const stepZ = stairLengthM - (i + 1) * treadL;

          const treadMesh = new THREE.Mesh(
            new THREE.BoxGeometry(flightWM, 0.035, treadL + 0.02),
            woodTreadMat
          );
          treadMesh.position.set(flightWM / 2, stepY + riserH, stepZ + treadL / 2);
          treadMesh.castShadow = true;
          treadMesh.receiveShadow = true;
          group.add(treadMesh);

          const riserMesh = new THREE.Mesh(
            new THREE.BoxGeometry(flightWM, riserH, 0.02),
            riserMat
          );
          riserMesh.position.set(flightWM / 2, stepY + riserH / 2, stepZ + treadL);
          riserMesh.receiveShadow = true;
          group.add(riserMesh);
        }

        // Flight 1 Railing & Balustrade
        const f1Len = Math.hypot(flightRunM, totalHeightM / 2);
        const f1Angle = Math.atan2(totalHeightM / 2, flightRunM);
        const f1Rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, f1Len), frameMat);
        f1Rail.position.set(0.02, totalHeightM / 4 + 0.9, stairLengthM - flightRunM / 2);
        f1Rail.rotation.x = f1Angle;
        group.add(f1Rail);

        const f1Glass = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.85, f1Len), glassMat);
        f1Glass.position.set(0.02, totalHeightM / 4 + 0.45, stairLengthM - flightRunM / 2);
        f1Glass.rotation.x = f1Angle;
        group.add(f1Glass);

        // Mid-Landing at totalHeightM / 2
        const landingH = totalHeightM / 2;
        const landingMesh = new THREE.Mesh(
          new THREE.BoxGeometry(stairWidthM, 0.12, landingDepthM),
          woodTreadMat
        );
        landingMesh.position.set(stairWidthM / 2, landingH - 0.06, landingDepthM / 2);
        landingMesh.castShadow = true;
        landingMesh.receiveShadow = true;
        group.add(landingMesh);

        // Landing Back Railing
        const landRail = new THREE.Mesh(new THREE.BoxGeometry(stairWidthM, 0.04, 0.04), frameMat);
        landRail.position.set(stairWidthM / 2, landingH + 0.9, 0.02);
        group.add(landRail);

        const landGlass = new THREE.Mesh(new THREE.BoxGeometry(stairWidthM, 0.85, 0.015), glassMat);
        landGlass.position.set(stairWidthM / 2, landingH + 0.45, 0.02);
        group.add(landGlass);

        // Flight 2: Right Flight (ascending from z = landingDepthM to z = stairLengthM)
        const f2StartX = stairWidthM - flightWM;
        for (let i = 0; i < stepsPerFlight; i++) {
          const stepY = landingH + i * riserH;
          const stepZ = landingDepthM + i * treadL;

          const treadMesh = new THREE.Mesh(
            new THREE.BoxGeometry(flightWM, 0.035, treadL + 0.02),
            woodTreadMat
          );
          treadMesh.position.set(f2StartX + flightWM / 2, stepY + riserH, stepZ + treadL / 2);
          treadMesh.castShadow = true;
          treadMesh.receiveShadow = true;
          group.add(treadMesh);

          const riserMesh = new THREE.Mesh(
            new THREE.BoxGeometry(flightWM, riserH, 0.02),
            riserMat
          );
          riserMesh.position.set(f2StartX + flightWM / 2, stepY + riserH / 2, stepZ);
          riserMesh.receiveShadow = true;
          group.add(riserMesh);
        }

        // Flight 2 Railing & Balustrade
        const f2Rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, f1Len), frameMat);
        f2Rail.position.set(stairWidthM - 0.02, landingH + totalHeightM / 4 + 0.9, landingDepthM + flightRunM / 2);
        f2Rail.rotation.x = -f1Angle;
        group.add(f2Rail);

        const f2Glass = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.85, f1Len), glassMat);
        f2Glass.position.set(stairWidthM - 0.02, landingH + totalHeightM / 4 + 0.45, landingDepthM + flightRunM / 2);
        f2Glass.rotation.x = -f1Angle;
        group.add(f2Glass);

        // Central Structural Spine / Stringer
        const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.08, totalHeightM, stairLengthM), columnMat);
        stringer.position.set(flightWM + 0.05, totalHeightM / 2, stairLengthM / 2);
        group.add(stringer);

      } else {
        // Straight Flight
        const riserH = totalHeightM / steps;
        const treadL = stairLengthM / steps;

        for (let i = 0; i < steps; i++) {
          const stepY = i * riserH;
          const stepZ = stairLengthM - (i + 1) * treadL;

          const treadMesh = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidthM, 0.035, treadL + 0.02),
            woodTreadMat
          );
          treadMesh.position.set(stairWidthM / 2, stepY + riserH, stepZ + treadL / 2);
          treadMesh.castShadow = true;
          treadMesh.receiveShadow = true;
          group.add(treadMesh);

          const riserMesh = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidthM, riserH, 0.02),
            riserMat
          );
          riserMesh.position.set(stairWidthM / 2, stepY + riserH / 2, stepZ + treadL);
          riserMesh.receiveShadow = true;
          group.add(riserMesh);
        }

        const slopeLen = Math.hypot(stairLengthM, totalHeightM);
        const slopeAngle = Math.atan2(totalHeightM, stairLengthM);

        [-1, 1].forEach((side) => {
          const railX = side === -1 ? 0.02 : stairWidthM - 0.02;
          const railMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, slopeLen), frameMat);
          railMesh.position.set(railX, totalHeightM / 2 + 0.9, stairLengthM / 2);
          railMesh.rotation.x = slopeAngle;
          group.add(railMesh);

          const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.85, slopeLen), glassMat);
          glassMesh.position.set(railX, totalHeightM / 2 + 0.45, stairLengthM / 2);
          glassMesh.rotation.x = slopeAngle;
          group.add(glassMesh);
        });
      }

      return group;
    }

    // Determine wall height based on cutaway mode
    const defaultWallHeight = cutawayMode ? 1.2 : 2.8;

    // Filter floors based on selector
    const floorsToRender = currentProject.floors.filter(f => {
      if (selectedFloorFilter === 'all') return true;
      return f.id === selectedFloorFilter;
    });

    // 8. BUILD 3D GEOMETRY FOR EACH FLOOR
    floorsToRender.forEach((floor) => {
      const floorElevationM = (floor.elevation || 0) / 1000;
      const wallHeightM = defaultWallHeight;

      // A. Rooms (PBR Floor Slabs with Through-Hole Punching for Stairs and Voids)
      floor.rooms.forEach((room) => {
        if (!room.polygon || room.polygon.length < 3) return;

        const shape = new THREE.Shape();
        room.polygon.forEach((pt, idx) => {
          const px = (pt.x / 1000) - centerOffset.x;
          const pz = (pt.y / 1000) - centerOffset.z;
          if (idx === 0) shape.moveTo(px, -pz);
          else shape.lineTo(px, -pz);
        });

        // Punch through-holes for staircases connecting from below
        const lowerFloor = currentProject.floors.find(f => (f.elevation || 0) < (floor.elevation || 0));
        if (lowerFloor?.stairs && lowerFloor.stairs.length > 0) {
          lowerFloor.stairs.forEach(st => {
            const anchorX = st.position.x / 1000 - centerOffset.x;
            const anchorZ = st.position.y / 1000 - centerOffset.z;
            const w = (st.width || 1000) / 1000;
            const l = (st.length || 2400) / 1000;
            const rad = ((st.rotation || 0) * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const corners = [
              { x: 0, z: 0 },
              { x: w, z: 0 },
              { x: w, z: l },
              { x: 0, z: l },
            ].map(c => ({
              x: anchorX + (c.x * cos - c.z * sin),
              z: anchorZ + (c.x * sin + c.z * cos),
            }));

            const centerX = (corners[0].x + corners[2].x) / 2;
            const centerZ = (corners[0].z + corners[2].z) / 2;
            const ptMm = { x: (centerX + centerOffset.x) * 1000, y: (centerZ + centerOffset.z) * 1000 };
            if (isPointInPolygon(ptMm, room.polygon)) {
              const hole = new THREE.Path();
              hole.moveTo(corners[0].x, -corners[0].z);
              hole.lineTo(corners[1].x, -corners[1].z);
              hole.lineTo(corners[2].x, -corners[2].z);
              hole.lineTo(corners[3].x, -corners[3].z);
              hole.closePath();
              shape.holes.push(hole);
            }
          });
        }

        // Punch through-holes for explicit floor slab voids
        floor.voids?.forEach(v => {
          if (v.polygon && v.polygon.length >= 3) {
            const hole = new THREE.Path();
            v.polygon.forEach((pt, idx) => {
              const vx = pt.x / 1000 - centerOffset.x;
              const vz = pt.y / 1000 - centerOffset.z;
              if (idx === 0) hole.moveTo(vx, -vz);
              else hole.lineTo(vx, -vz);
            });
            hole.closePath();
            shape.holes.push(hole);
          }
        });

        const roomFinKey = (room.floorFinishId as FloorFinishType) || floorFinish;
        const roomFinSpec = FLOOR_FINISHES[roomFinKey] || activeFloorSpec;
        const roomFinTextures = getFloorPBRTextures(roomFinKey);

        const slabMat = new THREE.MeshStandardMaterial({
          color: roomFinSpec.colorHex,
          roughness: roomFinSpec.roughness,
          metalness: roomFinSpec.metalness,
          map: roomFinTextures.map || null,
          roughnessMap: roomFinTextures.roughnessMap || null,
          bumpMap: roomFinTextures.bumpMap || null,
          bumpScale: roomFinTextures.bumpScale || 0.004,
        });

        const slabGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.12,
          bevelEnabled: false,
        });

        const slabMesh = new THREE.Mesh(slabGeo, slabMat);
        slabMesh.rotation.x = -Math.PI / 2;
        slabMesh.position.y = floorElevationM + 0.01;
        slabMesh.receiveShadow = true;
        slabMesh.userData = {
          type: 'room',
          id: room.id,
          floorId: floor.id,
          name: room.name,
          floorFinishId: roomFinKey,
        };
        scene.add(slabMesh);

        // Ceiling Plaster Soffit for multi-story buildings (bottom face of upper floor slabs)
        if (floorElevationM > 0.05) {
          const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0xfdfdfd,
            roughness: 0.9,
            metalness: 0.02,
          });
          const soffitGeo = new THREE.ShapeGeometry(shape);
          const soffitMesh = new THREE.Mesh(soffitGeo, ceilingMat);
          soffitMesh.rotation.x = Math.PI / 2;
          soffitMesh.position.y = floorElevationM - 0.11;
          scene.add(soffitMesh);
        }

        // Warm LED Recessed Ceiling Downlight in center of room
        const roomCenter = room.polygon.reduce(
          (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
          { x: 0, y: 0 }
        );
        const rLen = Math.max(1, room.polygon.length);
        const rcX = (roomCenter.x / rLen / 1000) - centerOffset.x;
        const rcZ = (roomCenter.y / rLen / 1000) - centerOffset.z;

        const downlight = new THREE.PointLight(
          0xffedd5,
          cutawayMode ? 0.35 : 0.85,
          9,
          2
        );
        downlight.position.set(rcX, floorElevationM + (cutawayMode ? 1.15 : 2.65), rcZ);
        scene.add(downlight);

        // Ceiling Fixture Trim Ring
        if (!cutawayMode) {
          const fixtureRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16),
            frameMat
          );
          fixtureRing.position.set(rcX, floorElevationM + 2.78, rcZ);
          scene.add(fixtureRing);
        }

        // Balcony & Open Terrace Glass Balustrade (1.0m height)
        const isBalcony = /balcony|terrace|patio|deck|verandah/i.test(room.name);
        if (isBalcony && room.polygon.length >= 3) {
          for (let i = 0; i < room.polygon.length; i++) {
            const p1 = room.polygon[i];
            const p2 = room.polygon[(i + 1) % room.polygon.length];
            const p1x = p1.x / 1000 - centerOffset.x;
            const p1z = p1.y / 1000 - centerOffset.z;
            const p2x = p2.x / 1000 - centerOffset.x;
            const p2z = p2.y / 1000 - centerOffset.z;

            // Check if there is already a wall along this edge
            const midX = (p1x + p2x) / 2;
            const midZ = (p1z + p2z) / 2;
            const hasWall = floor.walls.some(w => {
              const wsx = w.start.x / 1000 - centerOffset.x;
              const wsz = w.start.y / 1000 - centerOffset.z;
              const wex = w.end.x / 1000 - centerOffset.x;
              const wez = w.end.y / 1000 - centerOffset.z;
              const wmx = (wsx + wex) / 2;
              const wmz = (wsz + wez) / 2;
              return Math.hypot(midX - wmx, midZ - wmz) < 0.35;
            });

            if (!hasWall) {
              const bdx = p2x - p1x;
              const bdz = p2z - p1z;
              const bLen = Math.hypot(bdx, bdz);
              const bAng = Math.atan2(bdz, bdx);

              const bGlass = new THREE.Mesh(new THREE.BoxGeometry(bLen, 0.95, 0.015), glassMat);
              bGlass.position.set(midX, floorElevationM + 0.48, midZ);
              bGlass.rotation.y = -bAng;
              scene.add(bGlass);

              const bRail = new THREE.Mesh(new THREE.BoxGeometry(bLen, 0.04, 0.04), frameMat);
              bRail.position.set(midX, floorElevationM + 0.98, midZ);
              bRail.rotation.y = -bAng;
              scene.add(bRail);
            }
          }
        }
      });

      // B. Structural RC Columns
      floor.columns?.forEach((col) => {
        const colWM = (col.width || 230) / 1000;
        const colDM = (col.depth || 450) / 1000;
        const colX = (col.position.x / 1000) - centerOffset.x;
        const colZ = (col.position.y / 1000) - centerOffset.z;

        const colGeo = new THREE.BoxGeometry(colWM, wallHeightM, colDM);
        const colMesh = new THREE.Mesh(colGeo, columnMat);
        colMesh.position.set(colX, floorElevationM + wallHeightM / 2, colZ);
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;
        scene.add(colMesh);
      });

      // C. Walls with Detailed Openings & Baseboards
      floor.walls.forEach((wall) => {
        const sx = wall.start.x / 1000 - centerOffset.x;
        const sz = wall.start.y / 1000 - centerOffset.z;
        const ex = wall.end.x / 1000 - centerOffset.x;
        const ez = wall.end.y / 1000 - centerOffset.z;

        const dx = ex - sx;
        const dz = ez - sz;
        const wallLengthM = Math.hypot(dx, dz);
        if (wallLengthM < 0.1) return;

        const angle = Math.atan2(dz, dx);
        const thicknessM = (wall.thickness || 150) / 1000;
        const isExterior = wall.wallType === 'exterior_bearing';

        const specificWallFinKey = (wall.finishId as WallFinishType) || (isExterior ? 'exposed_brick' : wallFinish);
        const specificWallFinSpec = WALL_FINISHES[specificWallFinKey] || activeWallSpec;
        const specificWallTextures = getWallPBRTextures(specificWallFinKey);
        const specificColor = wall.colorHex || specificWallFinSpec.colorHex;

        const wallMat = new THREE.MeshStandardMaterial({
          color: specificColor,
          roughness: specificWallFinSpec.roughness,
          metalness: specificWallFinSpec.metalness,
          map: specificWallTextures.map || null,
          bumpMap: specificWallTextures.bumpMap || null,
          bumpScale: specificWallTextures.bumpScale || 0.003,
        });

        const wallGroup = new THREE.Group();
        wallGroup.position.set(sx, floorElevationM, sz);
        wallGroup.rotation.y = -angle;

        interface OpeningSpan {
          type: 'door' | 'window';
          startOffset: number;
          endOffset: number;
          widthM: number;
          heightM: number;
          sillM: number;
          obj: Door | Window;
        }
        const openings: OpeningSpan[] = [];

        wall.doors?.forEach(d => {
          const off = d.offset / 1000;
          const w = d.width / 1000;
          const h = (d.height || 2100) / 1000;
          openings.push({
            type: 'door',
            startOffset: Math.max(0, off - w / 2),
            endOffset: Math.min(wallLengthM, off + w / 2),
            widthM: w,
            heightM: Math.min(h, wallHeightM),
            sillM: 0,
            obj: d,
          });
        });

        wall.windows?.forEach(win => {
          const off = win.offset / 1000;
          const w = win.width / 1000;
          const h = (win.height || 1200) / 1000;
          const sill = (win.sillHeight || 900) / 1000;
          openings.push({
            type: 'window',
            startOffset: Math.max(0, off - w / 2),
            endOffset: Math.min(wallLengthM, off + w / 2),
            widthM: w,
            heightM: h,
            sillM: sill,
            obj: win,
          });
        });

        openings.sort((a, b) => a.startOffset - b.startOffset);

        if (openings.length === 0) {
          // Solid Wall Segment
          const solidGeo = new THREE.BoxGeometry(wallLengthM, wallHeightM, thicknessM);
          const solidMesh = new THREE.Mesh(solidGeo, wallMat);
          solidMesh.position.set(wallLengthM / 2, wallHeightM / 2, 0);
          solidMesh.castShadow = true;
          solidMesh.receiveShadow = true;
          wallGroup.add(solidMesh);

          // Baseboard / Skirting Trim along floor
          const skirtMesh = new THREE.Mesh(
            new THREE.BoxGeometry(wallLengthM, 0.08, thicknessM + 0.015),
            skirtingMat
          );
          skirtMesh.position.set(wallLengthM / 2, 0.04, 0);
          wallGroup.add(skirtMesh);

          // Top Wall Coping / Architectural Reveal
          const capMesh = new THREE.Mesh(
            new THREE.BoxGeometry(wallLengthM, 0.03, thicknessM + 0.02),
            wallCapMat
          );
          capMesh.position.set(wallLengthM / 2, wallHeightM - 0.015, 0);
          wallGroup.add(capMesh);
        } else {
          // Segmented Wall with Punctures
          let curX = 0;
          openings.forEach(op => {
            if (op.startOffset > curX) {
              const segLen = op.startOffset - curX;
              const segGeo = new THREE.BoxGeometry(segLen, wallHeightM, thicknessM);
              const segMesh = new THREE.Mesh(segGeo, wallMat);
              segMesh.position.set(curX + segLen / 2, wallHeightM / 2, 0);
              segMesh.castShadow = true;
              segMesh.receiveShadow = true;
              wallGroup.add(segMesh);

              // Skirting trim
              const skirtMesh = new THREE.Mesh(
                new THREE.BoxGeometry(segLen, 0.08, thicknessM + 0.015),
                skirtingMat
              );
              skirtMesh.position.set(curX + segLen / 2, 0.04, 0);
              wallGroup.add(skirtMesh);

              // Top cap trim
              const capMesh = new THREE.Mesh(
                new THREE.BoxGeometry(segLen, 0.03, thicknessM + 0.02),
                wallCapMat
              );
              capMesh.position.set(curX + segLen / 2, wallHeightM - 0.015, 0);
              wallGroup.add(capMesh);
            }

            if (op.type === 'window') {
              // Sub-window sill wall
              if (op.sillM > 0 && op.sillM < wallHeightM) {
                const sillH = Math.min(op.sillM, wallHeightM);
                const sillGeo = new THREE.BoxGeometry(op.widthM, sillH, thicknessM);
                const sillMesh = new THREE.Mesh(sillGeo, wallMat);
                sillMesh.position.set(op.startOffset + op.widthM / 2, sillH / 2, 0);
                sillMesh.castShadow = true;
                sillMesh.receiveShadow = true;
                wallGroup.add(sillMesh);

                // Sub-sill skirting
                const subSkirt = new THREE.Mesh(
                  new THREE.BoxGeometry(op.widthM, 0.08, thicknessM + 0.015),
                  skirtingMat
                );
                subSkirt.position.set(op.startOffset + op.widthM / 2, 0.04, 0);
                wallGroup.add(subSkirt);
              }

              // Window Assembly
              if (!cutawayMode || op.sillM < wallHeightM) {
                const winH = Math.min(op.heightM, Math.max(0, wallHeightM - op.sillM));
                if (winH > 0.1) {
                  const winAssembly = createDetailedWindow(op.widthM, winH, thicknessM);
                  winAssembly.position.set(op.startOffset + op.widthM / 2, op.sillM, 0);
                  wallGroup.add(winAssembly);
                }
              }
            } else if (op.type === 'door') {
              // Detailed Door Assembly
              const doorH = Math.min(op.heightM, wallHeightM);
              const doorAssembly = createDetailedDoor(op.widthM, doorH, thicknessM);
              doorAssembly.position.set(op.startOffset + op.widthM / 2, 0, 0);
              wallGroup.add(doorAssembly);
            }

            curX = op.endOffset;
          });

          // Remaining Wall Segment
          if (curX < wallLengthM) {
            const remLen = wallLengthM - curX;
            const remGeo = new THREE.BoxGeometry(remLen, wallHeightM, thicknessM);
            const remMesh = new THREE.Mesh(remGeo, wallMat);
            remMesh.position.set(curX + remLen / 2, wallHeightM / 2, 0);
            remMesh.castShadow = true;
            remMesh.receiveShadow = true;
            wallGroup.add(remMesh);

            const remSkirt = new THREE.Mesh(
              new THREE.BoxGeometry(remLen, 0.08, thicknessM + 0.015),
              skirtingMat
            );
            remSkirt.position.set(curX + remLen / 2, 0.04, 0);
            wallGroup.add(remSkirt);

            const remCap = new THREE.Mesh(
              new THREE.BoxGeometry(remLen, 0.03, thicknessM + 0.02),
              wallCapMat
            );
            remCap.position.set(curX + remLen / 2, wallHeightM - 0.015, 0);
            wallGroup.add(remCap);
          }
        }

        wallGroup.userData = {
          type: 'wall',
          id: wall.id,
          floorId: floor.id,
          wallType: wall.wallType,
          wallFinishId: specificWallFinKey,
          colorHex: specificColor,
        };
        wallGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.userData = wallGroup.userData;
          }
        });

        scene.add(wallGroup);
      });

      // D. Architectural Staircases (Synchronized with 2D plan)
      floor.stairs?.forEach((st) => {
        const anchorX = st.position.x / 1000 - centerOffset.x;
        const anchorZ = st.position.y / 1000 - centerOffset.z;
        const totalHeightM = (floor.height || 2800) / 1000;

        const stairMesh = createDetailedStaircase(st, totalHeightM);
        stairMesh.position.set(anchorX, floorElevationM, anchorZ);
        stairMesh.rotation.y = -(st.rotation || 0) * (Math.PI / 180);
        scene.add(stairMesh);
      });

      // E. Slab Voids & Glass Balustrades
      floor.voids?.forEach((v) => {
        if (!v.polygon || v.polygon.length < 3) return;

        for (let i = 0; i < v.polygon.length; i++) {
          const p1 = v.polygon[i];
          const p2 = v.polygon[(i + 1) % v.polygon.length];

          const x1 = p1.x / 1000 - centerOffset.x;
          const z1 = p1.y / 1000 - centerOffset.z;
          const x2 = p2.x / 1000 - centerOffset.x;
          const z2 = p2.y / 1000 - centerOffset.z;

          const edx = x2 - x1;
          const edz = z2 - z1;
          const edgeLen = Math.hypot(edx, edz);
          const edgeAngle = Math.atan2(edz, edx);

          const balGeo = new THREE.BoxGeometry(edgeLen, 1.0, 0.02);
          const balMesh = new THREE.Mesh(balGeo, glassMat);
          balMesh.position.set((x1 + x2) / 2, floorElevationM + 0.5, (z1 + z2) / 2);
          balMesh.rotation.y = -edgeAngle;
          scene.add(balMesh);

          // Top handrail
          const hrGeo = new THREE.BoxGeometry(edgeLen, 0.04, 0.04);
          const hrMesh = new THREE.Mesh(hrGeo, frameMat);
          hrMesh.position.set((x1 + x2) / 2, floorElevationM + 1.02, (z1 + z2) / 2);
          hrMesh.rotation.y = -edgeAngle;
          scene.add(hrMesh);
        }
      });

      // F. Architectural Furniture Props
      floor.props?.forEach((p) => {
        const px = p.position.x / 1000 - centerOffset.x;
        const pz = p.position.y / 1000 - centerOffset.z;

        const propMesh = createProp3DMesh(p);
        propMesh.position.set(px, floorElevationM, pz);
        propMesh.rotation.y = -(p.rotation || 0) * (Math.PI / 180);
        propMesh.userData = {
          type: 'prop',
          id: p.id,
          floorId: floor.id,
          name: p.name || p.propType,
          propType: p.propType,
          rotation: p.rotation || 0,
          position: p.position,
        };
        propMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.userData = propMesh.userData;
          }
        });
        scene.add(propMesh);
      });
    });

    // G. ROOF TERRACE & PARAPET COPING (Generated in Full-Height 2.8m Mode)
    if (!cutawayMode && floorsToRender.length > 0) {
      const topFloor = floorsToRender.reduce((prev, curr) => 
        (curr.elevation || 0) > (prev.elevation || 0) ? curr : prev, floorsToRender[0]);

      if (topFloor) {
        const topElevationM = (topFloor.elevation || 0) / 1000;
        const roofElevationM = topElevationM + 2.8;

        const roofSlabMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8, // Weatherproof architectural terrace screed
          roughness: 0.65,
          metalness: 0.08,
          map: floorTextures.map || null,
          bumpMap: floorTextures.bumpMap || null,
          bumpScale: 0.004,
        });

        topFloor.rooms.forEach((room) => {
          if (!room.polygon || room.polygon.length < 3) return;

          const roofShape = new THREE.Shape();
          room.polygon.forEach((pt, idx) => {
            const px = (pt.x / 1000) - centerOffset.x;
            const pz = (pt.y / 1000) - centerOffset.z;
            if (idx === 0) roofShape.moveTo(px, -pz);
            else roofShape.lineTo(px, -pz);
          });

          // Punch hole if top floor has staircase leading up to roof terrace
          if (topFloor.stairs && topFloor.stairs.length > 0) {
            topFloor.stairs.forEach(st => {
              const anchorX = st.position.x / 1000 - centerOffset.x;
              const anchorZ = st.position.y / 1000 - centerOffset.z;
              const w = (st.width || 1000) / 1000;
              const l = (st.length || 2400) / 1000;
              const rad = ((st.rotation || 0) * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);

              const corners = [
                { x: 0, z: 0 },
                { x: w, z: 0 },
                { x: w, z: l },
                { x: 0, z: l },
              ].map(c => ({
                x: anchorX + (c.x * cos - c.z * sin),
                z: anchorZ + (c.x * sin + c.z * cos),
              }));

              const centerX = (corners[0].x + corners[2].x) / 2;
              const centerZ = (corners[0].z + corners[2].z) / 2;
              const ptMm = { x: (centerX + centerOffset.x) * 1000, y: (centerZ + centerOffset.z) * 1000 };
              if (isPointInPolygon(ptMm, room.polygon)) {
                const hole = new THREE.Path();
                hole.moveTo(corners[0].x, -corners[0].z);
                hole.lineTo(corners[1].x, -corners[1].z);
                hole.lineTo(corners[2].x, -corners[2].z);
                hole.lineTo(corners[3].x, -corners[3].z);
                hole.closePath();
                roofShape.holes.push(hole);
              }
            });
          }

          const roofSlabGeo = new THREE.ExtrudeGeometry(roofShape, {
            depth: 0.15,
            bevelEnabled: false,
          });
          const roofSlabMesh = new THREE.Mesh(roofSlabGeo, roofSlabMat);
          roofSlabMesh.rotation.x = -Math.PI / 2;
          roofSlabMesh.position.y = roofElevationM;
          roofSlabMesh.castShadow = true;
          roofSlabMesh.receiveShadow = true;
          scene.add(roofSlabMesh);
        });

        // Parapet Wall (0.9m height) & Coping Stones along Exterior Walls of Top Floor
        topFloor.walls.forEach(wall => {
          if (wall.wallType !== 'exterior_bearing') return;

          const sx = wall.start.x / 1000 - centerOffset.x;
          const sz = wall.start.y / 1000 - centerOffset.z;
          const ex = wall.end.x / 1000 - centerOffset.x;
          const ez = wall.end.y / 1000 - centerOffset.z;

          const dx = ex - sx;
          const dz = ez - sz;
          const wallLengthM = Math.hypot(dx, dz);
          if (wallLengthM < 0.1) return;

          const angle = Math.atan2(dz, dx);
          const thicknessM = 0.15; // 150mm standard parapet thickness
          const parapetHeightM = 0.9; // 900mm safety parapet height

          const parapetGroup = new THREE.Group();
          parapetGroup.position.set(sx, roofElevationM, sz);
          parapetGroup.rotation.y = -angle;

          // Parapet Wall Mesh
          const pGeo = new THREE.BoxGeometry(wallLengthM, parapetHeightM, thicknessM);
          const pMesh = new THREE.Mesh(pGeo, wallExteriorMat);
          pMesh.position.set(wallLengthM / 2, parapetHeightM / 2, 0);
          pMesh.castShadow = true;
          pMesh.receiveShadow = true;
          parapetGroup.add(pMesh);

          // Coping Stone Cap (weather drip overhang on both sides)
          const capGeo = new THREE.BoxGeometry(wallLengthM, 0.05, thicknessM + 0.04);
          const capMesh = new THREE.Mesh(capGeo, wallCapMat);
          capMesh.position.set(wallLengthM / 2, parapetHeightM + 0.025, 0);
          capMesh.castShadow = true;
          parapetGroup.add(capMesh);

          scene.add(parapetGroup);
        });
      }
    }

    // Highlight helper for selected entity in 3D
    if (selected3DEntity) {
      scene.traverse((obj) => {
        if (obj.userData?.id === selected3DEntity.id && obj.userData?.type === selected3DEntity.type) {
          const helper = new THREE.BoxHelper(obj, 0x06b6d4);
          (helper.material as THREE.LineBasicMaterial).linewidth = 2;
          scene.add(helper);
        }
      });
    }

    // 9. Animation Loop & Walkthrough Updates
    let lastTime = performance.now();
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      if (walkthroughMode) {
        wtController.update(Math.min(deltaSec, 0.1), {
          floors: currentProject.floors,
          centerOffset,
          minX: -60,
          maxX: 60,
          minZ: -60,
          maxZ: 60,
        });
        const activeFloor = currentProject.floors.find(
          (f) => Math.abs((f.elevation || 0) / 1000 - wtController.activeFloorElevationM) < 0.5
        ) || currentProject.floors[0];

        if (activeFloor) {
          setCurrentLevelName((prev) => (prev !== activeFloor.name ? activeFloor.name : prev));
          const activeElevM = (activeFloor.elevation || 0) / 1000;
          setCurrentLevelElevationM((prev) => (Math.abs(prev - activeElevM) > 0.01 ? activeElevM : prev));
          const room = wtController.getCurrentRoom(activeFloor.rooms, centerOffset, currentProject.floors);
          setCurrentRoomName((prev) => (prev !== room ? room : prev));
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Keyboard and mouse handlers for First-Person Walkthrough & Raycast Selection
    const handleKeyDown = (e: KeyboardEvent) => {
      wtController.handleKeyDown(e.code);

      // 3D Direct Manipulation Shortcuts (when not in an active text input)
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        if (selected3DEntity && selected3DEntity.type === 'prop') {
          if (e.key === 'r' || e.key === 'R') {
            const newRot = ((selected3DEntity.rotation || 0) + 45) % 360;
            updatePropCustomization(selected3DEntity.floorId, selected3DEntity.id, { rotation: newRot });
            setSelected3DEntity(prev => prev ? { ...prev, rotation: newRot } : null);
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteProp(selected3DEntity.floorId, selected3DEntity.id);
            setSelected3DEntity(null);
            selectSubElement(null);
          } else if (e.key === 'Escape') {
            setSelected3DEntity(null);
            selectSubElement(null);
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      wtController.handleKeyUp(e.code);
    };

    // 3D Surface Drag-and-Drop Placement from Catalog onto Floor Plane
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer || !currentProject) return;
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return;
      try {
        const payload = JSON.parse(rawData);
        if (payload.type === 'furniture-catalog-item' && payload.presetKey) {
          const preset = PROP_PRESETS[payload.presetKey];
          if (!preset) return;

          const activeFloor = currentProject.floors.find(f => 
            selectedFloorFilter === 'all' ? f.id === currentProject.activeFloorId : f.id === selectedFloorFilter
          ) || currentProject.floors[0];
          if (!activeFloor) return;

          const rect = container.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);

          const floorElevM = (activeFloor.elevation || 0) / 1000;
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorElevM);
          const intersection = new THREE.Vector3();

          if (raycaster.ray.intersectPlane(floorPlane, intersection)) {
            const worldX = Math.round((intersection.x + centerOffset.x) * 1000);
            const worldY = Math.round((intersection.z + centerOffset.z) * 1000);

            const hitRoom = activeFloor.rooms.find(r => isPointInPolygon({ x: worldX, y: worldY }, r.polygon));

            const newPropId = uuidv4();
            const newProp: Prop = {
              id: newPropId,
              floorId: activeFloor.id,
              roomId: hitRoom?.id,
              name: preset.name,
              category: preset.category,
              propType: preset.propType,
              position: { x: worldX, y: worldY },
              rotation: 0,
              elevationOffsetMm: 0,
              color: preset.defaultColor,
              finishColor: preset.defaultColor,
              dimensions: {
                width: preset.dimensions.width,
                depth: preset.dimensions.depth,
                height: preset.dimensions.height || 800,
              },
              shape: preset.shape,
            };

            addProp(activeFloor.id, newProp);
            setSelected3DEntity({
              type: 'prop',
              id: newPropId,
              floorId: activeFloor.id,
              name: newProp.name,
              propType: newProp.propType,
              rotation: 0,
              position: newProp.position,
            });
            selectSubElement({ type: 'prop', id: newPropId });
          }
        }
      } catch (err) {
        console.error('Drag and drop 3D placement error:', err);
      }
    };

    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;

    const handleMouseDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
      if (!walkthroughMode) return;
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!walkthroughMode) return;
      if (document.pointerLockElement === container) {
        wtController.handleMouseMove(e.movementX, e.movementY);
      } else if (isMouseDown) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        wtController.handleMouseMove(dx, dy);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      isMouseDown = false;

      // Click detection (quick click without drag movement)
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);
      const elapsed = performance.now() - pointerDownTime;

      if (dist < 6 && elapsed < 400 && document.pointerLockElement !== container) {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children, true);
        let hitEntity: Selected3DEntity | null = null;
        for (const hit of intersects) {
          if (hit.object.userData && hit.object.userData.type) {
            hitEntity = hit.object.userData as Selected3DEntity;
            break;
          }
        }

        if (hitEntity) {
          setSelected3DEntity(hitEntity);
          selectSubElement({ type: hitEntity.type, id: hitEntity.id });
        } else {
          setSelected3DEntity(null);
          selectSubElement(null);
        }
      }
    };

    const handleContainerClick = () => {
      if (walkthroughMode && document.pointerLockElement !== container) {
        container.requestPointerLock?.();
      }
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === container);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('click', handleContainerClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // 10. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup & Hardened GPU Resource Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('click', handleContainerClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (document.pointerLockElement === container) {
        document.exitPointerLock?.();
      }
      renderer.dispose();
      controls.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    currentProject, 
    selectedFloorFilter, 
    cutawayMode, 
    centerOffset, 
    solarData,
    floorFinish,
    wallFinish,
    walkthroughMode,
    selected3DEntity,
    selectSubElement,
    addProp,
    deleteProp,
    updatePropCustomization
  ]);

  const handleCameraPreset = (preset: 'iso' | 'top' | 'front') => {
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (preset === 'iso') {
      camera.position.set(15, 18, 20);
      controls.target.set(0, 1.5, 0);
    } else if (preset === 'top') {
      camera.position.set(0, 32, 0.1);
      controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      camera.position.set(0, 4, 25);
      controls.target.set(0, 1.5, 0);
    }
    controls.update();
  };

  const floorsList = currentProject?.floors || [];

  return (
    <div className="w-full h-full relative select-none bg-slate-900 overflow-hidden font-mono" ref={containerRef}>
      {/* Top Floating Controls HUD */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Back to 2D Plan Button */}
        <button
          onClick={() => setViewMode('2d')}
          className="bg-slate-950/90 backdrop-blur-md border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md shadow-sm hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Return to 2D CAD Blueprint Editor"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-cyan-400" />
          <span>2D CAD</span>
        </button>

        {/* Floor Selection Filter */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-md p-0.5 shadow-sm flex items-center text-xs">
          <button
            onClick={() => setSelectedFloorFilter('all')}
            className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
              selectedFloorFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Floors
          </button>
          {floorsList.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFloorFilter(f.id)}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                selectedFloorFilter === f.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Cutaway Mode Toggle */}
        <button
          onClick={() => setCutawayMode(!cutawayMode)}
          className={`bg-slate-950/90 backdrop-blur-md border px-3 py-1.5 rounded-md shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            cutawayMode ? 'text-cyan-300 border-cyan-500/60 bg-cyan-950/50' : 'text-slate-400 border-slate-700 hover:text-white'
          }`}
          title="Toggle between Architectural Cutaway (look inside rooms) and Full Height Walls"
        >
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          <span>{cutawayMode ? '1.2m Cutaway' : '2.8m Full Height'}</span>
        </button>

        {/* Solar Study Trigger */}
        <button
          onClick={() => {
            setShowSolarTray(!showSolarTray);
            if (showMaterialTray) setShowMaterialTray(false);
          }}
          className={`bg-slate-950/90 backdrop-blur-md border px-3 py-1.5 rounded-md shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            showSolarTray ? 'border-amber-500 bg-amber-950/50 text-amber-300' : 'border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Open Solar Daylighting & True-North Shadow Study Controller"
        >
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span>{solarData.timeFormatted}</span>
        </button>

        {/* PBR Material Finishes Trigger */}
        <button
          onClick={() => {
            setShowMaterialTray(!showMaterialTray);
            if (showSolarTray) setShowSolarTray(false);
          }}
          className={`bg-slate-950/90 backdrop-blur-md border px-3 py-1.5 rounded-md shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            showMaterialTray ? 'border-cyan-500 bg-cyan-950/50 text-cyan-300' : 'border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Open PBR Architectural Material Finishes Palette"
        >
          <Palette className="h-3.5 w-3.5 text-cyan-400" />
          <span>Materials</span>
        </button>

        {/* First-Person Walkthrough Mode */}
        <button
          onClick={() => {
            const next = !walkthroughMode;
            setWalkthroughMode(next);
            setWalkthroughActive(next);
          }}
          className={`bg-slate-950/90 backdrop-blur-md border px-3 py-1.5 rounded-md shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            walkthroughMode ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300' : 'border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Toggle First-Person 3D Walkthrough Mode (WASD + Mouse)"
        >
          <Footprints className="h-3.5 w-3.5 text-emerald-400" />
          <span>{walkthroughMode ? 'Walk (Active)' : 'Walkthrough'}</span>
        </button>

        {/* AI Studio Render Synthesizer */}
        <button
          onClick={() => setShowRenderStudio(true)}
          className="bg-slate-950/90 backdrop-blur-md border border-fuchsia-700/60 px-3 py-1.5 rounded-md shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-fuchsia-300 hover:bg-fuchsia-950/60 hover:text-white"
          title="Generate Photorealistic 8K Architectural Diffusion Render"
        >
          <Camera className="h-3.5 w-3.5 text-fuchsia-400" />
          <span>AI Render Studio</span>
        </button>
      </div>

      {/* Top-Right Camera Angles & Reset */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-slate-700 p-1 rounded-md shadow-sm text-xs">
        <button
          onClick={() => handleCameraPreset('iso')}
          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
            cameraPreset === 'iso' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
          title="Isometric 45° Angle"
        >
          Iso
        </button>
        <button
          onClick={() => handleCameraPreset('top')}
          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
            cameraPreset === 'top' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
          title="Top-Down Axonometric View"
        >
          Top
        </button>
        <button
          onClick={() => handleCameraPreset('front')}
          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
            cameraPreset === 'front' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
          title="Front Elevation Angle"
        >
          Front
        </button>
        <div className="h-4 w-px bg-slate-800 mx-0.5" />
        <button
          onClick={() => handleCameraPreset('iso')}
          className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          title="Reset Camera Target"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Solar Study Interactive Tray */}
      {showSolarTray && (
        <div className="absolute top-16 left-4 z-30 w-80 rounded-lg border border-slate-700 bg-slate-950/95 backdrop-blur-md p-4 shadow-2xl text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Sun className="h-4 w-4" />
              <span>SOLAR SHADOW STUDY</span>
            </div>
            <span className="text-[10px] text-slate-400">TRUE-NORTH ALIGNED</span>
          </div>

          {/* Time of Day Slider */}
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span>Time of Day:</span>
              <span className="font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {solarData.timeFormatted}
              </span>
            </div>
            <input
              type="range"
              min="6.0"
              max="18.0"
              step="0.25"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>06:00 (Dawn)</span>
              <span>12:00 (Noon)</span>
              <span>18:00 (Dusk)</span>
            </div>
          </div>

          {/* Season Selector */}
          <div>
            <span className="block text-slate-300 mb-1.5">Solar Season:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'summer_solstice' as Season, label: 'Summer' },
                { id: 'equinox' as Season, label: 'Equinox' },
                { id: 'winter_solstice' as Season, label: 'Winter' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeason(s.id)}
                  className={`py-1 rounded border text-[11px] transition-colors ${
                    season === s.id
                      ? 'border-amber-400 bg-amber-950/60 text-amber-200 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Solar Metrics Readout */}
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Solar Altitude:</span>
              <span className="text-white font-bold">{solarData.altitudeDeg}°</span>
            </div>
            <div className="flex justify-between">
              <span>Sun Azimuth:</span>
              <span className="text-white font-bold">{solarData.azimuthDeg}°</span>
            </div>
            <div className="flex justify-between">
              <span>Daylight Status:</span>
              <span className="text-emerald-400 font-bold">
                {solarData.altitudeDeg > 35 ? 'Direct Sunlight' : 'Golden Hour'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PBR Material Finishes Tray */}
      {showMaterialTray && (
        <div className="absolute top-16 left-4 z-30 w-80 rounded-lg border border-slate-700 bg-slate-950/95 backdrop-blur-md p-4 shadow-2xl text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Palette className="h-4 w-4" />
              <span>ARCHITECTURAL FINISHES</span>
            </div>
            <span className="text-[10px] text-slate-400">PBR PALETTES</span>
          </div>

          {/* Floor Finishes */}
          <div>
            <span className="block text-slate-300 mb-1.5">Floor Surface Material:</span>
            <div className="space-y-1.5">
              {(Object.keys(FLOOR_FINISHES) as FloorFinishType[]).map((fKey) => {
                const fin = FLOOR_FINISHES[fKey];
                return (
                  <button
                    key={fKey}
                    onClick={() => setFloorFinish(fKey)}
                    className={`w-full p-2 rounded border text-left flex items-center justify-between transition-colors ${
                      floorFinish === fKey
                        ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{fin.name}</span>
                      <span className="text-[10px] text-slate-400 block">{fin.description}</span>
                    </div>
                    {floorFinish === fKey && <Sparkles className="h-3 w-3 text-cyan-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wall Finishes */}
          <div>
            <span className="block text-slate-300 mb-1.5">Wall Plaster / Masonry:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(WALL_FINISHES) as WallFinishType[]).map((wKey) => {
                const wall = WALL_FINISHES[wKey];
                return (
                  <button
                    key={wKey}
                    onClick={() => setWallFinish(wKey)}
                    className={`p-2 rounded border text-left transition-colors ${
                      wallFinish === wKey
                        ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs text-white block">{wall.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* First-Person Walkthrough Reticle Crosshair */}
      {walkthroughMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-4 h-4 flex items-center justify-center opacity-70">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            <div className="absolute w-4 h-4 border border-cyan-400/40 rounded-full" />
          </div>
        </div>
      )}

      {/* Bottom Floating Hint & Compass Watermark / Walkthrough HUD */}
      {walkthroughMode ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-slate-700 px-5 py-2.5 rounded-lg shadow-2xl text-xs font-mono text-slate-200 flex flex-wrap items-center justify-center gap-3.5 z-30 pointer-events-auto">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Footprints className="h-4 w-4" />
            <span>WALKTHROUGH</span>
          </div>
          <span className="text-slate-700">|</span>
          <span className="text-cyan-300 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            {currentLevelName} ({currentLevelElevationM.toFixed(1)}m)
          </span>
          {currentRoomName && (
            <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              {currentRoomName}
            </span>
          )}
          <span className="text-slate-700">|</span>
          <span className="text-slate-300 text-[11px] hidden sm:inline">
            [W][A][S][D] / Arrows • Shift: Sprint
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${isPointerLocked ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {isPointerLocked ? 'Mouse Locked (Esc to unlock)' : 'Click Viewport for Mouse-Look'}
          </span>
          <button
            onClick={() => {
              if (document.pointerLockElement) document.exitPointerLock?.();
              setWalkthroughMode(false);
            }}
            className="ml-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer transition-colors border border-slate-700"
          >
            Exit (Orbit)
          </button>
        </div>
      ) : (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md text-white px-4 py-1.5 rounded-md shadow-lg text-[11px] font-medium pointer-events-none flex items-center gap-3 border border-slate-800 z-20">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Compass className="h-3 w-3" />
            True-North: {currentProject?.siteContext?.roadFacing || 'N'}
          </span>
          <span className="text-slate-600">•</span>
          <span>Left Drag: 360° Orbit</span>
          <span className="text-slate-600">•</span>
          <span>Right Drag: Pan</span>
          <span className="text-slate-600">•</span>
          <span>Scroll: Zoom</span>
        </div>
      )}

      {/* Stage 5: Interactive 3D Customizer Panel, Presets, and Catalog */}
      <Viewport3DCustomizer
        selectedEntity={selected3DEntity}
        onCloseSelection={() => {
          setSelected3DEntity(null);
          selectSubElement(null);
        }}
      />

      {/* Phase 16: AI Studio Render Synthesizer Modal */}
      {currentProject && (
        <AIRenderStudioModal
          project={currentProject}
          isOpen={showRenderStudio}
          onClose={() => setShowRenderStudio(false)}
          webglCanvas={activeCanvas}
          floorFinish={floorFinish}
          wallFinish={wallFinish}
          currentRoomName={currentRoomName}
        />
      )}
    </div>
  );
}
