// Activités des slimes inactifs : rebonds et division en mini-slime.
// Contrat des actions de thème : voir themes/index.js.
import * as THREE from '../../../vendor/three.module.min.js';

const UP = new THREE.Vector3(0, 1, 0);

/** Petit slime (avec deux yeux) qui se détache du grand ; ses ressources sont libérées à la fin. */
function miniSlime(ch) {
  const g = new THREE.Group();
  const r = ch.size * 0.24;
  const jelly = new THREE.MeshPhysicalMaterial({ color: ch.color, emissive: ch.color, emissiveIntensity: 0.2, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), jelly);
  body.scale.set(1.1, 0.8, 1.05);
  g.add(body);
  const eye = new THREE.MeshBasicMaterial({ color: '#1a1030' });
  for (const x of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), eye);
    e.position.set(x * r * 0.35, r * 0.15, r * 0.82);
    g.add(e);
  }
  return g;
}

export const actions = {
  poses: {
    // Rebondit comme une balle, de moins en moins haut
    bounce: {
      pose(p, t, ch) {
        const k = ch.themeAct?.t ?? 0;
        p.lift = Math.abs(Math.sin(k * 4.5)) * 0.75 * Math.max(0, 1 - k / 4);
        p.tiltZ = Math.sin(k * 4.5) * 0.1;
        p.sLz = -0.6;
        p.sRz = 0.6;
      },
      face(f) {
        f.expr = 'happy';
      },
    },
    // Tassé pendant que le mini-slime se balade
    split: {
      pose(p) {
        p.bob = -0.04;
        p.sLz = -0.5;
        p.sRz = 0.5;
      },
      face(f, t) {
        f.expr = 'surprise';
        f.eyeX = Math.sin(t * 1.6);
      },
    },
  },

  idle: [
    {
      label: 'Rebonds',
      start(ch, tools) {
        ch.setAction('bounce');
        tools.say(ch, 'Boing boing !', 2);
      },
      update(ch, dt, time) {
        return time > 4.2;
      },
    },
    {
      label: 'Division',
      start(ch, tools, s) {
        ch.setAction('split');
        s.mini = miniSlime(ch);
        tools.scene.add(s.mini);
        s.home = ch.root.position.clone();
        const a = Math.random() * Math.PI * 2;
        s.dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        tools.say(ch, 'Blop ! Je me divise !', 2.5);
      },
      update(ch, dt, time, tools, s) {
        // 0 à 0,6 s : saute hors du slime ; jusqu'à 3,6 s : sautille autour ; puis revient fusionner
        const out = time < 0.6 ? time / 0.6 : time < 3.6 ? 1 : Math.max(0, 1 - (time - 3.6) / 0.6);
        const turn = time < 0.6 ? 0 : (Math.min(time, 3.6) - 0.6) * 1.6;
        const d = s.dir.clone().applyAxisAngle(UP, turn).multiplyScalar(out * 0.9);
        s.mini.position.set(s.home.x + d.x, 0.1 + Math.abs(Math.sin(time * 6)) * 0.25, s.home.z + d.z);
        s.mini.rotation.y = Math.atan2(d.x, d.z);
        if (time > 3.6) s.mini.scale.setScalar(Math.max(0.01, 1 - (time - 3.6) / 0.6));
        if (time > 4.2 && !s.merged) {
          s.merged = true;
          ch.react('jump', 1);
          tools.effects.burst(ch.topPosition(ch.root.position.clone()), { count: 16, colors: [ch.color, '#ffffff'], speed: 1, up: 1.2, life: 0.7, gravity: -2, size: 0.04 });
          tools.say(ch, 'Et hop, on refusionne !', 2);
        }
        return time > 5;
      },
      stop(ch, tools, s) {
        tools.scene.remove(s.mini);
        s.mini.traverse((o) => {
          if (!o.isMesh) return;
          o.geometry.dispose();
          o.material.dispose();
        });
      },
    },
  ],
};
