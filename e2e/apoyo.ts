import { expect, Page, APIRequestContext } from '@playwright/test';
export const API = 'http://localhost:8080/api/v1';
export const USUARIOS = {
  admin: { usuario: 'admin', variable: 'E2E_ADMIN_PASSWORD' },
  vendedor: { usuario: 'vendedor', variable: 'E2E_VENDEDOR_PASSWORD' },
  almacen: { usuario: 'almacen', variable: 'E2E_ALMACEN_PASSWORD' },
};
export function clave(quien: keyof typeof USUARIOS): string {
  const valor = process.env[USUARIOS[quien].variable];
  if (!valor) throw new Error(`Define ${USUARIOS[quien].variable} para ejecutar las pruebas locales.`);
  return valor;
}
export async function iniciarSesion(page: Page, quien: keyof typeof USUARIOS, ruta = '/inicio') {
  await page.goto(ruta); await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Usuario', { exact: true }).fill(USUARIOS[quien].usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave(quien));
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
}
export async function cabeceras(request: APIRequestContext, quien: keyof typeof USUARIOS = 'admin') {
  const r = await request.post(API + '/auth/login', { data: { username: USUARIOS[quien].usuario, password: clave(quien) } });
  expect(r.status()).toBe(200);
  return { Authorization: 'Bearer ' + (await r.json()).token };
}
