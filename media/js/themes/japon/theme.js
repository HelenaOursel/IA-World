// Thème Japon : île sur un lac face au mont Fuji, jardin d'herbe autour d'un feu de camp, cerisier, bambous, torii, rivière zen et pandas.
// Les pandas ont leurs propres articulations (quatre pattes, roulades, queue) : ils remplacent toute la classe Character.
import { actions } from './actions.js';
import { buildCampfire } from './campfire.js';
import { japonDecor, paintGrass } from './decor.js';
import { buildJapaneseDesk } from './desk.js';
import { gift } from './gift.js';
import { doodles } from './doodles.js';
import { PandaCharacter } from './panda.js';
import { buildZenRiver } from './river.js';
import { buildTorii } from './torii.js';

export default {
  id: 'japon',
  character: PandaCharacter,
  shell: 'panda@jardin:~$',
  // Nuit sur le lac : ciel bleu nuit étoilé, brume bleutée qui estompe le Fuji
  sky: { top: '#02040d', mid: '#16244a', bottom: '#0a1428' },
  stars: 1800,
  fog: { color: '#121f3d', near: 30, far: 120 },
  // Une île sur un lac, pas une plate-forme spatiale : ni gradins ni propulseurs
  platform: { side: '#4a3a2c', band: '#4f7a33', rim: '#4f7a33', rimIntensity: 0, underside: false },
  floor: { paint: paintGrass, mark: 'rgba(214,240,170,0.18)', centerRing: false, metalness: 0, roughness: 0.95 },
  dock: buildCampfire,
  conveyor: buildZenRiver,
  gate: { build: buildTorii, curtain: { h: 1.5, y: 0.86 }, labelY: 2.85, base: 'stone' },
  // Une seule baie de serveurs (entre Code et Terminal) : cerisier et bambous prennent les autres places.
  racks: [[6.7, -2.4]],
  desk: buildJapaneseDesk,
  doodles,
  // Pas de corbeille : on jette les fichiers au feu, et on ne s'amuse pas à faire des paniers.
  trash: 'fire',
  idleThrow: false,
  gift,
  actions,
  sleepText: 'zZz Au coin du feu',
  decor: japonDecor,
};
