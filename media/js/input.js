// Souris : glisser (clic gauche) pour tourner la caméra, molette pour zoomer, clic court sur un personnage
// pour le suivre, clic droit maintenu en frottant pour le caresser, et cadeau glissé depuis l'interface.
import * as THREE from '../vendor/three.module.min.js';
import { KIND_ICONS, pickLine } from './hud.js';

const PET_LINES = ['Hihi !', 'Ça chatouille !', 'Bzzz <3', 'Encore !', 'Ronron…', 'Trop doux !'];

/**
 * `follow(ch | null)` : appelé sur un clic court (personnage ou vide).
 * Renvoie { robotAt, giftHover, dropGift, dragging() } pour le reste de la page.
 */
export function createInput({ renderer, camera, rig, chars, world, effects, hud, theme, follow }) {
  const el = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  let drag = null;
  let hovered = null;
  let rub = 0;

  function pick(x, y, objects) {
    const r = el.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
    return raycaster.intersectObjects(objects, true);
  }

  /** Personnage sous un point de l'écran, ou null. */
  function robotAt(x, y) {
    const roots = [...chars.values()].filter((c) => !c.leaving).map((c) => c.root);
    for (const h of pick(x, y, roots)) {
      for (let o = h.object; o; o = o.parent) {
        if (o.userData.charId) return chars.get(o.userData.charId) ?? null;
      }
    }
    return null;
  }

  /** Carpe koï sous un point de l'écran (thème Japon), ou null. */
  function fishAt(x, y) {
    if (!world.kois.length) return null;
    const hit = pick(x, y, world.kois)[0];
    return hit ? world.kois.find((k) => k === hit.object.parent) ?? null : null;
  }

  function setHovered(ch) {
    if (hovered === ch) return;
    hovered = ch;
    rub = 0;
    el.classList.toggle('pet', !!ch);
  }

  function petRobot(ch) {
    ch.react('pet', 0.8);
    const now = performance.now();
    if (now - (ch.lastHeart ?? 0) > 200) {
      ch.lastHeart = now;
      effects.heart(ch.topPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.35, 0)));
    }
    if (now - (ch.lastPetTalk ?? 0) > 3500) {
      ch.lastPetTalk = now;
      hud.say(ch.id, pickLine(PET_LINES), 'speech', KIND_ICONS.love, 2.2, false);
    }
  }

  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0, pet: e.button === 2, robot: robotAt(e.clientX, e.clientY) };
    el.setPointerCapture(e.pointerId);
    if (drag.pet) setHovered(drag.robot);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.pet) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      rig.orbit(dx, dy);
      return;
    }
    const ch = robotAt(e.clientX, e.clientY);
    setHovered(ch);
    if (!ch) return;
    rub += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (rub > 45) {
      rub = 0;
      petRobot(ch);
    }
  });
  el.addEventListener('pointerup', (e) => {
    if (drag && !drag.pet && e.button === 0 && drag.moved < 5) {
      // Clic sur une carpe koï (thème Japon) : elle saute en faisant un looping.
      const fish = !drag.robot && fishAt(e.clientX, e.clientY);
      if (fish) world.jumpFish(fish);
      else follow(drag.robot);
    }
    drag = null;
    setHovered(null);
  });
  el.addEventListener('pointerleave', () => {
    if (!drag) setHovered(null);
  });
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      rig.zoom(e.deltaY);
    },
    { passive: false },
  );

  return {
    robotAt,
    dragging: () => !!drag,

    /** Le personnage sous le cadeau tend les bras pour l'attraper. */
    giftHover(x, y) {
      const ch = robotAt(x, y);
      if (ch && ch.reaction?.type !== 'love') ch.react('catch', 0.35);
    },

    /** Cadeau lâché en (x, y) : il vole jusqu'au personnage visé. Renvoie false s'il n'y a personne. */
    dropGift(x, y) {
      const ch = robotAt(x, y);
      if (!ch) return false;
      const target = () => ch.root.localToWorld(new THREE.Vector3(0, ch.bodyY, ch.size * 0.3));
      ch.react('catch', 1.3);
      const gift = theme.gift;
      effects.gift(gift, target().lerp(camera.position, 0.22), target, null, () => {
        ch.react('love', 2.4);
        effects.heart(ch.topPosition(new THREE.Vector3()), 6);
        hud.say(ch.id, pickLine(gift.lines), 'speech', KIND_ICONS.love, 3, false);
        hud.addLog(KIND_ICONS.love, 'Toi', '#7df9ff', `donne ${gift.article} à ${ch.name}`, ch.id);
      });
      return true;
    },
  };
}
