// Instruments scientifiques posés sur la station (thème Espace) :
// projecteur d'hologramme, paillasse de labo, télescope, oscilloscope et conteneurs d'échantillons.
import * as THREE from '../../../vendor/three.module.min.js';
import { CanvasScreen, cylinder, mat, mesh, neon, roundedBox, scanlines } from '../../geometry.js';

const steel = () => mat('#c9ced8', { metalness: 0.6, roughness: 0.3 });
const glass = () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide });

/** Pose un objet en (x, z) sur le bord de la plate-forme, tourné vers le centre. */
function place(scene, g, x, z) {
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, -z);
  scene.add(g);
}

/** Planète holographique qui tourne au-dessus d'un projecteur. */
function hologram(scene) {
  const g = new THREE.Group();
  g.add(mesh(cylinder(0.42, 0.5, 0.22, 28), steel(), 0, 0.11, 0));
  g.add(mesh(cylinder(0.3, 0.3, 0.04, 28), neon('#4cc9f0', 1.4), 0, 0.24, 0));
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.28, 0.9, 28, 1, true),
    neon('#4cc9f0', 0.8, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = 0.7;
  g.add(beam);
  const globe = new THREE.Group();
  globe.position.y = 1.25;
  g.add(globe);
  const grid = new THREE.MeshBasicMaterial({ color: new THREE.Color('#4cc9f0').multiplyScalar(1.3), wireframe: true, transparent: true, opacity: 0.6 });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), grid));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), neon('#4cc9f0', 0.6, { transparent: true, opacity: 0.18, depthWrite: false })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 6, 48), neon('#ffd54f', 1.4));
  ring.rotation.x = Math.PI / 2 - 0.4;
  globe.add(ring);
  place(scene, g, -6.35, 3.0);
  return (t) => {
    globe.rotation.y = t * 0.5;
    globe.position.y = 1.25 + Math.sin(t * 1.3) * 0.04;
    beam.material.opacity = 0.1 + Math.sin(t * 3) * 0.03;
  };
}

/** Paillasse : éprouvettes lumineuses, ballon qui bouillonne et petit microscope. */
function labBench(scene) {
  const g = new THREE.Group();
  g.add(mesh(roundedBox(1.5, 0.07, 0.65, 0.03), steel(), 0, 0.72, 0));
  for (const x of [-0.65, 0.65]) g.add(mesh(roundedBox(0.08, 0.7, 0.55, 0.03), mat('#9aa3b1', { metalness: 0.4, roughness: 0.4 }), x, 0.35, 0));

  g.add(mesh(roundedBox(0.6, 0.05, 0.14, 0.02), steel(), -0.35, 0.8, -0.12));
  const colors = ['#3ddc97', '#b388ff', '#4cc9f0', '#ff6ec7', '#ffd54f'];
  const tubeGlass = glass();
  const tubes = colors.map((c, i) => {
    const x = -0.59 + i * 0.12;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 12, 1, true), tubeGlass);
    tube.position.set(x, 0.92, -0.12);
    g.add(tube);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12), neon(c, 1.3));
    liquid.position.set(x, 0.86, -0.12);
    g.add(liquid);
    return liquid;
  });

  const flaskGlass = glass();
  const flask = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), flaskGlass);
  flask.position.set(0.35, 0.89, 0.05);
  g.add(flask);
  const brew = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), neon('#3ddc97', 1.2));
  brew.position.copy(flask.position);
  g.add(brew);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10, 1, true), flaskGlass);
  neck.position.set(0.35, 1.06, 0.05);
  g.add(neck);
  const bubbles = [0, 1, 2].map((i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), neon('#b9ffd9', 1.2, { transparent: true }));
    g.add(b);
    return { b, phase: i / 3 };
  });

  const scope = new THREE.Group();
  scope.position.set(0, 0.755, 0.12);
  scope.add(mesh(roundedBox(0.16, 0.03, 0.12, 0.01), mat('#2a2f3c'), 0, 0.015, 0));
  scope.add(mesh(cylinder(0.015, 0.015, 0.2, 8), mat('#2a2f3c'), -0.05, 0.12, 0));
  const eyepiece = mesh(cylinder(0.022, 0.022, 0.14, 10), steel(), 0, 0.2, 0.02);
  eyepiece.rotation.x = -0.4;
  scope.add(eyepiece);
  g.add(scope);

  place(scene, g, 6.4, 3.0);
  return (t) => {
    tubes.forEach((l, i) => l.material.color.set(colors[i]).multiplyScalar(1.1 + Math.sin(t * 2 + i) * 0.3));
    for (const { b, phase } of bubbles) {
      const k = (t * 0.8 + phase) % 1;
      b.position.set(0.35 + Math.sin(k * 9) * 0.01, 0.92 + k * 0.3, 0.05);
      b.material.opacity = 1 - k;
    }
  };
}

/** Télescope sur trépied, pointé vers la grande planète. */
function telescope(scene, target) {
  const g = new THREE.Group();
  const leg = mat('#9aa3b1', { metalness: 0.4, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const l = mesh(cylinder(0.025, 0.03, 1.15, 8), leg, Math.sin(a) * 0.28, 0.55, Math.cos(a) * 0.28);
    l.rotation.set(Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32);
    g.add(l);
  }
  const head = new THREE.Group();
  head.position.y = 1.15;
  g.add(head);
  // Tube couché le long de z : lookAt le dirige ensuite vers la cible
  const tube = mesh(cylinder(0.09, 0.13, 1.1, 24), mat('#eef1f6', { roughness: 0.4 }), 0, 0, 0.15);
  tube.rotation.x = Math.PI / 2;
  head.add(tube);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), neon('#7df9ff', 1.2));
  lens.position.z = 0.71;
  head.add(lens);
  head.add(mesh(new THREE.TorusGeometry(0.135, 0.02, 8, 24), mat('#4f7fd9'), 0, 0, -0.35));
  place(scene, g, -7.05, -0.9);
  g.updateMatrixWorld(true);
  head.lookAt(target);
  return null;
}

/** Console d'oscilloscope avec une courbe qui ondule. */
function oscilloscope(scene) {
  const g = new THREE.Group();
  g.add(mesh(roundedBox(0.9, 0.85, 0.5, 0.06), mat('#c9ced8', { metalness: 0.5, roughness: 0.35 }), 0, 0.425, 0));
  let phase = 0;
  const screen = new CanvasScreen(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#04120c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(61,220,151,0.22)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) ctx.strokeRect(x, 0, 0, h);
    for (let y = 0; y <= h; y += 32) ctx.strokeRect(0, y, w, 0);
    ctx.strokeStyle = '#3ddc97';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = h / 2 + Math.sin(x * 0.06 + phase) * h * 0.25 + Math.sin(x * 0.17 - phase * 1.7) * h * 0.08;
      if (x) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    scanlines(ctx, w, h, 0.25);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), new THREE.MeshBasicMaterial({ map: screen.texture }));
  face.position.set(0, 0.6, 0.252);
  g.add(face);
  for (const x of [-0.25, 0, 0.25]) {
    const knob = mesh(cylinder(0.04, 0.04, 0.04, 16), mat('#2a2f3c'), x, 0.22, 0.26);
    knob.rotation.x = Math.PI / 2;
    g.add(knob);
  }
  place(scene, g, 7.05, -0.9);
  let wait = 0;
  return (t, dt) => {
    wait += dt;
    if (wait < 0.08) return;
    phase += wait * 3;
    wait = 0;
    screen.redraw();
  };
}

/** Conteneurs d'échantillons, chacun marqué d'une bande lumineuse. */
function samples(scene) {
  const g = new THREE.Group();
  g.add(mesh(roundedBox(1.1, 0.08, 0.5, 0.03), steel(), 0, 0.04, 0));
  for (const [c, x] of [['#b388ff', -0.35], ['#4cc9f0', 0], ['#3ddc97', 0.35]]) {
    g.add(mesh(cylinder(0.12, 0.12, 0.5, 20), mat('#eef1f6', { roughness: 0.4 }), x, 0.33, 0));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 20), neon(c, 1.4));
    band.position.set(x, 0.33, 0);
    g.add(band);
    g.add(mesh(cylinder(0.08, 0.12, 0.06, 20), mat('#9aa3b1'), x, 0.61, 0));
  }
  place(scene, g, -4.0, -6.2);
  return null;
}

/** Ajoute tous les instruments ; `target` : point visé par le télescope. Renvoie animate(t, dt). */
export function scienceInstruments(scene, target) {
  const parts = [hologram(scene), labBench(scene), telescope(scene, target), oscilloscope(scene), samples(scene)].filter(Boolean);
  return (t, dt) => {
    for (const animate of parts) animate(t, dt);
  };
}
