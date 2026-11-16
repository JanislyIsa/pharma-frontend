import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const evidence = path.join(root, 'docs/evidencias-s13-autonoma/A');
const harness = fs.readFileSync(path.join(root, 'tools/benchmark/s13-benchmark.js'), 'utf8');
for (const [folder, mode] of [['no-preload', 'sin precarga'], ['preload', 'con precarga']]) {
  const browser = path.join(root, 'tmp/s13-autonoma', folder, 'browser');
  const index = path.join(browser, 'index.html');
  let html = fs.readFileSync(index, 'utf8').replace(/<script src="s13-benchmark\.js"[^>]*><\/script>/g, '');
  html = html.replace('</body>', `<script src="s13-benchmark.js" data-mode="${mode}"></script></body>`);
  fs.writeFileSync(index, html);
  fs.writeFileSync(path.join(browser, 's13-benchmark.js'), harness);
}

function analyze(file) {
  const stats = JSON.parse(fs.readFileSync(file, 'utf8'));
  const initial = new Set();
  function visit(name) {
    if (initial.has(name) || !stats.outputs[name]) return;
    initial.add(name);
    for (const entry of stats.outputs[name].imports || []) {
      if (entry.kind !== 'dynamic-import' && !entry.external) visit(entry.path);
    }
  }
  for (const [name, output] of Object.entries(stats.outputs)) {
    if (output.entryPoint === 'src/main.ts' || name.startsWith('styles-')) visit(name);
  }
  const modules = {};
  for (const name of initial) {
    for (const [input, contribution] of Object.entries(stats.outputs[name].inputs || {})) {
      modules[input] = (modules[input] || 0) + contribution.bytesInOutput;
    }
  }
  const top = Object.entries(modules).sort((a,b) => b[1] - a[1]).slice(0,5).map(([file, bytesInOutput]) => ({file, bytesInOutput}));
  return {initialBytes: [...initial].reduce((sum, name) => sum + stats.outputs[name].bytes, 0),
          initialFiles: [...initial],
          lazyJsChunks: Object.keys(stats.outputs).filter(name => name.endsWith('.js') && !initial.has(name)).length,
          topInitialModules: top};
}
const builds = {
  before: analyze(path.join(evidence, 'A-antes-stats.json')),
  after: analyze(path.join(evidence, 'A-despues-stats.json')),
  preload: analyze(path.join(root, 'tmp/s13-autonoma/preload/browser-stats.json')),
};
fs.writeFileSync(path.join(evidence, 'A-resumen-builds.json'), JSON.stringify(builds, null, 2));
fs.writeFileSync(path.join(evidence, 'A-top5.csv'), 'modulo,bytesInOutput\n' + builds.before.topInitialModules.map(x => `"${x.file}",${x.bytesInOutput}`).join('\n'));
console.log(JSON.stringify(builds, null, 2));
