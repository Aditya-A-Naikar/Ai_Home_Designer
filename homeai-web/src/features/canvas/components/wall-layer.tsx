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
        const v = Vector2D.fromPoints(wall.start, wall.end);
        const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);

        // Wall Typology Styling
        let strokeColor = '#334155';
        let strokeDash: string | undefined = undefined;

        if (wall.wallType === 'exterior_bearing') {
          strokeColor = '#0f172a'; // Deep charcoal/black for 230mm bearing walls
        } else if (wall.wallType === 'interior_partition') {
          strokeColor = '#64748b'; // Lighter slate for 115mm partitions
        } else if (wall.wallType === 'parapet') {
          strokeColor = '#94a3b8';
          strokeDash = `${8 / zoom},${4 / zoom}`;
        } else if (wall.wallType === 'wet_chase') {
          strokeColor = '#1e293b';
        }

        if (isWallSelected) {
          strokeColor = '#4f46e5';
        }

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
              strokeDasharray={strokeDash}
            />
            
            {/* Render Doors Inline with Architectural Typologies */}
            {wall.doors.map((door) => {
              const isDoorSelected = selectedSubElement?.type === 'door' && selectedSubElement.id === door.id;
              const halfW = door.width / 2;
              const halfT = wall.thickness / 2;
              const swing = door.swingDirection || 'inward_right';
              const doorType = door.doorType || 'single_swing';
              
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

                  {/* DOUBLE ENTRY DOOR (Dual Swing Panels) */}
                  {doorType === 'double_entry' ? (
                    <>
                      {/* Left Leaf Swing */}
                      <line x1={-halfW} y1={hingeY} x2={-halfW} y2={swingY / 2} stroke={isDoorSelected ? '#4f46e5' : '#475569'} strokeWidth={Math.max(2.5 / zoom, 1.5)} />
                      <path 
                        d={`M 0 ${hingeY} A ${halfW} ${halfW} 0 0 ${isOutward ? 1 : 0} ${-halfW} ${swingY / 2}`}
                        fill="none"
                        stroke={isDoorSelected ? '#4f46e5' : '#94a3b8'}
                        strokeWidth={Math.max(1.5 / zoom, 1)}
                        strokeDasharray={`${5 / zoom},${3 / zoom}`}
                      />

                      {/* Right Leaf Swing */}
                      <line x1={halfW} y1={hingeY} x2={halfW} y2={swingY / 2} stroke={isDoorSelected ? '#4f46e5' : '#475569'} strokeWidth={Math.max(2.5 / zoom, 1.5)} />
                      <path 
                        d={`M 0 ${hingeY} A ${halfW} ${halfW} 0 0 ${isOutward ? 0 : 1} ${halfW} ${swingY / 2}`}
                        fill="none"
                        stroke={isDoorSelected ? '#4f46e5' : '#94a3b8'}
                        strokeWidth={Math.max(1.5 / zoom, 1)}
                        strokeDasharray={`${5 / zoom},${3 / zoom}`}
                      />
                    </>
                  ) : doorType === 'sliding_patio' ? (
                    /* SLIDING PATIO GLASS DOOR */
                    <>
                      {/* Fixed panel */}
                      <rect x={-halfW} y={-4 / zoom} width={halfW + 10} height={8 / zoom} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.5 / zoom} />
                      {/* Sliding active panel */}
                      <rect x={-10} y={-10 / zoom} width={halfW + 10} height={8 / zoom} fill="#cbd5e1" stroke="#0284c7" strokeWidth={1.5 / zoom} />
                      {/* Slide motion arrows */}
                      <line x1={10} y1={-15 / zoom} x2={halfW - 10} y2={-15 / zoom} stroke="#0284c7" strokeWidth={1 / zoom} />
                      <polygon points={`${halfW - 10},${-15 / zoom} ${halfW - 16},${-18 / zoom} ${halfW - 16},${-12 / zoom}`} fill="#0284c7" />
                    </>
                  ) : doorType === 'pocket' ? (
                    /* POCKET SLIDING DOOR (slides into wall slot) */
                    <>
                      <rect x={-halfW} y={-halfT / 2} width={door.width * 0.75} height={halfT} fill="#f1f5f9" stroke="#475569" strokeWidth={1.5 / zoom} />
                      <line x1={door.width * 0.25 - halfW} y1={0} x2={halfW} y2={0} stroke="#94a3b8" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom},${3 / zoom}`} />
                    </>
                  ) : (
                    /* STANDARD SINGLE SWING DOOR */
                    <>
                      <line 
                        x1={hingeX} 
                        y1={hingeY} 
                        x2={hingeX} 
                        y2={swingY} 
                        stroke={isDoorSelected ? '#4f46e5' : '#475569'}
                        strokeWidth={Math.max(3 / zoom, 2)} 
                      />
                      <path 
                        d={`M ${isLeft ? halfW : -halfW} ${hingeY} A ${door.width} ${door.width} 0 0 ${arcSweep} ${hingeX} ${swingY}`}
                        fill="none"
                        stroke={isDoorSelected ? '#4f46e5' : '#94a3b8'}
                        strokeWidth={Math.max(1.5 / zoom, 1)}
                        strokeDasharray={`${6 / zoom},${4 / zoom}`}
                      />
                    </>
                  )}

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
            
            {/* Render Windows Inline with Architectural Openings */}
            {wall.windows.map((win) => {
              const isWinSelected = selectedSubElement?.type === 'window' && selectedSubElement.id === win.id;
              const halfW = win.width / 2;
              const halfT = wall.thickness / 2;
              const winType = win.windowType || 'sliding';
              const hasChajja = win.chajjaSunshade ?? (wall.wallType === 'exterior_bearing');

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
                  {/* EXTERIOR CHAJJA SUNSHADE (Tropical / NBC Weather Protection) */}
                  {hasChajja && (
                    <g pointerEvents="none">
                      <line
                        x1={-halfW - 150}
                        y1={halfT + 450}
                        x2={halfW + 150}
                        y2={halfT + 450}
                        stroke="#64748b"
                        strokeWidth={Math.max(1.5 / zoom, 1)}
                        strokeDasharray={`${6 / zoom},${4 / zoom}`}
                      />
                      <line x1={-halfW - 150} y1={halfT} x2={-halfW - 150} y2={halfT + 450} stroke="#94a3b8" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom},${3 / zoom}`} />
                      <line x1={halfW + 150} y1={halfT} x2={halfW + 150} y2={halfT + 450} stroke="#94a3b8" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom},${3 / zoom}`} />
                    </g>
                  )}

                  {/* Window Wall Cutout */}
                  <rect 
                    x={-halfW} 
                    y={-halfT - 1} 
                    width={win.width} 
                    height={wall.thickness + 2} 
                    fill="#f0f9ff" 
                    stroke={isWinSelected ? '#4f46e5' : '#0284c7'}
                    strokeWidth={Math.max(1.5 / zoom, 1)}
                  />

                  {/* Window frame jambs */}
                  <line x1={-halfW} y1={-halfT} x2={-halfW} y2={halfT} stroke="#0f172a" strokeWidth={Math.max(3 / zoom, 2)} />
                  <line x1={halfW} y1={-halfT} x2={halfW} y2={halfT} stroke="#0f172a" strokeWidth={Math.max(3 / zoom, 2)} />

                  {/* High-Sill Louvered Ventilator Symbol (Bathrooms / Toilets) */}
                  {winType === 'louver_ventilator' ? (
                    <g pointerEvents="none">
                      {[-0.6, -0.2, 0.2, 0.6].map((lFrac, lIdx) => (
                        <line
                          key={`louver-${lIdx}`}
                          x1={-halfW + 15}
                          y1={halfT * lFrac - 4}
                          x2={halfW - 15}
                          y2={halfT * lFrac + 4}
                          stroke="#0284c7"
                          strokeWidth={Math.max(1.5 / zoom, 1)}
                        />
                      ))}
                    </g>
                  ) : (
                    /* Double glass pane lines */
                    <>
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
                    </>
                  )}

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
