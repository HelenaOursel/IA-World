// Cuirassé Yamato (configuration 1945), en maquette à l'échelle des pandas, amarré au bord de la plate-forme.
// Tout est construit en mètres réels puis réduit d'un facteur SCALE.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mergeStatic, mesh, roundedBox, sphere } from '../../geometry.js';

const L = 263; // longueur hors tout (m)
const B = 38.9; // largeur maximale (m)
const FREEBOARD = 8.5; // hauteur du pont au-dessus de la flottaison, au milieu du navire
const DRAFT = 10.4; // tirant d'eau
const LENGTH = 16; // longueur dans le monde
const SCALE = LENGTH / L;
const GAP = 0.6; // espace entre le bord de la plate-forme et la coque

const grey = () => mat('#7f858d', { roughness: 0.65, metalness: 0.25 });
const dark = () => mat('#4a4f56', { roughness: 0.6, metalness: 0.3 });
const black = () => mat('#1d1f22', { roughness: 0.5 });

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Position longitudinale (z local) à `fb` mètres de l'étrave ; l'avant est vers +z. */
const zAt = (fb) => L / 2 - fb;
/** Tonture : le pont se relève vers l'étrave. */
const deckY = (fb) => (fb < 95 ? 4.5 * (1 - fb / 95) ** 2 : 0);

/** Demi-largeur de la coque au niveau du pont. */
function halfBeam(fb) {
  const u = fb / L;
  if (u < 0.35) return (B / 2) * Math.max(0.02, Math.sin(((u / 0.35) * Math.PI) / 2) ** 0.8);
  if (u < 0.75) return B / 2;
  return (B / 2) * (1 - 0.45 * ((u - 0.75) / 0.25) ** 2);
}

/** Fond de la coque : étrave élancée à l'avant, voûte relevée à l'arrière. */
function keelY(fb) {
  const u = fb / L;
  const full = -(FREEBOARD + DRAFT);
  const stem = deckY(fb) - (deckY(fb) - full) * Math.sqrt(smooth(0, 0.06, u));
  return THREE.MathUtils.lerp(stem, -FREEBOARD - 1, smooth(0.86, 1, u));
}

/** Forme des couples : en V à l'avant, presque carrée au milieu, arrondie à l'arrière. */
function sectionExp(fb) {
  const u = fb / L;
  if (u < 0.3) return THREE.MathUtils.lerp(0.9, 0.3, u / 0.3);
  if (u < 0.75) return 0.3;
  return THREE.MathUtils.lerp(0.3, 0.55, (u - 0.75) / 0.25);
}

function hullGeometry() {
  const N = 90, M = 28;
  const pos = [], idx = [], sections = [];
  for (let i = 0; i <= N; i++) {
    const fb = (i / N) * L;
    const hb = halfBeam(fb), top = deckY(fb), bottom = keelY(fb), e = sectionExp(fb);
    const ring = [];
    for (let j = 0; j <= M; j++) {
      const phi = (j / M) * Math.PI;
      const c = Math.cos(phi), s = Math.sin(phi);
      ring.push(pos.length / 3);
      pos.push(-hb * Math.sign(c) * Math.abs(c) ** e, top - (top - bottom) * Math.abs(s) ** e, zAt(fb));
    }
    sections.push(ring);
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = sections[i][j], b = sections[i + 1][j], c = sections[i + 1][j + 1], d = sections[i][j + 1];
      idx.push(a, b, d, b, c, d);
    }
  }
  // Tableau arrière
  const last = sections[N];
  const center = pos.length / 3;
  pos.push(0, (deckY(L) + keelY(L)) / 2, zAt(L));
  for (let j = 0; j < M; j++) idx.push(center, last[j + 1], last[j]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Coque grise, liston noir à la flottaison et carène rouge antifouling. */
function hullMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#7f858d', roughness: 0.65, metalness: 0.25, side: THREE.DoubleSide });
  const vec = (hex) => {
    const c = new THREE.Color(hex);
    return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
  };
  const wl = (-FREEBOARD).toFixed(2), band = (-FREEBOARD + 0.9).toFixed(2);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vHullY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHullY = position.y;');
    sh.fragmentShader = 'varying float vHullY;\n' + sh.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (vHullY < ${wl}) diffuseColor.rgb = ${vec('#8a2d25')};
      else if (vHullY < ${band}) diffuseColor.rgb = ${vec('#1d1f22')};`,
    );
  };
  m.customProgramCacheKey = () => 'yamato-hull';
  return m;
}

/** Pont en lattes de bois dans le sens de la longueur. */
function deckTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#b39669';
  g.fillRect(0, 0, 128, 512);
  for (let x = 0; x < 128; x += 8) {
    g.fillStyle = `rgba(90,70,40,${0.25 + Math.random() * 0.2})`;
    g.fillRect(x, 0, 1, 512);
    g.fillStyle = `rgba(255,240,210,${Math.random() * 0.08})`;
    g.fillRect(x + 1, 0, 7, 512);
    for (let k = 0; k < 3; k++) g.fillRect(x, Math.random() * 512, 8, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function deckGeometry() {
  const N = 90, K = 6;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const fb = (i / N) * L;
    const hb = halfBeam(fb) * 0.995;
    for (let k = 0; k <= K; k++) {
      const x = -hb + (2 * hb * k) / K;
      pos.push(x, deckY(fb) + 0.05, zAt(fb));
      uv.push(x / 8, zAt(fb) / 30);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < K; k++) {
      const a = i * (K + 1) + k, b = a + K + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tourelle vue de dessus : face avant étroite et inclinée, arrière arrondi. */
function gunHouse(w, len, h) {
  const s = new THREE.Shape();
  const fw = w * 0.36, r = w / 2;
  s.moveTo(-fw, -len / 2);
  s.lineTo(fw, -len / 2);
  s.lineTo(r, -len * 0.05);
  s.lineTo(r, len / 2 - r * 0.6);
  s.quadraticCurveTo(r, len / 2, 0, len / 2);
  s.quadraticCurveTo(-r, len / 2, -r, len / 2 - r * 0.6);
  s.lineTo(-r, -len * 0.05);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = Math.max(0, p.getY(i) / h);
    if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) * (1 - 0.22 * k));
    p.setX(i, p.getX(i) * (1 - 0.07 * k));
  }
  g.computeVertexNormals();
  return g;
}

/** Tourelle complète (barbette, maison, canons, télémètre), canons vers +z. */
function turret(o) {
  const g = new THREE.Group();
  g.add(mesh(cylinder(o.barbetteR, o.barbetteR, o.barbetteH, 28), grey(), 0, o.barbetteH / 2, 0));
  const house = new THREE.Group();
  house.position.y = o.barbetteH;
  house.add(mesh(gunHouse(o.w, o.len, o.h), grey()));
  for (let i = 0; i < o.barrels; i++) {
    const gun = new THREE.Group();
    gun.position.set((i - (o.barrels - 1) / 2) * o.spacing, o.h * 0.42, o.len * 0.36);
    gun.rotation.x = -0.04;
    const parts = [
      [cylinder(o.gunR * 0.75, o.gunR, o.gunLen, 14), grey(), o.gunLen / 2],
      [cylinder(o.gunR * 0.85, o.gunR * 0.85, o.gunLen * 0.04, 14), grey(), o.gunLen],
      [cylinder(o.gunR * 1.5, o.gunR * 1.6, o.gunLen * 0.08, 14), dark(), o.gunLen * 0.02],
    ];
    for (const [geo, m, z] of parts) {
      const part = mesh(geo, m, 0, 0, z);
      part.rotation.x = Math.PI / 2;
      gun.add(part);
    }
    house.add(gun);
  }
  if (o.rangefinder) {
    const y = o.h * 0.75, z = -o.len * 0.22;
    const rf = mesh(cylinder(0.6, 0.6, o.rangefinder, 12), grey(), 0, y, z);
    rf.rotation.z = Math.PI / 2;
    house.add(rf);
    for (const s of [-1, 1]) house.add(mesh(sphere(0.9, 12, 8), grey(), (s * o.rangefinder) / 2, y, z));
  }
  g.add(house);
  return g;
}

const MAIN = { w: 15, len: 19, h: 5.5, barrels: 3, gunR: 0.6, gunLen: 21, spacing: 3.3, rangefinder: 17, barbetteR: 7.2, barbetteH: 1.2 };
const SECONDARY = { w: 8.5, len: 10.5, h: 3.3, barrels: 3, gunR: 0.28, gunLen: 9.5, spacing: 1.7, rangefinder: 9, barbetteR: 3.8, barbetteH: 1 };
const DUAL = { w: 4.5, len: 5, h: 2.6, barrels: 2, gunR: 0.17, gunLen: 6.5, spacing: 1.2, rangefinder: 0, barbetteR: 2, barbetteH: 0.6 };

/** Affût triple de 25 mm, tourné vers +z. */
function aa25() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 1.6), dark(), 0, 0.45, 0));
  for (const x of [-0.4, 0, 0.4]) {
    const b = mesh(cylinder(0.06, 0.07, 2.6, 6), dark(), x, 1.2, 0.9);
    b.rotation.x = Math.PI / 2 - 0.5;
    g.add(b);
  }
  return g;
}

const box = (w, h, d, m, x, y, z, r = 0.4) => mesh(roundedBox(w, h, d, r, 3), m, x, y, z);

/** Place `obj` à `fb` m de l'étrave, décalé de `x`, à la hauteur `y`, tourné de `rot`. */
function put(ship, obj, fb, y = 0, x = 0, rot = 0) {
  obj.position.set(x, y, zAt(fb));
  obj.rotation.y = rot;
  ship.add(obj);
  return obj;
}

function buildShip() {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(hullGeometry(), hullMaterial());
  hull.castShadow = hull.receiveShadow = true;
  ship.add(hull);
  // Bulbe d'étrave sous la flottaison
  const bulb = new THREE.Mesh(sphere(1, 20, 14), hull.material);
  bulb.scale.set(3, 3.6, 10);
  bulb.position.set(0, -FREEBOARD - 6.5, zAt(9));
  ship.add(bulb);
  const deck = new THREE.Mesh(deckGeometry(), new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.85, side: THREE.DoubleSide }));
  deck.receiveShadow = true;
  ship.add(deck);

  // Chrysanthème doré à l'étrave et écubiers
  const crest = mesh(cylinder(1, 1, 0.3, 24), mat('#d4af37', { metalness: 0.8, roughness: 0.3 }), 0, deckY(0) - 1.6, zAt(1.2));
  crest.rotation.x = Math.PI / 2;
  ship.add(crest);
  for (const s of [-1, 1]) {
    const hawse = mesh(sphere(0.8, 10, 8), black(), s * halfBeam(14), deckY(14) - 2, zAt(14));
    hawse.scale.set(0.3, 1, 1.2);
    ship.add(hawse);
  }

  // Brise-lames en V devant la tourelle 1
  for (const s of [-1, 1]) {
    const w = box(12, 1.8, 0.4, grey(), s * 4.6, deckY(66) + 0.9, zAt(66) - 3.5, 0.15);
    w.rotation.y = s * 0.6;
    ship.add(w);
  }

  // Artillerie principale : deux tourelles avant (la 2 tire par-dessus la 1), une arrière
  put(ship, turret(MAIN), 85, deckY(85));
  put(ship, turret({ ...MAIN, barbetteH: 5.5 }), 107);
  put(ship, turret(MAIN), 203, 0, 0, Math.PI);

  // Superstructure en gradins
  ship.add(box(26, 3.5, 74, grey(), 0, 1.75, zAt(151)));
  ship.add(box(20, 3, 66, grey(), 0, 5, zAt(150)));
  ship.add(box(14, 5.5, 12, grey(), 0, 9.25, zAt(121)));
  put(ship, turret(SECONDARY), 119, 12);
  put(ship, turret({ ...SECONDARY, barbetteH: 3 }), 185, 3.5, 0, Math.PI);

  // Tour-pagode
  const tower = [[15, 13, 3], [14, 12, 3], [13, 11, 3], [12, 10.5, 3], [11.5, 10, 2.6], [10, 9, 2.6], [9, 8, 2.4], [8, 7.5, 2.2]];
  let y = 6.5;
  tower.forEach(([w, d, h], i) => {
    ship.add(box(w, h, d, grey(), 0, y + h / 2, zAt(131), 0.6));
    if (i === 5) ship.add(box(w + 0.15, 0.9, d + 0.15, black(), 0, y + h * 0.6, zAt(131), 0.3));
    if (i === 3 || i === 6) ship.add(box(w + 5, 0.3, d + 1.5, dark(), 0, y + h, zAt(131), 0.1));
    y += h;
  });
  ship.add(box(6.5, 4, 6, grey(), 0, y + 2, zAt(131), 0.8));
  const rf = mesh(cylinder(0.75, 0.75, 15, 14), grey(), 0, y + 1.8, zAt(131.5));
  rf.rotation.z = Math.PI / 2;
  ship.add(rf);
  ship.add(mesh(cylinder(0.2, 0.2, 2.5, 6), dark(), 0, y + 5, zAt(131)));
  ship.add(box(5, 2.5, 0.3, dark(), 0, y + 6.6, zAt(131), 0.05));

  // Cheminée très inclinée vers l'arrière
  const funnel = new THREE.Group();
  funnel.position.set(0, 6.5, zAt(152));
  funnel.rotation.x = -0.42;
  const stack = mesh(cylinder(4.2, 5, 16, 28), grey(), 0, 8, 0);
  stack.scale.x = 0.72;
  funnel.add(stack);
  const skirt = mesh(cylinder(5.5, 6.2, 2.5, 28), grey(), 0, 1.25, 0);
  skirt.scale.x = 0.72;
  funnel.add(skirt);
  const cap = mesh(cylinder(4.25, 4.25, 1.2, 28), black(), 0, 16.4, 0);
  cap.scale.x = 0.72;
  funnel.add(cap);
  ship.add(funnel);

  // Grand mât, poste de direction de tir arrière
  const mast = new THREE.Group();
  mast.position.set(0, 6.5, zAt(168));
  mast.rotation.x = -0.18;
  mast.add(mesh(cylinder(0.35, 0.5, 20, 8), dark(), 0, 10, 0));
  mast.add(box(10, 0.3, 0.3, dark(), 0, 15, 0, 0.1));
  mast.add(box(3, 1.6, 0.25, dark(), 0, 18, 0.5, 0.05));
  const strut = mesh(cylinder(0.25, 0.35, 13, 6), dark(), 0, 6.2, -2.4);
  strut.rotation.x = 0.4;
  mast.add(strut);
  ship.add(mast);
  ship.add(box(8, 6, 7, grey(), 0, 9.5, zAt(176)));
  const rf2 = mesh(cylinder(0.6, 0.6, 10, 12), grey(), 0, 13, zAt(176));
  rf2.rotation.z = Math.PI / 2;
  ship.add(rf2);

  // Tourelles doubles de 127 mm et affûts de 25 mm le long du bord
  for (const fb of [134, 146, 158]) {
    for (const s of [-1, 1]) put(ship, turret(DUAL), fb, 3.5, s * 10.5, s * (Math.PI / 2));
  }
  for (const fb of [40, 55, 125, 140, 155, 170, 215, 228]) {
    for (const s of [-1, 1]) put(ship, aa25(), fb, deckY(fb), s * (halfBeam(fb) - 1.8), s * (Math.PI / 2));
  }
  for (const fb of [124, 178]) for (const s of [-1, 1]) put(ship, aa25(), fb, 6.5, s * 8, s * (Math.PI / 2));

  // Plage arrière : catapultes et grue des hydravions
  for (const s of [-1, 1]) put(ship, box(1.6, 1, 19, dark(), 0, 0.6, 0, 0.1), 243, 0, s * 11, s * 0.45);
  ship.add(mesh(cylinder(0.9, 1.1, 9, 12), grey(), 0, 4.5, zAt(254)));
  const boom = new THREE.Group();
  boom.position.set(0, 8.5, zAt(254));
  boom.rotation.x = -0.6;
  boom.add(box(0.8, 0.8, 16, dark(), 0, 0, 8, 0.1));
  ship.add(boom);
  // Le navire ne bouge pas : quelques maillages par matériau au lieu de plusieurs centaines de pièces
  return mergeStatic(ship);
}

/**
 * Construit le Yamato le long du côté +x de la plate-forme (derrière le poste Terminal),
 * avec ses amarres et une passerelle d'embarquement.
 */
export function buildYamato(scene, apothem, z = 0.5) {
  const ship = buildShip();
  ship.scale.setScalar(SCALE);
  const shipX = apothem + GAP + (B / 2) * SCALE;
  ship.position.set(shipX, 0, z);
  scene.add(ship);

  const world = (x, y, fb) => new THREE.Vector3(shipX + x * SCALE, y * SCALE, z + zAt(fb) * SCALE);
  const iron = mat('#2a3140', { metalness: 0.55, roughness: 0.42 });
  const ropeMat = mat('#c8b48a', { roughness: 0.9 });
  // Amarres et passerelle, fusionnées à la fin
  const moor = new THREE.Group();

  // Bittes d'amarrage sur le quai et sur le pont, reliées par des aussières qui pendent un peu
  const bitt = (p) => {
    moor.add(mesh(cylinder(0.05, 0.06, 0.14, 10), iron, p.x, p.y + 0.07, p.z));
    moor.add(mesh(cylinder(0.075, 0.075, 0.02, 10), iron, p.x, p.y + 0.14, p.z));
  };
  const quay = [new THREE.Vector3(apothem - 0.2, 0, 3), new THREE.Vector3(apothem - 0.2, 0, -3)];
  quay.forEach(bitt);
  const lines = [[0, 25], [0, 100], [1, 170], [1, 246]];
  for (const [q, fb] of lines) {
    const onDeck = world(-(halfBeam(fb) - 1.5), deckY(fb), fb);
    bitt(onDeck);
    const a = quay[q].clone().setY(0.12), b = onDeck.clone().setY(onDeck.y + 0.12);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.25;
    moor.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.015, 6), ropeMat));
  }

  // Passerelle d'embarquement, derrière le poste Terminal
  const gz = z - 0.3;
  const x0 = apothem - 0.15, x1 = shipX - (B / 2) * SCALE + 0.3;
  const plank = mat('#8a6a45', { roughness: 0.85 });
  moor.add(mesh(new THREE.BoxGeometry(x1 - x0, 0.03, 0.34), plank, (x0 + x1) / 2, 0.03, gz));
  for (const s of [-1, 1]) {
    for (const x of [x0 + 0.05, (x0 + x1) / 2, x1 - 0.05]) moor.add(mesh(cylinder(0.012, 0.012, 0.22, 6), iron, x, 0.14, gz + s * 0.16));
    const rail = mesh(cylinder(0.01, 0.01, x1 - x0, 6), ropeMat, (x0 + x1) / 2, 0.24, gz + s * 0.16);
    rail.rotation.z = Math.PI / 2;
    moor.add(rail);
  }
  scene.add(mergeStatic(moor));
  return ship;
}
