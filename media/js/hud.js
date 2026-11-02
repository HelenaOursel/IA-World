// Interface en surimpression : bulles de dialogue, liste des agents, journal.
import * as THREE from '../vendor/three.module.min.js';

// Icônes des messages : uniquement des caractères tapables au clavier.
export const KIND_ICONS = {
  read: '=',
  search: '/',
  write: '*',
  bash: '$',
  web: '@',
  plan: '#',
  agent: '&',
  ask: '?',
  think: '..',
  talk: '>',
  other: '%',
  trash: 'x',
  prompt: '<',
  error: '!',
  done: 'ok',
  spawn: '+',
  despawn: '-',
  love: '<3',
};

// Émojis couleur (présentation emoji par défaut ou forcée par FE0F), avec modificateurs et séquences ZWJ.
const EMOJI_RE =
  /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|[#*0-9]\uFE0F?\u20E3)(?:\p{Emoji_Modifier}|\uFE0F|\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F?))*/gu;
const EMOTES = Object.fromEntries(
  [
    [':)', '🙂😊☺'],
    [':D', '😀😃😄😁'],
    ['XD', '😆😂🤣'],
    [';)', '😉'],
    [':P', '😛😜😝😋'],
    ["^^'", '😅'],
    [':(', '🙁☹😞😔😟'],
    [":'(", '😢😭'],
    [':o', '😮😯😲😱'],
    [':|', '😐😑'],
    [':/', '😕'],
    ['B)', '😎'],
    [':?', '🤔'],
    ['<3', '❤😍🥰😘💖💕💗💓💞🧡💛💚💙💜'],
    ['o/', '👋'],
    ['+1', '👍'],
    ['-1', '👎'],
    ['\\o/', '🎉🥳🙌'],
    ['zZz', '😴💤'],
  ].flatMap(([emote, chars]) => [...chars].map((c) => [c, emote])),
);

// Symboles hors clavier les plus courants et leur équivalent tapable.
const SYMBOLS = {
  '♥': '<3', '♡': '<3', '☺': ':)', '☹': ':(', '✓': 'ok', '✔': 'ok', '✗': 'x', '✘': 'x',
  '→': '->', '←': '<-', '⇒': '=>', '↔': '<->', '•': '-', '·': '-', '›': '>', '‹': '<', '−': '-',
  '×': 'x', '÷': '/', '±': '+/-', '≤': '<=', '≥': '>=', '≠': '!=', '★': '*', '☆': '*',
};
// Ce qu'on peut taper sur un clavier classique : ASCII, lettres accentuées, chiffres et ponctuation française.
const NOT_KEYBOARD = /[^\x20-\x7E\t\n\r\p{L}\p{M}\p{Nd}’‘“”«»…–—¿¡€£°§µ²¨¤\u00A0\u202F]/gu;

/**
 * Texte d'un message, réduit aux caractères du clavier : émojis → émoticônes (🙂 → :)),
 * symboles → équivalent tapable (♥ → <3, ✓ → ok), le reste est retiré.
 */
export function plainText(s) {
  if (typeof s !== 'string' || !s) return s;
  const out = s
    .replace(EMOJI_RE, (m) => {
      const emote = EMOTES[m.replace(/[\uFE0F\u200D]|\p{Emoji_Modifier}/gu, '')];
      return emote ? ` ${emote} ` : ' ';
    })
    .replace(/[\uFE0E\uFE0F\u200D]/g, '')
    .replace(NOT_KEYBOARD, (c) => SYMBOLS[c] ?? (EMOTES[c] ? ` ${EMOTES[c]} ` : ' '));
  return out === s ? s : out.replace(/ {2,}/g, ' ').trim();
}

function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

export class Hud {
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.tags = new Map();
    this.cards = new Map();
    this.tmp = new THREE.Vector3();

    this.overlay = el('div', 'overlay', root);

    const top = el('div', 'panel top-left', root);
    const brand = el('div', 'brand', top);
    el('span', 'logo', brand, '▣');
    el('span', '', brand, 'IA World');
    const current = (handlers.themes ?? []).find((t) => t.id === handlers.theme);
    el('span', 'brand-sub', brand, (current?.name.split(' ·')[0] ?? 'Usine').toUpperCase());
    this.hudBtn = el('button', 'hud-toggle', brand);
    this.hudBtn.addEventListener('click', () => this.setHudHidden(!this.hudHidden));
    this.setHudHidden(false);
    this.title = el('div', 'session-title', top, 'En attente de Claude…');
    const row = el('div', 'status-row', top);
    this.status = el('span', 'pill off', row, '○ Hors ligne');
    this.demoBadge = el('span', 'pill demo hidden', row, 'DÉMO');
    // Choix du thème de l'univers
    const pick = el('label', 'theme-pick', top);
    el('span', '', pick, 'Thème');
    const select = el('select', 'theme-select', pick);
    for (const t of handlers.themes ?? []) {
      const o = el('option', '', select, t.name);
      o.value = t.id;
    }
    select.value = handlers.theme ?? 'usine';
    select.addEventListener('change', () => handlers.setTheme(select.value));
    this.title.title = 'Cliquer pour choisir la session';
    this.title.addEventListener('click', () => handlers.pickSession());

    this.agentsPanel = el('div', 'panel agents', root);
    el('div', 'panel-title', this.agentsPanel, 'Unités actives');
    this.agentList = el('div', 'agent-list', this.agentsPanel);

    this.log = el('div', 'panel log', root);
    el('div', 'panel-title', this.log, 'Journal');
    this.logTabsBar = el('div', 'log-tabs', this.log);
    this.logList = el('div', 'log-list', this.log);
    // Historique complet : chaque onglet en affiche une vue filtrée.
    this.logEntries = [];
    this.logTabs = new Map();
    this.logFilter = 'all';
    this.addLogTab('all', 'Tout', 'var(--cyan)');

    const controls = el('div', 'controls', root);
    // Cadeau propre au thème (puce, poisson, étoile, cristal)
    const gift = handlers.gift;
    const giftBtn = el('button', 'gift-item', controls);
    giftBtn.innerHTML = gift.svg + `<span>${gift.name}</span>`;
    giftBtn.title = `Glisse ${gift.article} sur un personnage pour lui faire plaisir`;
    giftBtn.addEventListener('pointerdown', (e) => this.dragGift(e));
    // Les autres actions sont rangées dans un menu qui s'ouvre vers le haut.
    const menu = el('div', 'action-menu', controls);
    this.menuBtn = el('button', 'menu-toggle', menu, '☰ Actions');
    this.menuBtn.setAttribute('aria-haspopup', 'menu');
    this.menuBtn.addEventListener('click', () => this.toggleMenu());
    this.menuList = el('div', 'menu-list hidden', menu);
    this.menuList.setAttribute('role', 'menu');
    const item = (label, action) => {
      const b = el('button', '', this.menuList, label);
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', () => {
        action();
        this.toggleMenu(false);
      });
      return b;
    };
    this.demoBtn = item('▶ Démo', () => handlers.toggleDemo());
    this.rotateBtn = item('⟳ Rotation', () => handlers.toggleRotate());
    item('⌖ Recentrer', () => handlers.resetCamera());
    this.toggleMenu(false);
    document.addEventListener('pointerdown', (e) => {
      if (!menu.contains(e.target)) this.toggleMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggleMenu(false);
    });

    this.empty = el('div', 'empty', root);
    el('div', 'empty-title', this.empty, 'Usine en veille');
    el('div', 'empty-text', this.empty, 'Lance Claude Code dans ce workspace : ses robots se mettront au travail ici, en direct.');
    const demo = el('button', 'primary', this.empty, '▶ Voir la démo');
    demo.addEventListener('click', () => handlers.toggleDemo());
  }

  /** Masque tout le HUD sauf l'encart IA World et le bouton du cadeau. */
  setHudHidden(hidden) {
    this.hudHidden = hidden;
    this.root.classList.toggle('hud-hidden', hidden);
    this.hudBtn.classList.toggle('active', hidden);
    this.hudBtn.textContent = hidden ? '○ HUD' : '◉ HUD';
    this.hudBtn.title = hidden ? 'Afficher le HUD' : 'Masquer le HUD';
  }

  setSession(title, live) {
    this.title.textContent = plainText(title) || 'Session Claude';
    this.setLive(live);
  }

  setLive(live) {
    this.status.className = 'pill ' + (live ? 'on' : 'off');
    this.status.textContent = live ? '● En direct' : '○ En pause';
  }

  /** Fait glisser le cadeau depuis le bouton jusqu'au monde ; handlers.dropGift(x, y) dit si un personnage l'a reçu. */
  dragGift(e) {
    e.preventDefault();
    const ghost = el('div', 'gift-ghost', this.root);
    ghost.innerHTML = this.handlers.gift.svg;
    const move = (ev) => {
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%) rotate(${(ev.clientX % 40) - 20}deg)`;
      this.handlers.giftHover(ev.clientX, ev.clientY);
    };
    const up = (ev) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const given = this.handlers.dropGift(ev.clientX, ev.clientY);
      if (given) ghost.remove();
      else {
        ghost.classList.add('missed');
        setTimeout(() => ghost.remove(), 350);
      }
    };
    move(e);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  /** Message temporaire en haut au centre. */
  notice(text, seconds = 4) {
    this.noticeEl ??= el('div', 'notice hidden', this.root);
    this.noticeEl.textContent = text;
    this.noticeEl.classList.remove('hidden');
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.noticeEl.classList.add('hidden'), seconds * 1000);
  }

  toggleMenu(open = this.menuList.classList.contains('hidden')) {
    this.menuList.classList.toggle('hidden', !open);
    this.menuBtn.classList.toggle('open', open);
    this.menuBtn.setAttribute('aria-expanded', String(open));
  }

  setDemo(on) {
    this.demoBadge.classList.toggle('hidden', !on);
    this.demoBtn.textContent = on ? '■ Stop démo' : '▶ Démo';
  }

  setRotate(on) {
    this.rotateBtn.classList.toggle('active', on);
  }

  showEmpty(show) {
    this.empty.classList.toggle('hidden', !show);
  }

  // ------------------------------------------------------- personnages

  addCharacter(ch) {
    const tag = el('div', 'tag', this.overlay);
    const name = el('div', 'name', tag, plainText(ch.name));
    name.style.setProperty('--c', ch.color);
    const bubble = el('div', 'bubble hidden', tag);
    const zzz = el('div', 'zzz hidden', tag);
    zzz.style.setProperty('--c', ch.color);
    for (const z of ['z', 'Z', 'z']) el('span', '', zzz, z);
    this.tags.set(ch.id, { tag, bubble, zzz, ch, hideAt: 0, sleeping: false });

    const card = el('div', 'agent-card', this.agentList);
    card.style.setProperty('--c', ch.color);
    const head = el('div', 'agent-head', card);
    el('span', 'dot', head);
    el('span', 'agent-name', head, plainText(ch.name));
    const type = el('span', 'agent-type', head, plainText(ch.agentType));
    const act = el('div', 'agent-act', card, 'En attente');
    card.addEventListener('click', () => this.handlers.follow(ch.id));
    this.cards.set(ch.id, { card, act, type });
    this.addLogTab(ch.id, ch.name, ch.color);
  }

  removeCharacter(id) {
    // L'onglet survit au robot tant que son historique est là.
    const tab = this.logTabs.get(id);
    if (tab) tab.gone = true;
    this.pruneLogTabs();
    this.tags.get(id)?.tag.remove();
    this.tags.delete(id);
    const c = this.cards.get(id);
    if (c) {
      c.card.classList.add('leaving');
      setTimeout(() => c.card.remove(), 400);
    }
    this.cards.delete(id);
  }

  setFollowed(id) {
    for (const [cid, c] of this.cards) c.card.classList.toggle('followed', cid === id);
  }

  /** Affiche une bulle au-dessus d'un personnage. style: speech | thought | error | user | action */
  say(id, text, style = 'speech', icon = '', duration = 6, updateCard = true) {
    const t = this.tags.get(id);
    if (!t) return;
    t.bubble.className = 'bubble ' + style;
    t.bubble.textContent = '';
    if (icon) el('span', 'icon', t.bubble, plainText(icon));
    el('span', 'txt', t.bubble, plainText(text));
    t.hideAt = performance.now() + duration * 1000;
    const c = this.cards.get(id);
    if (c && updateCard) c.act.textContent = (icon ? plainText(icon) + ' ' : '') + plainText(text);
  }

  setCharacterType(id, text) {
    const c = this.cards.get(id);
    if (c) c.type.textContent = plainText(text);
  }

  setActivityText(id, text) {
    const c = this.cards.get(id);
    if (c) c.act.textContent = plainText(text);
  }

  // ------------------------------------------------------------ journal

  addLogTab(id, name, color) {
    let tab = this.logTabs.get(id);
    if (!tab) {
      const btn = el('button', 'log-tab', this.logTabsBar);
      btn.addEventListener('click', () => this.setLogFilter(id));
      tab = { btn, gone: false };
      this.logTabs.set(id, tab);
    }
    // Un robot recréé avec le même id reprend son onglet.
    tab.gone = false;
    tab.btn.textContent = plainText(name);
    tab.btn.title = name;
    tab.btn.style.setProperty('--c', color);
    tab.btn.classList.remove('gone');
    tab.btn.classList.toggle('active', id === this.logFilter);
  }

  /** Retire les onglets des robots partis dont il ne reste plus aucune ligne. */
  pruneLogTabs() {
    for (const [id, tab] of this.logTabs) {
      tab.btn.classList.toggle('gone', tab.gone);
      if (!tab.gone || this.logEntries.some((e) => e.id === id)) continue;
      tab.btn.remove();
      this.logTabs.delete(id);
      if (this.logFilter === id) this.setLogFilter('all');
    }
  }

  setLogFilter(id) {
    this.logFilter = this.logTabs.has(id) ? id : 'all';
    for (const [tid, tab] of this.logTabs) tab.btn.classList.toggle('active', tid === this.logFilter);
    this.logList.textContent = '';
    const rows = this.logEntries.filter((e) => this.logFilter === 'all' || e.id === this.logFilter).slice(-7);
    for (const e of rows) this.logList.prepend(this.logRow(e));
  }

  logRow({ icon, who, color, text }) {
    const row = el('div', 'log-row', null);
    el('span', 'log-icon', row, plainText(icon));
    const w = el('span', 'log-who', row, plainText(who));
    w.style.color = color;
    el('span', 'log-text', row, plainText(text));
    return row;
  }

  /** `id` : robot concerné ; sans id, la ligne n'apparaît que dans l'onglet « Tout ». */
  addLog(icon, who, color, text, id) {
    const entry = { icon, who, color, text, id };
    this.logEntries.push(entry);
    if (this.logEntries.length > 200) {
      this.logEntries.splice(0, this.logEntries.length - 200);
      this.pruneLogTabs();
    }
    if (this.logFilter !== 'all' && id !== this.logFilter) return;
    this.logList.prepend(this.logRow(entry));
    while (this.logList.children.length > 7) this.logList.lastChild.remove();
  }

  clearLog() {
    this.logEntries.length = 0;
    this.logList.textContent = '';
    this.pruneLogTabs();
  }

  /** Repositionne les étiquettes en projetant la tête de chaque personnage. */
  update(camera, width, height, extraTags = []) {
    const now = performance.now();
    for (const t of this.tags.values()) {
      t.ch.topPosition(this.tmp);
      this.place(t.tag, this.tmp, camera, width, height);
      if (t.hideAt && now > t.hideAt) {
        t.bubble.classList.add('hidden');
        t.hideAt = 0;
      }
      const sleeping = t.ch.action === 'sleep' && !t.ch.moving;
      if (sleeping !== t.sleeping) {
        t.sleeping = sleeping;
        t.zzz.classList.toggle('hidden', !sleeping);
      }
    }
    for (const { node, pos } of extraTags) this.place(node, pos, camera, width, height);
  }

  place(node, pos, camera, width, height) {
    const v = this.tmp.copy(pos).project(camera);
    if (v.z > 1) {
      node.style.display = 'none';
      return;
    }
    node.style.display = '';
    node.style.zIndex = String(Math.round((1 - v.z) * 100000));
    node.style.transform = `translate(${((v.x + 1) / 2) * width}px, ${((1 - v.y) / 2) * height}px) translate(-50%, -100%)`;
  }

  floating(text, cls) {
    return el('div', 'float-tag ' + cls, this.overlay, plainText(text));
  }
}
