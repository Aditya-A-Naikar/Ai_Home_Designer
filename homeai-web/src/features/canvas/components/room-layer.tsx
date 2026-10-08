import React from 'react';
import { Room } from '@/core/domain/types';
import { polygonArea, polygonCentroid } from '@/core/geometry/room-utils';

interface RoomLayerProps {
  rooms: Room[];
  zoom: number;
  selectedElementId: string | null;
  onSelect?: (id: string) => void;
  preferredUnit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

export function RoomLayer({ rooms, zoom, selectedElementId, onSelect, preferredUnit }: RoomLayerProps) {
  const formatArea = (areaSqMm: number) => {
    if (preferredUnit === 'm') return (areaSqMm / 1_000_000).toFixed(2) + ' m²';
    if (preferredUnit === 'ft') return (areaSqMm / 92903.04).toFixed(2) + ' sq ft';
    if (preferredUnit === 'cm') return (areaSqMm / 100).toFixed(2) + ' cm²';
    return areaSqMm.toFixed(0) + ' sq mm';
  };

  return (
    <g className="room-layer">
      {rooms.map((room) => {
        const isSelected = room.id === selectedElementId;
        const d = room.polygon.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        const centroid = polygonCentroid(room.polygon);
        const area = polygonArea(room.polygon);
        
        return (
          <g 
            key={room.id} 
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(isSelected ? '' : room.id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            style={{ cursor: 'pointer' }}
          >
            <path 
              d={d} 
              fill={room.color || '#f1f5f9'} // slate-100 default
              fillOpacity={isSelected ? 0.8 : 0.5}
              stroke={isSelected ? '#4f46e5' : 'transparent'}
              strokeWidth={3 / zoom}
            />
            
            <g transform={`translate(${centroid.x}, ${centroid.y}) scale(${1/zoom})`}>
              <text
                x={0}
                y={-10}
                textAnchor="middle"
                fill="#334155"
                fontSize={16}
                fontWeight="bold"
                pointerEvents="none"
              >
                {room.name}
              </text>
              <text
                x={0}
                y={10}
                textAnchor="middle"
                fill="#64748b"
                fontSize={12}
                pointerEvents="none"
              >
                {formatArea(area)}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
