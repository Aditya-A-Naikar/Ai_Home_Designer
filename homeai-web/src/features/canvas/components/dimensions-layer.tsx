import React from 'react';
import { Wall } from '@/core/domain/types';
import { Vector2D } from '@/core/geometry/vector';

interface DimensionsLayerProps {
  walls: Wall[];
  zoom: number;
  selectedElementId: string | null;
  preferredUnit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  showAll?: boolean;
}

export function DimensionsLayer({ walls, zoom, selectedElementId, preferredUnit, showAll = false }: DimensionsLayerProps) {
  const formatLength = (lenMm: number) => {
    if (preferredUnit === 'm') return (lenMm / 1000).toFixed(2) + ' m';
    if (preferredUnit === 'ft') return (lenMm / 304.8).toFixed(2) + ' ft';
    if (preferredUnit === 'cm') return (lenMm / 10).toFixed(1) + ' cm';
    return Math.round(lenMm) + ' mm';
  };

  return (
    <g className="dimensions-layer">
      {walls.map((wall) => {
        const isSelected = wall.id === selectedElementId;
        if (!showAll && !isSelected) return null;
        
        const v = Vector2D.fromPoints(wall.start, wall.end);
        const len = v.length();
        if (len < 100) return null; // Avoid drawing dimensions on zero-length walls

        const normal = v.normalize().perpendicular();
        
        // Offset dimension line
        const offsetDist = isSelected ? 350 : 250;
        const p1 = new Vector2D(wall.start.x, wall.start.y).add(normal.scale(offsetDist));
        const p2 = new Vector2D(wall.end.x, wall.end.y).add(normal.scale(offsetDist));
        const mid = new Vector2D((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);
        const flipText = angle > 90 || angle < -90;
        const textAngle = flipText ? angle + 180 : angle;

        // Architectural 45-degree slash ticks
        const tickSize = Math.max(12 / zoom, 8);
        const strokeColor = isSelected ? '#4338ca' : '#64748b'; // indigo-700 or slate-500
        const strokeW = Math.max((isSelected ? 2 : 1.5) / zoom, 1);

        return (
          <g key={`dim-${wall.id}`} pointerEvents="none">
            {/* Extension lines from wall endpoints */}
            <line 
              x1={wall.start.x} y1={wall.start.y} 
              x2={p1.x} y2={p1.y} 
              stroke="#94a3b8" 
              strokeWidth={Math.max(1 / zoom, 0.75)} 
              strokeDasharray={`${4 / zoom},${4 / zoom}`} 
            />
            <line 
              x1={wall.end.x} y1={wall.end.y} 
              x2={p2.x} y2={p2.y} 
              stroke="#94a3b8" 
              strokeWidth={Math.max(1 / zoom, 0.75)} 
              strokeDasharray={`${4 / zoom},${4 / zoom}`} 
            />
            
            {/* Dimension line */}
            <line 
              x1={p1.x} y1={p1.y} 
              x2={p2.x} y2={p2.y} 
              stroke={strokeColor} 
              strokeWidth={strokeW} 
            />
            
            {/* Ticks at start and end */}
            <line 
              x1={p1.x - tickSize / 2} y1={p1.y - tickSize / 2} 
              x2={p1.x + tickSize / 2} y2={p1.y + tickSize / 2} 
              stroke={strokeColor} 
              strokeWidth={strokeW * 1.5} 
            />
            <line 
              x1={p2.x - tickSize / 2} y1={p2.y - tickSize / 2} 
              x2={p2.x + tickSize / 2} y2={p2.y + tickSize / 2} 
              stroke={strokeColor} 
              strokeWidth={strokeW * 1.5} 
            />

            {/* Dimension Text Label */}
            <g transform={`translate(${mid.x}, ${mid.y}) rotate(${textAngle}) scale(${1 / zoom})`}>
              <rect 
                x={-35} 
                y={-14} 
                width={70} 
                height={20} 
                fill="#ffffff" 
                stroke={isSelected ? '#4f46e5' : '#cbd5e1'}
                strokeWidth={1}
                rx={4} 
              />
              <text 
                x={0} 
                y={0} 
                dominantBaseline="middle"
                textAnchor="middle" 
                fill={isSelected ? '#312e81' : '#334155'} 
                fontSize={11} 
                fontWeight={isSelected ? '600' : '500'}
              >
                {formatLength(len)}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
