// Décor du Slime : champignons lumineux, flaques de gelée et bulles, sol de mousse.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon, sphere } from '../../geometry.js';
import { paintBlotches } from '../shared.js';

// Points blancs des chapeaux de champignons, partagés par tous.
const DOT = new THREE.MeshBasicMaterial({ color: '#ffffff' });

function mushroom(scene, x, z, s, color) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.add(mesh(cylinder(0.07, 0.1, 0.5, 12), mat('#efe3ff', { roughness: 0.7 }), 0, 0.25, 0));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), neon(color, 1.3));
  cap.position.y = 0.48;
  cap.scale.set(1, 0.7, 1);
  g.add(cap);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const dot = new THREE.Mesh(sphere(0.035, 8, 6), DOT);
    dot.position.set(Math.cos(a) * 0.16, 0.62, Math.sin(a) * 0.16);
    g.add(dot);
  }
  scene.add(g);
}

export function slimeDecor(scene) {
  const colors = ['#ff6ec7', '#7df9ff', '#b5ff4d', '#c77dff'];
  const spots = [[-4.0, -6.2], [4.0, -6.2], [-7.0, -1.0], [7.1, -0.8], [-6.3, 3.0], [6.4, 3.0], [-2.8, -6.9], [3.1, -7.0]];
  spots.forEach(([x, z], i) => {
    mushroom(scene, x, z, 1 + (i % 3) * 0.25, colors[i % colors.length]);
    mushroom(scene, x + 0.45, z + 0.2, 0.6, colors[(i + 1) % colors.length]);
  });
  // Flaques de gelée lumineuse d'où montent des bulles
  const puddles = [[-6.0, 4.6], [6.1, 4.4], [-1.8, -7.2], [7.0, -3.6], [-7.0, -3.6]];
  const pools = puddles.map(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), neon(colors[i % colors.length], 0.9, { transparent: true, opacity: 0.7 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.scale.set(1.3, 0.9, 1);
    scene.add(m);
    return m;
  });
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 });
  const bubbles = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(sphere(0.06 + Math.random() * 0.08, 14, 10), bubbleMat);
    m.userData = { pool: pools[i % pools.length], t: Math.random() * 4, dx: (Math.random() - 0.5) * 0.6, dz: (Math.random() - 0.5) * 0.4 };
    scene.add(m);
    bubbles.push(m);
  }
  return (t, dt) => {
    for (const b of bubbles) {
      const u = b.userData;
      u.t += dt;
      if (u.t > 4) u.t = 0;
      const p = u.pool.position;
      b.position.set(p.x + u.dx + Math.sin(u.t * 3) * 0.05, 0.05 + u.t * 0.6, p.z + u.dz);
      b.scale.setScalar(Math.min(1, u.t * 2) * (u.t > 3.6 ? (4 - u.t) / 0.4 : 1));
    }
    pools.forEach((m, i) => m.scale.set(1.3 + Math.sin(t * 2 + i) * 0.05, 0.9 + Math.cos(t * 2 + i) * 0.05, 1));
  };
}

export function paintGoo(g, size) {
  g.fillStyle = '#1c3624';
  g.fillRect(0, 0, size, size);
  paintBlotches(g, size, ['60,120,55', '40,90,45', '90,160,70'], 240, 0.45, 40, 170);
  g.lineWidth = 3;
  for (let i = 0; i < 220; i++) {
    g.strokeStyle = `rgba(181,255,77,${0.08 + Math.random() * 0.18})`;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 16, 0, Math.PI * 2);
    g.stroke();
  }
}
