"use client";

import React from "react";
import { BlueprintUnderlay } from "@/core/domain/types";

interface BlueprintUnderlayLayerProps {
  underlay?: BlueprintUnderlay | null;
  zoom: number;
}

export function BlueprintUnderlayLayer({ underlay, zoom }: BlueprintUnderlayLayerProps) {
  if (!underlay || !underlay.visible || !underlay.imageUrl) {
    return null;
  }

  const widthMm = underlay.imageWidth * underlay.mmPerPixel;
  const heightMm = underlay.imageHeight * underlay.mmPerPixel;

  const centerX = underlay.positionMm.x + widthMm / 2;
  const centerY = underlay.positionMm.y + heightMm / 2;
  const rotTransform = underlay.rotationDeg
    ? `rotate(${underlay.rotationDeg}, ${centerX}, ${centerY})`
    : undefined;

  return (
    <g
      id={`blueprint-underlay-group-${underlay.id}`}
      pointerEvents="none"
      opacity={Math.max(0.05, Math.min(1.0, underlay.opacity))}
      transform={rotTransform}
    >
      <image
        href={underlay.imageUrl}
        x={underlay.positionMm.x}
        y={underlay.positionMm.y}
        width={widthMm}
        height={heightMm}
        preserveAspectRatio="none"
      />

      {/* Subtle border outline for reference boundary */}
      <rect
        x={underlay.positionMm.x}
        y={underlay.positionMm.y}
        width={widthMm}
        height={heightMm}
        fill="none"
        stroke="#64748b"
        strokeWidth={1 / zoom}
        strokeDasharray={`${6 / zoom},${4 / zoom}`}
      />
    </g>
  );
}
