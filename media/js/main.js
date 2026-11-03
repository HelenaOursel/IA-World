// Point d'entrée de la webview : scène, caméra, et traduction des événements en animations.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from '../vendor/addons/environments/RoomEnvironment.js';
import { Character } from './character.js';
import { Demo } from './demo.js';
import { createBoard } from './board.js';
import { CameraRig } from './camera-rig.js';
import { Effects } from './effects.js';
import { trimShadows } from './geometry.js';
import { Hud, KIND_ICONS, pickLine, plainText } from './hud.js';
import { createInput } from './input.js';
import { minDuration, pushCapped } from './queue.js';
import { createStationScreens } from './station-screens.js';
import { THEME_LIST, loadTheme } from './themes/index.js';
import { buildWorld } from './world.js';

const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
// Thème fourni par l'extension (data-theme), ou par ?theme= hors de VS Code.
const theme = await loadTheme(document.body.dataset.theme || new URLSearchParams(location.search).get('theme'));
const post = (m) => vscode?.postMessage(m);
// Un thème peut avoir ses propres personnages (pandas du Japon), avec la même interface que Character.
const CharacterClass = theme.character ?? Character;
const SLEEP_TEXT = theme.sleepText ?? 'zZz En recharge';

// type d'activité -> [poste, animation]
const KIND_STATION = {
  read: ['read', 'read'],
  search: ['search', 'search'],
  write: ['write', 'type'],
  bash: ['bash', 'type'],
  web: ['web', 'type'],
  plan: ['plan', 'plan'],
  agent: ['agent', 'summon'],
  trash: ['trash', 'aim'],
  other: ['bash', 'type'],
};

// Une teinte par session Claude suivie (la première reste orange).
const MAIN_COLORS = ['#ff7a1a', '#ff4f8b', '#ffd23f', '#ff9e7a', '#f72585'];
const TYPE_COLORS = { Explore: '#2ec4b6', Plan: '#4361ee', 'general-purpose': '#9b5de5', 'claude-code-guide': '#ffc914' };
const EXTRA_COLORS = ['#06d6a0', '#ef476f', '#f78c6b', '#118ab2', '#8ac926', '#e0aaff'];
const IDLE_AFTER_MS = 35_000;

// ------------------------------------------------------------------ scène

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
// Plafonné à 1,5 : au-delà, la différence ne se voit pas et le coût de rendu explose sur les écrans très denses
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = theme.exposure ?? 1.1;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 220);
const world = buildWorld(scene, theme);
const st = world.stations;
const effects = new Effects(scene);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), theme.bloom?.strength ?? 0.55, 0.45, theme.bloom?.threshold ?? 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const chars = new Map();
const queues = new Map();
let colorIndex = 0;
let mainCount = 0;
let followId = null;

const demo = new Demo((msg) => handleMessage(msg, true));
const sessions = new Map(); // mainId -> SessionInfo
let hasSession = false;

const hud = new Hud(app, {
  themes: THEME_LIST,
  theme: theme.id,
  toggleDemo: () => (demo.running ? stopDemo() : startDemo()),
  toggleRotate: () => {
    rig.autoRotate = !rig.autoRotate;
    hud.setRotate(rig.autoRotate);
  },
  resetCamera: () => resetCamera(),
  follow: (id) => setFollow(followId === id ? null : id),
  pickSession: () => post({ type: 'pickSession' }),
  setTheme: (id) => requestTheme(id),
  animations: () => ANIMATIONS.map((a) => a.label),
  animationTarget: () => animationTarget()?.name ?? '',
  playAnimation: (i) => playAnimation(i),
  gift: theme.gift,
  giftHover: (x, y) => input.giftHover(x, y),
  dropGift: (x, y) => input.dropGift(x, y),
});

// ----------------------------------------------------------------- caméra

const rig = new CameraRig(camera);

function resetCamera() {
  rig.reset();
  setFollow(null);
}

/** Demande un autre thème : l'extension recharge le monde. Sans réponse, c'est qu'elle n'est pas à jour. */
function requestTheme(id) {
  if (!vscode) {
    location.search = '?theme=' + id;
    return;
  }
  hud.notice('Chargement du thème…');
  post({ type: 'setTheme', theme: id });
  // Si la page est rechargée, ce minuteur disparaît avec elle.
  setTimeout(() => hud.notice("Le thème n'a pas pu être appliqué : recharge la fenêtre VS Code (Ctrl+Maj+P puis « Developer: Reload Window »).", 12), 3000);
}

function setFollow(id) {
  followId = id;
  hud.setFollowed(id);
  if (id) rig.closeIn();
}

const input = createInput({ renderer, camera, rig, chars, world, effects, hud, theme, follow: (ch) => setFollow(ch ? ch.id : null) });

// ---------------------------------------------------------- postes et tableau

const screens = createStationScreens({ stations: st, chars, effects });
const board = createBoard({
  chars,
  stations: st,
  hud,
  theme,
  goToSleep: (ch) => {
    moveTo(ch, 'dock', 'sleep');
    hud.setActivityText(ch.id, SLEEP_TEXT);
  },
});

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

const isMainId = (id) => id === 'main' || id.startsWith('main:');

/** Robot Claude d'une session (créé s'il n'existe pas encore). */
function ensureMain(id = 'main', title = '', animated = false) {
  if (chars.has(id)) return chars.get(id);
  const n = mainCount++;
  const ch = new CharacterClass({ id, name: n ? `Claude ${n + 1}` : 'Claude', agentType: shorten(title, 26), color: MAIN_COLORS[n % MAIN_COLORS.length], isMain: true, skin: theme.skin, poses: theme.actions?.poses });
  addCharacter(ch);
  const spot = st.dock.claim(id);
  ch.stationKey = 'dock';
  ch.setPosition(spot.pos);
  ch.root.rotation.y = spot.face;
  ch.face = spot.face;
  ch.idle = true;
  ch.setAction('sleep');
  if (animated) {
    ch.appear();
    effects.burst(ch.topPosition(new THREE.Vector3()), { count: 20, colors: [ch.color, '#ffffff'], speed: 1.2, up: 1.5, life: 0.9, gravity: -2 });
  }
  return ch;
}

/** Fait disparaître le robot d'une session terminée et ses agents. */
function endSession(mainId) {
  for (const ch of [...chars.values()]) {
    if (ch.id !== mainId && ch.ownerId !== mainId) continue;
    if (ch.vanishing) continue;
    ch.leaving = ch.vanishing = true;
    effects.burst(ch.topPosition(new THREE.Vector3()), { count: 16, colors: [ch.color, '#ffffff'], speed: 1, up: 1.2, life: 0.8, gravity: -1.5 });
    ch.vanish(() => removeCharacter(ch));
  }
}

function primaryTitle(s) {
  const n = s?.sessions?.length ?? 0;
  const title = s?.session ? s.session.title || s.session.project : 'En attente de Claude…';
  return n > 1 ? `${n} sessions - ${title}` : title;
}

function addCharacter(ch) {
  ch.root.userData.charId = ch.id;
  trimShadows(ch.root, 0.04);
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
  const ch = new CharacterClass({ id: info.id, name: shorten(info.name, 28), agentType: info.agentType, color: colorFor(info.agentType), skin: theme.agentSkin ?? theme.skin, poses: theme.actions?.poses });
  ch.ownerId = info.ownerId;
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
    hud.addLog(KIND_ICONS.spawn, ch.name, ch.color, `assemblé (${info.agentType})`, ch.id);
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
  hud.addLog(KIND_ICONS.despawn, ch.name, ch.color, 'retourne à la baie', ch.id);
  moveTo(ch, 'agent', 'idle');
}

function removeCharacter(ch) {
  if (ch.themeAct) endThemeAction(ch);
  for (const s of Object.values(st)) s.release(ch.id);
  scene.remove(ch.root);
  ch.dispose();
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
  ch.pendingThrow = null;
  moveTo(ch, 'dock', 'sleep');
  hud.setActivityText(ch.id, SLEEP_TEXT);
}

function shorten(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --------------------------------------------------------------- activités

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
    screens.onActivity(key, ev);
    ch.pendingThrow = key === 'trash' ? { kind: trashKind(ev.label), real: true } : null;
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
  hud.addLog(icon, ch.name, ch.color, text, ch.id);
}

// ------------------------------------------------------------- corbeille

const SCORE_LINES = ['Panier !', 'Dans le mille !', 'Trois points !', 'Yes !'];
const MISS_LINES = ['Oups…', 'Raté !', 'Presque…', 'Zut !'];

/** Objet à jeter selon ce qui est supprimé. */
function trashKind(label) {
  if (/\.(json|ya?ml|toml|ini|env|conf|cfg|xml|lock)\b|config/i.test(label)) return 'config';
  if (/code/i.test(label)) return 'code';
  return 'file';
}

/** Le robot, arrivé devant la corbeille, y lance son objet (toujours réussi quand c'est une vraie suppression). */
function throwToBin(ch) {
  const job = ch.pendingThrow;
  ch.pendingThrow = null;
  const bin = st.trash;
  ch.react('throw', 0.7);
  bin.openLid(1.6);
  setTimeout(() => {
    if (!chars.has(ch.id)) return;
    const hit = job.real || Math.random() < 0.7;
    const mouth = bin.group.localToWorld(bin.mouthLocal.clone());
    effects.throwItem(ch.handPosition(new THREE.Vector3()), mouth, job.kind, hit, (ok) => {
      if (job.real) return;
      ch.react(ok ? 'jump' : 'surprise', ok ? 1.2 : 0.9);
      hud.say(ch.id, pickLine(ok ? SCORE_LINES : MISS_LINES), 'speech', '', 2, false);
    }, bin.burst);
    ch.setAction('idle');
  }, 250);
}

// --------------------------------------------------- activités du thème

// Outils donnés aux activités des thèmes (themes/<id>/actions.js).
const actionTools = {
  scene,
  effects,
  stations: st,
  say: (ch, text, seconds = 2.5) => hud.say(ch.id, text, 'speech', '', seconds, false),
  /** Marche vers un point ; `face` : orientation à l'arrivée. */
  walk: (ch, pos, action = 'idle', face = null) => ch.goTo({ pos, face }, action),
  /** Point au hasard sur la plate-forme, à l'écart de la tour centrale. */
  randomSpot: (min = 3, max = 5.2) => {
    const a = Math.random() * Math.PI * 2, r = min + Math.random() * (max - min);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  },
  /** Le cadeau du thème vole depuis `from` jusqu'au personnage. */
  giftTo: (ch, from, onArrive) => effects.gift(theme.gift, from, () => ch.root.localToWorld(new THREE.Vector3(0, ch.bodyY, ch.size * 0.3)), null, onArrive),
};

function startThemeAction(ch, chosen) {
  // Certaines activités sont réservées à certains personnages (`can`)
  const list = theme.actions.idle.filter((a) => a.can?.(ch) ?? true);
  if (!list.length) return;
  const total = list.reduce((s, a) => s + (a.weight ?? 1), 0);
  let r = Math.random() * total;
  // `chosen` : activité demandée depuis le menu Animations
  const def = chosen ?? list.find((a) => (r -= a.weight ?? 1) < 0) ?? list[0];
  if (ch.stationKey) st[ch.stationKey].release(ch.id);
  ch.stationKey = null;
  ch.wandering = false;
  ch.themeAct = { def, t: 0, state: {} };
  def.start(ch, actionTools, ch.themeAct.state);
  hud.setActivityText(ch.id, '~ ' + def.label);
}

function endThemeAction(ch) {
  const a = ch.themeAct;
  ch.themeAct = null;
  a.def.stop?.(ch, actionTools, a.state);
  ch.moveAction = null;
  ch.speed = ch.baseSpeed;
}

function updateThemeAction(ch, dt) {
  const a = ch.themeAct;
  // Du vrai travail arrive : l'activité s'arrête net.
  if (!ch.idle || ch.leaving) return endThemeAction(ch);
  a.t += dt;
  if (!a.def.update(ch, dt, a.t, actionTools, a.state)) return;
  endThemeAction(ch);
  moveTo(ch, 'dock', 'sleep');
  hud.setActivityText(ch.id, SLEEP_TEXT);
}

// ------------------------------------------------- animations à la demande

/** Personnage visé par le menu Animations : celui que suit la caméra, sinon le premier Claude. */
function animationTarget() {
  const alive = [...chars.values()].filter((c) => !c.leaving);
  return (followId && chars.get(followId)) || alive.find((c) => c.isMain) || alive[0] || null;
}

/** Interrompt ce que fait le personnage pour qu'il joue l'animation demandée. */
function freeForAnimation(ch) {
  if (ch.themeAct) endThemeAction(ch);
  board.stopDoodle(ch);
  ch.pendingThrow = null;
  ch.wandering = false;
  ch.idle = true;
  ch.lastEventAt = performance.now();
  if (ch.action === 'sleep') ch.setAction('idle');
}

const ANIMATIONS = [
  // Activités propres au thème (themes/<id>/actions.js)
  ...(theme.actions?.idle ?? []).map((def) => ({
    label: def.label,
    run(ch) {
      if (def.can && !def.can(ch)) return hud.notice(`${ch.name} ne peut pas faire ça pour l'instant.`, 3);
      startThemeAction(ch, def);
    },
  })),
  {
    label: 'Gribouillis au tableau',
    run(ch) {
      if (!board.canDoodle()) return hud.notice('Le tableau est occupé.', 3);
      board.startDoodle(ch);
    },
  },
  ...(theme.idleThrow !== false
    ? [
        {
          label: 'Panier de papier',
          run(ch) {
            moveTo(ch, 'trash', 'aim');
            ch.pendingThrow = { kind: 'ball', real: false };
            ch.wandering = true;
          },
        },
      ]
    : []),
  {
    label: 'Balade',
    run(ch) {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 1.8;
      ch.goTo({ pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), face: a + Math.PI }, 'idle');
      ch.wandering = true;
    },
  },
  {
    label: 'Saut de joie',
    run(ch) {
      ch.react('jump', 1.4);
      effects.burst(ch.topPosition(new THREE.Vector3()), { count: 34, colors: ['#ff7a1a', '#ffc53d', '#3ddc97', '#4cc9f0', '#b388ff'], speed: 2.2, up: 3, life: 1.4, gravity: -5, size: 0.06 });
    },
  },
  { label: 'Coucou', run: (ch) => ch.react('wave', 1.8) },
  {
    label: 'Yeux en cœur',
    run(ch) {
      ch.react('love', 2.4);
      effects.heart(ch.topPosition(new THREE.Vector3()), 6);
    },
  },
  { label: 'Surprise', run: (ch) => ch.react('surprise', 1) },
  { label: 'Dodo', run: (ch) => goIdle(ch) },
];

function playAnimation(i) {
  const ch = animationTarget();
  const anim = ANIMATIONS[i];
  if (!ch || !anim) return;
  freeForAnimation(ch);
  anim.run(ch);
  hud.say(ch.id, '~ ' + anim.label, 'action', '', 2, false);
}

function setTodos(todos) {
  st.plan.todos = todos || [];
  // Le plan revient au tableau : les gribouillis sont effacés.
  board.eraseAll();
  st.plan.screen.redraw();
}

function onError(ch, text) {
  ch.lastEventAt = performance.now();
  ch.react('error', 1.3);
  hud.say(ch.id, text, 'error', KIND_ICONS.error, 6);
  const p = ch.topPosition(new THREE.Vector3());
  effects.burst(p, { count: 14, colors: ['#ff4d6d', '#ff8fa3'], speed: 1.3, up: 1.2, life: 0.8, gravity: -2, size: 0.04 });
  effects.smoke(p.clone().setY(p.y - 0.4));
  if (ch.stationKey === 'bash') screens.onError(text);
  logEvent(ch, KIND_ICONS.error, text, 'error');
}

/** Interrompu par l'utilisateur : il abandonne ce qu'il restait à jouer et retourne à la borne. */
function onInterrupt(ch) {
  const q = queues.get(ch.id);
  if (q) q.items.length = 0;
  ch.pendingThrow = null;
  ch.react('surprise', 0.9);
  hud.say(ch.id, "Stop ! J'arrête.", 'error', KIND_ICONS.error, 3);
  logEvent(ch, KIND_ICONS.error, "interrompu par l'utilisateur", 'interrupt');
  ch.idleAt = performance.now() + 1200;
}

function onTurnEnd(ch) {
  ch.react('jump', 1.4);
  const p = ch.topPosition(new THREE.Vector3());
  effects.burst(p, { count: 34, colors: ['#ff7a1a', '#ffc53d', '#3ddc97', '#4cc9f0', '#b388ff'], speed: 2.2, up: 3, life: 1.4, gravity: -5, size: 0.06 });
  logEvent(ch, KIND_ICONS.done, 'a terminé son tour', 'done');
  if (ch.isMain) ch.idleAt = performance.now() + 2600;
}

function onPrompt(text, id) {
  const main = ensureMain(id);
  main.idle = false;
  main.lastEventAt = performance.now();
  // Le prompt arrive comme un signal radio capté par l'antenne du robot.
  effects.signal(
    () => main.antennaTip(new THREE.Vector3()),
    () => {
      main.receiveSignal();
      main.react('surprise', 0.8);
      hud.say(main.id, plainText(text), 'user', KIND_ICONS.prompt, THREE.MathUtils.clamp(3 + text.length / 14, 5, 12), false);
    },
  );
  hud.addLog(KIND_ICONS.prompt, 'Toi', '#7df9ff', text, main.id);
}

// ------------------------------------------------------- file d'attente

// Les événements sont étalés pour rester lisibles (rythme et plafond : queue.js).
function enqueue(agentId, ev) {
  const q = queues.get(agentId);
  if (q) pushCapped(q.items, ev);
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
    else if (ev.type === 'prompt') onPrompt(ev.text, id);
    else if (ev.type === 'despawn') despawnAgent(id);
  }
}

// --------------------------------------------------------------- messages

function handleMessage(msg, fromDemo = false) {
  if (!msg) return;
  if (demo.running && !fromDemo) {
    if (msg.type === 'session' || msg.type === 'snapshot') stopDemo(false);
    else if (msg.type === 'event' && msg.event.type !== 'status') stopDemo();
  }

  switch (msg.type) {
    case 'snapshot':
    case 'session':
      applySnapshot(msg.snapshot, msg.type === 'session');
      break;
    case 'demo':
      startDemo();
      break;
    case 'title':
      hud.setSession(msg.title, true);
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
      if (isMainId(ev.agentId)) ensureMain(ev.agentId);
      else if (!chars.has(ev.agentId)) spawnAgent({ id: ev.agentId, name: 'Agent', agentType: 'agent' });
      enqueue(ev.agentId, ev);
      break;
    case 'interrupt': {
      // Pas de file d'attente : le personnage doit s'arrêter tout de suite.
      const ch = isMainId(ev.agentId) ? ensureMain(ev.agentId) : chars.get(ev.agentId);
      if (ch) onInterrupt(ch);
      break;
    }
    case 'prompt': {
      const id = ev.agentId || 'main';
      ensureMain(id);
      enqueue(id, ev);
      break;
    }
    case 'sessionStart':
      // Après un /clear, la nouvelle session reprend le personnage de l'ancienne : seul son titre change.
      if (chars.has(ev.session.mainId)) hud.setCharacterType(ev.session.mainId, shorten(ev.session.title, 26));
      ensureMain(ev.session.mainId, ev.session.title, true);
      sessions.set(ev.session.mainId, ev.session);
      hud.setSession(primaryTitle({ session: ev.session, sessions: [...sessions.values()] }), true);
      hud.addLog(KIND_ICONS.spawn, 'Session', MAIN_COLORS[0], ev.session.title || 'nouvelle session Claude');
      break;
    case 'sessionEnd':
      sessions.delete(ev.mainId);
      endSession(ev.mainId);
      break;
    case 'title': {
      const info = sessions.get(ev.mainId);
      if (info) info.title = ev.title;
      hud.setCharacterType(ev.mainId, shorten(ev.title, 26));
      hud.setSession(primaryTitle({ session: info, sessions: [...sessions.values()] }), true);
      break;
    }
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
  for (const ch of [...chars.values()]) removeCharacter(ch);
  for (const q of queues.values()) q.items.length = 0;
  mainCount = 0;
  sessions.clear();
  hasSession = !!s?.session;
  for (const info of s?.sessions ?? []) {
    sessions.set(info.mainId, info);
    ensureMain(info.mainId, info.title);
  }
  if (!chars.size) ensureMain();
  hud.setSession(primaryTitle(s), !!s?.live);
  hud.showEmpty(!hasSession && !demo.running);
  if (reset) hud.clearLog();
  setTodos(s?.todos);
  for (const a of s?.agents ?? []) spawnAgent(a, false);
  for (const ch of chars.values()) if (ch.isMain) goIdle(ch);
  if (s?.live) {
    for (const ev of s.lastActivities ?? []) {
      const ch = chars.get(ev.agentId);
      if (ch && ev.type === 'activity') applyActivity(ch, ev, true);
    }
  }
}

function startDemo() {
  hud.setDemo(true);
  hud.showEmpty(false);
  hud.clearLog();
  for (const ch of [...chars.values()]) removeCharacter(ch);
  mainCount = 0;
  ensureMain();
  setTodos([]);
  demo.start();
}

/** Arrête la démo et vide le monde ; l'état réel est ensuite redemandé à l'extension. */
function stopDemo(requestSnapshot = true) {
  demo.stop();
  hud.setDemo(false);
  for (const ch of [...chars.values()]) removeCharacter(ch);
  for (const q of queues.values()) q.items.length = 0;
  mainCount = 0;
  setTodos([]);
  hud.setLive(false);
  hud.showEmpty(!hasSession);
  if (vscode && requestSnapshot) post({ type: 'ready' });
  else if (!vscode) goIdle(ensureMain());
}

window.addEventListener('message', (e) => handleMessage(e.data));

// ------------------------------------------------------------------ boucle

let last = performance.now();
const tmp = new THREE.Vector3();

function updateCharacters(now, dt, t) {
  for (const ch of [...chars.values()]) {
    // Quand il parle, le robot se tourne vers nous.
    if (!ch.moving && (ch.action === 'talk' || ch.action === 'ask')) {
      ch.face = Math.atan2(camera.position.x - ch.root.position.x, camera.position.z - ch.root.position.z);
    }
    ch.update(dt, t);
    if (ch.reaction?.type === 'love' && Math.random() < dt * 7) effects.heart(ch.topPosition(tmp).add(new THREE.Vector3(0, -0.3, 0)));

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

    if (ch.pendingThrow && !ch.moving && ch.stationKey === 'trash') throwToBin(ch);

    // Petites patrouilles quand rien ne se passe, un panier de papier dans la corbeille, ou une bêtise au tableau.
    if (ch.themeAct) updateThemeAction(ch, dt);
    else if (ch.doodle) board.updateDoodler(ch, dt);
    else if (ch.idle && !ch.moving) {
      if (!ch.wandering && theme.actions?.idle?.length && Math.random() < dt * 0.03) {
        startThemeAction(ch);
      } else if (!ch.wandering && ch.stationKey === 'dock' && Math.random() < dt * 0.025 && board.canDoodle()) {
        board.startDoodle(ch);
      } else if (!ch.wandering && Math.random() < dt * 0.03) {
        if (theme.idleThrow !== false && Math.random() < 0.4) {
          moveTo(ch, 'trash', 'aim');
          ch.pendingThrow = { kind: 'ball', real: false };
        } else {
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 1.8;
          ch.goTo({ pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), face: a + Math.PI }, 'idle');
        }
        ch.wandering = true;
      } else if (ch.wandering && !ch.pendingThrow && Math.random() < dt * 0.12) {
        moveTo(ch, 'dock', 'sleep');
      }
    }
  }
}

let skipFrame = false;
function frame() {
  // Panneau sans le focus (on code dans l'éditeur) : 30 images/s au lieu de 60, pour économiser la batterie.
  // Les animations avancent selon le temps écoulé, elles restent à la même vitesse.
  skipFrame = !skipFrame && !document.hasFocus();
  if (skipFrame) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (document.hidden) return;

  processQueues(now);
  world.update(t, dt);
  screens.update(dt);
  board.update(dt);
  updateCharacters(now, dt, t);
  effects.update(dt);
  rig.update(dt, followId ? chars.get(followId) : null, input.dragging());
  composer.render();
  hud.update(camera, app.clientWidth, app.clientHeight);
}

ensureMain();
goIdle(chars.get('main'));
renderer.setAnimationLoop(frame);
post({ type: 'ready' });
if (!vscode) startDemo();
