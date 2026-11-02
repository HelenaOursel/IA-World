// Décor de l'Espace : planète à anneau, lune, astéroïdes et panneaux solaires.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, sphere } from '../../geometry.js';

function planetTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const bands = ['#e8b98a', '#d99a6c', '#f3d1a8', '#c98457', '#e8c39b', '#b9764c', '#f0d6b4'];
  for (let y = 0; y < 128; y += 8) {
    g.fillStyle = bands[(y / 8 + (y % 3)) % bands.length];
    g.fillRect(0, y, 256, 8 + Math.random() * 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function solarWing(scene, side) {
  const g = new THREE.Group();
  g.position.set(side * 8.6, -0.2, -0.6);
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), mat('#c9ced8', { metalness: 0.6, roughness: 0.3 }), side * 1.1, 0, 0));
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16306b';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#7fa8ff';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  const panel = mesh(new THREE.BoxGeometry(3.6, 0.05, 2.4), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.25 }), side * 3.9, 0, 0);
  panel.rotation.x = 0.35;
  g.add(panel);
  scene.add(g);
}

export function espaceDecor(scene) {
  const planet = new THREE.Mesh(sphere(16, 48, 32), new THREE.MeshBasicMaterial({ map: planetTexture(), fog: false }));
  planet.position.set(-48, 14, -62);
  planet.rotation.z = 0.35;
  scene.add(planet);
  const ring = new THREE.Mesh(new THREE.RingGeometry(20, 29, 64), new THREE.MeshBasicMaterial({ color: '#e9cfa8', transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false }));
  ring.position.copy(planet.position);
  ring.rotation.set(Math.PI / 2 - 0.35, 0.2, 0);
  scene.add(ring);
  const moon = new THREE.Mesh(sphere(3.2, 32, 20), new THREE.MeshStandardMaterial({ color: '#c9ccd4', roughness: 1, fog: false }));
  moon.position.set(42, 22, -48);
  scene.add(moon);

  const rock = mat('#7b7f8a', { roughness: 0.95 });
  const rocks = [];
  for (let i = 0; i < 16; i++) {
    const m = mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.8, 0), rock);
    m.userData = { a: Math.random() * Math.PI * 2, r: 12 + Math.random() * 9, y: -5 + Math.random() * 10, speed: 0.008 + Math.random() * 0.02, spin: Math.random() };
    scene.add(m);
    rocks.push(m);
  }
  solarWing(scene, -1);
  solarWing(scene, 1);
  return (t, dt) => {
    planet.rotation.y += dt * 0.01;
    for (const m of rocks) {
      const u = m.userData;
      u.a += u.speed * dt;
      m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 0.4 + u.r) * 0.3, Math.sin(u.a) * u.r);
      m.rotation.set(t * u.spin, t * u.spin * 0.7, 0);
    }
  };
}
