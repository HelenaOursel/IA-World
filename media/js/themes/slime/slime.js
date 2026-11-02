// Slime gélatineux et translucide, qui sautille (thème Slime).
import * as THREE from '../../../vendor/three.module.min.js';
import { mesh, neon, sphere } from '../../geometry.js';
import { addAntenna, addArms, addBody, addFace, addGlow } from '../shared.js';

export function buildSlime(ch) {
  const S = ch.size;
  addGlow(ch, S * 1.6, ch.color, 0.9);
  const R = S * 0.52;
  const b = addBody(ch, R * 0.82);
  const color = new THREE.Color(ch.color);
  // Gelée translucide avec un noyau plus clair et un reflet
  const jelly = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.78, emissive: color, emissiveIntensity: 0.18 });
  ch.blob = mesh(sphere(R, 36, 24), jelly);
  ch.blob.scale.set(1.08, 0.84, 1.04);
  b.add(ch.blob);
  const core = new THREE.Mesh(sphere(R * 0.32, 20, 14), neon(color.clone().offsetHSL(0, 0, 0.15), 1.2));
  core.position.set(0, -R * 0.15, -R * 0.1);
  b.add(core);
  const shine = mesh(sphere(R * 0.16, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), -R * 0.45, R * 0.42, R * 0.6);
  shine.scale.set(1.3, 0.7, 0.5);
  b.add(shine);
  addFace(b, ch, S * 0.62, S * 0.39, 0, R * 0.08, R * 1.04 + 0.01, 1);
  // Petite pousse sur le dessus, avec une goutte lumineuse
  addAntenna(b, ch, R * 0.8, { stem: 0.09, stemColor: '#6fbf4a', ball: 0.04 });
  // Petits bras en gelée
  addArms(b, ch, {
    x: R * 1.02,
    y: -R * 0.1,
    elbowY: -0.09,
    upper: (g) => g.add(mesh(sphere(0.06, 16, 10), jelly, 0, -0.04, 0)),
    fore: (g) => g.add(mesh(sphere(0.055, 16, 10), jelly, 0, -0.05, 0)),
  });
  return {
    hand: -0.05,
    top: R * 0.85 + 0.55,
    hover: 0,
    squash: 0.05,
    eye: '#1a1030',
    glow: false,
    // Sautille en se déplaçant et tremblote comme de la gelée
    animate(c, dt, t, moving) {
      if (moving) {
        const hop = Math.abs(Math.sin(t * 8));
        c.body.position.y += hop * 0.16;
        const s = 1 + (1 - hop) * 0.18;
        c.body.scale.set(Math.sqrt(s), 1 / s, Math.sqrt(s));
      }
      c.blob.rotation.y = Math.sin(t * 3 + c.phase) * 0.05;
    },
  };
}
