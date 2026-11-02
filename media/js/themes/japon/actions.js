// Activité des pandas inactifs : une banane grillée au feu de camp, au bout d'un bâton.
// Contrat des actions de thème : voir themes/index.js. Les poses 'roast' et 'eat' sont dans panda.js.
import * as THREE from '../../../vendor/three.module.min.js';

const START_LINES = ['Pause goûter !', 'Une petite banane ?', 'Miam, le feu est bien chaud !'];
const DONE_LINES = ['Grillée à point !', 'Trop bon <3', 'Toute caramélisée !', 'Encore une ?'];
const ROAST_TIME = 7; // secondes au-dessus du feu
const EAT_TIME = 2.4;

const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];
const bananaPos = new THREE.Vector3();

export const actions = {
  idle: [
    {
      label: 'Fait griller une banane',
      start(ch, tools, s) {
        // Un des bâtons posés au bord du feu (voir campfire.js), s'il en reste un de libre
        s.stick = tools.stations.dock.sticks?.find((k) => !k.user);
        if (!s.stick) return;
        s.stick.user = ch.id;
        s.step = 'fetch';
        s.sparkAt = 0;
        ch.goTo(s.stick.fetchSpot, 'idle');
      },
      update(ch, dt, time, tools, s) {
        const { stick } = s;
        // Tous les bâtons sont pris : il ira faire autre chose
        if (!stick) return true;
        if (ch.moving) return false;
        s.t = (s.t ?? 0) + dt;
        if (s.step === 'fetch') {
          // Ramasse le bâton, y enfile une banane, puis va s'installer au bord du feu
          stick.take(ch.armR.elbow);
          ch.react('catch', 0.6);
          if (Math.random() < 0.5) tools.say(ch, pick(START_LINES));
          ch.goTo(stick.roastSpot, 'roast');
          s.step = 'roast';
          s.t = 0;
        } else if (s.step === 'roast') {
          stick.roast(Math.min(1, s.t / ROAST_TIME));
          // De temps en temps, une étincelle saute de la banane
          if (s.t > s.sparkAt) {
            s.sparkAt = s.t + 0.6 + Math.random() * 1.2;
            tools.effects.burst(stick.bananaPosition(bananaPos).clone(), { count: 4, colors: ['#ffb347', '#ffd23f'], speed: 0.4, up: 0.8, life: 0.5, gravity: -1, size: 0.015, glow: 2 });
          }
          if (s.t >= ROAST_TIME) {
            ch.setAction('eat');
            s.step = 'eat';
            s.t = 0;
          }
        } else if (s.step === 'eat') {
          // Ramène la banane contre sa bouche, puis la croque en quelques bouchées
          stick.slide(Math.min(1, s.t / 0.4));
          stick.eat(Math.max(0, (s.t - 0.4) / (EAT_TIME - 0.4)));
          if (s.t >= EAT_TIME) {
            ch.react('love', 1.6);
            tools.effects.heart(ch.topPosition(new THREE.Vector3()), 3);
            if (Math.random() < 0.7) tools.say(ch, pick(DONE_LINES));
            return true;
          }
        }
        return false;
      },
      // Fini, interrompu par du vrai travail, ou panda qui s'en va : le bâton retourne au bord du feu.
      stop(ch, tools, s) {
        s.stick?.putBack();
      },
    },
  ],
};
