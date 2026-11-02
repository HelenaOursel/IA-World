// Cadeau des slimes : un bouquet de cristaux.
import * as THREE from '../../../vendor/three.module.min.js';

/** Trois cristaux translucides et lumineux (géométries propres : libérées après le don). */
function buildCrystal() {
  const g = new THREE.Group();
  const shard = (height, r, color, x, tilt) => {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(r, 0),
      new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 }),
    );
    m.scale.set(1, height, 1);
    m.position.x = x;
    m.rotation.z = tilt;
    g.add(m);
  };
  shard(2.2, 0.08, '#c77dff', 0, 0);
  shard(1.6, 0.055, '#ff6ec7', 0.08, -0.5);
  shard(1.5, 0.05, '#7df9ff', -0.07, 0.45);
  return g;
}

export const gift = {
  name: 'Cristal',
  article: 'un cristal',
  svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2l4.5 6.5L12 22 7.5 8.5z" fill="#c77dff"/><path d="M12 2l4.5 6.5h-9z" fill="#e3b8ff"/><path d="M18.5 9l2.5 3.5-2.5 6.5-2-6.5z" fill="#ff6ec7"/><path d="M5.5 10l2 3-2 5.5-2-5.5z" fill="#7df9ff"/></svg>',
  build: buildCrystal,
  colors: ['#c77dff', '#ff6ec7', '#7df9ff'],
  lines: ['Un cristal ! Merci <3', 'Ça brille de partout !', 'Croc croc, délicieux !', 'Je le garde dans ma gelée !', 'Blop blop <3'],
};
