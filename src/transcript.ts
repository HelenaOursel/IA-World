// Traduit une ligne de transcript Claude Code (.jsonl) en événements du monde.
import * as path from 'path';
import { ActivityKind, Todo, WorldEvent } from './events';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Nettoie un texte pour l'afficher dans une bulle. */
export function cleanText(s: string, max: number, dropTagContent = true): string {
  let t = s;
  if (dropTagContent) {
    t = t.replace(/<([a-zA-Z_-]+)[^>]*>[\s\S]*?<\/\1>/g, ' ');
  }
  t = t
    .replace(/<\/?[a-zA-Z_-]+[^>]*>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function base(p: unknown): string {
  return typeof p === 'string' && p ? path.basename(p.replace(/\\/g, '/')) : '';
}

function str(v: unknown, max = 60): string {
  return typeof v === 'string' ? cleanText(v, max, false) : '';
}

// Commandes de suppression : rm, del, Remove-Item, git rm…
const DELETE_RE = /(?:^|[\s;&|(])(?:rm|rmdir|rd|del|erase|unlink|Remove-Item|ri|git\s+rm|git\s+clean)(?=\s|$)([^;&|]*)/i;

/** Cible d'une commande de suppression (chaîne vide si inconnue), ou undefined si ce n'en est pas une. */
function deletedTarget(cmd: string): string | undefined {
  const m = DELETE_RE.exec(cmd);
  if (!m) return undefined;
  const args = m[1].split(/\s+/).filter((a) => a && !a.startsWith('-') && !a.startsWith('/'));
  const last = args[args.length - 1];
  return last ? base(last.replace(/^['"]|['"]$/g, '')) : '';
}

/** Une modification qui retire nettement plus de code qu'elle n'en ajoute. */
function removesCode(i: any): boolean {
  if (i.edit_mode === 'delete') return true;
  const edits: any[] = Array.isArray(i.edits) ? i.edits : [i];
  let removed = 0, added = 0;
  for (const e of edits) {
    removed += typeof e.old_string === 'string' ? e.old_string.length : 0;
    added += typeof e.new_string === 'string' ? e.new_string.length : 0;
  }
  return removed > 80 && added < removed * 0.35;
}

interface ToolDescription {
  kind: ActivityKind;
  label: string;
  detail?: string;
}

function describeMcp(name: string): ToolDescription {
  const [, server = 'mcp', ...rest] = name.split('__');
  const tool = rest.join('__') || name;
  const t = tool.toLowerCase();
  let kind: ActivityKind = 'web';
  if (/(delete|remove|trash|purge|drop)/.test(t)) kind = 'trash';
  else if (/(write|edit|update|create|upload|put|set|insert|patch)/.test(t)) kind = 'write';
  else if (/(search|find|list|query|grep|lookup)/.test(t)) kind = 'search';
  else if (/(read|get|fetch|meta|schema|history|download)/.test(t)) kind = 'read';
  return { kind, label: `${server} › ${tool.replace(/_/g, ' ')}` };
}

export function describeTool(name: string, input: any): ToolDescription {
  const i = input ?? {};
  switch (name) {
    case 'Read':
    case 'NotebookRead':
      return { kind: 'read', label: `Je lis ${base(i.file_path ?? i.notebook_path) || 'un fichier'}` };
    case 'Grep':
      return { kind: 'search', label: `Je cherche « ${str(i.pattern, 40)} »` };
    case 'Glob':
    case 'LS':
      return { kind: 'search', label: `Je fouille ${str(i.pattern ?? i.path, 40) || 'les dossiers'}` };
    case 'ToolSearch':
      return { kind: 'search', label: 'Je cherche le bon outil' };
    case 'Write':
      return { kind: 'write', label: `J'écris ${base(i.file_path) || 'un fichier'}` };
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit': {
      const file = base(i.file_path ?? i.notebook_path) || 'un fichier';
      if (removesCode(i)) return { kind: 'trash', label: `Je jette du code de ${file}` };
      return { kind: 'write', label: `Je modifie ${file}` };
    }
    case 'Bash':
    case 'PowerShell': {
      const cmd = typeof i.command === 'string' ? i.command.split('\n')[0] : '';
      const target = deletedTarget(cmd);
      if (target !== undefined) return { kind: 'trash', label: `Je jette ${target || 'des fichiers'}`, detail: str(i.description, 80) };
      return { kind: 'bash', label: `$ ${cleanText(cmd, 56, false)}`, detail: str(i.description, 80) };
    }
    case 'WebSearch':
      return { kind: 'web', label: `Je cherche sur le web : ${str(i.query, 40)}` };
    case 'WebFetch': {
      let host = '';
      try {
        host = new URL(String(i.url)).hostname;
      } catch {
        host = 'une page';
      }
      return { kind: 'web', label: `Je consulte ${host}` };
    }
    case 'TodoWrite': {
      const n = Array.isArray(i.todos) ? i.todos.length : 0;
      return { kind: 'plan', label: `Je planifie (${n} tâche${n > 1 ? 's' : ''})` };
    }
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'EnterPlanMode':
    case 'ExitPlanMode':
      return { kind: 'plan', label: 'Je prépare le plan' };
    case 'Agent':
    case 'Task':
      return { kind: 'agent', label: `J'envoie un agent : ${str(i.description, 44) || 'mission'}` };
    case 'SendMessage':
      return { kind: 'agent', label: "J'écris à un agent" };
    case 'AskUserQuestion':
      return { kind: 'ask', label: "J'ai une question pour toi !" };
    case 'Skill':
      return { kind: 'read', label: `J'ouvre la compétence ${str(i.skill, 30)}` };
    case 'Artifact':
      return { kind: 'write', label: 'Je publie une page' };
  }
  if (name.startsWith('mcp__')) return describeMcp(name);
  return { kind: 'other', label: `J'utilise ${name}` };
}

function todosFrom(input: any): Todo[] | undefined {
  if (!Array.isArray(input?.todos)) return undefined;
  return input.todos.map((t: any) => ({
    content: String(t.activeForm && t.status === 'in_progress' ? t.activeForm : t.content ?? ''),
    status: String(t.status ?? 'pending'),
  }));
}

function resultText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c?.type === 'text')
      .map((c: any) => c.text)
      .join(' ');
  }
  return '';
}

/** Convertit une entrée de transcript en événements. `isMain` indique le fil principal de la session (pas un sous-agent). */
export function parseEntry(entry: any, agentId: string, isMain = agentId === 'main'): WorldEvent[] {
  const out: WorldEvent[] = [];
  const content = entry?.message?.content;

  if (entry?.type === 'assistant' && Array.isArray(content)) {
    for (const b of content) {
      if (b?.type === 'thinking' || b?.type === 'redacted_thinking') {
        out.push({ type: 'activity', agentId, kind: 'think', label: 'Je réfléchis…' });
      } else if (b?.type === 'text' && typeof b.text === 'string') {
        const label = cleanText(b.text, 150);
        if (label) out.push({ type: 'activity', agentId, kind: 'talk', label });
      } else if (b?.type === 'tool_use' && typeof b.name === 'string') {
        const d = describeTool(b.name, b.input);
        out.push({ type: 'activity', agentId, kind: d.kind, label: d.label, detail: d.detail, tool: b.name });
        if (b.name === 'TodoWrite') {
          const todos = todosFrom(b.input);
          if (todos) out.push({ type: 'todos', todos });
        }
      }
    }
    if (entry.message?.stop_reason === 'end_turn') out.push({ type: 'turnEnd', agentId });
    return out;
  }

  if (entry?.type === 'user') {
    if (entry.isMeta || entry.isCompactSummary) return out;

    const res = entry.toolUseResult;
    if (res && typeof res === 'object' && typeof res.agentId === 'string' && res.status && res.status !== 'async_launched') {
      out.push({ type: 'agentResult', id: res.agentId });
    }

    if (Array.isArray(content)) {
      let promptText = '';
      for (const b of content) {
        if (b?.type === 'tool_result' && b.is_error) {
          const text = cleanText(resultText(b.content), 90, false) || 'Erreur';
          out.push({ type: 'error', agentId, text });
        } else if (b?.type === 'text' && typeof b.text === 'string') {
          promptText += ' ' + b.text;
        }
      }
      if (promptText) pushPrompt(out, promptText, agentId, isMain);
    } else if (typeof content === 'string') {
      pushPrompt(out, content, agentId, isMain);
    }
  }
  return out;
}

function pushPrompt(out: WorldEvent[], raw: string, agentId: string, isMain: boolean): void {
  if (!isMain) return;
  if (/^\s*\[Request interrupted/i.test(raw)) {
    out.push({ type: 'interrupt', agentId });
    return;
  }
  const text = cleanText(raw, 160);
  if (text) out.push({ type: 'prompt', agentId, text });
}
