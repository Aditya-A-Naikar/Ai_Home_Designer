import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "HomeAI Designer — AI-Assisted Home Planning",
    template: "%s | HomeAI Designer",
  },
  description:
    "Plan, discuss with AI, and visualize your dream home before breaking ground. Create precise 2D floor plans and explore design ideas with intelligent AI guidance.",
  keywords: ["home design", "floor plan", "AI design", "home planning", "2D floor plan"],
  authors: [{ name: "HomeAI Designer" }],
  openGraph: {
    title: "HomeAI Designer",
    description:
      "AI-assisted home planning and visualization workspace. Plan → Discuss → Modify → Visualize.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased bg-white text-slate-900 min-h-screen flex flex-col font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
