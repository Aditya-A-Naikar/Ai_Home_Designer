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
  WallFinishType 
} from '@/core/geometry/pbr-materials';
import { Door, Window, Staircase } from '@/core/domain/types';
import { isPointInPolygon } from '@/core/geometry/room-utils';
import { createProp3DMesh } from '@/core/geometry/furniture-3d';
import { WalkthroughController } from '@/core/geometry/walkthrough-controller';
import { AIRenderStudioModal } from './ai-render-studio-modal';

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentProject } = useProjectStore();
  const { setViewMode } = useCanvasStore();

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

  // Phase 11 & Phase 16: Walkthrough & AI Render Studio
  const [walkthroughMode, setWalkthroughMode] = useState<boolean>(false);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
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

    const wallExteriorMat = new THREE.MeshStandardMaterial({
      color: activeWallSpec.colorHex,
      roughness: activeWallSpec.roughness,
      metalness: activeWallSpec.metalness,
    });

    const wallInteriorMat = new THREE.MeshStandardMaterial({
      color: activeWallSpec.colorHex,
      roughness: Math.min(1, activeWallSpec.roughness + 0.05),
      metalness: activeWallSpec.metalness,
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

      // Brushed Brass Lever Handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), brassHandleMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(widthM / 2 - jambW - 0.08, 0.95, leafThick / 2 + 0.02);
      group.add(handle);

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

        const slabMat = new THREE.MeshStandardMaterial({
          color: activeFloorSpec.colorHex,
          roughness: activeFloorSpec.roughness,
          metalness: activeFloorSpec.metalness,
        });

        const slabGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.12,
          bevelEnabled: false,
        });

        const slabMesh = new THREE.Mesh(slabGeo, slabMat);
        slabMesh.rotation.x = -Math.PI / 2;
        slabMesh.position.y = floorElevationM + 0.01;
        slabMesh.receiveShadow = true;
        scene.add(slabMesh);
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
        const wallMat = isExterior ? wallExteriorMat : wallInteriorMat;

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
        scene.add(propMesh);
      });
    });

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
        const activeFloor = currentProject.floors.find((f) => f.id === currentProject.activeFloorId) || currentProject.floors[0];
        if (activeFloor) {
          const room = wtController.getCurrentRoom(activeFloor.rooms, centerOffset, currentProject.floors);
          setCurrentRoomName((prev) => (prev !== room ? room : prev));
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Keyboard and mouse handlers for First-Person Walkthrough
    const handleKeyDown = (e: KeyboardEvent) => {
      wtController.handleKeyDown(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      wtController.handleKeyUp(e.code);
    };

    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (!walkthroughMode) return;
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!walkthroughMode || !isMouseDown) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      wtController.handleMouseMove(dx, dy);
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
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
    walkthroughMode
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
          onClick={() => setWalkthroughMode(!walkthroughMode)}
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

      {/* Bottom Floating Hint & Compass Watermark / Walkthrough HUD */}
      {walkthroughMode ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-slate-700 px-5 py-2.5 rounded-lg shadow-2xl text-xs font-mono text-slate-200 flex items-center gap-4 z-30 pointer-events-auto">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Footprints className="h-4 w-4" />
            <span>WALKTHROUGH ACTIVE</span>
          </div>
          <span className="text-slate-600">|</span>
          <span>[W][A][S][D] / Arrows: Walk</span>
          <span className="text-slate-600">|</span>
          <span>Shift: Sprint</span>
          <span className="text-slate-600">|</span>
          <span>Drag: Look</span>
          {currentRoomName && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">Room: {currentRoomName}</span>
            </>
          )}
          <button
            onClick={() => setWalkthroughMode(false)}
            className="ml-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
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
