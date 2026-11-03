// Poste de travail du vaisseau, à la place du bureau et du clavier : une fine cloison de coque,
// une prise ronde sur un bras où le droïde se branche, et l'écran du poste
// projeté en hologramme au-dessus.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, neon, roundedBox } from '../../geometry.js';

// La prise est à mi-hauteur de la cloison, dans un bloc qui avance vers le droïde ; le droïde
// lève le bras pour l'atteindre (voir plugIn dans actions.js).
const SOCKET_Y = 0.48, SOCKET_Z = 0.4;

/** Construit le poste dans st.group ; `screen` est l'écran du poste (code, terminal…). */
export function buildDataPort(st, screen, { sw = 1.05, sh = 0.62 } = {}) {
  const g = st.group;
  const c = st.color;
  const hull = mat('#4a505c', { metalness: 0.6, roughness: 0.4 });
  const dark = mat('#23272f', { metalness: 0.5, roughness: 0.45 });

  // Fine cloison de coque, avec un cadre, des nervures et une fente lumineuse
  const WALL_W = 1.3, WALL_H = 1.05, WALL_Z = -0.12;
  g.add(mesh(roundedBox(WALL_W, WALL_H, 0.06, 0.02), hull, 0, WALL_H / 2, WALL_Z));
  for (const x of [-WALL_W / 2, WALL_W / 2]) g.add(mesh(roundedBox(0.07, WALL_H + 0.06, 0.1, 0.02), dark, x, (WALL_H + 0.06) / 2, WALL_Z));
  g.add(mesh(roundedBox(WALL_W + 0.07, 0.06, 0.1, 0.02), dark, 0, WALL_H + 0.03, WALL_Z));
  g.add(mesh(new THREE.BoxGeometry(WALL_W - 0.1, 0.02, 0.07), dark, 0, 0.96, WALL_Z));

  // Base pleine largeur, comme la console de pilotage : une face avant verticale qui porte la prise,
  // puis un dessus en pente qui remonte jusqu'à la cloison du fond
  const FRONT_H = SOCKET_Y + 0.16, SLOPE_TOP = 0.9;
  const profile = new THREE.Shape();
  profile.moveTo(WALL_Z, 0);
  profile.lineTo(SOCKET_Z, 0);
  profile.lineTo(SOCKET_Z, FRONT_H);
  profile.lineTo(WALL_Z + 0.03, SLOPE_TOP);
  profile.lineTo(WALL_Z, SLOPE_TOP);
  profile.closePath();
  const baseGeo = new THREE.ExtrudeGeometry(profile, { depth: WALL_W, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
  // Profil dessiné dans le plan (z, y), extrudé sur la largeur : on le couche le long de x, centré
  baseGeo.rotateY(-Math.PI / 2);
  baseGeo.translate(WALL_W / 2, 0, 0);
  g.add(mesh(baseGeo, hull));
  g.add(mesh(new THREE.BoxGeometry(WALL_W + 0.04, 0.06, SOCKET_Z - WALL_Z + 0.04), dark, 0, 0.03, (WALL_Z + SOCKET_Z) / 2));
  // Liserés lumineux : arête entre la face avant et la pente, et bas de la face avant
  g.add(new THREE.Mesh(new THREE.BoxGeometry(WALL_W, 0.014, 0.014), neon(c, 1.1)).translateY(FRONT_H).translateZ(SOCKET_Z + 0.004));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(WALL_W - 0.1, 0.01, 0.01), neon(c, 0.7)).translateY(0.1).translateZ(SOCKET_Z + 0.008));
  // Rainures sur la pente
  const slopeAngle = Math.atan2(SLOPE_TOP - FRONT_H, SOCKET_Z - WALL_Z - 0.03);
  for (const k of [0.35, 0.65]) {
    const groove = mesh(new THREE.BoxGeometry(WALL_W - 0.12, 0.012, 0.012), dark, 0, FRONT_H + (SLOPE_TOP - FRONT_H) * k + 0.008, SOCKET_Z - (SOCKET_Z - WALL_Z - 0.03) * k);
    groove.rotation.x = slopeAngle;
    g.add(groove);
  }
  // La prise : un trou rond encastré qui entoure tout le bout du bras, anneau lumineux à l'entrée,
  // bague intérieure qui tourne quand un droïde est branché
  const R_SOCKET = 0.1, RECESS = 0.07;
  const well = new THREE.Mesh(new THREE.CylinderGeometry(R_SOCKET, R_SOCKET, RECESS, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#15181e', metalness: 0.5, roughness: 0.5, side: THREE.BackSide }));
  well.rotation.x = Math.PI / 2;
  well.position.set(0, SOCKET_Y, SOCKET_Z - RECESS / 2 + 0.003);
  g.add(well);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R_SOCKET, 0.016, 10, 40), neon(c, 1.6));
  ring.position.set(0, SOCKET_Y, SOCKET_Z + 0.004);
  g.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(R_SOCKET, 32), new THREE.MeshBasicMaterial({ color: '#05070b' }));
  hole.position.set(0, SOCKET_Y, SOCKET_Z - RECESS + 0.003);
  g.add(hole);
  const collar = new THREE.Group();
  collar.position.set(0, SOCKET_Y, SOCKET_Z - RECESS + 0.008);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const notch = mesh(new THREE.BoxGeometry(0.018, 0.045, 0.008), neon(c, 1), Math.cos(a) * R_SOCKET * 0.62, Math.sin(a) * R_SOCKET * 0.62, 0);
    notch.rotation.z = a;
    collar.add(notch);
  }
  g.add(collar);
  // Point d'où partent les étincelles quand le poste travaille
  st.keys = new THREE.Object3D();
  st.keys.position.set(0, SOCKET_Y, SOCKET_Z);
  g.add(st.keys);

  // Projecteur en haut de la cloison, et l'écran en hologramme bleuté au-dessus
  const top = WALL_H + 0.06;
  g.add(mesh(roundedBox(0.5, 0.04, 0.16, 0.015), dark, 0, top + 0.02, WALL_Z + 0.03));
  const emitter = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.08), neon(c, 1.2));
  emitter.rotation.x = -Math.PI / 2;
  emitter.position.set(0, top + 0.042, WALL_Z + 0.03);
  g.add(emitter);
  const screenY = top + 0.12 + sh / 2;
  const beamH = screenY - sh / 2 - top;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(sw * 0.45, 0.22, beamH, 4, 1, true),
    neon('#5ab0ff', 0.6, { transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  beam.rotation.y = Math.PI / 4;
  beam.position.set(0, top + beamH / 2, WALL_Z + 0.03);
  g.add(beam);
  // Mélange additif : le fond noir de l'écran devient transparent, seul le contenu lumineux reste
  const holo = new THREE.MeshBasicMaterial({ map: screen.texture, color: new THREE.Color('#9fd0ff').multiplyScalar(1.3), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), holo);
  face.position.set(0, screenY, WALL_Z + 0.03);
  face.rotation.x = -0.06;
  g.add(face);
  for (const [w, h, x, y] of [[sw, 0.01, 0, sh / 2], [sw, 0.01, 0, -sh / 2], [0.01, sh, sw / 2, 0], [0.01, sh, -sw / 2, 0]]) {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.004), neon(c, 1.2)).translateX(x).translateY(screenY + y).translateZ(WALL_Z + 0.03));
  }

  st.animate = (t, busy) => {
    collar.rotation.z = busy ? -t * 6 : collar.rotation.z;
    ring.material.color.set(c).multiplyScalar(busy ? 1.6 + Math.sin(t * 12) * 0.6 : 1.2);
    holo.opacity = Math.sin(t * 29) > 0.95 ? 0.6 : 0.9;
  };
  return { labelY: screenY + sh / 2 + 0.35 };
}
