// Feu de camp du thème Japon, à la place de la tour centrale : les pandas dorment autour.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon, sphere } from '../../geometry.js';

/** Feu de camp au centre et coussins de mousse où les pandas dorment ; renvoie de quoi l'animer. */
export function buildCampfire(g, angles, radius) {
  // Cercle de pierres
  const stone = mat('#8a8f98', { roughness: 0.95 });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const s = mesh(sphere(0.13, 12, 8), stone, Math.sin(a) * 0.62, 0.06, Math.cos(a) * 0.62);
    s.scale.set(1 + (i % 3) * 0.15, 0.6 + (i % 2) * 0.15, 0.85);
    s.rotation.y = a;
    g.add(s);
  }
  // Bûches croisées en tipi
  const bark = mat('#5a3a22', { roughness: 0.9 });
  const cut = mat('#c89a64', { roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const log = new THREE.Group();
    log.position.set(Math.sin(a) * 0.22, 0.2, Math.cos(a) * 0.22);
    log.rotation.set(0, a, 0);
    const body = mesh(cylinder(0.055, 0.065, 0.62, 10), bark);
    body.rotation.x = -0.75;
    log.add(body);
    const end = mesh(cylinder(0.056, 0.056, 0.012, 10), cut, 0, -Math.cos(0.75) * 0.31, Math.sin(0.75) * 0.31);
    end.rotation.x = -0.75;
    log.add(end);
    g.add(log);
  }
  // Braises au pied du feu
  g.add(mesh(cylinder(0.3, 0.34, 0.04, 16), neon('#ff4d1a', 1.6), 0, 0.02, 0));

  // Flammes : cônes lumineux superposés qui dansent
  const flames = [
    ['#ff3d14', 0.3, 0.8, 0.55, 0, 0],
    ['#ff8a1f', 0.22, 0.7, 0.7, 0, 0],
    ['#ffd23f', 0.13, 0.48, 0.85, 0, 0],
    ['#ff6a1a', 0.12, 0.5, 0.6, 0.14, 0.05],
    ['#ff6a1a', 0.1, 0.42, 0.6, -0.12, -0.08],
  ].map(([color, r, h, opacity, x, z], i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14, 1, true), neon(color, 2.4, { transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    f.geometry.translate(0, h / 2, 0);
    f.position.set(x, 0.06, z);
    f.userData = { h, phase: i * 1.7 };
    g.add(f);
    return f;
  });
  // Petites étincelles qui s'envolent
  const sparkMat = neon('#ffb347', 3, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const s = new THREE.Mesh(sphere(0.018, 6, 4), sparkMat);
    s.userData = { phase: i / 14, a: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 0.15 };
    g.add(s);
    return s;
  });

  // Coussins de mousse où les pandas viennent dormir au coin du feu
  const moss = mat('#4d7d33', { roughness: 1 });
  angles.forEach((a) => {
    const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
    const pad = mesh(cylinder(0.36, 0.4, 0.05, 20), moss, x, 0.025, z);
    pad.scale.z = 0.85;
    pad.rotation.y = a;
    g.add(pad);
  });
  const light = new THREE.PointLight('#ff8a3c', 4, 7, 1.6);
  light.position.set(0, 0.9, 0);
  g.add(light);
  const animate = (t) => {
    flames.forEach((f) => {
      const p = f.userData.phase;
      f.scale.set(1 + Math.sin(t * 9 + p) * 0.08, 1 + Math.sin(t * 13 + p) * 0.18 + Math.sin(t * 5.3 + p) * 0.1, 1 + Math.cos(t * 8 + p) * 0.08);
      f.rotation.y = t * 0.8 + p;
      f.rotation.z = Math.sin(t * 6 + p) * 0.06;
    });
    sparks.forEach((s) => {
      const u = s.userData;
      const k = (t * 0.45 + u.phase) % 1;
      if (k < 0.02) u.a = Math.random() * Math.PI * 2;
      s.position.set(Math.sin(u.a + k * 4) * (u.r + k * 0.15), 0.3 + k * 1.6, Math.cos(u.a + k * 4) * (u.r + k * 0.15));
      s.scale.setScalar(1 - k);
    });
    light.intensity = 3.6 + Math.sin(t * 11) * 0.4 + Math.sin(t * 17.3) * 0.3;
  };
  return { rings: [], light, animateTower: animate };
}
