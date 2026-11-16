import fs from 'node:fs';
import path from 'node:path';
const browser=path.resolve('dist/pharma-frontend/browser');
const index=path.join(browser,'index.html');
let text=fs.readFileSync(index,'utf8').replace(/<script src="browser-evidence\.js"><\/script>/g,'');
if (process.argv.includes('--remove')) {
  fs.writeFileSync(index,text);
  if (fs.existsSync(path.join(browser,'browser-evidence.js'))) fs.unlinkSync(path.join(browser,'browser-evidence.js'));
} else {
  fs.writeFileSync(index,text.replace('</body>','<script src="browser-evidence.js"></script></body>'));
  fs.copyFileSync('tools/browser-evidence.js',path.join(browser,'browser-evidence.js'));
}
console.log(process.argv.includes('--remove')?'Instrumentación temporal retirada.':'Instrumentación temporal instalada en dist.');
