// Cadeau des droïdes : une burette d'huile.
import * as THREE from '../../../vendor/three.module.min.js';

/** Burette rouge à bec doré, avec une poignée (géométries propres : libérées après le don). */
function buildOilCan() {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: '#d8423a', metalness: 0.4, roughness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b64a', metalness: 0.85, roughness: 0.25 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 20), red));
  const shoulder = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 20), red);
  shoulder.position.y = 0.115;
  g.add(shoulder);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.2, 10), gold);
  spout.position.set(0.06, 0.2, 0);
  spout.rotation.z = -0.7;
  g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI), gold);
  handle.position.set(-0.1, 0.02, 0);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  return g;
}

export const gift = {
  name: 'Burette',
  article: 'une burette d’huile',
  svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 11h8l1 9H5z" fill="#d8423a"/><path d="M6 11l4-3 4 3z" fill="#b8342d"/><path d="M13 9l7-5" stroke="#e0b64a" stroke-width="2" stroke-linecap="round"/><path d="M5 13c-3 0-3 5 0 5" stroke="#e0b64a" stroke-width="1.6" fill="none"/></svg>',
  build: buildOilCan,
  colors: ['#e0b64a', '#5ab0ff', '#ffffff'],
  lines: ['Bip bip ! Merci <3', 'Bidou bip bwiii !', 'Mes joints grincaient !', 'Huile de première qualité !', 'Bip boup <3'],
};
