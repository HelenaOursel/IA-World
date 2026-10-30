// Copie three.js et les modules complémentaires utilisés dans media/vendor,
// pour que la webview les charge en local (pas de CDN). Les imports 'three'
// des modules complémentaires sont réécrits vers le fichier copié.
const fs = require('fs');
const path = require('path');

const threeDir = path.join(__dirname, '..', 'node_modules', 'three');
const dstDir = path.join(__dirname, '..', 'media', 'vendor');
const addonsSrc = path.join(threeDir, 'examples', 'jsm');
const addonsDst = path.join(dstDir, 'addons');

const ENTRIES = [
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js',
  'postprocessing/OutputPass.js',
  'environments/RoomEnvironment.js',
];

fs.rmSync(dstDir, { recursive: true, force: true });
fs.mkdirSync(dstDir, { recursive: true });
fs.copyFileSync(path.join(threeDir, 'build', 'three.module.min.js'), path.join(dstDir, 'three.module.min.js'));

const done = new Set();
function copyAddon(rel) {
  if (done.has(rel)) return;
  done.add(rel);
  let code = fs.readFileSync(path.join(addonsSrc, rel), 'utf8');
  const depth = rel.split('/').length;
  const threePath = '../'.repeat(depth) + 'three.module.min.js';
  for (const m of code.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
    copyAddon(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
  code = code.replace(/from\s+['"]three['"]/g, `from '${threePath}'`);
  const out = path.join(addonsDst, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, code);
}
ENTRIES.forEach(copyAddon);
console.log(`three.js + ${done.size} modules copiés dans media/vendor`);
