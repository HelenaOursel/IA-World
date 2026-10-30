// Petits robots industriels cubiques (Claude et ses agents).
import * as THREE from '../vendor/three.module.min.js';
import { easeOutBack, lerpAngle, mat, mesh, neon, roundedBox, sphere } from './geometry.js';

const POSE_KEYS = ['sLx', 'sLz', 'eL', 'sRx', 'sRz', 'eR', 'tiltX', 'tiltZ', 'yaw', 'bob', 'lift'];

const HOVER_H = 0.16; // le cube lévite à cette hauteur

const screenCache = new Map();
/** Plaque d'écran aux coins arrondis (épaisseur 2 cm, bord biseauté). */
function screenGeometry(w, h, r) {
  const key = [w, h, r].join(':');
  if (screenCache.has(key)) return screenCache.get(key);
  const x = -w / 2, y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 14 });
  screenCache.set(key, g);
  return g;
}

const WHITE = new THREE.Color('#ffffff');

let glowTex;
/** Halo circulaire projeté au sol sous le robot. */
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

function drawFace(g, w, h, s) {
  g.clearRect(0, 0, w, h);
  const col = s.expr === 'error' ? '#ff4d6d' : s.color;
  const cx = w / 2 + s.eyeX * 16, cy = h * 0.4 + s.eyeY * 10, dx = 42, ew = 34, eh = 46;

  // Joues roses
  g.fillStyle = s.expr === 'happy' ? 'rgba(255,130,190,0.6)' : 'rgba(255,130,190,0.35)';
  for (const x of [w / 2 - 66, w / 2 + 66]) {
    g.beginPath();
    g.ellipse(x, h * 0.66, 15, 8, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = col;
  g.shadowBlur = 16;
  const eyes = (height, yOff = 0) => {
    for (const x of [cx - dx, cx + dx]) {
      g.beginPath();
      g.ellipse(x, cy + yOff, ew / 2, Math.max(3, height / 2), 0, 0, Math.PI * 2);
      g.fill();
    }
  };
  // Reflets brillants dans les yeux
  const sparkle = (yOff = 0) => {
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (const x of [cx - dx, cx + dx]) {
      g.beginPath();
      g.arc(x + 6, cy - 9 + yOff, 5.5, 0, Math.PI * 2);
      g.arc(x - 6, cy + 8 + yOff, 2.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = col;
    g.shadowBlur = 16;
  };
  const mouth = (draw) => {
    g.lineWidth = 6;
    g.beginPath();
    draw();
    g.stroke();
  };
  const smile = () => mouth(() => g.arc(w / 2, h * 0.66, 11, Math.PI * 0.15, Math.PI * 0.85));
  const heart = (x, y, size) => {
    const top = y - size / 2;
    g.beginPath();
    g.moveTo(x, top + size * 0.3);
    g.bezierCurveTo(x, top, x - size / 2, top, x - size / 2, top + size * 0.3);
    g.bezierCurveTo(x - size / 2, top + size * 0.6, x, top + size * 0.8, x, top + size);
    g.bezierCurveTo(x, top + size * 0.8, x + size / 2, top + size * 0.6, x + size / 2, top + size * 0.3);
    g.bezierCurveTo(x + size / 2, top, x, top, x, top + size * 0.3);
    g.fill();
  };

  switch (s.expr) {
    case 'blink':
      g.lineWidth = 7;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.arc(x, cy - 6, 13, Math.PI * 0.2, Math.PI * 0.8);
        g.stroke();
      }
      smile();
      break;
    case 'sleep':
      // Paupières closes tombantes et petite bouche qui respire.
      g.lineWidth = 6;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.arc(x, cy - 4, 15, Math.PI * 0.22, Math.PI * 0.78);
        g.stroke();
      }
      g.beginPath();
      g.ellipse(w / 2, h * 0.7, 4 + s.mouth * 2, 3 + s.mouth * 4, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'focus':
      eyes(eh * 0.62, 4);
      sparkle(4);
      mouth(() => {
        g.moveTo(w / 2 - 7, h * 0.72);
        g.lineTo(w / 2 + 7, h * 0.72);
      });
      break;
    case 'think':
      eyes(eh * 0.8, -4);
      sparkle(-4);
      g.lineWidth = 5;
      g.beginPath();
      g.arc(w / 2 + 6, h * 0.72, 6, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = i < s.dots ? 1 : 0.25;
        g.beginPath();
        g.arc(w / 2 + 50 + i * 13, h * 0.16 - i * 4, 3.5 + i, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      break;
    case 'love':
      g.fillStyle = '#ff5fa2';
      g.shadowColor = '#ff5fa2';
      for (const x of [cx - dx, cx + dx]) heart(x, cy, 40 + s.mouth * 6);
      g.fillStyle = col;
      g.shadowColor = col;
      g.beginPath();
      g.arc(w / 2, h * 0.64, 12, 0, Math.PI);
      g.fill();
      break;
    case 'happy':
      g.lineWidth = 8;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.arc(x, cy + 8, 14, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
      g.beginPath();
      g.arc(w / 2, h * 0.62, 13, 0, Math.PI);
      g.fill();
      break;
    case 'surprise':
      eyes(eh * 1.1);
      sparkle();
      g.beginPath();
      g.ellipse(w / 2, h * 0.73, 6, 8, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'error':
      g.lineWidth = 8;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.moveTo(x - 11, cy - 11);
        g.lineTo(x + 11, cy + 11);
        g.moveTo(x + 11, cy - 11);
        g.lineTo(x - 11, cy + 11);
        g.stroke();
      }
      mouth(() => {
        for (let i = 0; i <= 4; i++) g.lineTo(w / 2 - 16 + i * 8, h * 0.74 + (i % 2 ? -4 : 4));
      });
      break;
    case 'talk':
      eyes(eh);
      sparkle();
      g.beginPath();
      g.ellipse(w / 2, h * 0.7, 9 + s.mouth * 3, 3 + s.mouth * 9, 0, 0, Math.PI * 2);
      g.fill();
      break;
    default:
      eyes(eh);
      sparkle();
      smile();
  }
  g.shadowBlur = 0;
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
    this.faceKey = '';

    this.build();
  }

  build() {
    const S = this.size;
    const c = this.chassis;

    // Halo au sol : le cube flotte au-dessus
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(S * 1.5, S * 1.5),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(this.color).multiplyScalar(0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.015;
    c.add(this.glow);

    // Corps : cube laqué de la couleur du robot, coins très arrondis (pivote comme une tourelle)
    this.body = new THREE.Group();
    this.bodyY = HOVER_H + S / 2;
    this.body.position.y = this.bodyY;
    c.add(this.body);
    const b = this.body;
    const R = S * 0.2;
    const shell = new THREE.MeshPhysicalMaterial({ color: this.color, metalness: 0.2, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    b.add(mesh(roundedBox(S, S, S, R), shell));
    // Écran noir arrondi sur la face avant, qui contient les yeux
    b.add(mesh(screenGeometry(S * 0.8, S * 0.55, S * 0.15), new THREE.MeshPhysicalMaterial({ color: '#05070c', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }), 0, S * 0.04, S / 2 - 0.012));

    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 192;
    this.faceCanvas.height = 120;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true, depthWrite: false });
    faceMat.color.setScalar(1.7);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.76, S * 0.475), faceMat);
    face.position.set(0, S * 0.04, S / 2 + 0.018);
    b.add(face);

    // Petite antenne avec une boule lumineuse qui se balance
    this.antenna = new THREE.Group();
    this.antenna.position.y = S / 2;
    this.antenna.add(mesh(roundedBox(0.022, 0.16, 0.022, 0.01, 2), mat('#2a2f3c', { metalness: 0.5, roughness: 0.3 }), 0, 0.08, 0));
    this.antennaBall = new THREE.Mesh(sphere(0.045, 18, 12), neon(this.color, 2));
    this.antennaBall.position.y = 0.18;
    this.antenna.add(this.antennaBall);
    b.add(this.antenna);
    this.wobble = { x: 0, z: 0, vx: 0, vz: 0 };
    this.signalFlash = 0;

    // Petits bras courts aux mains rondes
    const armMat = mat('#151924', { metalness: 0.4, roughness: 0.35 });
    const handMat = shell;
    const makeArm = (sx) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * (S / 2 + 0.02), -S * 0.08, 0.02);
      shoulder.add(mesh(roundedBox(0.085, 0.17, 0.085, 0.042, 4), armMat, 0, -0.065, 0));
      const elbow = new THREE.Group();
      elbow.position.y = -0.14;
      elbow.add(mesh(roundedBox(0.08, 0.15, 0.08, 0.04, 4), armMat, 0, -0.06, 0));
      elbow.add(mesh(sphere(0.062, 18, 12), handMat, 0, -0.16, 0));
      shoulder.add(elbow);
      b.add(shoulder);
      return { shoulder, elbow };
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);
  }

  /** L'antenne réagit comme un ressort aux mouvements ; sa boule clignote quand le robot réfléchit. */
  updateAntenna(dt, t, moving, action) {
    const w = this.wobble;
    const push = moving ? -0.35 : 0;
    const k = 60, damp = 7;
    w.vx += ((push - w.x) * k - w.vx * damp) * dt;
    w.vz += ((Math.sin(t * 1.7 + this.phase) * 0.06 - w.z) * k - w.vz * damp) * dt;
    w.x += w.vx * dt;
    w.z += w.vz * dt;
    this.antenna.rotation.set(w.x, 0, w.z);
    let blink = 1.8 + Math.sin(t * 3) * 0.4;
    if (action === 'think') blink = Math.sin(t * 9) > 0 ? 2.6 : 0.6;
    else if (action === 'sleep') blink = 0.7 + Math.sin(t * 1.4) * 0.35;
    this.antennaBall.material.color.set(this.color).lerp(WHITE, this.signalFlash).multiplyScalar(blink + this.signalFlash * 2);
    this.antennaBall.scale.setScalar(1 + this.signalFlash * 0.9);
    this.signalFlash = Math.max(0, this.signalFlash - dt * 1.5);
  }

  /** Pointe de l'antenne, en coordonnées monde. */
  antennaTip(out) {
    return this.antennaBall.getWorldPosition(out);
  }

  /** Le robot capte un signal (un prompt) : la boule s'illumine et l'antenne vibre. */
  receiveSignal() {
    this.signalFlash = 1;
    this.wobble.vz += 6;
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
    const hover = Math.sin(t * 2.4 + this.phase) * 0.025;
    this.body.position.y = this.bodyY + p.bob + hover;
    const squash = 1 + Math.cos(t * 2.4 + this.phase) * 0.018;
    this.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    this.updateAntenna(dt, t, moving, action);
    this.chassis.position.y = p.lift;
    this.glow.material.opacity = 0.55 - hover * 4 - p.lift * 1.2;

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
      case 'sleep':
        // Tête qui pique du nez, bras ballants, respiration lente.
        p.sLz = -0.05;
        p.sRz = 0.05;
        p.eL = p.eR = -0.1;
        p.tiltX = 0.24 + Math.sin(t * 1.2 + this.phase) * 0.03;
        p.tiltZ = 0.07;
        p.bob = Math.sin(t * 1.2 + this.phase) * 0.012 - 0.01;
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
    const f = { expr: 'normal', eyeX: 0, eyeY: 0, mouth: 0, dots: 0, color: this.color };
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
      case 'sleep':
        f.expr = 'sleep';
        f.eyeY = 0.5;
        f.mouth = 0.5 + Math.sin(t * 1.2 + this.phase) * 0.5;
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
    } else if (r.type === 'pet') {
      // Caresse : se tortille de plaisir, yeux fermés
      f.expr = 'happy';
      p.tiltZ += Math.sin(t * 9) * 0.14;
      p.tiltX = -0.08;
      p.bob += Math.abs(Math.sin(t * 9)) * 0.03;
      p.sLx = -0.6;
      p.sRx = -0.6;
      p.sLz = -0.55;
      p.sRz = 0.55;
      p.eL = p.eR = -0.6;
    } else if (r.type === 'love') {
      // Cadeau : saut avec pirouette et yeux en cœur
      f.expr = 'love';
      f.mouth = Math.abs(Math.sin(t * 6));
      p.lift = Math.abs(Math.sin(x * Math.PI * 2)) * 0.32 * fade;
      p.yaw += Math.min(1, x * 2) * Math.PI * 2;
      p.sLx = p.sRx = -2.7;
      p.sLz = -0.5 + Math.sin(t * 10) * 0.15;
      p.sRz = 0.5 - Math.sin(t * 10) * 0.15;
    } else if (r.type === 'catch') {
      // Tend les bras pour attraper la puce
      f.expr = 'surprise';
      p.sLx = p.sRx = -1.9;
      p.sLz = 0.2;
      p.sRz = -0.2;
      p.tiltX = -0.15;
    } else if (r.type === 'surprise') {
      f.expr = 'surprise';
      p.lift = Math.sin(x * Math.PI) * 0.12;
      p.sLz -= 0.7 * fade;
      p.sRz += 0.7 * fade;
    }
  }
}
