// Gribouillis des robots désœuvrés sur le tableau de planification, tracés trait par trait à la craie fluo.

const TAU = Math.PI * 2;
const CHALK = ['#ffe066', '#ff8fab', '#7df9ff', '#b9fbc0', '#cdb4db', '#ffffff'];

// Les formes sont décrites dans un carré [-1, 1] (y vers le bas), comme une liste de traits.
export function arc(cx, cy, rx, ry, a0, a1, n = 22) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}
export const circle = (cx, cy, r, n = 22) => arc(cx, cy, r, r, -Math.PI / 2, -Math.PI / 2 + TAU, n);
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
export const mirror = (stroke) => stroke.map(([x, y]) => [-x, y]);

const SHAPES = {
  'un cœur': () => [
    Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * TAU;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return [x / 17, -y / 17 - 0.1];
    }),
  ],
  'une étoile': () => [
    Array.from({ length: 11 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 0.42 : 1;
      return [Math.cos(a) * r, Math.sin(a) * r + 0.08];
    }),
  ],
  'un smiley': () => [circle(0, 0, 0.95, 28), circle(-0.33, -0.25, 0.08, 8), circle(0.33, -0.25, 0.08, 8), arc(0, 0.05, 0.5, 0.45, 0.15 * Math.PI, 0.85 * Math.PI, 12)],
  'un chat': () => {
    const ear = [[-0.72, -0.2], [-0.6, -0.95], [-0.22, -0.55]];
    const whisker = (y, dy) => [[-0.35, y], [-1, y + dy]];
    return [
      arc(0, 0.15, 0.82, 0.7, -0.62 * Math.PI, 1.38 * Math.PI, 30),
      ear,
      mirror(ear),
      [[-0.32, -0.02], [-0.32, 0.14]],
      [[0.32, -0.02], [0.32, 0.14]],
      [[-0.07, 0.28], [0.07, 0.28], [0, 0.36], [-0.07, 0.28]],
      [...arc(-0.13, 0.4, 0.13, 0.12, 0, Math.PI * 0.95, 6).reverse(), ...arc(0.13, 0.4, 0.13, 0.12, Math.PI * 0.05, Math.PI, 6).reverse()],
      whisker(0.3, -0.12),
      whisker(0.42, 0.05),
      mirror(whisker(0.3, -0.12)),
      mirror(whisker(0.42, 0.05)),
    ];
  },
  'un soleil': () => [
    circle(0, 0, 0.45, 22),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * TAU;
      return [[Math.cos(a) * 0.62, Math.sin(a) * 0.62], [Math.cos(a) * 0.95, Math.sin(a) * 0.95]];
    }),
    circle(-0.15, -0.1, 0.04, 6),
    circle(0.15, -0.1, 0.04, 6),
    arc(0, 0.04, 0.2, 0.16, 0.2 * Math.PI, 0.8 * Math.PI, 8),
  ],
  'une fleur': () => [
    circle(0, -0.4, 0.18, 14),
    ...Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 5) * TAU;
      return circle(Math.cos(a) * 0.38, -0.4 + Math.sin(a) * 0.38, 0.22, 14);
    }),
    [[0, -0.18], [0.04, 0.3], [0, 0.95]],
    arc(0.3, 0.45, 0.3, 0.16, Math.PI, TAU + Math.PI, 14),
  ],
  'un robot': () => [
    rect(-0.62, -0.38, 0.62, 0.62),
    [[0, -0.38], [0, -0.74]],
    circle(0, -0.85, 0.11, 10),
    circle(-0.27, 0.0, 0.13, 12),
    circle(0.27, 0.0, 0.13, 12),
    arc(0, 0.22, 0.25, 0.18, 0.15 * Math.PI, 0.85 * Math.PI, 10),
    [[-0.62, 0.1], [-0.85, 0.25]],
    [[0.62, 0.1], [0.85, 0.25]],
  ],
  'une maison': () => [
    rect(-0.68, -0.1, 0.68, 0.9),
    [[-0.85, -0.05], [0, -0.85], [0.85, -0.05]],
    rect(-0.2, 0.4, 0.2, 0.9),
    rect(0.3, 0.08, 0.55, 0.3),
    [[0.42, -0.5], [0.42, -0.78], [0.6, -0.78], [0.6, -0.32]],
  ],
  'un poisson': () => [
    arc(-0.15, 0, 0.62, 0.42, 0.18 * Math.PI, 1.82 * Math.PI, 26),
    [[0.4, -0.2], [0.95, -0.5], [0.95, 0.5], [0.4, 0.2]],
    circle(-0.5, -0.08, 0.07, 8),
    circle(-0.9, -0.55, 0.08, 8),
    circle(-0.75, -0.85, 0.06, 8),
  ],
  'un escargot': () => [
    Array.from({ length: 50 }, (_, i) => {
      const a = (i / 49) * TAU * 2.4;
      const r = 0.6 * (1 - i / 55);
      return [0.15 + Math.cos(-a) * r, -0.05 + Math.sin(-a) * r];
    }).reverse(),
    [[-0.95, 0.6], [0.85, 0.6], [0.7, 0.5]],
    [[-0.8, 0.6], [-0.95, 0.1]],
    [[-0.65, 0.6], [-0.62, 0.08]],
    circle(-0.95, 0.04, 0.05, 6),
    circle(-0.62, 0.02, 0.05, 6),
  ],
  'un fantôme': () => [
    [...arc(0, -0.2, 0.62, 0.7, Math.PI, TAU, 16), [0.62, 0.8], [0.4, 0.62], [0.2, 0.8], [0, 0.62], [-0.2, 0.8], [-0.4, 0.62], [-0.62, 0.8], [-0.62, -0.2]],
    circle(-0.22, -0.22, 0.09, 8),
    circle(0.22, -0.22, 0.09, 8),
    circle(0, 0.12, 0.1, 8),
  ],
  'un bonhomme': () => [
    circle(0, -0.62, 0.28, 18),
    [[0, -0.34], [0, 0.4]],
    [[-0.6, -0.25], [0, -0.05], [0.6, -0.35]],
    [[-0.45, 0.95], [0, 0.4], [0.45, 0.95]],
    arc(0, -0.6, 0.14, 0.1, 0.2 * Math.PI, 0.8 * Math.PI, 6),
  ],
};

// Petits mots, uniquement en caractères du clavier.
const WORDS = ['IA <3', 'Bip boup', 'Coucou !', 'Hihi', 'Pas sage', 'zZz', 'Vive la recre !', ':)'];

let lastKind = '';

/** Prépare un dessin centré en (cx, cy) sur le tableau, de taille `size` (px).
 * `set` (theme.doodles) peut remplacer les formes, les mots et les craies : { shapes, words, chalk, weights }. */
export function makeDoodle(cx, cy, size, color, set = {}) {
  const shapes = set.shapes ?? SHAPES, words = set.words ?? WORDS, chalk = set.chalk ?? CHALK;
  const kinds = [...Object.keys(shapes), 'mot'];
  let kind;
  // Tirage pondéré (`set.weights`, 1 par défaut), sans refaire deux fois de suite le même dessin
  const weight = (k) => (k === lastKind ? 0 : set.weights?.[k] ?? 1);
  let r = Math.random() * kinds.reduce((sum, k) => sum + weight(k), 0);
  kind = kinds.find((k) => (r -= weight(k)) < 0) ?? kinds[0];
  lastKind = kind;

  const d = {
    kind,
    color: Math.random() < 0.5 && color ? color : chalk[Math.floor(Math.random() * chalk.length)],
    cx,
    cy,
    tilt: (Math.random() - 0.5) * 0.35,
    progress: 0,
    drawing: true,
    age: 0,
    life: 35 + Math.random() * 15,
    fade: 2.5,
  };
  if (kind === 'mot') {
    d.text = words[Math.floor(Math.random() * words.length)];
    // Taille de police plafonnée pour que le mot ne dépasse pas ~1,7 fois la taille d'un dessin.
    d.size = Math.round(Math.min(size * 0.36, (size * 1.7) / (d.text.length * 0.55)));
    d.duration = Math.min(5, 1.5 + d.text.length * 0.3);
    d.label = `« ${d.text} »`;
    return d;
  }
  // Main un peu tremblante : chaque point bouge d'un ou deux pixels.
  const half = size / 2;
  d.strokes = shapes[kind]().map((s) => s.map(([x, y]) => [x * half + (Math.random() - 0.5) * 2.5, y * half + (Math.random() - 0.5) * 2.5]));
  d.lengths = d.strokes.map((s) => s.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - s[i][0], p[1] - s[i][1]), 0));
  d.total = d.lengths.reduce((a, b) => a + b, 0);
  d.duration = Math.min(7, Math.max(3, d.total / 110));
  d.label = kind;
  return d;
}

/** Fait disparaître un dessin en `seconds` secondes. */
export function eraseDoodle(d, seconds = 0.8) {
  d.drawing = false;
  if (d.life - d.age > seconds) {
    d.fade = seconds;
    d.life = d.age + seconds;
  }
}

export function drawDoodles(ctx, doodles) {
  for (const d of doodles) {
    const alpha = Math.max(0, Math.min(1, (d.life - d.age) / d.fade));
    if (alpha <= 0 || d.progress <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha * 0.92;
    ctx.translate(d.cx, d.cy);
    ctx.rotate(d.tilt);
    ctx.strokeStyle = ctx.fillStyle = d.color;
    ctx.shadowColor = d.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (d.text) {
      // Le mot apparaît de gauche à droite, comme écrit à la main.
      ctx.font = `700 ${d.size}px "Segoe Print", "Comic Sans MS", cursive`;
      const w = ctx.measureText(d.text).width;
      ctx.beginPath();
      ctx.rect(-w / 2 - 4, -d.size, (w + 8) * Math.min(1, d.progress), d.size * 2);
      ctx.clip();
      ctx.fillText(d.text, -w / 2, d.size * 0.35);
    } else {
      let budget = d.total * Math.min(1, d.progress);
      for (let i = 0; i < d.strokes.length && budget > 0; i++) {
        const s = d.strokes[i];
        ctx.beginPath();
        ctx.moveTo(s[0][0], s[0][1]);
        for (let j = 1; j < s.length && budget > 0; j++) {
          const [x0, y0] = s[j - 1], [x1, y1] = s[j];
          const len = Math.hypot(x1 - x0, y1 - y0);
          const k = Math.min(1, budget / Math.max(len, 0.001));
          ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
          budget -= len;
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
