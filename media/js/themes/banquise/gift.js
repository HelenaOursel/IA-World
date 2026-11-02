// Cadeau des pingouins : un poisson frais.
import * as THREE from '../../../vendor/three.module.min.js';

/** Poisson argenté avec queue, nageoire et yeux (géométries propres : libérées après le don). */
function buildFish() {
  const g = new THREE.Group();
  const scales = new THREE.MeshStandardMaterial({ color: '#7fb8e6', metalness: 0.5, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), scales);
  body.scale.set(1.8, 0.8, 0.5);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4), scales);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.26;
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), new THREE.MeshStandardMaterial({ color: '#4f86b8', roughness: 0.4 }));
  fin.position.y = 0.1;
  g.add(fin);
  const eye = new THREE.MeshStandardMaterial({ color: '#10151f', roughness: 0.3 });
  for (const z of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), eye);
    e.position.set(0.13, 0.03, z * 0.055);
    g.add(e);
  }
  return g;
}

export const gift = {
  name: 'Poisson',
  article: 'un poisson',
  svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2.5 12c2.8-4.6 8.8-6 13-3.2L21 5.5l-1.6 6.5L21 18.5l-5.5-3.3C11.3 18 5.3 16.6 2.5 12z" fill="#7fb8e6"/><path d="M11.5 8.6c1.2 2.2 1.2 4.6 0 6.8" stroke="#4f86b8" stroke-width="1.3" fill="none"/><circle cx="7" cy="11" r="1.3" fill="#10151f"/></svg>',
  build: buildFish,
  colors: ['#9fd8ff', '#ffffff', '#ffd54f'],
  lines: ['Un poisson ! Miam <3', 'Du hareng tout frais !', 'Trop bon, merci !', 'Mon préféré !', 'Glouglou <3'],
};
