import { useState } from 'react';
import { AIMessage } from '../types';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { fitToContent } from '@/core/canvas/transform';
import { PlanGenerationAction } from '@/core/ai/plan-generator';
import { ActionPayload } from '@/core/ai/architect-rules';
import { v4 as uuidv4 } from 'uuid';

export function useAIAdvisor(projectId: string) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Hello! I am your AI Architectural Co-Pilot. I can audit building codes (NBC/IBC), optimize natural lighting, and autonomously place accessories like 75\" TVs, sofas, and beds with Neufert ergonomic viewing distances. What would you like to design?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const executeAction = (action: ActionPayload | PlanGenerationAction) => {
    const store = useProjectStore.getState();
    const type = action.type;
    const floorId = action.floorId;

    if (type === 'add_prop' && 'prop' in action && action.prop) {
      store.addProp(floorId, action.prop);
    } else if (type === 'add_wall' && 'wall' in action && action.wall) {
      store.addWall(floorId, action.wall);
    } else if (type === 'add_room' && 'room' in action && action.room) {
      store.addRoom(floorId, action.room);
    } else if (type === 'add_window') {
      const act = action as ActionPayload;
      if (act.wallId) {
        store.addWindow(floorId, act.wallId, {
          id: `win-${uuidv4().slice(0, 8)}`,
          wallId: act.wallId,
          floorId,
          offset: (act.params.offset as number) || 1500,
          width: (act.params.width as number) || 1200,
          height: (act.params.height as number) || 1200,
          sillHeight: (act.params.sillHeight as number) || 900,
        });
      }
    } else if (type === 'widen_door') {
      const act = action as ActionPayload;
      if (act.wallId && act.doorId) {
        store.updateDoor(floorId, act.wallId, act.doorId, (door) => {
          door.width = (act.params.width as number) || 900;
        });
      }
    }
  };

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

      // Automatically apply direct mutations (props, rooms, walls)
      if (data.actions && data.actions.length > 0) {
        const store = useProjectStore.getState();
        const activeFloorId = (projectContext as { activeFloorId?: string })?.activeFloorId || '';
        store.applyPlanGenerationActions(activeFloorId, data.actions, data.replaceFloor);

        // Auto-fit newly generated geometry so the user immediately sees the result
        const updatedProject = useProjectStore.getState().currentProject;
        const targetFloor = updatedProject?.floors.find(f => f.id === activeFloorId);
        if (targetFloor && targetFloor.walls.length > 0 && typeof window !== 'undefined') {
          const { zoom, panOffset } = fitToContent(
            targetFloor.walls,
            Math.max(window.innerWidth - 680, 500),
            Math.max(window.innerHeight - 80, 400)
          );
          useCanvasStore.getState().setZoom(zoom);
          useCanvasStore.getState().setPanOffset(panOffset);
        }
      }
      
      const aiMsg: AIMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.message,
        suggestions: data.suggestions,
        actions: data.actions,
        placementSummary: data.placementSummary,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Advisor Hook Error:", err);
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: "I encountered an issue processing your architectural request. Please ensure the project floor plan has closed wall boundaries.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (msgId: string, suggestionId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.suggestions) {
        const targetSug = m.suggestions.find(s => s.id === suggestionId);
        if (targetSug && targetSug.action) {
          executeAction(targetSug.action);
        }
        return {
          ...m,
          suggestions: m.suggestions.map(s => 
            s.id === suggestionId ? { ...s, applied: true } : s
          )
        };
      }
      return m;
    }));
  };

  return { messages, isLoading, sendMessage, applySuggestion };
}
