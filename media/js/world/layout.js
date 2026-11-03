// Disposition commune à tous les thèmes : rayon de la plate-forme, emplacement et couleur des postes,
// et les postes eux-mêmes (où se placent les personnages qui y travaillent).
import * as THREE from '../../vendor/three.module.min.js';

export const R = 8.4; // rayon de la plate-forme octogonale
export const MARK = '#8fa0bb'; // couleur neutre des marquages au sol
export const APOTHEM = R * Math.cos(Math.PI / 8);

// Emplacement des postes (x, z). L'avant de la plate-forme (z > 0) fait face à la caméra.
export const LAYOUT = {
  plan: [0, -5.7],
  read: [-4.4, -3.9],
  search: [-5.8, 0.5],
  web: [-4.1, 4.2],
  agent: [4.1, 4.2],
  bash: [5.8, 0.5],
  write: [4.4, -3.9],
  trash: [-2.4, -4.95],
};

export const STATION_COLORS = {
  plan: '#ffc53d',
  read: '#4cc9f0',
  search: '#3ddc97',
  web: '#f15bb5',
  agent: '#9b5de5',
  bash: '#39ff9f',
  write: '#4d8dff',
  trash: '#7bd88f',
  dock: '#ff7a1a',
};

export const STATION_NAMES = {
  plan: 'PLANIFICATION',
  read: 'DOCS',
  search: 'RECHERCHE',
  web: 'RÉSEAU',
  agent: 'ASSEMBLAGE',
  bash: 'TERMINAL',
  write: 'CODE',
  trash: 'CORBEILLE',
  dock: 'RECHARGE',
};

export class Station {
  constructor(key, x, z, spotDist = 0.78) {
    this.key = key;
    this.color = STATION_COLORS[key];
    this.pos = new THREE.Vector3(x, 0, z);
    this.dir = new THREE.Vector3(-x, 0, -z).normalize();
    this.side = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
    this.spotDist = spotDist;
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.group.rotation.y = Math.atan2(this.dir.x, this.dir.z);
    this.occupants = [];
    this.busy = false;
  }

  claim(id) {
    if (!this.occupants.includes(id)) {
      const free = this.occupants.indexOf(null);
      if (free >= 0) this.occupants[free] = id;
      else this.occupants.push(id);
    }
    return this.spotFor(id);
  }

  release(id) {
    const i = this.occupants.indexOf(id);
    if (i >= 0) this.occupants[i] = null;
  }

  spotFor(id) {
    const i = Math.max(0, this.occupants.indexOf(id));
    // Le premier robot est au clavier, les suivants l'entourent.
    const lateral = [0, -1.0, 1.0, -1.9, 1.9, -2.7, 2.7][i % 7];
    const back = (i > 0 ? 0.45 : 0) + Math.floor(i / 7) * 0.9;
    const p = this.pos.clone().addScaledVector(this.dir, this.spotDist + back).addScaledVector(this.side, lateral);
    const toStation = this.pos.clone().sub(p);
    return { pos: p, face: Math.atan2(toStation.x, toStation.z) };
  }
}

export const DOCK_ANGLES = [Math.PI, Math.PI - 0.8, Math.PI + 0.8, Math.PI - 1.6, Math.PI + 1.6, 0.8, -0.8, 0];
export const DOCK_R = 2.05;

export class Dock extends Station {
  constructor() {
    super('dock', 0, 0, 0);
    this.group.rotation.y = 0;
  }

  spotFor(id) {
    const i = Math.max(0, this.occupants.indexOf(id));
    // Le premier emplacement est derrière la borne, face à la caméra.
    const a = DOCK_ANGLES[i % DOCK_ANGLES.length];
    const r = DOCK_R + Math.floor(i / DOCK_ANGLES.length) * 0.9;
    const p = new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
    return { pos: p, face: Math.atan2(-p.x, -p.z) };
  }
}
