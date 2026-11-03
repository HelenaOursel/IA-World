// Décor : plate-forme, sol, baies de serveurs, tapis roulant, ciel et teinte de la structure.
import * as THREE from '../../vendor/three.module.min.js';
import { CanvasScreen, cylinder, mesh, metal, neon, roundedBox, roundRect } from '../geometry.js';
import { R, MARK, APOTHEM, LAYOUT } from './layout.js';
import { screenMesh, octRim, octagon } from './stations.js';

export function paintPanels(g, size, k, px, f) {
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

export function floorTexture(theme) {
  const fl = theme.floor ?? {};
  const mark = fl.mark ?? 'rgba(143,160,187,0.16)';
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const k = size / (2 * R);
  const px = (x, z) => [(x + R) * k, (z + R) * k];

  if (fl.paint) fl.paint(g, size, k, px);
  else paintPanels(g, size, k, px, fl);
  // Marquages jaunes en pointillés autour de chaque poste
  g.setLineDash([26, 18]);
  g.strokeStyle = mark;
  g.lineWidth = 5;
  for (const [key, [x, z]] of Object.entries(LAYOUT)) {
    if (key === 'trash' && theme.trash === 'fire') continue;
    const [a, b] = px(x, z);
    g.save();
    g.translate(a, b);
    g.rotate(-Math.atan2(-x, -z));
    roundRect(g, -1.35 * k, -0.75 * k, 2.7 * k, 2.6 * k, 0.25 * k);
    g.stroke();
    g.restore();
  }
  g.setLineDash([]);
  // Zone hachurée autour de la borne centrale (sauf si le thème dessine autre chose au centre)
  if (fl.centerRing !== false) {
    g.save();
    g.translate(...px(0, 0));
    g.strokeStyle = mark;
    g.lineWidth = 0.08 * k;
    g.setLineDash([0.22 * k, 0.22 * k]);
    g.beginPath();
    g.arc(0, 0, 2.75 * k, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildPlatform(scene, theme) {
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

export const RACKS = [[-2.35, -6.5], [2.35, -6.5], [-6.7, -2.4], [6.7, -2.4]];

/**
 * Baies de serveurs entre les postes ; un thème peut n'en garder que certaines (`theme.racks`)
 * ou construire autre chose à leur place (`theme.rack(group)` → animate(t), comme les holocrons).
 */
export function buildRacks(scene, spots = RACKS, build) {
  const racks = [];
  for (const [x, z] of spots) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z);
    if (build) {
      racks.push({ redraw() {}, animate: build(g) });
      scene.add(g);
      continue;
    }
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
export const CONVEYOR_X = -0.7;

/** Caisse par défaut du tapis roulant, avec un liseré de couleur. */
export function crate(i) {
  const c = new THREE.Group();
  c.add(mesh(roundedBox(0.4, 0.34, 0.4, 0.03), metal('#343c4c')));
  c.add(mesh(new THREE.BoxGeometry(0.41, 0.03, 0.41), neon(['#4cc9f0', '#ff7a1a', '#9b5de5', '#3ddc97', '#ffc53d'][i % 5], 0.9)));
  c.userData.y = 0.68;
  return c;
}

export function buildConveyor(scene, theme) {
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
  // Objets transportés : ceux du thème (pièces de machines…), sinon des caisses
  const makers = theme.conveyorItems ?? [crate];
  const count = theme.conveyorItems ? makers.length : 5;
  const crates = [];
  for (let i = 0; i < count; i++) {
    const c = makers[i % makers.length](i);
    c.userData.x = -2.75 + (i + 0.5) * (5.5 / count);
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
      c.position.set(x, c.userData.y, 0);
      c.scale.setScalar(Math.max(0.01, edge));
    }
  };
}

export function buildSky(scene, theme) {
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

/** Teinte la structure sombre (métal) pour l'accorder au thème ; écrans, néons et sols texturés ne changent pas. */
export function applyTint(scene, tint) {
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
