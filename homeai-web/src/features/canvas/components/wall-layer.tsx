import React from 'react';
import { Wall } from '@/core/domain/types';
import { Vector2D } from '@/core/geometry/vector';

interface WallLayerProps {
  walls: Wall[];
  zoom: number;
  selectedElementId: string | null;
  onSelect?: (id: string) => void;
}

export function WallLayer({ walls, zoom, selectedElementId, onSelect }: WallLayerProps) {
  return (
    <g className="wall-layer">
      {walls.map((wall) => {
        const isSelected = wall.id === selectedElementId;
        const strokeColor = isSelected ? '#4f46e5' : '#334155'; // indigo-600 or slate-700
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
            {/* Hit area for easier clicking */}
            <line
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke="transparent"
              strokeWidth={Math.max(wall.thickness + 20, 40 / zoom)}
            />
            {/* Actual Wall */}
            <line
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke={strokeColor}
              strokeWidth={wall.thickness}
              strokeLinecap="square"
            />
            
            {/* Render Doors Inline */}
            {wall.doors.map(door => {
              return (
                <g key={door.id} transform={`translate(${wall.start.x}, ${wall.start.y}) rotate(${angle}) translate(${door.offset}, 0)`}>
                  <rect 
                    x={-door.width / 2} 
                    y={-wall.thickness / 2} 
                    width={door.width} 
                    height={wall.thickness} 
                    fill="#fff" 
                    stroke={strokeColor}
                    strokeWidth={2 / zoom}
                  />
                  {/* Basic arc to show swing direction */}
                  <path 
                    d={`M ${-door.width/2} ${-wall.thickness/2} A ${door.width} ${door.width} 0 0 1 ${door.width/2} ${-wall.thickness/2 - door.width}`}
                    fill="transparent"
                    stroke={strokeColor}
                    strokeWidth={2 / zoom}
                    strokeDasharray={`${5/zoom},${5/zoom}`}
                  />
                </g>
              );
            })}
            
            {/* Render Windows Inline */}
            {wall.windows.map(win => {
              return (
                <g key={win.id} transform={`translate(${wall.start.x}, ${wall.start.y}) rotate(${angle}) translate(${win.offset}, 0)`}>
                  <rect 
                    x={-win.width / 2} 
                    y={-wall.thickness / 2} 
                    width={win.width} 
                    height={wall.thickness} 
                    fill="#e0f2fe" // sky-100
                    stroke={strokeColor}
                    strokeWidth={2 / zoom}
                  />
                  <line 
                    x1={-win.width / 2} 
                    y1={0} 
                    x2={win.width / 2} 
                    y2={0} 
                    stroke={strokeColor} 
                    strokeWidth={2 / zoom} 
                  />
                </g>
              );
            })}

            {/* Endpoints if selected */}
            {isSelected && (
              <>
                <circle cx={wall.start.x} cy={wall.start.y} r={10 / zoom} fill="#fff" stroke="#4f46e5" strokeWidth={3 / zoom} />
                <circle cx={wall.end.x} cy={wall.end.y} r={10 / zoom} fill="#fff" stroke="#4f46e5" strokeWidth={3 / zoom} />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
