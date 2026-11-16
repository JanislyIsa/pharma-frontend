import { expect, test } from '@playwright/test';
import { iniciarSesion } from './apoyo';
test('productos y ventas conservan paginación y reinician al filtrar', async ({ page }) => {
  await iniciarSesion(page, 'admin', '/productos'); await expect(page.getByTestId('tabla-productos').locator('tbody tr')).toHaveCount(20);
  const r = page.waitForResponse(r => r.url().includes('/api/v1/productos?') && r.url().includes('pagina=1'));
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click(); expect((await r).status()).toBe(200);
  await expect(page).toHaveURL(/pagina=1/); await expect(page.getByTestId('pagina-actual')).toContainText('Página 2 de');
  await page.reload(); await expect(page.getByTestId('pagina-actual')).toContainText('Página 2 de');
  await page.getByRole('combobox', { name: 'Filas', exact: true }).selectOption('50');
  await expect(page.getByTestId('tabla-productos').locator('tbody tr')).toHaveCount(50); await expect(page).toHaveURL(/pagina=0/);
  await page.goto('/ventas?pagina=4&tamanio=20'); await expect(page.getByTestId('pagina-actual')).toContainText('Página 5 de');
  await page.getByLabel('Desde', { exact: true }).fill('2026-11-01'); await page.getByLabel('Hasta', { exact: true }).fill('2026-11-12');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click(); await expect(page).toHaveURL(/pagina=0/);
  await expect(page.getByTestId('pagina-actual')).toContainText('Página 1 de');
  await page.reload(); await expect(page.getByLabel('Desde', { exact: true })).toHaveValue('2026-11-01');
});
