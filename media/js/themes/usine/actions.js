// Activités des robots inactifs : danse robotique et autodiagnostic.
// Contrat des actions de thème : voir themes/index.js.
import * as THREE from '../../../vendor/three.module.min.js';

export const actions = {
  poses: {
    // Pas saccadés sur quatre temps, bras en alternance
    robotDance: {
      pose(p, t) {
        const beat = Math.floor(t * 4) % 4;
        const up = beat % 2 === 0;
        p.sLx = up ? -2.7 : -0.4;
        p.sRx = up ? -0.4 : -2.7;
        p.sLz = -0.5;
        p.sRz = 0.5;
        p.eL = p.eR = -0.6;
        p.yaw = [-0.5, 0, 0.5, 0][beat];
        p.tiltZ = [0.1, 0, -0.1, 0][beat];
        p.bob = up ? 0.05 : 0;
      },
      face(f) {
        f.expr = 'happy';
      },
    },
    // Bras écartés pendant que les anneaux de scan montent le long du corps
    selfScan: {
      pose(p) {
        p.sLz = -1.2;
        p.sRz = 1.2;
        p.sLx = p.sRx = 0;
        p.eL = p.eR = 0;
      },
      face(f) {
        f.expr = 'focus';
        f.eyeY = 0.4;
      },
    },
  },

  idle: [
    {
      label: 'Danse robotique',
      start(ch, tools) {
        ch.setAction('robotDance');
        tools.say(ch, 'Mode danse activé !');
      },
      update(ch, dt, time) {
        return time > 4.5;
      },
    },
    {
      label: 'Autodiagnostic',
      start(ch, tools, s) {
        ch.setAction('selfScan');
        Object.assign(s, { next: 0, ring: 0, heading: ch.root.rotation.y });
      },
      update(ch, dt, time, tools, s) {
        // Tourne sur lui-même pendant le scan
        ch.face = s.heading + time * 2.2;
        if (time > s.next && s.ring < 6) {
          s.next = time + 0.35;
          tools.effects.ring(ch.root.localToWorld(new THREE.Vector3(0, 0.15 + s.ring * 0.17, 0)), { color: ch.color, from: 0.5, to: 0.62, life: 0.8 });
          s.ring++;
        }
        if (time > 3.2 && !s.said) {
          s.said = true;
          tools.say(ch, 'Autodiagnostic : tout va bien !');
        }
        return time > 4.2;
      },
    },
  ],
};
