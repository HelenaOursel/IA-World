// Monde commun à tous les thèmes : assemble la plate-forme, les postes et le décor, et les anime.
// Les pièces sont dans world/ : layout (disposition), stations (postes), decor (plate-forme, ciel), screens (écrans).
import * as THREE from '../vendor/three.module.min.js';
import { cylinder, mesh, metal, neon, sphere, trimShadows } from './geometry.js';
import { LAYOUT, Station, Dock } from './world/layout.js';
import { randomCodeRow, drawCode, drawTerminal, drawDocs, drawRadar, drawNetwork, docRows, networkGraph } from './world/screens.js';
import { workstation, buildPlan, buildAssembly, buildTrash, buildDock, burnInFire } from './world/stations.js';
import { buildPlatform, buildRacks, buildConveyor, buildSky, applyTint } from './world/decor.js';

export { docRows, randomCodeRow } from './world/screens.js';
export { STATION_COLORS, STATION_NAMES } from './world/layout.js';

export function buildWorld(scene, theme = {}) {
  const stars = buildSky(scene, theme);
  const fog = theme.fog ?? { color: '#0b0d22', near: 40, far: 100 };
  scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const hemi = theme.hemi ?? { sky: '#8fa6ff', ground: '#1a1420', intensity: 0.7 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const sun = new THREE.DirectionalLight(theme.sun?.color ?? '#dfe8ff', theme.sun?.intensity ?? 1.8);
  sun.position.set(7, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const thrusters = buildPlatform(scene, theme);
  const racks = buildRacks(scene, theme.racks, theme.rack);
  const conveyor = buildConveyor(scene, theme);

  const stations = {};
  for (const [key, [x, z]] of Object.entries(LAYOUT)) stations[key] = new Station(key, x, z);

  const read = stations.read;
  read.doc = { file: 'README.md', rows: docRows(), cursor: 0 };
  workstation(read, (ctx, w, h) => drawDocs(ctx, w, h, read.doc), { desk: theme.desk }, theme);

  const search = stations.search;
  Object.assign(search, { query: '', angle: 0, blips: [] });
  workstation(search, (ctx, w, h) => drawRadar(ctx, w, h, search), { desk: theme.desk }, theme);

  const write = stations.write;
  write.code = { file: 'README.md', rows: Array.from({ length: 8 }, randomCodeRow), scroll: 0 };
  workstation(write, (ctx, w, h) => drawCode(ctx, w, h, write.code), { sw: 1.2, sh: 0.7, desk: theme.desk }, theme);

  const bash = stations.bash;
  bash.lines = [{ t: theme.shell ?? 'robot@usine:~$', c: '#39ff9f' }];
  workstation(bash, (ctx, w, h) => drawTerminal(ctx, w, h, bash.lines), { desk: theme.desk }, theme);

  const web = stations.web;
  web.net = networkGraph();
  workstation(web, (ctx, w, h) => drawNetwork(ctx, w, h, web.net), { desk: theme.desk }, theme);
  web.group.add(mesh(cylinder(0.025, 0.03, 0.8, 8), metal('#3a4150'), 0.65, 0.9, -0.2));
  const beacon = new THREE.Mesh(sphere(0.06), neon(web.color, 3));
  beacon.position.set(0.65, 1.32, -0.2);
  web.group.add(beacon);
  web.beacon = beacon;
  web.topLocal = new THREE.Vector3(0.65, 1.32, -0.2);

  buildPlan(stations.plan);
  buildAssembly(stations.agent, theme.gate);
  if (theme.trash === 'fire') burnInFire(stations.trash);
  else buildTrash(stations.trash);
  for (const st of Object.values(stations)) scene.add(st.group);
  stations.dock = new Dock();
  buildDock(stations.dock, scene, theme);
  applyTint(scene, theme.tint);
  // Après construction du décor du thème aussi : seules les ombres utiles restent
  trimShadows(scene);
  const decor = theme.decor?.(scene);

  const timers = { slow: 0, fast: 0, racks: 0 };

  function update(t, dt) {
    stars.rotation.y = t * 0.004;
    decor?.(t, dt);
    thrusters.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(t * 13 + i) * 0.08;
      f.material.opacity = 0.45 + Math.sin(t * 17 + i * 2) * 0.08;
    });
    conveyor(t, dt);

    const dock = stations.dock;
    dock.rings.forEach((r) => {
      const k = (t * 0.35 + r.userData.phase) % 1;
      r.position.y = 0.2 + k * 1.4;
      r.material.opacity = 1;
      r.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.15);
    });
    dock.light.intensity = 2.8 + Math.sin(t * 3) * 0.5;
    dock.animateTower?.(t);

    const bin = stations.trash;
    if (bin.lid) {
      bin.lidTimer = Math.max(0, bin.lidTimer - dt);
      const lidGoal = bin.lidTimer > 0 ? -1.25 : 0;
      bin.lid.rotation.x += (lidGoal - bin.lid.rotation.x) * Math.min(1, dt * (lidGoal ? 14 : 6));
    }

    const bay = stations.agent;
    bay.power = Math.max(0, bay.power - dt * 0.35);
    bay.curtain.uniforms.time.value = t;
    bay.curtain.uniforms.power.value = bay.power;
    bay.animateGate?.(bay.power, t);

    for (const st of Object.values(stations)) {
      st.animate?.(t, st.busy);
      if (!st.ring) continue;
      const target = st.busy ? 0.7 : 0.25;
      st.ring.material.opacity += (target - st.ring.material.opacity) * Math.min(1, dt * 4);
      if (st.light) st.light.intensity = (st.busy ? 3 : 1.6) + (st.busy ? Math.sin(t * 9) * 0.3 : 0);
    }

    stations.web.beacon.material.color.set(stations.web.color).multiplyScalar(Math.sin(t * 5) > 0 ? 3 : 0.6);

    // Écrans animés : rapides quand le poste est occupé, lents sinon.
    timers.fast += dt;
    timers.slow += dt;
    timers.racks += dt;
    if (timers.fast > 0.08) {
      const step = timers.fast;
      timers.fast = 0;
      if (search.busy) {
        search.angle += step * 3;
        if (Math.random() < 0.2) search.blips.push({ a: Math.random() * Math.PI * 2, d: 0.2 + Math.random() * 0.75, life: 1 });
        for (const b of search.blips) b.life -= step * 0.6;
        search.blips = search.blips.filter((b) => b.life > 0);
        search.screen.redraw();
      }
      if (web.busy) {
        web.net.t += step;
        web.screen.redraw();
      }
      if (bay.power > 0.01) bay.screen.redraw();
    }
    if (timers.slow > 0.5) {
      timers.slow = 0;
      bash.screen.redraw();
      if (!search.busy) {
        search.angle += 0.15;
        search.screen.redraw();
      }
      if (!web.busy) {
        web.net.t += 0.1;
        web.screen.redraw();
      }
    }
    for (const r of racks) r.animate?.(t);
    if (timers.racks > 0.3 && racks.length) {
      timers.racks = 0;
      racks[Math.floor(Math.random() * racks.length)].redraw();
    }
  }

  // Poissons cliquables (rivière zen du Japon) : main.js les fait sauter avec jumpFish.
  return { stations, update, kois: conveyor.kois ?? [], jumpFish: conveyor.jumpFish ?? (() => {}) };
}
