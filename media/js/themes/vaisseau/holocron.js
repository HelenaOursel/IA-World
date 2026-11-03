// Holocrons à la place des baies de serveurs (thème Vaisseau) : un cube de lumière
// qui flotte en tournant au-dessus d'un socle, avec un cœur qui pulse.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, metal, mesh, neon } from '../../geometry.js';

const COLORS = ['#5ab0ff', '#5ab0ff', '#ff5a4a', '#5ab0ff'];
let count = 0;

/** Construit un holocron dans `g` (déjà placé et orienté) ; renvoie animate(t). */
export function buildHolocron(g) {
  const color = COLORS[count++ % COLORS.length];
  const phase = Math.random() * 6;
  // Socle
  g.add(mesh(cylinder(0.32, 0.4, 0.5, 24), metal('#3a404c'), 0, 0.25, 0));
  g.add(mesh(cylinder(0.22, 0.32, 0.12, 24), metal('#2a2f38'), 0, 0.56, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 8, 32), neon(color, 1.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.62;
  g.add(ring);
  // Faisceau de lumière entre le socle et le cube
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.22, 0.6, 20, 1, true),
    neon(color, 0.8, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = 0.92;
  g.add(beam);

  // Le cube : verre teinté, arêtes lumineuses, cœur qui pulse
  const cube = new THREE.Group();
  cube.position.y = 1.4;
  g.add(cube);
  const tint = new THREE.Color(color);
  cube.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1, emissive: tint, emissiveIntensity: 0.3 })));
  cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.43, 0.43, 0.43)), new THREE.LineBasicMaterial({ color: tint.clone().multiplyScalar(2.4) })));
  // Motif gravé sur chaque face : un losange lumineux
  for (const [axis, sign] of [['x', 1], ['x', -1], ['y', 1], ['y', -1], ['z', 1], ['z', -1]]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.09, 4), neon(color, 1.6, { side: THREE.DoubleSide }));
    m.position[axis] = sign * 0.216;
    if (axis === 'x') m.rotation.y = Math.PI / 2;
    if (axis === 'y') m.rotation.x = Math.PI / 2;
    cube.add(m);
  }
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), neon(color, 2.2));
  cube.add(core);

  return (t) => {
    cube.position.y = 1.4 + Math.sin(t * 1.2 + phase) * 0.06;
    cube.rotation.set(t * 0.3 + phase, t * 0.5, 0);
    core.rotation.set(-t * 1.2, t * 0.9, 0);
    core.scale.setScalar(1 + Math.sin(t * 3 + phase) * 0.15);
    beam.material.opacity = 0.1 + Math.sin(t * 2 + phase) * 0.04;
  };
}
