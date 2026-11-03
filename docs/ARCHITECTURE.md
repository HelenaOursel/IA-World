# Architecture

Ce document explique le chemin d'une action de Claude jusqu'à l'animation à l'écran, et les choix qui
tiennent le tout fluide. Pour créer un thème, voir [THEMES.md](THEMES.md).

## Vue d'ensemble

```
 Claude Code                       Extension (Node, src/)                    Webview (navigateur, media/js/)
┌───────────────────┐   lit   ┌────────────────────────────┐ postMessage ┌──────────────────────────────┐
│ ~/.claude/projects│ ──────▶ │ watcher.ts   suit les      │ ──────────▶ │ main.js   files d'attente,   │
│  <projet>/        │         │              fichiers      │  snapshot   │           décisions          │
│   <session>.jsonl │         │ transcript.ts  ligne JSON  │  event      │   │                          │
│   <session>/      │         │              → WorldEvent  │  session    │   ├─▶ world.js   scène,      │
│    subagents/     │         │ extension.ts  panneau,     │             │   │              postes      │
│     agent-*.jsonl │         │              thème, CSP    │ ◀────────── │   ├─▶ character  personnages │
│     agent-*.meta  │         │                            │  ready      │   ├─▶ hud.js     interface   │
└───────────────────┘         └────────────────────────────┘  setTheme   │   └─▶ themes/<id>/           │
                                                              pickSession└──────────────────────────────┘
```

L'extension ne fait qu'**observer** : elle ne lance pas Claude, n'écrit dans aucun de ses fichiers
et ne l'appelle pas. Tout ce qu'elle sait vient des transcripts que Claude Code écrit déjà.

## 1. Lire les transcripts (`src/watcher.ts`)

Le `SessionWatcher` interroge le disque toutes les **600 ms**. Il cherche les nouvelles sessions un tour sur quatre
quand une session est en direct, un tour sur douze au repos. Chaque tour ne coûte presque rien : un `stat` par fichier
suivi, puis la lecture des seuls octets ajoutés depuis la dernière fois.

Toutes les lectures sont **asynchrones** (`fs.promises`) : l'extension host n'est jamais bloqué, même avec des centaines
de sessions. Les tours s'enchaînent l'un après l'autre ; si un tour n'est pas fini quand le suivant arrive (disque lent),
le suivant est sauté plutôt qu'empilé.

| Constante            | Valeur  | Rôle                                                                   |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| `TICK_MS`            | 600 ms  | fréquence de lecture des fichiers suivis                               |
| `DISCOVER_EVERY`     | 4 tours | fréquence de recherche de nouvelles sessions et de nouveaux agents     |
| `IDLE_DISCOVER_EVERY` | 12 tours | la même chose, quand aucune session n'est en direct                 |
| `BOOTSTRAP_BYTES`    | 1 Mo    | à l'ouverture, seule la fin du transcript est relue (titre, tâches, dernière activité) |
| `MAX_READ_BYTES`     | 4 Mo    | lecture maximale par tour, pour ne jamais bloquer sur un énorme transcript |
| `LIVE_WINDOW_MS`     | 90 s    | une session est « en direct » si elle a écrit depuis moins longtemps   |
| `ACTIVE_SESSION_MS`  | 15 min  | au-delà, une session n'est plus suivie                                 |
| `STALE_AGENT_MS`     | 10 min  | un agent muet depuis aussi longtemps est considéré comme terminé       |

Chaque fichier suivi garde sa position de lecture. Une ligne coupée en cours d'écriture reste en attente
jusqu'au tour suivant. Une ligne JSON invalide est ignorée sans interrompre la lecture.

Quelques règles de suivi :

- **Plusieurs sessions** actives en même temps donnent chacune leur personnage.
- **Un `/clear`** crée un nouveau fichier de session : il remplace l'ancien et garde le même personnage.
- **Un sous-agent** apparaît quand son fichier `agent-<id>.jsonl` est créé. Il disparaît quand son `.meta.json`
  le dit terminé, ou après `STALE_AGENT_MS` sans écrire.

## 2. Traduire en événements (`src/transcript.ts`, `src/events.ts`)

`parseEntry` transforme une ligne du transcript en zéro, un ou plusieurs `WorldEvent`. C'est le seul
endroit qui connaît le format des transcripts : si Claude Code le change, c'est ici qu'il faut adapter.

| Événement                       | Quand                                              |
| ------------------------------- | -------------------------------------------------- |
| `activity` (`kind`, `label`)    | appel d'outil, réflexion ou réponse                |
| `prompt`                        | message de l'utilisateur                           |
| `error`                         | résultat d'outil en erreur                         |
| `turnEnd` / `interrupt`         | fin du tour / interruption par l'utilisateur       |
| `todos`                         | nouvelle liste de tâches (`TodoWrite`)             |
| `spawn` / `despawn` / `agentResult` | cycle de vie d'un sous-agent                   |
| `sessionStart` / `sessionEnd` / `title` | cycle de vie d'une session                 |
| `status`                        | le monde passe en direct ou au repos               |

Le `kind` d'une activité choisit le poste : `read`, `search`, `write`, `bash`, `web`, `plan`, `agent`,
`trash`, ou `think` / `talk` / `ask` sur place. Par exemple, `Edit` qui retire beaucoup de code et `rm`
deviennent `trash` : le personnage va à la corbeille.

## 3. Le panneau (`src/extension.ts`)

`WorldPanel` crée la webview avec une **Content Security Policy** stricte : scripts autorisés seulement
avec un nonce tiré à chaque chargement, ressources limitées au dossier `media/`, aucun accès réseau.
`retainContextWhenHidden` garde le monde vivant quand l'onglet est caché.

**Messages de l'extension vers la webview**

| Message    | Contenu                                                               |
| ---------- | --------------------------------------------------------------------- |
| `snapshot` | état complet (sessions, agents, tâches, dernières activités), envoyé à `ready` |
| `session`  | nouvel état après un changement de session                            |
| `event`    | un `WorldEvent`                                                       |
| `demo`     | lancer la démo                                                        |

**Messages de la webview vers l'extension**

| Message       | Effet                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `ready`       | la page est chargée : l'extension envoie l'état, puis les messages en attente |
| `setTheme`    | changer de thème (valeur vérifiée dans la liste des thèmes connus)      |
| `pickSession` | ouvrir le choix de session                                              |

**Changer de thème** recharge entièrement la page avec un nouvel attribut `data-theme`. Le thème choisi
s'applique tout de suite, et le réglage `iaworld.theme` est enregistré ensuite. Les messages arrivés
pendant le rechargement sont gardés jusqu'au `ready` suivant.

## 4. Le monde (`media/js/`)

### `main.js` : le chef d'orchestre

- Il charge le thème (`themes/index.js` → `loadTheme`), construit la scène et crée les personnages.
- Il tient une **file d'attente par personnage**. Les événements arrivent souvent par paquets : la file
  les étale (environ 1,3 s par activité) et accélère quand le retard s'accumule. Elle garde au plus
  30 événements : panneau caché, seuls les plus récents sont rejoués au retour (jamais le départ d'un agent).
  Ce rythme et ce plafond sont dans `queue.js`.
- Pour chaque activité, il envoie le personnage au poste correspondant, met à jour l'écran du poste et affiche la bulle.
- Quand il n'y a rien à faire, il choisit une activité de repos : celles du thème, le tableau, les paniers de papier, la balade.
- La boucle `frame()` anime tout, à 60 images/s, et à 30 quand le panneau n'a pas le focus.

Il délègue le reste à des modules qui reçoivent explicitement ce dont ils ont besoin :

| Module               | Rôle                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `camera-rig.js`      | caméra en orbite : tourner, zoomer, suivre un personnage, rotation automatique |
| `input.js`           | souris : glisser, molette, clic pour suivre, caresse au clic droit, cadeau, koï |
| `board.js`           | gribouillis au tableau de planification, effacés par le vrai plan          |
| `station-screens.js` | écrans des postes pendant le travail : code, document, terminal, réseau, radar |
| `queue.js`           | rythme et plafond des files d'attente                                     |

### `world.js` : la scène commune

Il assemble la plate-forme, les postes (DOCS, RECHERCHE, CODE, TERMINAL, RÉSEAU), le tableau de
planification, la tour centrale ou la borne, le tapis roulant, la baie d'assemblage, la corbeille et les
baies de serveurs, et les anime. Chacune de ces pièces peut être remplacée par le thème. Les pièces sont dans `world/` :

| Module              | Contenu                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `world/layout.js`   | rayon de la plate-forme, emplacement, couleur et nom des postes ; `Station` et `Dock` (où se placent les personnages) |
| `world/stations.js` | bureau et écran, tableau, baie d'assemblage, corbeille, borne de recharge |
| `world/decor.js`    | plate-forme et sol, baies de serveurs, tapis roulant, ciel, teinte de la structure |
| `world/screens.js`  | dessins des écrans sur canvas (`CanvasScreen` : une texture redessinée à la demande) |

### `character.js` : les personnages

Un personnage se déplace vers un **poste** (position et orientation), puis joue une **action**. Une action
est une pose décrite par quelques angles (bras, inclinaison, rebond) et une expression du visage. Les thèmes
fournissent l'apparence (`skin`), et peuvent ajouter des poses, ou une classe entière quand le personnage
est articulé autrement, comme les pandas à quatre pattes.

### `hud.js` et `world.css` : l'interface

Cartes des unités actives, journal, bulles, menus Thème et Actions, bouton cadeau. Les textes venant
des transcripts sont toujours insérés comme texte, jamais comme HTML.

## 5. Tests

`npm test` compile puis lance les tests de `src/test/` avec `node:test`, sans dépendance supplémentaire :

| Fichier              | Vérifie                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `transcript.test.ts` | outil → poste et texte de la bulle, prompts, interruptions, erreurs, entrées mal formées, texte énorme |
| `watcher.test.ts`    | lignes coupées, caractères accentués coupés en deux, fichier vidé, suivi d'une session et arrivée d'un sous-agent |
| `queue.test.ts`      | plafond des files d'attente (sans perdre le départ d'un agent) et rythme d'affichage |
| `themes.test.ts`     | la liste des thèmes est la même dans `package.json`, `extension.ts` et `themes/index.js` |

`npm run lint` passe ESLint sur tout le code : il attrape notamment un nom utilisé sans être importé, ce qui
sécurise les déplacements de code entre modules. Le reste du monde 3D se vérifie à l'œil, avec **Lancer la démo**.

## 6. Performance

Le coût est presque entièrement graphique : le JavaScript pèse moins de 1 % du temps d'une image.
Les règles suivies :

| Règle                                     | Où                                                       |
| ----------------------------------------- | -------------------------------------------------------- |
| Géométries et matériaux partagés          | `geometry.js` : `mat`, `mesh`, `sphere`, `cylinder`, `roundedBox` gardent un cache |
| Boîtes arrondies au juste nombre de segments | `roundedBox` : 3 à 9 segments selon la taille de l'arrondi |
| Pas d'ombre inutile                       | `trimShadows` : ni pour les objets lumineux, ni pour les toutes petites pièces |
| Décors immobiles fusionnés                | `mergeStatic(groupe, aGarder)` : un maillage par matériau  |
| Résolution plafonnée                      | `setPixelRatio(min(devicePixelRatio, 1.5))`              |
| 30 images/s quand on code dans l'éditeur  | `frame()` saute une image sur deux sans le focus         |

Pour vérifier l'effet d'un changement, `renderer.info.render.calls` donne le nombre d'appels de dessin d'une image,
à mesurer avec `renderer.info.autoReset = false`, car le rendu passe par plusieurs passes de post-traitement.
Un thème bien construit reste autour de 1000 appels.
