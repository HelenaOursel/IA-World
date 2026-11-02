// Thème Japon : jardin d'herbe autour d'un feu de camp, cerisier, bambous, torii, rivière zen et pandas.
// Les pandas ont leurs propres articulations (quatre pattes, roulades, queue) : ils remplacent toute la classe Character.
import { actions } from './actions.js';
import { buildCampfire } from './campfire.js';
import { japonDecor, paintGrass } from './decor.js';
import { gift } from './gift.js';
import { PandaCharacter } from './panda.js';
import { buildZenRiver } from './river.js';
import { buildTorii } from './torii.js';

export default {
  id: 'japon',
  character: PandaCharacter,
  shell: 'panda@jardin:~$',
  floor: { paint: paintGrass, mark: 'rgba(214,240,170,0.18)', centerRing: false, metalness: 0, roughness: 0.95 },
  dock: buildCampfire,
  conveyor: buildZenRiver,
  gate: { build: buildTorii, curtain: { h: 1.5, y: 0.86 }, labelY: 2.85, base: 'stone' },
  // Une seule baie de serveurs (entre Code et Terminal) : cerisier et bambous prennent les autres places.
  racks: [[6.7, -2.4]],
  // Pas de corbeille : on jette les fichiers au feu, et on ne s'amuse pas à faire des paniers.
  trash: 'fire',
  idleThrow: false,
  gift,
  actions,
  sleepText: 'zZz Au coin du feu',
  decor: japonDecor,
};
