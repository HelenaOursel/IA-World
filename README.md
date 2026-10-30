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
| Réflexion, réponse, question            | sur place       | expressions de la visière, bulles     |

Les sous-agents sont assemblés dans la baie avec leur propre couleur (selon leur type) et y retournent
pour être démontés quand leur mission est terminée. Les robots inactifs se rechargent à la borne centrale.
Le prompt de l'utilisateur arrive sous forme de paquet de données, et une erreur d'outil fait fumer le robot.

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

## Développement

```sh
npm install
npm run compile   # copie three.js dans media/vendor puis compile src/ vers out/
npm run package   # produit ia-world-<version>.vsix
```

Appuyer sur F5 dans VS Code lance une fenêtre de développement avec l'extension chargée.

- `src/` : extension (lecture des transcripts, panneau webview).
- `media/js/` : monde 3D (three.js) ; `world.js` pour le décor, `character.js` pour les personnages,
  `main.js` pour la traduction des événements en animations.
