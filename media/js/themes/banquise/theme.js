// Thème Banquise : banquise de nuit sous une aurore boréale, et pingouins.
import { banquiseDecor, paintSnow } from './decor.js';
import { buildPenguin } from './penguin.js';
import { buildRiver } from './river.js';
import { buildIceTower } from './tower.js';
import { actions } from './actions.js';
import { gift } from './gift.js';

export default {
  id: 'banquise',
  skin: buildPenguin,
  gift,
  actions,
  shell: 'pingouin@banquise:~$',
  sky: { top: '#030814', mid: '#0d2340', bottom: '#14304f' },
  stars: 900,
  fog: { color: '#0b1d33', near: 45, far: 130 },
  hemi: { sky: '#9fc3ff', ground: '#2a4766', intensity: 0.5 },
  sun: { color: '#c9dcff', intensity: 0.8 },
  floor: { paint: paintSnow, mark: 'rgba(70,130,180,0.3)', metalness: 0, roughness: 0.9 },
  platform: { side: '#a9cfe6', band: '#8fbcd9', rim: '#ffffff', rimIntensity: 0.6, underside: false },
  tint: { color: '#b7d3e6', amount: 0.6 },
  // Seuil élevé : la neige ne doit pas briller, seulement les néons et l'aurore
  bloom: { strength: 0.45, threshold: 0.92 },
  exposure: 0.72,
  // Anneaux de givre plus larges, autour de la tour de glace
  tower: { build: buildIceTower, rings: { color: '#d8f4ff', radius: 0.62, intensity: 0.9 } },
  conveyor: buildRiver,
  decor: banquiseDecor,
};
