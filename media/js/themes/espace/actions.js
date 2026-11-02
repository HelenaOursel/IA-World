// Activités des astronautes inactifs : apesanteur avec salto et sauts lunaires.
// Contrat des actions de thème : voir themes/index.js.
import * as THREE from '../../../vendor/three.module.min.js';

const FLOAT_TIME = 5;
const TURN = Math.PI * 2;

export const actions = {
  poses: {
    // S'élève, fait un salto au ralenti, redescend
    float: {
      pose(p, t, ch) {
        const k = Math.min(1, (ch.themeAct?.t ?? 0) / FLOAT_TIME);
        p.lift = Math.sin(k * Math.PI) * 1.3;
        p.tiltX = Math.min(1, Math.max(0, (k - 0.2) / 0.6)) * TURN;
        p.sLz = -1.1;
        p.sRz = 1.1;
        p.sLx = p.sRx = -0.3;
        p.eL = p.eR = -0.2;
      },
      face(f) {
        f.expr = 'happy';
      },
    },
    // Grands bonds lents, bras en l'air
    moonHop: {
      pose(p, t) {
        const h = Math.abs(Math.sin(t * 2.4));
        p.lift = h * 0.55;
        p.sLx = p.sRx = -2.4 + h * 0.3;
        p.sLz = -0.3;
        p.sRz = 0.3;
        p.tiltX = -0.1;
      },
      face(f) {
        f.expr = 'happy';
      },
    },
  },

  idle: [
    {
      label: 'Apesanteur',
      start(ch, tools, s) {
        ch.setAction('float');
        tools.say(ch, 'Apesanteur !', 2);
        s.spark = 0;
      },
      update(ch, dt, time, tools, s) {
        s.spark -= dt;
        if (s.spark <= 0 && time < FLOAT_TIME) {
          s.spark = 0.25;
          tools.effects.burst(ch.root.localToWorld(new THREE.Vector3(0, ch.bodyY + ch.pose.lift, 0)), { count: 2, colors: ['#ffd54f', '#ffffff', '#b388ff'], speed: 0.5, up: 0.3, life: 0.8, gravity: 0, size: 0.03 });
        }
        return time > FLOAT_TIME + 0.4;
      },
      stop(ch) {
        // Le salto fait un tour complet : on le ramène à zéro sans le voir tourner à l'envers.
        ch.pose.tiltX %= TURN;
      },
    },
    {
      label: 'Sauts lunaires',
      start(ch, tools) {
        ch.speed = 1.3;
        ch.moveAction = 'moonHop';
        tools.walk(ch, tools.randomSpot(3, 5));
        tools.say(ch, 'Un petit pas pour un robot…', 2.5);
      },
      update(ch, dt, time, tools, s) {
        if (ch.moving) return time > 15;
        ch.moveAction = null;
        ch.speed = ch.baseSpeed;
        s.arrivedAt ??= time;
        return time - s.arrivedAt > 1;
      },
    },
  ],
};
