// Activités des droïdes inactifs : tour de dôme et message holographique projeté par l'œil.
// Contrat des actions de thème : voir themes/index.js.
import * as THREE from '../../../vendor/three.module.min.js';
import { consolePort } from './console.js';

const HOLO = '#5ab0ff';
const TURN = Math.PI * 2;

/** Petit hologramme (vaisseau en grille dans un cône de lumière) projeté devant le droïde. */
function hologram(scene) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 1, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(HOLO).multiplyScalar(0.8), transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  scene.add(beam);
  const grid = new THREE.MeshBasicMaterial({ color: new THREE.Color(HOLO).multiplyScalar(1.7), wireframe: true, transparent: true, opacity: 0.7 });
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 6), grid);
  hull.rotation.x = Math.PI / 2;
  ship.add(hull);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.09), grid);
    wing.position.set(sx * 0.1, 0, 0.06);
    wing.rotation.z = sx * 0.25;
    ship.add(wing);
  }
  g.add(ship);
  scene.add(g);
  return { g, ship, beam, grid };
}

/**
 * Bras droit tendu vers la prise du poste ; le bras gauche reste replié.
 * L'angle dépend de l'apparence (look.plug) : le droïde-souris, plus bas, vise vers le haut.
 */
const plugIn = {
  pose(p, t, ch) {
    // La prise est à mi-hauteur de la cloison : le bras monte en biais pour l'atteindre
    p.sRx = ch.look.plug?.sRx ?? -2.2;
    p.sRz = ch.look.plug?.sRz ?? -0.45;
    p.lift = ch.look.plug?.lift ?? 0;
    p.eR = 0;
    p.sLx = 0;
    p.sLz = -0.08;
    p.eL = -0.2;
    p.tiltX = 0.04 + Math.sin(t * 6) * 0.01;
  },
};

export const actions = {
  poses: {
    // Aux postes, le droïde se branche à la prise au lieu de taper au clavier
    type: plugIn,
    read: plugIn,
    search: plugIn,
    // Tient en place pendant que son dôme fait le tour, petit tremblement de joie
    domeScan: {
      pose(p, t) {
        p.tiltZ = Math.sin(t * 9) * 0.03;
        p.sLx = p.sRx = 0;
      },
    },
    // Légèrement penché en arrière pour projeter devant lui
    project: {
      pose(p) {
        p.tiltX = -0.08;
        p.sLx = p.sRx = 0;
      },
    },
  },

  idle: [
    {
      label: 'Jeu de lumières sur la console',
      // Une seule prise sur la console : un droïde à la fois
      can: () => !consolePort.busy,
      start(ch, tools) {
        consolePort.busy = ch.id;
        // Arrivé devant la prise, il s'y branche comme à un poste (pose 'type' = bras dans la prise)
        tools.walk(ch, consolePort.spot.clone(), 'type', consolePort.face);
      },
      update(ch, dt, time, tools, s) {
        if (ch.moving) return time > 25;
        s.at ??= time;
        if (!s.said) {
          s.said = true;
          tools.say(ch, 'Bidou bidou bip !', 2.5);
        }
        // Tant qu'il est branché, les boutons de la console font des vagues de couleurs
        consolePort.playing = 0.3;
        return time - s.at > 4.5;
      },
      stop(ch) {
        if (consolePort.busy === ch.id) consolePort.busy = null;
      },
    },
    {
      label: 'Tour de dôme',
      start(ch, tools, s) {
        ch.setAction('domeScan');
        s.base = ch.dome.rotation.y;
        tools.say(ch, 'Bip bip bidou !', 2);
      },
      update(ch, dt, time, tools, s) {
        ch.domeSpin = s.base + Math.min(1, time / 2.4) * TURN;
        ch.ledBoost = 0.2;
        return time > 3;
      },
      stop(ch) {
        // Le dôme a fait un tour complet : on garde sa position sans le faire repartir à l'envers.
        ch.dome.rotation.y %= TURN;
        ch.domeSpin = null;
      },
    },
    {
      label: 'Message holographique',
      start(ch, tools, s) {
        ch.setAction('project');
        Object.assign(s, hologram(tools.scene));
        tools.say(ch, 'Message holographique…', 2.5);
      },
      update(ch, dt, time, tools, s) {
        // L'hologramme flotte 0,9 m devant le droïde, le faisceau part de son œil
        const eye = ch.dome.localToWorld(new THREE.Vector3(0, ch.size * 0.19, ch.size * 0.3));
        const target = ch.root.localToWorld(new THREE.Vector3(0, ch.bodyY + 0.15, 0.9));
        s.g.position.copy(target);
        s.ship.rotation.y = time * 1.2;
        s.ship.position.y = Math.sin(time * 2) * 0.03;
        s.beam.position.copy(eye).lerp(target, 0.5);
        s.beam.scale.set(1, eye.distanceTo(target), 1);
        s.beam.lookAt(target);
        s.beam.rotateX(-Math.PI / 2);
        s.grid.opacity = Math.sin(time * 31) > 0.9 ? 0.3 : 0.7;
        if (time > 3.6 && !s.said) {
          s.said = true;
          tools.say(ch, 'Fin de transmission.', 2);
        }
        return time > 4.6;
      },
      stop(ch, tools, s) {
        tools.scene.remove(s.g, s.beam);
        for (const obj of [s.g, s.beam]) {
          obj.traverse((o) => {
            o.geometry?.dispose();
            if (o.material && o.material !== s.grid) o.material.dispose();
          });
        }
        s.grid.dispose();
      },
    },
  ],
};
