// Train d'astéroïdes qui passent dans un scanner, à la place du tapis roulant (thème Espace).
import * as THREE from '../../../vendor/three.module.min.js';
import { CanvasScreen, cylinder, mesh, metal, neon, roundedBox, scanlines } from '../../geometry.js';

const ELEMENTS = ['FER', 'NICKEL', 'GLACE', 'SILICE', 'PLATINE', 'CARBONE'];

/** Composition au hasard : trois éléments dont les pourcentages font 100. */
function randomComposition() {
  const names = [...ELEMENTS].sort(() => Math.random() - 0.5).slice(0, 3);
  const a = 35 + Math.floor(Math.random() * 40);
  const b = Math.floor(Math.random() * (100 - a - 5)) + 5;
  return [[names[0], a], [names[1], b], [names[2], 100 - a - b]].sort((x, y) => y[1] - x[1]);
}

function drawScan(ctx, w, h, s) {
  ctx.fillStyle = '#03120d';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3ddc97';
  ctx.font = '700 22px Consolas, monospace';
  ctx.fillText(s.count ? `SCAN #${s.count}` : 'SCANNER PRÊT', 12, 28);
  s.parts.forEach(([name, pct], i) => {
    const y = 46 + i * 26;
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '18px Consolas, monospace';
    ctx.fillText(`${name.padEnd(8)}${String(pct).padStart(3)} %`, 12, y + 14);
    ctx.fillStyle = 'rgba(61,220,151,0.3)';
    ctx.fillRect(170, y, 74, 16);
    ctx.fillStyle = '#3ddc97';
    ctx.fillRect(170, y, (74 * pct) / 100, 16);
  });
  scanlines(ctx, w, h, 0.25);
}

/** Arche de scan au milieu du trajet : rideau laser, ligne de balayage et écran de composition. */
function buildScanner(g) {
  const frame = metal('#3a4150');
  for (const z of [-0.5, 0.5]) g.add(mesh(roundedBox(0.12, 1.05, 0.12, 0.04), frame, 0, 0.525, z));
  g.add(mesh(roundedBox(0.16, 0.12, 1.12, 0.04), frame, 0, 1.08, 0));
  for (const z of [-0.44, 0.44]) g.add(mesh(new THREE.BoxGeometry(0.02, 0.9, 0.02), neon('#3ddc97', 1.6), 0.07, 0.55, z));

  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 0.8),
    neon('#3ddc97', 1, { transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  curtain.rotation.y = Math.PI / 2;
  curtain.position.y = 0.6;
  g.add(curtain);
  const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.88), neon('#b9ffd9', 2));
  g.add(sweep);

  // Écran au-dessus de l'arche, tourné vers l'avant (vers la caméra)
  const state = { count: 0, parts: randomComposition() };
  const screen = new CanvasScreen(256, 128, (ctx, w, h) => drawScan(ctx, w, h, state));
  g.add(mesh(roundedBox(0.72, 0.38, 0.06, 0.03), frame, 0, 1.36, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.33), new THREE.MeshBasicMaterial({ map: screen.texture }));
  face.position.set(0, 1.36, 0.032);
  g.add(face);
  return { curtain, sweep, screen, state };
}

/** Train d'astéroïdes : des rochers qui flottent en tournoyant entre deux faisceaux, et passent au scanner. */
export function buildAsteroidTrain(scene, place) {
  const g = new THREE.Group();
  g.position.set(place.x, 0, place.z);
  const L = 5.6;
  for (const x of [-2.6, -0.9, 0.9, 2.6]) {
    g.add(mesh(cylinder(0.08, 0.13, 0.34, 14), metal('#3a4150'), x, 0.17, 0));
    const ring = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), neon('#4cc9f0', 1.4), x, 0.35, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  for (const z of [-0.3, 0.3]) g.add(mesh(new THREE.BoxGeometry(L, 0.018, 0.018), neon('#4cc9f0', 1.2), 0, 0.36, z));
  // Champ de traction très léger entre les faisceaux
  const field = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.6), neon('#4cc9f0', 0.6, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.36;
  g.add(field);
  const scanner = buildScanner(g);

  // Couleur de roche conservée : la teinte du thème ne doit pas la blanchir
  const rock = new THREE.MeshStandardMaterial({ color: '#7b7f8a', roughness: 0.95, flatShading: true });
  rock.userData.keepColor = true;
  // Grille verte qui recouvre l'astéroïde pendant qu'il est scanné
  const scanGrid = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3ddc97').multiplyScalar(1.8), wireframe: true, transparent: true, opacity: 0.85 });
  const ores = ['#b388ff', '#4cc9f0', '#3ddc97'];
  const rocks = [];
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.17 + Math.random() * 0.06, 1);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const s = 0.8 + Math.random() * 0.35;
      p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s);
    }
    geo.computeVertexNormals();
    a.add(mesh(geo, rock));
    const grid = new THREE.Mesh(geo, scanGrid);
    grid.scale.setScalar(1.06);
    grid.visible = false;
    a.add(grid);
    // Un astéroïde sur deux porte un minerai lumineux
    if (i % 2 === 0) a.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), neon(ores[i % ores.length], 1.6)).translateY(0.15).translateX(0.05));
    a.userData = { x: -L / 2 + (i / 6) * L, spin: 0.6 + Math.random(), phase: Math.random() * 6, grid, scanned: false };
    g.add(a);
    rocks.push(a);
  }
  scene.add(g);

  return (t, dt) => {
    let scanning = false;
    for (const a of rocks) {
      const u = a.userData;
      u.x += dt * 0.45;
      if (u.x > L / 2) {
        u.x -= L;
        u.scanned = false;
      }
      const edge = Math.min(1, (L / 2 - Math.abs(u.x)) / 0.35);
      a.position.set(u.x, 0.62 + Math.sin(t * 1.6 + u.phase) * 0.05, 0);
      a.rotation.set(t * u.spin, t * u.spin * 0.7, 0);
      a.scale.setScalar(Math.max(0.01, edge));
      // Dans l'arche : grille de scan, et nouvelle analyse à l'écran
      const inside = Math.abs(u.x) < 0.35;
      u.grid.visible = inside;
      scanning ||= inside;
      if (inside && !u.scanned) {
        u.scanned = true;
        scanner.state.count++;
        scanner.state.parts = randomComposition();
        scanner.screen.redraw();
      }
    }
    scanner.curtain.material.opacity = scanning ? 0.32 + Math.sin(t * 20) * 0.06 : 0.1;
    scanner.sweep.position.y = 0.25 + (Math.sin(t * (scanning ? 6 : 2)) * 0.5 + 0.5) * 0.7;
  };
}
