import { expect, test, Page, APIRequestContext } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { API, cabeceras, iniciarSesion } from './apoyo';

// Cada caso prepara sus propios datos; no depende del orden ni elimina datos ajenos.
async function preparar(request: APIRequestContext) {
  const headers = await cabeceras(request);
  const marca = `${Date.now()}-${randomInt(100000)}`;
  const c = await request.post(API + '/categorias', { headers, data: { nombre: `S14A ${marca}`, descripcion: 'Prueba autónoma', estado: true } });
  expect(c.status()).toBe(201); const categoriaId = (await c.json()).id;
  const r = await request.post(API + '/clientes', { headers, data: {
    dni: String(randomInt(10000000, 99999999)), nombres: 'Autónoma', apellidos: `S14A${marca}`, email: `s14a-${marca}@example.test`, estado: true,
  }});
  expect(r.status()).toBe(201); const cliente = await r.json();
  const datos = { nombre: `AAAAS14A ${marca}`, categoriaId, precio: 10, stock: 3, estado: true };
  const p = await request.post(API + '/productos', { headers, data: datos });
  expect(p.status()).toBe(201); const producto = await p.json();
  return { headers, cliente, producto, datos };
}
async function seleccionar(page: Page, f: Awaited<ReturnType<typeof preparar>>) {
  await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await page.getByTestId('buscar-cliente').fill(f.cliente.apellidos);
  await page.getByTestId('opcion-cliente').filter({ hasText: f.cliente.apellidos }).click();
  await page.getByTestId('buscar-producto').fill(f.producto.nombre);
  await page.getByTestId('opcion-producto').filter({ hasText: f.producto.nombre }).click();
}

test('E2E-08 stock cambiado por otro usuario muestra 409 sin registrar venta', async ({ page, request }) => {
  const f = await preparar(request); await seleccionar(page, f);
  await page.getByTestId('cantidad').fill('2');
  // Concurrencia real: el formulario conserva stock 3, otro usuario lo reduce a 1.
  expect((await request.put(API + '/productos/' + f.producto.id, { headers: f.headers, data: { ...f.datos, stock: 1 } })).status()).toBe(200);
  await page.getByRole('button', { name: 'Revisar venta', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Imprimir el comprobante al registrar' }).uncheck();
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/v1/ventas') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar venta', exact: true }).click();
  expect((await respuesta).status()).toBe(409);
  await expect(page.getByRole('alert')).toContainText(/stock/i);
  const ventas = await (await request.get(API + '/ventas/buscar?clienteId=' + f.cliente.id, { headers: f.headers })).json();
  expect(ventas.totalElementos).toBe(0);
  expect((await (await request.get(API + '/productos/' + f.producto.id, { headers: f.headers })).json()).stock).toBe(1);
});

test('E2E-09 venta vacía no abre confirmación y la API devuelve 400', async ({ page, request }) => {
  await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await page.getByRole('button', { name: 'Revisar venta', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Agrega al menos un producto y una cantidad entera mayor que cero.', { exact: true })).toBeVisible();
  const respuesta = await request.post(API + '/ventas', { headers: await cabeceras(request), data: { detalles: [] } });
  expect(respuesta.status()).toBe(400);
});

test('E2E-10 cliente recién creado se usa de inmediato y su alta se audita', async ({ page, request }) => {
  const f = await preparar(request); await seleccionar(page, f);
  await page.getByRole('button', { name: 'Revisar venta', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Imprimir el comprobante al registrar' }).uncheck();
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/v1/ventas') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar venta', exact: true }).click();
  const r = await respuesta; expect(r.status()).toBe(201); expect((await r.json()).clienteId).toBe(f.cliente.id);
  await expect(page.getByText('Venta registrada correctamente.', { exact: true })).toBeVisible();
  const eventos = await (await request.get(API + '/auditoria?accion=CLIENTE_REGISTRADO', { headers: f.headers })).json();
  const evento = eventos.contenido.find((e: any) => e.entidadId === f.cliente.id);
  expect(evento).toBeTruthy(); expect(evento.detalle).not.toContain(f.cliente.dni); expect(evento.detalle).not.toContain(f.cliente.email);
});

test('E2E-11 fechas desde página tres vuelven al inicio y persisten al recargar', async ({ page }) => {
  await iniciarSesion(page, 'admin', '/ventas?pagina=2&tamanio=20');
  await expect(page.getByTestId('pagina-actual')).toContainText('Página 3 de');
  await page.getByLabel('Desde', { exact: true }).fill('2026-11-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-11-18');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/pagina=0/); await expect(page.getByTestId('pagina-actual')).toContainText('Página 1 de');
  await page.reload(); await expect(page.getByLabel('Hasta', { exact: true })).toHaveValue('2026-11-18');
});

test('E2E-12 admin consulta venta y anulación confirmadas con filtros en URL', async ({ page, request }) => {
  const f = await preparar(request);
  const r = await request.post(API + '/ventas', { headers: f.headers, data: { clienteId: f.cliente.id, detalles: [{ productoId: f.producto.id, cantidad: 1 }] } });
  expect(r.status()).toBe(201); const venta = await r.json();
  const anular = await request.patch(API + '/ventas/' + venta.id + '/anular', { headers: f.headers });
  expect(anular.status()).toBe(200); expect((await anular.json()).estado).toBe('ANULADA');
  const requestId = anular.headers()['x-request-id'];
  expect((await request.patch(API + '/ventas/' + venta.id + '/anular', { headers: f.headers })).status()).toBe(409);
  await iniciarSesion(page, 'admin', '/auditoria?accion=VENTA_REGISTRADA&usuario=admin');
  await expect(page.getByTestId('tabla-auditoria')).toContainText(String(venta.id));
  await page.getByLabel('Acción', { exact: true }).selectOption('VENTA_ANULADA');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/accion=VENTA_ANULADA/);
  const fila = page.getByTestId('tabla-auditoria').locator('tbody tr').filter({ hasText: requestId });
  await expect(fila).toHaveCount(1); await expect(fila).toContainText(String(venta.id));
  await page.reload(); await expect(page.getByLabel('Acción', { exact: true })).toHaveValue('VENTA_ANULADA');
});

test('E2E-13 vendedor no tiene menú Auditoría ni acceso por URL', async ({ page }) => {
  await iniciarSesion(page, 'vendedor');
  await expect(page.getByRole('link', { name: 'Auditoría', exact: true })).toHaveCount(0);
  await page.goto('/auditoria');
  await expect(page.getByRole('heading', { name: 'Acceso denegado', exact: true })).toBeVisible();
});

test('E2E-14 token alterado provoca 401 y retorno al login con aviso', async ({ page }) => {
  await iniciarSesion(page, 'vendedor', '/productos');
  await expect(page.getByTestId('tabla-productos')).toBeVisible();
  await page.evaluate(() => {
    const sesion = JSON.parse(sessionStorage.getItem('pharmasoft.sesion')!);
    sesion.token = 'token.alterado.invalido';
    sessionStorage.setItem('pharmasoft.sesion', JSON.stringify(sesion));
  });
  const respuesta = page.waitForResponse(r => r.url().includes('/api/v1/') && r.status() === 401);
  await page.reload(); expect((await respuesta).status()).toBe(401);
  await expect(page).toHaveURL(/\/login\?expirada=1/);
  await expect(page.getByRole('status')).toContainText('Su sesión expiró.');
  expect(await page.evaluate(() => sessionStorage.getItem('pharmasoft.sesion'))).toBeNull();
});
