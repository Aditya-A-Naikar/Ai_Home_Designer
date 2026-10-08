"use client";

import React, { useState } from 'react';
import { useAIAdvisor } from '../hooks/use-ai-advisor';
import { useProjectStore } from '@/store/project-store';
import { Send, Bot, User, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AIAdvisorPanel() {
  const { currentProject } = useProjectStore();
  const { messages, isLoading, sendMessage, applySuggestion } = useAIAdvisor(currentProject?.id || '');
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-20 right-0 bg-white border border-r-0 border-slate-200 p-2 rounded-l-md shadow-sm text-indigo-600 hover:bg-indigo-50"
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input, currentProject);
    setInput('');
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full shrink-0 relative">
      <div className="h-14 border-b flex items-center justify-between px-4 bg-slate-50 shrink-0">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600" /> AI Advisor
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                {msg.content}
              </div>
              
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-col gap-2 mt-1 w-full">
                  {msg.suggestions.map(sug => (
                    <div key={sug.id} className="border border-indigo-100 bg-white rounded-lg p-3 text-sm shadow-sm w-56">
                      <h4 className="font-medium text-slate-900 mb-1">{sug.title}</h4>
                      <p className="text-slate-500 text-xs mb-3">{sug.description}</p>
                      <Button 
                        size="sm" 
                        variant={sug.applied ? 'outline' : 'primary'}
                        className="w-full text-xs h-7"
                        disabled={sug.applied}
                        onClick={() => applySuggestion(msg.id, sug.id)}
                      >
                        {sug.applied ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Applied</> : 'Apply Suggestion'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl text-sm bg-slate-100 text-slate-500 rounded-tl-sm flex gap-1 items-center">
              <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
              <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t bg-white">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI for suggestions..."
            className="w-full pl-3 pr-10 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 top-1.5 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
