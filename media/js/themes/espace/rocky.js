// Petit alien à carapace de roche et cinq membres, à la manière de Rocky (Project Hail Mary) :
// l'apparence des agents dans le thème Espace. Pas de tête ni d'yeux ; les deux membres avant servent de bras.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, roundedBox } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

const SHELL = '#6b5d52';
const LIMB = '#5a4e45';
const FRONT = (36 * Math.PI) / 180; // les bras sont à ±36° de l'avant, les pattes à ±108° et à 180°

/** Main à trois doigts courts, au bout d'un membre. */
function hand(parent, y, material) {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const finger = mesh(new THREE.ConeGeometry(0.03, 0.07, 6), material, Math.cos(a) * 0.035, y - 0.025, Math.sin(a) * 0.035);
    finger.rotation.x = Math.PI;
    parent.add(finger);
  }
}

/** Patte : monte depuis le bord de la carapace jusqu'au genou, puis descend jusqu'au sol. */
function leg(body, angle, r, height, material) {
  const outer = new THREE.Group();
  outer.rotation.y = angle - Math.PI / 2; // +x local pointe vers l'extérieur
  const hip = new THREE.Group();
  hip.position.x = r * 0.9;
  outer.add(hip);
  // Courte, peu écartée et épaisse : trapue comme celles de Rocky, pas comme une araignée
  const knee = new THREE.Vector3(0.08, 0.05, 0);
  const foot = new THREE.Vector3(0.13, -height + 0.03, 0);
  const segment = (from, to, thick) => {
    const d = to.clone().sub(from);
    const s = mesh(roundedBox(d.length(), thick, thick, thick / 2, 3), material, (from.x + to.x) / 2, (from.y + to.y) / 2, 0);
    s.rotation.z = Math.atan2(d.y, d.x);
    hip.add(s);
  };
  segment(new THREE.Vector3(), knee, 0.1);
  segment(knee, foot, 0.088);
  const joint = mesh(new THREE.SphereGeometry(0.058, 12, 8), material, knee.x, knee.y, 0);
  hip.add(joint);
  const end = new THREE.Group();
  end.position.copy(foot);
  hand(end, 0.02, material);
  hip.add(end);
  body.add(outer);
  return hip;
}

export function buildRocky(ch) {
  const S = ch.size;
  const r = S * 0.46;
  const bodyY = S * 0.42;
  addGlow(ch, S * 1.3, ch.color, 0.5);
  const b = addBody(ch, bodyY);

  // Carapace facettée et bosselée
  const shellMat = new THREE.MeshStandardMaterial({ color: SHELL, roughness: 0.95, flatShading: true });
  const geo = new THREE.DodecahedronGeometry(r, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.9 + Math.random() * 0.18;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const shell = mesh(geo, shellMat);
  shell.scale.set(1, 0.55, 1);
  b.add(shell);
  const bump = mat('#7d6e62', { roughness: 0.95, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const knob = mesh(new THREE.DodecahedronGeometry(r * 0.16, 0), bump, Math.cos(a) * r * 0.55, r * 0.3, Math.sin(a) * r * 0.55);
    knob.scale.y = 0.6;
    b.add(knob);
  }

  // Pas de visage, mais le personnage en a besoin pour ses expressions : il reste invisible.
  addFace(b, ch, 0.1, 0.06, 0, 0, 0).visible = false;
  // Petit cristal lumineux sur le dessus, qui sert d'antenne (signal, réflexion)
  addAntenna(b, ch, r * 0.5, { stem: 0, ball: 0.04 });

  const limb = mat(LIMB, { roughness: 0.9 });
  // Les trois pattes qui marchent
  ch.legs = [Math.PI - FRONT * 2, Math.PI, Math.PI + FRONT * 2].map((a) => leg(b, a, r, bodyY, limb));
  // Les deux membres avant, utilisés comme bras par les animations
  addArms(b, ch, {
    x: Math.sin(FRONT) * r * 0.9,
    y: -r * 0.05,
    z: Math.cos(FRONT) * r * 0.9,
    elbowY: -0.13,
    upper: (g) => g.add(mesh(roundedBox(0.095, 0.15, 0.095, 0.047, 3), limb, 0, -0.06, 0)),
    fore: (g) => {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), limb));
      g.add(mesh(roundedBox(0.085, 0.14, 0.085, 0.042, 3), limb, 0, -0.07, 0));
      hand(g, -0.14, limb);
    },
  });

  return {
    hand: -0.16,
    top: r * 0.6 + 0.35,
    hover: 0,
    squash: 0.01,
    // Les pattes se lèvent tour à tour quand il se déplace
    animate(c, dt, t, moving) {
      c.legs.forEach((hip, i) => {
        const lift = moving ? Math.max(0, Math.sin(t * 12 + (i * Math.PI * 2) / 3)) * 0.35 : 0;
        hip.rotation.z += (lift - hip.rotation.z) * Math.min(1, dt * 15);
      });
      if (moving) c.body.position.y += Math.abs(Math.sin(t * 12)) * 0.015;
    },
  };
}
