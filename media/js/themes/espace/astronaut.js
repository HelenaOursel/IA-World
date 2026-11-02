// Astronaute en combinaison, qui marche et flotte un peu (thème Espace).
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, roundedBox, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

export function buildAstronaut(ch) {
  const S = ch.size;
  addGlow(ch, S * 1.4, ch.color, 0.7);
  const suit = new THREE.MeshPhysicalMaterial({ color: '#cfd5de', roughness: 0.6, clearcoat: 0.25 });
  const accent = mat(ch.color, { roughness: 0.45 });
  const legY = 0.13;
  // Petites jambes et bottes, articulées à la hanche pour marcher
  ch.legs = [-1, 1].map((sx) => {
    const hip = new THREE.Group();
    hip.position.set(sx * S * 0.17, 0.2, 0);
    hip.add(mesh(roundedBox(0.13, 0.16, 0.15, 0.06, 4), suit, 0, -0.064, 0));
    hip.add(mesh(roundedBox(0.15, 0.06, 0.19, 0.03, 4), mat('#59606e'), 0, -0.15, 0.02));
    ch.chassis.add(hip);
    return hip;
  });
  // Combinaison, sac à dos et plastron de sa couleur
  const torsoH = S * 0.56;
  const b = addBody(ch, 0.2 + legY + torsoH / 2);
  b.add(mesh(roundedBox(S * 0.74, torsoH, S * 0.52, 0.11), suit));
  b.add(mesh(roundedBox(S * 0.36, S * 0.18, 0.03, 0.02, 4), accent, 0, -S * 0.02, S * 0.26));
  b.add(mesh(roundedBox(S * 0.58, S * 0.5, S * 0.24, 0.06), mat('#c9ced8', { roughness: 0.5 }), 0, S * 0.04, -S * 0.36));
  // Casque à visière noire ; les yeux brillent dans la visière
  const headY = torsoH / 2 + S * 0.3;
  b.add(mesh(sphere(S * 0.4, 32, 22), suit, 0, headY, 0));
  const visor = mesh(sphere(S * 0.33, 32, 22), new THREE.MeshPhysicalMaterial({ color: '#06080f', metalness: 0.4, roughness: 0.1, clearcoat: 1 }), 0, headY - S * 0.01, S * 0.2);
  visor.scale.set(1, 0.85, 0.8);
  b.add(visor);
  addFace(b, ch, S * 0.5, S * 0.31, 0, headY - S * 0.01, S * 0.2 + S * 0.33 * 0.8 + 0.004);
  addAntenna(b, ch, headY + S * 0.32, { stem: 0.12, stemColor: '#9aa3ad', x: S * 0.16 });
  addArms(b, ch, {
    x: S * 0.4,
    y: torsoH * 0.28,
    elbowY: -0.14,
    upper: (g) => g.add(mesh(roundedBox(0.1, 0.17, 0.1, 0.05, 4), suit, 0, -0.065, 0)),
    fore: (g) => {
      g.add(mesh(roundedBox(0.095, 0.15, 0.095, 0.047, 4), suit, 0, -0.06, 0));
      g.add(mesh(sphere(0.06, 16, 10), accent, 0, -0.16, 0));
    },
  });
  return {
    hand: -0.16,
    top: headY + S * 0.4 + 0.45,
    hover: 0.05,
    // Les jambes se balancent quand il se déplace, et reviennent droites à l'arrêt
    animate(c, dt, t, moving) {
      const swing = moving ? Math.sin(t * 10) * 0.55 : 0;
      const k = 1 - Math.exp(-dt * 10);
      c.legs[0].rotation.x += (swing - c.legs[0].rotation.x) * k;
      c.legs[1].rotation.x += (-swing - c.legs[1].rotation.x) * k;
    },
  };
}
