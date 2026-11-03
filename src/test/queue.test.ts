// Rythme et plafond des files d'attente des personnages (media/js/queue.js, module du monde 3D sans dépendance).
import * as assert from 'assert/strict';
import * as path from 'path';
import { before, describe, it } from 'node:test';

type Ev = { type: string; kind?: string; n?: number };
let queue: { QUEUE_MAX: number; pushCapped(items: Ev[], ev: Ev, max?: number): void; minDuration(ev: Ev, backlog: number): number };

before(async () => {
  // Chemin calculé : TypeScript ne cherche pas de types pour ce module JavaScript du navigateur
  const file = path.join(__dirname, '..', '..', 'media', 'js', 'queue.js');
  queue = await import(file);
});

describe('pushCapped', () => {
  it('garde les événements les plus récents au-delà du plafond', () => {
    const items: Ev[] = [];
    for (let n = 0; n < 10; n++) queue.pushCapped(items, { type: 'activity', n }, 4);
    assert.deepEqual(
      items.map((e) => e.n),
      [6, 7, 8, 9],
    );
  });

  it('ne perd jamais le départ d’un agent', () => {
    const items: Ev[] = [{ type: 'despawn' }];
    for (let n = 0; n < 10; n++) queue.pushCapped(items, { type: 'activity', n }, 3);
    assert.equal(items[0].type, 'despawn');
    assert.equal(items.length, 3);
  });

  it('a un plafond par défaut raisonnable', () => {
    assert.ok(queue.QUEUE_MAX >= 10 && queue.QUEUE_MAX <= 100);
  });
});

describe('minDuration', () => {
  it('laisse le temps de lire un prompt ou une réponse, moins une réflexion', () => {
    assert.ok(queue.minDuration({ type: 'prompt' }, 0) > queue.minDuration({ type: 'activity', kind: 'talk' }, 0));
    assert.ok(queue.minDuration({ type: 'activity', kind: 'talk' }, 0) > queue.minDuration({ type: 'activity', kind: 'think' }, 0));
  });

  it('accélère quand le retard s’accumule', () => {
    const ev = { type: 'prompt' };
    assert.ok(queue.minDuration(ev, 0) > queue.minDuration(ev, 4));
    assert.ok(queue.minDuration(ev, 4) > queue.minDuration(ev, 10));
  });
});
