// Effets visuels : étincelles cubiques, ondes néon, cœurs, puces et signaux radio (prompts).
import * as THREE from '../vendor/three.module.min.js';
import { neon } from './geometry.js';

let heartTex;
function heartTexture() {
  if (heartTex) return heartTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ff5fa2';
  g.shadowColor = '#ff8cc0';
  g.shadowBlur = 8;
  g.beginPath();
  g.moveTo(32, 22);
  g.bezierCurveTo(32, 12, 14, 10, 12, 24);
  g.bezierCurveTo(10, 38, 26, 46, 32, 54);
  g.bezierCurveTo(38, 46, 54, 38, 52, 24);
  g.bezierCurveTo(50, 10, 32, 12, 32, 22);
  g.fill();
  heartTex = new THREE.CanvasTexture(c);
  heartTex.colorSpace = THREE.SRGBColorSpace;
  return heartTex;
}

/** Petite puce électronique : circuit vert, broches dorées, cœur lumineux. */
function buildChip() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: '#1d7a4b', roughness: 0.5 })));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: '#15181f', roughness: 0.3, metalness: 0.4 })));
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcf5a', metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.05), gold);
      a.position.set(-0.075 + i * 0.05, 0, side * 0.14);
      g.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), gold);
      b.position.set(side * 0.14, 0, -0.075 + i * 0.05);
      g.add(b);
    }
  }
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.05), neon('#3ddc97', 2.5));
  g.add(core);
  return g;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];
    this.signals = [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 240; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
      m.visible = false;
      scene.add(m);
      this.particles.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 1, size: 0.05, gravity: 0, glow: 1, alive: false });
    }

    this.hearts = [];
    const heartMat = new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false });
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(heartMat.clone());
      s.visible = false;
      scene.add(s);
      this.hearts.push({ s, life: 0, max: 1, phase: 0, x: 0, z: 0, alive: false });
    }
    this.chips = [];
  }

  /** Petits cœurs qui s'envolent en se dandinant. */
  heart(pos, count = 1) {
    let n = 0;
    for (const h of this.hearts) {
      if (h.alive) continue;
      h.alive = true;
      h.life = 0;
      h.max = 1.1 + Math.random() * 0.5;
      h.phase = Math.random() * 6;
      h.x = pos.x + (Math.random() - 0.5) * 0.4;
      h.z = pos.z + (Math.random() - 0.5) * 0.4;
      h.y = pos.y + Math.random() * 0.1;
      h.s.visible = true;
      if (++n >= count) break;
    }
  }

  /** Puce électronique qui vole jusqu'au robot puis disparaît dedans. `target()` donne sa position actuelle. */
  chip(from, target, onCatch, onArrive) {
    const g = buildChip();
    g.position.copy(from);
    this.scene.add(g);
    this.chips.push({ g, t: 0, from: from.clone(), target, onCatch, onArrive, caught: false });
  }

  /** Projette des petits cubes depuis `pos`. glow > 1 les fait briller. */
  burst(pos, { count = 12, colors = ['#ffffff'], speed = 1.5, up = 1.5, life = 1, size = 0.06, gravity = -3, glow = 2 } = {}) {
    let n = 0;
    for (const p of this.particles) {
      if (p.alive) continue;
      p.alive = true;
      p.life = 0;
      p.max = life * (0.7 + Math.random() * 0.6);
      p.size = size * (0.6 + Math.random() * 0.8);
      p.gravity = gravity;
      p.glow = glow;
      p.m.visible = true;
      p.m.position.copy(pos);
      p.m.material.color.set(colors[Math.floor(Math.random() * colors.length)]).multiplyScalar(glow);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      p.v.set(Math.cos(a) * s, up * (0.5 + Math.random() * 0.8), Math.sin(a) * s);
      p.spin.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      if (++n >= count) break;
    }
  }

  /** Fumée grise (panne). */
  smoke(pos) {
    this.burst(pos, { count: 10, colors: ['#5b6270', '#7a8190', '#454b57'], speed: 0.4, up: 0.9, life: 1.6, size: 0.12, gravity: 0.3, glow: 1 });
  }

  /** Onde circulaire néon qui s'élargit. */
  ring(pos, { color = '#ffffff', from = 0.2, to = 2, life = 1.2, axis = 'y', opacity = 0.8 } = {}) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 48), neon(color, 2.2, { transparent: true, opacity, depthWrite: false }));
    m.position.copy(pos);
    if (axis === 'y') m.rotation.x = Math.PI / 2;
    this.scene.add(m);
    this.rings.push({ m, t: 0, from, to, life, opacity });
  }

  /** Signal radio : des ondes convergent vers `target()` (la pointe d'une antenne), puis `onArrive`. */
  signal(target, onArrive) {
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 48), neon('#7df9ff', 2.2, { transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = Math.PI / 2;
      this.scene.add(m);
      return m;
    });
    this.signals.push({ rings, t: 0, target, onArrive });
  }

  update(dt) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life += dt;
      if (p.life >= p.max) {
        p.alive = false;
        p.m.visible = false;
        continue;
      }
      p.v.y += p.gravity * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.spin.x * dt;
      p.m.rotation.y += p.spin.y * dt;
      const x = p.life / p.max;
      p.m.scale.setScalar(p.size * (1 - x * 0.5));
      p.m.material.opacity = 1 - x * x;
    }

    this.rings = this.rings.filter((r) => {
      r.t += dt;
      const x = r.t / r.life;
      if (x >= 1) {
        this.scene.remove(r.m);
        r.m.geometry.dispose();
        r.m.material.dispose();
        return false;
      }
      r.m.scale.setScalar(r.from + (r.to - r.from) * x);
      r.m.material.opacity = r.opacity * (1 - x);
      return true;
    });

    for (const h of this.hearts) {
      if (!h.alive) continue;
      h.life += dt;
      const x = h.life / h.max;
      if (x >= 1) {
        h.alive = false;
        h.s.visible = false;
        continue;
      }
      h.s.position.set(h.x + Math.sin(h.life * 5 + h.phase) * 0.08, h.y + h.life * 0.7, h.z);
      h.s.scale.setScalar(0.16 * Math.min(1, x * 5) * (1 - x * 0.3));
      h.s.material.opacity = 1 - x * x;
    }

    this.chips = this.chips.filter((c) => {
      c.t += dt;
      const end = c.target();
      // Vol en arc avec tournoiement, puis absorption dans le robot
      const x = Math.min(1, c.t / 1.1);
      const e = 1 - Math.pow(1 - x, 2);
      c.g.position.lerpVectors(c.from, end, e);
      c.g.position.y += Math.sin(x * Math.PI) * 0.8;
      c.g.rotation.set(c.t * 4, c.t * 6, 0);
      if (x > 0.6 && !c.caught) {
        c.caught = true;
        c.onCatch?.();
      }
      if (x >= 1) {
        const k = Math.min(1, (c.t - 1.1) / 0.3);
        c.g.scale.setScalar(Math.max(0.01, 1 - k));
        if (k >= 1) {
          this.burst(end, { count: 26, colors: ['#3ddc97', '#ffd54f', '#ffffff'], speed: 1.6, up: 1.8, life: 0.9, gravity: -2, size: 0.04 });
          this.scene.remove(c.g);
          c.onArrive?.();
          return false;
        }
      }
      return true;
    });

    this.signals = this.signals.filter((sg) => {
      sg.t += dt;
      const pos = sg.target();
      sg.rings.forEach((m, i) => {
        const x = THREE.MathUtils.clamp((sg.t - i * 0.22) / 0.6, 0, 1);
        m.position.copy(pos);
        m.scale.setScalar(Math.max(0.02, 1.4 * (1 - x)));
        m.material.opacity = x > 0 && x < 1 ? Math.sin(x * Math.PI) * 0.9 : 0;
      });
      if (sg.t < 0.22 * 2 + 0.6) return true;
      for (const m of sg.rings) {
        this.scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      }
      this.burst(pos, { count: 16, colors: ['#7df9ff', '#ffffff'], speed: 1, up: 1.2, life: 0.6, gravity: -1, size: 0.03 });
      sg.onArrive?.();
      return false;
    });
  }
}
