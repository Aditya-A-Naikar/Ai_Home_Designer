"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  SlidersHorizontal,
  Compass, 
  Box, 
  ArrowRight,
  ShieldCheck,
  Palette
} from "lucide-react";
import { 
  processConversationalIntakeTurn, 
  createDefaultProjectMemory, 
  StructuredProjectMemory, 
  instantiateProjectFromMemory 
} from "@/core/ai/conversational-intake";
import { ARCHITECTURAL_DESIGN_PRESETS } from "@/core/geometry/design-presets";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AiProjectDiscoveryProps {
  onSwitchToManual: (extractedMemory: StructuredProjectMemory) => void;
}

export function AiProjectDiscovery({ onSwitchToManual }: AiProjectDiscoveryProps) {
  const router = useRouter();
  const [memory, setMemory] = useState<StructuredProjectMemory>(createDefaultProjectMemory());
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      role: "assistant",
      content: "Welcome to HomeAI Studio! I'm your AI Architectural Consultant. What type of home or building are you planning? Tell me your vision — whether it's a multi-level duplex, luxury villa, or urban apartment, how many bedrooms you need, and the architectural aesthetic that speaks to you.",
      timestamp: "Just now",
    },
  ]);

  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "3BHK Modern Duplex with double-height mezzanine",
    "4BHK Luxury Villa with Japandi Zen finishes",
    "2BHK Scandinavian Apartment with home office",
    "G+1 Vaastu-aligned Bungalow with balcony sit-out",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `usr-${messages.length + 1}`,
      role: "user",
      content: text,
      timestamp: "Now",
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue("");

    // Process turn through the AI Architectural Intake engine
    const turnResult = processConversationalIntakeTurn(
      text,
      newHistory.map(m => ({ role: m.role, content: m.content })),
      memory
    );

    setMemory(turnResult.updatedMemory);
    setSuggestedPrompts(turnResult.suggestedPrompts);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `ai-${newHistory.length + 1}`,
        role: "assistant",
        content: turnResult.reply,
        timestamp: "Now",
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLaunchCAD = async () => {
    try {
      setIsSubmitting(true);
      const project = await instantiateProjectFromMemory(memory);
      router.push(`/editor/${project.id}`);
    } catch (err) {
      console.error("Failed to instantiate project from AI intake:", err);
      setIsSubmitting(false);
    }
  };

  const activePreset = ARCHITECTURAL_DESIGN_PRESETS[memory.designPresetId] || ARCHITECTURAL_DESIGN_PRESETS.modern_minimalist;

  return (
    <div className="w-full">
      {/* Top Header & Mode Switcher */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              STAGE 1 // AI ARCHITECTURAL DISCOVERY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            Design Requirements Intake
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Discuss your requirements naturally. Our AI consultant extracts programmatic spaces, structural levels, and design presets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSwitchToManual(memory)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
          <span>Manual 4-Step Form</span>
        </button>
      </div>

      {/* Main Dual Grid: Conversational Interview (Left) & Project Memory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversational AI Chat Interface (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[650px] rounded-xl border border-slate-800 bg-[#0c121e] shadow-xl overflow-hidden font-mono">
          {/* Chat Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">AI Architectural Consultant</span>
                <span className="text-[10px] text-slate-400 block">BIM & Spatial Programming Assistant</span>
              </div>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded">
              ONLINE
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isAi = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs leading-relaxed ${isAi ? "items-start" : "items-end flex-row-reverse"}`}
                >
                  {isAi && (
                    <div className="h-6 w-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl p-3.5 ${
                      isAi
                        ? "bg-slate-900 border border-slate-800 text-slate-200"
                        : "bg-cyan-600 text-slate-950 font-medium"
                    }`}
                  >
                    <div className="whitespace-pre-line text-xs font-sans">
                      {m.content}
                    </div>
                    <span
                      className={`block text-[9px] mt-1.5 ${
                        isAi ? "text-slate-500 text-right" : "text-cyan-950 text-left font-mono"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Starters */}
          {suggestedPrompts.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] text-slate-500 shrink-0 font-mono">Suggestions:</span>
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(p)}
                  className="text-[11px] font-sans px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your house vision, bedrooms, floors, or style..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-sans"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="h-9 w-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Live Project Memory & Architectural Brief Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono">
          <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Project Memory Brief
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                REACTIVE
              </span>
            </div>

            {/* Project Title & Massing Typology */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
                Project Title & Typology
              </span>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-sm font-bold text-white">
                  {memory.projectName}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                    {memory.typology === "duplex_vertical" ? "Duplex (G+1)" : memory.typology.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    {memory.floorsCount} LEVEL{memory.floorsCount > 1 ? "S" : ""}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-300 capitalize">
                    {memory.budgetTier} Tier
                  </span>
                </div>
              </div>
            </div>

            {/* Spatial Program Breakdown */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
                Spatial Programme
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">Bedrooms:</span>
                  <span className="font-bold text-white">{memory.bhkCount} Suites</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">Bathrooms:</span>
                  <span className="font-bold text-white">{memory.bathroomsCount} Baths</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">Orientation:</span>
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    <Compass className="h-3 w-3" />
                    <span>{memory.orientation}-Facing</span>
                  </span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">Staircase:</span>
                  <span className="font-bold text-white capitalize">{memory.stairType.replace("_", " ")}</span>
                </div>
              </div>
            </div>

            {/* Aesthetic Preset */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
                Architectural Aesthetic Preset
              </span>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{activePreset.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {activePreset.tagline}
                  </div>
                </div>
                <span 
                  className="h-4 w-4 rounded-full border border-slate-600 shrink-0" 
                  style={{ backgroundColor: activePreset.primaryColor }}
                />
              </div>
            </div>

            {/* Programmed Spaces & Amenities */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1.5">
                Included Functional Amenities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {memory.amenities.map((a) => (
                  <span
                    key={a}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700/80 text-slate-300 flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="capitalize">{a.replace(/_/g, " ")}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Compliance Badge */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span>Regulatory Standard:</span>
              </div>
              <span className="font-bold text-cyan-300 uppercase">
                {memory.buildingCode.toUpperCase()} • {memory.vaastuCompliant ? "VAASTU" : "STANDARD"}
              </span>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLaunchCAD}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/30 transition-all cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <span>Generating BIM Model...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Initialize Project & Launch CAD Studio</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-2">
                Generates verified walls, rooms, stairs, and props into the 2D CAD canvas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
