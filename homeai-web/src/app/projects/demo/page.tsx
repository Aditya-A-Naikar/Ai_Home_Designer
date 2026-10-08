"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { projectRepository } from "@/infrastructure/persistence/local-storage-project-repository";

export default function DemoProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDemo() {
      try {
        const demo = await projectRepository.seedDemo();
        router.push(`/editor/${demo.id}`);
      } catch (err) {
        console.error("Failed to seed demo project:", err);
        setError("Failed to initialize demo. Redirecting to dashboard...");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    }
    loadDemo();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-4 animate-bounce">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Loading Sunset Ridge Villa Demo...</h2>
      <p className="mt-2 text-sm text-slate-500">
        {error || "Initializing demo layout with pre-configured rooms and dimensions."}
      </p>
    </div>
  );
}
