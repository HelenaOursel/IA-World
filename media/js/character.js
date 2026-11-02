// Personnages animés (Claude et ses agents) ; leur apparence dépend du thème (themes/<id>/).
import * as THREE from '../vendor/three.module.min.js';
import { easeOutBack, lerpAngle } from './geometry.js';

const POSE_KEYS = ['sLx', 'sLz', 'eL', 'sRx', 'sRz', 'eR', 'tiltX', 'tiltZ', 'yaw', 'bob', 'lift'];

const WHITE = new THREE.Color('#ffffff');

/** Dessine le visage. `s.glow` : yeux lumineux ; `s.mouthless` : pas de bouche (le pingouin a un bec). */
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
  const blur = s.glow ? 16 : 0;
  g.shadowBlur = blur;
  const M = !s.mouthless;
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
    g.shadowBlur = blur;
  };
  const mouth = (draw) => {
    if (!M) return;
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
      if (M) {
        g.beginPath();
        g.ellipse(w / 2, h * 0.7, 4 + s.mouth * 2, 3 + s.mouth * 4, 0, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'cheeky':
      // Concentré sur sa bêtise : petit sourire en coin et bout de langue.
      eyes(eh * 0.78);
      sparkle();
      mouth(() => g.arc(w / 2 - 2, h * 0.66, 10, Math.PI * 0.1, Math.PI * 0.75));
      if (M) {
        g.fillStyle = g.shadowColor = '#ff6f9f';
        g.beginPath();
        g.ellipse(w / 2 + 7, h * 0.76, 5.5, 7, -0.3, 0, Math.PI * 2);
        g.fill();
      }
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
      if (M) {
        g.beginPath();
        g.arc(w / 2 + 6, h * 0.72, 6, Math.PI * 0.1, Math.PI * 0.9);
        g.stroke();
      }
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
      if (M) {
        g.beginPath();
        g.arc(w / 2, h * 0.64, 12, 0, Math.PI);
        g.fill();
      }
      break;
    case 'happy':
      g.lineWidth = 8;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.arc(x, cy + 8, 14, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
      if (M) {
        g.beginPath();
        g.arc(w / 2, h * 0.62, 13, 0, Math.PI);
        g.fill();
      }
      break;
    case 'surprise':
      eyes(eh * 1.1);
      sparkle();
      if (M) {
        g.beginPath();
        g.ellipse(w / 2, h * 0.73, 6, 8, 0, 0, Math.PI * 2);
        g.fill();
      }
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
      if (M) {
        g.beginPath();
        g.ellipse(w / 2, h * 0.7, 9 + s.mouth * 3, 3 + s.mouth * 9, 0, 0, Math.PI * 2);
        g.fill();
      }
      break;
    default:
      eyes(eh);
      sparkle();
      smile();
  }
  g.shadowBlur = 0;
}

export class Character {
  constructor({ id, name, agentType = '', color, isMain = false, skin }) {
    this.id = id;
    this.name = name;
    this.agentType = agentType;
    this.color = color;
    this.isMain = isMain;
    this.skin = skin;
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

  /** Construit l'apparence du thème ; `look` décrit ses particularités (main, sommet, lévitation, yeux…). */
  build() {
    this.look = this.skin(this);
    this.wobble = { x: 0, z: 0, vx: 0, vz: 0 };
    this.signalFlash = 0;
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

  /** Main droite, en coordonnées monde (d'où partent les objets lancés). */
  handPosition(out) {
    return this.armR.elbow.localToWorld(out.set(0, this.look.hand ?? -0.16, 0));
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

  /** Libère géométries, matériaux et textures propres à ce personnage (pas ceux partagés via un cache). */
  dispose() {
    const free = (o) => o && !o.userData.shared && o.dispose();
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      free(o.geometry);
      for (const m of [].concat(o.material)) {
        free(m.map);
        free(m);
      }
    });
    free(this.faceTex);
  }

  /** Point au-dessus du robot, en coordonnées monde (pour les bulles). */
  topPosition(out) {
    return this.root.localToWorld(out.set(0, this.bodyY + (this.look.top ?? this.size / 2 + 0.5), 0));
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
    const hover = Math.sin(t * 2.4 + this.phase) * (this.look.hover ?? 0.025);
    this.body.position.y = this.bodyY + p.bob + hover;
    const squash = 1 + Math.cos(t * 2.4 + this.phase) * (this.look.squash ?? 0.018);
    this.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    this.look.animate?.(this, dt, t, moving);
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
      case 'doodle':
        // Bras levé qui gribouille, propulseurs allumés pour atteindre le tableau.
        p.sRx = -2.5 + Math.sin(t * 9) * 0.18;
        p.sRz = 0.15 + Math.cos(t * 11) * 0.2;
        p.eR = -0.3;
        p.sLx = -0.3;
        p.sLz = -0.3;
        p.tiltX = -0.2;
        p.yaw = this.glance(t) * 0.35;
        p.lift = 0.5 + Math.sin(t * 2.2 + this.phase) * 0.03;
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
      case 'aim':
        // Tient l'objet au-dessus de l'épaule et vise la corbeille
        p.sRx = -2.5 + Math.sin(t * 3) * 0.06;
        p.eR = -0.9;
        p.sRz = 0.15;
        p.sLx = -0.9;
        p.sLz = -0.2;
        p.tiltX = -0.05;
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

  /** En train de faire une bêtise : de temps en temps, un coup d'œil à gauche puis à droite (-1, 0 ou 1). */
  glance(t) {
    const c = (t * 0.35 + this.phase) % 1;
    return c < 0.82 ? 0 : c < 0.91 ? -1 : 1;
  }

  computeFace(action, t, dt) {
    const f = { expr: 'normal', eyeX: 0, eyeY: 0, mouth: 0, dots: 0, color: this.look.eye ?? this.color, glow: this.look.glow !== false, mouthless: !!this.look.mouthless };
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
      case 'doodle':
        f.expr = 'cheeky';
        f.eyeX = this.glance(t) * 0.9;
        f.eyeY = f.eyeX ? 0.1 : -0.6;
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
    } else if (r.type === 'throw') {
      // Armé vers l'arrière puis détente vers l'avant
      const k = x < 0.35 ? x / 0.35 : 1;
      const release = x < 0.35 ? 0 : Math.min(1, (x - 0.35) / 0.2);
      p.sRx = -2.9 + release * 1.9 - k * 0.2;
      p.eR = -1.2 + release * 1.1;
      p.sRz = 0.15;
      p.tiltX = -0.1 + release * 0.25;
      p.lift = release * Math.sin(release * Math.PI) * 0.06;
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
