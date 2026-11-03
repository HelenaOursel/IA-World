// Postes de travail et machines : bureau et écran, tableau de planification, baie d'assemblage,
// corbeille et borne de recharge. Un thème peut remplacer chacun (voir themes/index.js).
import * as THREE from '../../vendor/three.module.min.js';
import { CanvasScreen, cylinder, mat, mesh, metal, neon, roundedBox, roundRect, scanlines } from '../geometry.js';
import { MARK, STATION_NAMES, DOCK_ANGLES, DOCK_R } from './layout.js';
import { drawBoard } from './screens.js';

export function screenMesh(screen, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screen.texture }));
  m.material.color.setScalar(1.35);
  return m;
}

export function label(text, color) {
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
export function workstation(st, draw, { sw = 1.05, sh = 0.62, cw = 512, ch = 320, desk } = {}, theme = {}) {
  const g = st.group;
  const c = st.color;
  // Un thème peut remplacer tout le poste, bureau et clavier compris (prise de droïde…) ;
  // l'écran, l'étiquette et le cercle au sol restent.
  if (theme.workstation) {
    st.screen = new CanvasScreen(cw, ch, draw);
    const { labelY = 2 } = theme.workstation(st, st.screen, { sw, sh }) ?? {};
    const l = label(STATION_NAMES[st.key], c);
    l.position.set(0, labelY, 0);
    g.add(l);
    zoneMarker(st);
    return;
  }
  // Ou seulement le bureau (plateau à 0,53 m, l'écran et le clavier restent ceux-ci)
  if (desk) desk(g, c);
  else {
    g.add(mesh(roundedBox(1.7, 0.06, 0.72, 0.025), metal('#262d3a'), 0, 0.5, 0));
    g.add(mesh(new THREE.BoxGeometry(1.7, 0.018, 0.018), neon(c, 2), 0, 0.5, 0.36));
    for (const x of [-0.8, 0.8]) g.add(mesh(roundedBox(0.07, 0.48, 0.64, 0.02), metal('#1a1f2a'), x, 0.24, 0));
    g.add(mesh(roundedBox(1.5, 0.3, 0.04, 0.015), metal('#151a24'), 0, 0.3, -0.28));
  }

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
export function keyTexture() {
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
export function zoneMarker(st) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.43, 0.46, 48), neon(MARK, 0.8, { transparent: true, opacity: 0.35 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.012, st.spotDist);
  st.group.add(ring);
  st.ring = ring;
}

export function octRim(radius, y, color, thickness = 0.04, intensity = 2) {
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

export function octagon(geo) {
  geo.rotateY(Math.PI / 8);
  return geo;
}

export function buildPlan(st) {
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

export function buildAssembly(st, gate) {
  const g = st.group;
  // Socle (dalle de pierre si le thème le demande) et cercle lumineux d'où sortent les agents
  const base = gate?.base === 'stone' ? mat('#8a8f98', { roughness: 0.95 }) : metal('#232a39');
  g.add(mesh(cylinder(0.85, 0.92, 0.1, 40), base, 0, 0.05, 0));
  const pad = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 48), neon(st.color, 1.1));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.105;
  g.add(pad);
  // Certains thèmes remplacent le cadre du portail (torii)
  // build peut renvoyer animate(power, t) : une porte qui s'ouvre quand un agent arrive ou repart
  if (gate?.build) st.animateGate = gate.build(g) ?? null;
  else {
    for (const x of [-1.0, 1.0]) g.add(mesh(roundedBox(0.16, 2.1, 0.16, 0.03), metal('#2a3140'), x, 1.05, 0));
    g.add(mesh(new THREE.BoxGeometry(2.16, 0.16, 0.16), metal('#2a3140'), 0, 2.15, 0));
    for (const x of [-1.0, 1.0]) g.add(mesh(new THREE.BoxGeometry(0.03, 1.9, 0.03), neon(st.color, 1.2), x * 0.9, 1.05, 0.09));
  }

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
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, gate?.curtain?.h ?? 1.95), curtain);
  plane.position.set(0, gate?.curtain?.y ?? 1.08, 0);
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
  l.position.set(0, gate?.labelY ?? 2.65, 0);
  g.add(l);
  const light = new THREE.PointLight(st.color, 2, 4, 1.8);
  light.position.set(0, 1.2, 0.6);
  g.add(light);
  st.power = 0;
  st.centerLocal = new THREE.Vector3(0, 0.1, 0);
  st.spotDist = 1.45;
  zoneMarker(st);
}

export function buildTrash(st) {
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

export function buildDock(st, scene, theme) {
  const g = st.group;
  // Un thème peut remplacer tout le socle (tour, anneaux et emplacements), comme le feu de camp
  if (theme.dock) {
    Object.assign(st, { rings: [] }, theme.dock(g, DOCK_ANGLES, DOCK_R));
    scene.add(g);
    return;
  }
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

/** Sans corbeille : on jette dans le feu de camp, depuis le bord du feu côté caméra. */
export function burnInFire(st) {
  st.pos.set(0, 0, 0);
  st.group.position.set(0, 0, 0);
  st.dir.set(Math.sin(0.4), 0, Math.cos(0.4));
  st.side.set(-st.dir.z, 0, st.dir.x);
  st.group.rotation.y = Math.atan2(st.dir.x, st.dir.z);
  st.spotDist = 1.3;
  // L'objet tombe au cœur des flammes, qui crachent des étincelles
  Object.assign(st, { mouthLocal: new THREE.Vector3(0, 0.3, 0), burst: ['#ff8a1f', '#ffd23f', '#ff3d14'], openLid: () => {} });
}
