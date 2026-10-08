import React from 'react';
import { Wall } from '@/core/domain/types';
import { Vector2D } from '@/core/geometry/vector';

interface DimensionsLayerProps {
  walls: Wall[];
  zoom: number;
  selectedElementId: string | null;
  preferredUnit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

export function DimensionsLayer({ walls, zoom, selectedElementId, preferredUnit }: DimensionsLayerProps) {
  const formatLength = (lenMm: number) => {
    if (preferredUnit === 'm') return (lenMm / 1000).toFixed(2) + 'm';
    if (preferredUnit === 'ft') return (lenMm / 304.8).toFixed(2) + 'ft';
    if (preferredUnit === 'cm') return (lenMm / 10).toFixed(1) + 'cm';
    return Math.round(lenMm) + 'mm';
  };

  return (
    <g className="dimensions-layer">
      {walls.map((wall) => {
        if (wall.id !== selectedElementId) return null; // only show for selected for now to avoid clutter
        
        const v = Vector2D.fromPoints(wall.start, wall.end);
        const len = v.length();
        const normal = v.normalize().perpendicular();
        
        // Offset dimension line
        const offsetDist = 300; // 300mm offset
        const p1 = new Vector2D(wall.start.x, wall.start.y).add(normal.scale(offsetDist));
        const p2 = new Vector2D(wall.end.x, wall.end.y).add(normal.scale(offsetDist));
        const mid = new Vector2D((p1.x + p2.x)/2, (p1.y + p2.y)/2);
        const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);
        const flipText = angle > 90 || angle < -90;
        const textAngle = flipText ? angle + 180 : angle;

        return (
          <g key={`dim-${wall.id}`}>
            {/* Guide lines */}
            <line x1={wall.start.x} y1={wall.start.y} x2={p1.x} y2={p1.y} stroke="#94a3b8" strokeWidth={1/zoom} strokeDasharray={`${4/zoom},${4/zoom}`} />
            <line x1={wall.end.x} y1={wall.end.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={1/zoom} strokeDasharray={`${4/zoom},${4/zoom}`} />
            
            {/* Dimension line */}
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#64748b" strokeWidth={2/zoom} />
            
            {/* Text */}
            <g transform={`translate(${mid.x}, ${mid.y}) rotate(${textAngle}) scale(${1/zoom})`}>
              <rect x={-30} y={-15} width={60} height={20} fill="#fff" opacity={0.8} rx={4} />
              <text x={0} y={-2} textAnchor="middle" fill="#334155" fontSize={12} fontWeight="500">
                {formatLength(len)}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
