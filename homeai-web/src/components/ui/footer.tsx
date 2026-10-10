import Link from "next/link";
import { GitBranch, Box, ShieldCheck, Cpu } from "lucide-react";

/**
 * Architectural Studio Footer
 * Polished, high-density technical footer with system status indicator and specifications.
 */
export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-slate-800 bg-[#070a10] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & System Spec */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shadow-sm">
                AI
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                HomeAI <span className="text-cyan-400">Designer</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              AI-assisted home planning and architectural visualization platform.
              Draft 2D floor plans, explore multi-floor layouts, and inspect 3D models with millimeter accuracy.
            </p>

            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CAD Engine v2.4 • All Systems Ready</span>
            </div>
          </div>

          {/* Architectural Studio Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Workspace
            </h3>
            <ul className="mt-3 space-y-2 text-xs" role="list">
              {[
                { label: "New Project", href: "/projects/new" },
                { label: "Sample Villa Demo", href: "/projects/demo" },
                { label: "Projects Dashboard", href: "/dashboard" },
                { label: "Features & Specifications", href: "#features" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Regulatory Standards */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Design Standards
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>NBC 2024 (India)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>IBC 2024 (International)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>WebGL 3D Rendering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Deterministic BIM Architecture</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row text-xs text-slate-500">
          <p>© {currentYear} HomeAI Studio. Engineered for professional residential architecture.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-600">STRICT DETERMINISTIC MODEL</span>
            <a
              href="https://github.com/Aditya-A-Naikar/Ai_Home_Designer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Git Repository</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
