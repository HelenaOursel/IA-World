// Détails d'intérieur de vaisseau (thème Vaisseau) : projecteurs holographiques sur les côtés,
// une grille d'aération au sol, et peinture du sol à circuits imprimés.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon } from '../../geometry.js';

const hull = () => mat('#3a404c', { metalness: 0.6, roughness: 0.4 });
const dark = () => mat('#1e2229', { metalness: 0.5, roughness: 0.45 });
/** Rapproche un point du centre de `d` mètres (pour placer le mur à l'intérieur du bord). */
const inset = ([x, z], d) => {
  const l = Math.hypot(x, z);
  return [x * (1 - d / l), z * (1 - d / l)];
};

const HOLO = '#5ab0ff';

/** Matériau d'hologramme : grille lumineuse bleutée, en mélange additif. */
const holoGrid = (opacity = 0.65) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(HOLO).multiplyScalar(1.6), wireframe: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

/** Petit chasseur stellaire en grille : fuselage, cockpit, deux paires d'ailes et réacteurs. */
function holoStarfighter() {
  const g = new THREE.Group();
  const m = holoGrid();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 6, 3), m);
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), m).translateZ(-0.12).translateY(0.05));
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.16, 3, 1, 1), m);
      wing.position.set(sx * 0.24, sy * 0.06, -0.2);
      wing.rotation.z = sx * sy * 0.22;
      g.add(wing);
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8, 1, true), m);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(sx * 0.12, sy * 0.06, -0.25);
      g.add(engine);
    }
  }
  return { g, materials: [m] };
}

/** Carte de galaxie : bras spiraux de points lumineux autour d'un cœur. */
function holoGalaxy() {
  const g = new THREE.Group();
  const n = 600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const arm = i % 3;
    const r = Math.pow(Math.random(), 0.7) * 0.55;
    const a = r * 9 + (arm * Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.5;
    pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.04, Math.sin(a) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.PointsMaterial({ color: new THREE.Color(HOLO).multiplyScalar(1.8), size: 0.025, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  g.add(new THREE.Points(geo, stars));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), neon('#cfe4ff', 2));
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.005, 6, 64), neon(HOLO, 1, { transparent: true, opacity: 0.5 }));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.rotation.x = 0.35;
  return { g, materials: [stars] };
}

/** Projecteur holographique : socle, cône de lumière, et l'hologramme (`kind`) qui tourne et scintille. */
function holoProjector(scene, spot, kind) {
  const [x, z] = inset(spot, 0.9);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, -z);
  scene.add(g);
  g.add(mesh(cylinder(0.42, 0.5, 0.14, 28), dark(), 0, 0.07, 0));
  g.add(mesh(cylinder(0.3, 0.38, 0.12, 28), hull(), 0, 0.2, 0));
  const emitter = new THREE.Mesh(new THREE.CircleGeometry(0.24, 28), neon(HOLO, 1.3));
  emitter.rotation.x = -Math.PI / 2;
  emitter.position.y = 0.262;
  g.add(emitter);
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.24, 0.9, 28, 1, true),
    neon(HOLO, 0.7, { transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  cone.position.y = 0.71;
  g.add(cone);
  const holo = kind === 'galaxy' ? holoGalaxy() : holoStarfighter();
  holo.g.position.y = 1.25;
  g.add(holo.g);
  return (t) => {
    holo.g.rotation.y = t * (kind === 'galaxy' ? 0.2 : 0.5);
    if (kind !== 'galaxy') holo.g.position.y = 1.25 + Math.sin(t * 1.4) * 0.04;
    // Scintillement occasionnel, comme une transmission imparfaite
    const flicker = Math.sin(t * 31 + x) > 0.94 ? 0.35 : 1;
    for (const m of holo.materials) m.opacity = (kind === 'galaxy' ? 0.9 : 0.65) * flicker;
    cone.material.opacity = 0.07 + Math.sin(t * 2.2 + x) * 0.02;
  };
}

/** Grille d'aération ronde au sol, avec une lueur qui respire en dessous. */
function vent(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.012, z);
  scene.add(g);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), neon('#5ab0ff', 0.6, { transparent: true, opacity: 0.5 }));
  glow.rotation.x = -Math.PI / 2;
  g.add(glow);
  g.add(mesh(new THREE.TorusGeometry(0.44, 0.04, 8, 32), dark()).rotateX(Math.PI / 2));
  for (let k = -3; k <= 3; k++) g.add(mesh(new THREE.BoxGeometry(0.8 * Math.sqrt(1 - (k / 3.6) ** 2), 0.025, 0.035), dark(), 0, 0.012, k * 0.11));
  return (t) => (glow.material.opacity = 0.35 + Math.sin(t * 1.5 + x) * 0.15);
}

/** Ajoute tout l'intérieur du vaisseau ; renvoie animate(t, dt). */
export function shipInterior(scene) {
  const parts = [
    // Sur les côtés, à l'écart des postes et des holocrons
    holoProjector(scene, [7.76, 2.2], 'starfighter'),
    holoProjector(scene, [-7.76, 2.2], 'galaxy'),
    vent(scene, 2.7, -2.1),
  ];
  return (t) => {
    for (const animate of parts) animate(t);
  };
}

/** Sol du vaisseau : plaques sombres et pistes de circuits imprimés gravées. */
export function paintShipFloor(g, size, k, px) {
  g.fillStyle = '#23272f';
  g.fillRect(0, 0, size, size);
  const R = size / (2 * k);
  // Plaques
  for (let x = -R; x < R; x += 1.2) {
    for (let z = -R; z < R; z += 1.2) {
      const [a, b] = px(x, z);
      const shade = 42 + Math.floor(Math.random() * 6);
      g.fillStyle = `rgb(${shade},${shade + 4},${shade + 11})`;
      g.fillRect(a + 2, b + 2, 1.2 * k - 4, 1.2 * k - 4);
    }
  }
  // Pistes de circuits : segments à angles droits, avec des pastilles aux extrémités
  g.lineWidth = 3;
  for (let i = 0; i < 110; i++) {
    let x = Math.random() * size, y = Math.random() * size;
    g.strokeStyle = Math.random() < 0.15 ? 'rgba(90,176,255,0.45)' : 'rgba(120,135,160,0.28)';
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      if (s % 2) y += (Math.random() - 0.5) * 120;
      else x += (Math.random() - 0.5) * 160;
      g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = g.strokeStyle;
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
}
