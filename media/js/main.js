// Point d'entrée de la webview : scène, caméra, et traduction des événements en animations.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from '../vendor/addons/environments/RoomEnvironment.js';
import { Character } from './character.js';
import { Demo } from './demo.js';
import { Effects } from './effects.js';
import { Hud, KIND_ICONS } from './hud.js';
import { buildWorld, docRows, randomCodeRow } from './world.js';

const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
const post = (m) => vscode?.postMessage(m);

// type d'activité -> [poste, animation]
const KIND_STATION = {
  read: ['read', 'read'],
  search: ['search', 'search'],
  write: ['write', 'type'],
  bash: ['bash', 'type'],
  web: ['web', 'type'],
  plan: ['plan', 'plan'],
  agent: ['agent', 'summon'],
  other: ['bash', 'type'],
};

const MAIN_COLOR = '#ff7a1a';
const TYPE_COLORS = { Explore: '#2ec4b6', Plan: '#4361ee', 'general-purpose': '#9b5de5', 'claude-code-guide': '#ffc914' };
const EXTRA_COLORS = ['#06d6a0', '#ef476f', '#f78c6b', '#118ab2', '#8ac926', '#e0aaff'];
const IDLE_AFTER_MS = 35_000;

// ------------------------------------------------------------------ scène

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 220);
const world = buildWorld(scene);
const st = world.stations;
const effects = new Effects(scene);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const chars = new Map();
const queues = new Map();
const floatTags = [];
const stationTimers = { write: 0, bash: 0, web: 0, search: 0, read: 0 };
let colorIndex = 0;
let followId = null;

const demo = new Demo((msg) => handleMessage(msg, true));
let hasSession = false;

const hud = new Hud(app, {
  toggleDemo: () => (demo.running ? stopDemo() : startDemo()),
  toggleRotate: () => {
    cam.autoRotate = !cam.autoRotate;
    hud.setRotate(cam.autoRotate);
  },
  resetCamera: () => resetCamera(),
  follow: (id) => setFollow(followId === id ? null : id),
  pickSession: () => post({ type: 'pickSession' }),
});

// ----------------------------------------------------------------- caméra

const CAM_HOME = { theta: 0.42, phi: 0.98, radius: 22 };
const cam = { ...CAM_HOME, target: new THREE.Vector3(0, 0.6, 0), autoRotate: false };
const camGoal = { ...CAM_HOME };

function resetCamera() {
  Object.assign(camGoal, CAM_HOME);
  setFollow(null);
}

function setFollow(id) {
  followId = id;
  hud.setFollowed(id);
  if (id) camGoal.radius = Math.min(camGoal.radius, 11);
}

let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  drag.x = e.clientX;
  drag.y = e.clientY;
  camGoal.theta -= dx * 0.006;
  camGoal.phi = THREE.MathUtils.clamp(camGoal.phi - dy * 0.005, 0.35, 1.38);
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (drag && drag.moved < 5) pick(e);
  drag = null;
});
renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camGoal.radius = THREE.MathUtils.clamp(camGoal.radius * Math.exp(e.deltaY * 0.001), 5, 45);
  },
  { passive: false },
);

const raycaster = new THREE.Raycaster();
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([...chars.values()].map((c) => c.root), true);
  for (const h of hits) {
    for (let o = h.object; o; o = o.parent) {
      if (o.userData.charId) return setFollow(o.userData.charId);
    }
  }
  setFollow(null);
}

function resize() {
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(app);
resize();

// --------------------------------------------------------------- robots

function colorFor(agentType) {
  return TYPE_COLORS[agentType] || EXTRA_COLORS[colorIndex++ % EXTRA_COLORS.length];
}

function ensureMain() {
  if (chars.has('main')) return chars.get('main');
  const ch = new Character({ id: 'main', name: 'Claude', color: MAIN_COLOR, isMain: true });
  addCharacter(ch);
  const spot = st.dock.claim('main');
  ch.stationKey = 'dock';
  ch.setPosition(spot.pos);
  ch.root.rotation.y = spot.face;
  ch.face = spot.face;
  ch.idle = true;
  return ch;
}

function addCharacter(ch) {
  ch.root.userData.charId = ch.id;
  scene.add(ch.root);
  chars.set(ch.id, ch);
  queues.set(ch.id, { items: [], nextAt: 0 });
  hud.addCharacter(ch);
}

function bayCenter() {
  return st.agent.group.localToWorld(st.agent.centerLocal.clone());
}

function spawnAgent(info, animated = true) {
  if (chars.has(info.id)) return chars.get(info.id);
  const ch = new Character({ id: info.id, name: shorten(info.name, 28), agentType: info.agentType, color: colorFor(info.agentType) });
  addCharacter(ch);
  if (animated) {
    const p = bayCenter();
    ch.setPosition(new THREE.Vector3(p.x, 0, p.z));
    ch.root.rotation.y = st.agent.group.rotation.y;
    ch.appear();
    st.agent.power = 1;
    effects.burst(p.clone().setY(0.8), { count: 30, colors: ['#b388ff', '#ffffff', '#e0aaff', ch.color], speed: 1.6, up: 2, life: 1.1, gravity: -2 });
    effects.ring(p.clone().setY(0.12), { color: '#b388ff', from: 0.4, to: 1.8, life: 0.9 });
    hud.say(ch.id, 'Unité en ligne !', 'speech', KIND_ICONS.spawn, 3);
    hud.addLog(KIND_ICONS.spawn, ch.name, ch.color, `assemblé (${info.agentType})`);
    moveTo(ch, 'dock', 'idle');
  } else {
    const spot = st.dock.claim(ch.id);
    ch.stationKey = 'dock';
    ch.setPosition(spot.pos);
    ch.face = spot.face;
  }
  ch.idle = false;
  ch.lastEventAt = performance.now();
  return ch;
}

function despawnAgent(id, animated = true) {
  const ch = chars.get(id);
  if (!ch || ch.isMain || ch.leaving) return;
  ch.leaving = true;
  if (!animated) return removeCharacter(ch);
  hud.say(id, 'Mission terminée !', 'speech', KIND_ICONS.despawn, 3);
  hud.addLog(KIND_ICONS.despawn, ch.name, ch.color, 'retourne à la baie');
  moveTo(ch, 'agent', 'idle');
}

function removeCharacter(ch) {
  for (const s of Object.values(st)) s.release(ch.id);
  scene.remove(ch.root);
  chars.delete(ch.id);
  queues.delete(ch.id);
  hud.removeCharacter(ch.id);
  if (followId === ch.id) setFollow(null);
}

function moveTo(ch, key, action) {
  if (ch.stationKey !== key) {
    if (ch.stationKey) st[ch.stationKey].release(ch.id);
    ch.stationKey = key;
  }
  ch.wandering = false;
  ch.goTo(st[key].claim(ch.id), action);
}

function goIdle(ch) {
  ch.idle = true;
  moveTo(ch, 'dock', 'idle');
  hud.setActivityText(ch.id, '⚡ En recharge');
}

function shorten(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --------------------------------------------------------------- activités

function afterVerb(label, re) {
  const m = re.exec(label);
  return m ? m[1] : '';
}

function applyActivity(ch, ev, instant = false) {
  ch.lastEventAt = performance.now();
  ch.idle = false;
  const icon = KIND_ICONS[ev.kind] || KIND_ICONS.other;
  const map = KIND_STATION[ev.kind];

  if (map) {
    const [key, action] = map;
    moveTo(ch, key, action);
    if (instant) {
      ch.setPosition(ch.path[ch.path.length - 1]);
      ch.path = [];
    }
    stationEffect(key, ev);
    hud.say(ch.id, ev.label, 'action', icon, 7);
  } else if (ev.kind === 'think') {
    if (!ch.moving) ch.setAction('think');
    hud.say(ch.id, ev.label, 'thought', icon, 4);
  } else if (ev.kind === 'talk') {
    if (!ch.moving) ch.setAction('talk');
    hud.say(ch.id, ev.label, 'speech', '', THREE.MathUtils.clamp(3 + ev.label.length / 16, 4, 12));
  } else if (ev.kind === 'ask') {
    if (!ch.moving) ch.setAction('ask');
    ch.react('wave', 1.5);
    hud.say(ch.id, ev.label, 'speech ask', icon, 15);
  }
  if (!instant) logEvent(ch, icon, ev.label, ev.kind);
}

let lastLog = '';
function logEvent(ch, icon, text, kind) {
  const key = ch.id + kind + text;
  if (key === lastLog) return;
  lastLog = key;
  hud.addLog(icon, ch.isMain ? 'Claude' : ch.name, ch.color, text);
}

function stationEffect(key, ev) {
  if (key === 'write') {
    st.write.code.file = afterVerb(ev.label, /(?:J['’]écris|Je modifie)\s+(.+)$/) || ev.label;
    st.write.code.rows = st.write.code.rows.slice(-3);
    st.write.screen.redraw();
    stationTimers.write = 4;
  } else if (key === 'read') {
    st.read.doc = { file: afterVerb(ev.label, /Je lis\s+(.+)$/) || ev.label, rows: docRows(), cursor: 0 };
    st.read.screen.redraw();
    stationTimers.read = 4;
  } else if (key === 'bash') {
    const lines = st.bash.lines;
    if (ev.detail) lines.push({ t: '# ' + ev.detail, c: '#5f7a72' });
    lines.push({ t: ev.label, c: '#39ff9f' });
    st.bash.pendingOk = 1.6;
    stationTimers.bash = 3;
    st.bash.screen.redraw();
  } else if (key === 'web') {
    st.web.net.host = afterVerb(ev.label, /(?:Je consulte|web :)\s+(.+)$/) || ev.label;
    stationTimers.web = 4;
  } else if (key === 'search') {
    st.search.query = ev.label.replace(/^Je (?:cherche|fouille)\s*/, '');
    st.search.blips = [];
    stationTimers.search = 4;
  } else if (key === 'agent') {
    st.agent.power = Math.max(st.agent.power, 0.7);
  }
}

function setTodos(todos) {
  st.plan.todos = todos || [];
  st.plan.screen.redraw();
}

function onError(ch, text) {
  ch.lastEventAt = performance.now();
  ch.react('error', 1.3);
  hud.say(ch.id, text, 'error', KIND_ICONS.error, 6);
  const p = ch.topPosition(new THREE.Vector3());
  effects.burst(p, { count: 14, colors: ['#ff4d6d', '#ff8fa3'], speed: 1.3, up: 1.2, life: 0.8, gravity: -2, size: 0.04 });
  effects.smoke(p.clone().setY(p.y - 0.4));
  if (ch.stationKey === 'bash') {
    st.bash.pendingOk = 0;
    st.bash.lines.push({ t: '✗ ' + text, c: '#ff4d6d' });
    st.bash.screen.redraw();
  }
  logEvent(ch, KIND_ICONS.error, text, 'error');
}

function onTurnEnd(ch) {
  ch.react('jump', 1.4);
  const p = ch.topPosition(new THREE.Vector3());
  effects.burst(p, { count: 34, colors: ['#ff7a1a', '#ffc53d', '#3ddc97', '#4cc9f0', '#b388ff'], speed: 2.2, up: 3, life: 1.4, gravity: -5, size: 0.06 });
  logEvent(ch, KIND_ICONS.done, 'a terminé son tour', 'done');
  if (ch.isMain) ch.idleAt = performance.now() + 2600;
}

function onPrompt(text) {
  const main = ensureMain();
  const tag = hud.floating('', 'user');
  tag.append(
    Object.assign(document.createElement('span'), { className: 'icon', textContent: KIND_ICONS.prompt }),
    Object.assign(document.createElement('span'), { textContent: text }),
  );
  const packet = effects.packet(main.root.position, () => {
    tag.remove();
    floatTags.splice(floatTags.findIndex((f) => f.node === tag), 1);
    main.react('surprise', 0.8);
  });
  floatTags.push({ node: tag, pos: packet.position, offset: new THREE.Vector3(0, 0.35, 0) });
  main.idle = false;
  main.lastEventAt = performance.now();
  main.react('wave', 1.6);
  hud.addLog(KIND_ICONS.prompt, 'Toi', '#7df9ff', text);
}

// ------------------------------------------------------- file d'attente

// Les événements arrivent souvent par paquets : on les étale un peu pour que l'animation reste lisible.
function enqueue(agentId, ev) {
  queues.get(agentId)?.items.push(ev);
}

function minDuration(ev, backlog) {
  if (backlog > 6) return 0.25;
  if (backlog > 3) return 0.6;
  if (ev.type === 'prompt') return 2.2;
  if (ev.type === 'activity') return ev.kind === 'think' ? 0.8 : ev.kind === 'talk' ? 2 : 1.3;
  return 0.8;
}

function processQueues(now) {
  for (const [id, q] of queues) {
    if (!q.items.length || now < q.nextAt) continue;
    const ch = chars.get(id);
    if (!ch || ch.leaving) {
      q.items.length = 0;
      continue;
    }
    const ev = q.items.shift();
    q.nextAt = now + minDuration(ev, q.items.length) * 1000;
    if (ev.type === 'activity') applyActivity(ch, ev);
    else if (ev.type === 'error') onError(ch, ev.text);
    else if (ev.type === 'turnEnd') onTurnEnd(ch);
    else if (ev.type === 'prompt') onPrompt(ev.text);
    else if (ev.type === 'despawn') despawnAgent(id);
  }
}

// --------------------------------------------------------------- messages

function handleMessage(msg, fromDemo = false) {
  if (!msg) return;
  if (demo.running && !fromDemo && msg.type === 'event' && msg.event.type !== 'status') stopDemo();

  switch (msg.type) {
    case 'snapshot':
    case 'session':
      applySnapshot(msg.snapshot, msg.type === 'session');
      break;
    case 'title':
      hud.setSession(msg.title, true);
      break;
    case 'demo':
      startDemo();
      break;
    case 'event':
      handleEvent(msg.event);
      break;
  }
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'activity':
    case 'error':
    case 'turnEnd':
      if (ev.agentId === 'main') ensureMain();
      else if (!chars.has(ev.agentId)) spawnAgent({ id: ev.agentId, name: 'Agent', agentType: 'agent' });
      enqueue(ev.agentId, ev);
      break;
    case 'prompt':
      ensureMain();
      enqueue('main', ev);
      break;
    case 'todos':
      setTodos(ev.todos);
      break;
    case 'spawn':
      spawnAgent(ev.agent);
      break;
    case 'despawn':
      // On attend que l'agent ait fini de jouer ses derniers événements.
      if (chars.has(ev.id)) enqueue(ev.id, ev);
      break;
    case 'status':
      hud.setLive(ev.live);
      break;
  }
}

function applySnapshot(s, reset) {
  for (const ch of [...chars.values()]) if (!ch.isMain) removeCharacter(ch);
  for (const q of queues.values()) q.items.length = 0;
  const main = ensureMain();
  hasSession = !!s?.session;
  hud.setSession(s?.session ? s.session.title || s.session.project : 'En attente de Claude…', !!s?.live);
  hud.showEmpty(!hasSession && !demo.running);
  if (reset) hud.clearLog();
  setTodos(s?.todos);
  for (const a of s?.agents ?? []) spawnAgent(a, false);
  if (s?.live) {
    for (const ev of s.lastActivities ?? []) {
      const ch = ev.agentId === 'main' ? main : chars.get(ev.agentId);
      if (ch && ev.type === 'activity') applyActivity(ch, ev, true);
    }
  } else {
    goIdle(main);
  }
}

function startDemo() {
  hud.setDemo(true);
  hud.showEmpty(false);
  hud.clearLog();
  for (const ch of [...chars.values()]) if (!ch.isMain) removeCharacter(ch);
  setTodos([]);
  demo.start();
}

function stopDemo() {
  demo.stop();
  hud.setDemo(false);
  for (const ch of [...chars.values()]) if (ch.id.startsWith('demo-')) removeCharacter(ch);
  for (const q of queues.values()) q.items.length = 0;
  setTodos([]);
  hud.setLive(false);
  hud.showEmpty(!hasSession);
  goIdle(ensureMain());
  post({ type: 'ready' });
}

window.addEventListener('message', (e) => handleMessage(e.data));

// ------------------------------------------------------------------ boucle

let last = performance.now();
let codeTimer = 0;
let docTimer = 0;
let ringTimer = 0;
const tmp = new THREE.Vector3();

function updateStations(dt) {
  for (const k of Object.keys(stationTimers)) stationTimers[k] = Math.max(0, stationTimers[k] - dt);
  for (const [key, s] of Object.entries(st)) {
    if (key === 'dock') continue;
    s.busy = [...chars.values()].some((c) => c.stationKey === key && !c.moving && !c.leaving && !c.idle);
  }

  if (stationTimers.write > 0 && st.write.busy) {
    codeTimer += dt;
    if (codeTimer > 0.2) {
      codeTimer = 0;
      const code = st.write.code;
      code.rows.push(randomCodeRow());
      if (code.rows.length > 10) {
        code.rows.shift();
        code.scroll++;
      }
      st.write.screen.redraw();
    }
  }
  if (stationTimers.read > 0 && st.read.busy) {
    docTimer += dt;
    if (docTimer > 0.45) {
      docTimer = 0;
      const doc = st.read.doc;
      doc.cursor = (doc.cursor + 1) % doc.rows.length;
      st.read.screen.redraw();
    }
  }

  // Étincelles sur les claviers occupés
  for (const key of ['write', 'bash', 'web', 'read', 'search']) {
    const s = st[key];
    if (s.busy && Math.random() < dt * 5) {
      effects.burst(s.keys.localToWorld(tmp.set(0, 0, 0)), { count: 2, colors: [s.color, '#ffffff'], speed: 0.4, up: 0.8, life: 0.5, gravity: -1.5, size: 0.025 });
    }
  }

  const bash = st.bash;
  if (bash.pendingOk > 0) {
    bash.pendingOk -= dt;
    if (bash.pendingOk <= 0) {
      bash.lines.push({ t: '✓ terminé', c: '#a7f3d0' });
      if (bash.lines.length > 40) bash.lines.splice(0, bash.lines.length - 40);
      bash.screen.redraw();
    }
  }

  ringTimer += dt;
  if (stationTimers.web > 0 && st.web.busy && ringTimer > 0.55) {
    ringTimer = 0;
    effects.ring(st.web.group.localToWorld(st.web.topLocal.clone()), { color: '#f15bb5', from: 0.05, to: 1.2, life: 1.1 });
  }
}

function updateCharacters(now, dt, t) {
  for (const ch of [...chars.values()]) {
    // Quand il parle, le robot se tourne vers nous.
    if (!ch.moving && (ch.action === 'talk' || ch.action === 'ask')) {
      ch.face = Math.atan2(camera.position.x - ch.root.position.x, camera.position.z - ch.root.position.z);
    }
    ch.update(dt, t);

    if (ch.leaving && !ch.moving && !ch.vanishing) {
      if (!ch.inBay) {
        // Devant la baie : il entre sur le socle avant d'être démonté.
        ch.inBay = true;
        const p = bayCenter();
        ch.goTo({ pos: new THREE.Vector3(p.x, 0, p.z), face: ch.root.rotation.y }, 'idle');
      } else {
        ch.vanishing = true;
        st.agent.power = 1;
        ch.vanish(() => removeCharacter(ch));
        effects.burst(bayCenter().setY(0.8), { count: 24, colors: ['#b388ff', '#ffffff', ch.color], speed: 1.4, up: 1.5, life: 1, gravity: -1.5 });
      }
    }
    if (ch.leaving) continue;

    if (ch.idleAt && now > ch.idleAt) {
      ch.idleAt = 0;
      goIdle(ch);
    }
    const q = queues.get(ch.id);
    if (!ch.idle && !q?.items.length && now - ch.lastEventAt > IDLE_AFTER_MS) goIdle(ch);

    // Petites patrouilles quand rien ne se passe.
    if (ch.idle && !ch.moving) {
      if (!ch.wandering && Math.random() < dt * 0.03) {
        const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 1.8;
        ch.goTo({ pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), face: a + Math.PI }, 'idle');
        ch.wandering = true;
      } else if (ch.wandering && Math.random() < dt * 0.12) {
        moveTo(ch, 'dock', 'idle');
      }
    }
  }
}

function updateCamera(dt) {
  if (cam.autoRotate && !drag) camGoal.theta += dt * 0.06;
  const k = 1 - Math.exp(-dt * 6);
  cam.theta += (camGoal.theta - cam.theta) * k;
  cam.phi += (camGoal.phi - cam.phi) * k;
  cam.radius += (camGoal.radius - cam.radius) * k;
  const followed = followId && chars.get(followId);
  const goal = followed ? tmp.copy(followed.root.position).setY(0.7) : tmp.set(0, 0.6, 0);
  cam.target.lerp(goal, 1 - Math.exp(-dt * 4));
  camera.position.set(
    cam.target.x + cam.radius * Math.sin(cam.phi) * Math.sin(cam.theta),
    cam.target.y + cam.radius * Math.cos(cam.phi),
    cam.target.z + cam.radius * Math.sin(cam.phi) * Math.cos(cam.theta),
  );
  camera.lookAt(cam.target);
}

function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (document.hidden) return;

  processQueues(now);
  world.update(t, dt);
  updateStations(dt);
  updateCharacters(now, dt, t);
  effects.update(dt);
  updateCamera(dt);
  composer.render();
  hud.update(
    camera,
    app.clientWidth,
    app.clientHeight,
    floatTags.map((f) => ({ node: f.node, pos: f.pos.clone().add(f.offset) })),
  );
}

ensureMain();
goIdle(chars.get('main'));
renderer.setAnimationLoop(frame);
post({ type: 'ready' });
if (!vscode) startDemo();
