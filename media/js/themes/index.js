// Liste des thèmes de l'univers. Chaque thème vit dans son dossier (themes/<id>/theme.js)
// et n'est chargé que s'il est choisi.
//
// Un thème peut fournir (tout est facultatif, sauf skin) :
//   skin(ch)                 construit le personnage (voir themes/shared.js)
//   shell                    invite affichée dans le terminal
//   sky, stars, fog, hemi, sun, exposure, bloom    ambiance
//   floor                    sol : paint(ctx, size) pour le dessiner, ou couleurs des panneaux métalliques
//   platform, tint           bord et dessous de la plate-forme, teinte de la structure métallique
//   tower                    { build(group) → animate(t), rings } remplace la tour centrale
//   conveyor(scene, place)   remplace le tapis roulant ; renvoie animate(t, dt)
//   decor(scene)             décor propre au thème ; renvoie animate(t, dt)
//   gift                     cadeau à glisser sur un personnage : { name, article, svg, build(), colors, lines }
//   actions                  { poses, idle } :
//     poses[nom] = { pose(p, t, ch), face(f, t, ch) }  poses ajoutées au personnage (ch.setAction(nom),
//                                                     ou ch.moveAction = nom pour se déplacer ainsi)
//     idle = [{ label, weight, start(ch, tools, s), update(ch, dt, temps, tools, s) → true quand fini, stop() }]
//                                                     activités quand le personnage n'a rien à faire ;
//                                                     tools : say, walk, randomSpot, giftTo, effects, scene, stations

export const THEME_LIST = [
  { id: 'usine', name: 'Usine · robots' },
  { id: 'banquise', name: 'Banquise · pingouins' },
  { id: 'espace', name: 'Espace · astronautes' },
  { id: 'slime', name: 'Slime · gelée' },
];

export const DEFAULT_THEME = 'usine';

/** Charge le thème demandé (ou le thème par défaut s'il est inconnu). */
export async function loadTheme(id) {
  const known = THEME_LIST.some((t) => t.id === id) ? id : DEFAULT_THEME;
  return (await import(`./${known}/theme.js`)).default;
}
