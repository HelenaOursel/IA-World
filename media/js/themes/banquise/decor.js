// Décor de la Banquise : mer, blocs de glace, igloos, sapins, neige, aurore boréale et sol enneigé.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, sphere } from '../../geometry.js';
import { paintBlotches } from '../shared.js';

/** Neige qui tombe : le mouvement est calculé dans le shader, rien n'est recalculé en JavaScript. */
function snowfall(scene, count = 700) {
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - 0.5) * 30, Math.random() * 14, (Math.random() - 0.5) * 30], i * 3);
    speed[i] = 0.6 + (i % 5) * 0.12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('speed', new THREE.BufferAttribute(speed, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, scale: { value: (window.innerHeight * Math.min(window.devicePixelRatio, 2)) / 2 } },
    vertexShader:
      'uniform float time; uniform float scale; attribute float speed;' +
      'void main(){ vec3 p = position;' +
      ' p.y = mod(p.y - time * speed, 14.0);' +
      ' p.x += sin(time * 0.5 + position.z) * 0.4;' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.0);' +
      ' gl_PointSize = 0.11 * scale / -mv.z;' +
      ' gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, 0.9); }',
  });
  const flakes = new THREE.Points(geo, material);
  flakes.frustumCulled = false;
  scene.add(flakes);
  return (t) => (material.uniforms.time.value = t);
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

export function banquiseDecor(scene) {
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

export function paintSnow(g, size) {
  g.fillStyle = '#d6e6f1';
  g.fillRect(0, 0, size, size);
  paintBlotches(g, size, ['245,250,255', '180,210,232', '205,228,244'], 260, 0.5, 40, 160);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 2200; i++) g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
}
