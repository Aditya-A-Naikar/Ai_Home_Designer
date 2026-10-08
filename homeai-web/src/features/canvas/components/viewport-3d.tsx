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
  Sparkles
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
import { Door, Window } from '@/core/domain/types';

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

    // 3. Renderer with Soft Contact Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Restrict going below ground
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;

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
      color: 0x38bdf8,
      transmission: 0.85,
      opacity: 0.6,
      transparent: true,
      roughness: 0.08,
      ior: 1.52,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Anodized black aluminum
      roughness: 0.4,
      metalness: 0.6,
    });

    const woodTreadMat = new THREE.MeshStandardMaterial({
      color: activeFloorSpec.id === 'teak_hardwood' ? 0xc27838 : 0x78350f,
      roughness: 0.5,
      metalness: 0.05,
    });

    const furnitureDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
    });

    const furnitureFabricMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.9,
    });

    const furnitureBedMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Blueprint cyan bedding
      roughness: 0.8,
    });

    const carMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.7,
      roughness: 0.3,
    });

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

      // A. Rooms (PBR Floor Slabs)
      floor.rooms.forEach((room) => {
        if (!room.polygon || room.polygon.length < 3) return;

        const shape = new THREE.Shape();
        room.polygon.forEach((pt, idx) => {
          const px = (pt.x / 1000) - centerOffset.x;
          const pz = (pt.y / 1000) - centerOffset.z;
          if (idx === 0) shape.moveTo(px, -pz);
          else shape.lineTo(px, -pz);
        });

        const slabMat = new THREE.MeshStandardMaterial({
          color: activeFloorSpec.colorHex,
          roughness: activeFloorSpec.roughness,
          metalness: activeFloorSpec.metalness,
        });

        const slabGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.08,
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

      // C. Walls with Openings
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

        // Collect openings along the wall
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
              }

              // Window Glass Pane
              if (!cutawayMode || op.sillM < wallHeightM) {
                const winH = Math.min(op.heightM, Math.max(0, wallHeightM - op.sillM));
                if (winH > 0.1) {
                  const glassGeo = new THREE.BoxGeometry(op.widthM, winH, 0.02);
                  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
                  glassMesh.position.set(op.startOffset + op.widthM / 2, op.sillM + winH / 2, 0);
                  wallGroup.add(glassMesh);

                  // Frame outline
                  const frameGeo = new THREE.BoxGeometry(op.widthM, winH, thicknessM * 1.05);
                  const frameWire = new THREE.BoxHelper(new THREE.Mesh(frameGeo), 0x334155);
                  frameWire.position.set(op.startOffset + op.widthM / 2, op.sillM + winH / 2, 0);
                  wallGroup.add(frameWire);
                }
              }
            } else if (op.type === 'door') {
              // Door Frame & Opening
              const doorFrameGeo = new THREE.BoxGeometry(op.widthM, op.heightM, thicknessM * 1.05);
              const doorWire = new THREE.BoxHelper(new THREE.Mesh(doorFrameGeo), 0xd97706);
              doorWire.position.set(op.startOffset + op.widthM / 2, op.heightM / 2, 0);
              wallGroup.add(doorWire);
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
          }
        }

        scene.add(wallGroup);
      });

      // D. Staircases
      floor.stairs?.forEach((st) => {
        const sx = st.position.x / 1000 - centerOffset.x;
        const sz = st.position.y / 1000 - centerOffset.z;
        const stairWidthM = (st.width || 1000) / 1000;
        const stairLengthM = (st.length || 2400) / 1000;
        const totalHeightM = (floor.height || 3000) / 1000;
        const steps = Math.max(12, st.stepCount || 18);
        const riserH = totalHeightM / steps;
        const treadL = stairLengthM / steps;

        const stairGroup = new THREE.Group();
        stairGroup.position.set(sx, floorElevationM, sz);
        stairGroup.rotation.y = -(st.rotation || 0) * (Math.PI / 180);

        for (let i = 0; i < steps; i++) {
          const stepY = i * riserH;
          const stepZ = i * treadL - stairLengthM / 2;

          const treadGeo = new THREE.BoxGeometry(stairWidthM, riserH * 0.95, treadL);
          const treadMesh = new THREE.Mesh(treadGeo, woodTreadMat);
          treadMesh.position.set(0, stepY + riserH / 2, stepZ + treadL / 2);
          treadMesh.castShadow = true;
          treadMesh.receiveShadow = true;
          stairGroup.add(treadMesh);
        }

        // Architectural Glass Balustrade
        const balustradeGeo = new THREE.BoxGeometry(0.02, 1.0, stairLengthM);
        const balustradeMesh = new THREE.Mesh(balustradeGeo, glassMat);
        balustradeMesh.position.set(stairWidthM / 2, totalHeightM / 2 + 0.5, 0);
        stairGroup.add(balustradeMesh);

        // Stainless Steel Handrail
        const handrailGeo = new THREE.BoxGeometry(0.04, 0.04, stairLengthM);
        const handrailMesh = new THREE.Mesh(handrailGeo, frameMat);
        handrailMesh.position.set(stairWidthM / 2, totalHeightM / 2 + 1.0, 0);
        stairGroup.add(handrailMesh);

        scene.add(stairGroup);
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
        const pw = (p.dimensions?.width || 1000) / 1000;
        const pd = (p.dimensions?.depth || 1000) / 1000;

        const propGroup = new THREE.Group();
        propGroup.position.set(px, floorElevationM, pz);
        propGroup.rotation.y = -(p.rotation || 0) * (Math.PI / 180);

        if (p.propType?.includes('bed')) {
          const baseGeo = new THREE.BoxGeometry(pw, 0.45, pd);
          const baseMesh = new THREE.Mesh(baseGeo, furnitureDarkMat);
          baseMesh.position.set(0, 0.225, 0);
          baseMesh.castShadow = true;
          propGroup.add(baseMesh);

          const mattressGeo = new THREE.BoxGeometry(pw * 0.95, 0.2, pd * 0.95);
          const mattressMesh = new THREE.Mesh(mattressGeo, furnitureBedMat);
          mattressMesh.position.set(0, 0.55, 0);
          mattressMesh.castShadow = true;
          propGroup.add(mattressMesh);
        } else if (p.propType?.includes('sofa')) {
          const seatGeo = new THREE.BoxGeometry(pw, 0.4, pd);
          const seatMesh = new THREE.Mesh(seatGeo, furnitureFabricMat);
          seatMesh.position.set(0, 0.2, 0);
          seatMesh.castShadow = true;
          propGroup.add(seatMesh);
        } else if (p.propType?.includes('car')) {
          const carBodyGeo = new THREE.BoxGeometry(pw, 1.2, pd);
          const carBodyMesh = new THREE.Mesh(carBodyGeo, carMat);
          carBodyMesh.position.set(0, 0.6, 0);
          carBodyMesh.castShadow = true;
          propGroup.add(carBodyMesh);
        } else {
          const blockGeo = new THREE.BoxGeometry(pw, 0.7, pd);
          const blockMesh = new THREE.Mesh(blockGeo, furnitureDarkMat);
          blockMesh.position.set(0, 0.35, 0);
          blockMesh.castShadow = true;
          propGroup.add(blockMesh);
        }

        scene.add(propGroup);
      });
    });

    // 9. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      controls.dispose();
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
    wallFinish
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

      {/* Bottom Floating Hint & Compass Watermark */}
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
    </div>
  );
}
