// Apparences des personnages, une par thème : robot, pingouin, astronaute, slime.
// Chaque apparence construit les mêmes pièces sur le personnage (corps, visage, bras, antenne, halo)
// pour que toutes les animations de Character fonctionnent quel que soit le thème.
import * as THREE from '../vendor/three.module.min.js';
import { mat, mesh, neon, roundedBox, sphere } from './geometry.js';

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
  return glowTex;
}

const screenCache = new Map();
/** Plaque d'écran aux coins arrondis (épaisseur 2 cm, bord biseauté). */
function screenGeometry(w, h, r) {
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
  screenCache.set(key, g);
  return g;
}

// ------------------------------------------------------------ pièces communes

function addGlow(ch, size, color, opacity = 1) {
  ch.glow = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(color).multiplyScalar(0.8 * opacity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  ch.glow.rotation.x = -Math.PI / 2;
  ch.glow.position.y = 0.015;
  ch.chassis.add(ch.glow);
}

function addBody(ch, y) {
  ch.body = new THREE.Group();
  ch.bodyY = y;
  ch.body.position.y = y;
  ch.chassis.add(ch.body);
  return ch.body;
}

/** Plan transparent sur lequel le visage (yeux, bouche) est dessiné. */
function addFace(parent, ch, w, h, x, y, z, brightness = 1.7) {
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
function addAntenna(parent, ch, y, { stem = 0.16, stemColor = '#2a2f3c', ball = 0.045, x = 0 } = {}) {
  ch.antenna = new THREE.Group();
  ch.antenna.position.set(x, y, 0);
  if (stem) ch.antenna.add(mesh(roundedBox(0.022, stem, 0.022, 0.01, 2), mat(stemColor, { metalness: 0.5, roughness: 0.3 }), 0, stem / 2, 0));
  ch.antennaBall = new THREE.Mesh(sphere(ball, 18, 12), neon(ch.color, 2));
  ch.antennaBall.position.y = stem + ball * 0.4;
  ch.antenna.add(ch.antennaBall);
  parent.add(ch.antenna);
}

/** Bras en deux segments ; `upper`/`fore` construisent les maillages de chaque segment. */
function addArms(parent, ch, { x, y, z = 0.02, elbowY, upper, fore }) {
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

// ---------------------------------------------------------------------- robot

function buildRobot(ch) {
  const S = ch.size;
  addGlow(ch, S * 1.5, ch.color);
  // Cube laqué de la couleur du robot, coins très arrondis, qui lévite
  const b = addBody(ch, 0.16 + S / 2);
  const shell = new THREE.MeshPhysicalMaterial({ color: ch.color, metalness: 0.2, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  b.add(mesh(roundedBox(S, S, S, S * 0.2), shell));
  // Écran noir arrondi sur la face avant, qui contient les yeux
  b.add(mesh(screenGeometry(S * 0.8, S * 0.55, S * 0.15), new THREE.MeshPhysicalMaterial({ color: '#05070c', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }), 0, S * 0.04, S / 2 - 0.012));
  addFace(b, ch, S * 0.76, S * 0.475, 0, S * 0.04, S / 2 + 0.018);
  addAntenna(b, ch, S / 2);
  const armMat = mat('#151924', { metalness: 0.4, roughness: 0.35 });
  addArms(b, ch, {
    x: S / 2 + 0.02,
    y: -S * 0.08,
    elbowY: -0.14,
    upper: (g) => g.add(mesh(roundedBox(0.085, 0.17, 0.085, 0.042, 4), armMat, 0, -0.065, 0)),
    fore: (g) => {
      g.add(mesh(roundedBox(0.08, 0.15, 0.08, 0.04, 4), armMat, 0, -0.06, 0));
      g.add(mesh(sphere(0.062, 18, 12), shell, 0, -0.16, 0));
    },
  });
  return { hand: -0.16, top: S / 2 + 0.5 };
}

// ------------------------------------------------------------------- pingouin

function buildPenguin(ch) {
  const S = ch.size;
  const R = S * 0.52;
  addGlow(ch, S * 1.3, '#bfe6ff', 0.35);
  // Pattes orange posées au sol
  const orange = mat('#ff9f2e', { roughness: 0.5 });
  ch.feet = [-1, 1].map((sx) => {
    const f = mesh(sphere(0.075, 16, 10), orange, sx * R * 0.38, 0.035, R * 0.35);
    f.scale.set(1, 0.45, 1.5);
    ch.chassis.add(f);
    return f;
  });
  // Corps en forme d'œuf, ventre blanc
  const b = addBody(ch, R * 1.12 + 0.03);
  const egg = mesh(sphere(R, 32, 22), new THREE.MeshPhysicalMaterial({ color: '#1d2535', roughness: 0.45, clearcoat: 0.4 }));
  egg.scale.set(1, 1.12, 0.96);
  b.add(egg);
  const white = mat('#f6f8fc', { roughness: 0.6 });
  const belly = mesh(sphere(R * 0.86, 30, 20), white, 0, -R * 0.12, R * 0.4);
  belly.scale.set(0.92, 1.05, 0.75);
  b.add(belly);
  const mask = mesh(sphere(R * 0.56, 28, 18), white, 0, R * 0.34, R * 0.6);
  mask.scale.set(1.25, 0.78, 0.8);
  b.add(mask);
  addFace(b, ch, S * 0.62, S * 0.39, 0, R * 0.32, R * 1.07, 1);
  // Bec orange qui s'ouvre quand il parle
  ch.beak = mesh(new THREE.ConeGeometry(0.05, 0.11, 16), orange, 0, R * 0.12, R * 1.1);
  ch.beak.rotation.x = Math.PI / 2;
  b.add(ch.beak);
  // Bonnet et écharpe de sa couleur ; le pompon sert d'antenne
  const wool = mat(ch.color, { roughness: 0.85 });
  const hat = mesh(new THREE.SphereGeometry(R * 0.66, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), wool, 0, R * 0.78, 0);
  hat.scale.set(1, 0.85, 1);
  b.add(hat);
  const brim = mesh(new THREE.TorusGeometry(R * 0.64, 0.035, 10, 32), mat('#f6f8fc', { roughness: 0.9 }), 0, R * 0.8, 0);
  brim.rotation.x = Math.PI / 2;
  b.add(brim);
  const scarf = mesh(new THREE.TorusGeometry(R * 0.93, 0.05, 12, 36), wool, 0, -R * 0.05, 0);
  scarf.rotation.x = Math.PI / 2;
  b.add(scarf);
  addAntenna(b, ch, R * 0.78 + R * 0.55, { stem: 0, ball: 0.07 });
  // Ailerons
  const dark = mat('#1d2535', { roughness: 0.5 });
  addArms(b, ch, {
    x: R * 0.92,
    y: R * 0.05,
    elbowY: -0.22,
    upper: (g) => {
      const fl = mesh(sphere(0.12, 18, 12), dark, 0, -0.1, 0);
      fl.scale.set(0.35, 1, 0.75);
      g.add(fl);
    },
    fore: () => {},
  });
  return {
    hand: 0,
    top: R * 1.5 + 0.4,
    hover: 0,
    squash: 0.012,
    eye: '#121722',
    glow: false,
    mouthless: true,
    // Se dandine en marchant, ouvre le bec quand il parle
    animate(c, dt, t, moving) {
      if (moving) {
        c.body.rotation.z += Math.sin(t * 13) * 0.16;
        c.feet[0].position.y = 0.035 + Math.max(0, Math.sin(t * 13)) * 0.05;
        c.feet[1].position.y = 0.035 + Math.max(0, -Math.sin(t * 13)) * 0.05;
      }
      const open = c.action === 'talk' || c.action === 'ask' ? Math.abs(Math.sin(t * 11)) : 0;
      c.beak.scale.set(1, 1 + open * 0.25, 1 - open * 0.15);
    },
  };
}

// ----------------------------------------------------------------- astronaute

function buildAstronaut(ch) {
  const S = ch.size;
  addGlow(ch, S * 1.4, ch.color, 0.7);
  const suit = new THREE.MeshPhysicalMaterial({ color: '#cfd5de', roughness: 0.6, clearcoat: 0.25 });
  const accent = mat(ch.color, { roughness: 0.45 });
  const legY = 0.13;
  // Petites jambes et bottes, articulées à la hanche pour marcher
  ch.legs = [-1, 1].map((sx) => {
    const hip = new THREE.Group();
    hip.position.set(sx * S * 0.17, 0.2, 0);
    hip.add(mesh(roundedBox(0.13, 0.16, 0.15, 0.06, 4), suit, 0, -0.064, 0));
    hip.add(mesh(roundedBox(0.15, 0.06, 0.19, 0.03, 4), mat('#59606e'), 0, -0.15, 0.02));
    ch.chassis.add(hip);
    return hip;
  });
  // Combinaison, sac à dos et plastron de sa couleur
  const torsoH = S * 0.56;
  const b = addBody(ch, 0.2 + legY + torsoH / 2);
  b.add(mesh(roundedBox(S * 0.74, torsoH, S * 0.52, 0.11), suit));
  b.add(mesh(roundedBox(S * 0.36, S * 0.18, 0.03, 0.02, 4), accent, 0, -S * 0.02, S * 0.26));
  b.add(mesh(roundedBox(S * 0.58, S * 0.5, S * 0.24, 0.06), mat('#c9ced8', { roughness: 0.5 }), 0, S * 0.04, -S * 0.36));
  // Casque à visière noire ; les yeux brillent dans la visière
  const headY = torsoH / 2 + S * 0.3;
  b.add(mesh(sphere(S * 0.4, 32, 22), suit, 0, headY, 0));
  const visor = mesh(sphere(S * 0.33, 32, 22), new THREE.MeshPhysicalMaterial({ color: '#06080f', metalness: 0.4, roughness: 0.1, clearcoat: 1 }), 0, headY - S * 0.01, S * 0.2);
  visor.scale.set(1, 0.85, 0.8);
  b.add(visor);
  addFace(b, ch, S * 0.5, S * 0.31, 0, headY - S * 0.01, S * 0.2 + S * 0.33 * 0.8 + 0.004);
  addAntenna(b, ch, headY + S * 0.32, { stem: 0.12, stemColor: '#9aa3ad', x: S * 0.16 });
  addArms(b, ch, {
    x: S * 0.4,
    y: torsoH * 0.28,
    elbowY: -0.14,
    upper: (g) => g.add(mesh(roundedBox(0.1, 0.17, 0.1, 0.05, 4), suit, 0, -0.065, 0)),
    fore: (g) => {
      g.add(mesh(roundedBox(0.095, 0.15, 0.095, 0.047, 4), suit, 0, -0.06, 0));
      g.add(mesh(sphere(0.06, 16, 10), accent, 0, -0.16, 0));
    },
  });
  return {
    hand: -0.16,
    top: headY + S * 0.4 + 0.45,
    hover: 0.05,
    // Les jambes se balancent quand il se déplace, et reviennent droites à l'arrêt
    animate(c, dt, t, moving) {
      const swing = moving ? Math.sin(t * 10) * 0.55 : 0;
      const k = 1 - Math.exp(-dt * 10);
      c.legs[0].rotation.x += (swing - c.legs[0].rotation.x) * k;
      c.legs[1].rotation.x += (-swing - c.legs[1].rotation.x) * k;
    },
  };
}

// ---------------------------------------------------------------------- slime

function buildSlime(ch) {
  const S = ch.size;
  addGlow(ch, S * 1.6, ch.color, 0.9);
  const R = S * 0.52;
  const b = addBody(ch, R * 0.82);
  const color = new THREE.Color(ch.color);
  // Gelée translucide avec un noyau plus clair et un reflet
  const jelly = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.78, emissive: color, emissiveIntensity: 0.18 });
  ch.blob = mesh(sphere(R, 36, 24), jelly);
  ch.blob.scale.set(1.08, 0.84, 1.04);
  b.add(ch.blob);
  const core = new THREE.Mesh(sphere(R * 0.32, 20, 14), neon(color.clone().offsetHSL(0, 0, 0.15), 1.2));
  core.position.set(0, -R * 0.15, -R * 0.1);
  b.add(core);
  const shine = mesh(sphere(R * 0.16, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), -R * 0.45, R * 0.42, R * 0.6);
  shine.scale.set(1.3, 0.7, 0.5);
  b.add(shine);
  addFace(b, ch, S * 0.62, S * 0.39, 0, R * 0.08, R * 1.04 + 0.01, 1);
  // Petite pousse sur le dessus, avec une goutte lumineuse
  addAntenna(b, ch, R * 0.8, { stem: 0.09, stemColor: '#6fbf4a', ball: 0.04 });
  // Petits bras en gelée
  addArms(b, ch, {
    x: R * 1.02,
    y: -R * 0.1,
    elbowY: -0.09,
    upper: (g) => g.add(mesh(sphere(0.06, 16, 10), jelly, 0, -0.04, 0)),
    fore: (g) => g.add(mesh(sphere(0.055, 16, 10), jelly, 0, -0.05, 0)),
  });
  return {
    hand: -0.05,
    top: R * 0.85 + 0.55,
    hover: 0,
    squash: 0.05,
    eye: '#1a1030',
    glow: false,
    // Sautille en se déplaçant et tremblote comme de la gelée
    animate(c, dt, t, moving) {
      if (moving) {
        const hop = Math.abs(Math.sin(t * 8));
        c.body.position.y += hop * 0.16;
        const s = 1 + (1 - hop) * 0.18;
        c.body.scale.set(Math.sqrt(s), 1 / s, Math.sqrt(s));
      }
      c.blob.rotation.y = Math.sin(t * 3 + c.phase) * 0.05;
    },
  };
}

export const SKINS = { robot: buildRobot, penguin: buildPenguin, astronaut: buildAstronaut, slime: buildSlime };
