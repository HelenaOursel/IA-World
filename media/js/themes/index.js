// Liste des thèmes de l'univers. Chaque thème vit dans son dossier (themes/<id>/theme.js)
// et n'est chargé que s'il est choisi.
//
// Un thème peut fournir (tout est facultatif, sauf skin ou character) :
//   skin(ch)                 construit le personnage (voir themes/shared.js)
//   character                classe qui remplace Character (même interface), pour des personnages articulés à part
//   shell                    invite affichée dans le terminal
//   sky, stars, fog, hemi, sun, exposure, bloom    ambiance
//   floor                    sol : paint(ctx, size, k, px) pour le dessiner, ou couleurs des panneaux métalliques ;
//                            centerRing: false retire le cercle hachuré autour du centre
//   platform, tint           bord et dessous de la plate-forme, teinte de la structure métallique
//   tower                    { build(group) → animate(t), rings } remplace la tour centrale
//   dock(group, angles, r)   remplace tout le socle central ; renvoie { light, animateTower(t), sticks? }
//                            (sticks : bâtons à griller que les personnages au repos viennent prendre)
//   gate                     { build(group), curtain: { h, y }, labelY, base: 'stone' } remplace le cadre du portail
//   racks                    emplacements [x, z] des baies de serveurs à garder
//   trash: 'fire'            pas de corbeille : ce qui est supprimé est jeté dans le feu au centre
//   idleThrow: false         pas de paniers de papier pour s'amuser quand rien ne se passe
//   gift                     cadeau à glisser : 'chip' (défaut) ou 'bamboo'
//   sleepText                texte affiché quand le personnage se repose
//   conveyor(scene, place)   remplace le tapis roulant ; renvoie animate(t, dt) (avec .kois et .jumpFish s'il y a des poissons cliquables)
//   decor(scene)             décor propre au thème ; renvoie animate(t, dt)

export const THEME_LIST = [
  { id: 'usine', name: 'Usine · robots' },
  { id: 'banquise', name: 'Banquise · pingouins' },
  { id: 'espace', name: 'Espace · astronautes' },
  { id: 'slime', name: 'Slime · gelée' },
  { id: 'japon', name: 'Japon · pandas' },
];

export const DEFAULT_THEME = 'usine';

/** Charge le thème demandé (ou le thème par défaut s'il est inconnu). */
export async function loadTheme(id) {
  const known = THEME_LIST.some((t) => t.id === id) ? id : DEFAULT_THEME;
  return (await import(`./${known}/theme.js`)).default;
}
