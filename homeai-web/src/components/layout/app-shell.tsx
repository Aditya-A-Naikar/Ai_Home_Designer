"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isEditor = pathname.startsWith("/editor");

  if (isEditor) {
    return (
      <main id="main-content" className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
