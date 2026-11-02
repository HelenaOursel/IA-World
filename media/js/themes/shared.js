// Pièces communes aux thèmes : morceaux de personnages et peinture du sol.
import * as THREE from '../../vendor/three.module.min.js';
import { mat, mesh, neon, roundedBox, sphere } from '../geometry.js';

let glowTex;
/** Halo circulaire projeté au sol sous le personnage. */
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.userData.shared = true;
  return glowTex;
}

const screenCache = new Map();
/** Plaque d'écran aux coins arrondis (épaisseur 2 cm, bord biseauté). */
export function screenGeometry(w, h, r) {
  const key = [w, h, r].join(':');
  if (screenCache.has(key)) return screenCache.get(key);
  const x = -w / 2, y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 14 });
  g.userData.shared = true;
  screenCache.set(key, g);
  return g;
}

export function addGlow(ch, size, color, opacity = 1) {
  ch.glow = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(color).multiplyScalar(0.8 * opacity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  ch.glow.rotation.x = -Math.PI / 2;
  ch.glow.position.y = 0.015;
  ch.chassis.add(ch.glow);
}

export function addBody(ch, y) {
  ch.body = new THREE.Group();
  ch.bodyY = y;
  ch.body.position.y = y;
  ch.chassis.add(ch.body);
  return ch.body;
}

/** Plan transparent sur lequel le visage (yeux, bouche) est dessiné. */
export function addFace(parent, ch, w, h, x, y, z, brightness = 1.7) {
  ch.faceCanvas = document.createElement('canvas');
  ch.faceCanvas.width = 192;
  ch.faceCanvas.height = 120;
  ch.faceTex = new THREE.CanvasTexture(ch.faceCanvas);
  ch.faceTex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: ch.faceTex, transparent: true, depthWrite: false });
  m.color.setScalar(brightness);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  face.position.set(x, y, z);
  parent.add(face);
  return face;
}

/** Antenne : la boule capte les prompts (signal) et clignote quand le personnage réfléchit. */
export function addAntenna(parent, ch, y, { stem = 0.16, stemColor = '#2a2f3c', ball = 0.045, x = 0 } = {}) {
  ch.antenna = new THREE.Group();
  ch.antenna.position.set(x, y, 0);
  if (stem) ch.antenna.add(mesh(roundedBox(0.022, stem, 0.022, 0.01, 2), mat(stemColor, { metalness: 0.5, roughness: 0.3 }), 0, stem / 2, 0));
  ch.antennaBall = new THREE.Mesh(sphere(ball, 18, 12), neon(ch.color, 2));
  ch.antennaBall.position.y = stem + ball * 0.4;
  ch.antenna.add(ch.antennaBall);
  parent.add(ch.antenna);
}

/** Bras en deux segments ; `upper`/`fore` construisent les maillages de chaque segment. */
export function addArms(parent, ch, { x, y, z = 0.02, elbowY, upper, fore }) {
  const make = (sx) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * x, y, z);
    upper(shoulder, sx);
    const elbow = new THREE.Group();
    elbow.position.y = elbowY;
    fore(elbow, sx);
    shoulder.add(elbow);
    parent.add(shoulder);
    return { shoulder, elbow };
  };
  ch.armL = make(-1);
  ch.armR = make(1);
}

/** Taches douces (neige, mousse) : `colors` en "r,g,b". */
export function paintBlotches(g, size, colors, count, alpha, rMin, rMax) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = rMin + Math.random() * (rMax - rMin);
    const c = colors[i % colors.length];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${c},${alpha})`);
    grad.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
