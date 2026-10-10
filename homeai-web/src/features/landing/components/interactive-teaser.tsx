"use client";

import { useState } from "react";
import { Box } from "lucide-react";

export function InteractiveTeaser() {
  const [activeTab, setActiveTab] = useState<'ground' | 'first' | '3d'>('ground');
  const [selectedZone, setSelectedZone] = useState<string>('living');

  const zoneDetails: Record<string, { title: string; area: string; code: string; note: string }> = {
    living: {
      title: "Double-Height Living Hall",
      area: "28.5 m² (306 sq ft)",
      code: "NBC 2016 Compliant (Ceiling: 5.8m clear)",
      note: "Connected directly to front foyer and staircase. Features open-to-above void cut-out on First Floor."
    },
    kitchen: {
      title: "Modular Kitchen & Utility",
      area: "14.2 m² (153 sq ft)",
      code: "Vaastu Agneya (South-East quadrant)",
      note: "Directly adjacent to dining area with dedicated wet-chase plumbing stack and 450mm Chajja sunshade."
    },
    stair: {
      title: "18-Riser Dog-Leg Staircase",
      area: "2.05m width × 3.2m run",
      code: "Blondel Formula Pass: 2R + T = 620mm",
      note: "Two 9-riser flights with 1000mm mid-landing, connects Ground Floor (UP) seamlessly to Level 1 mezzanine."
    },
    master: {
      title: "Master Spa Suite & Balcony",
      area: "22.8 m² (245 sq ft)",
      code: "Daylight Ratio: 14.8% (>10% mandatory)",
      note: "Located in South-West (Nairutya). Features ensuite bath with bathtub and walk-in wardrobe."
    },
    void: {
      title: "Double-Height Slab Void Cutout",
      area: "16.4 m² Open to Below",
      code: "BIM Coordination Verified",
      note: "Framed with 1.0m tempered glass safety balustrade overlooking ground-floor living area."
    }
  };

  const activeInfo = zoneDetails[selectedZone] || zoneDetails.living;

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-elevated overflow-hidden select-none">
      {/* Workbench Header */}
      <div className="h-11 border-b border-slate-200 bg-slate-50/90 px-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-200/80 text-[11px] font-mono text-slate-700 font-semibold shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Studio Kernel</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">1:100 METRIC</span>
        </div>

        {/* Level Switcher */}
        <div className="flex items-center bg-slate-200/60 p-0.5 rounded-md text-[11px] font-semibold">
          <button
            onClick={() => { setActiveTab('ground'); setSelectedZone('living'); }}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              activeTab === 'ground' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Level 0 (Ground)
          </button>
          <button
            onClick={() => { setActiveTab('first'); setSelectedZone('master'); }}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              activeTab === 'first' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Level 1 (Duplex)
          </button>
          <button
            onClick={() => setActiveTab('3d')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === '3d' ? 'bg-slate-950 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="h-3 w-3" />
            <span>3D Model</span>
          </button>
        </div>
      </div>

      {/* Main CAD Viewport Teaser */}
      <div className="relative aspect-[16/11] w-full bg-slate-950 overflow-hidden">
        {activeTab === '3d' ? (
          /* 3D Isometric View Simulation */
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 flex flex-col justify-between relative">
            <div className="absolute inset-0 bg-blueprint-dark opacity-60 pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                Three.js WebGL Real-Time Shading
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Elevation: +3000mm Stacked
              </span>
            </div>

            {/* Isometric 3D Architectural Mock Wireframe */}
            <div className="relative z-10 mx-auto my-auto w-full max-w-xs aspect-video flex items-center justify-center">
              <svg viewBox="0 0 320 200" className="w-full h-full drop-shadow-2xl">
                {/* Ground Base Slab */}
                <polygon points="160,170 300,120 160,70 20,120" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <polygon points="20,120 160,170 160,185 20,135" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <polygon points="160,170 300,120 300,135 160,185" fill="#0b1120" stroke="#334155" strokeWidth="1" />
                
                {/* First Floor Elevated Slab (+3.0m) */}
                <polygon points="160,110 300,60 160,10 20,60" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                
                {/* 3D Extruded Walls */}
                <polygon points="50,110 130,80 130,50 50,80" fill="#f8fafc" fillOpacity="0.85" stroke="#cbd5e1" strokeWidth="1" />
                <polygon points="130,80 230,115 230,85 130,50" fill="#e2e8f0" fillOpacity="0.85" stroke="#94a3b8" strokeWidth="1" />
                
                {/* Columns */}
                <line x1="20" y1="120" x2="20" y2="60" stroke="#38bdf8" strokeWidth="3" />
                <line x1="160" y1="170" x2="160" y2="110" stroke="#38bdf8" strokeWidth="3" />
                <line x1="300" y1="120" x2="300" y2="60" stroke="#38bdf8" strokeWidth="3" />
                
                {/* Stair Ascending Flight */}
                <path d="M140,150 L180,130 L180,100 L160,90" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Annotation labels */}
                <text x="160" y="145" textAnchor="middle" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">L0 Living</text>
                <text x="160" y="55" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">L1 Mezzanine</text>
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Wall Cutaway: 1.2m Active</span>
              <span className="text-slate-300 font-semibold">Click &apos;3D View&apos; in app for 360° orbit</span>
            </div>
          </div>
        ) : (
          /* 2D Interactive CAD Blueprint View */
          <div className="h-full w-full relative p-3 flex flex-col justify-between">
            {/* Fine Blueprint Grid */}
            <div className="absolute inset-0 bg-blueprint-dark opacity-80 pointer-events-none" />

            <svg viewBox="0 0 400 270" className="w-full h-full relative z-10">
              {/* Plot Boundary */}
              <rect x="20" y="15" width="360" height="240" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6 3" />
              
              {activeTab === 'ground' ? (
                <>
                  {/* Living Room */}
                  <g 
                    onClick={() => setSelectedZone('living')}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  >
                    <rect 
                      x="35" y="30" width="200" height="130" 
                      fill={selectedZone === 'living' ? '#1e3a8a' : '#0f172a'} 
                      stroke="#38bdf8" 
                      strokeWidth={selectedZone === 'living' ? 2 : 1.2} 
                    />
                    <text x="135" y="90" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">Living Hall</text>
                    <text x="135" y="105" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">28.5 m²</text>
                    
                    {/* Sofa & TV symbols */}
                    <rect x="50" y="50" width="70" height="30" rx="3" fill="#334155" />
                    <rect x="180" y="40" width="6" height="50" rx="1" fill="#0284c7" />
                  </g>

                  {/* Modular Kitchen */}
                  <g 
                    onClick={() => setSelectedZone('kitchen')}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  >
                    <rect 
                      x="245" y="30" width="120" height="130" 
                      fill={selectedZone === 'kitchen' ? '#064e3b' : '#0f172a'} 
                      stroke="#10b981" 
                      strokeWidth={selectedZone === 'kitchen' ? 2 : 1.2} 
                    />
                    <text x="305" y="90" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">Kitchen (SE)</text>
                    <text x="305" y="105" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">14.2 m²</text>
                    
                    {/* Kitchen counter L-shape */}
                    <path d="M255 40 L350 40 L350 75 L335 75 L335 55 L255 55 Z" fill="#047857" />
                  </g>

                  {/* Dog-Leg Staircase */}
                  <g 
                    onClick={() => setSelectedZone('stair')}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  >
                    <rect 
                      x="35" y="170" width="130" height="75" 
                      fill={selectedZone === 'stair' ? '#78350f' : '#1e1b4b'} 
                      stroke="#f59e0b" 
                      strokeWidth={selectedZone === 'stair' ? 2 : 1.2} 
                    />
                    {/* Treads */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line key={i} x1={45 + i * 14} y1="175" x2={45 + i * 14} y2="205" stroke="#f59e0b" strokeWidth="1" />
                    ))}
                    <text x="100" y="225" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      STAIRS (UP →)
                    </text>
                  </g>

                  {/* Car Porch / Portico */}
                  <g className="opacity-80">
                    <rect x="180" y="170" width="185" height="75" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 2" />
                    <text x="272" y="210" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">CAR PORTICO</text>
                  </g>
                </>
              ) : (
                <>
                  {/* First Floor: Double Height Void */}
                  <g 
                    onClick={() => setSelectedZone('void')}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  >
                    <rect 
                      x="35" y="30" width="160" height="130" 
                      fill={selectedZone === 'void' ? '#312e81' : '#090d16'} 
                      stroke="#818cf8" 
                      strokeWidth={selectedZone === 'void' ? 2 : 1}
                      strokeDasharray="6 3" 
                    />
                    <line x1="35" y1="30" x2="195" y2="160" stroke="#818cf8" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="195" y1="30" x2="35" y2="160" stroke="#818cf8" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="115" y="90" textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="bold">OPEN TO BELOW</text>
                    <text x="115" y="105" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="monospace">Double-Height Void</text>
                  </g>

                  {/* Master Bedroom Suite */}
                  <g 
                    onClick={() => setSelectedZone('master')}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  >
                    <rect 
                      x="205" y="30" width="160" height="130" 
                      fill={selectedZone === 'master' ? '#1e3a8a' : '#0f172a'} 
                      stroke="#38bdf8" 
                      strokeWidth={selectedZone === 'master' ? 2 : 1.2} 
                    />
                    <text x="285" y="90" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">Master Spa Suite</text>
                    <text x="285" y="105" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">22.8 m²</text>
                    <rect x="250" y="45" width="70" height="40" rx="3" fill="#1e293b" stroke="#38bdf8" />
                  </g>

                  {/* Stair Landing (DN) */}
                  <g 
                    onClick={() => setSelectedZone('stair')}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  >
                    <rect 
                      x="35" y="170" width="130" height="75" 
                      fill={selectedZone === 'stair' ? '#78350f' : '#1e1b4b'} 
                      stroke="#f59e0b" 
                      strokeWidth={selectedZone === 'stair' ? 2 : 1.2} 
                    />
                    <text x="100" y="215" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      STAIRS (← DN)
                    </text>
                  </g>

                  {/* Terrace Balcony */}
                  <g className="opacity-90">
                    <rect x="180" y="170" width="185" height="75" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                    <text x="272" y="210" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontWeight="bold">OPEN TERRACE</text>
                  </g>
                </>
              )}

              {/* 16 Aligned Structural Columns (RC 230x450mm) */}
              {[35, 195, 365].map((cx) =>
                [30, 160, 245].map((cy) => (
                  <rect 
                    key={`${cx}-${cy}`} 
                    x={cx - 3} 
                    y={cy - 5} 
                    width="6" 
                    height="10" 
                    fill="#38bdf8" 
                    stroke="#ffffff" 
                    strokeWidth="0.5" 
                  />
                ))
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Interactive Inspector Pill Footer */}
      <div className="p-3.5 bg-white border-t border-slate-200 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 leading-none">
                {activeInfo.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                {activeInfo.area}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              {activeInfo.note}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            {activeInfo.code}
          </span>
        </div>
      </div>
    </div>
  );
}
