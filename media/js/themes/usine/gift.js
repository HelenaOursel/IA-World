// Cadeau des robots : une puce électronique.
import * as THREE from '../../../vendor/three.module.min.js';
import { neon } from '../../geometry.js';

/** Petite puce électronique : circuit vert, broches dorées, cœur lumineux. */
function buildChip() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: '#1d7a4b', roughness: 0.5 })));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: '#15181f', roughness: 0.3, metalness: 0.4 })));
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcf5a', metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.05), gold);
      a.position.set(-0.075 + i * 0.05, 0, side * 0.14);
      g.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), gold);
      b.position.set(side * 0.14, 0, -0.075 + i * 0.05);
      g.add(b);
    }
  }
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.05), neon('#3ddc97', 2.5));
  g.add(core);
  return g;
}

const PINS = [7, 10.5, 14, 17.5]
  .map((p) => `<rect x="${p - 0.75}" y="2" width="1.5" height="3" fill="#ffcf5a"/><rect x="${p - 0.75}" y="19" width="1.5" height="3" fill="#ffcf5a"/><rect x="2" y="${p - 0.75}" width="3" height="1.5" fill="#ffcf5a"/><rect x="19" y="${p - 0.75}" width="3" height="1.5" fill="#ffcf5a"/>`)
  .join('');
const CHIP_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${PINS}<rect x="5" y="5" width="14" height="14" rx="2" fill="#1d7a4b"/><rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="#15181f"/><rect x="11" y="11" width="2" height="2" fill="#3ddc97"/></svg>`;

export const gift = {
  name: 'Puce',
  article: 'une puce',
  svg: CHIP_SVG,
  build: buildChip,
  colors: ['#3ddc97', '#ffd54f', '#ffffff'],
  lines: ['Une puce ! Merci <3', 'Miam, du silicium !', 'Trop bien, merci !', 'Ma préférée !', 'Mise à jour reçue <3'],
};
