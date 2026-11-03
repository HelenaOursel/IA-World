// Activités des pandas inactifs : une banane grillée au feu de camp, au bout d'un bâton,
// et la méditation du panda roux au bord de la rivière, en lévitation, entouré de gouttes d'eau.
// Contrat des actions de thème : voir themes/index.js. Les poses 'roast' et 'eat' sont dans panda.js.
import * as THREE from '../../../vendor/three.module.min.js';
import { riverZ } from './river.js';

const START_LINES = ['Pause goûter !', 'Une petite banane ?', 'Miam, le feu est bien chaud !'];
const DONE_LINES = ['Grillée à point !', 'Trop bon <3', 'Toute caramélisée !', 'Encore une ?'];
const ROAST_TIME = 7; // secondes au-dessus du feu
const EAT_TIME = 2.4;

const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];
const bananaPos = new THREE.Vector3();

// ------------------------------------------------------------------ méditation

const MEDITATE_TIME = 12;
const DROPS = 9;

/** Gouttes d'eau translucides qui tourneront autour du panda. */
function waterDrops(scene) {
  const material = new THREE.MeshPhysicalMaterial({ color: '#9fe3ff', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.85, emissive: '#2b8fbf', emissiveIntensity: 0.35 });
  const geometry = new THREE.SphereGeometry(0.035, 14, 10);
  // Pointe de la goutte vers le haut
  geometry.translate(0, 0.01, 0);
  const drops = Array.from({ length: DROPS }, (_, i) => {
    const d = new THREE.Mesh(geometry, material);
    d.scale.set(0.01, 0.01, 0.01);
    d.userData = { a: (i / DROPS) * Math.PI * 2, tilt: (i % 3) * 0.35 - 0.35, r: 0.45 + (i % 2) * 0.12 };
    scene.add(d);
    return d;
  });
  return { drops, geometry, material };
}

export const actions = {
  poses: {
    // Assis en tailleur, pattes avant jointes devant lui, en lévitation (ch.levitate : 0 → 1)
    meditate: {
      pose(p, t, ch) {
        const k = ch.levitate ?? 0;
        p.legL = p.legR = -1.45;
        p.sLx = p.sRx = -0.75;
        p.sLz = 0.45;
        p.sRz = -0.45;
        p.eL = p.eR = -0.9;
        p.bob = -ch.size * 0.12;
        p.hPitch = 0.08;
        p.lift = k * (0.32 + Math.sin(t * 1.4) * 0.04);
        p.tiltZ = Math.sin(t * 0.7) * 0.02 * k;
      },
      face(f) {
        // Yeux fermés, sourire paisible
        f.expr = 'happy';
      },
    },
  },
  idle: [
    {
      label: 'Fait griller une banane',
      start(ch, tools, s) {
        // Un des bâtons posés au bord du feu (voir campfire.js), s'il en reste un de libre
        s.stick = tools.stations.dock.sticks?.find((k) => !k.user);
        if (!s.stick) return;
        s.stick.user = ch.id;
        s.step = 'fetch';
        s.sparkAt = 0;
        ch.goTo(s.stick.fetchSpot, 'idle');
      },
      update(ch, dt, time, tools, s) {
        const { stick } = s;
        // Tous les bâtons sont pris : il ira faire autre chose
        if (!stick) return true;
        if (ch.moving) return false;
        s.t = (s.t ?? 0) + dt;
        if (s.step === 'fetch') {
          // Ramasse le bâton, y enfile une banane, puis va s'installer au bord du feu
          stick.take(ch.armR.elbow);
          ch.react('catch', 0.6);
          if (Math.random() < 0.5) tools.say(ch, pick(START_LINES));
          ch.goTo(stick.roastSpot, 'roast');
          s.step = 'roast';
          s.t = 0;
        } else if (s.step === 'roast') {
          stick.roast(Math.min(1, s.t / ROAST_TIME));
          // De temps en temps, une étincelle saute de la banane
          if (s.t > s.sparkAt) {
            s.sparkAt = s.t + 0.6 + Math.random() * 1.2;
            tools.effects.burst(stick.bananaPosition(bananaPos).clone(), { count: 4, colors: ['#ffb347', '#ffd23f'], speed: 0.4, up: 0.8, life: 0.5, gravity: -1, size: 0.015, glow: 2 });
          }
          if (s.t >= ROAST_TIME) {
            ch.setAction('eat');
            s.step = 'eat';
            s.t = 0;
          }
        } else if (s.step === 'eat') {
          // Ramène la banane contre sa bouche, puis la croque en quelques bouchées
          stick.slide(Math.min(1, s.t / 0.4));
          stick.eat(Math.max(0, (s.t - 0.4) / (EAT_TIME - 0.4)));
          if (s.t >= EAT_TIME) {
            ch.react('love', 1.6);
            tools.effects.heart(ch.topPosition(new THREE.Vector3()), 3);
            if (Math.random() < 0.7) tools.say(ch, pick(DONE_LINES));
            return true;
          }
        }
        return false;
      },
      // Fini, interrompu par du vrai travail, ou panda qui s'en va : le bâton retourne au bord du feu.
      stop(ch, tools, s) {
        s.stick?.putBack();
      },
    },
    {
      label: 'Médite au bord de la rivière',
      // Seul le panda roux (Claude) médite
      can: (ch) => ch.isMain,
      start(ch, tools, s) {
        // Sur la berge côté plateau, face à l'eau, à l'écart des roseaux et des rochers
        const x = [-1.9, -0.1, 1.5][Math.floor(Math.random() * 3)];
        tools.walk(ch, new THREE.Vector3(x, 0, riverZ(x) - 1.15), 'meditate', 0);
        ch.levitate = 0;
      },
      update(ch, dt, time, tools, s) {
        if (ch.moving) return time > 25;
        s.t = (s.t ?? 0) + dt;
        if (!s.drops) {
          Object.assign(s, waterDrops(tools.scene));
          if (Math.random() < 0.5) tools.say(ch, 'Ommm…', 2.5);
        }
        // Monte doucement, flotte, puis redescend à la fin
        const rise = Math.min(1, s.t / 1.6);
        const fall = Math.min(1, Math.max(0, (MEDITATE_TIME - s.t) / 1.2));
        ch.levitate = Math.min(rise, fall);
        // Les gouttes apparaissent une à une et tournent autour de lui sur des orbites inclinées
        const c = ch.root.position;
        s.drops.forEach((d, i) => {
          const u = d.userData;
          const a = u.a + time * (0.9 + (i % 3) * 0.15);
          const grow = Math.min(1, Math.max(0, s.t * 2 - i * 0.25)) * ch.levitate;
          d.position.set(c.x + Math.cos(a) * u.r, c.y + 0.35 + ch.levitate * 0.3 + Math.sin(a) * u.r * u.tilt + Math.sin(time * 2 + i) * 0.03, c.z + Math.sin(a) * u.r);
          d.scale.set(grow, grow * 1.25, grow);
        });
        return s.t >= MEDITATE_TIME;
      },
      stop(ch, tools, s) {
        ch.levitate = 0;
        if (!s.drops) return;
        tools.scene.remove(...s.drops);
        s.geometry.dispose();
        s.material.dispose();
      },
    },
  ],
};
