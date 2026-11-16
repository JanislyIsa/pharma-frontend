// Instrumentación temporal de evidencia. Solo se copia a dist durante las pruebas.
(() => {
  const records = [];
  const mode = new URLSearchParams(location.search).get('evidence') || 'B-D';
  performance.setResourceTimingBufferSize(2000);
  const box = document.createElement('aside');
  box.id = 's13-evidence';
  box.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;width:390px;padding:12px;background:#102f5c;color:white;border:2px solid #f2a900;border-radius:10px;font:12px/1.5 system-ui';
  const title = document.createElement('strong');
  title.textContent = 'Evidencia técnica S13 - ' + mode;
  const text = document.createElement('div');
  const output = document.createElement('pre');
  output.hidden = true; output.id = 's13-evidence-json';
  const button = document.createElement('button');
  button.textContent = 'Registrar recursos de esta carga';
  button.style.cssText = 'padding:5px;margin-top:6px;color:#102f5c;background:white;border:0;border-radius:4px';
  function snapshot() {
    const entries = performance.getEntriesByType('resource')
      .filter(e => new URL(e.name).origin === location.origin && !e.name.includes('browser-evidence.js') && !e.name.includes('favicon.ico'))
      .map(e => ({path: new URL(e.name).pathname, transferSize:e.transferSize,
                 encodedBodySize:e.encodedBodySize, decodedBodySize:e.decodedBodySize,
                 durationMs:Math.round(e.duration*100)/100, responseStatus:e.responseStatus || null,
                 source:e.transferSize===0 && e.decodedBodySize>0 ? 'cache local (memoria/disco)' : 'red o revalidacion'}));
    const nav = performance.getEntriesByType('navigation')[0];
    const data = {time:new Date().toISOString(),url:location.href,requests:records,
      navigation:nav ? {type:nav.type,transferSize:nav.transferSize,encodedBodySize:nav.encodedBodySize,responseStatus:nav.responseStatus || null} : null,
      resources:entries};
    output.textContent = JSON.stringify(data);
    const last = records.at(-1);
    text.textContent = last
      ? `${last.method} ${last.path} → ${last.status}. X-Request-Id: ${last.requestId || 'sin cabecera'}. Recursos: ${entries.length}.`
      : `Recursos observados: ${entries.length}. Pulse para registrar los tamaños de red y caché.`;
  }
  function capture(method, url, response, body) {
    const path = new URL(url, location.href).pathname;
    if (!path.startsWith('/api/') || path.endsWith('/auth/login')) return;
    records.push({method, path, status:response.status,
      requestId:response.headers ? response.headers.get('X-Request-Id') : response.getResponseHeader('X-Request-Id'),
      entityId:method==='POST' && path==='/api/v1/ventas' ? body?.id : undefined,
      message:response.status>=400 ? body?.message : undefined,
      bodyRequestId:response.status>=400 ? body?.requestId : undefined});
    snapshot();
  }
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const response = await originalFetch.call(this,input,init);
    const url = typeof input==='string' ? input : input.url;
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    if (new URL(url,location.href).pathname.startsWith('/api/') && !url.includes('/auth/login')) {
      let body;
      if (response.status>=400 || (method==='POST' && new URL(url,location.href).pathname==='/api/v1/ventas')) {
        try { body=await response.clone().json(); } catch {}
      }
      capture(method,url,response,body);
    }
    return response;
  };
  const open=XMLHttpRequest.prototype.open, send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(method,url,...args) {this.s13meta={method:method.toUpperCase(),url:String(url)};return open.call(this,method,url,...args);};
  XMLHttpRequest.prototype.send=function(...args) {this.addEventListener('loadend',()=>{
    if (!this.s13meta || this.s13meta.url.includes('/auth/login')) return;
    let body;try {body=this.responseType==='json'?this.response:JSON.parse(this.responseText);} catch {}
    capture(this.s13meta.method,this.s13meta.url,this,body);
  });return send.apply(this,args);};
  button.addEventListener('click',snapshot);
  box.append(title,text,button,output);document.body.append(box);snapshot();
})();
