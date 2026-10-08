"use client";

import React from "react";
import { SlabVoid } from "@/core/domain/types";
import { SubElementSelection } from "@/store/canvas-store";

interface VoidLayerProps {
  voids: SlabVoid[];
  zoom: number;
  selectedSubElement: SubElementSelection | null;
  onSelectVoid: (id: string) => void;
}

export function VoidLayer({
  voids,
  zoom,
  selectedSubElement,
  onSelectVoid,
}: VoidLayerProps) {
  if (!voids || voids.length === 0) return null;

  return (
    <g id="void-layer">
      {voids.map((voidItem) => {
        const isSelected =
          selectedSubElement?.type === "void" && selectedSubElement.id === voidItem.id;
        const pts = voidItem.polygon;
        if (pts.length < 3) return null;

        // Compute centroid & bounding box
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(" ");

        return (
          <g
            key={voidItem.id}
            id={`void-${voidItem.id}`}
            className="cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              onSelectVoid(voidItem.id);
            }}
          >
            {/* Transparent shaded fill */}
            <polygon
              points={pointsStr}
              fill="#f1f5f9"
              fillOpacity={0.6}
              stroke="#64748b"
              strokeWidth={Math.max(1.5 / zoom, 1)}
              strokeDasharray={`${6 / zoom},${3 / zoom}`}
            />

            {/* Standard CAD Void Cross Bracing (X-lines) */}
            <line
              x1={minX}
              y1={minY}
              x2={maxX}
              y2={maxY}
              stroke="#94a3b8"
              strokeWidth={Math.max(1 / zoom, 0.75)}
              strokeDasharray={`${4 / zoom},${4 / zoom}`}
              pointerEvents="none"
            />
            <line
              x1={maxX}
              y1={minY}
              x2={minX}
              y2={maxY}
              stroke="#94a3b8"
              strokeWidth={Math.max(1 / zoom, 0.75)}
              strokeDasharray={`${4 / zoom},${4 / zoom}`}
              pointerEvents="none"
            />

            {/* Architectural Void Center Callout */}
            <g
              transform={`translate(${centerX}, ${centerY}) scale(${1 / zoom})`}
              pointerEvents="none"
            >
              <rect
                x={-60}
                y={-12}
                width={120}
                height={24}
                rx={4}
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth={1}
                fillOpacity={0.95}
              />
              <text
                x={0}
                y={3}
                textAnchor="middle"
                fill="#475569"
                fontSize={10}
                fontWeight="bold"
                letterSpacing={0.5}
              >
                {voidItem.name.toUpperCase()}
              </text>
            </g>

            {/* Selection highlight */}
            {isSelected && (
              <polygon
                points={pointsStr}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2.5 / zoom}
                strokeDasharray={`${5 / zoom},${3 / zoom}`}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
