// Effets visuels : étincelles cubiques, ondes néon et paquets de données (prompts).
import * as THREE from '../vendor/three.module.min.js';
import { neon } from './geometry.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];
    this.packets = [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 240; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
      m.visible = false;
      scene.add(m);
      this.particles.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 1, size: 0.05, gravity: 0, glow: 1, alive: false });
    }
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

  /** Paquet de données qui descend du ciel dans un faisceau jusqu'à `target`. */
  packet(target, onArrive) {
    const g = new THREE.Group();
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.MeshStandardMaterial({ color: '#0d1424', metalness: 0.5, roughness: 0.3 }));
    g.add(cube);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.27, 0.27, 0.27)), new THREE.LineBasicMaterial({ color: new THREE.Color('#7df9ff').multiplyScalar(3) })));
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), neon('#7df9ff', 3));
    g.add(core);
    const end = target.clone().add(new THREE.Vector3(0, 2.1, 0));
    g.position.set(end.x, 9, end.z);
    this.scene.add(g);

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12, 1, true), neon('#7df9ff', 1.6, { transparent: true, opacity: 0.35, depthWrite: false }));
    this.scene.add(beam);
    this.packets.push({ g, beam, t: 0, from: g.position.clone(), target: end, onArrive });
    return g;
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

    this.packets = this.packets.filter((l) => {
      l.t += dt;
      const x = Math.min(1, l.t / 1.8);
      const e = 1 - Math.pow(1 - x, 3);
      l.g.position.lerpVectors(l.from, l.target, e);
      l.g.rotation.set(l.t * 2, l.t * 3, 0);
      const top = 10, bottom = l.g.position.y;
      l.beam.position.set(l.g.position.x, (top + bottom) / 2, l.g.position.z);
      l.beam.scale.set(1, top - bottom, 1);
      if (x >= 1 && !l.done) {
        l.done = true;
        l.hold = 1.4;
      }
      if (l.done) {
        l.hold -= dt;
        l.g.position.y = l.target.y + Math.sin(l.t * 3) * 0.05;
        l.beam.material.opacity = Math.max(0, l.hold / 1.4) * 0.35;
        if (l.hold <= 0) {
          this.burst(l.g.position, { count: 22, colors: ['#7df9ff', '#ffffff', '#4cc9f0'], speed: 1.3, up: 1, life: 0.8, gravity: -1, size: 0.05 });
          this.scene.remove(l.g, l.beam);
          l.onArrive?.();
          return false;
        }
      }
      return true;
    });
  }
}
