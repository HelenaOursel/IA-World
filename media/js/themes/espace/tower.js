// Antenne satellite au centre de l'Espace.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon, roundedBox, sphere } from '../../geometry.js';

/** Antenne satellite : mât haubané, parabole qui balaie le ciel, récepteur qui clignote. */
export function buildSatelliteTower(g) {
  const steel = mat('#c9ced8', { metalness: 0.6, roughness: 0.3 });
  g.add(mesh(cylinder(0.08, 0.13, 1.6, 16), steel, 0, 0.88, 0));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const strut = mesh(cylinder(0.02, 0.02, 0.95, 8), steel, Math.cos(a) * 0.28, 0.5, Math.sin(a) * 0.28);
    strut.lookAt(0, 1.2, 0);
    strut.rotateX(Math.PI / 2);
    g.add(strut);
  }
  const head = new THREE.Group();
  head.position.y = 1.72;
  g.add(head);
  head.add(mesh(roundedBox(0.22, 0.16, 0.22, 0.04), steel));
  const dish = new THREE.Group();
  dish.rotation.x = -0.7;
  head.add(dish);
  const bowl = mesh(new THREE.SphereGeometry(0.62, 36, 14, 0, Math.PI * 2, 0, Math.PI / 3.2), mat('#eef1f6', { side: THREE.DoubleSide, roughness: 0.4 }), 0, 0.62, 0);
  bowl.rotation.x = Math.PI;
  dish.add(bowl);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const rod = mesh(cylinder(0.012, 0.012, 0.5, 6), steel, Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2);
    rod.lookAt(0, 0.55, 0);
    rod.rotateX(Math.PI / 2);
    dish.add(rod);
  }
  const receiver = new THREE.Mesh(sphere(0.045, 14, 10), neon('#4cc9f0', 2));
  receiver.position.y = 0.55;
  dish.add(receiver);
  // Un astronaute peut venir régler l'antenne (voir actions.js) : la parabole tressaute pendant le réglage.
  let adjusting = 0;
  let last = 0;
  g.userData.satellite = { head, adjust: (seconds) => (adjusting = seconds) };
  return (t) => {
    adjusting = Math.max(0, adjusting - (last ? t - last : 0));
    last = t;
    head.rotation.y = Math.sin(t * 0.25) * 1.2 + (adjusting > 0 ? Math.sin(t * 23) * 0.08 : 0);
    const blink = adjusting > 0 ? Math.sin(t * 14) > 0 : Math.sin(t * 4) > 0;
    receiver.material.color.set('#4cc9f0').multiplyScalar(blink ? 2.4 : 0.6);
  };
}
