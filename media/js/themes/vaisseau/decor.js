// Décor du Vaisseau : le pont file en hyperespace, des traînées d'étoiles passent tout autour.
import * as THREE from '../../../vendor/three.module.min.js';
import { shipInterior } from './interior.js';

// Peu de traînées, lentes et discrètes : une impression de voyage, sans éblouir.
const STREAKS = 90;
const FAR = -130, NEAR = 45;

export function vaisseauDecor(scene) {
  // Chaque traînée est un segment orienté le long de z, qui avance vers la caméra puis repart au loin.
  const pos = new Float32Array(STREAKS * 6);
  const streaks = [];
  for (let i = 0; i < STREAKS; i++) {
    const a = Math.random() * Math.PI * 2;
    const radius = 16 + Math.random() * 45;
    streaks.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius * 0.6, z: FAR + Math.random() * (NEAR - FAR), len: 1.5 + Math.random() * 3.5, speed: 5 + Math.random() * 7 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#9fb8d8', transparent: true, opacity: 0.35, fog: false }));
  lines.frustumCulled = false;
  scene.add(lines);

  // Lueur bleutée au fond, là où convergent les étoiles
  const glow = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: '#2a5aa8', transparent: true, opacity: 0.15, fog: false, depthWrite: false }));
  glow.position.set(0, 6, -88);
  scene.add(glow);

  // Coursive, tuyaux, transmissions et grilles d'aération
  const interior = shipInterior(scene);

  return (t, dt) => {
    interior(t, dt);
    const p = geo.attributes.position;
    streaks.forEach((s, i) => {
      s.z += s.speed * dt;
      if (s.z > NEAR) s.z = FAR;
      p.setXYZ(i * 2, s.x, s.y, s.z);
      p.setXYZ(i * 2 + 1, s.x, s.y, s.z - s.len);
    });
    p.needsUpdate = true;
    glow.material.opacity = 0.13 + Math.sin(t * 0.8) * 0.02;
  };
}
