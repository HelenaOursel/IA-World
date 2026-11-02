// Thème Usine (par défaut) : plate-forme d'usine futuriste et robots cubiques.
import { buildRobot } from './robot.js';
import { actions } from './actions.js';
import { gift } from './gift.js';

export default {
  id: 'usine',
  skin: buildRobot,
  gift,
  actions,
  shell: 'robot@usine:~$',
};
