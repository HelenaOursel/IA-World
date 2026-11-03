// Bureau des postes du thème Japon : plateau en bois aux extrémités relevées, piètement en laque noire,
// tablier de laque rouge et panneau shōji à l'arrière. L'écran et le clavier restent ceux de world.js.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, neon, roundedBox } from '../../geometry.js';

const wood = mat('#8a5632', { roughness: 0.6 });
const lacquer = mat('#17110f', { roughness: 0.35, metalness: 0.1 });
const red = mat('#9e1f1a', { roughness: 0.4, metalness: 0.05 });
const paper = mat('#f1e7cf', { roughness: 0.9, emissive: '#6b5a3a', emissiveIntensity: 0.35, side: THREE.DoubleSide });

/** Construit le bureau dans le groupe du poste ; `color` : couleur du poste, en fin liseré sur le tablier. */
export function buildJapaneseDesk(g, color) {
  // Plateau (dessus à 0,53 m, là où world.js pose le clavier et le pied de l'écran)
  g.add(mesh(roundedBox(1.6, 0.06, 0.72, 0.02), wood, 0, 0.5, 0));
  // Extrémités relevées, comme une table d'autel
  for (const s of [-1, 1]) {
    const end = mesh(roundedBox(0.16, 0.05, 0.74, 0.015), wood, s * 0.86, 0.525, 0);
    end.rotation.z = s * 0.3;
    g.add(end);
  }
  // Tablier en laque rouge sous le bord avant, avec un fin liseré à la couleur du poste
  g.add(mesh(roundedBox(1.4, 0.07, 0.03, 0.01), red, 0, 0.435, 0.33));
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.012, 0.012), neon(color, 1.4), 0, 0.4, 0.348));
  // Piètement : deux cadres en laque noire (montants, traverses) posés sur des patins
  for (const s of [-1, 1]) {
    const x = s * 0.68;
    for (const z of [-0.28, 0.28]) g.add(mesh(roundedBox(0.06, 0.47, 0.06, 0.012), lacquer, x, 0.235, z));
    g.add(mesh(roundedBox(0.06, 0.05, 0.62, 0.012), lacquer, x, 0.43, 0));
    g.add(mesh(roundedBox(0.05, 0.04, 0.56, 0.01), lacquer, x, 0.16, 0));
    // Patin au sol, un peu plus long que le plateau n'est profond
    g.add(mesh(roundedBox(0.1, 0.05, 0.8, 0.015), lacquer, x, 0.025, 0));
  }
  // Panneau shōji à l'arrière : papier de riz et croisillons de bois
  const back = new THREE.Group();
  back.position.set(0, 0.27, -0.3);
  back.add(mesh(new THREE.PlaneGeometry(1.26, 0.28), paper));
  const bar = (w, h, x, y) => back.add(mesh(new THREE.BoxGeometry(w, h, 0.025), lacquer, x, y, 0));
  bar(1.3, 0.025, 0, 0.15);
  bar(1.3, 0.025, 0, -0.15);
  bar(1.3, 0.015, 0, 0);
  for (let i = 0; i <= 6; i++) bar(i % 6 ? 0.015 : 0.025, 0.3, -0.64 + (i * 1.28) / 6, 0);
  g.add(back);
}
