// Thème Usine (par défaut) : plate-forme d'usine futuriste et robots cubiques.
import { buildRobot } from './robot.js';
import { actions } from './actions.js';
import { gift } from './gift.js';
import { conveyorItems } from './parts.js';

export default {
  id: 'usine',
  skin: buildRobot,
  gift,
  // Pièces de machines sur le tapis roulant, à la place des caisses
  conveyorItems,
  actions,
  shell: 'robot@usine:~$',
};
