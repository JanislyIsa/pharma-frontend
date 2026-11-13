import { expect, test } from '@playwright/test';
import { API, cabeceras, iniciarSesion } from './apoyo';
test('flujo integrado: cliente, catálogo, venta, stock, reportes y auditoría', async ({ page, request }, info) => {
  const headers = await cabeceras(request);
  const marca = `${Date.now()}${info.repeatEachIndex}`;
  const categoriaR = await request.post(API + '/categorias', { headers, data: { nombre: `S14 E2E ${marca}`, descripcion: 'Integración local', estado: true } });
  expect(categoriaR.status()).toBe(201); const categoria = await categoriaR.json(); expect(categoria.creadoPor).toBe('admin');
  const categoriaId = categoria.id;
  const categoriaEdit = await request.put(API + '/categorias/' + categoriaId, { headers, data: { nombre: categoria.nombre, descripcion: 'Integración revisada', estado: true } });
  expect(categoriaEdit.status()).toBe(200); expect((await categoriaEdit.json()).modificadoPor).toBe('admin');
  const clienteR = await request.post(API + '/clientes', { headers, data: {
    dni: marca.slice(-8), nombres: 'S14', apellidos: `E2E${marca}`, email: `s14-${marca}@example.test`, estado: true,
  }});
  expect(clienteR.status()).toBe(201); const cliente = await clienteR.json(); expect(cliente.creadoPor).toBe('admin');
  const datos = { nombre: `AA S14 E2E ${marca}`, precio: 12.5, stock: 20, estado: true, categoriaId };
  const productoR = await request.post(API + '/productos', { headers, data: datos });
  expect(productoR.status()).toBe(201); const producto = await productoR.json(); expect(producto.creadoPor).toBe('admin');
  for (const variante of [{ nombre: datos.nombre + ' agotado', stock: 0, estado: true }, { nombre: datos.nombre + ' inactivo', stock: 20, estado: false }]) {
    expect((await request.post(API + '/productos', { headers, data: { ...datos, ...variante } })).status()).toBe(201);
  }
  // Calienta la caché del catálogo antes de vender para comprobar su invalidación real.
  expect((await request.get(API + '/productos?pagina=0&tamanio=20', { headers })).status()).toBe(200);
  const errores: string[] = []; const quinientos: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errores.push(message.text()); });
  page.on('response', r => { if (r.status() >= 500) quinientos.push(r.url()); });
  await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await page.getByTestId('buscar-cliente').fill(cliente.apellidos);
  await page.getByTestId('opcion-cliente').filter({ hasText: cliente.apellidos }).click();
  await page.getByTestId('buscar-producto').fill(datos.nombre);
  const opcion = page.getByTestId('opcion-producto').filter({ hasText: datos.nombre });
  await expect(opcion).toBeVisible(); const stockAntes = Number(await opcion.getAttribute('data-stock'));
  expect(stockAntes).toBe(20); await opcion.click(); await page.getByTestId('cantidad').fill('2');
  await expect(page.getByTestId('total-venta')).toContainText('25.00');
  await page.getByRole('button', { name: 'Revisar venta', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Imprimir el comprobante al registrar' }).uncheck();
  const registro = page.waitForResponse(r => r.url().endsWith('/api/v1/ventas') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar venta', exact: true }).click();
  const respuesta = await registro; expect(respuesta.status()).toBe(201);
  const venta = await respuesta.json(); const requestId = respuesta.headers()['x-request-id'];
  expect(venta.creadoPor).toBe('vendedor');
  await expect(page.getByText('Venta registrada correctamente.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  const fila = page.getByTestId('tabla-productos').locator('tbody tr').filter({ hasText: datos.nombre });
  await expect(fila.locator('td').nth(3)).toHaveText(String(stockAntes - 2));
  const audit = await (await request.get(API + '/auditoria?accion=VENTA_REGISTRADA&usuario=vendedor', { headers })).json();
  expect(audit.contenido).toEqual(expect.arrayContaining([expect.objectContaining({ entidadId: venta.id, usuario: 'vendedor', requestId })]));
  const reporte = await (await request.get(API + '/reportes/productos-mas-vendidos', { headers })).json();
  expect(reporte).toEqual(expect.arrayContaining([expect.objectContaining({ productoId: producto.id, cantidadVendida: 2, montoTotal: 25 })]));
  const cambioR = await request.put(API + '/productos/' + producto.id, { headers, data: { ...datos, stock: 18, precio: 13 } });
  expect(cambioR.status()).toBe(200); expect((await cambioR.json()).modificadoPor).toBe('admin');
  const precioAudit = await (await request.get(API + '/auditoria?accion=PRECIO_MODIFICADO&usuario=admin', { headers })).json();
  expect(precioAudit.contenido).toEqual(expect.arrayContaining([expect.objectContaining({ entidadId: producto.id, detalle: expect.stringMatching(/^12\.5(?:0)? -> 13(?:\.00)?$/) })]));
  // Fallo después de descontar la primera línea: rollback de stock y ausencia de evento falso.
  const fallo = await request.post(API + '/ventas', { headers, data: { clienteId: cliente.id, detalles: [
    { productoId: producto.id, cantidad: 1 }, { productoId: 999999999, cantidad: 1 },
  ] }});
  expect(fallo.status()).toBe(404);
  expect((await (await request.get(API + '/productos/' + producto.id, { headers })).json()).stock).toBe(18);
  const auditoriaDespues = await (await request.get(API + '/auditoria?accion=VENTA_REGISTRADA&usuario=vendedor', { headers })).json();
  expect(auditoriaDespues.totalElementos).toBe(audit.totalElementos);
  // Baja lógica del producto de prueba, sin borrar ventas ni datos existentes.
  expect((await request.delete(API + '/productos/' + producto.id, { headers })).status()).toBe(204);
  const baja = await (await request.get(API + '/auditoria?accion=PRODUCTO_ELIMINADO', { headers })).json();
  expect(baja.contenido).toEqual(expect.arrayContaining([expect.objectContaining({ entidadId: producto.id })]));
  expect(errores).toEqual([]); expect(quinientos).toEqual([]);
  await info.attach('integracion', { body: JSON.stringify({ ventaId: venta.id, productoId: producto.id, requestId, stockAntes, stockDespues: 18,
    matriz: ['I-01', 'I-02', 'I-03', 'I-04', 'I-05', 'I-06'], errores, quinientos }), contentType: 'application/json' });
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await iniciarSesion(page, 'admin', '/auditoria?accion=VENTA_REGISTRADA&usuario=vendedor');
  await expect(page.getByTestId('tabla-auditoria')).toContainText(String(venta.id));
  await page.screenshot({ path: info.outputPath('auditoria-integrada.png'), fullPage: true });
});
