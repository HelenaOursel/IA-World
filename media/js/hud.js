// Interface en surimpression : bulles de dialogue, liste des agents, journal.
import * as THREE from '../vendor/three.module.min.js';

export const KIND_ICONS = {
  read: '▤',
  search: '◎',
  write: '✎',
  bash: '❯',
  web: '⌁',
  plan: '☰',
  agent: '◈',
  ask: '?',
  think: '∴',
  talk: '›',
  other: '⚙',
  prompt: '✉',
  error: '⚠',
  done: '✓',
  spawn: '+',
  despawn: '−',
};

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
    el('span', 'brand-sub', brand, 'USINE');
    this.title = el('div', 'session-title', top, 'En attente de Claude…');
    const row = el('div', 'status-row', top);
    this.status = el('span', 'pill off', row, '○ Hors ligne');
    this.demoBadge = el('span', 'pill demo hidden', row, 'DÉMO');
    this.title.title = 'Cliquer pour choisir la session';
    this.title.addEventListener('click', () => handlers.pickSession());

    this.agentsPanel = el('div', 'panel agents', root);
    el('div', 'panel-title', this.agentsPanel, 'Unités actives');
    this.agentList = el('div', 'agent-list', this.agentsPanel);

    this.log = el('div', 'panel log', root);
    el('div', 'panel-title', this.log, 'Journal');
    this.logList = el('div', 'log-list', this.log);

    const controls = el('div', 'controls', root);
    this.demoBtn = el('button', '', controls, '▶ Démo');
    this.demoBtn.addEventListener('click', () => handlers.toggleDemo());
    this.rotateBtn = el('button', '', controls, '⟳ Rotation');
    this.rotateBtn.addEventListener('click', () => handlers.toggleRotate());
    const reset = el('button', '', controls, '⌖ Recentrer');
    reset.addEventListener('click', () => handlers.resetCamera());

    this.empty = el('div', 'empty', root);
    el('div', 'empty-title', this.empty, 'Usine en veille');
    el('div', 'empty-text', this.empty, 'Lance Claude Code dans ce workspace : ses robots se mettront au travail ici, en direct.');
    const demo = el('button', 'primary', this.empty, '▶ Voir la démo');
    demo.addEventListener('click', () => handlers.toggleDemo());
  }

  setSession(title, live) {
    this.title.textContent = title || 'Session Claude';
    this.setLive(live);
  }

  setLive(live) {
    this.status.className = 'pill ' + (live ? 'on' : 'off');
    this.status.textContent = live ? '● En direct' : '○ En pause';
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
    const name = el('div', 'name', tag, ch.isMain ? 'Claude' : ch.name);
    name.style.setProperty('--c', ch.color);
    const bubble = el('div', 'bubble hidden', tag);
    this.tags.set(ch.id, { tag, bubble, ch, hideAt: 0 });

    const card = el('div', 'agent-card', this.agentList);
    card.style.setProperty('--c', ch.color);
    const head = el('div', 'agent-head', card);
    el('span', 'dot', head);
    el('span', 'agent-name', head, ch.isMain ? 'Claude' : ch.name);
    if (!ch.isMain) el('span', 'agent-type', head, ch.agentType);
    const act = el('div', 'agent-act', card, 'En attente');
    card.addEventListener('click', () => this.handlers.follow(ch.id));
    this.cards.set(ch.id, { card, act });
  }

  removeCharacter(id) {
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
  say(id, text, style = 'speech', icon = '', duration = 6) {
    const t = this.tags.get(id);
    if (!t) return;
    t.bubble.className = 'bubble ' + style;
    t.bubble.textContent = '';
    if (icon) el('span', 'icon', t.bubble, icon);
    el('span', 'txt', t.bubble, text);
    t.hideAt = performance.now() + duration * 1000;
    const c = this.cards.get(id);
    if (c) c.act.textContent = (icon ? icon + ' ' : '') + text;
  }

  setActivityText(id, text) {
    const c = this.cards.get(id);
    if (c) c.act.textContent = text;
  }

  addLog(icon, who, color, text) {
    const row = el('div', 'log-row', null);
    el('span', 'log-icon', row, icon);
    const w = el('span', 'log-who', row, who);
    w.style.color = color;
    el('span', 'log-text', row, text);
    this.logList.prepend(row);
    while (this.logList.children.length > 7) this.logList.lastChild.remove();
  }

  clearLog() {
    this.logList.textContent = '';
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
    return el('div', 'float-tag ' + cls, this.overlay, text);
  }
}
