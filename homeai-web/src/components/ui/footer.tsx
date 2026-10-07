import Link from "next/link";
import { Home, GitBranch } from "lucide-react";


/**
 * Site footer with product name, nav links, and legal disclaimer.
 */
export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Home className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                HomeAI <span className="text-indigo-600">Designer</span>
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-xs">
              An AI-assisted home-planning and visualization workspace.
              Design, discuss, and refine before you build.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Product
            </h3>
            <ul className="mt-3 space-y-2" role="list">
              {[
                { label: "How it works", href: "#how-it-works" },
                { label: "Features", href: "#features" },
                { label: "Start Designing", href: "/projects/new" },
                { label: "My Projects", href: "/dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-500 hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Disclaimer */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Legal & Safety
            </h3>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              HomeAI Designer is a conceptual planning tool only. AI outputs are
              design suggestions — not certified structural, engineering, or
              code-compliance advice. Always consult a licensed professional
              before construction.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-slate-400">
            © {currentYear} HomeAI Designer. All rights reserved.
          </p>
          <a
            href="https://github.com/Aditya-A-Naikar/Ai_Home_Designer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            aria-label="View source on GitHub (opens in new tab)"
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
