// Train d'astéroïdes, à la place du tapis roulant (thème Espace).
import * as THREE from '../../../vendor/three.module.min.js';
import { cylinder, mesh, metal, neon } from '../../geometry.js';

/** Train d'astéroïdes : des rochers qui flottent en tournoyant entre deux faisceaux de guidage. */
export function buildAsteroidTrain(scene, place) {
  const g = new THREE.Group();
  g.position.set(place.x, 0, place.z);
  const L = 5.6;
  for (const x of [-2.6, -0.9, 0.9, 2.6]) {
    g.add(mesh(cylinder(0.08, 0.13, 0.34, 14), metal('#3a4150'), x, 0.17, 0));
    const ring = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), neon('#4cc9f0', 1.4), x, 0.35, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  for (const z of [-0.3, 0.3]) g.add(mesh(new THREE.BoxGeometry(L, 0.018, 0.018), neon('#4cc9f0', 1.2), 0, 0.36, z));
  // Champ de traction très léger entre les faisceaux
  const field = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.6), neon('#4cc9f0', 0.6, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.36;
  g.add(field);

  // Couleur de roche conservée : la teinte du thème ne doit pas la blanchir
  const rock = new THREE.MeshStandardMaterial({ color: '#7b7f8a', roughness: 0.95, flatShading: true });
  rock.userData.keepColor = true;
  const ores = ['#b388ff', '#4cc9f0', '#3ddc97'];
  const rocks = [];
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.17 + Math.random() * 0.06, 1);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const s = 0.8 + Math.random() * 0.35;
      p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s);
    }
    geo.computeVertexNormals();
    a.add(mesh(geo, rock));
    // Un astéroïde sur deux porte un minerai lumineux
    if (i % 2 === 0) a.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), neon(ores[i % ores.length], 1.6)).translateY(0.15).translateX(0.05));
    a.userData = { x: -L / 2 + (i / 6) * L, spin: 0.6 + Math.random(), phase: Math.random() * 6 };
    g.add(a);
    rocks.push(a);
  }
  scene.add(g);

  return (t, dt) => {
    for (const a of rocks) {
      const u = a.userData;
      u.x += dt * 0.45;
      if (u.x > L / 2) u.x -= L;
      const edge = Math.min(1, (L / 2 - Math.abs(u.x)) / 0.35);
      a.position.set(u.x, 0.62 + Math.sin(t * 1.6 + u.phase) * 0.05, 0);
      a.rotation.set(t * u.spin, t * u.spin * 0.7, 0);
      a.scale.setScalar(Math.max(0.01, edge));
    }
  };
}
