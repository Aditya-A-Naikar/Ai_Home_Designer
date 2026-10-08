import Link from "next/link";
import { ArrowRight, Compass, Box, ShieldCheck, Cpu } from "lucide-react";
import { InteractiveTeaser } from "./interactive-teaser";

/**
 * Professional Architectural Studio Hero Section
 * Replaces generic AI marketing tropes with high-precision CAD & BIM engineering positioning.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#090d16] text-white border-b border-slate-800">
      {/* Subtle CAD Blueprint Grid Background */}
      <div 
        className="absolute inset-0 bg-blueprint-lines opacity-15 pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Engineering Coordinate Watermarks */}
      <div className="absolute top-4 left-6 hidden lg:flex items-center gap-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase pointer-events-none select-none">
        <span>SYS.CAD // KERNEL v2.4.0</span>
        <span className="text-slate-700">|</span>
        <span>PROJ_TOLERANCE: ±0.5mm</span>
        <span className="text-slate-700">|</span>
        <span>CS: WORLD_ORTHO</span>
      </div>

      <div className="absolute top-4 right-6 hidden lg:flex items-center gap-3 text-[10px] font-mono tracking-widest text-emerald-400/90 pointer-events-none select-none">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>BIM COORD ENGINE: ONLINE</span>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-20 lg:pt-28 lg:pb-24">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Text & System Spec Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-cyan-400 mb-6 backdrop-blur-sm">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold tracking-wide">ARCHITECTURAL CAD & BIM PLATFORM</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Deterministic CAD modeling meets{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                parametric multi-floor BIM.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Draft load-bearing multi-level floor plans with millimeter accuracy. 
              Compute code-compliant stairs, automate NBC & IBC clearances in real-time, 
              and inspect coordinated 3D structural models — engineered without hallucinations.
            </p>

            {/* Architectural Parameter Strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">Wall Core</span>
                <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">240mm Masonry</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">Level Stacking</span>
                <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">L0 + L1 Duplex</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">Code Kernel</span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">IBC / NBC 2024</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">View Sync</span>
                <span className="text-xs font-mono font-bold text-cyan-400 mt-0.5 block">2D Plan ↔ WebGL 3D</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/projects/new"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition-all shadow-sm hover:shadow-cyan-500/20 active:translate-y-0.5"
              >
                <span>Launch CAD Studio</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/projects/demo"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors"
              >
                <Box className="h-4 w-4 text-cyan-400" />
                <span>Open Villa Duplex Model</span>
              </Link>
            </div>

            {/* System Trust & Safety Strip */}
            <div className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Deterministic Internal Geometry
              </span>
              <span className="text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                True-North Orientation
              </span>
            </div>
          </div>

          {/* Right: Interactive Architectural CAD Teaser */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none">
            <InteractiveTeaser />
          </div>
        </div>
      </div>
    </section>
  );
}
