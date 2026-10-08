export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  affectedElements: string[]; // IDs of walls/rooms affected
  applied: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
  suggestions?: AISuggestion[];
}
