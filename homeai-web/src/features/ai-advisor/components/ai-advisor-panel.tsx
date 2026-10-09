"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAIAdvisor } from '../hooks/use-ai-advisor';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { Send, Bot, User, CheckCircle2, ChevronRight, Sparkles, ShieldAlert, Sun, Compass, Ruler, Tv, BedDouble, LayoutGrid, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AIAdvisorPanel() {
  const { currentProject } = useProjectStore();
  const { messages, isLoading, sendMessage, applySuggestion } = useAIAdvisor(currentProject?.id || '');
  const { aiAdvisorOpen, setAIAdvisorOpen } = useCanvasStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!aiAdvisorOpen) {
    return (
      <button 
        onClick={() => setAIAdvisorOpen(true)}
        className="absolute top-16 right-0 bg-white border border-r-0 border-slate-200 p-2.5 rounded-l-xl shadow-md text-indigo-600 hover:bg-indigo-50 z-20 flex items-center gap-1.5 font-medium text-xs cursor-pointer transition-all hover:pr-3.5"
        title="Open AI Architectural Advisor"
      >
        <Bot className="h-5 w-5" />
        <span className="hidden sm:inline font-semibold">AI Co-Pilot</span>
      </button>
    );
  }

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;
    sendMessage(text, currentProject);
    setInput('');
  };

  const quickPills = [
    { label: 'Duplex Villa (G+1)', prompt: 'Build a duplex house with internal staircase and double height living room', icon: <Building2 className="h-3 w-3 text-emerald-600" /> },
    { label: '2BHK Layout', prompt: 'Build a complete 2BHK architectural floor plan with living room, bedrooms, kitchen, and furniture', icon: <LayoutGrid className="h-3 w-3 text-indigo-600" /> },
    { label: 'Review Layout', prompt: 'Improve layout and review circulation and daylighting', icon: <Sparkles className="h-3 w-3 text-amber-600" /> },
    { label: 'Design Styles', prompt: 'What architectural design presets and styles do you support?', icon: <Sparkles className="h-3 w-3 text-purple-600" /> },
    { label: '75" TV + Sofa', prompt: 'Add a 75-inch TV and modern gray L-shaped sofa to the Living Room', icon: <Tv className="h-3 w-3 text-sky-600" /> },
    { label: 'King Bed', prompt: 'Place a King size bed in the bedroom with nightstand clearance', icon: <BedDouble className="h-3 w-3 text-purple-600" /> },
    { label: 'Audit Codes', prompt: 'Audit my floor plan for NBC/IBC codes and natural daylight', icon: <ShieldAlert className="h-3 w-3 text-red-600" /> },
  ];

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'building_code': return <ShieldAlert className="h-3 w-3 text-red-500" />;
      case 'ventilation': return <Sun className="h-3 w-3 text-amber-500" />;
      case 'vaastu': return <Compass className="h-3 w-3 text-emerald-500" />;
      case 'egress': return <Ruler className="h-3 w-3 text-sky-500" />;
      default: return <Sparkles className="h-3 w-3 text-indigo-500" />;
    }
  };

  return (
    <div className="w-96 min-w-[340px] max-w-[420px] border-l bg-white flex flex-col h-full shrink-0 relative shadow-sm overflow-hidden z-10">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
              AI Architect Co-Pilot
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">NBC / IBC & Ergonomics Engine</p>
          </div>
        </div>
        <button 
          onClick={() => setAIAdvisorOpen(false)} 
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
          title="Minimize Co-Pilot"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-slate-200 text-slate-700' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            
            <div className={`flex flex-col gap-2 max-w-[85%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2.5 rounded-2xl leading-relaxed break-words whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-xs font-medium' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60'
              }`}>
                {msg.content}
              </div>

              {/* Placement Metric Summary Pill */}
              {msg.placementSummary && (
                <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50/80 border border-indigo-200/60 px-2.5 py-1.5 rounded-lg text-[11px] text-indigo-900 font-medium">
                  <Sparkles className="h-3 w-3 text-indigo-600 shrink-0" />
                  <span>Placed {msg.placementSummary.propsAdded} prop(s)</span>
                  {msg.placementSummary.viewingDistanceM && (
                    <span>• {msg.placementSummary.viewingDistanceM.toFixed(1)}m viewing dist</span>
                  )}
                </div>
              )}
              
              {/* Suggestion Cards */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-col gap-2 mt-1 w-full">
                  {msg.suggestions.map(sug => (
                    <div 
                      key={sug.id} 
                      className="border border-indigo-100 bg-white rounded-xl p-3 shadow-xs space-y-2 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-900">
                          {getCategoryIcon(sug.category)}
                          <span className="line-clamp-1">{sug.title}</span>
                        </div>
                        {sug.severity && (
                          <Badge 
                            variant={sug.severity === 'error' ? 'warning' : sug.severity === 'info' ? 'info' : 'default'} 
                            className="text-[9px] uppercase px-1.5 py-0"
                          >
                            {sug.severity}
                          </Badge>
                        )}
                      </div>

                      <p className="text-slate-600 text-[11px] leading-relaxed">{sug.description}</p>
                      
                      {sug.action && (
                        <Button 
                          size="sm" 
                          variant={sug.applied ? 'outline' : 'primary'}
                          className="w-full text-xs h-7 font-medium"
                          disabled={sug.applied}
                          onClick={() => applySuggestion(msg.id, sug.id)}
                        >
                          {sug.applied ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Applied to Canvas
                            </span>
                          ) : (
                            'Apply to Canvas'
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100 text-slate-500 rounded-tl-xs flex gap-1.5 items-center border border-slate-200/50">
              <span className="text-[11px] font-medium mr-1">Calculating architectural geometry</span>
              <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" />
              <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Pills */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-1.5 shrink-0">
        {quickPills.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.prompt)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {p.icon}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t bg-white shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Build 2BHK plan, add 75' TV + sofa, or audit..."
            className="w-full pl-3 pr-10 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 top-1.5 p-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-40 transition-colors cursor-pointer"
            title="Send architectural instruction"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
