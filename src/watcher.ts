// Surveille les transcripts Claude Code (~/.claude/projects/<projet>/<session>.jsonl)
// et les sous-agents (<session>/subagents/agent-<id>.jsonl) pour produire des WorldEvent.
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { AgentInfo, SessionInfo, Snapshot, Todo, WorldEvent } from './events';
import { parseEntry } from './transcript';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TICK_MS = 600;
const DISCOVER_EVERY = 4;
const LIVE_WINDOW_MS = 90_000;
const STALE_AGENT_MS = 10 * 60_000;
const BOOTSTRAP_BYTES = 1024 * 1024;
const MAX_READ_BYTES = 4 * 1024 * 1024;

export interface WatcherOptions {
  projectsDir: string;
  workspaceDirs: string[];
  followAll: boolean;
}

export interface SessionListing {
  file: string;
  mtime: number;
  title: string;
  project: string;
}

/** Lit les lignes ajoutées à un fichier depuis la dernière lecture. */
class LineTail {
  private partial = Buffer.alloc(0);

  constructor(readonly file: string, private offset: number) {}

  read(): string[] {
    let size: number;
    try {
      size = fs.statSync(this.file).size;
    } catch {
      return [];
    }
    if (size < this.offset) {
      this.offset = 0;
      this.partial = Buffer.alloc(0);
    }
    if (size === this.offset) return [];

    const len = Math.min(size - this.offset, MAX_READ_BYTES);
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(this.file, 'r');
    try {
      fs.readSync(fd, buf, 0, len, this.offset);
    } finally {
      fs.closeSync(fd);
    }
    this.offset += len;

    const data = Buffer.concat([this.partial, buf]);
    const lines: string[] = [];
    let start = 0;
    for (let i = data.indexOf(10); i !== -1; i = data.indexOf(10, start)) {
      lines.push(data.toString('utf8', start, i));
      start = i + 1;
    }
    this.partial = data.subarray(start);
    return lines;
  }
}

interface TrackedAgent {
  info: AgentInfo;
  tail: LineTail;
  metaFile: string;
  active: boolean;
}

function safeJson(line: string): any {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function mtimeOf(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function readDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Lit la fin d'un fichier (les premières lignes partielles sont ignorées). */
function readTailLines(file: string, bytes: number): string[] {
  try {
    const size = fs.statSync(file).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    const fd = fs.openSync(file, 'r');
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    const lines = buf.toString('utf8').split('\n');
    if (start > 0) lines.shift();
    return lines.filter(Boolean);
  } catch {
    return [];
  }
}

/** Claude Code encode le cwd en remplaçant chaque caractère non alphanumérique par '-'. */
export function encodeProjectDir(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

export function titleOf(file: string): string {
  const lines = readTailLines(file, 256 * 1024);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"ai-title"')) continue;
    const o = safeJson(lines[i]);
    if (o?.type === 'ai-title' && o.aiTitle) return String(o.aiTitle);
  }
  return '';
}

export class SessionWatcher extends EventEmitter {
  private timer: NodeJS.Timeout | undefined;
  private ticks = 0;
  private pinned: string | undefined;

  private session: SessionInfo | null = null;
  private mainTail: LineTail | undefined;
  private agents = new Map<string, TrackedAgent>();
  private pendingMeta = new Map<string, number>();
  private todos: Todo[] = [];
  private lastActivities = new Map<string, WorldEvent>();
  private lastActivityTime = 0;
  private live = false;

  constructor(private opts: WatcherOptions) {
    super();
  }

  configure(opts: WatcherOptions): void {
    this.opts = opts;
    this.ticks = 0;
  }

  start(): void {
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Force le suivi d'une session précise (undefined = automatique). */
  pin(file: string | undefined): void {
    this.pinned = file;
    if (file) this.attach(file);
    else this.ticks = 0;
  }

  get isLive(): boolean {
    return this.live;
  }

  get activeAgentCount(): number {
    let n = 0;
    for (const a of this.agents.values()) if (a.active) n++;
    return n;
  }

  snapshot(): Snapshot {
    return {
      session: this.session,
      agents: [...this.agents.values()].filter((a) => a.active).map((a) => a.info),
      todos: this.todos,
      live: this.live,
      lastActivities: [...this.lastActivities.values()],
    };
  }

  listSessions(limit = 30): SessionListing[] {
    const out: SessionListing[] = [];
    for (const dir of this.candidateDirs(true)) {
      for (const f of readDir(dir)) {
        if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
        const file = path.join(dir, f.name);
        out.push({ file, mtime: mtimeOf(file), title: '', project: path.basename(dir) });
      }
    }
    out.sort((a, b) => b.mtime - a.mtime);
    const top = out.slice(0, limit);
    for (const s of top) s.title = titleOf(s.file);
    return top;
  }

  // ---------------------------------------------------------------- interne

  private candidateDirs(all = false): string[] {
    const dirs = readDir(this.opts.projectsDir)
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    const wanted = this.opts.workspaceDirs.map((w) => encodeProjectDir(w).toLowerCase());
    const picked =
      all || this.opts.followAll || wanted.length === 0
        ? dirs
        : dirs.filter((d) => {
            const l = d.toLowerCase();
            return wanted.some((w) => l === w || l.startsWith(w + '-'));
          });
    return picked.map((d) => path.join(this.opts.projectsDir, d));
  }

  private latestSession(): { file: string; mtime: number } | undefined {
    let best: { file: string; mtime: number } | undefined;
    for (const dir of this.candidateDirs()) {
      for (const f of readDir(dir)) {
        if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
        const file = path.join(dir, f.name);
        const mtime = mtimeOf(file);
        if (!best || mtime > best.mtime) best = { file, mtime };
      }
    }
    return best;
  }

  private sessionActivity(): number {
    if (!this.session) return 0;
    let t = mtimeOf(this.session.file);
    for (const a of this.agents.values()) if (a.active) t = Math.max(t, mtimeOf(a.tail.file));
    return t;
  }

  private tick(): void {
    try {
      if (!this.pinned && this.ticks % DISCOVER_EVERY === 0) this.discover();
      if (this.session) {
        this.readMain();
        if (this.ticks % 2 === 0) this.scanSubagents(false);
        this.readAgents();
        if (this.ticks % 3 === 0) this.checkAgentsFinished();
      }
      this.updateLive();
    } catch (err) {
      console.error('[IA World]', err);
    }
    this.ticks++;
  }

  private discover(): void {
    const best = this.latestSession();
    if (!best) {
      if (this.session) this.detach();
      return;
    }
    if (!this.session) {
      this.attach(best.file);
    } else if (best.file !== this.session.file && best.mtime > this.sessionActivity() + 2000) {
      this.attach(best.file);
    }
  }

  private detach(): void {
    this.session = null;
    this.mainTail = undefined;
    this.agents.clear();
    this.todos = [];
    this.lastActivities.clear();
    this.emit('session', this.snapshot());
  }

  private attach(file: string): void {
    this.agents.clear();
    this.todos = [];
    this.lastActivities.clear();
    this.lastActivityTime = mtimeOf(file);

    let title = '';
    let project = path.basename(path.dirname(file));
    for (const line of readTailLines(file, BOOTSTRAP_BYTES)) {
      const o = safeJson(line);
      if (!o) continue;
      if (o.type === 'ai-title' && o.aiTitle) title = String(o.aiTitle);
      if (typeof o.cwd === 'string') project = path.basename(o.cwd);
      if (o.isSidechain) continue;
      for (const ev of parseEntry(o, 'main')) {
        if (ev.type === 'todos') this.todos = ev.todos;
        if (ev.type === 'activity') this.lastActivities.set('main', ev);
        if (ev.type === 'turnEnd') this.lastActivities.delete('main');
      }
    }

    let size = 0;
    try {
      size = fs.statSync(file).size;
    } catch {
      /* fichier disparu */
    }
    this.session = { id: path.basename(file, '.jsonl'), file, title, project };
    this.mainTail = new LineTail(file, size);
    this.scanSubagents(true);
    this.live = Date.now() - this.lastActivityTime < LIVE_WINDOW_MS;
    this.emit('session', this.snapshot());
  }

  private subagentDir(): string | undefined {
    return this.session ? path.join(this.session.file.replace(/\.jsonl$/, ''), 'subagents') : undefined;
  }

  private scanSubagents(initial: boolean): void {
    const dir = this.subagentDir();
    if (!dir) return;
    for (const f of readDir(dir)) {
      const m = /^agent-(.+)\.jsonl$/.exec(f.name);
      if (!m || this.agents.has(m[1])) continue;
      const file = path.join(dir, f.name);
      const metaFile = path.join(dir, `agent-${m[1]}.meta.json`);
      const meta = safeJson(readSafe(metaFile));
      const recent = Date.now() - mtimeOf(file) < STALE_AGENT_MS;

      if (initial && (!recent || meta?.finished)) {
        // Agent déjà terminé avant notre arrivée : on le mémorise sans l'afficher.
        this.agents.set(m[1], { info: { id: m[1], name: '', agentType: '' }, tail: new LineTail(file, 0), metaFile, active: false });
        continue;
      }
      if (!meta && !initial) {
        // Le .meta.json arrive parfois juste après le .jsonl : on retente au prochain scan.
        const pending = this.pendingMeta.get(m[1]) ?? 0;
        if (pending < 3) {
          this.pendingMeta.set(m[1], pending + 1);
          continue;
        }
      }
      this.pendingMeta.delete(m[1]);

      const info: AgentInfo = {
        id: m[1],
        name: String(meta?.description || meta?.agentType || 'Agent'),
        agentType: String(meta?.agentType || 'agent'),
      };
      const start = initial ? fs.statSync(file).size : 0;
      this.agents.set(m[1], { info, tail: new LineTail(file, start), metaFile, active: true });
      if (!initial) this.emitEvent({ type: 'spawn', agent: info });
    }
  }

  private readMain(): void {
    if (!this.mainTail) return;
    for (const line of this.mainTail.read()) {
      const o = safeJson(line);
      if (!o) continue;
      if (o.type === 'ai-title' && o.aiTitle && this.session && this.session.title !== o.aiTitle) {
        this.session.title = String(o.aiTitle);
        this.emit('title', this.session.title);
      }
      if (o.isSidechain) continue;
      this.handle(parseEntry(o, 'main'));
    }
  }

  private readAgents(): void {
    for (const a of this.agents.values()) {
      if (!a.active) continue;
      for (const line of a.tail.read()) {
        const o = safeJson(line);
        if (o) this.handle(parseEntry(o, a.info.id));
      }
    }
  }

  private checkAgentsFinished(): void {
    for (const a of this.agents.values()) {
      if (!a.active) continue;
      const meta = safeJson(readSafe(a.metaFile));
      const stale = Date.now() - mtimeOf(a.tail.file) > STALE_AGENT_MS;
      if (meta?.finished || stale) this.despawn(a.info.id);
    }
  }

  private despawn(id: string): void {
    const a = this.agents.get(id);
    if (!a || !a.active) return;
    a.tail.read().forEach((line) => {
      const o = safeJson(line);
      if (o) this.handle(parseEntry(o, id));
    });
    a.active = false;
    this.lastActivities.delete(id);
    this.emitEvent({ type: 'despawn', id });
  }

  private handle(events: WorldEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'agentResult') {
        this.despawn(ev.id);
        continue;
      }
      if (ev.type === 'todos') this.todos = ev.todos;
      if (ev.type === 'activity') this.lastActivities.set(ev.agentId, ev);
      if (ev.type === 'turnEnd') this.lastActivities.delete(ev.agentId);
      if ('agentId' in ev && ev.agentId !== 'main' && !this.agents.get(ev.agentId)?.active) continue;
      this.lastActivityTime = Date.now();
      this.emitEvent(ev);
    }
  }

  private updateLive(): void {
    const live = !!this.session && Date.now() - this.lastActivityTime < LIVE_WINDOW_MS;
    if (live !== this.live) {
      this.live = live;
      this.emitEvent({ type: 'status', live });
    }
  }

  private emitEvent(ev: WorldEvent): void {
    this.emit('event', ev);
  }
}

function readSafe(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}
