// Décor : plate-forme d'usine futuriste flottante, postes de travail et machines.
import * as THREE from '../vendor/three.module.min.js';
import { CanvasScreen, cylinder, mat, metal, mesh, neon, roundRect, roundedBox, scanlines, sphere } from './geometry.js';
import { drawDoodles } from './doodles.js';

const R = 8.4; // rayon de la plate-forme octogonale
const MARK = '#8fa0bb'; // couleur neutre des marquages au sol
const APOTHEM = R * Math.cos(Math.PI / 8);

// Emplacement des postes (x, z). L'avant de la plate-forme (z > 0) fait face à la caméra.
const LAYOUT = {
  plan: [0, -5.7],
  read: [-4.4, -3.9],
  search: [-5.8, 0.5],
  web: [-4.1, 4.2],
  agent: [4.1, 4.2],
  bash: [5.8, 0.5],
  write: [4.4, -3.9],
  trash: [-2.4, -4.95],
};

export const STATION_COLORS = {
  plan: '#ffc53d',
  read: '#4cc9f0',
  search: '#3ddc97',
  web: '#f15bb5',
  agent: '#9b5de5',
  bash: '#39ff9f',
  write: '#4d8dff',
  trash: '#7bd88f',
  dock: '#ff7a1a',
};

export const STATION_NAMES = {
  plan: 'PLANIFICATION',
  read: 'DOCS',
  search: 'RECHERCHE',
  web: 'RÉSEAU',
  agent: 'ASSEMBLAGE',
  bash: 'TERMINAL',
  write: 'CODE',
  trash: 'CORBEILLE',
  dock: 'RECHARGE',
};

class Station {
  constructor(key, x, z, spotDist = 0.78) {
    this.key = key;
    this.color = STATION_COLORS[key];
    this.pos = new THREE.Vector3(x, 0, z);
    this.dir = new THREE.Vector3(-x, 0, -z).normalize();
    this.side = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
    this.spotDist = spotDist;
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.group.rotation.y = Math.atan2(this.dir.x, this.dir.z);
    this.occupants = [];
    this.busy = false;
  }

  claim(id) {
    if (!this.occupants.includes(id)) {
      const free = this.occupants.indexOf(null);
      if (free >= 0) this.occupants[free] = id;
      else this.occupants.push(id);
    }
    return this.spotFor(id);
  }

  release(id) {
    const i = this.occupants.indexOf(id);
    if (i >= 0) this.occupants[i] = null;
  }

  spotFor(id) {
    const i = Math.max(0, this.occupants.indexOf(id));
    // Le premier robot est au clavier, les suivants l'entourent.
    const lateral = [0, -1.0, 1.0, -1.9, 1.9, -2.7, 2.7][i % 7];
    const back = (i > 0 ? 0.45 : 0) + Math.floor(i / 7) * 0.9;
    const p = this.pos.clone().addScaledVector(this.dir, this.spotDist + back).addScaledVector(this.side, lateral);
    const toStation = this.pos.clone().sub(p);
    return { pos: p, face: Math.atan2(toStation.x, toStation.z) };
  }
}

const DOCK_ANGLES = [Math.PI, Math.PI - 0.8, Math.PI + 0.8, Math.PI - 1.6, Math.PI + 1.6, 0.8, -0.8, 0];
const DOCK_R = 2.05;

class Dock extends Station {
  constructor() {
    super('dock', 0, 0, 0);
    this.group.rotation.y = 0;
  }

  spotFor(id) {
    const i = Math.max(0, this.occupants.indexOf(id));
    // Le premier emplacement est derrière la borne, face à la caméra.
    const a = DOCK_ANGLES[i % DOCK_ANGLES.length];
    const r = DOCK_R + Math.floor(i / DOCK_ANGLES.length) * 0.9;
    const p = new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
    return { pos: p, face: Math.atan2(-p.x, -p.z) };
  }
}

// ---------------------------------------------------------- dessins d'écran

const NEON_TOKENS = ['#4cc9f0', '#b388ff', '#3ddc97', '#ffc53d', '#f15bb5', '#7b9cff', '#e6edf7'];

export function randomCodeRow() {
  const indent = Math.floor(Math.random() * 4);
  const tokens = [];
  const n = 1 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) tokens.push({ w: 18 + Math.random() * 70, c: NEON_TOKENS[Math.floor(Math.random() * NEON_TOKENS.length)] });
  return { indent, tokens };
}

function fitText(ctx, text, max) {
  let t = text;
  while (ctx.measureText(t).width > max && t.length > 4) t = t.slice(0, -2);
  return t === text ? t : t + '…';
}

function screenFrame(ctx, w, h, color, title) {
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0c1424';
  ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = color;
  ctx.fillRect(0, 42, w, 2);
  ctx.font = '600 20px Consolas, "Cascadia Code", monospace';
  ctx.fillText(fitText(ctx, title, w - 40), 18, 30);
}

function drawCode(ctx, w, h, code) {
  screenFrame(ctx, w, h, STATION_COLORS.write, '▸ ' + code.file);
  code.rows.slice(-10).forEach((row, i) => {
    const y = 62 + i * 32;
    ctx.fillStyle = '#34415e';
    ctx.font = '16px Consolas, monospace';
    ctx.fillText(String(code.scroll + i + 1).padStart(3, ' '), 10, y + 13);
    let x = 58 + row.indent * 26;
    for (const t of row.tokens) {
      ctx.fillStyle = t.c;
      roundRect(ctx, x, y, t.w, 14, 7);
      ctx.fill();
      x += t.w + 11;
    }
  });
  scanlines(ctx, w, h);
}

function drawTerminal(ctx, w, h, lines) {
  ctx.fillStyle = '#030807';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '21px Consolas, "Cascadia Code", monospace';
  const visible = lines.slice(-12);
  visible.forEach((l, i) => {
    ctx.fillStyle = l.c || '#a7f3d0';
    ctx.fillText(fitText(ctx, l.t, w - 30), 14, 32 + i * 30);
  });
  if (Math.floor(performance.now() / 500) % 2) {
    ctx.fillStyle = '#39ff9f';
    ctx.fillRect(14, 32 + visible.length * 30 - 19, 11, 22);
  }
  scanlines(ctx, w, h, 0.22);
}

function drawDocs(ctx, w, h, doc) {
  screenFrame(ctx, w, h, STATION_COLORS.read, '▤ ' + doc.file);
  doc.rows.forEach((row, i) => {
    const y = 64 + i * 26;
    if (y > h - 10) return;
    const current = i === doc.cursor;
    ctx.fillStyle = current ? 'rgba(76,201,240,0.18)' : 'transparent';
    ctx.fillRect(10, y - 6, w - 20, 22);
    ctx.fillStyle = current ? '#9be7ff' : row.title ? '#e6edf7' : '#5b6b88';
    roundRect(ctx, 20, y, row.w, row.title ? 12 : 9, 4);
    ctx.fill();
  });
  scanlines(ctx, w, h);
}

function drawRadar(ctx, w, h, s) {
  screenFrame(ctx, w, h, STATION_COLORS.search, '◎ ' + (s.query || 'recherche'));
  const cx = w / 2, cy = 44 + (h - 44) / 2, r = (h - 70) / 2;
  ctx.strokeStyle = 'rgba(61,220,151,0.35)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  const grad = ctx.createConicGradient ? ctx.createConicGradient(s.angle - 0.9, cx, cy) : null;
  if (grad) {
    grad.addColorStop(0, 'rgba(61,220,151,0)');
    grad.addColorStop(0.14, 'rgba(61,220,151,0.55)');
    grad.addColorStop(0.15, 'rgba(61,220,151,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3ddc97';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(s.angle) * r, cy + Math.sin(s.angle) * r);
  ctx.stroke();
  for (const b of s.blips) {
    ctx.fillStyle = `rgba(160,255,210,${b.life})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(b.a) * b.d * r, cy + Math.sin(b.a) * b.d * r, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  scanlines(ctx, w, h);
}

function drawNetwork(ctx, w, h, n) {
  screenFrame(ctx, w, h, STATION_COLORS.web, '⌁ ' + (n.host || 'réseau'));
  ctx.lineWidth = 2;
  for (const [a, b] of n.links) {
    ctx.strokeStyle = 'rgba(241,91,181,0.3)';
    ctx.beginPath();
    ctx.moveTo(n.nodes[a].x * w, n.nodes[a].y * h);
    ctx.lineTo(n.nodes[b].x * w, n.nodes[b].y * h);
    ctx.stroke();
  }
  n.links.forEach(([a, b], i) => {
    const k = (n.t * 0.6 + i * 0.37) % 1;
    ctx.fillStyle = '#ffd1ec';
    ctx.beginPath();
    ctx.arc((n.nodes[a].x + (n.nodes[b].x - n.nodes[a].x) * k) * w, (n.nodes[a].y + (n.nodes[b].y - n.nodes[a].y) * k) * h, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  n.nodes.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? '#ff9ad5' : '#f15bb5';
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, i === 0 ? 11 : 7, 0, Math.PI * 2);
    ctx.fill();
  });
  scanlines(ctx, w, h);
}

function drawBoard(ctx, w, h, todos, doodles) {
  screenFrame(ctx, w, h, STATION_COLORS.plan, '☰ PLAN DE TRAVAIL');
  if (!todos.length) {
    ctx.fillStyle = '#5b6b88';
    ctx.font = 'italic 24px system-ui, sans-serif';
    ctx.fillText('Aucune tâche pour l’instant…', 24, 100);
    drawDoodles(ctx, doodles);
    scanlines(ctx, w, h);
    return;
  }
  const shown = todos.slice(0, 7);
  shown.forEach((t, i) => {
    const y = 60 + i * 46;
    const done = t.status === 'completed', doing = t.status === 'in_progress';
    ctx.fillStyle = doing ? 'rgba(255,197,61,0.16)' : 'rgba(255,255,255,0.04)';
    roundRect(ctx, 16, y, w - 32, 38, 8);
    ctx.fill();
    ctx.fillStyle = done ? '#3ddc97' : doing ? '#ffc53d' : '#5b6b88';
    ctx.font = '700 22px Consolas, monospace';
    ctx.fillText(done ? '✓' : doing ? '▶' : '○', 30, y + 27);
    ctx.fillStyle = done ? '#56708a' : doing ? '#ffe7a8' : '#c4d0e4';
    ctx.font = `${doing ? '600 ' : ''}22px system-ui, sans-serif`;
    ctx.fillText(fitText(ctx, t.content, w - 100), 62, y + 27);
  });
  if (todos.length > shown.length) {
    ctx.fillStyle = '#5b6b88';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`+ ${todos.length - shown.length} autres`, w - 130, h - 12);
  }
  drawDoodles(ctx, doodles);
  scanlines(ctx, w, h);
}

// ---------------------------------------------------------- briques communes

function screenMesh(screen, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screen.texture }));
  m.material.color.setScalar(1.35);
  return m;
}

function label(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.font = '700 44px Consolas, "Cascadia Code", monospace';
  const tw = g.measureText(text).width + 70;
  const x = (512 - tw) / 2;
  g.fillStyle = 'rgba(6,10,20,0.85)';
  roundRect(g, x, 14, tw, 68, 14);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.arc(x + 30, 48, 8, 0, Math.PI * 2);
  g.fill();
  g.fillText(text, x + 50, 63);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  s.scale.set(2.0, 0.375, 1);
  return s;
}

/** Bureau bas avec écran et clavier, à la taille des robots. */
function workstation(st, draw, { sw = 1.05, sh = 0.62, cw = 512, ch = 320 } = {}) {
  const g = st.group;
  const c = st.color;
  g.add(mesh(roundedBox(1.7, 0.06, 0.72, 0.025), metal('#262d3a'), 0, 0.5, 0));
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.018, 0.018), neon(c, 2), 0, 0.5, 0.36));
  for (const x of [-0.8, 0.8]) g.add(mesh(roundedBox(0.07, 0.48, 0.64, 0.02), metal('#1a1f2a'), x, 0.24, 0));
  g.add(mesh(roundedBox(1.5, 0.3, 0.04, 0.015), metal('#151a24'), 0, 0.3, -0.28));

  g.add(mesh(roundedBox(0.66, 0.03, 0.22, 0.012), metal('#11151d'), 0, 0.545, 0.14));
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.18), new THREE.MeshBasicMaterial({ map: keyTexture(), transparent: true, color: c }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(0, 0.562, 0.14);
  g.add(keys);
  st.keys = keys;

  const monitorY = 0.95 + sh / 2 - 0.2;
  g.add(mesh(roundedBox(0.08, 0.36, 0.06, 0.02), metal('#2a3140'), 0, 0.7, -0.2));
  g.add(mesh(roundedBox(0.34, 0.03, 0.2, 0.01), metal('#2a3140'), 0, 0.53, -0.2));
  const monitor = new THREE.Group();
  monitor.position.set(0, monitorY, -0.2);
  monitor.rotation.x = -0.08;
  monitor.add(mesh(roundedBox(sw + 0.08, sh + 0.08, 0.05, 0.025), metal('#10141c')));
  st.screen = new CanvasScreen(cw, ch, draw);
  const face = screenMesh(st.screen, sw, sh);
  face.position.z = 0.027;
  monitor.add(face);
  monitor.add(mesh(new THREE.BoxGeometry(sw + 0.08, 0.012, 0.012), neon(c, 2.2), 0, -(sh + 0.08) / 2, 0.026));
  g.add(monitor);

  const l = label(STATION_NAMES[st.key], c);
  l.position.set(0, monitorY + sh / 2 + 0.42, -0.2);
  g.add(l);

  const light = new THREE.PointLight(c, 2.2, 3.2, 1.8);
  light.position.set(0, monitorY, 0.4);
  g.add(light);
  st.light = light;
  zoneMarker(st);
}

let keyTex;
function keyTexture() {
  if (keyTex) return keyTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let r = 0; r < 4; r++) for (let k = 0; k < 13; k++) {
    roundRect(g, 6 + k * 19 + (r % 2) * 6, 6 + r * 18, 14, 13, 3);
    g.fill();
  }
  keyTex = new THREE.CanvasTexture(c);
  return keyTex;
}

/** Anneau lumineux au sol devant le poste. */
function zoneMarker(st) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.43, 0.46, 48), neon(MARK, 0.8, { transparent: true, opacity: 0.35 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.012, st.spotDist);
  st.group.add(ring);
  st.ring = ring;
}

function octRim(radius, y, color, thickness = 0.04, intensity = 2) {
  const g = new THREE.Group();
  const ap = radius * Math.cos(Math.PI / 8);
  const len = 2 * radius * Math.sin(Math.PI / 8);
  const m = neon(color, intensity);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const b = new THREE.Mesh(new THREE.BoxGeometry(len + thickness, thickness, thickness), m);
    b.position.set(Math.sin(a) * ap, y, Math.cos(a) * ap);
    b.rotation.y = a;
    g.add(b);
  }
  return g;
}

function octagon(geo) {
  geo.rotateY(Math.PI / 8);
  return geo;
}

// ------------------------------------------------------------------ décor

function paintPanels(g, size, k, px, f) {
  g.fillStyle = f.bg ?? '#171c27';
  g.fillRect(0, 0, size, size);
  // Panneaux métalliques
  const [pr, pg, pb] = f.panel ?? [24, 28, 37];
  const jitter = f.jitter ?? 2;
  for (let x = -R; x < R; x += 1.2) {
    for (let z = -R; z < R; z += 1.2) {
      const [a, b] = px(x, z);
      const shade = Math.floor(Math.random() * jitter);
      g.fillStyle = `rgb(${pr + shade},${pg + shade},${pb + shade})`;
      g.fillRect(a + 2, b + 2, 1.2 * k - 4, 1.2 * k - 4);
      g.fillStyle = f.bolt ?? '#2c3343';
      for (const [dx, dy] of [[10, 10], [1.2 * k - 10, 10], [10, 1.2 * k - 10], [1.2 * k - 10, 1.2 * k - 10]]) {
        g.beginPath();
        g.arc(a + dx, b + dy, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}

function floorTexture(theme) {
  const fl = theme.floor ?? {};
  const mark = fl.mark ?? 'rgba(143,160,187,0.16)';
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const k = size / (2 * R);
  const px = (x, z) => [(x + R) * k, (z + R) * k];

  if (fl.paint) fl.paint(g, size);
  else paintPanels(g, size, k, px, fl);
  // Marquages jaunes en pointillés autour de chaque poste
  g.setLineDash([26, 18]);
  g.strokeStyle = mark;
  g.lineWidth = 5;
  for (const [x, z] of Object.values(LAYOUT)) {
    const [a, b] = px(x, z);
    g.save();
    g.translate(a, b);
    g.rotate(-Math.atan2(-x, -z));
    roundRect(g, -1.35 * k, -0.75 * k, 2.7 * k, 2.6 * k, 0.25 * k);
    g.stroke();
    g.restore();
  }
  g.setLineDash([]);
  // Zone hachurée autour de la borne centrale
  g.save();
  g.translate(...px(0, 0));
  g.strokeStyle = mark;
  g.lineWidth = 0.08 * k;
  g.setLineDash([0.22 * k, 0.22 * k]);
  g.beginPath();
  g.arc(0, 0, 2.75 * k, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildPlatform(scene, theme) {
  const p = theme.platform ?? {};
  const fl = theme.floor ?? {};
  const top = new THREE.CircleGeometry(R, 8);
  top.rotateX(-Math.PI / 2);
  octagon(top);
  const pos = top.attributes.position;
  const uv = top.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + R) / (2 * R), 1 - (pos.getZ(i) + R) / (2 * R));
  const floor = new THREE.Mesh(top, new THREE.MeshStandardMaterial({ map: floorTexture(theme), metalness: fl.metalness ?? 0.45, roughness: fl.roughness ?? 0.55 }));
  floor.receiveShadow = true;
  scene.add(floor);

  const side = octagon(new THREE.CylinderGeometry(R, R * 0.97, 0.55, 8, 1, true));
  scene.add(mesh(side, metal(p.side ?? '#202634'), 0, -0.275, 0));
  const band = octagon(new THREE.CylinderGeometry(R * 1.002, R * 1.002, 0.12, 8, 1, true));
  scene.add(mesh(band, metal(p.band ?? '#151a24'), 0, -0.1, 0));
  scene.add(octRim(R + 0.01, 0.01, p.rim ?? MARK, 0.03, p.rimIntensity ?? 1.0));
  // Sur la banquise, le dessous est sous l'eau : pas de gradins ni de propulseurs.
  if (p.underside === false) return [];

  // Dessous en gradins avec propulseurs
  const tiers = [[R * 0.97, R * 0.7, 1.1, -1.1], [R * 0.7, R * 0.38, 1.3, -2.3], [R * 0.38, R * 0.12, 1.0, -3.45]];
  tiers.forEach(([rt, rb, h, y], i) => {
    const tierColors = p.tiers ?? ['#232a39', '#1a1f2b'];
    const rims = p.tierRims ?? ['#4cc9f0', '#ff7a1a'];
    scene.add(mesh(octagon(new THREE.CylinderGeometry(rt, rb, h, 8)), metal(tierColors[i % 2]), 0, y, 0));
    scene.add(octRim(rb + 0.02, y - h / 2, i === 2 ? rims[1] : rims[0], 0.05, 1.8));
  });
  const thrusters = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const x = Math.sin(a) * R * 0.55, z = Math.cos(a) * R * 0.55;
    scene.add(mesh(cylinder(0.45, 0.6, 0.5, 20), metal('#2a3140'), x, -1.9, z));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.6, 20, 1, true), neon(p.thrusterColor ?? '#4cc9f0', 2.2, { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    flame.rotation.x = Math.PI;
    flame.position.set(x, -2.95, z);
    scene.add(flame);
    thrusters.push(flame);
  }
  return thrusters;
}

function buildRacks(scene) {
  const racks = [];
  for (const [x, z] of [[-2.35, -6.5], [2.35, -6.5], [-6.7, -2.4], [6.7, -2.4]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z);
    g.add(mesh(roundedBox(1.0, 2.3, 0.75, 0.04), metal('#141923'), 0, 1.15, 0));
    const screen = new CanvasScreen(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#05070c';
      ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 14; r++) {
        ctx.fillStyle = '#1b2230';
        ctx.fillRect(8, 8 + r * 17.5, w - 16, 13);
        for (let l = 0; l < 6; l++) {
          if (Math.random() < 0.45) {
            ctx.fillStyle = Math.random() < 0.8 ? '#39ff9f' : Math.random() < 0.5 ? '#4cc9f0' : '#ffc53d';
            ctx.fillRect(14 + l * 9, 12 + r * 17.5, 5, 5);
          }
        }
      }
    });
    const face = screenMesh(screen, 0.86, 2.1);
    face.position.set(0, 1.15, 0.38);
    g.add(face);
    scene.add(g);
    racks.push(screen);
  }
  return racks;
}

// Le tapis est décalé vers la gauche pour laisser la corbeille au bout de la ligne.
const CONVEYOR_X = -0.7;

function buildConveyor(scene, theme) {
  // Certains thèmes remplacent le tapis (rivière, train d'astéroïdes)
  if (theme.conveyor) return theme.conveyor(scene, { x: CONVEYOR_X, z: 6.3, edgeZ: APOTHEM - 0.02 });
  const g = new THREE.Group();
  g.position.set(CONVEYOR_X, 0, 6.3);
  g.add(mesh(roundedBox(5.6, 0.12, 0.8, 0.03), metal('#2a3140'), 0, 0.42, 0));
  for (const x of [-2.6, -0.9, 0.9, 2.6]) for (const z of [-0.33, 0.33]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), metal('#1a1f2a'), x, 0.2, z));
  const beltMat = new THREE.MeshStandardMaterial({ color: '#2b3039', roughness: 0.8 });
  const belt = mesh(new THREE.BoxGeometry(5.4, 0.03, 0.6), beltMat, 0, 0.495, 0);
  g.add(belt);
  for (const z of [-0.34, 0.34]) g.add(mesh(new THREE.BoxGeometry(5.6, 0.03, 0.02), neon(MARK, 0.7), 0, 0.49, z));
  const crates = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Group();
    c.add(mesh(roundedBox(0.4, 0.34, 0.4, 0.03), metal('#343c4c')));
    c.add(mesh(new THREE.BoxGeometry(0.41, 0.03, 0.41), neon(['#4cc9f0', '#ff7a1a', '#9b5de5', '#3ddc97', '#ffc53d'][i], 0.9)));
    c.userData.x = -2.6 + i * 1.1;
    g.add(c);
    crates.push(c);
  }
  scene.add(g);
  return (t, dt) => {
    for (const c of crates) {
      c.userData.x += dt * 0.45;
      if (c.userData.x > 2.75) c.userData.x -= 5.5;
      const x = c.userData.x;
      const edge = Math.min(1, (2.75 - Math.abs(x)) / 0.3);
      c.position.set(x, 0.68, 0);
      c.scale.setScalar(Math.max(0.01, edge));
    }
  };
}

function buildSky(scene, theme) {
  const sky = theme.sky ?? {};
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(sky.top ?? '#03040b') },
      mid: { value: new THREE.Color(sky.mid ?? '#1a1446') },
      bottom: { value: new THREE.Color(sky.bottom ?? '#05060f') },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;' +
      'void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bottom, smoothstep(0.0, 0.4, -h));' +
      'gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), m));

  const n = theme.stars ?? 1400;
  if (!n) return new THREE.Group();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 10);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#cfe0ff', size: 0.35, sizeAttenuation: true, fog: false }));
  scene.add(stars);
  return stars;
}

// --------------------------------------------------------------- stations

function buildPlan(st) {
  const g = st.group;
  st.todos = [];
  st.doodles = [];
  for (const x of [-1.35, 1.35]) g.add(mesh(roundedBox(0.12, 2.6, 0.12, 0.04), metal('#2a3140'), x, 1.3, -0.1));
  g.add(mesh(roundedBox(2.9, 1.75, 0.08, 0.03), metal('#10141c'), 0, 1.75, -0.1));
  st.screen = new CanvasScreen(640, 400, (ctx, w, h) => drawBoard(ctx, w, h, st.todos, st.doodles));
  const face = screenMesh(st.screen, 2.75, 1.6);
  face.position.set(0, 1.75, -0.055);
  g.add(face);
  g.add(mesh(new THREE.BoxGeometry(2.9, 0.02, 0.02), neon(st.color, 2.2), 0, 0.87, -0.05));
  const l = label(STATION_NAMES.plan, st.color);
  l.position.set(0, 2.95, -0.1);
  g.add(l);
  const light = new THREE.PointLight(st.color, 2.5, 4, 1.8);
  light.position.set(0, 1.6, 0.6);
  g.add(light);
  st.spotDist = 1.2;
  zoneMarker(st);
}

function buildAssembly(st) {
  const g = st.group;
  g.add(mesh(cylinder(0.85, 0.92, 0.1, 40), metal('#232a39'), 0, 0.05, 0));
  const pad = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 48), neon(st.color, 1.1));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.105;
  g.add(pad);
  for (const x of [-1.0, 1.0]) g.add(mesh(roundedBox(0.16, 2.1, 0.16, 0.03), metal('#2a3140'), x, 1.05, 0));
  g.add(mesh(new THREE.BoxGeometry(2.16, 0.16, 0.16), metal('#2a3140'), 0, 2.15, 0));
  for (const x of [-1.0, 1.0]) g.add(mesh(new THREE.BoxGeometry(0.03, 1.9, 0.03), neon(st.color, 1.2), x * 0.9, 1.05, 0.09));

  const curtain = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, color: { value: new THREE.Color(st.color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform float time; uniform float power; uniform vec3 color; varying vec2 vUv;' +
      'void main(){ float lines = 0.5 + 0.5 * sin(vUv.y * 80.0 - time * 8.0);' +
      'float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);' +
      'float a = edge * (0.05 + power * 0.6) * (0.5 + 0.5 * lines);' +
      'gl_FragColor = vec4(color * 1.8 * a, 1.0); }',
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.95), curtain);
  plane.position.set(0, 1.08, 0);
  g.add(plane);
  st.curtain = curtain;

  // Console de commande à côté de la baie
  g.add(mesh(roundedBox(0.5, 0.7, 0.4, 0.05), metal('#1f2533'), 1.55, 0.35, 0.4));
  st.screen = new CanvasScreen(128, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0a0614';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = st.color;
    ctx.font = '700 26px Consolas, monospace';
    ctx.fillText('AGENT', 22, 44);
    ctx.fillRect(16, 60, (w - 32) * (st.power ?? 0), 14);
    scanlines(ctx, w, h);
  });
  const face = screenMesh(st.screen, 0.4, 0.3);
  face.position.set(1.55, 0.72, 0.61);
  face.rotation.x = -0.6;
  g.add(face);

  const l = label(STATION_NAMES.agent, st.color);
  l.position.set(0, 2.65, 0);
  g.add(l);
  const light = new THREE.PointLight(st.color, 2, 4, 1.8);
  light.position.set(0, 1.2, 0.6);
  g.add(light);
  st.power = 0;
  st.centerLocal = new THREE.Vector3(0, 0.1, 0);
  st.spotDist = 1.45;
  zoneMarker(st);
}

function buildTrash(st) {
  // Le robot se place devant la corbeille, côté DOCS, sans gêner le tableau de planification.
  st.dir.set(-0.25, 0, 0.97).normalize();
  st.side.set(-st.dir.z, 0, st.dir.x);
  st.group.rotation.y = Math.atan2(st.dir.x, st.dir.z);
  const g = st.group;
  const c = st.color;
  const SCALE = 0.75;
  const body = new THREE.Group();
  body.scale.setScalar(SCALE);
  g.add(body);

  // Corps légèrement évasé, bord lumineux, intérieur sombre
  body.add(mesh(cylinder(0.42, 0.34, 0.78, 36), metal('#1d2330'), 0, 0.39, 0));
  body.add(mesh(cylinder(0.36, 0.36, 0.06, 36), metal('#262d3a'), 0, 0.03, 0));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.022, 10, 48), neon(c, 1.5));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.78;
  body.add(rim);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.012, 8, 48), neon(c, 0.9));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.2;
  body.add(band);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 36), new THREE.MeshBasicMaterial({ color: '#020306' }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.772;
  body.add(hole);

  // Symbole de recyclage, devant et derrière
  const sc = document.createElement('canvas');
  sc.width = sc.height = 128;
  const sg = sc.getContext('2d');
  sg.fillStyle = c;
  sg.font = '96px "Segoe UI Symbol", "Noto Sans Symbols", sans-serif';
  sg.textAlign = 'center';
  sg.textBaseline = 'middle';
  sg.fillText('♻', 64, 70);
  const symTex = new THREE.CanvasTexture(sc);
  symTex.colorSpace = THREE.SRGBColorSpace;
  const symMat = new THREE.MeshBasicMaterial({ map: symTex, transparent: true, depthWrite: false });
  symMat.color.setScalar(1.6);
  for (const side of [1, -1]) {
    const sym = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), symMat);
    sym.position.set(0, 0.47, side * 0.392);
    sym.rotation.set(side * 0.1, side > 0 ? 0 : Math.PI, 0);
    body.add(sym);
  }

  // Couvercle articulé à l'arrière
  const lid = new THREE.Group();
  lid.position.set(0, 0.8, -0.43);
  lid.add(mesh(cylinder(0.45, 0.45, 0.05, 36), metal('#2a3140'), 0, 0.025, 0.43));
  lid.add(mesh(roundedBox(0.16, 0.04, 0.05, 0.015), metal('#3a4150'), 0, 0.07, 0.43));
  const lidRim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.012, 8, 48), neon(c, 1.1));
  lidRim.rotation.x = Math.PI / 2;
  lidRim.position.set(0, 0.025, 0.43);
  lid.add(lidRim);
  body.add(lid);

  const l = label(STATION_NAMES.trash, c);
  l.position.set(0, 1.2, 0);
  g.add(l);
  const light = new THREE.PointLight(c, 1.2, 2.2, 1.8);
  light.position.set(0, 0.9, 0.4);
  g.add(light);

  Object.assign(st, { lid, lidTimer: 0, mouthLocal: new THREE.Vector3(0, 0.82 * SCALE, 0), light });
  st.openLid = (seconds) => (st.lidTimer = Math.max(st.lidTimer, seconds));
  st.spotDist = 0.95;
  zoneMarker(st);
}

function buildDock(st, scene, theme) {
  const g = st.group;
  g.add(mesh(octagon(new THREE.CylinderGeometry(1.25, 1.35, 0.14, 8)), metal('#232a39'), 0, 0.07, 0));
  g.add(octRim(1.26, 0.145, MARK, 0.025, 0.8));
  // Certains thèmes remplacent la tour (glace, antenne satellite)
  const tower = theme.tower;
  if (tower) st.animateTower = tower.build(g);
  else {
    g.add(mesh(cylinder(0.24, 0.32, 1.6, 20), metal('#2a3140'), 0, 0.9, 0));
    g.add(mesh(cylinder(0.3, 0.26, 0.08, 20), metal('#323a4a'), 0, 1.74, 0));
  }
  const ringColor = tower?.rings?.color ?? st.color;
  const rings = [0, 1, 2].map((i) => {
    // Anneaux qui montent le long de la tour (givre, signal ou énergie selon le thème)
    const r = new THREE.Mesh(new THREE.TorusGeometry(tower?.rings?.radius ?? 0.34, 0.018, 8, 40), neon(ringColor, tower?.rings?.intensity ?? 1.3));
    r.rotation.x = Math.PI / 2;
    r.userData.phase = i / 3;
    g.add(r);
    return r;
  });
  // Socles de recharge où les robots se garent
  DOCK_ANGLES.forEach((a) => {
    const x = Math.sin(a) * DOCK_R, z = Math.cos(a) * DOCK_R;
    const pad = new THREE.Group();
    pad.position.set(x, 0, z);
    pad.rotation.y = a;
    pad.add(mesh(roundedBox(0.8, 0.03, 0.8, 0.01), metal('#1d2330'), 0, 0.015, 0));
    const outline = new THREE.Mesh(new THREE.RingGeometry(0.31, 0.33, 4, 1, Math.PI / 4), neon(MARK, 0.7, { transparent: true, opacity: 0.35 }));
    outline.rotation.x = -Math.PI / 2;
    outline.position.y = 0.033;
    outline.scale.setScalar(1.2);
    pad.add(outline);
    g.add(pad);
  });
  const light = new THREE.PointLight(ringColor, 3, 6, 1.6);
  light.position.set(0, 2.6, 0);
  g.add(light);
  Object.assign(st, { rings, light });
  scene.add(g);
}

// ----------------------------------------------------------------- monde

/** Teinte la structure sombre (métal) pour l'accorder au thème ; écrans, néons et sols texturés ne changent pas. */
function applyTint(scene, tint) {
  if (!tint) return;
  const target = new THREE.Color(tint.color);
  const done = new Map();
  const hsl = {};
  scene.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const m = o.material;
    if (!m.isMeshStandardMaterial || m.map || m.userData.keepColor) return;
    if (!done.has(m)) {
      m.color.getHSL(hsl);
      let next = m;
      if (hsl.l < 0.35) {
        next = m.clone();
        next.color.lerp(target, tint.amount);
      }
      done.set(m, next);
    }
    o.material = done.get(m);
  });
}

export function buildWorld(scene, theme = {}) {
  const stars = buildSky(scene, theme);
  const fog = theme.fog ?? { color: '#0b0d22', near: 40, far: 100 };
  scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const hemi = theme.hemi ?? { sky: '#8fa6ff', ground: '#1a1420', intensity: 0.7 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const sun = new THREE.DirectionalLight(theme.sun?.color ?? '#dfe8ff', theme.sun?.intensity ?? 1.8);
  sun.position.set(7, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const thrusters = buildPlatform(scene, theme);
  const racks = buildRacks(scene);
  const conveyor = buildConveyor(scene, theme);

  const stations = {};
  for (const [key, [x, z]] of Object.entries(LAYOUT)) stations[key] = new Station(key, x, z);

  const read = stations.read;
  read.doc = { file: 'README.md', rows: docRows(), cursor: 0 };
  workstation(read, (ctx, w, h) => drawDocs(ctx, w, h, read.doc));

  const search = stations.search;
  Object.assign(search, { query: '', angle: 0, blips: [] });
  workstation(search, (ctx, w, h) => drawRadar(ctx, w, h, search));

  const write = stations.write;
  write.code = { file: 'README.md', rows: Array.from({ length: 8 }, randomCodeRow), scroll: 0 };
  workstation(write, (ctx, w, h) => drawCode(ctx, w, h, write.code), { sw: 1.2, sh: 0.7 });

  const bash = stations.bash;
  bash.lines = [{ t: theme.shell ?? 'robot@usine:~$', c: '#39ff9f' }];
  workstation(bash, (ctx, w, h) => drawTerminal(ctx, w, h, bash.lines));

  const web = stations.web;
  web.net = networkGraph();
  workstation(web, (ctx, w, h) => drawNetwork(ctx, w, h, web.net));
  web.group.add(mesh(cylinder(0.025, 0.03, 0.8, 8), metal('#3a4150'), 0.65, 0.9, -0.2));
  const beacon = new THREE.Mesh(sphere(0.06), neon(web.color, 3));
  beacon.position.set(0.65, 1.32, -0.2);
  web.group.add(beacon);
  web.beacon = beacon;
  web.topLocal = new THREE.Vector3(0.65, 1.32, -0.2);

  buildPlan(stations.plan);
  buildAssembly(stations.agent);
  buildTrash(stations.trash);
  for (const st of Object.values(stations)) scene.add(st.group);
  stations.dock = new Dock();
  buildDock(stations.dock, scene, theme);
  applyTint(scene, theme.tint);
  const decor = theme.decor?.(scene);

  const timers = { slow: 0, fast: 0, racks: 0 };

  function update(t, dt) {
    stars.rotation.y = t * 0.004;
    decor?.(t, dt);
    thrusters.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(t * 13 + i) * 0.08;
      f.material.opacity = 0.45 + Math.sin(t * 17 + i * 2) * 0.08;
    });
    conveyor(t, dt);

    const dock = stations.dock;
    dock.rings.forEach((r) => {
      const k = (t * 0.35 + r.userData.phase) % 1;
      r.position.y = 0.2 + k * 1.4;
      r.material.opacity = 1;
      r.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.15);
    });
    dock.light.intensity = 2.8 + Math.sin(t * 3) * 0.5;
    dock.animateTower?.(t);

    const bin = stations.trash;
    bin.lidTimer = Math.max(0, bin.lidTimer - dt);
    const lidGoal = bin.lidTimer > 0 ? -1.25 : 0;
    bin.lid.rotation.x += (lidGoal - bin.lid.rotation.x) * Math.min(1, dt * (lidGoal ? 14 : 6));

    const bay = stations.agent;
    bay.power = Math.max(0, bay.power - dt * 0.35);
    bay.curtain.uniforms.time.value = t;
    bay.curtain.uniforms.power.value = bay.power;

    for (const st of Object.values(stations)) {
      if (!st.ring) continue;
      const target = st.busy ? 0.7 : 0.25;
      st.ring.material.opacity += (target - st.ring.material.opacity) * Math.min(1, dt * 4);
      if (st.light) st.light.intensity = (st.busy ? 3 : 1.6) + (st.busy ? Math.sin(t * 9) * 0.3 : 0);
    }

    stations.web.beacon.material.color.set(stations.web.color).multiplyScalar(Math.sin(t * 5) > 0 ? 3 : 0.6);

    // Écrans animés : rapides quand le poste est occupé, lents sinon.
    timers.fast += dt;
    timers.slow += dt;
    timers.racks += dt;
    if (timers.fast > 0.08) {
      const step = timers.fast;
      timers.fast = 0;
      if (search.busy) {
        search.angle += step * 3;
        if (Math.random() < 0.2) search.blips.push({ a: Math.random() * Math.PI * 2, d: 0.2 + Math.random() * 0.75, life: 1 });
        for (const b of search.blips) b.life -= step * 0.6;
        search.blips = search.blips.filter((b) => b.life > 0);
        search.screen.redraw();
      }
      if (web.busy) {
        web.net.t += step;
        web.screen.redraw();
      }
      if (bay.power > 0.01) bay.screen.redraw();
    }
    if (timers.slow > 0.5) {
      timers.slow = 0;
      bash.screen.redraw();
      if (!search.busy) {
        search.angle += 0.15;
        search.screen.redraw();
      }
      if (!web.busy) {
        web.net.t += 0.1;
        web.screen.redraw();
      }
    }
    if (timers.racks > 0.3) {
      timers.racks = 0;
      racks[Math.floor(Math.random() * racks.length)].redraw();
    }
  }

  return { stations, update };
}

export function docRows() {
  const rows = [];
  for (let i = 0; i < 12; i++) rows.push({ w: i % 5 === 0 ? 120 + Math.random() * 120 : 200 + Math.random() * 260, title: i % 5 === 0 });
  return rows;
}

function networkGraph() {
  const nodes = [{ x: 0.5, y: 0.58 }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    nodes.push({ x: 0.5 + Math.cos(a) * (0.3 + Math.random() * 0.1), y: 0.58 + Math.sin(a) * (0.27 + Math.random() * 0.05) });
  }
  const links = nodes.slice(1).map((_, i) => [0, i + 1]);
  links.push([1, 2], [3, 4], [5, 6], [6, 7]);
  return { nodes, links, t: 0, host: '' };
}
