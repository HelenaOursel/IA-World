// Scénario de démonstration : simule une session Claude avec deux sous-agents.
const act = (agentId, kind, label, detail) => ({ type: 'event', event: { type: 'activity', agentId, kind, label, detail } });
const ev = (event) => ({ type: 'event', event });

const TODOS_1 = [
  { content: 'Créer les variables de thème', status: 'in_progress' },
  { content: 'Ajouter l’interrupteur dans la barre du haut', status: 'pending' },
  { content: 'Adapter les composants colorés', status: 'pending' },
  { content: 'Lancer les tests', status: 'pending' },
];
const step = (todos, done, doing) => todos.map((t, i) => ({ ...t, status: i < done ? 'completed' : i === doing ? 'in_progress' : 'pending' }));

// [délai avant le message (s), message]
const SCRIPT = [
  [0.3, { type: 'title', title: 'Démo - Mode sombre' }],
  [0.4, ev({ type: 'prompt', text: 'Ajoute un mode sombre à l’application, avec un réglage dans la barre du haut.' })],
  [3.2, act('main', 'think', 'Je réfléchis…')],
  [2.0, act('main', 'talk', 'Je vais d’abord regarder comment les styles sont organisés.')],
  [2.6, act('main', 'search', 'Je cherche « theme »')],
  [3.0, act('main', 'read', 'Je lis App.tsx')],
  [2.8, act('main', 'read', 'Je lis styles.css')],
  [2.6, act('main', 'ask', 'Tu préfères un bouton ou un interrupteur ?')],
  [4.2, ev({ type: 'prompt', text: 'Un interrupteur, s’il te plaît :)' })],
  [3.2, act('main', 'plan', 'Je planifie (4 tâches)')],
  [0.4, ev({ type: 'todos', todos: TODOS_1 })],
  [2.8, act('main', 'agent', 'J’envoie un agent : Trouver les composants colorés')],
  [1.3, ev({ type: 'spawn', agent: { id: 'demo-explore', name: 'Trouver les composants colorés', agentType: 'Explore' } })],
  [1.2, act('main', 'agent', 'J’envoie un agent : Préparer les tests')],
  [1.2, ev({ type: 'spawn', agent: { id: 'demo-test', name: 'Préparer les tests', agentType: 'general-purpose' } })],
  [1.6, act('demo-explore', 'search', 'Je fouille src/**/*.tsx')],
  [0.6, act('demo-test', 'read', 'Je lis App.test.tsx')],
  [1.4, act('main', 'write', 'J’écris theme.ts')],
  [2.2, act('demo-explore', 'read', 'Je lis Header.tsx')],
  [1.5, act('demo-test', 'write', 'J’écris darkMode.test.ts')],
  [2.0, act('demo-explore', 'read', 'Je lis Button.tsx')],
  [1.5, act('main', 'write', 'Je modifie App.tsx')],
  [1.8, act('demo-explore', 'talk', '6 composants utilisent des couleurs en dur.')],
  [2.4, ev({ type: 'turnEnd', agentId: 'demo-explore' })],
  [1.0, ev({ type: 'despawn', id: 'demo-explore' })],
  [0.8, ev({ type: 'todos', todos: step(TODOS_1, 1, 1) })],
  [1.4, act('main', 'write', 'Je modifie Header.tsx')],
  [2.6, act('main', 'bash', '$ npm test', 'Lancer les tests')],
  [2.6, ev({ type: 'error', agentId: 'main', text: '1 test échoué : Header > bascule le thème' })],
  [2.0, act('main', 'think', 'Je réfléchis…')],
  [1.6, act('main', 'write', 'Je modifie Header.tsx')],
  [2.4, act('main', 'bash', '$ npm test', 'Relancer les tests')],
  [1.4, act('demo-test', 'talk', 'Tous les tests passent !')],
  [1.6, ev({ type: 'turnEnd', agentId: 'demo-test' })],
  [0.8, ev({ type: 'despawn', id: 'demo-test' })],
  [1.2, ev({ type: 'todos', todos: step(TODOS_1, 3, 3) })],
  [1.4, act('main', 'web', 'Je consulte developer.mozilla.org')],
  [3.0, act('main', 'plan', 'Je coche les tâches')],
  [0.6, ev({ type: 'todos', todos: step(TODOS_1, 4, -1) })],
  [2.4, act('main', 'talk', 'C’est fait ! Le mode sombre est prêt, avec un interrupteur dans la barre du haut.')],
  [1.2, ev({ type: 'turnEnd', agentId: 'main' })],
];

export class Demo {
  constructor(dispatch) {
    this.dispatch = dispatch;
    this.timer = null;
    this.running = false;
  }

  start() {
    this.stop();
    this.running = true;
    this.dispatch({ type: 'event', event: { type: 'status', live: true } });
    this.run(0);
  }

  run(i) {
    if (!this.running) return;
    if (i >= SCRIPT.length) {
      // On rejoue la démo après une pause.
      this.timer = setTimeout(() => this.run(0), 9000);
      return;
    }
    const [delay, msg] = SCRIPT[i];
    this.timer = setTimeout(() => {
      this.dispatch(msg);
      this.run(i + 1);
    }, delay * 1000);
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
  }
}
