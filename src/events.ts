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
  | 'trash'
  | 'other';

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | string;
}

export interface AgentInfo {
  id: string;
  name: string;
  agentType: string;
  /** Robot Claude (session) qui a lancé cet agent. */
  ownerId?: string;
}

export interface SessionInfo {
  id: string;
  /** Identifiant du robot Claude de cette session dans le monde. */
  mainId: string;
  file: string;
  title: string;
  project: string;
}

export type WorldEvent =
  | { type: 'activity'; agentId: string; kind: ActivityKind; label: string; detail?: string; tool?: string }
  | { type: 'prompt'; agentId: string; text: string }
  | { type: 'error'; agentId: string; text: string }
  | { type: 'turnEnd'; agentId: string }
  | { type: 'interrupt'; agentId: string }
  | { type: 'todos'; todos: Todo[] }
  | { type: 'spawn'; agent: AgentInfo }
  | { type: 'despawn'; id: string }
  | { type: 'agentResult'; id: string }
  | { type: 'status'; live: boolean }
  | { type: 'sessionStart'; session: SessionInfo }
  | { type: 'sessionEnd'; mainId: string }
  | { type: 'title'; mainId: string; title: string };

export interface Snapshot {
  /** Session la plus récemment active. */
  session: SessionInfo | null;
  sessions: SessionInfo[];
  agents: AgentInfo[];
  todos: Todo[];
  live: boolean;
  lastActivities: WorldEvent[];
}
