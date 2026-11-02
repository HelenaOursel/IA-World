// Robot cubique laqué, avec un écran-visage et une antenne (thème Usine).
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, roundedBox, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow, screenGeometry } from '../shared.js';

export function buildRobot(ch) {
  const S = ch.size;
  addGlow(ch, S * 1.5, ch.color);
  // Cube laqué de la couleur du robot, coins très arrondis, qui lévite
  const b = addBody(ch, 0.16 + S / 2);
  const shell = new THREE.MeshPhysicalMaterial({ color: ch.color, metalness: 0.2, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  b.add(mesh(roundedBox(S, S, S, S * 0.2), shell));
  // Écran noir arrondi sur la face avant, qui contient les yeux
  b.add(mesh(screenGeometry(S * 0.8, S * 0.55, S * 0.15), new THREE.MeshPhysicalMaterial({ color: '#05070c', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }), 0, S * 0.04, S / 2 - 0.012));
  addFace(b, ch, S * 0.76, S * 0.475, 0, S * 0.04, S / 2 + 0.018);
  addAntenna(b, ch, S / 2);
  const armMat = mat('#151924', { metalness: 0.4, roughness: 0.35 });
  addArms(b, ch, {
    x: S / 2 + 0.02,
    y: -S * 0.08,
    elbowY: -0.14,
    upper: (g) => g.add(mesh(roundedBox(0.085, 0.17, 0.085, 0.042, 4), armMat, 0, -0.065, 0)),
    fore: (g) => {
      g.add(mesh(roundedBox(0.08, 0.15, 0.08, 0.04, 4), armMat, 0, -0.06, 0));
      g.add(mesh(sphere(0.062, 18, 12), shell, 0, -0.16, 0));
    },
  });
  return { hand: -0.16, top: S / 2 + 0.5 };
}
