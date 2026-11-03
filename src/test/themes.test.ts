// La liste des thèmes est écrite à trois endroits (réglage, extension, monde) : ils doivent concorder.
import * as assert from 'assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it } from 'node:test';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('liste des thèmes', () => {
  const setting = JSON.parse(read('package.json')).contributes.configuration.properties['iaworld.theme'];
  const extension = JSON.parse(read('src/extension.ts').match(/const THEMES = (\[[^\]]*\])/)![1].replace(/'/g, '"'));
  const world = [...read('media/js/themes/index.js').matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1]);

  it('package.json, extension.ts et themes/index.js listent les mêmes thèmes, dans le même ordre', () => {
    assert.deepEqual(setting.enum, world);
    assert.deepEqual(extension, world);
  });

  it('chaque thème a sa description et son dossier', () => {
    assert.equal(setting.enumDescriptions.length, setting.enum.length);
    for (const id of world) assert.ok(fs.existsSync(path.join(root, 'media/js/themes', id, 'theme.js')), id);
  });

  it('le thème par défaut existe', () => {
    assert.ok(world.includes(setting.default));
  });
});
