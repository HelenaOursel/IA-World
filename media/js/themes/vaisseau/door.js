// Porte de vaisseau à la place du portail d'assemblage (thème Vaisseau) : deux battants qui
// glissent du milieu vers les côtés, dans les murs, quand un agent arrive ou repart.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, neon, roundedBox } from '../../geometry.js';

const HALF = 0.4; // demi-largeur d'un battant (ouverture totale : 1,6 m)
const H = 1.95;

/** Construit la porte dans `g` ; renvoie animate(power) : power > 0 ouvre la porte. */
export function buildShipDoor(g) {
  const hull = mat('#4a505c', { metalness: 0.6, roughness: 0.4 });
  const dark = mat('#23272f', { metalness: 0.5, roughness: 0.45 });

  // Battants : rainures horizontales et liseré lumineux le long de la jointure du milieu
  const doors = [-1, 1].map((side) => {
    const d = new THREE.Group();
    d.add(mesh(roundedBox(HALF * 2, H, 0.06, 0.02), hull));
    for (let k = 0; k < 4; k++) d.add(mesh(new THREE.BoxGeometry(HALF * 1.7, 0.025, 0.07), dark, 0, -0.7 + k * 0.45, 0));
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.025, H * 0.9, 0.075), neon('#5ab0ff', 1.3));
    seam.position.x = -side * (HALF - 0.03);
    d.add(seam);
    d.position.set(side * HALF, H / 2 + 0.1, 0);
    g.add(d);
    return { d, side };
  });

  // Murs de part et d'autre, où les battants rentrent en s'ouvrant (plus épais, devant eux)
  for (const side of [-1, 1]) g.add(mesh(roundedBox(HALF * 2 + 0.1, H + 0.3, 0.24, 0.03), hull, side * (HALF * 3 + 0.05), (H + 0.3) / 2, 0));
  // Encadrement : linteau aux coins coupés, montants sombres
  g.add(mesh(roundedBox(HALF * 6.6, 0.28, 0.3, 0.04), hull, 0, H + 0.24, 0));
  for (const side of [-1, 1]) {
    const corner = mesh(new THREE.BoxGeometry(0.34, 0.08, 0.32), dark, side * (HALF + 0.08), H + 0.02, 0);
    corner.rotation.z = side * 0.75;
    g.add(corner);
    g.add(mesh(new THREE.BoxGeometry(0.08, H, 0.3), dark, side * (HALF * 2 + 0.04), H / 2 + 0.1, 0));
  }
  // Voyant au-dessus de la porte : rouge fermée, vert ouverte
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.03), neon('#ff3b3b', 1.8));
  lamp.position.set(0, H + 0.24, 0.16);
  g.add(lamp);

  return (power) => {
    // Grande ouverte tant que la baie est active, puis se referme doucement
    const open = Math.min(1, power * 3);
    const eased = open * open * (3 - 2 * open);
    for (const { d, side } of doors) d.position.x = side * (HALF + eased * HALF * 2);
    lamp.material.color.set(open > 0.05 ? '#3ddc97' : '#ff3b3b').multiplyScalar(1.8);
  };
}
