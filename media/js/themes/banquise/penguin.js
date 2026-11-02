// Pingouin à bonnet et écharpe, qui se dandine en marchant (thème Banquise).
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, roundedBox, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

// Corps ovale plus haut que large : demi-hauteur, demi-largeur et demi-profondeur, en multiples de R.
const HALF_H = 1.5, HALF_W = 0.82, HALF_D = 0.78;

export function buildPenguin(ch) {
  const S = ch.size;
  const R = S * 0.52;
  /** Profondeur du corps (z de la surface avant) à la hauteur y, pour poser ventre, masque et bec dessus. */
  const frontAt = (y) => HALF_D * R * Math.sqrt(Math.max(0, 1 - (y / (HALF_H * R)) ** 2));
  addGlow(ch, S * 1.2, '#bfe6ff', 0.35);

  // Pattes orange posées au sol
  const orange = mat('#ff9f2e', { roughness: 0.5 });
  ch.feet = [-1, 1].map((sx) => {
    const f = mesh(sphere(0.075, 16, 10), orange, sx * R * 0.3, 0.035, R * 0.35);
    f.scale.set(1, 0.45, 1.5);
    ch.chassis.add(f);
    return f;
  });

  // Corps ovale, ventre blanc allongé
  const b = addBody(ch, HALF_H * R + 0.03);
  const egg = mesh(sphere(R, 48, 32), new THREE.MeshPhysicalMaterial({ color: '#1d2535', roughness: 0.45, clearcoat: 0.4 }));
  egg.scale.set(HALF_W, HALF_H, HALF_D);
  b.add(egg);
  const white = mat('#f6f8fc', { roughness: 0.6 });
  // Ventre bien en avant du corps : sa jonction avec le noir reste nette, sans dents de scie
  // Il s'arrête sous l'écharpe, laisse voir les flancs noirs et ne cache pas le bec.
  const belly = mesh(sphere(R * 0.8, 48, 32), white, 0, -R * 0.45, frontAt(-R * 0.45) - R * 0.42);
  belly.scale.set(0.78, 1.2, 0.6);
  b.add(belly);

  // Petit masque blanc en haut, yeux discrets, bec juste dessous
  const faceY = R * 0.75;
  const maskR = R * 0.36;
  const maskZ = frontAt(faceY) - R * 0.17;
  const mask = mesh(sphere(maskR, 28, 18), white, 0, faceY, maskZ);
  mask.scale.set(1.2, 0.75, 0.6);
  b.add(mask);
  addFace(b, ch, S * 0.4, S * 0.25, 0, faceY, maskZ + maskR * 0.6 + 0.006, 1);
  ch.beak = mesh(new THREE.ConeGeometry(0.045, 0.1, 16), orange, 0, R * 0.42, frontAt(R * 0.42) + 0.03);
  ch.beak.rotation.x = Math.PI / 2;
  b.add(ch.beak);

  // Bonnet et écharpe de sa couleur ; le pompon sert d'antenne
  const wool = mat(ch.color, { roughness: 0.85 });
  const hatY = R * 1.12;
  const hat = mesh(new THREE.SphereGeometry(R * 0.56, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), wool, 0, hatY, 0);
  hat.scale.set(1, 0.85, 0.95);
  b.add(hat);
  const brim = mesh(new THREE.TorusGeometry(R * 0.55, 0.03, 10, 32), mat('#f6f8fc', { roughness: 0.9 }), 0, hatY + 0.01, 0);
  brim.rotation.x = Math.PI / 2;
  b.add(brim);
  const scarfY = R * 0.2;
  const scarf = mesh(new THREE.TorusGeometry(HALF_W * R * 1.0, 0.045, 12, 36), wool, 0, scarfY, 0);
  scarf.rotation.x = Math.PI / 2;
  scarf.scale.set(1, HALF_D / HALF_W, 1);
  b.add(scarf);
  const tails = new THREE.Group();
  tails.position.set(R * 0.3, scarfY - 0.01, frontAt(scarfY) + 0.02);
  // Légèrement de biais, le bas un peu en avant pour passer devant le ventre
  tails.rotation.set(-0.15, 0, 0.12);
  tails.add(mesh(sphere(0.045, 14, 10), wool));
  for (const [x, len, tilt] of [[-0.025, 0.2, 0.06], [0.03, 0.16, -0.12]]) {
    const tail = mesh(roundedBox(0.07, len, 0.025, 0.012, 3), wool, x, -len / 2, 0.005);
    tail.rotation.z = tilt;
    tails.add(tail);
  }
  b.add(tails);
  addAntenna(b, ch, hatY + R * 0.56 * 0.85 - 0.01, { stem: 0, ball: 0.06 });

  // Ailerons fins et allongés
  const dark = mat('#1d2535', { roughness: 0.5 });
  addArms(b, ch, {
    x: HALF_W * R * 0.98,
    y: R * 0.1,
    elbowY: -0.26,
    upper: (g) => {
      const fl = mesh(sphere(0.13, 18, 12), dark, 0, -0.13, 0);
      fl.scale.set(0.28, 1.25, 0.7);
      g.add(fl);
    },
    fore: () => {},
  });

  return {
    hand: 0,
    top: R * HALF_H + R * 0.5 + 0.3,
    hover: 0,
    squash: 0.012,
    eye: '#121722',
    // Gros yeux noirs dans un petit masque blanc
    eyeScale: 1.35,
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
