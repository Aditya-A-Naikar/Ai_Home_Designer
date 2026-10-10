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
        className="absolute inset-0 bg-blueprint-lines opacity-10 pointer-events-none" 
        aria-hidden="true" 
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 lg:pt-24 lg:pb-20">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Text & Key Value Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-medium text-cyan-400 mb-6 backdrop-blur-sm">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>AI-Assisted Architectural Design Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Architectural home design,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                simplified.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Create millimeter-accurate 2D floor plans, explore multi-floor layouts with coordinated stairs, 
              and walk through realistic 3D spaces — with intelligent AI assistance every step of the way.
            </p>

            {/* Architectural Parameter Strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-xs uppercase text-slate-400 tracking-wider block font-semibold">2D CAD Plans</span>
                <span className="text-xs font-bold text-slate-200 mt-1 block">Millimeter Accuracy</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-xs uppercase text-slate-400 tracking-wider block font-semibold">3D Walkthrough</span>
                <span className="text-xs font-bold text-slate-200 mt-1 block">Instant 3D Preview</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-xs uppercase text-slate-400 tracking-wider block font-semibold">Multi-Floor</span>
                <span className="text-xs font-bold text-emerald-400 mt-1 block">Duplex & Stairs</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-xs uppercase text-slate-400 tracking-wider block font-semibold">Standards</span>
                <span className="text-xs font-bold text-cyan-400 mt-1 block">NBC 2024 / IBC</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/projects/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition-all shadow-sm hover:shadow-cyan-500/20 active:translate-y-0.5"
              >
                <span>Start Designing Free</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/projects/demo"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors"
              >
                <Box className="h-4 w-4 text-cyan-400" />
                <span>Explore Sample Villa</span>
              </Link>
            </div>

            {/* System Trust & Safety Strip */}
            <div className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Deterministic Architectural Geometry
              </span>
              <span className="text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                True-North Solar Study
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
