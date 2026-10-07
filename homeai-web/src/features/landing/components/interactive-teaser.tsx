"use client";

import { useState } from "react";
import { Sparkles, CheckCircle } from "lucide-react";

/**
 * Static interactive SVG teaser that demonstrates the PLAN → DISCUSS → MODIFY flow.
 * This is a VISUAL DEMO ONLY — not connected to the real 2D engine (Phase 3).
 * The user can click a room to simulate receiving an AI suggestion.
 *
 * Architecture note: No real geometry or state management here.
 * Real canvas logic begins in Phase 3.
 */

interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hoverColor: string;
}

const rooms: Room[] = [
  { id: "living", label: "Living Room", x: 20, y: 20, w: 140, h: 100, color: "#e0e7ff", hoverColor: "#c7d2fe" },
  { id: "kitchen", label: "Kitchen", x: 170, y: 20, w: 100, h: 100, color: "#dcfce7", hoverColor: "#bbf7d0" },
  { id: "bedroom1", label: "Bedroom 1", x: 20, y: 130, w: 120, h: 90, color: "#fce7f3", hoverColor: "#fbcfe8" },
  { id: "bedroom2", label: "Bedroom 2", x: 150, y: 130, w: 120, h: 90, color: "#fef3c7", hoverColor: "#fde68a" },
  { id: "bathroom", label: "Bath", x: 280, y: 20, w: 60, h: 90, color: "#e0f2fe", hoverColor: "#bae6fd" },
];

const aiSuggestions: Record<string, string> = {
  living: "Your living room faces the entrance. Moving it deeper into the plan could improve privacy from the road.",
  kitchen: "Adding a window on the east wall here could bring in morning light. This may improve ventilation too.",
  bedroom1: "Bedroom 1 shares a wall with the kitchen. Adding acoustic insulation or repositioning could reduce noise.",
  bedroom2: "Bedroom 2 is well-positioned for afternoon light. A balcony door on the south wall is worth exploring.",
  bathroom: "Consider adding a skylight here. The bathroom has no natural ventilation in the current layout.",
};

export function InteractiveTeaser() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleRoomClick = (id: string) => {
    setSelectedRoom(id);
    setApplied(false);
  };

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => {
      setSelectedRoom(null);
      setApplied(false);
    }, 2000);
  };

  const handleKeep = () => {
    setSelectedRoom(null);
    setApplied(false);
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      {/* Header bar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-medium text-slate-500">2D Floor Plan — Ground Floor</span>
        </div>
        <span className="text-xs text-slate-400">Click a room →</span>
      </div>

      {/* SVG Floor Plan */}
      <svg
        viewBox="0 0 360 240"
        className="w-full rounded-lg border border-slate-100 bg-slate-50"
        role="img"
        aria-label="Interactive floor plan demo. Click a room to see an AI suggestion."
      >
        {/* Grid lines (decorative) */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 30}
            y1={0}
            x2={i * 30}
            y2={240}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 30}
            x2={360}
            y2={i * 30}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}

        {/* Outer boundary */}
        <rect x="10" y="10" width="330" height="220" fill="none" stroke="#64748b" strokeWidth="2" rx="2" />

        {/* Rooms */}
        {rooms.map((room) => {
          const isSelected = selectedRoom === room.id;
          return (
            <g
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${room.label} — click for AI suggestion`}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleRoomClick(room.id)}
            >
              <rect
                x={room.x + 10}
                y={room.y + 10}
                width={room.w}
                height={room.h}
                fill={isSelected ? room.hoverColor : room.color}
                stroke={isSelected ? "#6366f1" : "#94a3b8"}
                strokeWidth={isSelected ? 2 : 1}
                rx="2"
                className="transition-all"
              />
              <text
                x={room.x + 10 + room.w / 2}
                y={room.y + 10 + room.h / 2 - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight={isSelected ? "700" : "500"}
                fill={isSelected ? "#4338ca" : "#475569"}
              >
                {room.label}
              </text>
              {/* Dimension hint */}
              <text
                x={room.x + 10 + room.w / 2}
                y={room.y + 10 + room.h / 2 + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7.5"
                fill="#94a3b8"
              >
                {Math.round(room.w * 0.1)}m × {Math.round(room.h * 0.1)}m
              </text>
            </g>
          );
        })}

        {/* Compass indicator */}
        <text x="330" y="240" fontSize="10" fill="#94a3b8" textAnchor="end">N↑</text>
      </svg>

      {/* AI Suggestion bubble */}
      {selectedRoom && !applied && (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-700 mb-1">AI Design Suggestion</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                {aiSuggestions[selectedRoom]}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleApply}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                >
                  Apply suggestion
                </button>
                <button
                  onClick={handleKeep}
                  className="rounded-md border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                >
                  Keep design
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applied confirmation */}
      {applied && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 animate-in fade-in duration-200">
          <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <p className="text-xs font-medium text-emerald-700">
            Suggestion applied! Design updated.
          </p>
        </div>
      )}

      {/* No selection hint */}
      {!selectedRoom && !applied && (
        <p className="mt-2 text-center text-xs text-slate-400">
          👆 Click any room to see how AI suggests improvements
        </p>
      )}
    </div>
  );
}
