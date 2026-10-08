import { PlanGenerationAction } from "@/core/ai/plan-generator";
import { ActionPayload, AuditCategory, AuditSeverity } from "@/core/ai/architect-rules";

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  affectedElements?: string[];
  action?: ActionPayload;
  applied: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
  suggestions?: AISuggestion[];
  actions?: PlanGenerationAction[];
  placementSummary?: {
    propsAdded: number;
    roomsAffected: string[];
    viewingDistanceM?: number;
  };
}
