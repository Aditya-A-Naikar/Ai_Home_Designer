"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { GridLayer } from './grid-layer';
import { WallLayer } from './wall-layer';
import { RoomLayer } from './room-layer';
import { DimensionsLayer } from './dimensions-layer';
import { screenToMm } from '@/core/canvas/transform';
import { Point2D } from '@/core/domain/types';
import { v4 as uuidv4 } from 'uuid';
import { snapToGrid, snapToEndpoint } from '@/core/geometry/wall-utils';

export function CanvasViewport() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { zoom, panOffset, setZoom, setPanOffset, tool, selectedElementId, selectElement } = useCanvasStore();
  const { currentProject, addWall } = useProjectStore();
  
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D | null>(null);
  
  const [drawingState, setDrawingState] = useState<{ start: Point2D, current: Point2D } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getPointerMm = (e: React.MouseEvent | React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return screenToMm({ x: e.clientX - rect.left, y: e.clientY - rect.top }, zoom, panOffset);
  };

  const activeFloor = currentProject?.floors.find(f => f.id === currentProject.activeFloorId);
  const walls = activeFloor?.walls || [];
  const rooms = activeFloor?.rooms || [];

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'select') {
      selectElement(null); // click on empty canvas clears selection
      return;
    }

    if (tool === 'wall') {
      let pt = getPointerMm(e);
      pt = snapToEndpoint(pt, walls, 20 / zoom) || snapToGrid(pt, currentProject?.settings.gridSize || 100);
      setDrawingState({ start: pt, current: pt });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'wall' && drawingState) {
      let pt = getPointerMm(e);
      pt = snapToEndpoint(pt, walls, 20 / zoom) || snapToGrid(pt, currentProject?.settings.gridSize || 100);
      setDrawingState({ ...drawingState, current: pt });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }

    if (tool === 'wall' && drawingState && currentProject) {
      const { start, current } = drawingState;
      if (start.x !== current.x || start.y !== current.y) {
        addWall(currentProject.activeFloorId, {
          id: uuidv4(),
          floorId: currentProject.activeFloorId,
          start,
          end: current,
          thickness: currentProject.settings.defaultWallThickness,
          doors: [],
          windows: []
        });
      }
      setDrawingState(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.05), 5.0);
      
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      
      const newPanX = cx - (cx - panOffset.x) * (newZoom / zoom);
      const newPanY = cy - (cy - panOffset.y) * (newZoom / zoom);
      
      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    } else {
      setPanOffset({ x: panOffset.x - e.deltaX, y: panOffset.y - e.deltaY });
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 overflow-hidden relative select-none">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={tool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : tool === 'wall' ? 'cursor-crosshair' : 'cursor-default'}
      >
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          <GridLayer canvasWidth={size.w} canvasHeight={size.h} zoom={zoom} panOffset={panOffset} gridSize={currentProject?.settings.gridSize || 100} />
          <RoomLayer rooms={rooms} zoom={zoom} selectedElementId={selectedElementId} onSelect={selectElement} preferredUnit={currentProject?.settings.preferredUnit || 'mm'} />
          <WallLayer walls={walls} zoom={zoom} selectedElementId={selectedElementId} onSelect={selectElement} />
          
          {/* Drawing preview */}
          {tool === 'wall' && drawingState && (
            <line 
              x1={drawingState.start.x} y1={drawingState.start.y} 
              x2={drawingState.current.x} y2={drawingState.current.y} 
              stroke="#4f46e5" strokeWidth={currentProject?.settings.defaultWallThickness || 150} 
              strokeLinecap="square" opacity={0.5} 
            />
          )}

          <DimensionsLayer walls={walls} zoom={zoom} selectedElementId={selectedElementId} preferredUnit={currentProject?.settings.preferredUnit || 'mm'} />
        </g>
      </svg>
    </div>
  );
}
