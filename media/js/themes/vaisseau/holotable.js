// Table holographique au centre du pont (thème Vaisseau) : elle projette une planète
// en hologramme, avec ses orbites et quelques vaisseaux qui tournent autour.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, metal, mesh, neon } from '../../geometry.js';

const HOLO = '#5ab0ff';

export function buildHoloTable(g) {
  g.add(mesh(cylinder(0.55, 0.42, 0.7, 32), metal('#3a404c'), 0, 0.35, 0));
  g.add(mesh(cylinder(0.62, 0.62, 0.06, 32), metal('#2a2f38'), 0, 0.73, 0));
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), neon(HOLO, 1.2, { transparent: true, opacity: 0.7 }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.765;
  g.add(top);

  // Cône de projection
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.5, 1.3, 32, 1, true),
    neon(HOLO, 0.7, { transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  cone.position.y = 1.42;
  g.add(cone);

  // L'hologramme : planète en grille, orbites et petits vaisseaux
  const holo = new THREE.Group();
  holo.position.y = 1.55;
  g.add(holo);
  const grid = new THREE.MeshBasicMaterial({ color: new THREE.Color(HOLO).multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0.55 });
  holo.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), grid));
  holo.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), neon(HOLO, 0.5, { transparent: true, opacity: 0.2, depthWrite: false })));
  const ships = [];
  for (const [radius, tilt] of [[0.5, 0.3], [0.62, -0.45]]) {
    const orbit = new THREE.Group();
    orbit.rotation.x = Math.PI / 2 + tilt;
    holo.add(orbit);
    orbit.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 6, 64), neon(HOLO, 1.2, { transparent: true, opacity: 0.6 })));
    const ship = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), neon('#cfe4ff', 2));
    ship.rotation.z = -Math.PI / 2;
    const carrier = new THREE.Group();
    ship.position.x = radius;
    carrier.add(ship);
    orbit.add(carrier);
    ships.push(carrier);
  }

  return (t) => {
    holo.rotation.y = t * 0.25;
    ships.forEach((s, i) => (s.rotation.z = t * (0.8 + i * 0.35)));
    // Scintillement de l'hologramme
    const flicker = Math.sin(t * 37) > 0.93 ? 0.25 : 0.55;
    grid.opacity = flicker;
    cone.material.opacity = 0.07 + Math.sin(t * 2.4) * 0.02;
  };
}
