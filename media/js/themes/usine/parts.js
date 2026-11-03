// Pièces de machines qui défilent sur le tapis roulant de l'usine (à la place des caisses).
// Chaque pièce repose sur la bande : userData.y donne la hauteur de son centre.
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mat, mesh, neon, roundedBox, sphere } from '../../geometry.js';

const BELT = 0.51; // hauteur du dessus de la bande
const steel = () => mat('#b4bccb', { metalness: 0.75, roughness: 0.3 });
const darkSteel = () => mat('#5c6576', { metalness: 0.7, roughness: 0.35 });
const brass = () => mat('#c9a24a', { metalness: 0.8, roughness: 0.3 });
const ACCENTS = ['#4cc9f0', '#ff7a1a', '#9b5de5', '#3ddc97', '#ffc53d', '#f15bb5'];

/** Engrenage posé à plat, avec un moyeu lumineux. */
function gear(i) {
  const g = new THREE.Group();
  const h = 0.07;
  g.add(mesh(cylinder(0.15, 0.15, h, 28), steel()));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const tooth = mesh(roundedBox(0.06, h, 0.05, 0.01, 2), steel(), Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
    tooth.rotation.y = -a;
    g.add(tooth);
  }
  g.add(mesh(cylinder(0.05, 0.05, h + 0.01, 16), darkSteel()));
  const hub = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 24), neon(ACCENTS[i % ACCENTS.length], 1.3));
  hub.rotation.x = Math.PI / 2;
  hub.position.y = h / 2 + 0.006;
  g.add(hub);
  g.userData.y = BELT + h / 2;
  return g;
}

/** Écrou hexagonal en laiton. */
function nut(i) {
  const g = new THREE.Group();
  const h = 0.09;
  g.add(mesh(cylinder(0.13, 0.13, h, 6), brass()));
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), mat('#1a1d24'));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = h / 2 + 0.002;
  g.add(hole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 20), neon(ACCENTS[i % ACCENTS.length], 1.2));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = h / 2 + 0.004;
  g.add(ring);
  g.userData.y = BELT + h / 2;
  return g;
}

/** Boulon couché : tête hexagonale et tige filetée. */
function bolt(i) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.z = Math.PI / 2;
  g.add(body);
  body.add(mesh(cylinder(0.08, 0.08, 0.07, 6), steel(), 0, 0.17, 0));
  body.add(mesh(cylinder(0.04, 0.04, 0.3, 14), steel()));
  for (let k = 0; k < 5; k++) body.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), darkSteel(), 0, -0.12 + k * 0.05, 0).rotateX(Math.PI / 2));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.015, 6), neon(ACCENTS[i % ACCENTS.length], 1.2));
  band.position.y = 0.17;
  body.add(band);
  g.userData.y = BELT + 0.08;
  return g;
}

/** Ressort hélicoïdal debout. */
function spring(i) {
  const g = new THREE.Group();
  const turns = 5, height = 0.26, radius = 0.075;
  const points = [];
  for (let k = 0; k <= turns * 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, (k / (turns * 24)) * height - height / 2, Math.sin(a) * radius));
  }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), turns * 24, 0.014, 6), steel()));
  for (const y of [-height / 2, height / 2]) {
    const cap = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 6, 24), neon(ACCENTS[i % ACCENTS.length], 1.1));
    cap.rotation.x = Math.PI / 2;
    cap.position.y = y;
    g.add(cap);
  }
  g.userData.y = BELT + height / 2 + 0.014;
  return g;
}

/** Piston couché : cylindre, tige et œil de fixation. */
function piston(i) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.z = Math.PI / 2;
  g.add(body);
  body.add(mesh(cylinder(0.07, 0.07, 0.24, 20), darkSteel(), 0, -0.05, 0));
  body.add(mesh(cylinder(0.025, 0.025, 0.18, 12), steel(), 0, 0.15, 0));
  const eye = mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 16), steel(), 0, 0.26, 0);
  body.add(eye);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.02, 20), neon(ACCENTS[i % ACCENTS.length], 1.2));
  band.position.y = 0.04;
  body.add(band);
  g.userData.y = BELT + 0.07;
  return g;
}

/** Segment de bras de robot : deux tronçons reliés par une articulation. */
function robotArm(i) {
  const g = new THREE.Group();
  g.add(mesh(roundedBox(0.2, 0.08, 0.09, 0.03), mat('#ff7a1a', { metalness: 0.3, roughness: 0.4 }), -0.1, 0, 0));
  g.add(mesh(sphere(0.06, 16, 12), darkSteel()));
  const fore = mesh(roundedBox(0.18, 0.07, 0.08, 0.03), mat('#ff7a1a', { metalness: 0.3, roughness: 0.4 }), 0.09, 0, 0.03);
  fore.rotation.y = -0.35;
  g.add(fore);
  // Petite pince au bout
  for (const z of [-0.025, 0.025]) g.add(mesh(roundedBox(0.06, 0.02, 0.015, 0.006, 2), darkSteel(), 0.2, 0, 0.065 + z));
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.012, 0.012), neon(ACCENTS[i % ACCENTS.length], 1.2), -0.1, 0.046, 0));
  g.userData.y = BELT + 0.045;
  return g;
}

// Agrandies pour être bien visibles sur la bande. Le tapis règle lui-même l'échelle de l'objet
// (apparition et disparition aux bouts) : la pièce est donc agrandie dans un groupe intermédiaire.
const SCALE = 1.35;
const sized = (make) => (i) => {
  const part = make(i);
  part.scale.setScalar(SCALE);
  const g = new THREE.Group();
  g.add(part);
  g.userData.y = BELT + (part.userData.y - BELT) * SCALE;
  return g;
};

/** Pièces transportées par le tapis de l'usine, dans l'ordre du défilé. */
export const conveyorItems = [gear, bolt, spring, nut, piston, robotArm].map(sized);
