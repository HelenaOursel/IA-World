// Surveille les transcripts Claude Code (~/.claude/projects/<projet>/<session>.jsonl)
// et les sous-agents (<session>/subagents/agent-<id>.jsonl) pour produire des WorldEvent.
// Toutes les sessions actives récemment sont suivies en même temps : chacune a son robot Claude.
// Un /clear ouvre un nouveau fichier de session : il remplace l'ancien et garde le même robot.
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { AgentInfo, SessionInfo, Snapshot, Todo, WorldEvent } from './events';
import { parseEntry } from './transcript';

const TICK_MS = 600;
const DISCOVER_EVERY = 4;
// Au repos (aucune session en direct), les nouvelles sessions sont cherchées trois fois moins souvent.
const IDLE_DISCOVER_EVERY = 12;
const LIVE_WINDOW_MS = 90_000;
const ACTIVE_SESSION_MS = 15 * 60_000;
const STALE_AGENT_MS = 10 * 60_000;
const BOOTSTRAP_BYTES = 1024 * 1024;
const MAX_READ_BYTES = 4 * 1024 * 1024;
// Une session est remplacée par une plus récente du même projet si elle n'a plus rien écrit depuis son début (à cette marge près).
const REPLACE_SLACK_MS = 5_000;

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
export class LineTail {
  private partial = Buffer.alloc(0);

  constructor(readonly file: string, private offset: number) {}

  async read(): Promise<string[]> {
    const size = (await statOf(this.file))?.size;
    if (size === undefined) return [];
    if (size < this.offset) {
      this.offset = 0;
      this.partial = Buffer.alloc(0);
    }
    if (size === this.offset) return [];

    let buf: Buffer;
    try {
      buf = await readRange(this.file, this.offset, Math.min(size - this.offset, MAX_READ_BYTES));
    } catch {
      return [];
    }
    this.offset += buf.length;

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

// Toutes les lectures sont asynchrones : l'extension host n'est jamais bloqué, même avec des centaines de sessions.

/** Informations du fichier, ou undefined s'il n'existe pas (ou plus). */
async function statOf(file: string): Promise<fs.Stats | undefined> {
  try {
    return await fs.promises.stat(file);
  } catch {
    return undefined;
  }
}

async function readSafe(file: string): Promise<string> {
  try {
    return await fs.promises.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function mtimeOf(file: string): Promise<number> {
  return (await statOf(file))?.mtimeMs ?? 0;
}

/** Taille du fichier, ou 0 s'il a disparu entre-temps. */
async function sizeOf(file: string): Promise<number> {
  return (await statOf(file))?.size ?? 0;
}

/** Lit `length` octets à partir de `start` (moins si le fichier est plus court). */
async function readRange(file: string, start: number, length: number): Promise<Buffer> {
  const handle = await fs.promises.open(file, 'r');
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buf, 0, length, start);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/** Lit le début d'un fichier, ligne par ligne (la dernière ligne partielle est ignorée). */
async function readHeadLines(file: string, bytes: number): Promise<string[]> {
  try {
    const buf = await readRange(file, 0, bytes);
    const lines = buf.toString('utf8').split('\n');
    if (buf.length === bytes) lines.pop();
    return lines.filter(Boolean);
  } catch {
    return [];
  }
}

const startCache = new Map<string, number>();
/** Début d'une session : horodatage de sa première entrée datée, sinon date de création du fichier. */
async function startOf(file: string): Promise<number> {
  const cached = startCache.get(file);
  if (cached) return cached;
  let start = 0;
  for (const line of (await readHeadLines(file, 64 * 1024)).slice(0, 40)) {
    const ts = Date.parse(safeJson(line)?.timestamp ?? '');
    if (ts) {
      start = ts;
      break;
    }
  }
  if (!start) {
    const st = await statOf(file);
    start = st?.birthtimeMs || st?.mtimeMs || 0;
  }
  startCache.set(file, start);
  return start;
}

/**
 * Sessions remplacées (ancienne -> nouvelle) : après un /clear, l'ancien fichier se tait et un nouveau commence
 * dans le même projet. Deux sessions vraiment parallèles continuent d'écrire toutes les deux et ne sont pas concernées.
 */
async function replacements(files: string[]): Promise<Map<string, string>> {
  const starts = new Map<string, number>();
  const ends = new Map<string, number>();
  for (const f of files) {
    starts.set(f, await startOf(f));
    ends.set(f, await mtimeOf(f));
  }
  const out = new Map<string, string>();
  for (const a of files) {
    const end = ends.get(a)!;
    let next: string | undefined;
    let nextStart = Infinity;
    for (const b of files) {
      if (b === a || path.dirname(b) !== path.dirname(a)) continue;
      const s = starts.get(b)!;
      if (s > starts.get(a)! && end <= s + REPLACE_SLACK_MS && s < nextStart) {
        next = b;
        nextStart = s;
      }
    }
    if (next) out.set(a, next);
  }
  return out;
}

async function readDir(dir: string): Promise<fs.Dirent[]> {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Lit la fin d'un fichier (les premières lignes partielles sont ignorées). */
async function readTailLines(file: string, bytes: number): Promise<string[]> {
  try {
    const size = await sizeOf(file);
    const start = Math.max(0, size - bytes);
    const buf = await readRange(file, start, size - start);
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

export async function titleOf(file: string): Promise<string> {
  const lines = await readTailLines(file, 256 * 1024);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"ai-title"')) continue;
    const o = safeJson(lines[i]);
    if (o?.type === 'ai-title' && o.aiTitle) return String(o.aiTitle);
  }
  return '';
}

/** Une session Claude suivie : son fil principal et ses sous-agents. */
class TrackedSession {
  readonly info: SessionInfo;
  private mainTail!: LineTail;
  private agents = new Map<string, TrackedAgent>();
  private pendingMeta = new Map<string, number>();
  todos: Todo[] = [];
  todosAt = 0;
  lastActivities = new Map<string, WorldEvent>();
  lastActivityTime = 0;

  private constructor(file: string, private readonly emit: (ev: WorldEvent) => void, mainId?: string) {
    const id = path.basename(file, '.jsonl');
    this.info = { id, mainId: mainId ?? 'main:' + id.slice(0, 8), file, title: '', project: path.basename(path.dirname(file)) };
  }

  /** `mainId` : celui de la session remplacée (après un /clear), pour garder le même personnage. */
  static async open(file: string, emit: (ev: WorldEvent) => void, mainId?: string): Promise<TrackedSession> {
    const s = new TrackedSession(file, emit, mainId);
    await s.bootstrap();
    return s;
  }

  /** Relit la fin du transcript (titre, projet, tâches, dernière activité), puis suit ce qui s'y ajoute. */
  private async bootstrap(): Promise<void> {
    const file = this.info.file;
    this.lastActivityTime = await mtimeOf(file);
    let title = '';
    let project = this.info.project;
    for (const line of await readTailLines(file, BOOTSTRAP_BYTES)) {
      const o = safeJson(line);
      if (!o) continue;
      if (o.type === 'ai-title' && o.aiTitle) title = String(o.aiTitle);
      if (typeof o.cwd === 'string') project = path.basename(o.cwd);
      if (o.isSidechain) continue;
      for (const ev of parseEntry(o, this.info.mainId, true)) {
        if (ev.type === 'todos') this.setTodos(ev.todos, this.lastActivityTime);
        if (ev.type === 'activity') this.lastActivities.set(this.info.mainId, ev);
        if (ev.type === 'turnEnd' || ev.type === 'interrupt') this.lastActivities.delete(this.info.mainId);
      }
    }
    this.info.title = title;
    this.info.project = project;
    this.mainTail = new LineTail(file, await sizeOf(file));
    await this.scanSubagents(true);
  }

  /** Dernière activité de la session (fil principal ou sous-agents). */
  async activity(): Promise<number> {
    let t = await mtimeOf(this.info.file);
    for (const a of this.agents.values()) if (a.active) t = Math.max(t, await mtimeOf(a.tail.file));
    return t;
  }

  activeAgents(): AgentInfo[] {
    return [...this.agents.values()].filter((a) => a.active).map((a) => a.info);
  }

  async tick(ticks: number): Promise<void> {
    await this.readMain();
    if (ticks % 2 === 0) await this.scanSubagents(false);
    await this.readAgents();
    if (ticks % 3 === 0) await this.checkAgentsFinished();
  }

  private setTodos(todos: Todo[], at: number): void {
    this.todos = todos;
    this.todosAt = at;
  }

  private subagentDir(): string {
    return path.join(this.info.file.replace(/\.jsonl$/, ''), 'subagents');
  }

  private async scanSubagents(initial: boolean): Promise<void> {
    const dir = this.subagentDir();
    for (const f of await readDir(dir)) {
      const m = /^agent-(.+)\.jsonl$/.exec(f.name);
      if (!m || this.agents.has(m[1])) continue;
      const file = path.join(dir, f.name);
      const metaFile = path.join(dir, `agent-${m[1]}.meta.json`);
      const meta = safeJson(await readSafe(metaFile));
      const recent = Date.now() - (await mtimeOf(file)) < STALE_AGENT_MS;

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
        ownerId: this.info.mainId,
      };
      const start = initial ? await sizeOf(file) : 0;
      this.agents.set(m[1], { info, tail: new LineTail(file, start), metaFile, active: true });
      if (!initial) this.emit({ type: 'spawn', agent: info });
    }
  }

  private async readMain(): Promise<void> {
    for (const line of await this.mainTail.read()) {
      const o = safeJson(line);
      if (!o) continue;
      if (o.type === 'ai-title' && o.aiTitle && this.info.title !== o.aiTitle) {
        this.info.title = String(o.aiTitle);
        this.emit({ type: 'title', mainId: this.info.mainId, title: this.info.title });
      }
      if (o.isSidechain) continue;
      await this.handle(parseEntry(o, this.info.mainId, true));
    }
  }

  private async readAgents(): Promise<void> {
    for (const a of this.agents.values()) {
      if (!a.active) continue;
      for (const line of await a.tail.read()) {
        const o = safeJson(line);
        if (o) await this.handle(parseEntry(o, a.info.id, false));
      }
    }
  }

  private async checkAgentsFinished(): Promise<void> {
    for (const a of this.agents.values()) {
      if (!a.active) continue;
      const meta = safeJson(await readSafe(a.metaFile));
      const stale = Date.now() - (await mtimeOf(a.tail.file)) > STALE_AGENT_MS;
      if (meta?.finished || stale) await this.despawn(a.info.id);
    }
  }

  private async despawn(id: string): Promise<void> {
    const a = this.agents.get(id);
    if (!a || !a.active) return;
    for (const line of await a.tail.read()) {
      const o = safeJson(line);
      if (o) await this.handle(parseEntry(o, id, false));
    }
    a.active = false;
    this.lastActivities.delete(id);
    this.emit({ type: 'despawn', id });
  }

  private async handle(events: WorldEvent[]): Promise<void> {
    for (const ev of events) {
      if (ev.type === 'agentResult') {
        await this.despawn(ev.id);
        continue;
      }
      if (ev.type === 'todos') this.setTodos(ev.todos, Date.now());
      if (ev.type === 'activity') this.lastActivities.set(ev.agentId, ev);
      if (ev.type === 'turnEnd' || ev.type === 'interrupt') this.lastActivities.delete(ev.agentId);
      if ('agentId' in ev && ev.agentId !== this.info.mainId && !this.agents.get(ev.agentId)?.active) continue;
      this.lastActivityTime = Date.now();
      this.emit(ev);
    }
  }
}

export class SessionWatcher extends EventEmitter {
  private timer: NodeJS.Timeout | undefined;
  private ticks = 0;
  private pinned: string | undefined;
  private sessions = new Map<string, TrackedSession>();
  private live = false;
  // Les tours s'enchaînent l'un après l'autre, jamais en même temps ; `busy` : un tour est en attente ou en cours.
  private chain: Promise<void> = Promise.resolve();
  private busy = false;

  constructor(private opts: WatcherOptions) {
    super();
  }

  /** Ajoute une tâche à la suite des précédentes. */
  private enqueue(task: () => Promise<void>): Promise<void> {
    this.chain = this.chain.then(task).catch((err) => console.error('[IA World]', err));
    return this.chain;
  }

  configure(opts: WatcherOptions): void {
    this.opts = opts;
    this.ticks = 0;
  }

  start(): void {
    if (this.timer) return;
    void this.scheduleTick();
    this.timer = setInterval(() => void this.scheduleTick(), TICK_MS);
  }

  /** Lance un tour, sauf si le précédent n'est pas fini (disque lent) : on saute plutôt que d'empiler. */
  private scheduleTick(): Promise<void> {
    if (this.busy) return this.chain;
    this.busy = true;
    return this.enqueue(async () => {
      try {
        await this.tick();
      } finally {
        this.busy = false;
      }
    });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Force le suivi d'une seule session (undefined = toutes les sessions actives). */
  pin(file: string | undefined): Promise<void> {
    return this.enqueue(async () => {
      this.pinned = file;
      this.sessions.clear();
      this.ticks = 0;
      await this.discover(true);
    });
  }

  get isLive(): boolean {
    return this.live;
  }

  get sessionCount(): number {
    return this.sessions.size;
  }

  get activeAgentCount(): number {
    let n = 0;
    for (const s of this.sessions.values()) n += s.activeAgents().length;
    return n;
  }

  snapshot(): Snapshot {
    const sessions = [...this.sessions.values()].sort((a, b) => b.lastActivityTime - a.lastActivityTime);
    const todoSource = [...sessions].sort((a, b) => b.todosAt - a.todosAt)[0];
    return {
      session: sessions[0]?.info ?? null,
      sessions: sessions.map((s) => s.info),
      agents: sessions.flatMap((s) => s.activeAgents()),
      todos: todoSource?.todos ?? [],
      live: this.live,
      lastActivities: sessions.flatMap((s) => [...s.lastActivities.values()]),
    };
  }

  async listSessions(limit = 30): Promise<SessionListing[]> {
    const out: SessionListing[] = (await this.sessionFiles(true)).map((s) => ({ ...s, title: '', project: path.basename(path.dirname(s.file)) }));
    out.sort((a, b) => b.mtime - a.mtime);
    const top = out.slice(0, limit);
    for (const s of top) s.title = await titleOf(s.file);
    return top;
  }

  // ---------------------------------------------------------------- interne

  private async candidateDirs(all = false): Promise<string[]> {
    const dirs = (await readDir(this.opts.projectsDir))
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

  private async sessionFiles(all = false): Promise<{ file: string; mtime: number }[]> {
    const out: { file: string; mtime: number }[] = [];
    for (const dir of await this.candidateDirs(all)) {
      for (const f of await readDir(dir)) {
        if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
        const file = path.join(dir, f.name);
        out.push({ file, mtime: await mtimeOf(file) });
      }
    }
    return out;
  }

  private async tick(): Promise<void> {
    try {
      if (this.ticks % (this.live ? DISCOVER_EVERY : IDLE_DISCOVER_EVERY) === 0) await this.discover(false);
      for (const s of this.sessions.values()) await s.tick(this.ticks);
      this.updateLive();
    } catch (err) {
      console.error('[IA World]', err);
    }
    this.ticks++;
  }

  /** Ouvre les sessions actives et ferme celles qui sont inactives depuis longtemps. */
  private async discover(forceSnapshot: boolean): Promise<void> {
    const initial = forceSnapshot || this.ticks === 0;
    let wanted: string[];
    let replaced = new Map<string, string>();
    if (this.pinned) {
      wanted = [this.pinned];
    } else {
      const files = (await this.sessionFiles()).sort((a, b) => b.mtime - a.mtime);
      const now = Date.now();
      wanted = files.filter((f) => now - f.mtime < ACTIVE_SESSION_MS).map((f) => f.file);
      // Toujours au moins une session (la plus récente), même ancienne, pour peupler le monde.
      if (!wanted.length && files.length) wanted = [files[0].file];
      // Les sessions déjà suivies restent tant qu'elles ont des agents actifs récents.
      for (const [file, s] of this.sessions) {
        if (!wanted.includes(file) && now - (await s.activity()) < ACTIVE_SESSION_MS) wanted.push(file);
      }
      replaced = await replacements(wanted);
      wanted = wanted.filter((f) => !replaced.has(f));
    }

    let changed = false;
    // Session qui succède à une session suivie (/clear) -> mainId à reprendre
    const inherit = new Map<string, string>();
    for (const [file, s] of this.sessions) {
      if (wanted.includes(file)) continue;
      this.sessions.delete(file);
      changed = true;
      let next = replaced.get(file);
      while (next && !wanted.includes(next)) next = replaced.get(next);
      if (next && !this.sessions.has(next)) {
        // Le personnage reste : seuls les sous-agents de l'ancienne session s'en vont.
        inherit.set(next, s.info.mainId);
        if (!initial) for (const a of s.activeAgents()) this.emitEvent({ type: 'despawn', id: a.id });
      } else if (!initial) this.emitEvent({ type: 'sessionEnd', mainId: s.info.mainId });
    }
    for (const file of wanted) {
      if (this.sessions.has(file)) continue;
      const s = await TrackedSession.open(file, (ev) => this.emitEvent(ev), inherit.get(file));
      this.sessions.set(file, s);
      changed = true;
      if (!initial) this.emitEvent({ type: 'sessionStart', session: s.info });
    }
    if (initial && (changed || forceSnapshot)) {
      this.live = this.computeLive();
      this.emit('session', this.snapshot());
    }
  }

  private computeLive(): boolean {
    const now = Date.now();
    for (const s of this.sessions.values()) if (now - s.lastActivityTime < LIVE_WINDOW_MS) return true;
    return false;
  }

  private updateLive(): void {
    const live = this.computeLive();
    if (live !== this.live) {
      this.live = live;
      this.emitEvent({ type: 'status', live });
    }
  }

  private emitEvent(ev: WorldEvent): void {
    this.emit('event', ev);
  }
}
