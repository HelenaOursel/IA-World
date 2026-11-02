// Torii vermillon du thème Japon, à la place du portail d'assemblage.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon, roundedBox } from '../../geometry.js';

/** Torii vermillon à la place du portail d'assemblage. */
export function buildTorii(g) {
  // Torii : piliers vermillon sur socles noirs, traverse (nuki), linteaux courbés (shimaki et kasagi)
  const red = mat('#d8392a', { roughness: 0.55 });
  const black = mat('#1c1616', { roughness: 0.6 });
  for (const x of [-1.0, 1.0]) {
    g.add(mesh(cylinder(0.1, 0.12, 2.2, 20), red, x, 1.1, 0));
    g.add(mesh(cylinder(0.14, 0.15, 0.22, 20), black, x, 0.11, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(2.5, 0.12, 0.1), red, 0, 1.68, 0));
  /** Poutre dont les extrémités se relèvent en douceur. */
  const beam = (w, h, d, rise) => {
    const geo = new THREE.BoxGeometry(w, h, d, 24, 1, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / (w / 2);
      pos.setY(i, pos.getY(i) + rise * u * u * u * u);
    }
    geo.computeVertexNormals();
    return geo;
  };
  g.add(mesh(beam(2.6, 0.14, 0.16, 0.06), red, 0, 2.12, 0));
  g.add(mesh(beam(3.0, 0.13, 0.24, 0.2), black, 0, 2.26, 0));
  // Petite plaque centrale (gakuzuka) entre la traverse et les linteaux
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.4, 0.08), red, 0, 1.9, 0));
  g.add(mesh(roundedBox(0.3, 0.36, 0.04, 0.015), black, 0, 1.9, 0.06));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), neon('#ffcf5a', 1.2));
  plaque.position.set(0, 1.9, 0.081);
  g.add(plaque);

}
