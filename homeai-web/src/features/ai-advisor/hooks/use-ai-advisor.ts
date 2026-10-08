import { useState } from 'react';
import { AIMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useAIAdvisor(projectId: string) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Hello! I'm your AI architect assistant. How can I help you refine your floor plan today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string, projectContext: unknown) => {
    const userMsg: AIMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: content, projectContext, projectId })
      });
      
      const data = await res.json();
      
      const aiMsg: AIMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.message,
        suggestions: data.suggestions,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the advisory service right now.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (msgId: string, suggestionId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.suggestions) {
        return {
          ...m,
          suggestions: m.suggestions.map(s => 
            s.id === suggestionId ? { ...s, applied: true } : s
          )
        };
      }
      return m;
    }));
    // Real implementation would apply to project store here.
  };

  return { messages, isLoading, sendMessage, applySuggestion };
}
