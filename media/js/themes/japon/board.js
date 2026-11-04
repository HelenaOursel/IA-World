// Tableau de planification du thème Japon : panneau d'affichage de sanctuaire (cadre en cèdre, petit toit de tuiles,
// corde shimenawa et papiers shide), et un écran en papier washi où les tâches sont écrites à l'encre.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mergeStatic, mesh, neon, roundedBox, roundRect } from '../../geometry.js';
import { drawDoodles } from '../../doodles.js';
import { fitText } from '../../world/screens.js';

const cedar = mat('#6b4428', { roughness: 0.7 });
const dark = mat('#2a1a10', { roughness: 0.6 });
const tile = mat('#39404e', { roughness: 0.55, metalness: 0.2 });
const stone = mat('#8a8f98', { roughness: 0.95 });
const rope = mat('#d8c48a', { roughness: 0.95 });
const shide = mat('#f6f2e8', { roughness: 0.8, side: THREE.DoubleSide });

/** Petit toit à deux pans en tuiles, faîtage sombre. */
function roof(g) {
  for (const s of [-1, 1]) {
    const slab = mesh(roundedBox(3.6, 0.06, 0.46, 0.02), tile, 0, 2.73, s * 0.2 - 0.1);
    slab.rotation.x = s * 0.38;
    g.add(slab);
    // Rangs de tuiles : petites nervures sur chaque pan
    for (let i = 0; i < 13; i++) {
      const rib = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 6), tile, -1.68 + i * 0.28, 2.765, s * 0.2 - 0.1);
      rib.rotation.x = Math.PI / 2 + s * 0.38;
      g.add(rib);
    }
  }
  g.add(mesh(roundedBox(3.7, 0.07, 0.09, 0.025), dark, 0, 2.83, -0.1));
}

/** Corde de paille tressée le long du haut du cadre, et papiers shide en zigzag devant les poteaux (pas sur l'écran). */
function shimenawa(g) {
  const curve = new THREE.CatmullRomCurve3([-1.6, -0.8, 0, 0.8, 1.6].map((x) => new THREE.Vector3(x, 2.66 - (1 - (x / 1.6) ** 2) * 0.03, 0.0)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 8), rope));
  for (const x of [-1.55, 1.55]) {
    // Zigzag : quatre petits rectangles décalés, de plus en plus bas
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.PlaneGeometry(0.09, 0.07), shide, x + (k % 2 ? 0.045 : -0.02), 2.58 - k * 0.07, 0.085));
  }
}

/** Cadre du tableau : poteaux de cèdre sur socles de pierre, encadrement, toit et shimenawa. */
function build(g, color) {
  const frame = new THREE.Group();
  for (const x of [-1.55, 1.55]) {
    frame.add(mesh(roundedBox(0.14, 2.75, 0.14, 0.03), cedar, x, 1.375, -0.1));
    frame.add(mesh(roundedBox(0.3, 0.12, 0.3, 0.03), stone, x, 0.06, -0.1));
  }
  // Fond et encadrement autour de l'écran de papier (2,75 × 1,6 centré à 1,75 m)
  frame.add(mesh(roundedBox(3.0, 1.8, 0.06, 0.02), dark, 0, 1.75, -0.12));
  frame.add(mesh(roundedBox(3.1, 0.1, 0.1, 0.02), cedar, 0, 2.6, -0.08));
  frame.add(mesh(roundedBox(3.1, 0.1, 0.1, 0.02), cedar, 0, 0.9, -0.08));
  for (const x of [-1.43, 1.43]) frame.add(mesh(roundedBox(0.08, 1.75, 0.09, 0.02), cedar, x, 1.75, -0.08));
  // Traverse basse entre les poteaux
  frame.add(mesh(roundedBox(3.1, 0.07, 0.07, 0.02), cedar, 0, 0.35, -0.1));
  roof(frame);
  shimenawa(frame);
  g.add(mergeStatic(frame));
  // Fin liseré à la couleur du poste sous le cadre, comme sur les autres thèmes
  g.add(mesh(new THREE.BoxGeometry(2.9, 0.015, 0.015), neon(color, 1.4), 0, 0.84, -0.03));
}

// L'écran est éclairci (×1,35) par world.js : les teintes du papier sont donc choisies plus sombres.
const PAPER = '#b9aa8a';
const INK = '#1e1712';
const FADED = '#6e6352';
const VERMILION = '#b3261e';

let washi;
/** Texture du papier washi (fibres et taches), dessinée une seule fois : l'écran est redessiné souvent. */
function paper(w, h) {
  if (washi) return washi;
  washi = document.createElement('canvas');
  washi.width = w;
  washi.height = h;
  const g = washi.getContext('2d');
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${Math.random() < 0.5 ? '120,100,70' : '210,195,160'},0.12)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fibres de papier
  g.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI, l = 6 + Math.random() * 22;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '90,75,50' : '235,225,200'},0.25)`;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return washi;
}

/** Trait de pinceau horizontal, plus épais au départ et effilé à la fin. */
function brushLine(ctx, x0, x1, y, width, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0, y - width / 2);
  ctx.quadraticCurveTo((x0 + x1) / 2, y - width * 0.3, x1, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + width * 0.4, x0, y + width / 2);
  ctx.fill();
}

/** Ensō : cercle tracé d'un seul geste au pinceau, laissé ouvert. */
function enso(ctx, x, y, r, color, width = 4) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.lineWidth = width * (1 - k * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, r - k * 0.8, -0.3 + k * 0.4, Math.PI * 1.75 - k * 0.2);
    ctx.stroke();
  }
}

/** Sceau rouge (hanko) avec un caractère blanc. */
function hanko(ctx, x, y, size, char) {
  ctx.fillStyle = VERMILION;
  roundRect(ctx, x, y, size, size, size * 0.15);
  ctx.fill();
  ctx.fillStyle = '#f1e2c8';
  ctx.font = `700 ${Math.round(size * 0.66)}px "Yu Mincho", "MS Mincho", "Noto Serif JP", serif`;
  const tw = ctx.measureText(char).width;
  ctx.fillText(char, x + (size - tw) / 2, y + size * 0.74);
}

const SERIF = '"Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", Georgia, serif';

/** Écran du tableau : titre au pinceau, tâches à l'encre, sceaux rouges pour les tâches finies. */
function draw(ctx, w, h, todos, doodles) {
  ctx.drawImage(paper(w, h), 0, 0);
  // En-tête : « 予定 » (prévisions) puis le titre, souligné d'un trait de pinceau
  ctx.fillStyle = INK;
  ctx.font = `700 30px ${SERIF}`;
  ctx.fillText('予定', 20, 38);
  ctx.font = `600 21px ${SERIF}`;
  ctx.fillText('Plan de travail', 92, 36);
  brushLine(ctx, 16, w - 70, 52, 5, INK);
  hanko(ctx, w - 58, 10, 40, '計');

  if (!todos.length) {
    enso(ctx, w / 2, 190, 62, 'rgba(30,23,18,0.75)', 7);
    ctx.fillStyle = FADED;
    ctx.font = `italic 22px ${SERIF}`;
    const t = 'Aucune tâche pour l’instant…';
    ctx.fillText(t, (w - ctx.measureText(t).width) / 2, 300);
    drawDoodles(ctx, doodles);
    return;
  }
  const shown = todos.slice(0, 7);
  shown.forEach((t, i) => {
    const y = 66 + i * 45;
    const done = t.status === 'completed', doing = t.status === 'in_progress';
    // Tâche en cours : lavis vermillon pâle derrière la ligne
    if (doing) {
      ctx.fillStyle = 'rgba(179,38,30,0.16)';
      roundRect(ctx, 14, y + 2, w - 28, 38, 10);
      ctx.fill();
    }
    // Marque : petit sceau « 済 » (fait), ensō rouge (en cours), cercle d'encre (à faire)
    if (done) hanko(ctx, 22, y + 8, 26, '済');
    else if (doing) enso(ctx, 35, y + 21, 12, VERMILION, 3.5);
    else enso(ctx, 35, y + 21, 10, 'rgba(30,23,18,0.6)', 2.5);
    ctx.fillStyle = done ? FADED : INK;
    ctx.font = `${doing ? '700' : '500'} 22px ${SERIF}`;
    const text = fitText(ctx, t.content, w - 100);
    ctx.fillText(text, 62, y + 29);
    // Tâche finie : barrée d'un trait de pinceau
    if (done) brushLine(ctx, 58, 66 + ctx.measureText(text).width, y + 22, 3, 'rgba(30,23,18,0.55)');
    // Séparateur léger
    if (i < shown.length - 1) brushLine(ctx, 60, w - 30, y + 44, 1.2, 'rgba(30,23,18,0.18)');
  });
  if (todos.length > shown.length) {
    ctx.fillStyle = FADED;
    ctx.font = `italic 18px ${SERIF}`;
    ctx.fillText(`+ ${todos.length - shown.length} autres`, w - 130, h - 12);
  }
  drawDoodles(ctx, doodles);
}

export const board = { build, draw };
