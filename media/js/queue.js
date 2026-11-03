// Rythme des files d'attente des personnages. Les événements arrivent souvent par paquets :
// on les étale un peu pour que l'animation reste lisible, et on accélère quand le retard s'accumule.

// Plafond d'une file : panneau caché, les événements s'accumulent sans être joués ; au retour,
// seuls les plus récents sont rejoués plutôt qu'un long arriéré périmé.
export const QUEUE_MAX = 30;

/** Ajoute `ev` à la file ; au-delà de `max`, les plus anciens sont écartés, sauf le départ d'un agent (jamais perdu). */
export function pushCapped(items, ev, max = QUEUE_MAX) {
  items.push(ev);
  while (items.length > max) {
    const i = items.findIndex((e) => e.type !== 'despawn');
    if (i < 0) break;
    items.splice(i, 1);
  }
}

/** Temps minimal (s) pendant lequel un événement reste affiché, selon ce qu'il reste à jouer derrière lui. */
export function minDuration(ev, backlog) {
  if (backlog > 6) return 0.25;
  if (backlog > 3) return 0.6;
  if (ev.type === 'prompt') return 3.6;
  if (ev.type === 'activity') return ev.kind === 'think' ? 0.8 : ev.kind === 'talk' ? 2 : 1.3;
  return 0.8;
}
