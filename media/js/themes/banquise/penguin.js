// Pingouin à bonnet et écharpe, qui se dandine en marchant (thème Banquise).
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

export function buildPenguin(ch) {
  const S = ch.size;
  const R = S * 0.52;
  addGlow(ch, S * 1.3, '#bfe6ff', 0.35);
  // Pattes orange posées au sol
  const orange = mat('#ff9f2e', { roughness: 0.5 });
  ch.feet = [-1, 1].map((sx) => {
    const f = mesh(sphere(0.075, 16, 10), orange, sx * R * 0.38, 0.035, R * 0.35);
    f.scale.set(1, 0.45, 1.5);
    ch.chassis.add(f);
    return f;
  });
  // Corps en forme d'œuf, ventre blanc
  const b = addBody(ch, R * 1.12 + 0.03);
  const egg = mesh(sphere(R, 32, 22), new THREE.MeshPhysicalMaterial({ color: '#1d2535', roughness: 0.45, clearcoat: 0.4 }));
  egg.scale.set(1, 1.12, 0.96);
  b.add(egg);
  const white = mat('#f6f8fc', { roughness: 0.6 });
  const belly = mesh(sphere(R * 0.86, 30, 20), white, 0, -R * 0.12, R * 0.4);
  belly.scale.set(0.92, 1.05, 0.75);
  b.add(belly);
  const mask = mesh(sphere(R * 0.56, 28, 18), white, 0, R * 0.34, R * 0.6);
  mask.scale.set(1.25, 0.78, 0.8);
  b.add(mask);
  addFace(b, ch, S * 0.62, S * 0.39, 0, R * 0.32, R * 1.07, 1);
  // Bec orange qui s'ouvre quand il parle
  ch.beak = mesh(new THREE.ConeGeometry(0.05, 0.11, 16), orange, 0, R * 0.12, R * 1.1);
  ch.beak.rotation.x = Math.PI / 2;
  b.add(ch.beak);
  // Bonnet et écharpe de sa couleur ; le pompon sert d'antenne
  const wool = mat(ch.color, { roughness: 0.85 });
  const hat = mesh(new THREE.SphereGeometry(R * 0.66, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), wool, 0, R * 0.78, 0);
  hat.scale.set(1, 0.85, 1);
  b.add(hat);
  const brim = mesh(new THREE.TorusGeometry(R * 0.64, 0.035, 10, 32), mat('#f6f8fc', { roughness: 0.9 }), 0, R * 0.8, 0);
  brim.rotation.x = Math.PI / 2;
  b.add(brim);
  const scarf = mesh(new THREE.TorusGeometry(R * 0.93, 0.05, 12, 36), wool, 0, -R * 0.05, 0);
  scarf.rotation.x = Math.PI / 2;
  b.add(scarf);
  addAntenna(b, ch, R * 0.78 + R * 0.55, { stem: 0, ball: 0.07 });
  // Ailerons
  const dark = mat('#1d2535', { roughness: 0.5 });
  addArms(b, ch, {
    x: R * 0.92,
    y: R * 0.05,
    elbowY: -0.22,
    upper: (g) => {
      const fl = mesh(sphere(0.12, 18, 12), dark, 0, -0.1, 0);
      fl.scale.set(0.35, 1, 0.75);
      g.add(fl);
    },
    fore: () => {},
  });
  return {
    hand: 0,
    top: R * 1.5 + 0.4,
    hover: 0,
    squash: 0.012,
    eye: '#121722',
    glow: false,
    mouthless: true,
    // Se dandine en marchant, ouvre le bec quand il parle
    animate(c, dt, t, moving) {
      if (moving) {
        c.body.rotation.z += Math.sin(t * 13) * 0.16;
        c.feet[0].position.y = 0.035 + Math.max(0, Math.sin(t * 13)) * 0.05;
        c.feet[1].position.y = 0.035 + Math.max(0, -Math.sin(t * 13)) * 0.05;
      }
      const open = c.action === 'talk' || c.action === 'ask' ? Math.abs(Math.sin(t * 11)) : 0;
      c.beak.scale.set(1, 1 + open * 0.25, 1 - open * 0.15);
    },
  };
}
