import React from 'react';
import { Wall } from '@/core/domain/types';
import { Vector2D } from '@/core/geometry/vector';
import { SubElementSelection } from '@/store/canvas-store';

interface WallLayerProps {
  walls: Wall[];
  zoom: number;
  selectedElementId: string | null;
  selectedSubElement?: SubElementSelection | null;
  onSelect?: (id: string) => void;
  onSelectSubElement?: (sel: SubElementSelection) => void;
  onEndpointPointerDown?: (wallId: string, endpoint: 'start' | 'end', e: React.PointerEvent) => void;
}

export function WallLayer({
  walls,
  zoom,
  selectedElementId,
  selectedSubElement,
  onSelect,
  onSelectSubElement,
  onEndpointPointerDown,
}: WallLayerProps) {
  return (
    <g className="wall-layer">
      {walls.map((wall) => {
        const isWallSelected = wall.id === selectedElementId && (!selectedSubElement || selectedSubElement.type === 'wall');
        const strokeColor = isWallSelected ? '#4f46e5' : '#334155'; // indigo-600 or slate-700
        const v = Vector2D.fromPoints(wall.start, wall.end);
        const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);
        
        return (
          <g 
            key={wall.id} 
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(wall.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Wide transparent hit area for easier clicking */}
            <line
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke="transparent"
              strokeWidth={Math.max(wall.thickness + 30, 40 / zoom)}
            />

            {/* Actual Wall Body */}
            <line
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke={strokeColor}
              strokeWidth={wall.thickness}
              strokeLinecap="square"
            />
            
            {/* Render Doors Inline with Architectural Swing Arc */}
            {wall.doors.map((door) => {
              const isDoorSelected = selectedSubElement?.type === 'door' && selectedSubElement.id === door.id;
              const halfW = door.width / 2;
              const halfT = wall.thickness / 2;
              const swing = door.swingDirection || 'inward_right';
              
              // Hinge and panel positions
              const isLeft = swing.includes('left');
              const isOutward = swing.includes('outward');
              const hingeX = isLeft ? -halfW : halfW;
              const hingeY = isOutward ? halfT : -halfT;
              const swingY = isOutward ? (halfT + door.width) : (-halfT - door.width);
              const arcSweep = isOutward !== isLeft ? 1 : 0;

              return (
                <g 
                  key={door.id} 
                  transform={`translate(${wall.start.x}, ${wall.start.y}) rotate(${angle}) translate(${door.offset}, 0)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubElement?.({ type: 'door', id: door.id, parentWallId: wall.id });
                  }}
                  className="cursor-pointer"
                >
                  {/* Wall Opening Cutout */}
                  <rect 
                    x={-halfW} 
                    y={-halfT - 1} 
                    width={door.width} 
                    height={wall.thickness + 2} 
                    fill="#ffffff" 
                    stroke={isDoorSelected ? '#4f46e5' : '#64748b'}
                    strokeWidth={Math.max(2 / zoom, 1)}
                  />
                  
                  {/* Door frame jambs */}
                  <line x1={-halfW} y1={-halfT} x2={-halfW} y2={halfT} stroke="#1e293b" strokeWidth={Math.max(3 / zoom, 2)} />
                  <line x1={halfW} y1={-halfT} x2={halfW} y2={halfT} stroke="#1e293b" strokeWidth={Math.max(3 / zoom, 2)} />

                  {/* Open Door Panel Line (90 degrees to wall) */}
                  <line 
                    x1={hingeX} 
                    y1={hingeY} 
                    x2={hingeX} 
                    y2={swingY} 
                    stroke={isDoorSelected ? '#4f46e5' : '#475569'}
                    strokeWidth={Math.max(3 / zoom, 2)} 
                  />

                  {/* Quarter-Circle Swing Arc */}
                  <path 
                    d={`M ${isLeft ? halfW : -halfW} ${hingeY} A ${door.width} ${door.width} 0 0 ${arcSweep} ${hingeX} ${swingY}`}
                    fill="none"
                    stroke={isDoorSelected ? '#4f46e5' : '#94a3b8'}
                    strokeWidth={Math.max(1.5 / zoom, 1)}
                    strokeDasharray={`${6 / zoom},${4 / zoom}`}
                  />

                  {/* Selection indicator outline */}
                  {isDoorSelected && (
                    <rect 
                      x={-halfW - 40} 
                      y={-halfT - (isOutward ? 0 : door.width) - 20} 
                      width={door.width + 80} 
                      height={wall.thickness + door.width + 40} 
                      fill="none" 
                      stroke="#4f46e5" 
                      strokeWidth={1.5 / zoom} 
                      strokeDasharray={`${4 / zoom},${4 / zoom}`}
                      rx={6}
                    />
                  )}
                </g>
              );
            })}
            
            {/* Render Windows Inline with Architectural Symbol */}
            {wall.windows.map((win) => {
              const isWinSelected = selectedSubElement?.type === 'window' && selectedSubElement.id === win.id;
              const halfW = win.width / 2;
              const halfT = wall.thickness / 2;

              return (
                <g 
                  key={win.id} 
                  transform={`translate(${wall.start.x}, ${wall.start.y}) rotate(${angle}) translate(${win.offset}, 0)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubElement?.({ type: 'window', id: win.id, parentWallId: wall.id });
                  }}
                  className="cursor-pointer"
                >
                  {/* Window Wall Cutout */}
                  <rect 
                    x={-halfW} 
                    y={-halfT - 1} 
                    width={win.width} 
                    height={wall.thickness + 2} 
                    fill="#f0f9ff" // subtle sky tint
                    stroke={isWinSelected ? '#4f46e5' : '#0284c7'}
                    strokeWidth={Math.max(1.5 / zoom, 1)}
                  />

                  {/* Window frame jambs */}
                  <line x1={-halfW} y1={-halfT} x2={-halfW} y2={halfT} stroke="#0f172a" strokeWidth={Math.max(3 / zoom, 2)} />
                  <line x1={halfW} y1={-halfT} x2={halfW} y2={halfT} stroke="#0f172a" strokeWidth={Math.max(3 / zoom, 2)} />

                  {/* Double glass pane lines */}
                  <line 
                    x1={-halfW} 
                    y1={-halfT / 3} 
                    x2={halfW} 
                    y2={-halfT / 3} 
                    stroke={isWinSelected ? '#4f46e5' : '#0284c7'} 
                    strokeWidth={Math.max(1.5 / zoom, 1)} 
                  />
                  <line 
                    x1={-halfW} 
                    y1={halfT / 3} 
                    x2={halfW} 
                    y2={halfT / 3} 
                    stroke={isWinSelected ? '#4f46e5' : '#0284c7'} 
                    strokeWidth={Math.max(1.5 / zoom, 1)} 
                  />

                  {/* Exterior Sill line */}
                  <line 
                    x1={-halfW - 20} 
                    y1={halfT + 4} 
                    x2={halfW + 20} 
                    y2={halfT + 4} 
                    stroke="#475569" 
                    strokeWidth={Math.max(2 / zoom, 1.5)} 
                  />

                  {/* Selection indicator outline */}
                  {isWinSelected && (
                    <rect 
                      x={-halfW - 30} 
                      y={-halfT - 20} 
                      width={win.width + 60} 
                      height={wall.thickness + 40} 
                      fill="none" 
                      stroke="#4f46e5" 
                      strokeWidth={1.5 / zoom} 
                      strokeDasharray={`${4 / zoom},${4 / zoom}`}
                      rx={4}
                    />
                  )}
                </g>
              );
            })}

            {/* Endpoints Drag Handles if wall selected */}
            {isWallSelected && (
              <>
                <g
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onEndpointPointerDown?.(wall.id, 'start', e);
                  }}
                  className="cursor-move"
                >
                  <circle 
                    cx={wall.start.x} 
                    cy={wall.start.y} 
                    r={Math.max(12 / zoom, 6)} 
                    fill="#ffffff" 
                    stroke="#4f46e5" 
                    strokeWidth={Math.max(3 / zoom, 2)} 
                  />
                  <circle 
                    cx={wall.start.x} 
                    cy={wall.start.y} 
                    r={Math.max(4 / zoom, 2)} 
                    fill="#4f46e5" 
                  />
                </g>

                <g
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onEndpointPointerDown?.(wall.id, 'end', e);
                  }}
                  className="cursor-move"
                >
                  <circle 
                    cx={wall.end.x} 
                    cy={wall.end.y} 
                    r={Math.max(12 / zoom, 6)} 
                    fill="#ffffff" 
                    stroke="#4f46e5" 
                    strokeWidth={Math.max(3 / zoom, 2)} 
                  />
                  <circle 
                    cx={wall.end.x} 
                    cy={wall.end.y} 
                    r={Math.max(4 / zoom, 2)} 
                    fill="#4f46e5" 
                  />
                </g>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
