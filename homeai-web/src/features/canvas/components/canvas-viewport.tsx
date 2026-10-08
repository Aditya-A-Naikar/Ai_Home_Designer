"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { GridLayer } from './grid-layer';
import { WallLayer } from './wall-layer';
import { RoomLayer } from './room-layer';
import { PropLayer } from './prop-layer';
import { DimensionsLayer } from './dimensions-layer';
import { screenToMm } from '@/core/canvas/transform';
import { Point2D, Wall, Door, Window } from '@/core/domain/types';
import { v4 as uuidv4 } from 'uuid';
import { 
  snapToGrid, 
  snapToEndpoint, 
  snapToOrtho, 
  getNearestWall, 
  doorPositionValid, 
  windowPositionValid,
  wallLength
} from '@/core/geometry/wall-utils';
import { Vector2D } from '@/core/geometry/vector';
import { getRoomColor } from '@/core/geometry/room-utils';

interface SnapFeedback {
  type: 'endpoint' | 'grid' | 'ortho';
  point: Point2D;
}

interface GhostPlacement {
  wall: Wall;
  offset: number;
  valid: boolean;
  point: Point2D;
}

export function CanvasViewport() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { 
    zoom, 
    panOffset, 
    setZoom, 
    setPanOffset, 
    tool, 
    setTool,
    selectedElementId, 
    selectedSubElement,
    selectElement,
    selectSubElement,
    snapToGrid: enableSnapGrid,
    snapToEndpoints: enableSnapEndpoints,
    orthoMode: enableOrthoMode,
    gridSize,
    showAllDimensions,
    doorWidth,
    doorSwing,
    windowWidth,
    windowSill
  } = useCanvasStore();

  const { 
    currentProject, 
    addWall, 
    updateWallEndpoints, 
    addDoor, 
    addWindow, 
    addRoom, 
    deleteWall,
    deleteDoor,
    deleteWindow,
    deleteRoom,
    updateProp,
    deleteProp
  } = useProjectStore();
  
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  
  // Wall Drawing state
  const [drawingWall, setDrawingWall] = useState<{ start: Point2D; current: Point2D } | null>(null);

  // Endpoint dragging state
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ wallId: string; endpoint: 'start' | 'end' } | null>(null);

  // Door / Window ghost placement
  const [ghostPlacement, setGhostPlacement] = useState<GhostPlacement | null>(null);

  // Room polygon drawing state
  const [roomVertices, setRoomVertices] = useState<Point2D[]>([]);
  const [roomCursor, setRoomCursor] = useState<Point2D | null>(null);

  // Snap feedback indicator
  const [snapFeedback, setSnapFeedback] = useState<SnapFeedback | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const finishRoomPolygon = useCallback(() => {
    if (roomVertices.length >= 3 && currentProject) {
      const activeFl = currentProject.floors.find(f => f.id === currentProject.activeFloorId);
      const roomNum = (activeFl?.rooms.length || 0) + 1;
      const newRoomId = uuidv4();
      addRoom(currentProject.activeFloorId, {
        id: newRoomId,
        floorId: currentProject.activeFloorId,
        name: `Room ${roomNum}`,
        polygon: roomVertices,
        color: getRoomColor('Living'),
      });
      selectElement(newRoomId);
      selectSubElement({ type: 'room', id: newRoomId });
      setTool('select');
      setRoomVertices([]);
      setRoomCursor(null);
    }
  }, [roomVertices, currentProject, addRoom, selectElement, selectSubElement, setTool]);

  // Listen for space key for quick pan, delete, escape, and enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === 'Space' && !e.repeat) {
        setSpacePressed(true);
      }

      if (e.key === 'Escape') {
        if (roomVertices.length > 0) {
          setRoomVertices([]);
          setRoomCursor(null);
        }
        setDrawingWall(null);
        selectElement(null);
        selectSubElement(null);
        setTool('select');
        return;
      }

      if (e.key === 'Enter') {
        if (tool === 'room' && roomVertices.length >= 3) {
          finishRoomPolygon();
          return;
        }
      }

      // Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeFloor = currentProject?.floors.find(f => f.id === currentProject.activeFloorId);
        if (!activeFloor) return;

        if (selectedSubElement) {
          if (selectedSubElement.type === 'door' && selectedSubElement.parentWallId) {
            deleteDoor(activeFloor.id, selectedSubElement.parentWallId, selectedSubElement.id);
            selectSubElement(null);
          } else if (selectedSubElement.type === 'window' && selectedSubElement.parentWallId) {
            deleteWindow(activeFloor.id, selectedSubElement.parentWallId, selectedSubElement.id);
            selectSubElement(null);
          } else if (selectedSubElement.type === 'wall') {
            deleteWall(activeFloor.id, selectedSubElement.id);
            selectElement(null);
          } else if (selectedSubElement.type === 'room') {
            deleteRoom(activeFloor.id, selectedSubElement.id);
            selectElement(null);
          } else if (selectedSubElement.type === 'prop') {
            deleteProp(activeFloor.id, selectedSubElement.id);
            selectSubElement(null);
          }
        } else if (selectedElementId) {
          deleteWall(activeFloor.id, selectedElementId);
          selectElement(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentProject, selectedSubElement, selectedElementId, deleteDoor, deleteWindow, deleteWall, deleteRoom, deleteProp, selectElement, selectSubElement, setTool, tool, roomVertices, finishRoomPolygon]);

  const getPointerMm = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return screenToMm({ x: e.clientX - rect.left, y: e.clientY - rect.top }, zoom, panOffset);
  }, [zoom, panOffset]);

  const activeFloor = currentProject?.floors.find((f) => f.id === currentProject.activeFloorId);
  const walls = useMemo(() => activeFloor?.walls || [], [activeFloor?.walls]);
  const rooms = useMemo(() => activeFloor?.rooms || [], [activeFloor?.rooms]);

  // Apply snapping pipeline to raw mm point
  const applySnapping = useCallback((rawPt: Point2D, referenceStart?: Point2D, isShiftPressed: boolean = false): { point: Point2D; feedback: SnapFeedback | null } => {
    let pt = rawPt;
    let feedback: SnapFeedback | null = null;

    // 1. Ortho snap if start point is provided and ortho is active
    if (referenceStart && (enableOrthoMode || isShiftPressed)) {
      pt = snapToOrtho(referenceStart, pt);
      feedback = { type: 'ortho', point: pt };
    }

    // 2. Vertex / Endpoint snap
    if (enableSnapEndpoints) {
      const snapEndpoint = snapToEndpoint(pt, walls, Math.max(25 / zoom, 80));
      if (snapEndpoint) {
        return { point: snapEndpoint, feedback: { type: 'endpoint', point: snapEndpoint } };
      }
    }

    // 3. Grid snap
    if (enableSnapGrid) {
      const gPt = snapToGrid(pt, gridSize);
      if (!feedback) {
        feedback = { type: 'grid', point: gPt };
      }
      return { point: gPt, feedback };
    }

    return { point: pt, feedback };
  }, [enableOrthoMode, enableSnapEndpoints, enableSnapGrid, gridSize, walls, zoom]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle click, space key, alt key, or pan tool
    if (e.button === 1 || spacePressed || tool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'select') {
      selectElement(null);
      selectSubElement(null);
      return;
    }

    if (tool === 'wall') {
      const rawPt = getPointerMm(e);
      const { point: pt } = applySnapping(rawPt, undefined, e.shiftKey);
      setDrawingWall({ start: pt, current: pt });
    }

    if ((tool === 'door' || tool === 'window') && ghostPlacement && ghostPlacement.valid && currentProject) {
      const targetWall = ghostPlacement.wall;
      if (tool === 'door') {
        const newDoorId = uuidv4();
        const newDoor: Door = {
          id: newDoorId,
          wallId: targetWall.id,
          floorId: currentProject.activeFloorId,
          offset: Math.round(ghostPlacement.offset),
          width: doorWidth,
          height: 2100,
          swingDirection: doorSwing,
        };
        addDoor(currentProject.activeFloorId, targetWall.id, newDoor);
        selectSubElement({ type: 'door', id: newDoorId, parentWallId: targetWall.id });
      } else {
        const newWinId = uuidv4();
        const newWindow: Window = {
          id: newWinId,
          wallId: targetWall.id,
          floorId: currentProject.activeFloorId,
          offset: Math.round(ghostPlacement.offset),
          width: windowWidth,
          height: 1200,
          sillHeight: windowSill,
        };
        addWindow(currentProject.activeFloorId, targetWall.id, newWindow);
        selectSubElement({ type: 'window', id: newWinId, parentWallId: targetWall.id });
      }
    }

    if (tool === 'room') {
      const rawPt = getPointerMm(e);
      const { point: pt } = applySnapping(rawPt, undefined, e.shiftKey);

      // Check if user clicked near first vertex to close room
      if (roomVertices.length >= 3) {
        const first = roomVertices[0];
        const dist = new Vector2D(pt.x, pt.y).distanceTo(first);
        if (dist <= Math.max(30 / zoom, 250)) {
          // Close room!
          finishRoomPolygon();
          return;
        }
      }

      setRoomVertices(prev => [...prev, pt]);
      setRoomCursor(pt);
    }
  };

  const handleDoubleClick = () => {
    if (tool === 'room' && roomVertices.length >= 3) {
      finishRoomPolygon();
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

    const rawPt = getPointerMm(e);

    // Wall drawing preview
    if (tool === 'wall' && drawingWall) {
      const { point: pt, feedback } = applySnapping(rawPt, drawingWall.start, e.shiftKey);
      setDrawingWall({ ...drawingWall, current: pt });
      setSnapFeedback(feedback);
      return;
    }

    // Endpoint dragging
    if (draggingEndpoint && currentProject) {
      const activeFloor = currentProject.floors.find(f => f.id === currentProject.activeFloorId);
      const wall = activeFloor?.walls.find(w => w.id === draggingEndpoint.wallId);
      if (wall) {
        const refPt = draggingEndpoint.endpoint === 'start' ? wall.end : wall.start;
        const { point: pt, feedback } = applySnapping(rawPt, refPt, e.shiftKey);
        setSnapFeedback(feedback);

        const newStart = draggingEndpoint.endpoint === 'start' ? pt : wall.start;
        const newEnd = draggingEndpoint.endpoint === 'end' ? pt : wall.end;
        updateWallEndpoints(currentProject.activeFloorId, wall.id, newStart, newEnd);
      }
      return;
    }

    // Door / Window ghost preview
    if (tool === 'door' || tool === 'window') {
      const nearest = getNearestWall(rawPt, walls, Math.max(350 / zoom, 250));
      if (nearest) {
        const wLen = wallLength(nearest.wall);
        const elemWidth = tool === 'door' ? doorWidth : windowWidth;
        const clampedOffset = Math.max(elemWidth / 2 + 50, Math.min(wLen - elemWidth / 2 - 50, nearest.offset));
        const isValid = tool === 'door' 
          ? doorPositionValid(nearest.wall, clampedOffset, elemWidth)
          : windowPositionValid(nearest.wall, clampedOffset, elemWidth);

        setGhostPlacement({
          wall: nearest.wall,
          offset: clampedOffset,
          valid: isValid,
          point: nearest.point,
        });
      } else {
        setGhostPlacement(null);
      }
      return;
    }

    // Room cursor
    if (tool === 'room' && roomVertices.length > 0) {
      const { point: pt, feedback } = applySnapping(rawPt, roomVertices[roomVertices.length - 1], e.shiftKey);
      setRoomCursor(pt);
      setSnapFeedback(feedback);
      return;
    }

    // General hover snap feedback
    if (tool === 'wall' || tool === 'select') {
      const { feedback } = applySnapping(rawPt, undefined, e.shiftKey);
      setSnapFeedback(feedback);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }

    if (draggingEndpoint) {
      setDraggingEndpoint(null);
      return;
    }

    if (tool === 'wall' && drawingWall && currentProject) {
      const { start, current } = drawingWall;
      const len = new Vector2D(start.x, start.y).distanceTo(current);
      if (len > 50) {
        const newWallId = uuidv4();
        addWall(currentProject.activeFloorId, {
          id: newWallId,
          floorId: currentProject.activeFloorId,
          start,
          end: current,
          thickness: currentProject.settings.defaultWallThickness,
          doors: [],
          windows: [],
        });
        selectElement(newWallId);
      }
      setDrawingWall(null);
      setSnapFeedback(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.05), 5.0);
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const newPanX = cx - (cx - panOffset.x) * (newZoom / zoom);
    const newPanY = cy - (cy - panOffset.y) * (newZoom / zoom);
    
    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handleEndpointPointerDown = (wallId: string, endpoint: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingEndpoint({ wallId, endpoint });
  };

  // Preview drawing wall stats
  const drawingLen = drawingWall ? new Vector2D(drawingWall.start.x, drawingWall.start.y).distanceTo(drawingWall.current) : 0;
  const drawingMid = drawingWall ? { x: (drawingWall.start.x + drawingWall.current.x) / 2, y: (drawingWall.start.y + drawingWall.current.y) / 2 } : null;

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 overflow-hidden relative select-none">
      {/* Floating Helper Banner for Room Tool */}
      {tool === 'room' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3.5 py-1.5 rounded-full shadow-lg text-xs flex items-center gap-2.5 z-20 backdrop-blur pointer-events-auto select-none border border-slate-700/60">
          <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-medium text-slate-100">
            {roomVertices.length === 0 
              ? "Click anywhere to place first room corner" 
              : roomVertices.length < 3
              ? `Placed ${roomVertices.length} point(s) • Click to add corners`
              : `Placed ${roomVertices.length} points • Double-click or click start point to close`}
          </span>
          {roomVertices.length >= 3 && (
            <button
              onClick={finishRoomPolygon}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              Finish Room
            </button>
          )}
          <button
            onClick={() => { setRoomVertices([]); setRoomCursor(null); setTool('select'); }}
            className="text-slate-400 hover:text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          if (roomVertices.length > 0) {
            setRoomVertices([]);
            setRoomCursor(null);
            setTool('select');
          }
        }}
        onWheel={handleWheel}
        className={
          tool === 'pan' || isPanning || spacePressed
            ? 'cursor-grab active:cursor-grabbing'
            : tool === 'wall' || tool === 'room'
            ? 'cursor-crosshair'
            : tool === 'door' || tool === 'window'
            ? 'cursor-pointer'
            : 'cursor-default'
        }
      >
        {/* Full-bleed background click catcher for instant blank-space deselection */}
        <rect width={size.w} height={size.h} fill="transparent" pointerEvents="all" />

        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {/* Architectural Grid Layer */}
          <GridLayer 
            canvasWidth={size.w} 
            canvasHeight={size.h} 
            zoom={zoom} 
            panOffset={panOffset} 
            gridSize={gridSize} 
          />

          {/* Rooms Layer */}
          <RoomLayer 
            rooms={rooms} 
            zoom={zoom} 
            selectedElementId={selectedElementId} 
            onSelect={(id) => {
              if (!id) {
                selectElement(null);
                selectSubElement(null);
              } else {
                selectElement(id);
                selectSubElement({ type: 'room', id });
              }
            }} 
            preferredUnit={currentProject?.settings.preferredUnit || 'mm'} 
          />

          {/* Props & Furniture Accessories Layer */}
          <PropLayer
            props={activeFloor?.props || []}
            zoom={zoom}
            selectedSubElement={selectedSubElement}
            onSelectProp={(propId) => {
              selectSubElement({ type: 'prop', id: propId });
            }}
            onDeleteProp={(propId) => {
              if (activeFloor) {
                deleteProp(activeFloor.id, propId);
                selectSubElement(null);
              }
            }}
            onRotateProp={(propId) => {
              if (activeFloor) {
                updateProp(activeFloor.id, propId, (p) => {
                  p.rotation = ((p.rotation || 0) + 90) % 360;
                });
              }
            }}
          />

          {/* Room Polygon In-Progress Drawing */}
          {tool === 'room' && roomVertices.length > 0 && (
            <g pointerEvents="none">
              <polygon
                points={[...roomVertices, ...(roomCursor ? [roomCursor] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                fill="#38bdf8"
                fillOpacity={0.25}
                stroke="#0284c7"
                strokeWidth={2 / zoom}
                strokeDasharray={`${4 / zoom},${4 / zoom}`}
              />
              {roomVertices.map((v, i) => (
                <circle 
                  key={`rv-${i}`} 
                  cx={v.x} 
                  cy={v.y} 
                  r={Math.max(6 / zoom, 4)} 
                  fill={i === 0 ? '#10b981' : '#0284c7'} 
                  stroke="#ffffff" 
                  strokeWidth={2 / zoom} 
                />
              ))}
            </g>
          )}

          {/* Walls Layer with Doors and Windows */}
          <WallLayer 
            walls={walls} 
            zoom={zoom} 
            selectedElementId={selectedElementId} 
            selectedSubElement={selectedSubElement}
            onSelect={(id) => {
              selectElement(id);
              selectSubElement({ type: 'wall', id });
            }}
            onSelectSubElement={(sel) => {
              selectSubElement(sel);
            }}
            onEndpointPointerDown={handleEndpointPointerDown}
          />
          
          {/* Wall Drawing Live Preview */}
          {tool === 'wall' && drawingWall && (
            <g pointerEvents="none">
              <line 
                x1={drawingWall.start.x} y1={drawingWall.start.y} 
                x2={drawingWall.current.x} y2={drawingWall.current.y} 
                stroke="#4f46e5" 
                strokeWidth={currentProject?.settings.defaultWallThickness || 150} 
                strokeLinecap="square" 
                opacity={0.6} 
              />
              <circle cx={drawingWall.start.x} cy={drawingWall.start.y} r={6 / zoom} fill="#4f46e5" />
              <circle cx={drawingWall.current.x} cy={drawingWall.current.y} r={6 / zoom} fill="#4f46e5" />
              
              {/* Length indicator callout */}
              {drawingMid && (
                <g transform={`translate(${drawingMid.x}, ${drawingMid.y - 30}) scale(${1 / zoom})`}>
                  <rect x={-35} y={-12} width={70} height={20} fill="#1e1b4b" rx={4} />
                  <text x={0} y={2} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold">
                    {Math.round(drawingLen)} mm
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Ghost Door / Window placement preview */}
          {(tool === 'door' || tool === 'window') && ghostPlacement && (
            <g pointerEvents="none">
              {(() => {
                const wall = ghostPlacement.wall;
                const v = Vector2D.fromPoints(wall.start, wall.end);
                const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);
                const elemW = tool === 'door' ? doorWidth : windowWidth;
                const isDoor = tool === 'door';

                return (
                  <g transform={`translate(${wall.start.x}, ${wall.start.y}) rotate(${angle}) translate(${ghostPlacement.offset}, 0)`}>
                    <rect 
                      x={-elemW / 2} 
                      y={-wall.thickness / 2 - 2} 
                      width={elemW} 
                      height={wall.thickness + 4} 
                      fill={ghostPlacement.valid ? '#ecfdf5' : '#fee2e2'} 
                      stroke={ghostPlacement.valid ? '#10b981' : '#ef4444'} 
                      strokeWidth={2 / zoom}
                      strokeDasharray={`${4 / zoom},${2 / zoom}`}
                    />
                    {isDoor && (
                      <path 
                        d={`M ${-elemW / 2} ${-wall.thickness / 2} A ${elemW} ${elemW} 0 0 1 ${elemW / 2} ${-wall.thickness / 2 - elemW}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={1.5 / zoom}
                        strokeDasharray={`${4 / zoom},${2 / zoom}`}
                      />
                    )}
                    <g transform={`scale(${1 / zoom})`}>
                      <text x={0} y={-wall.thickness - 10} textAnchor="middle" fill="#047857" fontSize={11} fontWeight="bold">
                        {Math.round(ghostPlacement.offset)} mm
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Magnetic Snap Feedback Glyphs */}
          {snapFeedback && (
            <g pointerEvents="none">
              {snapFeedback.type === 'endpoint' && (
                <g transform={`translate(${snapFeedback.point.x}, ${snapFeedback.point.y})`}>
                  <circle r={10 / zoom} fill="none" stroke="#10b981" strokeWidth={2 / zoom} />
                  <circle r={3 / zoom} fill="#10b981" />
                </g>
              )}
              {snapFeedback.type === 'grid' && (
                <g transform={`translate(${snapFeedback.point.x}, ${snapFeedback.point.y})`}>
                  <line x1={-6 / zoom} y1={0} x2={6 / zoom} y2={0} stroke="#38bdf8" strokeWidth={1.5 / zoom} />
                  <line x1={0} y1={-6 / zoom} x2={0} y2={6 / zoom} stroke="#38bdf8" strokeWidth={1.5 / zoom} />
                </g>
              )}
            </g>
          )}

          {/* Dimensions Layer */}
          <DimensionsLayer 
            walls={walls} 
            zoom={zoom} 
            selectedElementId={selectedElementId} 
            preferredUnit={currentProject?.settings.preferredUnit || 'mm'} 
            showAll={showAllDimensions}
          />
        </g>
      </svg>

      {/* Floating Canvas Status Tips */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-xs text-slate-600 flex items-center space-x-3 pointer-events-none">
        <span>Tool: <strong className="text-indigo-600 uppercase font-semibold">{tool}</strong></span>
        <span>•</span>
        <span>Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
        <span>•</span>
        <span>Grid: <strong>{enableSnapGrid ? `${gridSize}mm` : 'OFF'}</strong></span>
        <span>•</span>
        <span>Snap: <strong>{enableSnapEndpoints ? 'ON' : 'OFF'}</strong></span>
        <span>•</span>
        <span>Ortho: <strong>{enableOrthoMode ? 'ON' : 'Shift'}</strong></span>
      </div>
    </div>
  );
}
