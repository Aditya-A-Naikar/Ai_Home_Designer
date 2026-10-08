import React from 'react';
import { Point2D } from '@/core/domain/types';
import { getViewBounds } from '@/core/canvas/transform';

interface GridLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: Point2D;
  gridSize: number; // in mm
}

export function GridLayer({ canvasWidth, canvasHeight, zoom, panOffset, gridSize }: GridLayerProps) {
  const bounds = getViewBounds(canvasWidth, canvasHeight, zoom, panOffset);
  
  const minGridX = Math.floor(bounds.minX / gridSize) * gridSize;
  const maxGridX = Math.ceil(bounds.maxX / gridSize) * gridSize;
  const minGridY = Math.floor(bounds.minY / gridSize) * gridSize;
  const maxGridY = Math.ceil(bounds.maxY / gridSize) * gridSize;

  const lines = [];

  for (let x = minGridX; x <= maxGridX; x += gridSize) {
    const isMajor = x % (gridSize * 10) === 0;
    const isOrigin = x === 0;
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={bounds.minY}
        x2={x}
        y2={bounds.maxY}
        stroke={isOrigin ? '#94a3b8' : isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={isOrigin ? 2 / zoom : 1 / zoom}
      />
    );
  }

  for (let y = minGridY; y <= maxGridY; y += gridSize) {
    const isMajor = y % (gridSize * 10) === 0;
    const isOrigin = y === 0;
    lines.push(
      <line
        key={`h-${y}`}
        x1={bounds.minX}
        y1={y}
        x2={bounds.maxX}
        y2={y}
        stroke={isOrigin ? '#94a3b8' : isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={isOrigin ? 2 / zoom : 1 / zoom}
      />
    );
  }

  return (
    <g className="grid-layer">
      {lines}
      {/* Origin Marker */}
      <circle cx={0} cy={0} r={5 / zoom} fill="#3b82f6" />
    </g>
  );
}
