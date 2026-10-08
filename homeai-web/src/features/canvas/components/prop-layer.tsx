import React from 'react';
import { Prop } from '@/core/domain/types';
import { SubElementSelection } from '@/store/canvas-store';

interface PropLayerProps {
  props: Prop[];
  zoom: number;
  selectedSubElement: SubElementSelection | null;
  onSelectProp: (propId: string) => void;
  onPropPointerDown?: (propId: string, e: React.PointerEvent) => void;
  onDeleteProp?: (propId: string) => void;
  onRotateProp?: (propId: string) => void;
  isDraggingProp?: boolean;
  draggingPropId?: string | null;
}

export function PropLayer({
  props,
  zoom,
  selectedSubElement,
  onSelectProp,
  onPropPointerDown,
  onDeleteProp,
  onRotateProp,
  isDraggingProp,
  draggingPropId
}: PropLayerProps) {
  if (!props || props.length === 0) return null;

  return (
    <g className="props-layer">
      {props.map((prop) => {
        const isSelected = selectedSubElement?.type === 'prop' && selectedSubElement.id === prop.id;
        const isCurrentlyDragging = isDraggingProp && draggingPropId === prop.id;
        const w = prop.dimensions.width;
        const d = prop.dimensions.depth;
        const halfW = w / 2;
        const halfD = d / 2;
        const color = prop.color || '#475569';
        const angle = prop.rotation || 0;

        return (
          <g
            key={prop.id}
            transform={`translate(${prop.position.x}, ${prop.position.y}) rotate(${angle})`}
            onPointerDown={(e) => {
              if (onPropPointerDown) {
                onPropPointerDown(prop.id, e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectProp(prop.id);
            }}
            style={{ 
              cursor: isCurrentlyDragging 
                ? 'grabbing' 
                : isSelected 
                  ? 'grab' 
                  : 'pointer' 
            }}
          >
            {/* Selection Bounding Halo */}
            {isSelected && (
              <rect
                x={-halfW - 30}
                y={-halfD - 30}
                width={w + 60}
                height={d + 60}
                rx={15}
                fill="none"
                stroke="#6366f1"
                strokeWidth={3 / zoom}
                strokeDasharray={`${8 / zoom}, ${4 / zoom}`}
              />
            )}

            {/* Prop Type Specific Top-Down Architectural Render */}
            {prop.propType === 'tv' && (
              <g>
                {/* Wall console underneath */}
                <rect
                  x={-halfW - 50}
                  y={-halfD - 60}
                  width={w + 100}
                  height={d + 120}
                  rx={8}
                  fill="#1e293b"
                  fillOpacity={0.8}
                  stroke="#334155"
                  strokeWidth={2}
                />
                {/* TV screen bezel */}
                <rect
                  x={-halfW}
                  y={-halfD}
                  width={w}
                  height={d}
                  rx={4}
                  fill="#090d16"
                  stroke="#38bdf8"
                  strokeWidth={3}
                />
                {/* Soundbar / Screen glow indicator */}
                <line
                  x1={-halfW + 40}
                  y1={0}
                  x2={halfW - 40}
                  y2={0}
                  stroke="#38bdf8"
                  strokeWidth={3}
                  strokeDasharray="40 10"
                />
                <g transform={`scale(${1 / zoom})`}>
                  <rect x={-35} y={-10} width={70} height={20} rx={4} fill="#0f172a" fillOpacity={0.9} />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize={10}
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {prop.specifications?.screenSizeInches ? `${prop.specifications.screenSizeInches}" TV` : 'TV'}
                  </text>
                </g>
              </g>
            )}

            {prop.propType === 'sofa' && (
              <g>
                {prop.shape === 'l_shape' ? (
                  // L-Shaped Sectional
                  <g>
                    {/* Main section */}
                    <rect
                      x={-halfW}
                      y={-halfD}
                      width={w}
                      height={d * 0.6}
                      rx={20}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth={3}
                    />
                    {/* Chaise extension */}
                    <rect
                      x={-halfW}
                      y={-halfD}
                      width={w * 0.4}
                      height={d}
                      rx={20}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth={3}
                    />
                    {/* Cushion divisions */}
                    <line x1={0} y1={-halfD} x2={0} y2={-halfD + d * 0.6} stroke="#ffffff" strokeOpacity={0.3} strokeWidth={2} />
                    <line x1={halfW * 0.5} y1={-halfD} x2={halfW * 0.5} y2={-halfD + d * 0.6} stroke="#ffffff" strokeOpacity={0.3} strokeWidth={2} />
                    {/* Backrest line */}
                    <rect x={-halfW} y={-halfD} width={w} height={60} fill="#0f172a" fillOpacity={0.2} rx={6} />
                  </g>
                ) : (
                  // 3-Seater / Standard Sofa
                  <g>
                    {/* Main Sofa Body */}
                    <rect
                      x={-halfW}
                      y={-halfD}
                      width={w}
                      height={d}
                      rx={20}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth={3}
                    />
                    {/* Backrest */}
                    <rect
                      x={-halfW}
                      y={-halfD}
                      width={w}
                      height={d * 0.25}
                      rx={8}
                      fill="#0f172a"
                      fillOpacity={0.25}
                    />
                    {/* Left & Right Armrests */}
                    <rect x={-halfW} y={-halfD} width={w * 0.1} height={d} rx={8} fill="#0f172a" fillOpacity={0.2} />
                    <rect x={halfW - w * 0.1} y={-halfD} width={w * 0.1} height={d} rx={8} fill="#0f172a" fillOpacity={0.2} />
                    {/* Cushion Divider Lines */}
                    <line x1={-w * 0.16} y1={-halfD + d * 0.25} x2={-w * 0.16} y2={halfD} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2} />
                    <line x1={w * 0.16} y1={-halfD + d * 0.25} x2={w * 0.16} y2={halfD} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2} />
                  </g>
                )}
                <g transform={`scale(${1 / zoom})`}>
                  <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold" pointerEvents="none">
                    {prop.name}
                  </text>
                </g>
              </g>
            )}

            {prop.propType === 'bed' && (
              <g>
                {/* Bed Frame & Mattress */}
                <rect
                  x={-halfW}
                  y={-halfD}
                  width={w}
                  height={d}
                  rx={15}
                  fill={color}
                  stroke="#1e1b4b"
                  strokeWidth={3}
                />
                {/* Headboard */}
                <rect
                  x={-halfW - 20}
                  y={-halfD - 30}
                  width={w + 40}
                  height={60}
                  rx={10}
                  fill="#1e1b4b"
                  stroke="#312e81"
                  strokeWidth={2}
                />
                {/* Pillows */}
                {w >= 1600 ? (
                  // King / Queen (2 large pillows)
                  <g>
                    <rect x={-halfW + 60} y={-halfD + 40} width={halfW - 80} height={280} rx={12} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
                    <rect x={20} y={-halfD + 40} width={halfW - 80} height={280} rx={12} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
                  </g>
                ) : (
                  // Single pillow
                  <rect x={-halfW + 80} y={-halfD + 40} width={w - 160} height={260} rx={12} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
                )}
                {/* Folded Duvet Accent Line */}
                <line
                  x1={-halfW}
                  y1={halfD - d * 0.45}
                  x2={halfW}
                  y2={halfD - d * 0.45}
                  stroke="#ffffff"
                  strokeOpacity={0.4}
                  strokeWidth={4}
                />
                <rect
                  x={-halfW}
                  y={halfD - d * 0.45}
                  width={w}
                  height={d * 0.45}
                  rx={12}
                  fill="#000000"
                  fillOpacity={0.12}
                />
                <g transform={`scale(${1 / zoom})`}>
                  <text x={0} y={d * 0.15 / zoom} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold" pointerEvents="none">
                    {prop.name}
                  </text>
                </g>
              </g>
            )}

            {prop.propType === 'dining_table' && (
              <g>
                {/* Table Top */}
                <rect
                  x={-halfW}
                  y={-halfD}
                  width={w}
                  height={d}
                  rx={12}
                  fill={color}
                  stroke="#451a03"
                  strokeWidth={3}
                />
                {/* Chairs along top & bottom */}
                <g fill="#78350f" stroke="#451a03" strokeWidth={2}>
                  {/* Top chairs */}
                  <rect x={-halfW + 100} y={-halfD - 120} width={260} height={100} rx={8} />
                  <rect x={-130} y={-halfD - 120} width={260} height={100} rx={8} />
                  <rect x={halfW - 360} y={-halfD - 120} width={260} height={100} rx={8} />
                  {/* Bottom chairs */}
                  <rect x={-halfW + 100} y={halfD + 20} width={260} height={100} rx={8} />
                  <rect x={-130} y={halfD + 20} width={260} height={100} rx={8} />
                  <rect x={halfW - 360} y={halfD + 20} width={260} height={100} rx={8} />
                </g>
                <g transform={`scale(${1 / zoom})`}>
                  <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold" pointerEvents="none">
                    Dining Table
                  </text>
                </g>
              </g>
            )}

            {prop.propType === 'wardrobe' && (
              <g>
                <rect
                  x={-halfW}
                  y={-halfD}
                  width={w}
                  height={d}
                  rx={6}
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth={3}
                />
                {/* Sliding door partitions */}
                <line x1={-w * 0.16} y1={-halfD} x2={-w * 0.16} y2={halfD} stroke="#94a3b8" strokeWidth={2} />
                <line x1={w * 0.16} y1={-halfD} x2={w * 0.16} y2={halfD} stroke="#94a3b8" strokeWidth={2} />
                <g transform={`scale(${1 / zoom})`}>
                  <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={10} fontWeight="bold" pointerEvents="none">
                    Wardrobe
                  </text>
                </g>
              </g>
            )}

            {prop.propType === 'desk' && (
              <g>
                <rect
                  x={-halfW}
                  y={-halfD}
                  width={w}
                  height={d}
                  rx={8}
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth={3}
                />
                {/* Monitor / Laptop outline */}
                <rect x={-180} y={-halfD + 40} width={360} height={30} rx={3} fill="#38bdf8" />
                {/* Office Chair Arc */}
                <path d={`M -140 ${halfD + 60} A 160 160 0 0 1 140 ${halfD + 60}`} fill="none" stroke="#475569" strokeWidth={15} strokeLinecap="round" />
                <g transform={`scale(${1 / zoom})`}>
                  <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={10} fontWeight="bold" pointerEvents="none">
                    Workstation
                  </text>
                </g>
              </g>
            )}

            {/* Selected Quick Action Buttons: Move, Rotate & Delete */}
            {isSelected && (
              <>
                {/* Live coordinate badge during drag */}
                {isCurrentlyDragging && (
                  <g transform={`scale(${1 / zoom})`} pointerEvents="none">
                    <rect x={-55} y={halfD * zoom + 18} width={110} height={22} rx={6} fill="#0f172a" fillOpacity={0.92} />
                    <text x={0} y={halfD * zoom + 33} textAnchor="middle" fill="#38bdf8" fontSize={10} fontWeight="bold">
                      {Math.round(prop.position.x)}, {Math.round(prop.position.y)} mm
                    </text>
                  </g>
                )}

                <g transform={`translate(${halfW + 40}, ${-halfD}) scale(${1 / zoom})`}>
                  {/* Move Handle (Drag to Move) */}
                  <g
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (onPropPointerDown) onPropPointerDown(prop.id, e);
                    }}
                    style={{ cursor: isCurrentlyDragging ? 'grabbing' : 'grab' }}
                  >
                    <circle cx={0} cy={-34} r={14} fill="#2563eb" stroke="#ffffff" strokeWidth={2} />
                    {/* 4-way arrow path */}
                    <path
                      d="M-6 -34 L6 -34 M0 -40 L0 -28 M-3 -37 L0 -40 L3 -37 M-3 -31 L0 -28 L3 -31 M-6 -34 L-3 -37 M-6 -34 L-3 -31 M6 -34 L3 -37 M6 -34 L3 -31"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <title>Drag to move prop anywhere</title>
                  </g>

                  {/* Rotate button */}
                  {onRotateProp && (
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotateProp(prop.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={0} cy={0} r={14} fill="#4f46e5" stroke="#ffffff" strokeWidth={2} />
                      <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight="bold">↻</text>
                      <title>Rotate 90° Clockwise</title>
                    </g>
                  )}

                  {/* Delete button */}
                  {onDeleteProp && (
                    <g
                      transform="translate(0, 34)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProp(prop.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={0} cy={0} r={14} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                      <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight="bold">✕</text>
                      <title>Delete Prop</title>
                    </g>
                  )}
                </g>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
