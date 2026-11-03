// Thème Vaisseau : le pont d'un vaisseau qui file en hyperespace, une table holographique,
// des holocrons à la place des serveurs, et de petits droïdes astromécaniciens au travail.
import { actions } from './actions.js';
import { vaisseauDecor } from './decor.js';
import { buildDroid } from './droid.js';
import { buildMouseDroid } from './mouse.js';
import { gift } from './gift.js';
import { buildHolocron } from './holocron.js';
import { buildHoloTable } from './holotable.js';
import { buildConsoleTable } from './console.js';
import { buildShipDoor } from './door.js';
import { buildDataPort } from './port.js';
import { paintShipFloor } from './interior.js';

export default {
  id: 'vaisseau',
  skin: buildDroid,
  // Les agents sont de petits droïdes-souris qui filent au ras du sol
  agentSkin: buildMouseDroid,
  shell: 'droide@vaisseau:~$',
  // Espace profond, lumière froide et bleutée des hologrammes
  sky: { top: '#02030a', mid: '#0a1630', bottom: '#000000' },
  stars: 1500,
  fog: { color: '#050b18', near: 45, far: 140 },
  hemi: { sky: '#9fc8ff', ground: '#1a2030', intensity: 0.85 },
  sun: { color: '#cfe4ff', intensity: 1.6 },
  // Plaques sombres gravées de pistes de circuits
  floor: { paint: paintShipFloor, mark: 'rgba(90,170,255,0.3)', metalness: 0.5, roughness: 0.45 },
  platform: { side: '#3a404c', band: '#2a2f38', rim: '#5ab0ff', rimIntensity: 1.4, tiers: ['#343a46', '#2a2f38'], tierRims: ['#5ab0ff', '#ff5a4a'], thrusterColor: '#5ab0ff' },
  tint: { color: '#4a505c', amount: 0.4 },
  // Halo discret : seuls les néons et les hologrammes brillent
  bloom: { strength: 0.28, threshold: 0.92 },
  // Table holographique au centre, avec des anneaux bleus qui montent autour
  tower: { build: buildHoloTable, rings: { color: '#5ab0ff', radius: 0.7, intensity: 1 } },
  // Holocrons à la place des baies de serveurs
  rack: buildHolocron,
  // Colonnes de service à prise ronde à la place des bureaux, écrans en hologramme
  workstation: buildDataPort,
  // Porte de vaisseau coulissante à la place du portail d'assemblage
  gate: { build: buildShipDoor, curtain: { h: 1.9, y: 1.05 }, labelY: 2.75 },
  // Longue console de pilotage à la place du tapis roulant
  conveyor: buildConsoleTable,
  gift,
  actions,
  sleepText: 'zZz En veille',
  decor: vaisseauDecor,
};
