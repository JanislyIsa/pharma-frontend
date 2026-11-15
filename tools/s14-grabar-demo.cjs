// Video técnico reproducible de seis bloques. No es un ensayo oral del estudiante.
const { chromium, request: api } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../../pharmaSoft-main');
const E = path.join(ROOT, 'docs/evidencias/s14-estabilizacion');
const V = path.join(ROOT, '.local/s14-video');
const BASE = 'http://localhost:8081';
const API = 'http://localhost:8080/api/v1';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms)); // ritmo del video, fuera de la suite E2E
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let contenido='';
function escena(titulo,texto,imagen=false) {
  contenido=`<!doctype html><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{margin:0;background:#f5f7fb;color:#12315d;font:24px Arial;padding:45px}h1{font-size:36px;border-left:8px solid #f5af00;padding-left:20px}p{line-height:1.6;white-space:pre-wrap}img{max-width:95%;max-height:490px;object-fit:contain}small{color:#486080}pre{font:19px Consolas;white-space:pre-wrap;background:white;padding:22px;border-radius:15px}</style><h1>${esc(titulo)}</h1>${imagen?'<img src="/arquitectura.png">':`<p>${esc(texto)}</p>`}<small>Recorrido técnico automatizado, 15/11/2026. Datos sintéticos. No es una sustentación personal.</small>`;
}
(async()=>{
  await fs.mkdir(V,{recursive:true}); await fs.mkdir(E,{recursive:true});
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/arquitectura.png'){res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.join(ROOT,'docs/arquitectura.png')));}
    else if(req.url.startsWith('/report/')){
      const rel=req.url.slice(8).split('?')[0]||'index.html';
      const file=path.resolve(E,'playwright-report',rel);
      if(!file.startsWith(path.join(E,'playwright-report')+path.sep)){res.writeHead(403);res.end();return;}
      try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
    }else{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(contenido);}
  });
  await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
  const req=await api.newContext();
  async function loginApi(user){const r=await req.post(API+'/auth/login',{data:{username:user,password:process.env['E2E_'+user.toUpperCase()+'_PASSWORD']}});assert.equal(r.status(),200);return {Authorization:'Bearer '+(await r.json()).token};}
  const admin=await loginApi('admin'),vendedor=await loginApi('vendedor');
  const marca=Date.now().toString();
  async function crear(ruta,data){const r=await req.post(API+ruta,{headers:admin,data});assert.equal(r.status(),201);return r.json();}
  const c=await crear('/categorias',{nombre:'S14 Video '+marca,descripcion:'Demostración técnica',estado:true});
  const cliente=await crear('/clientes',{dni:String(Math.floor(10000000+Math.random()*89999999)),nombres:'Video',apellidos:'Demo'+marca,email:'video-'+marca+'@example.test',estado:true});
  const p=await crear('/productos',{nombre:'AAA DEMO VIDEO '+marca,precio:10,stock:20,estado:true,categoriaId:c.id});
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:V,size:{width:1280,height:800}}});
  const page=await context.newPage();const start=Date.now(),bloques=[];
  async function bloque(nombre){bloques.push({nombre,segundo:Math.round((Date.now()-start)/1000)});}
  async function mostrar(titulo,texto,imagen=false,ms=12000){escena(titulo,texto,imagen);await page.goto('http://127.0.0.1:8766/');await pause(ms);}
  async function loginUI(user,ruta){await page.goto(BASE+ruta);await page.getByLabel('Usuario',{exact:true}).fill(user);await page.getByLabel('Contraseña',{exact:true}).fill(process.env['E2E_'+user.toUpperCase()+'_PASSWORD']);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor();}
  await bloque('Contexto');await mostrar('1. Contexto y arquitectura','',true,16000);
  await bloque('Flujo principal');await loginUI('vendedor','/ventas/nueva');await pause(4000);
  await page.getByTestId('buscar-cliente').fill(cliente.apellidos);await page.getByTestId('opcion-cliente').filter({hasText:cliente.apellidos}).click();await pause(3000);
  await page.getByTestId('buscar-producto').fill(p.nombre);await page.getByTestId('opcion-producto').filter({hasText:p.nombre}).click();await page.getByTestId('cantidad').fill('1');await pause(5000);
  await page.getByRole('button',{name:'Revisar venta',exact:true}).click();await page.getByRole('checkbox',{name:'Imprimir el comprobante al registrar'}).uncheck();await pause(5000);
  const espera=page.waitForResponse(r=>r.url().endsWith('/api/v1/ventas')&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirmar venta',exact:true}).click();const respuesta=await espera;assert.equal(respuesta.status(),201);const venta=await respuesta.json(),requestId=respuesta.headers()['x-request-id'];await page.getByRole('article').waitFor();await pause(10000);
  await page.goto(BASE+'/productos?orden=id&dir=desc&tamanio=20');const fila=page.getByTestId('tabla-productos').locator('tbody tr').filter({hasText:p.nombre});await fila.waitFor();assert.equal(await fila.locator('td').nth(3).innerText(),'19');await pause(9000);
  await bloque('Seguridad');await page.goto(BASE+'/auditoria');await page.getByRole('heading',{name:'Acceso denegado',exact:true}).waitFor();await pause(8000);
  const prohibido=await req.get(API+'/auditoria',{headers:vendedor});const anonimo=await req.get(API+'/productos');assert.equal(prohibido.status(),403);assert.equal(anonimo.status(),401);
  await mostrar('3. Seguridad comprobada',`Vendedor: menú sin Auditoría y URL denegada.\nGET /auditoria con vendedor: HTTP ${prohibido.status()}.\nGET /productos sin sesión válida: HTTP ${anonimo.status()}.\nE2E de vencimiento y token alterado: aprobados.\n401 cierra la sesión; 403 conserva la sesión y deniega la operación.`,false,14000);
  await bloque('Volumen y rendimiento');await page.goto(BASE+'/productos?pagina=1&tamanio=20');await page.getByTestId('pagina-actual').waitFor();await pause(7000);await page.reload();await page.getByTestId('tabla-productos').waitFor();await pause(5000);
  const health=await req.get('http://localhost:8080/actuator/health');assert.equal(health.status(),200);
  const redis=JSON.parse(await fs.readFile(path.join(E,'infraestructura.json'),'utf8'));
  await mostrar('4. Paginación, caché y salud',`Productos: más de 5 000 registros, solo 20 por página.\nLa URL conserva la página al recargar.\nActuator /health: ${JSON.stringify(await health.json())}\nRedis: ${redis.ping}; ${redis.clave}; TTL ${redis.ttl} s.\nLas escrituras y las ventas invalidan el catálogo.`,false,14000);
  await bloque('Auditoría');await page.goto(BASE+'/inicio');await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await loginUI('admin','/auditoria?accion=VENTA_REGISTRADA&usuario=vendedor');await page.getByTestId('tabla-auditoria').getByText(requestId,{exact:true}).waitFor();await pause(11000);
  const trazado=JSON.parse(await fs.readFile(path.join(E,'trazabilidad.json'),'utf8'));
  await mostrar('5. Venta, bitácora y log',`Venta del video: ${venta.id}; creadoPor: ${venta.creadoPor}.\nrequestId: ${requestId}.\nSe registra después del commit; el rollback no produce un éxito falso.\n\nCaso manual documentado: venta ${trazado.resultado.ventaId}.\n${trazado.log.join('\n')}`,false,16000);
  await bloque('Calidad');
  let salida='';
  const actualizar=()=>{escena('6. Suite ejecutándose en vivo',salida.slice(-3000)||'Iniciando los 14 casos de Playwright...');contenido+='<script>setTimeout(()=>location.reload(),1200)</script>';};
  actualizar();await page.goto('http://127.0.0.1:8766/');
  const prueba=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--reporter=list','--output=.e2e-local/video-resultados'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,E2E_BASE_URL:'http://127.0.0.1:4200'},windowsHide:true});
  prueba.stdout.on('data',b=>{salida+=b.toString().replace(/\u001b\[[0-9;]*m/g,'');actualizar();});
  prueba.stderr.on('data',b=>{salida+=b.toString().replace(/\u001b\[[0-9;]*m/g,'');actualizar();});
  const codigo=await new Promise((resolve,reject)=>{prueba.once('exit',resolve);prueba.once('error',reject);});
  await fs.writeFile(path.join(E,'video-pruebas.log'),salida);assert.equal(codigo,0);await pause(8000);
  await page.goto('http://127.0.0.1:8766/report/index.html');await pause(10000);
  await mostrar('6. Calidad y cierre','Playwright: 14 casos, tres repeticiones, 42 aprobadas.\nSin waitForTimeout en la suite y sin retries.\nPostman: 18 solicitudes, 26 comprobaciones aprobadas.\nOcho incidencias documentadas y cerradas.\nEvidencias y código enlazados en docs/README.md.\n\nEl estudiante debe ensayar el guion y defender estas decisiones.',false,14000);
  const segundos=Math.round((Date.now()-start)/1000);assert(segundos<=600);
  const video=page.video();await context.close();await video.saveAs(path.join(E,'demo-respaldo.webm'));await browser.close();await req.dispose();server.close();
  await fs.writeFile(path.join(E,'video.json'),JSON.stringify({fecha:new Date().toISOString(),segundos,bloques,ventaId:venta.id,requestId,modalidad:'Recorrido técnico automatizado de la SPA de producción y evidencia real; sin narración personal.',archivo:'demo-respaldo.webm'},null,2));
  console.log('Video guardado:',segundos,'segundos; venta',venta.id,'requestId',requestId);
})().catch(e=>{console.error(e.message);process.exit(1);});
