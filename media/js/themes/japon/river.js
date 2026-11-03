// Rivière zen du thème Japon, à la place du tapis roulant : gravier ratissé, roseaux, lotus et koï.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mergeStatic, mesh, sphere } from '../../geometry.js';

// Rivière zen qui serpente à l'avant de la plate-forme, dans un lit de gravier ratissé.
const RIVER_X = 3.9; // demi-longueur
export const riverZ = (x) => 6.35 + Math.sin(x * 0.85 + 0.6) * 0.38;

/** Point (x, z), direction et normale de la rivière au paramètre u (0 → 1). */
function riverAt(u) {
  const x = -RIVER_X + u * 2 * RIVER_X;
  const z = riverZ(x);
  const dz = Math.cos(x * 0.85 + 0.6) * 0.38 * 0.85;
  const len = Math.hypot(1, dz);
  return { x, z, tx: 1 / len, tz: dz / len, nx: -dz / len, nz: 1 / len };
}

/** Ruban plat qui suit la rivière, avec des bouts arrondis. */
function riverRibbon(width, y, uScale, segs = 120) {
  const pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = riverAt(u);
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * u), 0.3);
    pos.push(p.x - p.nx * w, y, p.z - p.nz * w, p.x + p.nx * w, y, p.z + p.nz * w);
    uv.push(u * uScale, 0, u * uScale, 1);
    nor.push(0, 1, 0, 0, 1, 0);
    if (i < segs) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildZenRiver(scene) {
  const g = new THREE.Group();

  // Gravier blanc ratissé en sillons parallèles au courant
  const sand = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d9d2c1';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(${120 + Math.random() * 80},${110 + Math.random() * 70},${95 + Math.random() * 60},0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let y = 8; y < h; y += 16) {
      ctx.fillStyle = 'rgba(90,80,65,0.28)';
      ctx.fillRect(0, y, w, 4);
      ctx.fillStyle = 'rgba(255,255,250,0.35)';
      ctx.fillRect(0, y - 3, w, 2);
    }
  });
  g.add(mesh(riverRibbon(2.0, 0.012, 14), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 })));

  // Eau : reflets clairs qui glissent avec le courant
  const ripples = canvasTex(256, 128, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2f7f8f');
    grad.addColorStop(0.5, '#3fa3b0');
    grad.addColorStop(1, '#2f7f8f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w, y = 14 + Math.random() * (h - 28), len = 10 + Math.random() * 30;
      ctx.strokeStyle = `rgba(220,250,255,${0.25 + Math.random() * 0.35})`;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 2, y - 3, x + len, y);
      ctx.stroke();
    }
  });
  const water = new THREE.MeshStandardMaterial({ map: ripples, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92, emissive: '#1b5a66', emissiveIntensity: 0.35 });
  const waterMesh = new THREE.Mesh(riverRibbon(0.85, 0.03, 6), water);
  waterMesh.receiveShadow = true;
  g.add(waterMesh);

  // Galets le long des berges
  const pebbleMats = ['#8d9096', '#a7a49c', '#6f7378', '#b9b4a8'].map((c) => mat(c, { roughness: 0.9 }));
  for (let i = 0; i < 70; i++) {
    const u = 0.03 + (i / 70) * 0.94;
    const p = riverAt(u);
    const side = i % 2 ? 1 : -1;
    const w = 0.42 * Math.pow(Math.sin(Math.PI * u), 0.3) + Math.random() * 0.08;
    const s = mesh(sphere(0.045 + Math.random() * 0.035, 10, 6), pebbleMats[i % 4], p.x + p.nx * w * side, 0.025, p.z + p.nz * w * side);
    s.scale.y = 0.55;
    g.add(s);
  }

  // Gros rochers moussus et pas japonais
  const rock = mat('#6b6e72', { roughness: 0.95 });
  const moss = mat('#5c8a3a', { roughness: 1 });
  for (const [u, off, r] of [[0.08, -0.85, 0.32], [0.3, 0.8, 0.24], [0.62, -0.8, 0.28], [0.88, 0.85, 0.34]]) {
    const p = riverAt(u);
    const x = p.x + p.nx * off, z = p.z + p.nz * off;
    const big = mesh(new THREE.DodecahedronGeometry(r, 1), rock, x, r * 0.35, z);
    big.scale.set(1.2, 0.75, 1);
    big.rotation.y = u * 9;
    g.add(big);
    const cap = mesh(new THREE.SphereGeometry(r * 0.75, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), moss, x, r * 0.55, z);
    cap.scale.set(1.15, 0.35, 0.95);
    g.add(cap);
  }
  const step = mat('#9a9890', { roughness: 0.9 });
  for (const [u, off] of [[0.47, -0.22], [0.5, 0.02], [0.53, 0.24]]) {
    const p = riverAt(u);
    const st = mesh(cylinder(0.13, 0.15, 0.06, 12), step, p.x + p.nx * off, 0.045, p.z + p.nz * off);
    st.scale.z = 0.8;
    g.add(st);
  }

  // Deux touffes de roseaux au bord de l'eau, avec leurs massettes brunes
  const reedGreen = ['#6d9a3a', '#7fae45', '#5e8a32'].map((c) => mat(c, { roughness: 0.7 }));
  const cattail = mat('#6b4426', { roughness: 0.9 });
  const reeds = [];
  for (const [u, off] of [[0.4, -0.4], [0.72, 0.42]]) {
    const p = riverAt(u);
    const cx = p.x + p.nx * off, cz = p.z + p.nz * off;
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, d = 0.03 + (i % 4) * 0.035;
      const stem = new THREE.Group();
      stem.position.set(cx + Math.cos(a) * d, 0.02, cz + Math.sin(a) * d);
      const h = 0.55 + ((i * 7) % 5) * 0.09;
      stem.add(mesh(cylinder(0.006, 0.011, h, 5), reedGreen[i % 3], 0, h / 2, 0));
      if (i % 3 === 0) {
        stem.add(mesh(cylinder(0.022, 0.022, 0.12, 8), cattail, 0, h - 0.1, 0));
      } else {
        // Feuille plate et effilée qui s'incline vers l'extérieur
        const blade = mesh(sphere(0.02, 6, 4), reedGreen[(i + 1) % 3], 0, h * 0.5, 0);
        blade.scale.set(0.5, h * 22, 0.12);
        stem.add(blade);
      }
      stem.userData = { phase: u * 10 + i * 0.7, lean: Math.cos(a) * 0.12, leanZ: Math.sin(a) * 0.12 };
      g.add(stem);
      reeds.push(stem);
    }
  }

  // Nénuphars
  const pad = mat('#4f9a3c', { roughness: 0.7, side: THREE.DoubleSide });
  const bloom = mat('#ffd3e6', { roughness: 0.6, emissive: '#ff8fbd', emissiveIntensity: 0.2 });
  for (const [u, off] of [[0.18, 0.15], [0.21, -0.12], [0.75, 0.1], [0.79, -0.18]]) {
    const p = riverAt(u);
    const lp = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16, 0.3, Math.PI * 2 - 0.5), pad);
    lp.rotation.set(-Math.PI / 2, 0, u * 20);
    lp.position.set(p.x + p.nx * off, 0.036, p.z + p.nz * off);
    g.add(lp);
    if (u < 0.2 || u > 0.78) g.add(mesh(sphere(0.035, 10, 6), bloom, lp.position.x, 0.055, lp.position.z));
  }

  // Fleur de lotus sur sa grande feuille, qui dérive doucement sur place
  const lotus = new THREE.Group();
  const lp = riverAt(0.62);
  lotus.position.set(lp.x + lp.nx * 0.12, 0.034, lp.z + lp.nz * 0.12);
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24, 0.25, Math.PI * 2 - 0.35), mat('#3f8f3a', { roughness: 0.6, side: THREE.DoubleSide }));
  leaf.rotation.x = -Math.PI / 2;
  lotus.add(leaf);
  const petalGeo = new THREE.SphereGeometry(0.05, 12, 8);
  petalGeo.translate(0, 0.05, 0);
  for (const [n, len, open, color, y] of [
    [8, 1.25, 1.05, '#fbd3e3', 0.01],
    [8, 1.15, 0.65, '#f7a8c8', 0.02],
    [5, 1.0, 0.3, '#f28bb5', 0.03],
  ]) {
    const petalMat = mat(color, { roughness: 0.5, emissive: color, emissiveIntensity: 0.15 });
    for (let i = 0; i < n; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = y;
      pivot.rotation.set(0, (i / n) * Math.PI * 2 + n * 0.2, 0, 'YXZ');
      const petal = mesh(petalGeo, petalMat);
      petal.scale.set(0.45, len, 0.18);
      petal.rotation.x = open;
      pivot.add(petal);
      lotus.add(pivot);
    }
  }
  lotus.add(mesh(cylinder(0.022, 0.018, 0.03, 12), mat('#ffd23f', { roughness: 0.6, emissive: '#ffb000', emissiveIntensity: 0.3 }), 0, 0.05, 0));
  g.add(lotus);

  // Carpes koï qui remontent et descendent le courant
  const koiColors = [['#ff7a1a', '#fff4e6'], ['#fff4e6', '#e8401c'], ['#ffb02e', '#ffffff']];
  const kois = koiColors.map(([a, b], i) => {
    const k = new THREE.Group();
    const bodyM = mat(a, { roughness: 0.4 });
    const spotM = mat(b, { roughness: 0.4 });
    const body = mesh(sphere(0.05, 14, 10), bodyM);
    body.scale.set(0.75, 0.55, 2);
    k.add(body);
    const spot = mesh(sphere(0.035, 10, 8), spotM, 0, 0.012, 0.02);
    spot.scale.set(0.8, 0.5, 1.3);
    k.add(spot);
    const tail = new THREE.Group();
    tail.position.z = -0.1;
    const fin = new THREE.Mesh(new THREE.CircleGeometry(0.045, 3), mat(a, { roughness: 0.5, side: THREE.DoubleSide }));
    fin.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    fin.position.z = -0.03;
    tail.add(fin);
    k.add(tail);
    // Zone de clic invisible, plus grosse que le poisson
    k.add(new THREE.Mesh(sphere(0.17, 8, 6), new THREE.MeshBasicMaterial({ visible: false })));
    k.rotation.order = 'YXZ';
    // Ronds dans l'eau au départ et à l'arrivée d'un saut
    const splash = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 24), new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0, depthWrite: false }));
    splash.rotation.x = -Math.PI / 2;
    g.add(splash);
    k.userData = { phase: i / 3, speed: 0.035 + i * 0.008, dir: i % 2 ? -1 : 1, lane: (i - 1) * 0.16, tail, jump: 0, splash, splashT: 0 };
    g.add(k);
    return k;
  });

  // Galets, rochers, pas japonais et nénuphars sont immobiles ; roseaux, lotus et koï bougent
  mergeStatic(g, [...reeds, lotus, ...kois]);
  scene.add(g);

  const update = (t, dt) => {
    // Rivière : le courant glisse, les koï nagent en ondulant.
    ripples.offset.x = -t * 0.12;
    for (const r of reeds) {
      const u = r.userData;
      r.rotation.set(u.leanZ + Math.sin(t * 1.1 + u.phase) * 0.05, 0, -u.lean + Math.sin(t * 1.6 + u.phase) * 0.06);
    }
    for (const k of kois) {
      const u = k.userData;
      const raw = (u.phase + t * u.speed) % 1;
      const s = 0.06 + (u.dir > 0 ? raw : 1 - raw) * 0.88;
      const p = riverAt(s);
      const sway = u.lane + Math.sin(t * 0.9 + u.phase * 7) * 0.08;
      // Easter egg : saut hors de l'eau avec un looping complet (le nez monte, passe sur le dos, replonge).
      let y = 0.045, pitch = 0;
      if (u.jump > 0) {
        u.jump = Math.max(0, u.jump - dt);
        const j = 1 - u.jump / FISH_JUMP;
        y += Math.sin(Math.PI * j) * 0.75;
        pitch = -Math.PI * 2 * THREE.MathUtils.smoothstep(j, 0.05, 0.95);
        if (u.jump === 0) splashAt(k, p.x + p.nx * sway, p.z + p.nz * sway);
      }
      k.position.set(p.x + p.nx * sway, y, p.z + p.nz * sway);
      k.rotation.y = Math.atan2(p.tx * u.dir, p.tz * u.dir) + (u.jump > 0 ? 0 : Math.sin(t * 6 + u.phase * 5) * 0.12);
      k.rotation.x = pitch;
      u.tail.rotation.y = Math.sin(t * (u.jump > 0 ? 22 : 9) + u.phase * 5) * 0.5;
      if (u.splashT > 0) {
        u.splashT = Math.max(0, u.splashT - dt);
        const s2 = 1 - u.splashT / 0.7;
        u.splash.scale.setScalar(1 + s2 * 3);
        u.splash.material.opacity = (1 - s2) * 0.8;
      }
    }
    lotus.rotation.y = Math.sin(t * 0.25) * 0.3;
    lotus.position.y = 0.034 + Math.sin(t * 1.3) * 0.004;
  };
  // Les koï sont cliquables (main.js) : jumpFish les fait sauter.
  update.kois = kois;
  update.jumpFish = (k) => {
    if (k.userData.jump > 0) return;
    k.userData.jump = FISH_JUMP;
    splashAt(k, k.position.x, k.position.z);
  };
  return update;
}

const FISH_JUMP = 1.3; // durée du saut d'une koï (s)

function splashAt(k, x, z) {
  const u = k.userData;
  u.splash.position.set(x, 0.04, z);
  u.splashT = 0.7;
}
