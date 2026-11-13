import { expect, test } from '@playwright/test';
import { iniciarSesion, API, cabeceras } from './apoyo';
test('el almacenero no ve Ventas y la URL directa es denegada', async ({ page, request }) => {
  await iniciarSesion(page, 'almacen'); await expect(page.getByRole('link', { name: 'Ventas', exact: true })).toHaveCount(0);
  await page.goto('/ventas'); await expect(page.getByRole('heading', { name: 'Acceso denegado', exact: true })).toBeVisible();
  expect((await request.get(API + '/auditoria', { headers: await cabeceras(request, 'almacen') })).status()).toBe(403);
});
test('el vendedor ve Productos sin edición ni acceso a auditoría', async ({ page, request }) => {
  await iniciarSesion(page, 'vendedor', '/productos'); await expect(page.getByTestId('tabla-productos')).toBeVisible();
  await expect(page.getByRole('link', { name: /Nuevo producto/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Editar', exact: true })).toHaveCount(0);
  expect((await request.get(API + '/auditoria', { headers: await cabeceras(request, 'vendedor') })).status()).toBe(403);
});
