// Bêtises au tableau : un personnage qui s'ennuie à la borne va parfois gribouiller sur le tableau
// de planification. Les dessins vieillissent puis s'effacent ; le vrai plan, lui, les efface aussitôt.
import * as THREE from '../vendor/three.module.min.js';
import { eraseDoodle, makeDoodle } from './doodles.js';
import { pickLine } from './hud.js';

const DOODLE_START_LINES = ['Hihi…', 'Chut !', 'Personne regarde ?', 'Juste un petit dessin…', 'Le tableau est libre !'];
const DOODLE_DONE_LINES = ['Joli, non ?', 'Chef-d’oeuvre !', 'Trop mignon !', 'Je signe ?', 'Bip boup, fini !'];
const BOARD_W = 2.75; // largeur de l'écran du tableau (m), pour 640 px de canvas
const MAX_DOODLERS = 2;

/** `goToSleep(ch)` : renvoie le personnage se reposer quand il a fini. */
export function createBoard({ chars, stations, hud, theme, goToSleep }) {
  const plan = stations.plan;
  let redrawTimer = 0;

  function canDoodle() {
    const doodlers = [...chars.values()].filter((c) => c.doodle).length;
    return !plan.busy && doodlers < MAX_DOODLERS;
  }

  function startDoodle(ch) {
    // Une place devant le tableau, loin des autres dessinateurs et des dessins encore visibles.
    const taken = [
      ...[...chars.values()].filter((c) => c.doodle).map((c) => c.doodle.x),
      ...plan.doodles.map((d) => (d.cx / 640 - 0.5) * BOARD_W),
    ];
    let x = 0, best = -1;
    for (let i = 0; i < 8; i++) {
      const cand = (Math.random() * 2 - 1) * 1.0;
      const dist = Math.min(9, ...taken.map((v) => Math.abs(v - cand)));
      if (dist > best) {
        best = dist;
        x = cand;
      }
    }
    if (ch.stationKey) stations[ch.stationKey].release(ch.id);
    ch.stationKey = null;
    ch.wandering = false;
    ch.doodle = { x, d: null, done: 0 };
    ch.goTo({ pos: plan.group.localToWorld(new THREE.Vector3(x, 0, 0.5)), face: plan.group.rotation.y + Math.PI }, 'idle');
    hud.setActivityText(ch.id, '~ Dessine au tableau');
  }

  /** Abandonne le dessin en cours (il reste inachevé au tableau). */
  function stopDoodle(ch) {
    if (ch.doodle?.d) ch.doodle.d.drawing = false;
    ch.doodle = null;
  }

  function updateDoodler(ch, dt) {
    const job = ch.doodle;
    // Du vrai travail arrive : il file, son dessin reste inachevé.
    if (!ch.idle || ch.leaving) {
      stopDoodle(ch);
      ch.react('surprise', 0.7);
      return;
    }
    if (ch.moving) return;

    if (!job.d) {
      const alive = plan.doodles.filter((d) => d.life - d.age > d.fade);
      if (alive.length > 5) eraseDoodle(alive[0], 1.5);
      job.d = makeDoodle((job.x / BOARD_W + 0.5) * 640, 255 + Math.random() * 60, 80 + Math.random() * 25, ch.color, theme.doodles);
      plan.doodles.push(job.d);
      ch.setAction('doodle');
      if (Math.random() < 0.5) hud.say(ch.id, pickLine(theme.doodles?.startLines ?? DOODLE_START_LINES), 'speech', '', 2.5, false);
      return;
    }

    const d = job.d;
    if (d.drawing) {
      d.progress = Math.min(1, d.progress + dt / d.duration);
      plan.doodleDirty = true;
      if (d.progress >= 1) {
        d.drawing = false;
        ch.setAction('idle');
        ch.react('jump', 1);
        if (Math.random() < 0.6) hud.say(ch.id, pickLine(theme.doodles?.doneLines ?? DOODLE_DONE_LINES), 'speech', '', 2.5, false);
      }
      return;
    }
    // Dessin effacé avant d'être fini : la maîtresse est passée.
    if (ch.action === 'doodle') {
      ch.setAction('idle');
      ch.react('surprise', 0.7);
    }
    job.done += dt;
    if (job.done > 2) {
      ch.doodle = null;
      goToSleep(ch);
    }
  }

  /** Les gribouillis vieillissent puis s'effacent, et l'écran suit. */
  function update(dt) {
    if (!plan.doodles.length) return;
    redrawTimer += dt;
    for (const d of plan.doodles) {
      d.age += dt;
      if (d.life - d.age < d.fade) plan.doodleDirty = true;
    }
    plan.doodles = plan.doodles.filter((d) => d.age < d.life);
    if (plan.doodleDirty && redrawTimer > 0.06) {
      redrawTimer = 0;
      plan.doodleDirty = false;
      plan.screen.redraw();
    }
  }

  /** Le vrai plan revient au tableau : les gribouillis sont effacés. */
  function eraseAll() {
    for (const d of plan.doodles) eraseDoodle(d);
  }

  return { canDoodle, startDoodle, stopDoodle, updateDoodler, update, eraseAll };
}
