// Caméra en orbite autour de la plate-forme : on tourne, on zoome, et elle peut suivre un personnage.
// Les mouvements visent un but (`goal`) que la caméra rejoint en douceur à chaque image.
import * as THREE from '../vendor/three.module.min.js';

const HOME = { theta: 0.42, phi: 0.98, radius: 22 };
const clamp = THREE.MathUtils.clamp;

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.state = { ...HOME, target: new THREE.Vector3(0, 0.6, 0) };
    this.goal = { ...HOME };
    this.autoRotate = false;
    this.tmp = new THREE.Vector3();
  }

  /** Retour à la vue d'ensemble. */
  reset() {
    Object.assign(this.goal, HOME);
  }

  /** Glisser de (dx, dy) pixels : tourne autour du centre, sans passer sous le sol ni au zénith. */
  orbit(dx, dy) {
    this.goal.theta -= dx * 0.006;
    this.goal.phi = clamp(this.goal.phi - dy * 0.005, 0.35, 1.38);
  }

  /** Molette : rapproche ou éloigne. */
  zoom(deltaY) {
    this.goal.radius = clamp(this.goal.radius * Math.exp(deltaY * 0.001), 5, 45);
  }

  /** Se rapproche assez pour bien voir un personnage suivi. */
  closeIn(max = 11) {
    this.goal.radius = Math.min(this.goal.radius, max);
  }

  /** `followed` : personnage à suivre, ou null ; `dragging` : l'utilisateur tient la caméra (pas de rotation auto). */
  update(dt, followed, dragging) {
    const { state, goal } = this;
    if (this.autoRotate && !dragging) goal.theta += dt * 0.06;
    const k = 1 - Math.exp(-dt * 6);
    state.theta += (goal.theta - state.theta) * k;
    state.phi += (goal.phi - state.phi) * k;
    state.radius += (goal.radius - state.radius) * k;
    const aim = followed ? this.tmp.copy(followed.root.position).setY(0.7) : this.tmp.set(0, 0.6, 0);
    state.target.lerp(aim, 1 - Math.exp(-dt * 4));
    this.camera.position.set(
      state.target.x + state.radius * Math.sin(state.phi) * Math.sin(state.theta),
      state.target.y + state.radius * Math.cos(state.phi),
      state.target.z + state.radius * Math.sin(state.phi) * Math.cos(state.theta),
    );
    this.camera.lookAt(state.target);
  }
}
