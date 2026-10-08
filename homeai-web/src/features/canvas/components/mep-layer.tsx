"use client";

import React from "react";
import { Floor } from "@/core/domain/types";

interface MEPLayerProps {
  floor: Floor;
  showElectrical?: boolean;
  showPlumbing?: boolean;
  showHVAC?: boolean;
}

/**
 * 2D Vector CAD MEP Layer
 * Renders professional architectural engineering schematics for electrical,
 * plumbing, and mechanical layers on top of the building floor plan.
 */
export function MEPLayer({
  floor,
  showElectrical = true,
  showPlumbing = true,
  showHVAC = true,
}: MEPLayerProps) {
  const electricalPoints = floor.electricalPoints || [];
  const plumbingFixtures = floor.plumbingFixtures || [];
  const hvacPoints = floor.hvacPoints || [];

  return (
    <g className="mep-schematic-layer pointer-events-none select-none">
      {/* 1. PLUMBING PIPE TRACE RUNS & FIXTURES */}
      {showPlumbing && (
        <g id="plumbing-layer">
          {/* Connecting Pipe Lines to Vertical Chases */}
          {plumbingFixtures
            .filter((p) => p.fixtureType !== "vertical_pipe_chase")
            .map((p, idx) => {
              const nearestChase = plumbingFixtures.find((c) => c.fixtureType === "vertical_pipe_chase");
              if (!nearestChase) return null;
              return (
                <line
                  key={`pipe-run-${idx}`}
                  x1={p.position.x}
                  y1={p.position.y}
                  x2={nearestChase.position.x}
                  y2={nearestChase.position.y}
                  stroke="#0284c7"
                  strokeWidth="30"
                  strokeDasharray="80 40"
                  opacity={0.6}
                />
              );
            })}

          {/* Plumbing Fixture Symbols */}
          {plumbingFixtures.map((fixture) => {
            const { x, y } = fixture.position;
            if (fixture.fixtureType === "water_closet") {
              return (
                <g key={fixture.id} transform={`translate(${x}, ${y})`}>
                  <rect x="-200" y="-120" width="120" height="240" rx="20" fill="#0284c7" fillOpacity={0.2} stroke="#0284c7" strokeWidth="20" />
                  <ellipse cx="20" cy="0" rx="180" ry="130" fill="#f0f9ff" stroke="#0284c7" strokeWidth="20" />
                  <circle cx="20" cy="0" r="30" fill="#0284c7" />
                  <text x="0" y="240" textAnchor="middle" fill="#0284c7" fontSize="110" fontFamily="monospace" fontWeight="bold">WC 110ø</text>
                </g>
              );
            }
            if (fixture.fixtureType === "wash_basin") {
              return (
                <g key={fixture.id} transform={`translate(${x}, ${y})`}>
                  <rect x="-180" y="-140" width="360" height="280" rx="30" fill="#f0f9ff" stroke="#0284c7" strokeWidth="20" />
                  <circle cx="0" cy="0" r="35" fill="#0284c7" />
                  <text x="0" y="220" textAnchor="middle" fill="#0284c7" fontSize="100" fontFamily="monospace">WB</text>
                </g>
              );
            }
            if (fixture.fixtureType === "kitchen_sink") {
              return (
                <g key={fixture.id} transform={`translate(${x}, ${y})`}>
                  <rect x="-350" y="-220" width="700" height="440" rx="20" fill="#f0f9ff" stroke="#0284c7" strokeWidth="25" />
                  <rect x="-300" y="-180" width="280" height="360" rx="15" fill="none" stroke="#0284c7" strokeWidth="15" />
                  <rect x="20" y="-180" width="280" height="360" rx="15" fill="none" stroke="#0284c7" strokeWidth="15" />
                  <circle cx="-160" cy="0" r="30" fill="#0284c7" />
                  <circle cx="160" cy="0" r="30" fill="#0284c7" />
                  <text x="0" y="320" textAnchor="middle" fill="#0284c7" fontSize="110" fontFamily="monospace">SINK</text>
                </g>
              );
            }
            if (fixture.fixtureType === "vertical_pipe_chase") {
              return (
                <g key={fixture.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="160" fill="#0284c7" fillOpacity={0.2} stroke="#0369a1" strokeWidth="35" />
                  <line x1="-110" y1="-110" x2="110" y2="110" stroke="#0369a1" strokeWidth="25" />
                  <line x1="-110" y1="110" x2="110" y2="-110" stroke="#0369a1" strokeWidth="25" />
                  <text x="0" y="260" textAnchor="middle" fill="#0369a1" fontSize="120" fontFamily="monospace" fontWeight="bold">RISER SHAFT</text>
                </g>
              );
            }
            if (fixture.fixtureType === "shower_drain") {
              return (
                <g key={fixture.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="100" fill="#f0f9ff" stroke="#0284c7" strokeWidth="20" />
                  <circle cx="0" cy="0" r="40" fill="#0284c7" />
                  <text x="0" y="180" textAnchor="middle" fill="#0284c7" fontSize="90" fontFamily="monospace">DRAIN</text>
                </g>
              );
            }
            return null;
          })}
        </g>
      )}

      {/* 2. ELECTRICAL CIRCUIT RUNS & SYMBOLS */}
      {showElectrical && (
        <g id="electrical-layer">
          {electricalPoints.map((point) => {
            const { x, y } = point.position;

            if (point.pointType === "light_ceiling") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="110" fill="#fef08a" fillOpacity={0.8} stroke="#ca8a04" strokeWidth="22" />
                  <line x1="-75" y1="-75" x2="75" y2="75" stroke="#ca8a04" strokeWidth="22" />
                  <line x1="-75" y1="75" x2="75" y2="-75" stroke="#ca8a04" strokeWidth="22" />
                  {point.circuitNumber && (
                    <text x="140" y="40" fill="#854d0e" fontSize="90" fontFamily="monospace" fontWeight="bold">{point.circuitNumber}</text>
                  )}
                </g>
              );
            }

            if (point.pointType === "fan_ceiling") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="140" fill="#e0f2fe" stroke="#0284c7" strokeWidth="25" />
                  {/* 3 Fan Blades */}
                  <line x1="0" y1="0" x2="0" y2="-240" stroke="#0284c7" strokeWidth="40" strokeLinecap="round" />
                  <line x1="0" y1="0" x2="200" y2="120" stroke="#0284c7" strokeWidth="40" strokeLinecap="round" />
                  <line x1="0" y1="0" x2="-200" y2="120" stroke="#0284c7" strokeWidth="40" strokeLinecap="round" />
                  <circle cx="0" cy="0" r="45" fill="#0369a1" />
                </g>
              );
            }

            if (point.pointType === "power_socket_16a") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <path d="M -120 0 A 120 120 0 0 1 120 0 Z" fill="#ea580c" stroke="#c2410c" strokeWidth="20" />
                  <line x1="-130" y1="0" x2="130" y2="0" stroke="#c2410c" strokeWidth="25" />
                  <text x="0" y="110" textAnchor="middle" fill="#c2410c" fontSize="85" fontFamily="monospace" fontWeight="bold">16A</text>
                </g>
              );
            }

            if (point.pointType === "power_socket_6a") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <path d="M -100 0 A 100 100 0 0 1 100 0 Z" fill="none" stroke="#64748b" strokeWidth="20" />
                  <line x1="-110" y1="0" x2="110" y2="0" stroke="#64748b" strokeWidth="20" />
                  <text x="0" y="90" textAnchor="middle" fill="#64748b" fontSize="80" fontFamily="monospace">6A</text>
                </g>
              );
            }

            if (point.pointType === "switch_plate") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <rect x="-100" y="-60" width="200" height="120" fill="#ffffff" stroke="#0f172a" strokeWidth="20" />
                  <line x1="0" y1="-60" x2="0" y2="60" stroke="#0f172a" strokeWidth="15" />
                  <text x="0" y="120" textAnchor="middle" fill="#0f172a" fontSize="75" fontFamily="monospace">SW</text>
                </g>
              );
            }

            if (point.pointType === "stair_two_way") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="110" fill="#ede9fe" stroke="#7c3aed" strokeWidth="22" />
                  <path d="M -60 -30 L 0 30 L 60 -30" fill="none" stroke="#7c3aed" strokeWidth="22" strokeLinecap="round" />
                  <text x="0" y="160" textAnchor="middle" fill="#7c3aed" fontSize="85" fontFamily="monospace" fontWeight="bold">2-WAY</text>
                </g>
              );
            }

            if (point.pointType === "distribution_board") {
              return (
                <g key={point.id} transform={`translate(${x}, ${y})`}>
                  <rect x="-240" y="-120" width="480" height="240" fill="#dc2626" fillOpacity={0.15} stroke="#dc2626" strokeWidth="30" />
                  <line x1="-240" y1="-120" x2="240" y2="120" stroke="#dc2626" strokeWidth="20" />
                  <text x="0" y="210" textAnchor="middle" fill="#dc2626" fontSize="120" fontFamily="monospace" fontWeight="bold">MAIN DB</text>
                </g>
              );
            }

            return null;
          })}
        </g>
      )}

      {/* 3. HVAC (AIR CONDITIONING & VENTILATION) */}
      {showHVAC && (
        <g id="hvac-layer">
          {hvacPoints.map((hvac) => {
            const { x, y } = hvac.position;

            if (hvac.hvacType === "split_ac_indoor") {
              return (
                <g key={hvac.id} transform={`translate(${x}, ${y})`}>
                  <rect x="-450" y="-110" width="900" height="220" rx="15" fill="#f0fdf4" stroke="#16a34a" strokeWidth="25" />
                  <line x1="-400" y1="40" x2="400" y2="40" stroke="#16a34a" strokeWidth="15" strokeDasharray="30 20" />
                  <text x="0" y="210" textAnchor="middle" fill="#16a34a" fontSize="110" fontFamily="monospace" fontWeight="bold">SPLIT AC (1.5T)</text>
                </g>
              );
            }

            if (hvac.hvacType === "exhaust_fan") {
              return (
                <g key={hvac.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="120" fill="#f0fdf4" stroke="#16a34a" strokeWidth="22" />
                  <line x1="-90" y1="0" x2="90" y2="0" stroke="#16a34a" strokeWidth="20" />
                  <line x1="0" y1="-90" x2="0" y2="90" stroke="#16a34a" strokeWidth="20" />
                  <text x="0" y="180" textAnchor="middle" fill="#16a34a" fontSize="90" fontFamily="monospace">EXH</text>
                </g>
              );
            }

            return null;
          })}
        </g>
      )}
    </g>
  );
}
