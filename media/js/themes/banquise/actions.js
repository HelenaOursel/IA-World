// Activités des pingouins inactifs : glissade sur le ventre et pêche dans la rivière.
// Contrat des actions de thème : voir themes/index.js.
import * as THREE from '../../../vendor/three.module.min.js';
import { RIVER_POINTS } from './river.js';

/** Arrêt du déplacement : renvoie le temps écoulé depuis l'arrivée (0 tant qu'il bouge). */
function sinceArrival(ch, time, s) {
  if (ch.moving) return 0;
  s.arrivedAt ??= time;
  return time - s.arrivedAt;
}

export const actions = {
  poses: {
    // Allongé sur le ventre, ailerons collés en arrière
    slide: {
      pose(p, t) {
        p.tiltX = 1.3;
        p.bob = -0.1;
        p.sLx = p.sRx = 0.7;
        p.sLz = -0.2;
        p.sRz = 0.2;
        p.tiltZ = Math.sin(t * 3) * 0.05;
      },
      face(f) {
        f.expr = 'happy';
      },
    },
    // Penché au-dessus de l'eau, à l'affût
    fishing: {
      pose(p, t) {
        p.tiltX = 0.45 + Math.sin(t * 2) * 0.03;
        p.sLx = p.sRx = -0.8;
        p.sLz = -0.3;
        p.sRz = 0.3;
        p.yaw = Math.sin(t * 0.8) * 0.1;
      },
      face(f) {
        f.expr = 'focus';
        f.eyeY = -0.6;
      },
    },
  },

  idle: [
    {
      label: 'Glissade sur le ventre',
      weight: 1.2,
      start(ch, tools, s) {
        ch.speed = 4.2;
        ch.moveAction = 'slide';
        tools.walk(ch, tools.randomSpot(3, 5));
        tools.say(ch, 'Wiiii !', 2);
        s.puff = 0;
      },
      update(ch, dt, time, tools, s) {
        if (ch.moving) {
          // Gerbes de neige derrière lui
          s.puff -= dt;
          if (s.puff <= 0) {
            s.puff = 0.08;
            tools.effects.burst(ch.root.position.clone().setY(0.05), { count: 3, colors: ['#ffffff', '#dceeff'], speed: 0.6, up: 0.6, life: 0.6, gravity: -1.5, size: 0.04, glow: 1 });
          }
          return false;
        }
        ch.moveAction = null;
        ch.speed = ch.baseSpeed;
        return sinceArrival(ch, time, s) > 1.2;
      },
    },
    {
      label: 'Pêche dans la rivière',
      start(ch, tools, s) {
        const [x, z] = RIVER_POINTS[Math.random() < 0.5 ? 1 : 3];
        s.water = new THREE.Vector3(x, 0.05, z);
        // Sur la berge côté centre, tourné vers la rivière
        tools.walk(ch, new THREE.Vector3(x, 0, z - 0.75), 'fishing', 0);
        s.phase = 'go';
      },
      update(ch, dt, time, tools, s) {
        const waited = sinceArrival(ch, time, s);
        if (!waited) return time > 20;
        if (s.phase === 'go') {
          s.phase = 'wait';
          tools.say(ch, 'Chut… ça mord ?', 2.5);
        }
        if (s.phase === 'wait' && waited > 2.5) {
          s.phase = 'catch';
          tools.effects.burst(s.water, { count: 14, colors: ['#9fd8ff', '#ffffff'], speed: 0.8, up: 1.6, life: 0.7, gravity: -3, size: 0.04, glow: 1 });
          tools.giftTo(ch, s.water, () => {
            ch.react('love', 1.6);
            tools.say(ch, 'Un poisson ! Miam <3');
            s.phase = 'done';
          });
        }
        if (s.phase === 'done') {
          s.doneAt ??= time;
          return time - s.doneAt > 1.8;
        }
        return time > 20;
      },
    },
  ],
};
