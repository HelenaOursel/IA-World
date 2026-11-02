// Thème Espace : station spatiale en orbite, et astronautes.
import { buildAstronaut } from './astronaut.js';
import { buildAsteroidTrain } from './asteroids.js';
import { espaceDecor } from './decor.js';
import { buildSatelliteTower } from './tower.js';
import { actions } from './actions.js';
import { gift } from './gift.js';

export default {
  id: 'espace',
  skin: buildAstronaut,
  gift,
  actions,
  shell: 'astro@station:~$',
  sky: { top: '#020008', mid: '#150a33', bottom: '#000000' },
  stars: 2600,
  fog: { color: '#05030f', near: 60, far: 160 },
  hemi: { sky: '#c9d6ff', ground: '#2a2340', intensity: 0.9 },
  sun: { color: '#ffffff', intensity: 2.2 },
  floor: { bg: '#5e6674', panel: [150, 158, 172], jitter: 6, bolt: '#7c8595', mark: 'rgba(60,140,255,0.35)', metalness: 0.5, roughness: 0.45 },
  platform: { side: '#c5ccd6', band: '#9aa3b1', rim: '#4cc9f0', rimIntensity: 1.4, tiers: ['#b8c0cc', '#a7b0bd'], tierRims: ['#4cc9f0', '#ff7a1a'] },
  tint: { color: '#cfd6e0', amount: 0.7 },
  // Halo réduit : les combinaisons blanches ne doivent pas éblouir
  bloom: { strength: 0.3, threshold: 0.93 },
  tower: { build: buildSatelliteTower, rings: { color: '#4cc9f0' } },
  conveyor: buildAsteroidTrain,
  decor: espaceDecor,
};
