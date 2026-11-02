// Cadeau des astronautes : une étoile filante.
import * as THREE from '../../../vendor/three.module.min.js';
import { neon } from '../../geometry.js';

/** Étoile dorée à cinq branches, en relief, qui brille (géométrie propre : libérée après le don). */
function buildStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.07 : 0.17;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 });
  geo.center();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, neon('#ffd54f', 1.8)));
  return g;
}

export const gift = {
  name: 'Étoile',
  article: 'une étoile',
  svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#ffd54f" stroke="#ffb300" stroke-width="1" stroke-linejoin="round"/></svg>',
  build: buildStar,
  colors: ['#ffd54f', '#ffffff', '#b388ff'],
  lines: ['Une étoile ! Merci <3', 'Elle brille trop !', 'Direct dans ma collection !', 'Wouah, une supernova !', 'Merci, terrien <3'],
};
