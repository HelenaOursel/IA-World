// Cadeau des pandas : une tige de bambou.
import * as THREE from '../../../vendor/three.module.min.js';

/** Tige de bambou : trois segments à nœuds et deux feuilles au sommet. */
function buildBamboo() {
  const g = new THREE.Group();
  const stalk = new THREE.MeshStandardMaterial({ color: '#7cc242', roughness: 0.45 });
  const node = new THREE.MeshStandardMaterial({ color: '#4e8a26', roughness: 0.5 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#5fae34', roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 14), stalk);
    seg.position.y = -0.13 + i * 0.13;
    g.add(seg);
  }
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.014, 14), node);
    ring.position.y = -0.195 + i * 0.13;
    g.add(ring);
  }
  for (const side of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), leaf);
    l.scale.set(0.35, 2.2, 0.08);
    l.position.set(side * 0.07, 0.17, 0);
    l.rotation.z = -side * 0.9;
    g.add(l);
  }
  return g;
}

const BAMBOO_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g transform="rotate(35 12 12)"><rect x="9.5" y="1" width="5" height="22" rx="2.5" fill="#7cc242"/><rect x="9" y="7.5" width="6" height="1.6" rx="0.8" fill="#4e8a26"/><rect x="9" y="15" width="6" height="1.6" rx="0.8" fill="#4e8a26"/><path d="M14.5 8.3C18 5.5 20.5 6.5 22.5 4.5 19.5 3.8 16.5 5 14.5 8.3Z" fill="#5fae34"/><path d="M9.5 16C6 14 4 15.5 1.8 14 4.5 12.5 7.5 13 9.5 16Z" fill="#5fae34"/></g></svg>`;

export const gift = {
  name: 'Bambou',
  article: 'le bambou',
  svg: BAMBOO_SVG,
  build: buildBamboo,
  colors: ['#7cc242', '#5fae34', '#e8f5c8'],
  lines: ['Du bambou ! Merci <3', 'Miam, tout croquant !', 'Trop bien, merci !', 'Mon préféré !', 'Crunch crunch <3'],
};
