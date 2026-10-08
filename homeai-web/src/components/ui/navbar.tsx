"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Safety", href: "#safety" },
];

/**
 * Responsive sticky navigation bar with mobile hamburger menu.
 * Accessible: keyboard-navigable, visible focus states, aria-expanded on toggle button.
 */
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const linkClass =
    "text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="HomeAI Designer — Home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Home className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            HomeAI <span className="text-indigo-600">Designer</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex" role="list">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            My Projects
          </Link>
          <Link
            href="/projects/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Start Designing
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      <div
        id="mobile-menu"
        className={cn(
          "border-t border-slate-200 bg-white md:hidden",
          isMenuOpen ? "block" : "hidden"
        )}
      >
        <ul className="flex flex-col gap-1 px-4 py-3" role="list">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 px-4 pb-4">
          <Link
            href="/dashboard"
            className="block rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            onClick={() => setIsMenuOpen(false)}
          >
            My Projects
          </Link>
          <Link
            href="/projects/new"
            className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            onClick={() => setIsMenuOpen(false)}
          >
            Start Designing
          </Link>
        </div>
      </div>
    </header>
  );
}
