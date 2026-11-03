// Thème Japon : pelouse fleurie, cerisier, bosquet de bambous, maneki-neko doré et cuirassé Yamato à quai.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, sphere } from '../../geometry.js';
import { buildYamato } from './yamato.js';

/** Pelouse fleurie, avec une clairière de terre battue autour du feu de camp. */
export function paintGrass(g, size, k, px) {
  // Pelouse : fond vert, grandes taches d'ombre et de lumière, puis des milliers de brins.
  g.fillStyle = '#3f7a2c';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 40 + Math.random() * 160;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = Math.random() < 0.5 ? '34,80,26' : '96,150,58';
    grad.addColorStop(0, `rgba(${tone},0.35)`);
    grad.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 70000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const len = 6 + Math.random() * 10, lean = (Math.random() - 0.5) * 8;
    const l = 26 + Math.random() * 26;
    g.strokeStyle = `hsl(${95 + Math.random() * 25}, ${45 + Math.random() * 20}%, ${l}%)`;
    g.lineWidth = 1.5 + Math.random() * 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + lean, y - len);
    g.stroke();
  }
  // Quelques fleurs des champs
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    g.fillStyle = ['#fff6d6', '#ffd84a', '#f6a6d8', '#c9b6ff'][i % 4];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 2.6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e8a21f';
    g.beginPath();
    g.arc(x, y, 2, 0, Math.PI * 2);
    g.fill();
  }
  // Clairière de terre battue autour du feu de camp
  g.save();
  g.translate(...px(0, 0));
  const dirt = g.createRadialGradient(0, 0, 0.6 * k, 0, 0, 1.45 * k);
  dirt.addColorStop(0, 'rgba(110,78,48,1)');
  dirt.addColorStop(0.75, 'rgba(110,78,48,0.85)');
  dirt.addColorStop(1, 'rgba(110,78,48,0)');
  g.fillStyle = dirt;
  g.beginPath();
  g.arc(0, 0, 1.45 * k, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 1.2 * k;
    g.fillStyle = `rgba(${60 + Math.random() * 60},${45 + Math.random() * 40},${30 + Math.random() * 25},0.6)`;
    g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 3, 3);
  }
  g.restore();

}

/** Cerisier en fleurs : tronc tordu, houppier rose et pétales qui tombent en virevoltant. */
function buildCherry(scene, [x, z]) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const bark = mat('#4a2e22', { roughness: 0.9 });
  // Tronc en deux tronçons légèrement coudés, puis trois branches maîtresses
  const trunk = mesh(cylinder(0.11, 0.17, 1.1, 12), bark, 0, 0.55, 0);
  trunk.rotation.z = 0.08;
  g.add(trunk);
  const upper = mesh(cylinder(0.08, 0.11, 0.8, 12), bark, -0.08, 1.45, 0);
  upper.rotation.z = -0.18;
  g.add(upper);
  for (const [a, tilt, len] of [[0.3, 0.8, 0.8], [2.4, 0.7, 0.7], [4.3, 0.9, 0.75]]) {
    const b = new THREE.Group();
    b.position.set(-0.12, 1.65, 0);
    b.rotation.set(0, a, tilt);
    b.add(mesh(cylinder(0.035, 0.06, len, 8), bark, 0, len / 2, 0));
    g.add(b);
  }
  // Houppier : grappes de boules roses de tailles et de teintes variées
  const pinks = ['#ffa8cc', '#ff8fbd', '#ffc0dc', '#f57aac', '#ffcfe3'].map((c) => mat(c, { roughness: 0.8, emissive: c, emissiveIntensity: 0.18 }));
  const blooms = [
    [0, 2.35, 0, 0.62], [0.55, 2.1, 0.2, 0.48], [-0.6, 2.15, -0.1, 0.5], [0.15, 2.05, 0.55, 0.45],
    [-0.2, 2.1, -0.55, 0.46], [0.45, 2.5, -0.3, 0.4], [-0.45, 2.55, 0.35, 0.42], [0.85, 1.85, -0.25, 0.32],
    [-0.9, 1.9, 0.3, 0.34], [0.1, 2.8, 0.05, 0.36], [-0.25, 1.85, 0.6, 0.3], [0.5, 1.9, 0.6, 0.3],
  ];
  blooms.forEach(([bx, by, bz, br], i) => {
    const m = mesh(new THREE.IcosahedronGeometry(br, 2), pinks[i % pinks.length], bx, by, bz);
    m.scale.y = 0.82;
    g.add(m);
  });
  // Tapis de pétales tombés au pied de l'arbre
  const fallen = new THREE.MeshStandardMaterial({ color: '#ffb7d5', roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 1.3;
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.035, 5), fallen);
    p.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
    p.position.set(Math.cos(a) * d, 0.012 + i * 0.0001, Math.sin(a) * d);
    g.add(p);
  }
  // Pétales en vol (réutilisés en boucle)
  const petalGeo = new THREE.CircleGeometry(0.04, 5);
  petalGeo.scale(1, 0.6, 1);
  const petalMat = new THREE.MeshStandardMaterial({ color: '#ffc4dc', roughness: 0.7, side: THREE.DoubleSide, emissive: '#ff6fa8', emissiveIntensity: 0.15 });
  const petals = Array.from({ length: 26 }, (_, i) => {
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.userData = { phase: i / 26, a: Math.random() * Math.PI * 2, d: 0.2 + Math.random() * 0.8, spin: 2 + Math.random() * 3 };
    g.add(p);
    return p;
  });
  scene.add(g);
  return petals;
}

/** Bosquet de bambous : tiges à nœuds de hauteurs variées, feuillage au sommet, qui ondulent au vent. */
function buildBambooGrove(scene, [x, z]) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(mesh(sphere(0.75, 20, 10), mat('#4b6b2e', { roughness: 1 }), 0, -0.55, 0));
  const greens = ['#7cc242', '#6fb238', '#8fd052'].map((c) => mat(c, { roughness: 0.45 }));
  const node = mat('#4e8a26', { roughness: 0.5 });
  const leaf = mat('#5fae34', { roughness: 0.7, side: THREE.DoubleSide });
  const stalks = [];
  const spots = [[0, 0], [0.32, 0.1], [-0.3, 0.15], [0.12, -0.32], [-0.18, -0.28], [0.42, -0.25], [-0.45, -0.1], [0.2, 0.38], [-0.1, 0.42]];
  spots.forEach(([sx, sz], i) => {
    const stalk = new THREE.Group();
    stalk.position.set(sx, 0, sz);
    const h = 2.1 + ((i * 37) % 11) / 10;
    const segs = Math.round(h / 0.38);
    const segH = h / segs;
    const r = 0.045 + (i % 3) * 0.008;
    for (let k = 0; k < segs; k++) {
      stalk.add(mesh(cylinder(r * 0.95, r, segH - 0.02, 10), greens[i % 3], 0, k * segH + segH / 2, 0));
      stalk.add(mesh(cylinder(r * 1.18, r * 1.18, 0.025, 10), node, 0, (k + 1) * segH, 0));
    }
    // Petites feuilles effilées en éventail au sommet et sur les derniers nœuds
    for (let k = 0; k < 7; k++) {
      const l = mesh(sphere(0.06, 8, 6), leaf);
      l.scale.set(0.45, 3.2, 0.1);
      const y = h - (k % 3) * segH * 0.9;
      const a = (k / 7) * Math.PI * 2 + i;
      l.position.set(Math.sin(a) * 0.14, y, Math.cos(a) * 0.14);
      l.rotation.set(Math.cos(a) * 1.0, 0, -Math.sin(a) * 1.0);
      stalk.add(l);
    }
    stalk.userData = { phase: i * 0.9, lean: (sx * 0.12), leanZ: (sz * 0.12) };
    g.add(stalk);
    stalks.push(stalk);
  });
  scene.add(g);
  return stalks;
}

/** Maneki-neko doré sur un socle de pierre : chat assis qui salue de sa patte levée, clochette au cou. */
function buildManekiNeko(scene, [x, z]) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  // Tourné vers le centre du plateau
  g.rotation.y = Math.atan2(-x, -z);
  const stone = mat('#8a8f98', { roughness: 0.95 });
  g.add(mesh(cylinder(0.3, 0.34, 0.22, 8), stone, 0, 0.11, 0));
  g.add(mesh(cylinder(0.33, 0.33, 0.03, 8), mat('#6f747c', { roughness: 0.95 }), 0, 0.235, 0));

  const gold = mat('#e8b830', { metalness: 0.9, roughness: 0.28, emissive: '#7a5200', emissiveIntensity: 0.25 });
  const cat = new THREE.Group();
  cat.position.y = 0.25;
  g.add(cat);
  // Corps assis (poire), tête ronde et oreilles
  const body = mesh(sphere(0.2, 24, 16), gold, 0, 0.2, 0);
  body.scale.set(1, 1.1, 0.9);
  cat.add(body);
  const head = mesh(sphere(0.17, 24, 16), gold, 0, 0.5, 0.02);
  head.scale.set(1.12, 0.95, 0.95);
  cat.add(head);
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.06, 0.1, 4), gold, sx * 0.11, 0.65, 0.0);
    ear.rotation.set(0, Math.PI / 4, -sx * 0.35);
    cat.add(ear);
  }
  // Visage : yeux en croissants, museau et moustaches sombres
  const ink = mat('#3a2a10', { roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const eye = mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), ink, sx * 0.065, 0.53, 0.168);
    eye.rotation.z = Math.PI;
    cat.add(eye);
    for (const dy of [-0.012, 0.012]) {
      const w = mesh(cylinder(0.0025, 0.0025, 0.09, 4), ink, sx * 0.1, 0.47 + dy, 0.15);
      w.rotation.z = Math.PI / 2 + sx * dy * 8;
      cat.add(w);
    }
  }
  cat.add(mesh(sphere(0.018, 10, 8), mat('#d9536b', { roughness: 0.5 }), 0, 0.475, 0.175));
  // Collier rouge et clochette dorée
  const collar = mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28), mat('#c8282b', { roughness: 0.5 }), 0, 0.36, 0.02);
  collar.rotation.x = Math.PI / 2 - 0.15;
  cat.add(collar);
  cat.add(mesh(sphere(0.035, 14, 10), gold, 0, 0.32, 0.17));
  // Patte droite posée sur une pièce, patte gauche levée qui salue (articulée à l'épaule)
  const coin = mesh(cylinder(0.07, 0.07, 0.015, 18), gold, 0.08, 0.17, 0.17);
  coin.rotation.x = Math.PI / 2 - 0.2;
  coin.scale.z = 1.4;
  cat.add(coin);
  cat.add(mesh(sphere(0.05, 14, 10), gold, 0.08, 0.2, 0.16));
  const paw = new THREE.Group();
  paw.position.set(-0.15, 0.36, 0.06);
  const arm = mesh(sphere(0.05, 14, 10), gold, 0, 0.1, 0);
  arm.scale.set(0.9, 1.9, 0.9);
  paw.add(arm);
  paw.add(mesh(sphere(0.055, 14, 10), gold, 0, 0.2, 0.02));
  cat.add(paw);
  // Queue enroulée sur le côté
  const tail = mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20, Math.PI * 1.2), gold, 0.15, 0.08, -0.08);
  tail.rotation.set(Math.PI / 2, 0, 0.4);
  cat.add(tail);
  const glow = new THREE.PointLight('#ffcf5a', 0.8, 1.6, 1.8);
  glow.position.set(0, 0.8, 0.4);
  g.add(glow);
  scene.add(g);
  return paw;
}

/** Décor du thème : cerisier entre Recherche et Docs, bambous entre Planification et Code,
 * maneki-neko entre Docs et Planification (à la place de la corbeille), Yamato à quai. */
export function japonDecor(scene) {
  const petals = buildCherry(scene, [-6.7, -2.4]);
  const bamboos = buildBambooGrove(scene, [2.35, -6.5]);
  const paw = buildManekiNeko(scene, [-2.45, -5.3]);
  buildYamato(scene, 8.4 * Math.cos(Math.PI / 8), 0.5);
  return (t) => {
    // Le maneki-neko salue : la patte se lève et s'abaisse doucement
    paw.rotation.x = -0.15 + Math.sin(t * 2.4) * 0.35;
    // Pétales de cerisier qui tombent en spirale, puis repartent du houppier.
    for (const p of petals) {
      const u = p.userData;
      const k = (t * 0.12 + u.phase) % 1;
      if (k < 0.01) u.a = Math.random() * Math.PI * 2;
      const d = u.d + k * 0.9;
      p.position.set(Math.cos(u.a + k * 3) * d + k * 0.6, 2.3 * (1 - k) + 0.05, Math.sin(u.a + k * 3) * d);
      p.rotation.set(t * u.spin, t * u.spin * 0.7, 0);
    }
    // Bambous qui ondulent doucement au vent
    for (const b of bamboos) {
      const u = b.userData;
      b.rotation.set(u.leanZ + Math.sin(t * 0.9 + u.phase) * 0.03, 0, -u.lean + Math.sin(t * 1.3 + u.phase) * 0.035);
    }
  };
}
