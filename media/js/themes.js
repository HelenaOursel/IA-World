// Thèmes de l'univers : ambiance (ciel, lumières, sol, matières), personnages et décor propre.
// La disposition des postes reste la même dans tous les thèmes.
import * as THREE from '../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon, sphere } from './geometry.js';

// ------------------------------------------------------------------ banquise

function snowfall(scene, count = 700) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) pos.set([(Math.random() - 0.5) * 30, Math.random() * 14, (Math.random() - 0.5) * 30], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
  scene.add(flakes);
  return (t, dt) => {
    const p = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = p.getY(i) - dt * (0.6 + (i % 5) * 0.12);
      if (y < 0) y += 14;
      p.setXYZ(i, p.getX(i) + Math.sin(t + i) * dt * 0.2, y, p.getZ(i));
    }
    p.needsUpdate = true;
  };
}

function igloo(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, -z);
  const snow = mat('#f4f9fd', { roughness: 0.85 });
  g.add(mesh(new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), snow));
  // Joints des blocs de neige
  const line = mat('#cfe2ef', { roughness: 0.9 });
  for (let i = 1; i < 4; i++) {
    const r = Math.cos((i / 4) * (Math.PI / 2)) * 0.86;
    const ring = mesh(new THREE.TorusGeometry(r, 0.012, 6, 40), line, 0, Math.sin((i / 4) * (Math.PI / 2)) * 0.86, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  const tunnel = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 20, 1, false, 0, Math.PI), snow, 0, 0, 0.78);
  tunnel.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  g.add(tunnel);
  g.add(mesh(new THREE.CircleGeometry(0.26, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#1d3346' }), 0, 0.005, 1.09));
  scene.add(g);
}

function snowyPine(scene, x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.add(mesh(cylinder(0.08, 0.11, 0.4, 10), mat('#7a5638'), 0, 0.2, 0));
  [[0.6, 0.8, 0.65], [0.46, 0.68, 1.1], [0.32, 0.56, 1.5]].forEach(([r, h, y]) => {
    g.add(mesh(new THREE.ConeGeometry(r, h, 18), mat('#2f6b4f', { roughness: 0.8 }), 0, y, 0));
    g.add(mesh(new THREE.ConeGeometry(r * 0.72, h * 0.42, 18), mat('#f4f9fd', { roughness: 0.85 }), 0, y + h * 0.3, 0));
  });
  scene.add(g);
}


/** Aurore boréale : voiles lumineux qui ondulent dans le fond étoilé, derrière la banquise. */
function aurora(scene) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { time: { value: 0 }, phase: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform float time; uniform float phase; varying vec2 vUv;' +
      'void main(){' +
      ' float x = vUv.x + phase;' +
      // Le voile ondule : sa hauteur varie le long de l'aurore et dans le temps
      ' float y = vUv.y + 0.12 * sin(x * 18.0 + time * 0.35) + 0.05 * sin(x * 47.0 - time * 0.6);' +
      ' float band = smoothstep(0.05, 0.38, y) * smoothstep(0.98, 0.55, y);' +
      ' float rays = 0.5 + 0.5 * sin(x * 260.0 + time * 1.1 + sin(x * 31.0 + time * 0.25) * 4.0);' +
      ' float flicker = 0.6 + 0.4 * sin(time * 0.5 + x * 23.0);' +
      ' float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);' +
      ' vec3 col = mix(vec3(0.12, 1.0, 0.55), vec3(0.62, 0.32, 1.0), smoothstep(0.4, 1.0, y));' +
      ' gl_FragColor = vec4(col * band * (0.35 + 0.65 * rays) * flicker * ends * 0.8, 1.0); }',
  });
  // Deux rubans courbes qui entourent l'arrière de l'île, à des distances différentes
  const veils = [
    // Rayon, hauteur, centre vertical : assez hauts pour se voir en plongée comme en vue rasante
    [48, 42, -9, 0],
    [58, 48, -7, 0.37],
  ].map(([radius, height, y, phase]) => {
    const m = mat.clone();
    m.uniforms.phase.value = phase;
    const veil = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 128, 1, true, Math.PI * 0.3, Math.PI * 1.4), m);
    veil.position.y = y;
    scene.add(veil);
    return m;
  });
  return (t) => {
    for (const m of veils) m.uniforms.time.value = t;
  };
}

function banquiseDecor(scene) {
  // Mer autour de la banquise et blocs de glace qui dérivent
  const sea = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: '#123f66', roughness: 0.15, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.42;
  sea.receiveShadow = true;
  scene.add(sea);
  const ice = mat('#e8f6ff', { roughness: 0.3 });
  const floes = [];
  for (let i = 0; i < 9; i++) {
    const m = mesh(new THREE.CylinderGeometry(0.6 + Math.random() * 0.9, 0.7 + Math.random() * 0.9, 0.3, 7), ice);
    m.userData = { a: (i / 9) * Math.PI * 2 + Math.random(), r: 11 + Math.random() * 6, speed: 0.01 + Math.random() * 0.015 };
    scene.add(m);
    floes.push(m);
  }
  igloo(scene, -6.3, 3.0);
  igloo(scene, 6.4, 3.0);
  for (const [x, z, s] of [[-4.0, -6.2, 0.9], [4.0, -6.2, 1], [-7.0, -1.0, 0.75], [7.1, -0.8, 0.8]]) snowyPine(scene, x, z, s);
  for (const [x, z, s] of [[-2.8, -6.9, 1], [3.1, -7.0, 0.8], [-7.2, 1.6, 0.9], [7.3, 1.6, 0.7], [-5.6, 5.4, 0.9]]) {
    const pile = mesh(sphere(0.45 * s, 20, 12), mat('#f4f9fd', { roughness: 0.9 }), x, 0.05, z);
    pile.scale.set(1.3, 0.45, 1);
    scene.add(pile);
  }
  const snow = snowfall(scene);
  const lights = aurora(scene);
  return (t, dt) => {
    snow(t, dt);
    lights(t);
    for (const f of floes) {
      const u = f.userData;
      u.a += u.speed * dt;
      f.position.set(Math.cos(u.a) * u.r, -0.35 + Math.sin(t * 0.8 + u.r) * 0.04, Math.sin(u.a) * u.r);
      f.rotation.y = u.a * 2;
    }
  };
}

// -------------------------------------------------------------------- espace

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

function espaceDecor(scene) {
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

// --------------------------------------------------------------------- slime

function mushroom(scene, x, z, s, color) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.add(mesh(cylinder(0.07, 0.1, 0.5, 12), mat('#efe3ff', { roughness: 0.7 }), 0, 0.25, 0));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), neon(color, 1.3));
  cap.position.y = 0.48;
  cap.scale.set(1, 0.7, 1);
  g.add(cap);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const dot = new THREE.Mesh(sphere(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    dot.position.set(Math.cos(a) * 0.16, 0.62, Math.sin(a) * 0.16);
    g.add(dot);
  }
  scene.add(g);
}

function slimeDecor(scene) {
  const colors = ['#ff6ec7', '#7df9ff', '#b5ff4d', '#c77dff'];
  const spots = [[-4.0, -6.2], [4.0, -6.2], [-7.0, -1.0], [7.1, -0.8], [-6.3, 3.0], [6.4, 3.0], [-2.8, -6.9], [3.1, -7.0]];
  spots.forEach(([x, z], i) => {
    mushroom(scene, x, z, 1 + (i % 3) * 0.25, colors[i % colors.length]);
    mushroom(scene, x + 0.45, z + 0.2, 0.6, colors[(i + 1) % colors.length]);
  });
  // Flaques de gelée lumineuse d'où montent des bulles
  const puddles = [[-6.0, 4.6], [6.1, 4.4], [-1.8, -7.2], [7.0, -3.6], [-7.0, -3.6]];
  const pools = puddles.map(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), neon(colors[i % colors.length], 0.9, { transparent: true, opacity: 0.7 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.scale.set(1.3, 0.9, 1);
    scene.add(m);
    return m;
  });
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 });
  const bubbles = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(sphere(0.06 + Math.random() * 0.08, 14, 10), bubbleMat);
    m.userData = { pool: pools[i % pools.length], t: Math.random() * 4, dx: (Math.random() - 0.5) * 0.6, dz: (Math.random() - 0.5) * 0.4 };
    scene.add(m);
    bubbles.push(m);
  }
  return (t, dt) => {
    for (const b of bubbles) {
      const u = b.userData;
      u.t += dt;
      if (u.t > 4) u.t = 0;
      const p = u.pool.position;
      b.position.set(p.x + u.dx + Math.sin(u.t * 3) * 0.05, 0.05 + u.t * 0.6, p.z + u.dz);
      b.scale.setScalar(Math.min(1, u.t * 2) * (u.t > 3.6 ? (4 - u.t) / 0.4 : 1));
    }
    pools.forEach((m, i) => m.scale.set(1.3 + Math.sin(t * 2 + i) * 0.05, 0.9 + Math.cos(t * 2 + i) * 0.05, 1));
  };
}

// --------------------------------------------------------------------- thèmes

export const THEMES = {
  usine: {
    id: 'usine',
    name: 'Usine · robots',
    skin: 'robot',
    shell: 'robot@usine:~$',
  },
  banquise: {
    id: 'banquise',
    name: 'Banquise · pingouins',
    skin: 'penguin',
    shell: 'pingouin@banquise:~$',
    sky: { top: '#030814', mid: '#0d2340', bottom: '#14304f' },
    stars: 900,
    fog: { color: '#0b1d33', near: 45, far: 130 },
    hemi: { sky: '#9fc3ff', ground: '#2a4766', intensity: 0.75 },
    sun: { color: '#d4e4ff', intensity: 1.1 },
    floor: { style: 'snow', mark: 'rgba(70,130,180,0.3)', metalness: 0, roughness: 0.9 },
    platform: { side: '#a9cfe6', band: '#8fbcd9', rim: '#ffffff', rimIntensity: 0.6, underside: false },
    tint: { color: '#b7d3e6', amount: 0.6 },
    bloom: { strength: 0.45, threshold: 0.85 },
    exposure: 0.9,
    dock: 'ice',
    conveyor: 'river',
    decor: banquiseDecor,
  },
  espace: {
    id: 'espace',
    name: 'Espace · astronautes',
    skin: 'astronaut',
    shell: 'astro@station:~$',
    sky: { top: '#020008', mid: '#150a33', bottom: '#000000' },
    stars: 2600,
    fog: { color: '#05030f', near: 60, far: 160 },
    hemi: { sky: '#c9d6ff', ground: '#2a2340', intensity: 0.9 },
    sun: { color: '#ffffff', intensity: 2.2 },
    floor: { style: 'panels', bg: '#5e6674', panel: [150, 158, 172], jitter: 6, bolt: '#7c8595', mark: 'rgba(60,140,255,0.35)', metalness: 0.5, roughness: 0.45 },
    platform: { side: '#c5ccd6', band: '#9aa3b1', rim: '#4cc9f0', rimIntensity: 1.4, tiers: ['#b8c0cc', '#a7b0bd'], tierRims: ['#4cc9f0', '#ff7a1a'] },
    tint: { color: '#cfd6e0', amount: 0.7 },
    dock: 'satellite',
    conveyor: 'asteroids',
    decor: espaceDecor,
  },
  slime: {
    id: 'slime',
    name: 'Slime · gelée',
    skin: 'slime',
    shell: 'slime@marais:~$',
    sky: { top: '#16052b', mid: '#5b1d70', bottom: '#ff8fb8' },
    stars: 700,
    fog: { color: '#341048', near: 40, far: 110 },
    hemi: { sky: '#ffb3e6', ground: '#2a3a1a', intensity: 1.0 },
    sun: { color: '#ffe0f4', intensity: 1.7 },
    floor: { style: 'goo', mark: 'rgba(181,255,77,0.22)', metalness: 0.1, roughness: 0.6 },
    platform: { side: '#3a2057', band: '#2c1544', rim: '#b5ff4d', rimIntensity: 1.6, tiers: ['#2f1a47', '#3a2057'], tierRims: ['#b5ff4d', '#ff6ec7'], thrusterColor: '#b5ff4d' },
    tint: { color: '#3d2257', amount: 0.5 },
    decor: slimeDecor,
  },
};

export const DEFAULT_THEME = 'usine';

export function getTheme(id) {
  return THEMES[id] ?? THEMES[DEFAULT_THEME];
}
