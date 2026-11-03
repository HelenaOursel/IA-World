// Longue console de pilotage à la place du tapis roulant (thème Vaisseau) : pupitre couvert de boutons
// lumineux, petits écrans animés, et une prise ronde où un droïde vient se brancher pour jouer avec les lumières.
import * as THREE from '../../../vendor/three.module.min.js';
import { CanvasScreen, mat, mesh, neon, roundedBox, scanlines } from '../../geometry.js';

const L = 5.4, D = 0.7, TOP = 0.74;
// Prise au bout droit vu de la caméra, là où on voit bien le droïde
const PORT_X = 1.8, PORT_Y = 0.35;
const PALETTE = ['#5ab0ff', '#ff3b3b', '#3ddc97', '#ffc53d', '#ffffff'].map((c) => new THREE.Color(c));

/**
 * Prise de la console, partagée avec les activités (actions.js) :
 * spot / face : où se placer et comment s'orienter ; playing : secondes de jeu de lumières restantes ;
 * busy : personnage déjà branché (une seule prise).
 */
export const consolePort = { spot: new THREE.Vector3(), socket: new THREE.Vector3(), face: 0, playing: 0, busy: null };

/** Petit écran de la console ; `kind` choisit le dessin (onde, barres, radar, codes). */
function miniScreen(kind) {
  const state = { t: 0 };
  const screen = new CanvasScreen(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#04080f';
    ctx.fillRect(0, 0, w, h);
    const c = ['#5ab0ff', '#3ddc97', '#ffc53d', '#ff6b6b'][kind];
    ctx.strokeStyle = ctx.fillStyle = c;
    ctx.lineWidth = 3;
    if (kind === 0) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = h / 2 + Math.sin(x * 0.07 + state.t * 4) * h * 0.25 + Math.sin(x * 0.2 - state.t * 7) * h * 0.08;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    } else if (kind === 1) {
      for (let i = 0; i < 12; i++) {
        const v = 0.25 + 0.7 * Math.abs(Math.sin(state.t * 2 + i * 0.9));
        ctx.fillRect(12 + i * 20, h - 10 - v * (h - 24), 12, v * (h - 24));
      }
    } else if (kind === 2) {
      ctx.lineWidth = 2;
      for (const r of [20, 38, 56]) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(state.t * 2) * 56, h / 2 + Math.sin(state.t * 2) * 56);
      ctx.stroke();
    } else {
      ctx.font = '16px Consolas, monospace';
      for (let r = 0; r < 6; r++) {
        let line = '';
        for (let k = 0; k < 5; k++) line += ((Math.floor(state.t * 3) * 7 + r * 13 + k * 29) % 256).toString(16).toUpperCase().padStart(2, '0') + ' ';
        ctx.fillText(line, 10, 22 + r * 19);
      }
    }
    scanlines(ctx, w, h, 0.25);
  });
  return { screen, state };
}

export function buildConsoleTable(scene, place) {
  const g = new THREE.Group();
  g.position.set(place.x, 0, place.z);
  scene.add(g);
  const hull = mat('#3a404c', { metalness: 0.6, roughness: 0.4 });
  const dark = mat('#1e2229', { metalness: 0.5, roughness: 0.45 });

  // Meuble, plinthe sombre et liseré bleu le long de la face avant (côté centre : -z, où se tient l'opérateur)
  g.add(mesh(roundedBox(L, TOP, D, 0.04), hull, 0, TOP / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(L - 0.1, 0.08, D + 0.02), dark, 0, 0.04, 0));
  g.add(mesh(new THREE.BoxGeometry(L, 0.02, 0.02), neon('#5ab0ff', 1.2), 0, TOP - 0.05, -D / 2 - 0.005));

  // Pupitre incliné vers l'opérateur, couvert de boutons (une seule instance, couleurs par bouton)
  const desk = new THREE.Group();
  desk.position.set(0, TOP + 0.03, -0.04);
  desk.rotation.x = -0.3;
  g.add(desk);
  desk.add(mesh(roundedBox(L - 0.1, 0.05, D - 0.12, 0.02), dark));
  const cols = 36, rows = 3;
  const buttons = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.03, 0.06), new THREE.MeshBasicMaterial(), cols * rows);
  const m4 = new THREE.Matrix4();
  const info = [];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const i = r * cols + k;
      m4.makeTranslation(-L / 2 + 0.25 + k * ((L - 0.5) / (cols - 1)), 0.035, -0.18 + r * 0.12);
      buttons.setMatrixAt(i, m4);
      const color = PALETTE[(k * 7 + r * 3) % PALETTE.length];
      buttons.setColorAt(i, color.clone().multiplyScalar(0.15));
      info.push({ k, color, rate: 0.5 + Math.random() * 2, phase: Math.random() * 6 });
    }
  }
  desk.add(buttons);

  // Petits écrans debout à l'arrière du pupitre
  const screens = [-2.0, -0.7, 0.6, 1.9].map((x, kind) => {
    const s = miniScreen(kind);
    const frame = new THREE.Group();
    frame.position.set(x, TOP + 0.3, D / 2 - 0.12);
    frame.rotation.x = 0.15;
    frame.add(mesh(roundedBox(0.86, 0.46, 0.05, 0.02), dark));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: s.screen.texture }));
    face.position.z = -0.027;
    face.rotation.y = Math.PI;
    frame.add(face);
    g.add(frame);
    return s;
  });

  // Prise ronde sur la face avant, à hauteur du bras d'un droïde
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 10, 32), neon('#5ab0ff', 1.6));
  ring.position.set(PORT_X, PORT_Y, -D / 2 - 0.01);
  g.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: '#05070b', side: THREE.DoubleSide }));
  hole.position.set(PORT_X, PORT_Y, -D / 2 - 0.008);
  g.add(hole);
  g.updateMatrixWorld(true);
  // Le droïde se tient 0,36 m devant la prise (portée de son bras), tourné vers la console
  consolePort.spot.copy(g.localToWorld(new THREE.Vector3(PORT_X, 0, -D / 2 - 0.36)));
  consolePort.socket.copy(g.localToWorld(new THREE.Vector3(PORT_X, PORT_Y, -D / 2)));
  consolePort.face = 0;

  const tmp = new THREE.Color();
  let wait = 0;
  return (t, dt) => {
    consolePort.playing = Math.max(0, consolePort.playing - dt);
    const playing = consolePort.playing > 0;
    wait += dt;
    if (wait < 0.08) return;
    wait = 0;
    info.forEach((b, i) => {
      if (playing) {
        // Jeu de lumières : vagues de couleurs qui parcourent le pupitre
        const wave = Math.sin(b.k * 0.5 - t * 9 + Math.floor(i / cols) * 0.8);
        tmp.setHSL((b.k / cols + t * 0.3) % 1, 0.9, 0.55).multiplyScalar(wave > 0 ? 2.2 : 0.15);
      } else {
        const on = Math.sin(t * b.rate + b.phase) > 0.55;
        tmp.copy(b.color).multiplyScalar(on ? 1.8 : 0.15);
      }
      buttons.setColorAt(i, tmp);
    });
    buttons.instanceColor.needsUpdate = true;
    ring.material.color.set('#5ab0ff').multiplyScalar(playing ? 1.6 + Math.sin(t * 14) * 0.6 : 1.2);
    for (const s of screens) {
      s.state.t = t * (playing ? 2.5 : 1);
      s.screen.redraw();
    }
  };
}
