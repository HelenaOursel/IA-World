// Pandas du thème Japon : Claude en panda roux, ses agents en pandas géants à foulard.
// Ils vont à quatre pattes et se dressent sur leurs pattes arrière pour travailler ;
// les pandas géants se déplacent en faisant des roulades.
import * as THREE from '../../../vendor/three.module.min.js';
import { capsule, easeOutBack, lerpAngle, mat, mesh, sphere } from '../../geometry.js';

const POSE_KEYS = ['sLx', 'sLz', 'eL', 'sRx', 'sRz', 'eR', 'tiltX', 'tiltZ', 'yaw', 'bob', 'lift', 'legL', 'legR', 'quad', 'hYaw', 'hPitch', 'hRoll', 'curl'];

const QUAD_PITCH = 1.2; // bascule du corps vers l'avant quand le panda est à quatre pattes

// Pelages : panda roux unique pour Claude, panda géant pour les agents.
const SPECIES = {
  red: {
    fur: '#c4521f', light: '#f6efe4', limbs: '#2b1610', belly: '#3a1d12', tear: '#7c2a10',
    eye: '#1d100b', line: '#1d100b', mouth: '#2a1a14', tail: ['#c4521f', '#eaa86e'], tailTip: '#3a1d12',
  },
  panda: {
    fur: '#f2eee6', light: '#ffffff', limbs: '#1c1c21', patch: '#1c1c21',
    eye: '#f4efe6', pupil: '#16161a', line: '#f4efe6', mouth: '#2a1a14',
  },
};

const fur = (color) => mat(color, { roughness: 0.9 });
const WAG = new Set(['pet', 'love', 'jump', 'wave']);

let glowTex;
/** Halo circulaire doux projeté au sol sous le panda. */
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

/** Taches du pelage peintes sur le visage (masque, larmes, museau). */
function drawMarkings(g, w, h, sp) {
  const oval = (x, y, rx, ry, rot = 0) => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  };
  if (sp.patch) {
    g.fillStyle = sp.light;
    oval(w / 2, h * 0.74, 46, 32);
    g.fillStyle = sp.patch;
    oval(w / 2 - 50, h * 0.44, 30, 40, 0.45);
    oval(w / 2 + 50, h * 0.44, 30, 40, -0.45);
    return;
  }
  g.fillStyle = sp.light;
  oval(w / 2, h * 0.74, 54, 40);
  for (const s of [-1, 1]) {
    oval(w / 2 + s * 96, h * 0.66, 28, 30);
    oval(w / 2 + s * 48, h * 0.17, 18, 11);
  }
  g.strokeStyle = sp.tear;
  g.lineWidth = 12;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(w / 2 + s * 50, h * 0.5);
    g.quadraticCurveTo(w / 2 + s * 64, h * 0.68, w / 2 + s * 50, h * 0.9);
    g.stroke();
  }
}

function drawFace(g, w, h, s, sp) {
  g.clearRect(0, 0, w, h);
  drawMarkings(g, w, h, sp);
  const cx = w / 2 + s.eyeX * 14, cy = h * 0.42 + s.eyeY * 8, dx = 50;
  const ew = sp.pupil ? 22 : 26, eh = sp.pupil ? 28 : 32;
  const my = h * 0.77;

  // Joues roses
  g.fillStyle = s.expr === 'happy' || s.expr === 'love' ? 'rgba(255,120,150,0.6)' : 'rgba(255,120,150,0.32)';
  for (const x of [w / 2 - 80, w / 2 + 80]) {
    g.beginPath();
    g.ellipse(x, h * 0.7, 15, 9, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Truffe
  g.fillStyle = '#1a1210';
  g.beginPath();
  g.moveTo(w / 2 - 13, h * 0.6);
  g.quadraticCurveTo(w / 2, h * 0.55, w / 2 + 13, h * 0.6);
  g.quadraticCurveTo(w / 2 + 4, h * 0.7, w / 2, h * 0.7);
  g.quadraticCurveTo(w / 2 - 4, h * 0.7, w / 2 - 13, h * 0.6);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(w / 2 - 4, h * 0.6, 4, 2, 0, 0, Math.PI * 2);
  g.fill();

  g.lineCap = 'round';
  g.lineJoin = 'round';
  const eyes = (height, yOff = 0) => {
    for (const x of [cx - dx, cx + dx]) {
      const ry = Math.max(3, height / 2);
      g.fillStyle = sp.eye;
      g.beginPath();
      g.ellipse(x, cy + yOff, ew / 2, ry, 0, 0, Math.PI * 2);
      g.fill();
      if (sp.pupil) {
        g.fillStyle = sp.pupil;
        g.beginPath();
        g.ellipse(x + s.eyeX * 3, cy + yOff + 2, ew * 0.32, Math.max(2, ry * 0.68), 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  // Reflets brillants dans les yeux
  const sparkle = (yOff = 0) => {
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (const x of [cx - dx, cx + dx]) {
      g.beginPath();
      g.arc(x + 5, cy - 7 + yOff, 4.5, 0, Math.PI * 2);
      g.arc(x - 5, cy + 6 + yOff, 2, 0, Math.PI * 2);
      g.fill();
    }
  };
  const lids = (y, r, a0, a1, width) => {
    g.strokeStyle = sp.line;
    g.lineWidth = width;
    for (const x of [cx - dx, cx + dx]) {
      g.beginPath();
      g.arc(x, cy + y, r, Math.PI * a0, Math.PI * a1);
      g.stroke();
    }
  };
  const stroke = (draw, width = 4) => {
    g.strokeStyle = sp.mouth;
    g.lineWidth = width;
    g.beginPath();
    draw();
    g.stroke();
  };
  // Petite bouche en « ω » sous la truffe
  const smile = () =>
    stroke(() => {
      g.moveTo(w / 2, h * 0.69);
      g.lineTo(w / 2, my - 4);
      g.arc(w / 2 - 8, my - 4, 8, 0, Math.PI * 0.9);
      g.moveTo(w / 2 + 16, my - 4);
      g.arc(w / 2 + 8, my - 4, 8, 0, Math.PI * 0.9);
    });
  const openMouth = () => {
    g.fillStyle = sp.mouth;
    g.beginPath();
    g.arc(w / 2, my - 3, 10, 0, Math.PI);
    g.fill();
  };
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
      lids(-5, 11, 0.2, 0.8, 5);
      smile();
      break;
    case 'sleep':
      // Paupières closes tombantes et petite bouche qui respire.
      lids(-3, 13, 0.22, 0.78, 5);
      g.fillStyle = sp.mouth;
      g.beginPath();
      g.ellipse(w / 2, my, 3 + s.mouth * 2, 2 + s.mouth * 3, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'cheeky':
      // Concentré sur sa bêtise : petit sourire en coin et bout de langue.
      eyes(eh * 0.78);
      sparkle();
      stroke(() => g.arc(w / 2 - 2, my - 4, 9, Math.PI * 0.1, Math.PI * 0.75));
      g.fillStyle = '#ff6f9f';
      g.beginPath();
      g.ellipse(w / 2 + 6, my + 6, 5, 6, -0.3, 0, Math.PI * 2);
      g.fill();
      break;
    case 'focus':
      eyes(eh * 0.62, 3);
      sparkle(3);
      stroke(() => {
        g.moveTo(w / 2 - 7, my);
        g.lineTo(w / 2 + 7, my);
      });
      break;
    case 'think':
      eyes(eh * 0.8, -4);
      sparkle(-4);
      stroke(() => g.arc(w / 2 + 5, my, 5, Math.PI * 0.1, Math.PI * 0.9));
      g.fillStyle = sp.mouth;
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = i < s.dots ? 1 : 0.25;
        g.beginPath();
        g.arc(w / 2 + 72 + i * 13, h * 0.12 - i * 3, 3.5 + i, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      break;
    case 'love':
      g.fillStyle = '#ff5fa2';
      for (const x of [cx - dx, cx + dx]) heart(x, cy, 34 + s.mouth * 6);
      openMouth();
      break;
    case 'happy':
      lids(8, 12, 1.15, 1.85, 6);
      openMouth();
      break;
    case 'surprise':
      eyes(eh * 1.15);
      sparkle();
      g.fillStyle = sp.mouth;
      g.beginPath();
      g.ellipse(w / 2, my + 2, 5, 7, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'error':
      g.strokeStyle = '#ff2d55';
      g.lineWidth = 6;
      for (const x of [cx - dx, cx + dx]) {
        g.beginPath();
        g.moveTo(x - 9, cy - 9);
        g.lineTo(x + 9, cy + 9);
        g.moveTo(x + 9, cy - 9);
        g.lineTo(x - 9, cy + 9);
        g.stroke();
      }
      stroke(() => {
        for (let i = 0; i <= 4; i++) g.lineTo(w / 2 - 14 + i * 7, my + (i % 2 ? -3 : 3));
      });
      break;
    case 'talk':
      eyes(eh);
      sparkle();
      g.fillStyle = sp.mouth;
      g.beginPath();
      g.ellipse(w / 2, my + 1, 7 + s.mouth * 3, 2 + s.mouth * 7, 0, 0, Math.PI * 2);
      g.fill();
      break;
    default:
      eyes(eh);
      sparkle();
      smile();
  }
}

export class PandaCharacter {
  constructor({ id, name, agentType = '', color, isMain = false, poses = {} }) {
    this.id = id;
    this.name = name;
    this.agentType = agentType;
    this.color = color;
    this.isMain = isMain;
    this.species = SPECIES[isMain ? 'red' : 'panda'];
    this.rolls = !isMain;
    this.roll = 0;
    this.size = isMain ? 0.7 : 0.6;

    this.root = new THREE.Group();
    this.chassis = new THREE.Group();
    this.root.add(this.chassis);

    this.action = 'idle';
    this.path = [];
    this.face = null;
    this.speed = this.baseSpeed = isMain ? 2.3 : 2.7;
    // Poses propres au thème (themes/<id>/actions.js) et pose pendant les déplacements
    this.poses = poses;
    this.moveAction = null;
    this.phase = Math.random() * 6;
    this.reaction = null;
    this.scaleAnim = null;
    this.blinkAt = 2 + Math.random() * 3;
    this.twitchAt = 2 + Math.random() * 4;
    this.lastEventAt = performance.now();
    this.pose = Object.fromEntries(POSE_KEYS.map((k) => [k, 0]));
    this.faceKey = '';

    this.build();
  }

  build() {
    const S = this.size;
    const sp = this.species;
    const c = this.chassis;

    // Halo doux au sol
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(S * 1.5, S * 1.5),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(this.isMain ? '#ffb070' : this.color).multiplyScalar(0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.015;
    this.root.add(this.glow);

    // Pattes arrière, qui restent au sol et marchent
    this.hips = new THREE.Group();
    c.add(this.hips);
    const makeLeg = (sx) => {
      const hip = new THREE.Group();
      hip.position.set(sx * S * 0.16, S * 0.32, S * 0.03);
      hip.add(mesh(capsule(S * 0.1, S * 0.12), fur(sp.limbs), 0, -S * 0.16, 0));
      this.hips.add(hip);
      return hip;
    };
    this.legL = makeLeg(-1);
    this.legR = makeLeg(1);

    // Corps rond (pivote, se penche et respire)
    this.body = new THREE.Group();
    this.bodyY = S * 0.58;
    this.body.position.y = this.bodyY;
    this.body.rotation.order = 'YXZ';
    c.add(this.body);
    const b = this.body;
    const torso = new THREE.Group();
    torso.scale.set(1, 1.05, 0.9);
    b.add(torso);
    const RT = S * 0.36;
    torso.add(mesh(sphere(RT), fur(sp.fur)));
    if (sp.patch) {
      // Bande noire sur les épaules du panda géant
      torso.add(mesh(new THREE.SphereGeometry(RT * 1.02, 28, 18, 0, Math.PI * 2, 0.35, 0.95), fur(sp.patch)));
    } else {
      // Ventre brun foncé du panda roux
      torso.add(mesh(new THREE.SphereGeometry(RT * 1.015, 28, 18, 0, Math.PI * 2, 1.75, Math.PI - 1.75), fur(sp.belly)));
    }

    // Tête ronde, un peu plus large que haute
    const RH = S * 0.36;
    this.head = new THREE.Group();
    this.head.position.y = S * 0.46;
    this.head.scale.set(1.12, 0.95, 1);
    this.head.rotation.order = 'YXZ';
    b.add(this.head);
    this.head.add(mesh(sphere(RH, 32, 24), fur(sp.fur)));

    // Visage peint sur une calotte posée devant la tête
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 256;
    this.faceCanvas.height = 192;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshStandardMaterial({ map: this.faceTex, transparent: true, depthWrite: false, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });
    const capW = 1.9, capH = 1.5;
    this.head.add(new THREE.Mesh(new THREE.SphereGeometry(RH * 1.006, 32, 24, Math.PI / 2 - capW / 2, capW, 0.95, capH), faceMat));

    // Oreilles, sur ressort : elles frétillent quand un prompt arrive
    this.ears = [-1, 1].map((sx) => {
      const ear = new THREE.Group();
      ear.position.set(sx * RH * 0.64, RH * 0.7, -RH * 0.05);
      if (sp.patch) {
        const m = mesh(sphere(RH * 0.3, 20, 14), fur(sp.patch));
        m.scale.set(1, 0.95, 0.6);
        ear.add(m);
      } else {
        const outer = mesh(new THREE.ConeGeometry(RH * 0.36, RH * 0.6, 18), fur(sp.fur), 0, RH * 0.18, 0);
        outer.scale.z = 0.45;
        ear.add(outer);
        const inner = mesh(new THREE.ConeGeometry(RH * 0.24, RH * 0.42, 18), fur(sp.light), 0, RH * 0.14, RH * 0.06);
        inner.scale.z = 0.4;
        ear.add(inner);
      }
      this.head.add(ear);
      return { ear, sx, base: sp.patch ? 0.15 : 0.32 };
    });
    this.earSpring = { x: 0, v: 0 };
    this.signalPoint = new THREE.Object3D();
    this.signalPoint.position.y = RH * 1.1;
    this.head.add(this.signalPoint);
    this.signalFlash = 0;

    // Foulard coloré des agents
    if (!this.isMain) {
      const scarfMat = mat(this.color, { roughness: 0.7 });
      const ring = mesh(new THREE.TorusGeometry(S * 0.3, S * 0.065, 12, 32), scarfMat, 0, S * 0.2, 0);
      ring.rotation.x = Math.PI / 2;
      ring.scale.y = 0.92;
      b.add(ring);
      const knot = mesh(capsule(S * 0.05, S * 0.14), scarfMat, S * 0.12, S * 0.06, S * 0.3);
      knot.rotation.set(-0.3, 0, 0.35);
      b.add(knot);
    }

    // Queue : grosse et annelée chez le panda roux, petit pompon chez le panda géant
    this.tail = [];
    let joint = new THREE.Group();
    joint.position.set(0, -S * 0.22, -S * 0.28);
    // Attache de la queue au repos, et au ras du sol quand le panda dort couché
    this.tailRest = joint.position.clone();
    this.tailCurl = new THREE.Vector3(0, -S * 0.34, S * 0.11);
    b.add(joint);
    if (sp.patch) {
      joint.add(mesh(sphere(S * 0.08, 16, 12), fur(sp.fur), 0, 0, -S * 0.04));
      this.tail.push({ joint, base: 0 });
    } else {
      // Assez longue pour s'enrouler autour du panda quand il dort
      const N = 8, L = S * 0.12;
      for (let i = 0; i < N; i++) {
        const color = i === N - 1 ? sp.tailTip : sp.tail[i % 2];
        joint.add(mesh(capsule(S * (0.11 - i * 0.003), L * 0.6), fur(color), 0, L / 2, 0));
        this.tail.push({ joint, base: i === 0 ? -1.9 : 0.18 });
        if (i < N - 1) {
          const next = new THREE.Group();
          next.position.y = L;
          joint.add(next);
          joint = next;
        }
      }
    }
    this.wobble = { x: 0, z: 0, vx: 0, vz: 0 };
    this.rollRadius = S * 0.6;

    // Bras potelés aux pattes rondes, assez longs pour servir de pattes avant
    const armMat = fur(sp.limbs);
    const makeArm = (sx) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * S * 0.33, S * 0.12, S * 0.04);
      shoulder.scale.setScalar(S / 0.65);
      shoulder.add(mesh(capsule(0.05, 0.08), armMat, 0, -0.065, 0));
      const elbow = new THREE.Group();
      elbow.position.y = -0.13;
      elbow.add(mesh(capsule(0.048, 0.07), armMat, 0, -0.06, 0));
      elbow.add(mesh(sphere(0.058, 18, 12), armMat, 0, -0.14, 0));
      shoulder.add(elbow);
      b.add(shoulder);
      return { shoulder, elbow };
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);
  }

  /** Queue et oreilles réagissent comme des ressorts ; la queue frétille quand le panda est content. */
  updateSprings(dt, t, moving) {
    const w = this.wobble;
    const wag = this.reaction && WAG.has(this.reaction.type);
    const push = moving ? 0.25 : 0;
    const sway = wag ? Math.sin(t * 16) * 0.45 : Math.sin(t * 1.7 + this.phase) * 0.1;
    const k = 60, damp = 7;
    w.vx += ((push - w.x) * k - w.vx * damp) * dt;
    w.vz += ((sway - w.z) * k - w.vz * damp) * dt;
    w.x += w.vx * dt;
    w.z += w.vz * dt;
    const { quad, curl, tiltX } = this.pose;
    const flat = this.rolls ? 0 : -0.57 * quad;
    // Endormi, la queue repose à plat au sol et fait le tour du panda jusqu'à son museau.
    const wrapBase = -Math.PI / 2 - QUAD_PITCH - tiltX;
    if (!this.rolls) this.tail[0].joint.position.lerpVectors(this.tailRest, this.tailCurl, curl);
    this.tail.forEach(({ joint, base }, i) => {
      const x = base + (i ? 0 : flat) + w.x * (i ? 0.2 : 1);
      const z = w.z * (0.5 + i * 0.15);
      joint.rotation.set(
        THREE.MathUtils.lerp(x, i ? -0.04 : wrapBase, curl),
        0,
        THREE.MathUtils.lerp(z, i ? 0.27 : 1.5, curl),
      );
    });

    this.twitchAt -= dt;
    if (this.twitchAt < 0) {
      this.earSpring.v += (Math.random() < 0.5 ? -1 : 1) * 7;
      this.twitchAt = 3 + Math.random() * 5;
    }
    const e = this.earSpring;
    e.v += (-e.x * 140 - e.v * 9) * dt;
    e.x += e.v * dt;
    const pop = 1 + this.signalFlash * 0.3;
    for (const { ear, sx, base } of this.ears) {
      ear.rotation.z = -sx * (base + e.x * (sx < 0 ? 1 : 0.7));
      ear.scale.setScalar(pop);
    }
    this.signalFlash = Math.max(0, this.signalFlash - dt * 1.5);
  }

  /** Libère géométries, matériaux et textures propres à ce panda (pas ceux partagés via un cache). */
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

  /** Patte droite, en coordonnées monde (d'où partent les objets lancés). */
  handPosition(out) {
    return this.armR.elbow.localToWorld(out.set(0, -0.14, 0));
  }

  /** Point entre les oreilles, en coordonnées monde (où arrive le signal du prompt). */
  antennaTip(out) {
    return this.signalPoint.getWorldPosition(out);
  }

  /** Le panda capte un signal (un prompt) : ses oreilles se dressent et frétillent. */
  receiveSignal() {
    this.signalFlash = 1;
    this.earSpring.v += 14;
    this.wobble.vz += 6;
  }

  /** Point au-dessus du panda, en coordonnées monde (pour les bulles). */
  topPosition(out) {
    return this.root.localToWorld(out.set(0, this.bodyY + this.size * 0.82 + 0.4, 0));
  }

  setPosition(v) {
    this.root.position.copy(v);
  }

  get moving() {
    return this.path.length > 0;
  }

  /** Marche vers `spot` en contournant la borne centrale, puis prend l'action donnée. */
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
      if (this.rolls) this.roll = (this.roll + step / this.rollRadius) % (Math.PI * 2);
      moving = true;
      break;
    }
    // À l'arrêt, la roulade en cours va jusqu'au bout avant que le panda se relève.
    if (!moving && this.roll > 0) {
      this.roll += (this.speed * dt) / this.rollRadius;
      if (this.roll >= Math.PI * 2) this.roll = 0;
    }
    const rolling = this.rolls && (moving || this.roll > 0);
    if (!moving && this.face !== null) {
      this.root.rotation.y = lerpAngle(this.root.rotation.y, this.face, 1 - Math.exp(-dt * 6));
    }

    const action = rolling ? 'roll' : moving ? this.moveAction ?? 'drive' : this.action;
    const target = this.computePose(action, t);
    const face = this.computeFace(action, t, dt);
    this.applyReaction(target, face, dt, t);

    const k = 1 - Math.exp(-dt * 12);
    for (const key of POSE_KEYS) this.pose[key] += (target[key] - this.pose[key]) * k;
    const p = this.pose;
    // À quatre pattes, le corps bascule vers l'avant : bras et tête compensent pour viser le sol et regarder devant.
    const pitch = p.quad * QUAD_PITCH;
    this.armL.shoulder.rotation.set(p.sLx - pitch, 0, p.sLz);
    this.armL.elbow.rotation.x = p.eL;
    this.armR.shoulder.rotation.set(p.sRx - pitch, 0, p.sRz);
    this.armR.elbow.rotation.x = p.eR;
    this.legL.rotation.x = p.legL;
    this.legR.rotation.x = p.legR;
    this.hips.position.set(0, p.bob, -p.quad * this.size * 0.18);
    this.body.rotation.set(p.tiltX + pitch, p.yaw, p.tiltZ);
    this.body.position.y = this.bodyY + p.bob - p.quad * this.size * 0.075;
    this.head.rotation.set(-pitch * 0.85 + p.hPitch, p.hYaw, p.hRoll);
    const breath = 1 + Math.sin(t * 2.4 + this.phase) * 0.014;
    this.body.scale.set(1 / Math.sqrt(breath), breath, 1 / Math.sqrt(breath));
    this.updateSprings(dt, t, moving);
    // Roulade : tout le panda tourne autour du centre de sa boule.
    const R = this.rollRadius;
    this.chassis.rotation.x = this.roll;
    this.chassis.position.set(0, p.lift + R - R * Math.cos(this.roll), -R * Math.sin(this.roll));
    this.glow.material.opacity = 0.35 - p.lift * 0.8;

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
    const custom = this.poses[action];
    if (custom?.pose) {
      custom.pose(p, t, this);
      return p;
    }

    switch (action) {
      case 'drive': {
        // Trottine à quatre pattes, en diagonale (patte avant droite avec patte arrière gauche).
        const step = Math.sin(t * 13);
        p.quad = 1;
        p.legL = step * 0.6;
        p.legR = -step * 0.6;
        p.sLx = -step * 0.5;
        p.sRx = step * 0.5;
        p.sLz = p.sRz = 0;
        p.eL = p.eR = 0;
        p.tiltZ = step * 0.04;
        p.hYaw = step * 0.06;
        p.bob = Math.abs(Math.cos(t * 13)) * 0.02;
        break;
      }
      case 'roll':
        // Roulé en boule : pattes repliées, bras qui serrent les genoux, tête rentrée.
        p.legL = p.legR = -1.5;
        p.sLx = p.sRx = -1.3;
        p.eL = p.eR = -1.2;
        p.sLz = 0.35;
        p.sRz = -0.35;
        p.tiltX = 0.5;
        p.bob = -0.05;
        break;
      case 'idle':
        // Au repos à quatre pattes, la tête regarde autour.
        p.quad = 1;
        p.sLz = p.sRz = 0;
        p.eL = p.eR = 0;
        p.hYaw = Math.sin(t * 0.4 + this.phase) * 0.5;
        p.tiltX = Math.sin(t * 0.3) * 0.03;
        break;
      case 'sleep':
        // Couché en boule : pattes repliées, menton sur les pattes avant,
        // tête tournée vers la queue enroulée autour de lui, respiration lente.
        p.quad = 1;
        p.curl = 1;
        p.legL = p.legR = -1.4;
        p.tiltX = 0.1;
        p.tiltZ = -0.12;
        p.sLx = p.sRx = -1.6;
        p.sLz = 0.2;
        p.sRz = -0.2;
        p.eL = p.eR = -0.3;
        p.hPitch = 0.4 + Math.sin(t * 1.2 + this.phase) * 0.03;
        p.hYaw = -0.7;
        p.hRoll = -0.3;
        p.bob = Math.sin(t * 1.2 + this.phase) * 0.006 - this.size * 0.18;
        break;
      case 'doodle': {
        // Sautille pour atteindre le tableau et gribouille à chaque bond.
        const hop = Math.abs(Math.sin(t * 3.2 + this.phase));
        p.sRx = -2.5 + Math.sin(t * 9) * 0.18;
        p.sRz = 0.15 + Math.cos(t * 11) * 0.2;
        p.eR = -0.3;
        p.sLx = -0.3;
        p.sLz = -0.3;
        p.tiltX = -0.2;
        p.yaw = this.glance(t) * 0.35;
        p.lift = 0.1 + hop * 0.42;
        p.legL = p.legR = 0.35 * hop;
        break;
      }
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
      case 'roast':
        // Debout au bord du feu, la patte tendue : il fait tourner la banane au-dessus des flammes.
        p.sRx = -1.25 + Math.sin(t * 1.3 + this.phase) * 0.05;
        p.sRz = 0.05;
        p.eR = -0.05;
        p.sLx = -0.35;
        p.sLz = -0.15;
        p.tiltX = 0.08;
        p.hPitch = 0.25;
        p.bob = Math.sin(t * 1.6 + this.phase) * 0.006;
        break;
      case 'eat':
        // La banane contre la bouche, il croque en hochant la tête.
        p.sRx = -1.85;
        p.eR = -1.25;
        p.sRz = -0.25;
        p.sLx = -1.5;
        p.eL = -1.2;
        p.sLz = 0.3;
        p.hPitch = 0.12 + Math.abs(Math.sin(t * 7)) * 0.08;
        p.bob = Math.abs(Math.sin(t * 7)) * 0.012;
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
    const f = { expr: 'normal', eyeX: 0, eyeY: 0, mouth: 0, dots: 0 };
    if (this.poses[action]?.face) this.poses[action].face(f, t, this);
    else switch (action) {
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
      case 'roll':
        f.expr = 'happy';
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
      case 'roast':
        // Les yeux sur la banane qui grille
        f.eyeY = -0.6;
        f.eyeX = Math.sin(t * 0.6) * 0.2;
        break;
      case 'eat':
        f.expr = 'happy';
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
    drawFace(this.faceCanvas.getContext('2d'), this.faceCanvas.width, this.faceCanvas.height, f, this.species);
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
    // Pour sauter, attraper, lancer ou faire coucou, le panda se dresse sur ses pattes arrière.
    if (r.type !== 'pet' && r.type !== 'error') {
      p.quad = 0;
      p.hYaw = 0;
    }
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
      p.legL = p.legR = 0.4 * fade;
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
      p.legL = p.legR = 0.4 * fade;
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
      // Tend les bras pour attraper le bambou
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
