// Dessins des pandas au tableau : motifs japonais tracés à la craie (formes dans un carré [-1, 1], y vers le bas).
import { arc, circle, mirror, rect } from '../../doodles.js';

const TAU = Math.PI * 2;

/** Ellipse de demi-axes (rx, ry) centrée en (cx, cy), tournée de `rot`. */
function ellipse(cx, cy, rx, ry, rot = 0, n = 16) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
}

const shapes = {
  // Chrysanthème : 16 pétales allongés autour d'un cœur, comme celui au dos du serveur
  'un chrysanthème': () => [
    circle(0, 0, 0.2, 16),
    ...Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * TAU;
      return ellipse(Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0.36, 0.085, a, 12);
    }),
  ],
  'un torii': () => [
    [[-1, -0.78], [-0.5, -0.66], [0.5, -0.66], [1, -0.78]],
    [[-0.88, -0.5], [0.88, -0.5]],
    [[-0.78, -0.22], [0.78, -0.22]],
    [[-0.5, -0.55], [-0.56, 0.95]],
    mirror([[-0.5, -0.55], [-0.56, 0.95]]),
    [[0, -0.5], [0, -0.22]],
  ],
  // Fleur de cerisier : cinq pétales échancrés au bout, et des étamines
  'une fleur de sakura': () => {
    const petals = Array.from({ length: 121 }, (_, i) => {
      const t = (i / 120) * TAU;
      const local = ((t + Math.PI / 5) % ((2 * Math.PI) / 5)) - Math.PI / 5;
      const r = 0.95 * Math.abs(Math.cos(2.5 * t)) ** 0.55 - 0.2 * Math.exp(-(local * local) / 0.004);
      return [Math.cos(t - Math.PI / 2) * r, Math.sin(t - Math.PI / 2) * r];
    });
    const stamens = Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + Math.PI / 5 + (i / 5) * TAU;
      return [[Math.cos(a) * 0.08, Math.sin(a) * 0.08], [Math.cos(a) * 0.3, Math.sin(a) * 0.3]];
    });
    return [petals, circle(0, 0, 0.08, 8), ...stamens];
  },
  'un panda': () => [
    circle(0, 0.1, 0.78, 28),
    circle(-0.62, -0.6, 0.22, 12),
    circle(0.62, -0.6, 0.22, 12),
    ellipse(-0.3, 0.02, 0.17, 0.24, 0.5, 12),
    ellipse(0.3, 0.02, 0.17, 0.24, -0.5, 12),
    circle(-0.27, 0.0, 0.05, 6),
    circle(0.27, 0.0, 0.05, 6),
    [[-0.08, 0.3], [0.08, 0.3], [0, 0.38], [-0.08, 0.3]],
    [...arc(-0.1, 0.42, 0.1, 0.1, 0, Math.PI, 6).reverse(), ...arc(0.1, 0.42, 0.1, 0.1, 0, Math.PI, 6).reverse()],
  ],
  'une carpe koï': () => [
    arc(-0.15, 0, 0.62, 0.36, 0.15 * Math.PI, 1.85 * Math.PI, 26),
    [[0.42, -0.18], [0.95, -0.55], [0.78, 0], [0.95, 0.55], [0.42, 0.18]],
    [[-0.2, -0.34], [0.05, -0.62], [0.2, -0.32]],
    [[-0.35, 0.32], [-0.2, 0.55], [-0.05, 0.35]],
    circle(-0.55, -0.08, 0.06, 6),
    ellipse(-0.1, -0.08, 0.14, 0.1, 0.3, 10),
    ellipse(0.2, 0.1, 0.1, 0.08, -0.4, 10),
    [[-0.78, 0.08], [-0.98, 0.22]],
  ],
  'des bambous': () => [
    [[-0.3, 0.95], [-0.3, -0.95]],
    [[-0.05, 0.95], [-0.05, -0.95]],
    [[-0.38, 0.4], [0.03, 0.4]],
    [[-0.38, -0.2], [0.03, -0.2]],
    [[-0.38, -0.75], [0.03, -0.75]],
    [[0.35, 0.95], [0.35, -0.5]],
    [[0.55, 0.95], [0.55, -0.5]],
    [[0.28, 0.25], [0.62, 0.25]],
    ellipse(0.35, -0.38, 0.3, 0.07, -0.6, 10),
    ellipse(-0.42, -0.5, 0.3, 0.07, 0.7, 10),
    ellipse(0.72, -0.15, 0.25, 0.06, -0.3, 10),
  ],
  'le mont Fuji': () => [
    [[-1, 0.7], [-0.25, -0.5], [0.25, -0.5], [1, 0.7]],
    [[-0.47, -0.15], [-0.3, -0.03], [-0.12, -0.18], [0.05, -0.03], [0.24, -0.18], [0.47, -0.15]],
    circle(0.68, -0.7, 0.2, 14),
    [[-0.95, 0.85], [-0.6, 0.78], [-0.25, 0.85], [0.1, 0.78], [0.45, 0.85], [0.8, 0.78]],
  ],
  'un onigiri': () => [
    [[0, -0.82], [0.12, -0.78], [0.82, 0.48], [0.78, 0.66], [-0.78, 0.66], [-0.82, 0.48], [-0.12, -0.78], [0, -0.82]],
    rect(-0.3, 0.2, 0.3, 0.66),
    circle(-0.25, -0.05, 0.05, 6),
    circle(0.25, -0.05, 0.05, 6),
    arc(0, 0.0, 0.12, 0.1, 0.15 * Math.PI, 0.85 * Math.PI, 6),
  ],
  'une lanterne': () => [
    [[0, -1], [0, -0.78]],
    rect(-0.3, -0.78, 0.3, -0.66),
    ellipse(0, 0.02, 0.6, 0.68, 0, 26),
    arc(0, 0.02, 0.6, 0.3, 0, Math.PI, 12),
    arc(0, -0.3, 0.45, 0.12, 0, Math.PI, 10),
    arc(0, 0.34, 0.45, 0.12, 0, Math.PI, 10),
    rect(-0.3, 0.7, 0.3, 0.82),
    [[0, 0.82], [0, 0.98]],
  ],
  'un éventail': () => [
    arc(0, 0.6, 0.95, 0.95, 1.1 * Math.PI, 1.9 * Math.PI, 20),
    arc(0, 0.6, 0.3, 0.3, 1.1 * Math.PI, 1.9 * Math.PI, 8),
    ...Array.from({ length: 7 }, (_, i) => {
      const a = (1.1 + (0.8 * i) / 6) * Math.PI;
      return [[Math.cos(a) * 0.08, 0.6 + Math.sin(a) * 0.08], [Math.cos(a) * 0.95, 0.6 + Math.sin(a) * 0.95]];
    }),
  ],
};

export const doodles = {
  shapes,
  // Le chrysanthème revient bien plus souvent que les autres dessins
  weights: { 'un chrysanthème': 4 },
  // Craies douces : rose sakura, or, vert bambou, bleu rivière, blanc
  chalk: ['#ffb7c5', '#ffd166', '#b9fbc0', '#9fe3ff', '#ffffff', '#ff8fab'],
  // Petits mots, uniquement en caractères du clavier
  words: ['Kawaii !', 'Arigato', 'Zen', 'Banzai !', 'Ommm', 'Itadakimasu', ':3', 'Sakura <3'],
  startLines: ['Hihi…', 'Chut !', 'Personne regarde ?', 'Juste un petit dessin…', 'Un peu de calligraphie…'],
  doneLines: ['Joli, non ?', 'Chef-d’oeuvre !', 'Kawaii !', 'Je signe ?', 'Sugoi !'],
};
