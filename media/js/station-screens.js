// Ce qu'affichent les postes pendant le travail : le code qui s'écrit, le document qui défile,
// le terminal, le site consulté, la requête du radar, et les étincelles sur les claviers occupés.
import * as THREE from '../vendor/three.module.min.js';
import { docRows, randomCodeRow } from './world.js';

const KEYBOARDS = ['write', 'bash', 'web', 'read', 'search'];

const afterVerb = (label, re) => re.exec(label)?.[1] ?? '';

export function createStationScreens({ stations: st, chars, effects }) {
  // Temps restant (s) pendant lequel chaque poste s'anime après une activité
  const timers = { write: 0, bash: 0, web: 0, search: 0, read: 0 };
  let codeTimer = 0, docTimer = 0, ringTimer = 0;
  const tmp = new THREE.Vector3();

  /** Une activité arrive au poste `key` : son écran affiche ce qui se fait. */
  function onActivity(key, ev) {
    if (key === 'write') {
      st.write.code.file = afterVerb(ev.label, /(?:J['’]écris|Je modifie)\s+(.+)$/) || ev.label;
      st.write.code.rows = st.write.code.rows.slice(-3);
      st.write.screen.redraw();
      timers.write = 4;
    } else if (key === 'read') {
      st.read.doc = { file: afterVerb(ev.label, /Je lis\s+(.+)$/) || ev.label, rows: docRows(), cursor: 0 };
      st.read.screen.redraw();
      timers.read = 4;
    } else if (key === 'bash') {
      const lines = st.bash.lines;
      if (ev.detail) lines.push({ t: '# ' + ev.detail, c: '#5f7a72' });
      lines.push({ t: ev.label, c: '#39ff9f' });
      st.bash.pendingOk = 1.6;
      timers.bash = 3;
      st.bash.screen.redraw();
    } else if (key === 'web') {
      st.web.net.host = afterVerb(ev.label, /(?:Je consulte|web :)\s+(.+)$/) || ev.label;
      timers.web = 4;
    } else if (key === 'search') {
      st.search.query = ev.label.replace(/^Je (?:cherche|fouille)\s*/, '');
      st.search.blips = [];
      timers.search = 4;
    } else if (key === 'agent') {
      st.agent.power = Math.max(st.agent.power, 0.7);
    }
  }

  /** Erreur pendant une commande : le terminal l'affiche en rouge, sans « ok terminé ». */
  function onError(text) {
    st.bash.pendingOk = 0;
    st.bash.lines.push({ t: 'x ' + text, c: '#ff4d6d' });
    st.bash.screen.redraw();
  }

  function update(dt) {
    for (const k of Object.keys(timers)) timers[k] = Math.max(0, timers[k] - dt);
    for (const [key, s] of Object.entries(st)) {
      if (key === 'dock') continue;
      s.busy = [...chars.values()].some((c) => c.stationKey === key && !c.moving && !c.leaving && !c.idle);
    }

    if (timers.write > 0 && st.write.busy) {
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
    if (timers.read > 0 && st.read.busy) {
      docTimer += dt;
      if (docTimer > 0.45) {
        docTimer = 0;
        const doc = st.read.doc;
        doc.cursor = (doc.cursor + 1) % doc.rows.length;
        st.read.screen.redraw();
      }
    }

    // Étincelles sur les claviers occupés
    for (const key of KEYBOARDS) {
      const s = st[key];
      if (s.busy && Math.random() < dt * 5) {
        effects.burst(s.keys.localToWorld(tmp.set(0, 0, 0)), { count: 2, colors: [s.color, '#ffffff'], speed: 0.4, up: 0.8, life: 0.5, gravity: -1.5, size: 0.025 });
      }
    }

    const bash = st.bash;
    if (bash.pendingOk > 0) {
      bash.pendingOk -= dt;
      if (bash.pendingOk <= 0) {
        bash.lines.push({ t: 'ok terminé', c: '#a7f3d0' });
        if (bash.lines.length > 40) bash.lines.splice(0, bash.lines.length - 40);
        bash.screen.redraw();
      }
    }

    ringTimer += dt;
    if (timers.web > 0 && st.web.busy && ringTimer > 0.55) {
      ringTimer = 0;
      effects.ring(st.web.group.localToWorld(st.web.topLocal.clone()), { color: '#f15bb5', from: 0.05, to: 1.2, life: 1.1 });
    }
  }

  return { onActivity, onError, update };
}
