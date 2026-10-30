// Petits robots industriels cubiques (Claude et ses agents).
import * as THREE from '../vendor/three.module.min.js';
import { easeOutBack, lerpAngle, mat, mesh, metal, roundRect, roundedBox, scanlines } from './geometry.js';

const POSE_KEYS = ['sLx', 'sLz', 'eL', 'sRx', 'sRz', 'eR', 'tiltX', 'tiltZ', 'yaw', 'bob', 'lift'];

const BASE_H = 0.14;

function drawFace(g, w, h, s) {
  g.fillStyle = '#03060c';
  g.fillRect(0, 0, w, h);
  const col = s.expr === 'error' ? '#ff4d6d' : '#7df9ff';
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.shadowColor = col;
  g.shadowBlur = 14;
  const cx = w / 2 + s.eyeX * 22, cy = h * 0.44 + s.eyeY * 12, dx = 44, ew = 28, eh = 40;
  const eyes = (height, yOff = 0) => {
    for (const x of [cx - dx, cx + dx]) {
      roundRect(g, x - ew / 2, cy - height / 2 + yOff, ew, Math.max(5, height), Math.min(10, height / 2));
      g.fill();
    }
  };
  switch (s.expr) {
    case 'blink':
      eyes(5);
      break;
    case 'focus':
      eyes(eh * 0.45);
      break;
    case 'think':
      eyes(eh * 0.6, -6);
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = i < s.dots ? 1 : 0.25;
        g.beginPath();
        g.arc(w / 2 - 18 + i * 18, h * 0.82, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      break;
    case 'happy':
      g.lineWidth = 9;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.arc(x, cy + 10, 16, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
      break;
    case 'surprise':
      g.lineWidth = 8;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.arc(x, cy, 16, 0, Math.PI * 2);
        g.stroke();
      }
      break;
    case 'error':
      g.lineWidth = 9;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.moveTo(x - 13, cy - 13);
        g.lineTo(x + 13, cy + 13);
        g.moveTo(x + 13, cy - 13);
        g.lineTo(x - 13, cy + 13);
        g.stroke();
      }
      break;
    default:
      eyes(eh);
  }
  if (s.expr === 'talk') {
    for (let i = 0; i < 5; i++) {
      const bh = 4 + s.mouth * (8 + ((i * 7) % 5) * 3) * (i === 2 ? 1.3 : 1);
      g.fillRect(w / 2 - 34 + i * 14, h * 0.84 - bh / 2, 8, bh);
    }
  }
  g.shadowBlur = 0;
  scanlines(g, w, h, 0.28);
}

export class Character {
  constructor({ id, name, agentType = '', color, isMain = false }) {
    this.id = id;
    this.name = name;
    this.agentType = agentType;
    this.color = color;
    this.isMain = isMain;
    this.size = isMain ? 0.7 : 0.6;

    this.root = new THREE.Group();
    this.chassis = new THREE.Group();
    this.root.add(this.chassis);

    this.action = 'idle';
    this.path = [];
    this.face = null;
    this.speed = isMain ? 2.3 : 2.7;
    this.phase = Math.random() * 6;
    this.reaction = null;
    this.scaleAnim = null;
    this.blinkAt = 2 + Math.random() * 3;
    this.lastEventAt = performance.now();
    this.pose = Object.fromEntries(POSE_KEYS.map((k) => [k, 0]));
    this.faceState = { expr: 'normal', eyeX: 0, eyeY: 0, mouth: 0, dots: 0 };
    this.faceKey = '';

    this.build();
  }

  build() {
    const S = this.size;
    const c = this.chassis;

    // Socle sombre sous le cube
    c.add(mesh(roundedBox(S * 0.86, BASE_H, S * 0.86, 0.05), metal('#262b35'), 0, BASE_H / 2, 0));

    // Corps cubique (pivote comme une tourelle)
    this.body = new THREE.Group();
    this.bodyY = BASE_H + 0.02 + S / 2;
    this.body.position.y = this.bodyY;
    c.add(this.body);
    const b = this.body;
    b.add(mesh(roundedBox(S, S, S, 0.05), mat(this.color, { metalness: 0.3, roughness: 0.45 })));
    b.add(mesh(roundedBox(S * 0.82, S * 0.54, 0.03, 0.02), mat('#07090f', { roughness: 0.15, metalness: 0.2 }), 0, S * 0.07, S / 2 + 0.006));

    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 192;
    this.faceCanvas.height = 120;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: this.faceTex });
    faceMat.color.setScalar(1.6);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.76, S * 0.475), faceMat);
    face.position.set(0, S * 0.07, S / 2 + 0.023);
    b.add(face);

    // Bras simples en deux segments
    const armMat = metal('#3c4352');
    const makeArm = (sx) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * (S / 2 + 0.035), -S * 0.05, 0.02);
      shoulder.add(mesh(roundedBox(0.06, 0.26, 0.06, 0.028, 4), armMat, 0, -0.11, 0));
      const elbow = new THREE.Group();
      elbow.position.y = -0.23;
      elbow.add(mesh(roundedBox(0.055, 0.24, 0.055, 0.026, 4), armMat, 0, -0.1, 0));
      shoulder.add(elbow);
      b.add(shoulder);
      return { shoulder, elbow };
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);
  }

  /** Point au-dessus du robot, en coordonnées monde (pour les bulles). */
  topPosition(out) {
    return this.root.localToWorld(out.set(0, this.bodyY + this.size / 2 + 0.5, 0));
  }

  setPosition(v) {
    this.root.position.copy(v);
  }

  get moving() {
    return this.path.length > 0;
  }

  /** Roule vers `spot` en contournant la borne centrale, puis prend l'action donnée. */
  goTo(spot, action) {
    const from = this.root.position.clone();
    const to = spot.pos.clone();
    const path = [];
    const seg = to.clone().sub(from);
    const len2 = seg.lengthSq();
    if (len2 > 0.0001) {
      const t = THREE.MathUtils.clamp(-from.dot(seg) / len2, 0, 1);
      const closest = from.clone().addScaledVector(seg, t);
      const d = closest.length();
      if (d < 1.6 && t > 0.05 && t < 0.95 && to.length() > 1.4) {
        const out = d > 0.01 ? closest.normalize() : new THREE.Vector3(-seg.z, 0, seg.x).normalize();
        path.push(out.multiplyScalar(2.1));
      }
    }
    path.push(to);
    this.path = path;
    this.face = spot.face;
    this.action = action;
  }

  setAction(action) {
    this.action = action;
  }

  react(type, duration = 1.2) {
    this.reaction = { type, t: 0, duration };
  }

  appear(duration = 0.8) {
    this.scaleAnim = { from: 0, to: 1, t: 0, duration, ease: easeOutBack };
    this.root.scale.setScalar(0.001);
  }

  vanish(onDone, duration = 0.6) {
    this.scaleAnim = { from: 1, to: 0, t: 0, duration, ease: (x) => x * x, onDone };
  }

  update(dt, t) {
    let moving = false;
    while (this.path.length) {
      const target = this.path[0];
      const dx = target.x - this.root.position.x;
      const dz = target.z - this.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.04) {
        this.path.shift();
        continue;
      }
      const step = Math.min(dist, this.speed * dt);
      this.root.position.x += (dx / dist) * step;
      this.root.position.z += (dz / dist) * step;
      this.root.rotation.y = lerpAngle(this.root.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 9));
      moving = true;
      break;
    }
    if (!moving && this.face !== null) {
      this.root.rotation.y = lerpAngle(this.root.rotation.y, this.face, 1 - Math.exp(-dt * 6));
    }

    const action = moving ? 'drive' : this.action;
    const target = this.computePose(action, t);
    const face = this.computeFace(action, t, dt);
    this.applyReaction(target, face, dt, t);

    const k = 1 - Math.exp(-dt * 12);
    for (const key of POSE_KEYS) this.pose[key] += (target[key] - this.pose[key]) * k;
    const p = this.pose;
    this.armL.shoulder.rotation.set(p.sLx, 0, p.sLz);
    this.armL.elbow.rotation.x = p.eL;
    this.armR.shoulder.rotation.set(p.sRx, 0, p.sRz);
    this.armR.elbow.rotation.x = p.eR;
    this.body.rotation.set(p.tiltX, p.yaw, p.tiltZ);
    this.body.position.y = this.bodyY + p.bob;
    this.chassis.position.y = p.lift;

    this.updateFace(face);

    if (this.scaleAnim) {
      const a = this.scaleAnim;
      a.t += dt;
      const x = Math.min(1, a.t / a.duration);
      this.root.scale.setScalar(Math.max(0.001, a.from + (a.to - a.from) * a.ease(x)));
      if (x >= 1) {
        this.scaleAnim = null;
        a.onDone?.();
      }
    }
  }

  computePose(action, t) {
    const p = Object.fromEntries(POSE_KEYS.map((k) => [k, 0]));
    p.sLz = -0.12;
    p.sRz = 0.12;
    p.eL = -0.25;
    p.eR = -0.25;
    p.bob = Math.sin(t * 2 + this.phase) * 0.006;
    const type = (offset) => -1.45 + Math.sin(t * 16 + offset) * 0.07;

    switch (action) {
      case 'drive':
        p.sLx = p.sRx = -0.5;
        p.eL = p.eR = -1.1;
        p.tiltX = -0.04;
        p.bob = Math.sin(t * 40) * 0.004;
        break;
      case 'idle':
        p.yaw = Math.sin(t * 0.4 + this.phase) * 0.45;
        p.tiltX = Math.sin(t * 0.3) * 0.03;
        break;
      case 'type':
        p.sLx = type(0);
        p.sRx = type(Math.PI);
        p.eL = p.eR = -0.15;
        p.sLz = 0.12;
        p.sRz = -0.12;
        p.tiltX = -0.06;
        p.bob = Math.abs(Math.sin(t * 8)) * 0.006;
        break;
      case 'read':
        p.sRx = type(0);
        p.eR = -0.15;
        p.sRz = -0.12;
        p.sLx = -1.2;
        p.eL = -0.5;
        p.tiltX = -0.12;
        p.yaw = Math.sin(t * 0.9) * 0.06;
        break;
      case 'search':
        p.sRx = type(1);
        p.eR = -0.15;
        p.sRz = -0.12;
        p.sLx = -2.1;
        p.eL = -1.4;
        p.sLz = 0.35;
        p.yaw = Math.sin(t * 2.2) * 0.18;
        p.tiltX = -0.08;
        break;
      case 'plan':
        p.sRx = -2.4 + Math.sin(t * 4) * 0.12;
        p.sRz = 0.1 + Math.cos(t * 4) * 0.12;
        p.eR = -0.2;
        p.tiltX = -0.22;
        p.yaw = Math.sin(t * 0.8) * 0.1;
        break;
      case 'summon':
        p.sLx = -2.7 + Math.sin(t * 6) * 0.15;
        p.sRx = -2.7 + Math.sin(t * 6 + 1) * 0.15;
        p.sLz = -0.4;
        p.sRz = 0.4;
        p.tiltX = -0.15;
        break;
      case 'think':
        p.sRx = -2.2;
        p.eR = -1.45;
        p.sRz = -0.35;
        p.tiltX = -0.1;
        p.tiltZ = 0.08 + Math.sin(t * 1.2) * 0.04;
        p.yaw = Math.sin(t * 0.7) * 0.08;
        break;
      case 'talk':
        p.sRx = -0.8 + Math.sin(t * 4.2) * 0.4;
        p.eR = -0.6;
        p.sLx = -0.5 + Math.sin(t * 3.1 + 1) * 0.3;
        p.eL = -0.5;
        p.sLz = -0.3;
        p.sRz = 0.3;
        p.bob = Math.abs(Math.sin(t * 6)) * 0.02;
        break;
      case 'ask':
        p.sRx = -2.9;
        p.sRz = 0.4 + Math.sin(t * 9) * 0.35;
        p.eR = -0.2;
        p.tiltZ = Math.sin(t * 3) * 0.08;
        p.bob = Math.abs(Math.sin(t * 5)) * 0.04;
        break;
    }
    return p;
  }

  computeFace(action, t, dt) {
    const f = { expr: 'normal', eyeX: 0, eyeY: 0, mouth: 0, dots: 0 };
    switch (action) {
      case 'type':
      case 'read':
      case 'search':
        f.expr = 'focus';
        f.eyeX = action === 'read' ? Math.sin(t * 2.4) * 0.5 : Math.sin(t * 1.3) * 0.2;
        f.eyeY = -0.4;
        break;
      case 'plan':
      case 'drive':
        f.eyeY = action === 'plan' ? -0.6 : 0;
        break;
      case 'think':
        f.expr = 'think';
        f.eyeX = 0.4;
        f.eyeY = -0.5;
        f.dots = Math.floor(t * 3) % 4;
        break;
      case 'talk':
        f.expr = 'talk';
        f.mouth = 0.3 + Math.abs(Math.sin(t * 11)) * 0.7;
        break;
      case 'ask':
        f.expr = 'surprise';
        break;
      case 'summon':
        f.expr = 'happy';
        break;
      case 'idle':
        f.eyeX = Math.sin(t * 0.4 + this.phase) * -0.6;
        break;
    }
    // Clignement
    this.blinkAt -= dt;
    if (this.blinkAt < 0 && (f.expr === 'normal' || f.expr === 'focus')) f.expr = 'blink';
    if (this.blinkAt < -0.12) this.blinkAt = 2 + Math.random() * 3.5;
    return f;
  }

  updateFace(f) {
    const key = `${f.expr}|${f.eyeX.toFixed(1)}|${f.eyeY.toFixed(1)}|${f.mouth.toFixed(1)}|${f.dots}`;
    if (key === this.faceKey) return;
    this.faceKey = key;
    drawFace(this.faceCanvas.getContext('2d'), this.faceCanvas.width, this.faceCanvas.height, f);
    this.faceTex.needsUpdate = true;
  }

  applyReaction(p, f, dt, t) {
    const r = this.reaction;
    if (!r) return;
    r.t += dt;
    const x = r.t / r.duration;
    if (x >= 1) {
      this.reaction = null;
      return;
    }
    const fade = 1 - x;
    if (r.type === 'error') {
      f.expr = 'error';
      p.yaw += Math.sin(t * 30) * 0.25 * fade;
      p.tiltZ += Math.sin(t * 34) * 0.06 * fade;
      p.sLx = -0.4;
      p.sRx = -0.4;
      p.sLz = -0.9 * fade - 0.1;
      p.sRz = 0.9 * fade + 0.1;
    } else if (r.type === 'jump') {
      f.expr = 'happy';
      p.lift = Math.abs(Math.sin(x * Math.PI * 3)) * 0.35 * fade;
      p.yaw += x * Math.PI * 2;
      p.sLx = p.sRx = -2.8;
      p.sLz = -0.45;
      p.sRz = 0.45;
    } else if (r.type === 'wave') {
      f.expr = 'happy';
      p.sRx = -2.8;
      p.sRz = 0.5 + Math.sin(t * 10) * 0.4;
    } else if (r.type === 'surprise') {
      f.expr = 'surprise';
      p.lift = Math.sin(x * Math.PI) * 0.12;
      p.sLz -= 0.7 * fade;
      p.sRz += 0.7 * fade;
    }
  }
}
