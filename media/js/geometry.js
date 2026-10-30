// Géométries lisses partagées (boîtes arrondies, matériaux mis en cache).
import * as THREE from '../vendor/three.module.min.js';

// Répartit les segments pour en concentrer la majorité dans les coins arrondis.
function remap(u, half, r) {
  const s = u / half;
  const a = Math.abs(s);
  const k = 0.3;
  const p = a <= k ? (a / k) * (half - r) : half - r + r * Math.sin(((a - k) / (1 - k)) * (Math.PI / 2));
  return Math.sign(s) * p;
}

const boxCache = new Map();

/** Boîte aux arêtes arrondies avec normales lisses (pas de coutures). */
export function roundedBox(w, h, d, r = 0.1, seg = 10) {
  const key = [w, h, d, r, seg].join(':');
  if (boxCache.has(key)) return boxCache.get(key);
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const hx = w / 2, hy = h / 2, hz = d / 2;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.set(remap(v.x, hx, r), remap(v.y, hy, r), remap(v.z, hz, r));
    c.set(
      THREE.MathUtils.clamp(v.x, -hx + r, hx - r),
      THREE.MathUtils.clamp(v.y, -hy + r, hy - r),
      THREE.MathUtils.clamp(v.z, -hz + r, hz - r),
    );
    n.subVectors(v, c);
    if (n.lengthSq() < 1e-12) continue;
    n.normalize();
    v.copy(c).addScaledVector(n, r);
    pos.setXYZ(i, v.x, v.y, v.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  g.computeBoundingSphere();
  boxCache.set(key, g);
  return g;
}

const matCache = new Map();

/** Matériau standard mat et doux, mis en cache par couleur. */
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opts });
  matCache.set(key, m);
  return m;
}

/** Crée un mesh qui projette et reçoit les ombres. */
export function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const sphere = (r, ws = 28, hs = 18) => new THREE.SphereGeometry(r, ws, hs);
export const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 18);
export const cylinder = (rt, rb, h, s = 28) => new THREE.CylinderGeometry(rt, rb, h, s);

/** Écran dessiné sur un canvas 2D et affiché comme texture. */
export class CanvasScreen {
  constructor(width, height, draw) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.draw = draw;
    this.redraw();
  }

  redraw() {
    this.draw(this.ctx, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;
  }
}

/** Rectangle arrondi pour les canvas 2D. */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Interpolation d'angle par le chemin le plus court. */
export function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Matériau lumineux (non éclairé) ; intensity > 1 le fait briller via le bloom. */
export function neon(color, intensity = 1.6, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color, ...opts });
  m.color.multiplyScalar(intensity);
  return m;
}

/** Métal sombre pour la structure de l'usine. */
export function metal(color = '#1d2330', opts = {}) {
  return mat(color, { metalness: 0.55, roughness: 0.42, ...opts });
}

/** Lignes de balayage façon écran. */
export function scanlines(ctx, w, h, alpha = 0.16) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
}
