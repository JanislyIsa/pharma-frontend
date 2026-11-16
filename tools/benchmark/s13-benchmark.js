// Instrumentación exclusiva de los servidores de prueba; no se incorpora a la SPA normal.
(() => {
  const mode = document.currentScript.dataset.mode;
  const run = new URLSearchParams(location.search).get('run') || '1';
  const result = { mode, run, phase: 'Esperando login', pauseOnHomeMs: 2000,
                   viewport: {width: innerWidth, height: innerHeight} };
  const root = document.querySelector('app-root');
  let loginAt, homeAt, clickAt;
  performance.setResourceTimingBufferSize(2000);
  const panel = document.createElement('aside');
  panel.id = 's13-benchmark';
  panel.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:10000;padding:16px;width:360px;background:#102f5c;color:white;border:2px solid #f2a900;border-radius:12px;font:13px/1.5 system-ui;box-shadow:0 3px 16px #0003';
  const title = document.createElement('strong');
  title.textContent = 'Medición A.3 - ' + mode;
  const summary = document.createElement('div');
  const json = document.createElement('pre');
  json.id = 's13-benchmark-json';
  json.hidden = true;
  panel.append(title, summary, json);
  document.body.append(panel);
  function render() {
    summary.textContent = result.phase === 'Medición completa'
      ? `Medición completa. Inicio: ${result.firstScreenTransferBytes} bytes transferidos. Ventas desde clic: ${result.salesDataAfterClickMs} ms. Ventas desde login: ${result.salesDataAfterLoginMs} ms. Repetición ${run}.`
      : result.phase;
    json.textContent = JSON.stringify(result);
  }
  function resources() {
    const nav = performance.getEntriesByType('navigation')[0];
    const files = performance.getEntriesByType('resource')
      .filter(entry => new URL(entry.name).origin === location.origin && !entry.name.includes('s13-benchmark.js') && new URL(entry.name).pathname !== '/favicon.ico')
      .map(entry => ({path: new URL(entry.name).pathname, transferBytes: entry.transferSize,
                     encodedBytes: entry.encodedBodySize, durationMs: Math.round(entry.duration * 100) / 100}));
    return {files, transferBytes: (nav?.transferSize || 0) + files.reduce((sum, entry) => sum + entry.transferBytes, 0),
            encodedBytes: (nav?.encodedBodySize || 0) + files.reduce((sum, entry) => sum + entry.encodedBytes, 0),
            jsTransferBytes: files.filter(entry => entry.path.endsWith('.js')).reduce((sum, entry) => sum + entry.transferBytes, 0)};
  }
  document.addEventListener('submit', () => {
    if (location.pathname.startsWith('/login')) {
      loginAt = performance.now(); result.phase = 'Login enviado'; render();
    }
  }, true);
  render();
  const timer = setInterval(() => {
    const now = performance.now();
    const heading = root.querySelector('h1')?.textContent.trim();
    if (loginAt && !homeAt && heading === 'Tu botica, en orden.') {
      homeAt = now; result.homeAfterLoginMs = Math.round((now - loginAt) * 100) / 100;
      result.phase = 'Inicio visible; espera controlada de 2 segundos'; render();
    }
    if (homeAt && !clickAt && now - homeAt >= 2000) {
      const first = resources();
      result.firstScreenTransferBytes = first.transferBytes;
      result.firstScreenEncodedBytes = first.encodedBytes;
      result.firstScreenJsTransferBytes = first.jsTransferBytes;
      result.firstScreenResources = first.files;
      const salesLink = root.querySelector('a[href="/ventas"]');
      if (!salesLink) { result.phase = 'ERROR: no hay enlace Ventas'; render(); clearInterval(timer); return; }
      clickAt = performance.now(); result.phase = 'Abriendo Ventas'; render();
      salesLink.click();
    }
    if (clickAt && heading === 'Consulta de ventas') {
      result.salesHeadingAfterClickMs ??= Math.round((now - clickAt) * 100) / 100;
      const sales = root.querySelector('app-venta-list');
      if (sales?.querySelector('tbody tr') && !sales.querySelector('.sales-card .state')) {
        result.salesDataAfterClickMs = Math.round((now - clickAt) * 100) / 100;
        result.salesDataAfterLoginMs = Math.round((now - loginAt) * 100) / 100;
        const total = resources();
        result.totalTransferBytes = total.transferBytes;
        result.totalResources = total.files;
        result.phase = 'Medición completa'; render(); clearInterval(timer);
      }
    }
    if (loginAt && now - loginAt > 45000) {
      result.phase = 'ERROR: navegación no completada en 45 segundos'; render(); clearInterval(timer);
    }
  }, 50);
})();
