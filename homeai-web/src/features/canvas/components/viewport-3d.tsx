"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { 
  RotateCcw, 
  Sliders, 
  LayoutGrid
} from 'lucide-react';

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentProject } = useProjectStore();
  const { setViewMode } = useCanvasStore();

  const [selectedFloorFilter, setSelectedFloorFilter] = useState<'all' | string>('all');
  const [cutawayMode, setCutawayMode] = useState<boolean>(true); // default cutaway at 1.2m so users can see inside
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !currentProject) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate-50 background

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 18, 20);
    cameraRef.current = camera;

    // 3. Renderer
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
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't allow going below ground
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x64748b, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 6. Ground Plane & Architectural Grid
    const groundGeo = new THREE.PlaneGeometry(100, 100);
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

    // Common Materials
    const wallExteriorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    });

    const wallInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.8,
      metalness: 0.05,
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe, // Soft blueprint concrete blue
      roughness: 0.7,
      metalness: 0.1,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.8,
      opacity: 0.6,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
    });

    const woodTreadMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // Warm teak wood
      roughness: 0.6,
    });

    const furnitureDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
    });

    const furnitureFabricMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Modern gray fabric
      roughness: 0.9,
    });

    const furnitureBedMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5, // Indigo bedding
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

    // 7. BUILD 3D GEOMETRY FOR EACH FLOOR
    floorsToRender.forEach((floor) => {
      const floorElevationM = (floor.elevation || 0) / 1000;
      const wallHeightM = defaultWallHeight;

      // A. Rooms (Floor Slabs)
      floor.rooms.forEach((room) => {
        if (!room.polygon || room.polygon.length < 3) return;

        const shape = new THREE.Shape();
        room.polygon.forEach((pt, idx) => {
          const px = (pt.x / 1000) - centerOffset.x;
          const pz = (pt.y / 1000) - centerOffset.z;
          if (idx === 0) shape.moveTo(px, -pz);
          else shape.lineTo(px, -pz);
        });

        // Determine room flooring finish color
        let roomColor = 0xe2e8f0; // default slate tile
        const nameLower = room.name.toLowerCase();
        if (nameLower.includes('living')) roomColor = 0xf5ebd9; // Warm light oak
        else if (nameLower.includes('bed')) roomColor = 0xeddcd2; // Soft bedroom wood
        else if (nameLower.includes('kitchen')) roomColor = 0xedf2f7; // Clean porcelain tile
        else if (nameLower.includes('bath') || nameLower.includes('ensuite')) roomColor = 0xdbeafe; // Ceramic bath tile
        else if (nameLower.includes('dining')) roomColor = 0xf5ebd9;
        else if (nameLower.includes('balcony') || nameLower.includes('terrace')) roomColor = 0xe7e5e4;

        const slabMat = new THREE.MeshStandardMaterial({
          color: roomColor,
          roughness: 0.7,
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
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.05) return;

        const thicknessM = (wall.thickness || 200) / 1000;
        const angle = Math.atan2(dz, dx);
        const midX = (sx + ex) / 2;
        const midZ = (sz + ez) / 2;

        const isExterior = wall.wallType === 'exterior_bearing';
        const activeWallMat = isExterior ? wallExteriorMat : wallInteriorMat;

        // Base wall box
        const wallGeo = new THREE.BoxGeometry(length, wallHeightM, thicknessM);
        const wallMesh = new THREE.Mesh(wallGeo, activeWallMat);
        wallMesh.position.set(midX, floorElevationM + wallHeightM / 2, midZ);
        wallMesh.rotation.y = -angle;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);

        // Windows Glass and Frames
        wall.windows.forEach((win) => {
          const winWM = (win.width || 1200) / 1000;
          const winHM = Math.min((win.height || 1200) / 1000, wallHeightM * 0.8);
          const winOffsetM = (win.offset / 1000) - length / 2;
          const sillM = Math.min((win.sillHeight || 900) / 1000, wallHeightM * 0.4);

          // Position in wall local space
          const winCenterY = floorElevationM + sillM + winHM / 2;
          const winPosX = midX + Math.cos(angle) * winOffsetM;
          const winPosZ = midZ + Math.sin(angle) * winOffsetM;

          const glassGeo = new THREE.BoxGeometry(winWM, winHM, thicknessM * 0.4);
          const glassMesh = new THREE.Mesh(glassGeo, glassMat);
          glassMesh.position.set(winPosX, winCenterY, winPosZ);
          glassMesh.rotation.y = -angle;
          scene.add(glassMesh);

          // Chajja Sunshade overhang (450mm projection)
          if (win.chajjaSunshade) {
            const chajjaGeo = new THREE.BoxGeometry(winWM + 0.3, 0.06, 0.45);
            const chajjaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
            const chajjaMesh = new THREE.Mesh(chajjaGeo, chajjaMat);
            const perpAngle = angle + Math.PI / 2;
            chajjaMesh.position.set(
              winPosX + Math.cos(perpAngle) * 0.25,
              winCenterY + winHM / 2 + 0.05,
              winPosZ + Math.sin(perpAngle) * 0.25
            );
            chajjaMesh.rotation.y = -angle;
            chajjaMesh.castShadow = true;
            scene.add(chajjaMesh);
          }
        });

        // Doors
        wall.doors.forEach((door) => {
          const doorWM = (door.width || 900) / 1000;
          const doorHM = Math.min(2.1, wallHeightM * 0.9);
          const doorOffsetM = (door.offset / 1000) - length / 2;

          const doorPosX = midX + Math.cos(angle) * doorOffsetM;
          const doorPosZ = midZ + Math.sin(angle) * doorOffsetM;
          const doorCenterY = floorElevationM + doorHM / 2;

          const doorFrameGeo = new THREE.BoxGeometry(doorWM, doorHM, thicknessM * 0.6);
          const doorFrameMesh = new THREE.Mesh(doorFrameGeo, frameMat);
          doorFrameMesh.position.set(doorPosX, doorCenterY, doorPosZ);
          doorFrameMesh.rotation.y = -angle;
          scene.add(doorFrameMesh);
        });
      });

      // D. Staircases (3D Steps, Landings, and Handrails)
      floor.stairs?.forEach((stair) => {
        const stairX = (stair.position.x / 1000) - centerOffset.x;
        const stairZ = (stair.position.y / 1000) - centerOffset.z;
        const stairRot = (stair.rotation || 0) * (Math.PI / 180);
        const stairGroup = new THREE.Group();
        stairGroup.position.set(stairX, floorElevationM, stairZ);
        stairGroup.rotation.y = -stairRot;

        const totalSteps = stair.stepCount || 18;
        const flight1Steps = Math.floor(totalSteps / 2);
        const flight2Steps = totalSteps - flight1Steps;
        const riserH = (stair.riserMm || 155) / 1000;
        const treadD = (stair.treadMm || 280) / 1000;
        const flightW = ((stair.width || 2000) / 2 - 50) / 1000;

        // Flight 1 (Ascending to mid-landing)
        for (let i = 0; i < flight1Steps; i++) {
          const stepGeo = new THREE.BoxGeometry(flightW, riserH, treadD);
          const stepMesh = new THREE.Mesh(stepGeo, woodTreadMat);
          stepMesh.position.set(-flightW / 2 - 0.05, (i + 0.5) * riserH, i * treadD);
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          stairGroup.add(stepMesh);
        }

        // Mid-Landing Slab
        const landingH = flight1Steps * riserH;
        const landingGeo = new THREE.BoxGeometry(flightW * 2 + 0.1, riserH, 1.0);
        const landingMesh = new THREE.Mesh(landingGeo, woodTreadMat);
        landingMesh.position.set(0, landingH - riserH / 2, flight1Steps * treadD + 0.5);
        landingMesh.castShadow = true;
        stairGroup.add(landingMesh);

        // Flight 2 (Ascending from landing to upper floor)
        for (let j = 0; j < flight2Steps; j++) {
          const stepGeo = new THREE.BoxGeometry(flightW, riserH, treadD);
          const stepMesh = new THREE.Mesh(stepGeo, woodTreadMat);
          stepMesh.position.set(flightW / 2 + 0.05, landingH + (j + 0.5) * riserH, (flight1Steps - j - 1) * treadD);
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          stairGroup.add(stepMesh);
        }

        scene.add(stairGroup);
      });

      // E. Double-Height Slab Voids (Glass Railings along Cutout)
      floor.voids?.forEach((v) => {
        if (!v.polygon || v.polygon.length < 2) return;
        for (let k = 0; k < v.polygon.length; k++) {
          const pt1 = v.polygon[k];
          const pt2 = v.polygon[(k + 1) % v.polygon.length];
          const x1 = (pt1.x / 1000) - centerOffset.x;
          const z1 = (pt1.y / 1000) - centerOffset.z;
          const x2 = (pt2.x / 1000) - centerOffset.x;
          const z2 = (pt2.y / 1000) - centerOffset.z;

          const edx = x2 - x1;
          const edz = z2 - z1;
          const edgeLen = Math.sqrt(edx * edx + edz * edz);
          if (edgeLen < 0.1) continue;

          const edgeAngle = Math.atan2(edz, edx);
          const midX = (x1 + x2) / 2;
          const midZ = (z1 + z2) / 2;

          // Glass safety balustrade around void edge (1.0m height)
          const railingGeo = new THREE.BoxGeometry(edgeLen, 1.0, 0.05);
          const railingMesh = new THREE.Mesh(railingGeo, glassMat);
          railingMesh.position.set(midX, floorElevationM + 0.5, midZ);
          railingMesh.rotation.y = -edgeAngle;
          scene.add(railingMesh);
        }
      });

      // F. Furniture & Props (3D Block Models)
      floor.props?.forEach((prop) => {
        const px = (prop.position.x / 1000) - centerOffset.x;
        const pz = (prop.position.y / 1000) - centerOffset.z;
        const pw = (prop.dimensions.width || 1000) / 1000;
        const pd = (prop.dimensions.depth || 1000) / 1000;
        const prot = (prop.rotation || 0) * (Math.PI / 180);

        const propGroup = new THREE.Group();
        propGroup.position.set(px, floorElevationM, pz);
        propGroup.rotation.y = -prot;

        if (prop.propType === 'tv') {
          // TV Screen + Console Cabinet
          const tvGeo = new THREE.BoxGeometry(pw, 0.9, 0.06);
          const tvMesh = new THREE.Mesh(tvGeo, furnitureDarkMat);
          tvMesh.position.set(0, 1.2, 0);
          propGroup.add(tvMesh);

          const consoleGeo = new THREE.BoxGeometry(pw + 0.2, 0.45, pd);
          const consoleMesh = new THREE.Mesh(consoleGeo, woodTreadMat);
          consoleMesh.position.set(0, 0.225, 0);
          consoleMesh.castShadow = true;
          propGroup.add(consoleMesh);
        } else if (prop.propType === 'sofa') {
          // L-Shaped or Sectional Sofa
          const seatGeo = new THREE.BoxGeometry(pw, 0.45, pd);
          const seatMesh = new THREE.Mesh(seatGeo, furnitureFabricMat);
          seatMesh.position.set(0, 0.225, 0);
          seatMesh.castShadow = true;
          propGroup.add(seatMesh);

          const backGeo = new THREE.BoxGeometry(pw, 0.45, pd * 0.25);
          const backMesh = new THREE.Mesh(backGeo, furnitureFabricMat);
          backMesh.position.set(0, 0.55, -pd * 0.35);
          propGroup.add(backMesh);
        } else if (prop.propType === 'bed') {
          // King/Queen Mattress, Frame, and Headboard
          const mattressGeo = new THREE.BoxGeometry(pw, 0.5, pd);
          const mattressMesh = new THREE.Mesh(mattressGeo, furnitureBedMat);
          mattressMesh.position.set(0, 0.25, 0);
          mattressMesh.castShadow = true;
          propGroup.add(mattressMesh);

          const headboardGeo = new THREE.BoxGeometry(pw + 0.1, 1.0, 0.15);
          const headboardMesh = new THREE.Mesh(headboardGeo, woodTreadMat);
          headboardMesh.position.set(0, 0.5, -pd / 2 + 0.07);
          propGroup.add(headboardMesh);
        } else if (prop.propType === 'dining_table') {
          // Dining Table
          const topGeo = new THREE.BoxGeometry(pw, 0.06, pd);
          const topMesh = new THREE.Mesh(topGeo, woodTreadMat);
          topMesh.position.set(0, 0.75, 0);
          topMesh.castShadow = true;
          propGroup.add(topMesh);

          const legGeo = new THREE.BoxGeometry(0.08, 0.72, 0.08);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
            const legMesh = new THREE.Mesh(legGeo, furnitureDarkMat);
            legMesh.position.set((pw / 2 - 0.1) * sx, 0.36, (pd / 2 - 0.1) * sz);
            propGroup.add(legMesh);
          });
        } else if (prop.propType === 'car_sedan' || prop.propType === 'car_suv') {
          // Vehicle
          const carGeo = new THREE.BoxGeometry(pw, 0.7, pd);
          const carMesh = new THREE.Mesh(carGeo, carMat);
          carMesh.position.set(0, 0.45, 0);
          carMesh.castShadow = true;
          propGroup.add(carMesh);

          const cabinGeo = new THREE.BoxGeometry(pw * 0.7, 0.6, pd * 0.6);
          const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
          cabinMesh.position.set(0, 0.9, 0);
          propGroup.add(cabinMesh);
        } else {
          // Generic architectural prop block
          const blockGeo = new THREE.BoxGeometry(pw, 0.7, pd);
          const blockMesh = new THREE.Mesh(blockGeo, furnitureDarkMat);
          blockMesh.position.set(0, 0.35, 0);
          blockMesh.castShadow = true;
          propGroup.add(blockMesh);
        }

        scene.add(propGroup);
      });
    });

    // 8. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Handling
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
  }, [currentProject, selectedFloorFilter, cutawayMode, centerOffset]);

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
    <div className="w-full h-full relative select-none bg-slate-100 overflow-hidden" ref={containerRef}>
      {/* Top Floating Controls HUD */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Back to 2D Plan Button */}
        <button
          onClick={() => setViewMode('2d')}
          className="bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Return to 2D CAD Blueprint Editor"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
          <span>Back to 2D CAD</span>
        </button>

        {/* Floor Selection Filter */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-0.5 shadow-sm flex items-center text-xs">
          <button
            onClick={() => setSelectedFloorFilter('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              selectedFloorFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Floors (Stacked)
          </button>
          {floorsList.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFloorFilter(f.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                selectedFloorFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Cutaway Mode Toggle */}
        <button
          onClick={() => setCutawayMode(!cutawayMode)}
          className={`bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            cutawayMode ? 'text-indigo-700 bg-indigo-50/90 border-indigo-200' : 'text-slate-700 hover:bg-slate-50'
          }`}
          title="Toggle between Architectural Cutaway (look inside rooms) and Full Height Walls"
        >
          <Sliders className="h-3.5 w-3.5 text-indigo-600" />
          <span>{cutawayMode ? 'Cutaway View (1.2m)' : 'Full Height (2.8m)'}</span>
        </button>
      </div>

      {/* Top-Right Camera Angles & Reset */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 p-1 rounded-lg shadow-sm text-xs">
        <button
          onClick={() => handleCameraPreset('iso')}
          className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
            cameraPreset === 'iso' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Isometric 45° Angle"
        >
          Isometric
        </button>
        <button
          onClick={() => handleCameraPreset('top')}
          className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
            cameraPreset === 'top' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Top-Down Axonometric View"
        >
          Top-Down
        </button>
        <button
          onClick={() => handleCameraPreset('front')}
          className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
            cameraPreset === 'front' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Front Elevation Angle"
        >
          Front
        </button>
        <div className="h-4 w-px bg-slate-200 mx-0.5" />
        <button
          onClick={() => handleCameraPreset('iso')}
          className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
          title="Reset Camera Target"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Floating Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-lg text-[11px] font-medium pointer-events-none flex items-center gap-3 border border-slate-700/60 z-20">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Left Drag: Rotate 360°
        </span>
        <span className="text-slate-400">•</span>
        <span>Right Drag: Pan</span>
        <span className="text-slate-400">•</span>
        <span>Scroll: Zoom In/Out</span>
      </div>
    </div>
  );
}
