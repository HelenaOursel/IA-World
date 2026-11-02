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
    // Flotte à hauteur de la parabole, bras levés, et règle l'antenne à petits gestes
    adjustAntenna: {
      pose(p, t) {
        p.lift = 0.7 + Math.sin(t * 2) * 0.04;
        p.sRx = -2.6 + Math.sin(t * 9) * 0.15;
        p.sRz = 0.2 + Math.cos(t * 9) * 0.1;
        p.eR = -0.5;
        p.sLx = -2.4;
        p.sLz = -0.25;
        p.eL = -0.3;
        p.tiltX = -0.25;
      },
      face(f) {
        f.expr = 'focus';
        f.eyeY = -0.8;
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
      label: "Réglage de l'antenne",
      start(ch, tools, s) {
        // Rejoint l'antenne du milieu par le côté (un quart de tour depuis sa place), face à elle :
        // on le voit mieux qu'en arrivant par derrière, et il ne traverse pas le mât.
        const a = Math.atan2(ch.root.position.x, ch.root.position.z) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
        const spot = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.95);
        tools.walk(ch, spot, 'adjustAntenna', Math.atan2(-spot.x, -spot.z));
        s.satellite = tools.stations.dock.group.userData.satellite;
        s.spark = 0;
      },
      update(ch, dt, time, tools, s) {
        if (ch.moving) return time > 15;
        s.at ??= time;
        const k = time - s.at;
        if (!s.started) {
          s.started = true;
          s.satellite?.adjust(3);
          tools.say(ch, "Petit réglage de l'antenne…", 2.5);
        }
        // Étincelles sur la parabole pendant le réglage
        s.spark -= dt;
        if (s.satellite && k < 3 && s.spark <= 0) {
          s.spark = 0.3;
          tools.effects.burst(s.satellite.head.getWorldPosition(new THREE.Vector3()), { count: 4, colors: ['#ffd54f', '#4cc9f0', '#ffffff'], speed: 0.8, up: 0.8, life: 0.5, gravity: -2, size: 0.03 });
        }
        if (k > 3.2 && !s.done) {
          s.done = true;
          ch.react('wave', 1.2);
          tools.say(ch, 'Signal parfait !', 2);
        }
        return k > 4.4;
      },
    },
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
