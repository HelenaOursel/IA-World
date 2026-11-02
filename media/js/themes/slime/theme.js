// Thème Slime : marais lumineux, et slimes.
import { paintGoo, slimeDecor } from './decor.js';
import { buildSlime } from './slime.js';
import { actions } from './actions.js';
import { gift } from './gift.js';

export default {
  id: 'slime',
  skin: buildSlime,
  gift,
  actions,
  shell: 'slime@marais:~$',
  sky: { top: '#16052b', mid: '#5b1d70', bottom: '#ff8fb8' },
  stars: 700,
  fog: { color: '#341048', near: 40, far: 110 },
  hemi: { sky: '#ffb3e6', ground: '#2a3a1a', intensity: 1.0 },
  sun: { color: '#ffe0f4', intensity: 1.7 },
  floor: { paint: paintGoo, mark: 'rgba(181,255,77,0.22)', metalness: 0.1, roughness: 0.6 },
  platform: { side: '#3a2057', band: '#2c1544', rim: '#b5ff4d', rimIntensity: 1.6, tiers: ['#2f1a47', '#3a2057'], tierRims: ['#b5ff4d', '#ff6ec7'], thrusterColor: '#b5ff4d' },
  tint: { color: '#3d2257', amount: 0.5 },
  decor: slimeDecor,
};
