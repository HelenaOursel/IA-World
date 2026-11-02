// Tour de glace au centre de la Banquise.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon } from '../../geometry.js';

/** Tour de glace : blocs hexagonaux translucides, stalactites, pointe de cristal. */
export function buildIceTower(g) {
  const ice = new THREE.MeshPhysicalMaterial({ color: '#cdeeff', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.85 });
  const frost = mat('#f4f9fd', { roughness: 0.9 });
  // Lueur bleutée à l'intérieur de la glace
  g.add(new THREE.Mesh(cylinder(0.1, 0.16, 1.5, 12), neon('#9fe6ff', 0.7)).translateY(0.95));
  const tiers = [[0.5, 0.58, 0.5, 0.39], [0.4, 0.48, 0.48, 0.88], [0.3, 0.38, 0.45, 1.35]];
  for (const [rt, rb, h, y] of tiers) {
    g.add(mesh(new THREE.CylinderGeometry(rt, rb, h, 6), ice, 0, y, 0));
    const band = mesh(new THREE.TorusGeometry(rt * 1.02, 0.025, 6, 6), frost, 0, y + h / 2, 0);
    band.rotation.x = Math.PI / 2;
    g.add(band);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const icicle = mesh(new THREE.ConeGeometry(0.035, 0.18, 6), ice, Math.cos(a) * rt * 0.98, y + h / 2 - 0.1, Math.sin(a) * rt * 0.98);
      icicle.rotation.x = Math.PI;
      g.add(icicle);
    }
  }
  g.add(mesh(new THREE.ConeGeometry(0.3, 0.75, 6), ice, 0, 1.95, 0));
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), neon('#e6f8ff', 1.1));
  tip.position.y = 2.42;
  tip.scale.set(1, 1.6, 1);
  g.add(tip);
  return (t) => (tip.rotation.y = t * 0.6);
}
