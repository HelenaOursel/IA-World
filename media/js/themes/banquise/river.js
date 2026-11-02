// Rivière de la Banquise : naît d'un trou dans la glace et finit en chute dans la mer.
import * as THREE from '../../../vendor/three.module.min.js';
import { mat, mesh, sphere } from '../../geometry.js';

/** Texture d'eau rayée dans le sens du courant (v = sens de l'écoulement). */
function streakTexture(base, streak, count, foam) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = streak.replace('A', (0.15 + Math.random() * 0.4).toFixed(2));
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 1.5 + Math.random() * 2.5, 14 + Math.random() * 46);
  }
  if (foam) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 26; i++) ctx.fillRect(Math.random() * 128, Math.random() * 256, 2, 5 + Math.random() * 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Ruban plat qui suit une courbe : u en travers (0 → 1), v le long du courant (en mètres / largeur). */
function ribbonGeometry(curve, width, steps, y) {
  const pos = [], uv = [], idx = [];
  const len = curve.getLength();
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const p = curve.getPointAt(s);
    const tg = curve.getTangentAt(s);
    const side = new THREE.Vector3(tg.z, 0, -tg.x).normalize().multiplyScalar(width / 2);
    pos.push(p.x + side.x, y, p.z + side.z, p.x - side.x, y, p.z - side.z);
    uv.push(0, (s * len) / width, 1, (s * len) / width);
    if (i < steps) {
      const a = i * 2;
      // Ordre des sommets pour que la face visible regarde vers le haut
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Rivière qui coule : elle naît d'un trou dans la glace, serpente à l'avant de la banquise
 * et se jette en cascade dans la mer. Des poissons la remontent et des glaçons dérivent avec le courant.
 */
export function buildRiver(scene, place) {
  const g = new THREE.Group();
  scene.add(g);
  const W = 0.78;
  const { edgeZ } = place;
  const curve = new THREE.CatmullRomCurve3([
    // Part d'un trou dans la glace, loin du poste RÉSEAU, et finit en chute dans la mer.
    new THREE.Vector3(-1.9, 0, 5.05),
    new THREE.Vector3(-1.1, 0, 5.95),
    new THREE.Vector3(0.1, 0, 5.6),
    new THREE.Vector3(0.95, 0, 6.3),
    new THREE.Vector3(1.2, 0, 7.1),
    new THREE.Vector3(1.3, 0, edgeZ),
  ]);
  const len = curve.getLength();

  // Deux couches d'eau qui défilent à des vitesses différentes : le courant se voit
  const deep = streakTexture('#246fb0', 'rgba(140,205,255,A)', 70, false);
  const foam = streakTexture('rgba(0,0,0,0)', 'rgba(230,248,255,A)', 40, true);
  const water = new THREE.Mesh(ribbonGeometry(curve, W, 140, 0.025), new THREE.MeshStandardMaterial({ map: deep, roughness: 0.1, metalness: 0.1 }));
  water.receiveShadow = true;
  g.add(water);
  const surface = new THREE.Mesh(ribbonGeometry(curve, W * 0.92, 140, 0.03), new THREE.MeshBasicMaterial({ map: foam, transparent: true, opacity: 0.55, depthWrite: false }));
  g.add(surface);

  // Berges de neige le long du tracé
  const snow = mat('#f4f9fd', { roughness: 0.9 });
  const lump = sphere(1, 14, 10);
  for (let d = 0.1; d < len - 0.15; d += 0.22) {
    const s = d / len;
    const p = curve.getPointAt(s);
    const tg = curve.getTangentAt(s);
    const side = new THREE.Vector3(tg.z, 0, -tg.x).normalize();
    for (const k of [-1, 1]) {
      const b = mesh(lump, snow, p.x + side.x * k * (W / 2 + 0.07), 0.03, p.z + side.z * k * (W / 2 + 0.07));
      const r = 0.12 + Math.random() * 0.06;
      b.scale.set(r * 1.2, r * 0.55, r);
      g.add(b);
    }
  }

  // Source : un trou dans la glace où l'eau bouillonne
  const start = curve.getPointAt(0);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshBasicMaterial({ color: '#174a70' }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(start.x, 0.028, start.z);
  g.add(hole);
  const lip = mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 32), snow, start.x, 0.035, start.z);
  lip.rotation.x = Math.PI / 2;
  g.add(lip);

  // Cascade qui tombe du bord de la banquise jusqu'à la mer
  const end = curve.getPointAt(1);
  const fallTex = streakTexture('#2a7cc0', 'rgba(220,245,255,A)', 80, true);
  fallTex.repeat.set(1, 1.5);
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.5), new THREE.MeshStandardMaterial({ map: fallTex, roughness: 0.1, transparent: true, opacity: 0.95 }));
  fall.position.set(end.x, -0.2, edgeZ + 0.04);
  g.add(fall);
  const splash = [];
  for (let i = 0; i < 7; i++) {
    const b = mesh(sphere(0.08 + Math.random() * 0.06, 12, 8), mat('#f4fbff', { roughness: 0.6 }), end.x + (Math.random() - 0.5) * W, -0.42, edgeZ + 0.25 + Math.random() * 0.3);
    b.userData.phase = Math.random() * 6;
    g.add(b);
    splash.push(b);
  }

  // Ronds dans l'eau (sauts de poissons, source qui bouillonne, pied de la cascade)
  const ripples = [];
  const rippleGeo = new THREE.TorusGeometry(0.12, 0.012, 6, 28);
  const ripple = (x, y, z, size = 0.12) => {
    const r = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.8 }));
    r.rotation.x = Math.PI / 2;
    r.position.set(x, y, z);
    g.add(r);
    ripples.push({ r, t: 0, base: size / 0.12 });
  };

  // Poissons qui remontent le courant en suivant les méandres
  const colors = ['#ff8a3d', '#ffd54f', '#9fd8ff', '#ff6f91', '#7be0b0'];
  const fishEye = new THREE.MeshStandardMaterial({ color: '#10151f', roughness: 0.3 });
  fishEye.userData.keepColor = true;
  const fish = colors.map((col, i) => {
    const f = new THREE.Group();
    const body = mesh(sphere(0.09, 18, 12), mat(col, { roughness: 0.35 }));
    body.scale.set(1.7, 0.75, 0.55);
    f.add(body);
    const tail = mesh(new THREE.ConeGeometry(0.07, 0.12, 4), mat(col, { roughness: 0.4 }), -0.18, 0, 0);
    tail.rotation.z = Math.PI / 2;
    f.add(tail);
    for (const z of [-1, 1]) f.add(mesh(sphere(0.018, 8, 6), fishEye, 0.1, 0.025, z * 0.045));
    f.userData = { s: 0.1 + (i / colors.length) * 0.8, lane: (Math.random() - 0.5) * 0.4, speed: 0.25 + Math.random() * 0.25, phase: Math.random() * 6, jump: -1 };
    g.add(f);
    return f;
  });

  // Glaçons qui dérivent avec le courant puis basculent dans la cascade
  const chunks = [0, 1, 2, 3].map((i) => {
    const m = mesh(new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.05, 0), mat('#e8f6ff', { roughness: 0.25 }));
    m.scale.y = 0.45;
    m.userData = { s: i / 4, lane: (Math.random() - 0.5) * 0.35, fall: -1 };
    g.add(m);
    return m;
  });

  const tmp = new THREE.Vector3();
  const side = new THREE.Vector3();
  const along = (s, lane, out) => {
    curve.getPointAt(s, out);
    const tg = curve.getTangentAt(s);
    side.set(tg.z, 0, -tg.x).normalize();
    return out.addScaledVector(side, lane);
  };
  let bubble = 0;

  return (t, dt) => {
    // Le courant : la couche profonde et l'écume descendent la rivière
    deep.offset.y -= dt * 0.55;
    foam.offset.y -= dt * 0.9;
    fallTex.offset.y += dt * 1.6;

    for (const f of fish) {
      const u = f.userData;
      u.s -= (u.speed * dt) / len;
      if (u.s < 0.02) u.s += 0.92;
      const edge = Math.min(1, (u.s - 0.02) / 0.05, (0.94 - u.s) / 0.05);
      f.scale.setScalar(Math.max(0.01, edge));
      along(u.s, u.lane + Math.sin(t * 2 + u.phase) * 0.06, tmp);
      const tg = curve.getTangentAt(u.s);
      let y = 0.005, pitch = 0;
      if (u.jump < 0 && edge >= 1 && Math.random() < dt * 0.12) u.jump = 0;
      if (u.jump >= 0) {
        u.jump += dt / 0.7;
        y = Math.sin(u.jump * Math.PI) * 0.45;
        pitch = (0.5 - u.jump) * 1.6;
        if (u.jump >= 1) {
          u.jump = -1;
          ripple(tmp.x, 0.035, tmp.z);
        }
      }
      f.position.set(tmp.x, y, tmp.z);
      // Le poisson regarde vers l'amont (contre le courant)
      f.rotation.set(0, Math.atan2(tg.z, -tg.x) + Math.sin(t * 6 + u.phase) * 0.25, pitch);
    }

    for (const m of chunks) {
      const u = m.userData;
      if (u.fall < 0) {
        u.s += (0.5 * dt) / len;
        along(Math.min(u.s, 1), u.lane, tmp);
        m.position.set(tmp.x, 0.05 + Math.sin(t * 3 + u.lane * 20) * 0.01, tmp.z);
        m.rotation.y += dt * 0.6;
        if (u.s >= 1) u.fall = 0;
      } else {
        // Bascule par-dessus le bord et tombe dans la mer
        u.fall += dt;
        m.position.z += dt * 0.5;
        m.position.y = 0.05 - u.fall * u.fall * 4;
        m.rotation.x += dt * 4;
        if (m.position.y < -0.4) {
          ripple(m.position.x, -0.4, m.position.z, 0.15);
          u.s = 0;
          u.fall = -1;
          m.rotation.x = 0;
        }
      }
    }

    // La source bouillonne, l'écume danse au pied de la cascade
    bubble += dt;
    if (bubble > 0.7) {
      bubble = 0;
      ripple(start.x + (Math.random() - 0.5) * 0.4, 0.035, start.z + (Math.random() - 0.5) * 0.4, 0.08);
    }
    for (const b of splash) b.position.y = -0.4 + Math.abs(Math.sin(t * 4 + b.userData.phase)) * 0.06;

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.t += dt;
      rp.r.scale.setScalar(rp.base * (1 + rp.t * 3));
      rp.r.material.opacity = Math.max(0, 0.8 - rp.t);
      if (rp.t > 0.8) {
        g.remove(rp.r);
        rp.r.material.dispose();
        ripples.splice(i, 1);
      }
    }
  };
}
