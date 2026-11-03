// Petit droïde astromécanicien (thème Vaisseau) : corps cylindrique blanc, dôme argenté qui pivote,
// œil-radar, deux jambes latérales et un pied central. Les panneaux prennent la couleur du personnage.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, lerpAngle, mat, mesh, roundedBox, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

export function buildDroid(ch) {
  const S = ch.size;
  const r = S * 0.36; // rayon du corps et du dôme
  const h = S * 0.78; // hauteur du corps
  const white = new THREE.MeshPhysicalMaterial({ color: '#e8ecf2', roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const silver = mat('#c3cad4', { metalness: 0.75, roughness: 0.28 });
  const dark = mat('#2a2f3a', { metalness: 0.4, roughness: 0.4 });
  const panel = mat(ch.color, { metalness: 0.2, roughness: 0.4 });
  addGlow(ch, S * 1.3, '#5ab0ff', 0.45);

  // Corps : cylindre blanc, anneau en bas, panneaux de couleur à l'avant
  const b = addBody(ch, 0.16 + h / 2);
  b.add(mesh(cylinder(r, r * 0.96, h, 32), white));
  b.add(mesh(cylinder(r * 1.01, r * 1.01, 0.03, 32), silver, 0, -h / 2 + 0.02, 0));
  const front = (x, y, w, hh) => b.add(mesh(roundedBox(w, hh, 0.02, 0.008, 2), panel, x, y, Math.sqrt(r * r - x * x) - 0.004));
  front(0, h * 0.28, r * 1.2, 0.035); // bande sous le dôme
  for (const x of [-r * 0.42, 0, r * 0.42]) front(x, h * 0.02, r * 0.22, h * 0.34);
  b.add(mesh(roundedBox(r * 0.5, 0.05, 0.02, 0.01, 2), dark, 0, -h * 0.3, Math.sqrt(r * r) - 0.004));

  // Dôme argenté qui pivote, avec ses panneaux, son œil-radar et des voyants
  ch.dome = new THREE.Group();
  ch.dome.position.y = h / 2;
  b.add(ch.dome);
  ch.dome.add(mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), silver));
  for (let k = 0; k < 5; k++) {
    const a = -0.9 + k * 0.45;
    const p = mesh(roundedBox(0.06, 0.05, 0.02, 0.008, 2), panel, Math.sin(a) * r * 0.97, r * 0.3, Math.cos(a) * r * 0.97);
    p.rotation.y = a;
    ch.dome.add(p);
  }
  const eye = mesh(sphere(r * 0.16, 16, 12), mat('#0b0d12', { metalness: 0.3, roughness: 0.1 }), 0, r * 0.52, r * 0.82);
  ch.dome.add(eye);
  // Voyants du dôme : ils clignotent au hasard (plus vite pendant le tour de dôme)
  ch.leds = ['#ff3b3b', '#5ab0ff', '#ffffff'].map((c, k) => {
    const led = new THREE.Mesh(sphere(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: c }));
    led.position.set((k - 1) * r * 0.28, r * 0.18, Math.sqrt(r * r - (r * 0.18) ** 2) * 0.98);
    led.userData.base = new THREE.Color(c);
    ch.dome.add(led);
    return led;
  });
  ch.ledBoost = 0;
  ch.domeSpin = null;

  // Pas de visage : le personnage en garde un, invisible, pour ses expressions.
  addFace(b, ch, 0.1, 0.06, 0, 0, 0).visible = false;
  // Le voyant principal, sur le haut du dôme, sert d'antenne (signal reçu, réflexion)
  addAntenna(ch.dome, ch, r * 0.62, { stem: 0, ball: 0.035 });
  ch.antenna.position.z = r * 0.55;

  // Deux jambes latérales et un pied central, au sol
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * (r + 0.045), 0, 0);
    leg.add(mesh(sphere(0.06, 14, 10), silver, 0, 0.16 + h * 0.36, 0));
    leg.add(mesh(roundedBox(0.075, h * 0.78, 0.13, 0.03, 3), white, 0, 0.16 + h * 0.36 - h * 0.39, 0));
    leg.add(mesh(roundedBox(0.11, 0.08, 0.2, 0.025, 3), panel, 0, 0.06, 0.01));
    ch.chassis.add(leg);
  }
  ch.chassis.add(mesh(cylinder(0.05, 0.07, 0.16, 14), dark, 0, 0.08, 0));

  // Petits bras manipulateurs qui sortent de l'avant du corps
  const armMat = mat('#9aa3b1', { metalness: 0.6, roughness: 0.3 });
  addArms(b, ch, {
    x: r * 0.42,
    y: -h * 0.12,
    z: r * 0.78,
    elbowY: -0.09,
    upper: (g) => g.add(mesh(roundedBox(0.03, 0.1, 0.03, 0.012, 2), armMat, 0, -0.04, 0)),
    fore: (g, sx) => {
      g.add(mesh(roundedBox(0.026, 0.09, 0.026, 0.011, 2), armMat, 0, -0.04, 0));
      // Embout en croix : celui du bras droit tourne quand le droïde est branché à une prise
      const tool = new THREE.Group();
      tool.position.y = -0.09;
      tool.add(mesh(roundedBox(0.045, 0.02, 0.02, 0.008, 2), dark));
      tool.add(mesh(roundedBox(0.02, 0.02, 0.045, 0.008, 2), dark));
      g.add(tool);
      if (sx > 0) ch.tool = tool;
    },
  });

  return {
    hand: -0.09,
    top: h / 2 + r + 0.35,
    hover: 0,
    squash: 0.004,
    animate(c, dt, t, moving) {
      // Il roule penché en arrière sur ses deux jambes
      if (moving) c.body.rotation.x -= 0.12;
      // Branché à une prise (lecture, recherche, code…) : l'embout tourne pour travailler
      if (!moving && (c.action === 'type' || c.action === 'read' || c.action === 'search')) c.tool.rotation.y += dt * 14;
      // Le dôme regarde autour de lui, ou suit le tour de dôme d'une activité
      const target = c.domeSpin ?? Math.sin(t * 0.6 + c.phase) * 0.6 + (moving ? Math.sin(t * 3) * 0.3 : 0);
      c.dome.rotation.y = c.domeSpin === null ? lerpAngle(c.dome.rotation.y, target, Math.min(1, dt * 6)) : target;
      const fast = c.ledBoost > 0;
      c.ledBoost = Math.max(0, c.ledBoost - dt);
      c.leds.forEach((led, k) => {
        const on = Math.sin(t * (fast ? 14 : 2.3) + k * 2.1 + c.phase) > 0.2;
        led.material.color.copy(led.userData.base).multiplyScalar(on ? 2.2 : 0.3);
      });
    },
  };
}
