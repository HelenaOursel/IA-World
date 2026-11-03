// Petit droïde-souris (thème Vaisseau) : l'apparence des agents. Boîtier noir bas sur roues,
// avant en pente, capteurs lumineux ; ses bras restent rangés tant qu'il ne travaille pas.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, roundedBox, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

// Actions pendant lesquelles il sort ses bras (poste, tableau, lancer, invocation)
const ARMS_OUT = new Set(['type', 'read', 'search', 'plan', 'aim', 'summon', 'web']);

/** Profil du boîtier vu de côté (z vers l'avant, y vers le haut), extrudé sur la largeur. */
function shellGeometry(L, H, W) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -H / 2);
  s.lineTo(-L / 2, H / 2);
  s.lineTo(L * 0.12, H / 2);
  s.lineTo(L / 2, -H * 0.12);
  s.lineTo(L / 2, -H / 2);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  // Extrudé le long de z : on le couche pour que la largeur soit le long de x, centrée
  geo.rotateY(-Math.PI / 2);
  geo.translate(W / 2, 0, 0);
  return geo;
}

export function buildMouseDroid(ch) {
  const S = ch.size;
  const L = S * 0.78, H = S * 0.33, W = S * 0.5;
  // Plus vif que le grand droïde
  ch.speed = ch.baseSpeed = 3.4;
  const black = new THREE.MeshPhysicalMaterial({ color: '#1b1e24', metalness: 0.4, roughness: 0.35, clearcoat: 0.6 });
  const grey = mat('#5c6370', { metalness: 0.6, roughness: 0.35 });
  const stripe = mat(ch.color, { metalness: 0.2, roughness: 0.4 });
  addGlow(ch, S * 1.1, ch.color, 0.4);

  const b = addBody(ch, 0.06 + H / 2);
  b.add(mesh(shellGeometry(L, H, W), black));
  // Dessus en gradins, bande de couleur, panneaux gris
  b.add(mesh(roundedBox(W * 0.8, 0.03, L * 0.4, 0.012, 2), grey, 0, H / 2 + 0.012, -L * 0.15));
  b.add(mesh(roundedBox(W * 0.82, 0.02, 0.05, 0.008, 2), stripe, 0, H / 2 + 0.005, L * 0.08));
  for (const sx of [-1, 1]) b.add(mesh(roundedBox(0.012, H * 0.5, L * 0.5, 0.005, 2), grey, sx * (W / 2 + 0.008), -H * 0.05, -L * 0.1));
  // Face avant en pente : fente de visée et deux capteurs
  const slope = new THREE.Group();
  slope.position.set(0, H * 0.2, L * 0.31);
  slope.rotation.x = Math.atan2(L * 0.38, H * 0.62);
  b.add(slope);
  slope.add(mesh(roundedBox(W * 0.6, 0.022, 0.01, 0.006, 2), mat('#0b0d12'), 0, 0.01, 0.006));
  ch.sensors = ['#ffffff', '#ff3b3b'].map((c, k) => {
    const s = new THREE.Mesh(sphere(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: c }));
    s.position.set((k ? 1 : -1) * W * 0.22, -0.03, 0.01);
    s.userData.base = new THREE.Color(c);
    slope.add(s);
    return s;
  });

  // Roues sous le boîtier
  ch.wheels = [];
  for (const sx of [-1, 1]) {
    for (const z of [-L * 0.3, L * 0.3]) {
      const w = mesh(cylinder(0.045, 0.045, 0.03, 14), grey, sx * (W / 2 - 0.02), -H / 2 - 0.015, z);
      w.rotation.z = Math.PI / 2;
      b.add(w);
      ch.wheels.push(w);
    }
  }

  // Pas de visage : il en garde un invisible pour les expressions. Petite antenne à l'arrière.
  addFace(b, ch, 0.1, 0.06, 0, 0, 0).visible = false;
  addAntenna(b, ch, H / 2, { stem: 0.09, stemColor: '#5c6370', ball: 0.022, x: W * 0.28 });
  ch.antenna.position.z = -L * 0.35;

  // Bras manipulateurs à l'avant, rangés quand il ne travaille pas
  const armMat = mat('#9aa3b1', { metalness: 0.6, roughness: 0.3 });
  addArms(b, ch, {
    x: W * 0.2,
    y: -H * 0.1,
    z: L * 0.42,
    elbowY: -0.12,
    upper: (g) => g.add(mesh(roundedBox(0.026, 0.13, 0.026, 0.011, 2), armMat, 0, -0.055, 0)),
    fore: (g, sx) => {
      g.add(mesh(roundedBox(0.022, 0.12, 0.022, 0.01, 2), armMat, 0, -0.05, 0));
      const tool = new THREE.Group();
      tool.position.y = -0.11;
      tool.add(mesh(roundedBox(0.04, 0.018, 0.018, 0.007, 2), mat('#2a2f3a')));
      tool.add(mesh(roundedBox(0.018, 0.018, 0.04, 0.007, 2), mat('#2a2f3a')));
      g.add(tool);
      if (sx > 0) ch.tool = tool;
    },
  });

  return {
    hand: -0.11,
    top: H / 2 + 0.45,
    hover: 0,
    squash: 0.004,
    // Bas sur roues : il tend le bras vers le haut, en biais, pour atteindre la prise du poste
    // Il se hausse sur ses suspensions et lève le bras pour atteindre la prise
    plug: { sRx: -2.6, sRz: -0.25, lift: 0.17 },
    animate(c, dt, t, moving) {
      for (const w of c.wheels) w.rotation.x += (moving ? c.speed * 20 : 0) * dt;
      // Frétille un peu en roulant
      if (moving) {
        c.body.rotation.y += Math.sin(t * 25) * 0.05;
        c.body.position.y += Math.abs(Math.sin(t * 30)) * 0.006;
      }
      const out = !moving && ARMS_OUT.has(c.action);
      c.armL.shoulder.visible = c.armR.shoulder.visible = out;
      if (out && c.action !== 'plan' && c.action !== 'aim') c.tool.rotation.y += dt * 14;
      c.sensors.forEach((s, k) => s.material.color.copy(s.userData.base).multiplyScalar(Math.sin(t * 3 + k * 2 + c.phase) > -0.3 ? 2 : 0.4));
    },
  };
}
