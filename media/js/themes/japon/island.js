// Le plateau du thème Japon devient une petite île : falaise de terre, plage de galets, lac tout autour,
// le mont Fuji enneigé au loin, derrière le tableau de planification, la lune et des lanternes qui montent dans la nuit.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mergeStatic, mesh } from '../../geometry.js';

const R = 8.4; // rayon de la plate-forme (world.js)
const LAKE_Y = -0.52; // niveau de l'eau : la ligne de flottaison du Yamato

/** Petit bruit déterministe, pour que l'île soit la même à chaque chargement. */
const wobble = (a, seeds) => seeds.reduce((s, [f, p, amp]) => s + Math.sin(a * f + p) * amp, 0);

/** Falaise de terre octogonale qui habille le bord du plateau jusque sous l'eau. */
function buildCliff() {
  const g = new THREE.Group();
  const cliff = new THREE.CylinderGeometry(R * 1.003, R * 1.06, 0.62, 8, 3, true);
  cliff.rotateY(Math.PI / 8);
  // Couleurs : bord d'herbe en haut, terre, puis roche humide près de l'eau
  const pos = cliff.attributes.position;
  const colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    c.set(y > 0.25 ? '#4f7a33' : y > -0.05 ? '#6b4e33' : '#4a3a2c');
    colors.push(c.r, c.g, c.b);
  }
  cliff.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.add(mesh(cliff, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 0, -0.3, 0));
  return g;
}

/** Plage de galets irrégulière qui entoure l'île, juste au-dessus de l'eau. */
function buildBeach() {
  const n = 160;
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  const seeds = [[3, 0.4, 0.18], [7, 1.3, 0.1], [13, 2.1, 0.06]];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = R * 1.1 + wobble(a, seeds) + 0.15;
    const [x, y] = [Math.cos(a) * r, Math.sin(a) * r];
    i ? shape.lineTo(x, y) : shape.moveTo(x, y);
    const rh = R * 0.95;
    i ? hole.lineTo(Math.cos(a) * rh, Math.sin(a) * rh) : hole.moveTo(Math.cos(a) * rh, Math.sin(a) * rh);
  }
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.25, bevelSegments: 3, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  const beach = mesh(geo, mat('#b9a98a', { roughness: 1 }), 0, LAKE_Y - 0.08, 0);
  beach.receiveShadow = true;
  return beach;
}

/** Rochers posés sur la plage, sauf du côté du quai où le Yamato est amarré. */
function buildRocks() {
  const g = new THREE.Group();
  const stone = mat('#7d7b78', { roughness: 0.95 });
  const moss = mat('#55753a', { roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + Math.sin(i * 7.3) * 0.08;
    // Quai du Yamato (x > 0, z entre -4 et 5) : on laisse la place
    if (Math.cos(a) > 0.82) continue;
    const r = R * 1.08 + Math.sin(i * 3.7) * 0.25;
    const s = 0.2 + ((Math.sin(i * 12.9) + 1) / 2) * 0.32;
    const rock = mesh(new THREE.DodecahedronGeometry(s, 0), i % 4 ? stone : moss, Math.cos(a) * r, LAKE_Y + s * 0.35, Math.sin(a) * r);
    rock.scale.set(1.3, 0.7, 1);
    rock.rotation.set(i, i * 2.1, 0);
    rock.castShadow = true;
    g.add(rock);
  }
  return mergeStatic(g);
}

/** Lac à perte de vue, assez transparent pour laisser voir le reflet du Fuji. */
function buildLake() {
  const g = new THREE.Group();
  const lake = mesh(new THREE.CircleGeometry(150, 96), new THREE.MeshStandardMaterial({ color: '#2c4b6b', roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.5, depthWrite: false }), 0, LAKE_Y, 0);
  // Dessiné après le reflet de la montagne, qui transparaît sous la surface
  lake.renderOrder = 1;
  lake.rotation.x = -Math.PI / 2;
  lake.receiveShadow = true;
  g.add(lake);
  return g;
}

/** Mont Fuji : profil concave, sommet tronqué, neige en coulées sur le haut des pentes. */
function buildFuji(dir, dist) {
  const H = 24, BASE = 24, TOP = 2.4;
  const profile = [];
  for (let i = 0; i <= 30; i++) {
    const k = i / 30;
    // Pentes concaves : larges à la base, raides vers le sommet
    profile.push(new THREE.Vector2(TOP + (BASE - TOP) * (1 - k) ** 1.7, k * H));
  }
  profile.push(new THREE.Vector2(TOP * 0.6, H - 0.4), new THREE.Vector2(0, H - 0.5));
  const geo = new THREE.LatheGeometry(profile, 160);
  const pos = geo.attributes.position;
  const colors = [];
  const rock = new THREE.Color('#3e4566'), snow = new THREE.Color('#f4f1f6'), col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    // Coulées de neige : la limite descend par endroits en longues langues
    const line = H * 0.6 - Math.max(0, Math.sin(a * 9) * 2.6 + Math.sin(a * 23 + 1) * 1.4 + Math.sin(a * 5 + 2) * 1.2);
    const k = THREE.MathUtils.smoothstep(y, line - 0.25, line + 0.25);
    col.copy(rock).lerp(snow, k);
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const fuji = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), dir.x * dist, LAKE_Y - 0.3, dir.z * dist);
  // Collines sombres de part et d'autre, plus proches, pour marquer la rive lointaine
  const hills = new THREE.Group();
  const hill = mat('#24304a', { roughness: 1 });
  for (const [side, d, w, h] of [[-0.55, 0.9, 20, 3.5], [0.5, 0.92, 24, 4.2], [-0.95, 1, 18, 2.8], [0.98, 1, 16, 2.4]]) {
    const a = Math.atan2(dir.x, dir.z) + side;
    const m = mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), hill, Math.sin(a) * dist * d, LAKE_Y - 0.2, Math.cos(a) * dist * d);
    m.scale.set(w, h, w * 0.45);
    m.rotation.y = a;
    hills.add(m);
  }
  // Reflet inversé dans le lac (vu depuis la caméra par défaut, qui regarde l'eau de haut)
  const mirror = (o) => {
    const m = o.clone();
    m.scale.y *= -1;
    m.position.y = 2 * LAKE_Y - o.position.y - 0.7;
    return m;
  };
  return [fuji, hills, mirror(fuji)];
}

/** Halo doux (dégradé radial) pour les lanternes et la lune. */
function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Pleine lune au-dessus du lac, un peu à droite du Fuji. */
function buildMoon(dir) {
  const g = new THREE.Group();
  const a = Math.atan2(dir.x, dir.z) + 0.45;
  g.position.set(Math.sin(a) * 85, 26, Math.cos(a) * 85);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,246,220,0.55)', 'rgba(170,190,255,0.12)'), fog: false, depthWrite: false, transparent: true }));
  halo.scale.setScalar(22);
  g.add(halo);
  g.lookAt(0, 0, 0);
  return g;
}

/** Lanternes de papier qui montent lentement dans le ciel nocturne, en se balançant. */
function buildSkyLanterns(dir, count = 20) {
  // La plupart montent derrière l'île (côté Fuji), pour rester dans le champ de la caméra sans gêner la vue
  const far = Math.atan2(dir.z, dir.x);
  const paper = new THREE.MeshStandardMaterial({ color: '#ffb35c', emissive: '#ff8a2a', emissiveIntensity: 2.2, roughness: 0.8, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const body = new THREE.CylinderGeometry(0.17, 0.12, 0.34, 12, 1, true);
  const cap = new THREE.CircleGeometry(0.17, 12);
  cap.rotateX(-Math.PI / 2);
  cap.translate(0, 0.17, 0);
  const haloMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,200,120,0.9)', 'rgba(255,120,40,0.25)'), depthWrite: false, transparent: true, blending: THREE.AdditiveBlending });
  return Array.from({ length: count }, (_, i) => {
    const g = new THREE.Group();
    const m = paper.clone();
    g.add(new THREE.Mesh(body, m), new THREE.Mesh(cap, m));
    const halo = new THREE.Sprite(haloMat.clone());
    halo.scale.setScalar(2.4);
    g.add(halo);
    g.scale.setScalar(1.6);
    // Réparties tout autour de l'île, à distance, chacune à son rythme
    g.userData = {
      a: i < 14 ? far + (i / 13 - 0.5) * 3.4 : (i / count) * Math.PI * 2 + Math.sin(i * 5.1) * 0.3,
      r: 9.5 + ((i * 7) % 5) * 2.2,
      phase: (i * 0.37) % 1,
      speed: 0.018 + (i % 4) * 0.004,
      mats: [m, halo.material],
    };
    return g;
  });
}

/** Ronds dans l'eau qui naissent au bord de l'île et s'élargissent. */
function buildRipples() {
  const material = new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0, depthWrite: false });
  const geo = new THREE.RingGeometry(0.96, 1, 48);
  geo.rotateX(-Math.PI / 2);
  return Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(geo, material.clone());
    m.renderOrder = 2;
    const a = (i / 6) * Math.PI * 2 + 0.7;
    m.userData = { a, r: R * 1.3 + (i % 3) * 0.8, phase: i / 6 };
    m.position.set(Math.cos(a) * m.userData.r, LAKE_Y + 0.015, Math.sin(a) * m.userData.r);
    return m;
  });
}

/** Construit l'île et son paysage nocturne (lune, lanternes célestes) ; renvoie l'animation. */
export function buildIsland(scene) {
  // Le Fuji se dresse derrière le tableau de planification, vu depuis la caméra par défaut
  const dir = new THREE.Vector3(-0.32, 0, -1).normalize();
  scene.add(buildCliff(), buildBeach(), buildRocks());
  const lake = buildLake();
  scene.add(lake, ...buildFuji(dir, 78));
  const ripples = buildRipples();
  scene.add(...ripples);
  scene.add(buildMoon(dir));
  const lanterns = buildSkyLanterns(dir);
  scene.add(...lanterns);
  return (t) => {
    // Lanternes : montent de la surface du lac jusqu'à ~11 m, dérivent un peu, s'allument puis s'éteignent
    for (const l of lanterns) {
      const u = l.userData;
      const k = (t * u.speed + u.phase) % 1;
      const a = u.a + k * 0.5;
      const r = u.r + k * 4;
      l.position.set(Math.cos(a) * r + Math.sin(t * 0.6 + u.phase * 9) * 0.3, 0.6 + k * 11, Math.sin(a) * r);
      l.rotation.z = Math.sin(t * 0.9 + u.phase * 7) * 0.08;
      const fade = Math.min(1, k * 8, (1 - k) * 4);
      const flicker = 0.9 + Math.sin(t * 7 + u.phase * 20) * 0.06;
      u.mats[0].opacity = 0.95 * fade;
      u.mats[0].emissiveIntensity = 2.2 * flicker;
      u.mats[1].opacity = fade * flicker;
    }
    for (const m of ripples) {
      const k = (t * 0.12 + m.userData.phase) % 1;
      m.scale.setScalar(0.3 + k * 2.2);
      m.material.opacity = Math.sin(k * Math.PI) * 0.18;
    }
  };
}
