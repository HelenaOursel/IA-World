# IA World

Une extension VS Code qui affiche Claude Code et ses sous-agents sous forme de petits robots
industriels cubiques, au travail dans une usine futuriste flottante. Chaque robot roule jusqu'au poste
qui correspond à ce qu'il fait, tape sur son clavier, et ses actions s'affichent dans des bulles.

| Activité de Claude                      | Poste           | Ce qui s'affiche                      |
| --------------------------------------- | --------------- | ------------------------------------- |
| Lire un fichier (`Read`, compétences)   | DOCS            | le document défile, ligne surlignée   |
| Chercher (`Grep`, `Glob`, `ToolSearch`) | RECHERCHE       | radar avec la requête                 |
| Écrire ou modifier (`Write`, `Edit`)    | CODE            | le code s'écrit, nom du fichier       |
| Commande (`Bash`, `PowerShell`)         | TERMINAL        | la commande et son résultat           |
| Web et MCP (`WebFetch`, `mcp__*`)       | RÉSEAU          | graphe réseau, site consulté          |
| Plan (`TodoWrite`, mode plan)           | PLANIFICATION   | grand écran avec la liste des tâches  |
| Lancer un agent (`Agent`, `Task`)       | ASSEMBLAGE      | un nouveau robot est assemblé         |
| Supprimer (`rm`, `Remove-Item`, gros retrait de code) | CORBEILLE | le robot y jette un fichier, du code ou une config |
| Réflexion, réponse, question            | sur place       | expressions de la visière, bulles     |

Les sous-agents sont assemblés dans la baie avec leur propre couleur (selon leur type) et y retournent
pour être démontés quand leur mission est terminée. Les robots inactifs se rechargent à la borne centrale.
Le prompt de l'utilisateur arrive comme un signal capté par l'antenne du robot, et une erreur d'outil fait fumer le robot.
Rien n'est réellement supprimé par le monde 3D : la corbeille illustre seulement ce que fait Claude, et les robots
inactifs s'y amusent à lancer des boules de papier.

## Thèmes

Le menu **Thème**, en bas à droite du monde, change l'apparence de l'univers et des personnages.
La disposition des postes reste la même, pour que ce que font les personnages reste lisible.

| Thème    | Personnages  | Univers                                                       |
| -------- | ------------ | ------------------------------------------------------------- |
| Usine    | robots       | plate-forme d'usine futuriste flottant dans l'espace (défaut) |
| Banquise | pingouins    | banquise enneigée sur la mer, igloos, sapins, neige qui tombe |
| Espace   | astronautes  | station spatiale, planète à anneau, astéroïdes, panneaux solaires |
| Slime    | slimes       | marais lumineux, champignons, flaques de gelée et bulles      |
| Vaisseau | droïdes      | pont de vaisseau en hyperespace, table holographique, holocrons à la place des serveurs |
| Japon    | pandas       | jardin d'herbe, feu de camp, cerisier, bambous, torii, rivière zen à koï, cuirassé Yamato à quai |

## Utilisation

- Cliquer sur **IA World** dans la barre d'état, ou lancer la commande **IA World: Ouvrir le monde**.
- **IA World: Lancer la démo** joue un scénario fictif (utile sans session Claude active).
- **IA World: Choisir la session Claude à suivre** fixe une session précise.
- Dans le monde : glisser pour tourner, molette pour zoomer, cliquer sur un personnage
  ou sa carte pour le suivre.

## Fonctionnement

L'extension ne modifie rien dans la configuration de Claude Code. Elle lit en continu les transcripts
que Claude Code écrit déjà :

- `~/.claude/projects/<projet>/<session>.jsonl` pour la session principale ;
- `~/.claude/projects/<projet>/<session>/subagents/agent-<id>.jsonl` (et `.meta.json`) pour les sous-agents.

Par défaut, elle suit la session la plus récente du workspace ouvert.

## Réglages

| Réglage                     | Défaut  | Rôle                                                          |
| --------------------------- | ------- | ------------------------------------------------------------- |
| `iaworld.claudeDir`         | (vide)  | Dossier Claude ; vide = `$CLAUDE_CONFIG_DIR` ou `~/.claude`   |
| `iaworld.followAllProjects` | `false` | Suivre la session la plus récente de n'importe quel projet    |
| `iaworld.autoOpen`          | `false` | Ouvrir le monde automatiquement quand Claude se met au travail |
| `iaworld.theme`             | `usine` | Thème de l'univers : `usine`, `banquise`, `espace`, `slime`, `japon` ou `vaisseau` |

## Développement

```sh
npm install
npm run compile   # copie three.js dans media/vendor puis compile src/ vers out/
npm run package   # produit ia-world-<version>.vsix
```

Appuyer sur F5 dans VS Code lance une fenêtre de développement avec l'extension chargée.

- `src/` : extension (lecture des transcripts, panneau webview).
- `media/js/` : monde 3D (three.js) ; `world.js` pour l'usine commune (postes, plate-forme),
  `character.js` pour les animations des personnages, `main.js` pour la traduction des événements en animations.
- `media/js/themes/` : un dossier par thème (`usine`, `banquise`, `espace`, `slime`, `japon`, `vaisseau`). Chaque dossier contient
  `theme.js` (ambiance et pièces utilisées), le personnage, et ce que le thème remplace (tour, tapis, décor, sol).
  `themes/index.js` liste les thèmes et décrit ce qu'un thème peut fournir ; seul le thème choisi est chargé.
