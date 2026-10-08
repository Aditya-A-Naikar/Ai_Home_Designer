"use client";

import React from "react";
import { StructuralColumn } from "@/core/domain/types";
import { SubElementSelection } from "@/store/canvas-store";

interface ColumnLayerProps {
  columns: StructuralColumn[];
  zoom: number;
  selectedSubElement: SubElementSelection | null;
  onSelectColumn: (id: string) => void;
  onColumnPointerDown?: (e: React.PointerEvent, id: string) => void;
}

export function ColumnLayer({
  columns,
  zoom,
  selectedSubElement,
  onSelectColumn,
  onColumnPointerDown,
}: ColumnLayerProps) {
  if (!columns || columns.length === 0) return null;

  return (
    <g id="structural-columns-layer">
      {columns.map((col) => {
        const isSelected =
          selectedSubElement?.type === "column" && selectedSubElement.id === col.id;
        const w = col.width;
        const d = col.depth;

        return (
          <g
            key={col.id}
            id={`column-${col.id}`}
            transform={`translate(${col.position.x}, ${col.position.y}) rotate(${col.rotation})`}
            className="cursor-move select-none"
            onClick={(e) => {
              e.stopPropagation();
              onSelectColumn(col.id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectColumn(col.id);
              if (onColumnPointerDown) {
                onColumnPointerDown(e, col.id);
              }
            }}
          >
            {/* Structural Column RC Body (Dark CAD fill) */}
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth={Math.max(1.5 / zoom, 1)}
            />

            {/* Inner Concrete Reinforcement Hatch Cross */}
            <line
              x1={-w / 2}
              y1={-d / 2}
              x2={w / 2}
              y2={d / 2}
              stroke="#64748b"
              strokeWidth={Math.max(0.75 / zoom, 0.5)}
              pointerEvents="none"
            />
            <line
              x1={w / 2}
              y1={-d / 2}
              x2={-w / 2}
              y2={d / 2}
              stroke="#64748b"
              strokeWidth={Math.max(0.75 / zoom, 0.5)}
              pointerEvents="none"
            />

            {/* Grid Alignment Center Tick */}
            <circle cx={0} cy={0} r={Math.max(2 / zoom, 1.5)} fill="#94a3b8" pointerEvents="none" />

            {/* Selection Outline */}
            {isSelected && (
              <rect
                x={-w / 2 - 4 / zoom}
                y={-d / 2 - 4 / zoom}
                width={w + 8 / zoom}
                height={d + 8 / zoom}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2 / zoom}
                strokeDasharray={`${4 / zoom},${2 / zoom}`}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
