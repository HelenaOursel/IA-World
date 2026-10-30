// Événements normalisés envoyés à la webview. Ils décrivent ce que fait l'IA,
// indépendamment du format brut des transcripts Claude Code.

export type ActivityKind =
  | 'read'
  | 'search'
  | 'write'
  | 'bash'
  | 'web'
  | 'plan'
  | 'agent'
  | 'ask'
  | 'think'
  | 'talk'
  | 'other';

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | string;
}

export interface AgentInfo {
  id: string;
  name: string;
  agentType: string;
}

export interface SessionInfo {
  id: string;
  file: string;
  title: string;
  project: string;
}

export type WorldEvent =
  | { type: 'activity'; agentId: string; kind: ActivityKind; label: string; detail?: string; tool?: string }
  | { type: 'prompt'; text: string }
  | { type: 'error'; agentId: string; text: string }
  | { type: 'turnEnd'; agentId: string }
  | { type: 'todos'; todos: Todo[] }
  | { type: 'spawn'; agent: AgentInfo }
  | { type: 'despawn'; id: string }
  | { type: 'agentResult'; id: string }
  | { type: 'status'; live: boolean };

export interface Snapshot {
  session: SessionInfo | null;
  agents: AgentInfo[];
  todos: Todo[];
  live: boolean;
  lastActivities: WorldEvent[];
}
