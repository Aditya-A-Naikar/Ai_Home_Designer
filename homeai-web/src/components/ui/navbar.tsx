"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

const navLinks: NavLink[] = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Standards", href: "/#safety" },
  { label: "Sample Villa", href: "/projects/demo" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md transition-all text-white">
      <nav
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Brand identity */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md"
            aria-label="HomeAI Designer — Home"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
              AI
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">
                HomeAI
              </span>
              <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                Designer
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-6 md:flex" role="list">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 py-1"
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right CTA Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/dashboard"
            className="h-8 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors flex items-center gap-1.5"
          >
            <span>My Projects</span>
          </Link>

          <Link
            href="/projects/new"
            className="h-8 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
          >
            <Plus className="h-3.5 w-3.5 text-slate-950" />
            <span>New Project</span>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 md:hidden cursor-pointer"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div
        id="mobile-menu"
        className={cn(
          "border-t border-slate-800 bg-[#090d16] px-4 pt-3 pb-4 md:hidden",
          isMenuOpen ? "block" : "hidden"
        )}
      >
        <ul className="space-y-2 mb-4" role="list">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-xs font-medium text-slate-300 hover:text-cyan-400"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <Link
            href="/dashboard"
            onClick={() => setIsMenuOpen(false)}
            className="w-full text-center py-2 text-xs font-semibold border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800"
          >
            My Projects
          </Link>
          <Link
            href="/projects/new"
            onClick={() => setIsMenuOpen(false)}
            className="w-full text-center py-2 text-xs font-bold bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400"
          >
            Create New Project
          </Link>
        </div>
      </div>
    </header>
  );
}
