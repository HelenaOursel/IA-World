// Traduction des lignes de transcript en événements du monde.
import * as assert from 'assert/strict';
import { describe, it } from 'node:test';
import { cleanText, describeTool, parseEntry } from '../transcript';

const assistant = (content: unknown[], stop_reason?: string) => ({ type: 'assistant', message: { content, stop_reason } });
const user = (content: unknown, extra = {}) => ({ type: 'user', message: { content }, ...extra });

describe('cleanText', () => {
  it('retire les balises et leur contenu, le markdown et les espaces en trop', () => {
    assert.equal(cleanText('<system-reminder>caché</system-reminder>  **Bonjour**   `toi`', 100), 'Bonjour toi');
  });

  it('garde le contenu des balises quand on le demande', () => {
    assert.equal(cleanText('<b>gras</b>', 100, false), 'gras');
  });

  it('remplace les blocs de code et garde le texte des liens', () => {
    assert.equal(cleanText('voir [la doc](https://x.y) puis ```js\nconst a = 1;\n``` fin', 100), 'voir la doc puis [code] fin');
  });

  it('coupe au maximum demandé avec des points de suspension', () => {
    const t = cleanText('a'.repeat(50), 10);
    assert.equal(t.length, 10);
    assert.ok(t.endsWith('…'));
  });

  it('reste rapide sur un énorme texte plein de balises non refermées', () => {
    const t0 = Date.now();
    cleanText('<div>x '.repeat(50_000), 150);
    assert.ok(Date.now() - t0 < 500, `trop lent : ${Date.now() - t0} ms`);
  });
});

describe('describeTool', () => {
  const cases: [string, unknown, string, RegExp][] = [
    ['Read', { file_path: 'C:\\projet\\src\\app.ts' }, 'read', /app\.ts/],
    ['Grep', { pattern: 'TODO' }, 'search', /TODO/],
    ['Glob', { pattern: '**/*.js' }, 'search', /\*\*\/\*\.js/],
    ['Write', { file_path: '/a/b/c.md' }, 'write', /c\.md/],
    ['Edit', { file_path: 'x.ts', old_string: 'a', new_string: 'abc' }, 'write', /x\.ts/],
    ['Bash', { command: 'npm test\nsecond line' }, 'bash', /^\$ npm test$/],
    ['WebFetch', { url: 'https://example.com/page' }, 'web', /example\.com/],
    ['WebFetch', { url: 'pas une url' }, 'web', /une page/],
    ['TodoWrite', { todos: [{}, {}] }, 'plan', /2 tâches/],
    ['Agent', { description: 'explorer le code' }, 'agent', /explorer le code/],
    ['AskUserQuestion', {}, 'ask', /question/],
    ['OutilInconnu', {}, 'other', /OutilInconnu/],
  ];
  for (const [name, input, kind, label] of cases) {
    it(`${name} → ${kind}`, () => {
      const d = describeTool(name, input);
      assert.equal(d.kind, kind);
      assert.match(d.label, label);
    });
  }

  it('une commande de suppression va à la corbeille, avec sa cible', () => {
    for (const command of ['rm -rf build/out.log', 'Remove-Item -Recurse .\\dist\\out.log', 'git rm src/out.log']) {
      const d = describeTool('Bash', { command });
      assert.equal(d.kind, 'trash', command);
      assert.match(d.label, /out\.log/, command);
    }
  });

  it('les motifs et les commandes gardent leurs caractères spéciaux', () => {
    assert.equal(describeTool('Grep', { pattern: 'foo|bar_*' }).label, 'Je cherche « foo|bar_* »');
    assert.equal(describeTool('Bash', { command: 'ls *.ts | grep `x`' }).label, '$ ls *.ts | grep `x`');
  });

  it('un mot qui contient « rm » n’est pas une suppression', () => {
    assert.equal(describeTool('Bash', { command: 'npm run format' }).kind, 'bash');
  });

  it('une modification qui retire beaucoup de code va à la corbeille', () => {
    assert.equal(describeTool('Edit', { file_path: 'x.ts', old_string: 'x'.repeat(200), new_string: '' }).kind, 'trash');
  });

  it('les outils MCP sont classés selon leur nom', () => {
    assert.deepEqual(describeTool('mcp__github__create_issue', {}), { kind: 'write', label: 'github › create issue' });
    assert.equal(describeTool('mcp__drive__delete_file', {}).kind, 'trash');
    assert.equal(describeTool('mcp__drive__search_files', {}).kind, 'search');
    assert.equal(describeTool('mcp__drive__get_file', {}).kind, 'read');
  });
});

describe('parseEntry', () => {
  it('traduit réflexion, texte et appel d’outil, puis la fin du tour', () => {
    const evs = parseEntry(
      assistant(
        [
          { type: 'thinking', thinking: '…' },
          { type: 'text', text: 'Je regarde.' },
          { type: 'tool_use', name: 'Read', input: { file_path: 'a.ts' } },
        ],
        'end_turn',
      ),
      'main',
    );
    assert.deepEqual(
      evs.map((e) => (e.type === 'activity' ? e.kind : e.type)),
      ['think', 'talk', 'read', 'turnEnd'],
    );
    const read = evs[2];
    assert.ok(read.type === 'activity' && read.tool === 'Read' && read.agentId === 'main');
  });

  it('TodoWrite donne aussi la liste des tâches, avec la forme active de la tâche en cours', () => {
    const evs = parseEntry(
      assistant([{ type: 'tool_use', name: 'TodoWrite', input: { todos: [{ content: 'Tester', activeForm: 'Je teste', status: 'in_progress' }, { content: 'Livrer', status: 'pending' }] } }]),
      'main',
    );
    const todos = evs.find((e) => e.type === 'todos');
    assert.ok(todos?.type === 'todos');
    assert.deepEqual(todos.todos, [
      { content: 'Je teste', status: 'in_progress' },
      { content: 'Livrer', status: 'pending' },
    ]);
  });

  it('un message de l’utilisateur devient un prompt, sans les balises ajoutées par l’outil', () => {
    assert.deepEqual(parseEntry(user('<ide_selection>code</ide_selection>Ajoute un test'), 'main'), [{ type: 'prompt', agentId: 'main', text: 'Ajoute un test' }]);
  });

  it('les prompts d’un sous-agent (sa mission) ne sont pas affichés', () => {
    assert.deepEqual(parseEntry(user('Mission secrète'), 'agent-1', false), []);
  });

  it('une interruption est reconnue', () => {
    assert.deepEqual(parseEntry(user([{ type: 'text', text: '[Request interrupted by user]' }]), 'main'), [{ type: 'interrupt', agentId: 'main' }]);
  });

  it('un résultat d’outil en erreur devient une erreur', () => {
    const evs = parseEntry(user([{ type: 'tool_result', is_error: true, content: [{ type: 'text', text: 'Fichier introuvable' }] }]), 'main');
    assert.deepEqual(evs, [{ type: 'error', agentId: 'main', text: 'Fichier introuvable' }]);
  });

  it('le résultat d’un agent terminé est signalé, pas celui d’un agent lancé en arrière-plan', () => {
    assert.deepEqual(parseEntry(user([], { toolUseResult: { agentId: 'abc', status: 'completed' } }), 'main'), [{ type: 'agentResult', id: 'abc' }]);
    assert.deepEqual(parseEntry(user([], { toolUseResult: { agentId: 'abc', status: 'async_launched' } }), 'main'), []);
  });

  it('ignore les messages techniques et les entrées inconnues ou mal formées', () => {
    assert.deepEqual(parseEntry(user('résumé', { isMeta: true }), 'main'), []);
    assert.deepEqual(parseEntry(user('résumé', { isCompactSummary: true }), 'main'), []);
    for (const entry of [null, undefined, 42, {}, { type: 'summary' }, { type: 'assistant', message: { content: 'pas un tableau' } }]) {
      assert.deepEqual(parseEntry(entry, 'main'), []);
    }
  });
});
