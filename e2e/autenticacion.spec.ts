import { expect, test } from '@playwright/test';
import { iniciarSesion, clave } from './apoyo';
test('una ruta protegida lleva al login con returnUrl', async ({ page }) => {
  await page.goto('/ventas'); await expect(page).toHaveURL(/\/login\?returnUrl=%2Fventas/);
});
test('credenciales incorrectas muestran el mensaje del backend', async ({ page }) => {
  await page.goto('/login'); await page.getByLabel('Usuario', { exact: true }).fill('admin');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Usuario o contraseña incorrectos/i);
});
test('login conserva el destino y recupera la venta tras expirar la sesión', async ({ page }) => {
  await page.clock.install(); await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await expect(page).toHaveURL(/\/ventas\/nueva$/);
  const restante = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pharmasoft.sesion')!).expiraEn - Date.now());
  await page.clock.fastForward(restante + 2000);
  await expect(page).toHaveURL(/\/login\?expirada=1&returnUrl=%2Fventas%2Fnueva/);
  await page.clock.resume();
  await page.getByLabel('Usuario', { exact: true }).fill('vendedor');
  await page.getByLabel('Contraseña', { exact: true }).fill(clave('vendedor'));
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/ventas\/nueva$/);
});
