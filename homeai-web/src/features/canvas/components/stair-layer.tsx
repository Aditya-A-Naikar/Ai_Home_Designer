"use client";

import React from "react";
import { Staircase } from "@/core/domain/types";
import { calculateStairGeometry } from "@/core/geometry/stair-utils";
import { SubElementSelection } from "@/store/canvas-store";

interface StairLayerProps {
  stairs: Staircase[];
  zoom: number;
  selectedSubElement: SubElementSelection | null;
  onSelectStair: (id: string) => void;
  onStairPointerDown?: (e: React.PointerEvent, id: string) => void;
  onDeleteStair?: (id: string) => void;
  onRotateStair?: (id: string) => void;
}

export function StairLayer({
  stairs,
  zoom,
  selectedSubElement,
  onSelectStair,
  onStairPointerDown,
}: StairLayerProps) {
  if (!stairs || stairs.length === 0) return null;

  return (
    <g id="stair-layer">
      {stairs.map((stair) => {
        const isSelected =
          selectedSubElement?.type === "stair" && selectedSubElement.id === stair.id;
        const geom = calculateStairGeometry(stair);
        const { width, length } = stair;

        return (
          <g
            key={stair.id}
            id={`stair-${stair.id}`}
            transform={`translate(${stair.position.x}, ${stair.position.y}) rotate(${stair.rotation})`}
            className="cursor-move select-none"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStair(stair.id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectStair(stair.id);
              if (onStairPointerDown) {
                onStairPointerDown(e, stair.id);
              }
            }}
          >
            {/* Background Floor Fill */}
            <rect
              x={0}
              y={0}
              width={width}
              height={length}
              fill="#f8fafc"
              stroke="#334155"
              strokeWidth={Math.max(1.5 / zoom, 1)}
            />

            {/* Landing fill if dog-leg */}
            {geom.landing && (
              <rect
                x={geom.landing.x}
                y={geom.landing.y}
                width={geom.landing.width}
                height={geom.landing.height}
                fill="#f1f5f9"
                stroke="#64748b"
                strokeWidth={Math.max(1 / zoom, 0.75)}
              />
            )}

            {/* Step Tread Lines */}
            {geom.treadLines.map((t, idx) => (
              <line
                key={`tread-${idx}`}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="#64748b"
                strokeWidth={Math.max(1 / zoom, 0.75)}
              />
            ))}

            {/* Central Well Gap line for dog leg */}
            {stair.stairType === "dog_leg" && geom.flight1 && geom.flight2 && (
              <line
                x1={geom.flight1.width}
                y1={geom.landing ? geom.landing.height : 0}
                x2={geom.flight1.width}
                y2={length}
                stroke="#334155"
                strokeWidth={Math.max(1.5 / zoom, 1)}
              />
            )}

            {/* Break Line (Zigzag architectural cut line) */}
            {geom.breakLine && (
              <g pointerEvents="none">
                <line
                  x1={geom.breakLine.x1}
                  y1={geom.breakLine.y1}
                  x2={geom.breakLine.x2}
                  y2={geom.breakLine.y2}
                  stroke="#0f172a"
                  strokeWidth={Math.max(1.25 / zoom, 0.8)}
                  strokeDasharray={`${6 / zoom},${3 / zoom}`}
                />
              </g>
            )}

            {/* Directional Walk Line & Arrow */}
            <g pointerEvents="none">
              {/* Walk line start point */}
              <circle
                cx={geom.walkLine.points[0].x}
                cy={geom.walkLine.points[0].y}
                r={Math.max(3.5 / zoom, 2.5)}
                fill="#2563eb"
              />

              {/* Walk line path segments */}
              <polyline
                points={geom.walkLine.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#2563eb"
                strokeWidth={Math.max(1.5 / zoom, 1)}
              />

              {/* Arrow Head */}
              <polygon
                points={`${geom.walkLine.arrowTip.x},${geom.walkLine.arrowTip.y} ${geom.walkLine.arrowLeft.x},${geom.walkLine.arrowLeft.y} ${geom.walkLine.arrowRight.x},${geom.walkLine.arrowRight.y}`}
                fill="#2563eb"
              />

              {/* Text Badge UP / DN & Step Count */}
              <g
                transform={`translate(${geom.upLabelPosition.x}, ${geom.upLabelPosition.y}) scale(${1 / zoom})`}
              >
                <rect
                  x={-28}
                  y={-14}
                  width={56}
                  height={18}
                  rx={3}
                  fill="#1e293b"
                  fillOpacity={0.9}
                />
                <text
                  x={0}
                  y={-1}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight="bold"
                  dominantBaseline="middle"
                >
                  {geom.label} ({stair.stepCount}R)
                </text>
              </g>
            </g>

            {/* Selection Highlight & CAD Bounding Box */}
            {isSelected && (
              <g pointerEvents="none">
                <rect
                  x={-6 / zoom}
                  y={-6 / zoom}
                  width={width + 12 / zoom}
                  height={length + 12 / zoom}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${6 / zoom},${3 / zoom}`}
                  rx={2 / zoom}
                />
                {/* 4 Corner CAD Handles */}
                <circle cx={0} cy={0} r={4.5 / zoom} fill="#4f46e5" stroke="#ffffff" strokeWidth={1 / zoom} />
                <circle cx={width} cy={0} r={4.5 / zoom} fill="#4f46e5" stroke="#ffffff" strokeWidth={1 / zoom} />
                <circle cx={width} cy={length} r={4.5 / zoom} fill="#4f46e5" stroke="#ffffff" strokeWidth={1 / zoom} />
                <circle cx={0} cy={length} r={4.5 / zoom} fill="#4f46e5" stroke="#ffffff" strokeWidth={1 / zoom} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
