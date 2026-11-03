// Lecture continue des transcripts et suivi des sessions et des sous-agents.
import * as assert from 'assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { after, describe, it } from 'node:test';
import { WorldEvent } from '../events';
import { encodeProjectDir, LineTail, SessionWatcher } from '../watcher';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iaworld-test-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const line = (o: unknown) => JSON.stringify(o) + '\n';
const toolUse = (name: string, input: unknown) => line({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });

describe('LineTail', () => {
  it('ne rend que les lignes complètes et garde la fin en attente', async () => {
    const file = path.join(tmp, 'partiel.jsonl');
    fs.writeFileSync(file, 'un\ndeu');
    const tail = new LineTail(file, 0);
    assert.deepEqual(await tail.read(), ['un']);
    assert.deepEqual(await tail.read(), []);
    fs.appendFileSync(file, 'x\ntrois\n');
    assert.deepEqual(await tail.read(), ['deux', 'trois']);
  });

  it('ne coupe pas un caractère accentué écrit en deux fois', async () => {
    const file = path.join(tmp, 'utf8.jsonl');
    const bytes = Buffer.from('café\n');
    fs.writeFileSync(file, bytes.subarray(0, 4)); // « caf » et le premier octet de « é »
    const tail = new LineTail(file, 0);
    assert.deepEqual(await tail.read(), []);
    fs.appendFileSync(file, bytes.subarray(4));
    assert.deepEqual(await tail.read(), ['café']);
  });

  it('repart du début si le fichier a été vidé', async () => {
    const file = path.join(tmp, 'vide.jsonl');
    fs.writeFileSync(file, 'ancienne ligne assez longue\n');
    const tail = new LineTail(file, 0);
    await tail.read();
    fs.writeFileSync(file, 'neuve\n');
    assert.deepEqual(await tail.read(), ['neuve']);
  });

  it('rend une liste vide si le fichier n’existe pas', async () => {
    assert.deepEqual(await new LineTail(path.join(tmp, 'absent.jsonl'), 0).read(), []);
  });
});

describe('encodeProjectDir', () => {
  it('encode le dossier comme Claude Code', async () => {
    assert.equal(encodeProjectDir('c:\\Users\\helena\\IAWorld'), 'c--Users-helena-IAWorld');
  });
});

describe('SessionWatcher', () => {
  it('ne lance jamais deux tours en même temps : un tour demandé pendant le précédent est sauté', async () => {
    const watcher = new SessionWatcher({ projectsDir: path.join(tmp, 'aucun'), workspaceDirs: [], followAll: true });
    const w = watcher as unknown as { scheduleTick(): Promise<void>; ticks: number };
    await Promise.all([w.scheduleTick(), w.scheduleTick(), w.scheduleTick()]);
    assert.equal(w.ticks, 1);
    await w.scheduleTick();
    assert.equal(w.ticks, 2);
  });

  it('suit une session, ses outils et l’arrivée d’un sous-agent', async () => {
    const projects = path.join(tmp, 'projects');
    const dir = path.join(projects, 'mon-projet');
    fs.mkdirSync(dir, { recursive: true });
    const session = path.join(dir, '0123456789abcdef.jsonl');
    fs.writeFileSync(session, line({ type: 'ai-title', aiTitle: 'Écrire des tests' }) + 'ligne JSON invalide\n');

    const watcher = new SessionWatcher({ projectsDir: projects, workspaceDirs: [], followAll: true });
    const events: WorldEvent[] = [];
    watcher.on('event', (ev: WorldEvent) => events.push(ev));
    // tick() est privé : on le lance à la main plutôt que d'attendre la minuterie
    const tick = () => (watcher as unknown as { tick(): Promise<void> }).tick();
    await tick();

    const snap = watcher.snapshot();
    assert.equal(snap.session?.title, 'Écrire des tests');
    const mainId = snap.session!.mainId;

    // Ce qui est écrit ensuite arrive comme événements ; la ligne coupée attend d'être complète
    const read = toolUse('Read', { file_path: 'src/app.ts' });
    fs.appendFileSync(session, read.slice(0, 20));
    await tick();
    assert.equal(events.filter((e) => e.type === 'activity').length, 0);
    fs.appendFileSync(session, read.slice(20));
    await tick();
    const activity = events.find((e) => e.type === 'activity');
    assert.ok(activity?.type === 'activity');
    assert.equal(activity.kind, 'read');
    assert.equal(activity.agentId, mainId);

    // Un sous-agent apparaît à la recherche suivante de nouveaux fichiers
    const subagents = path.join(dir, '0123456789abcdef', 'subagents');
    fs.mkdirSync(subagents, { recursive: true });
    fs.writeFileSync(path.join(subagents, 'agent-a1.meta.json'), JSON.stringify({ agentType: 'Explore', description: 'Explorer le code' }));
    fs.writeFileSync(path.join(subagents, 'agent-a1.jsonl'), toolUse('Grep', { pattern: 'TODO' }));
    for (let i = 0; i < 4; i++) await tick();
    const spawn = events.find((e) => e.type === 'spawn');
    assert.ok(spawn?.type === 'spawn');
    assert.equal(spawn.agent.agentType, 'Explore');
    assert.equal(spawn.agent.ownerId, mainId);
    watcher.stop();
  });
});
