import { expect, test } from '@playwright/test';

// Login con correo y contraseña (como en la web). Puerto 5176 = `npm run dev:login` (cuentas en memoria;
// contraseña inicial de prueba «blackbelt2026»). En la web las cuentas viven en Supabase Auth.
test.use({ baseURL: 'http://127.0.0.1:5176' });

async function open(page: import('@playwright/test').Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto('/');
}
async function enter(page: import('@playwright/test').Page, email: string, password: string) {
  await page.getByLabel('Correo').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('sin contraseña no se entra; con la correcta sí', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('login-form')).toBeVisible();
  await expect(page.getByText('¿Quién eres?')).toHaveCount(0);           // ya no hay lista de usuarios
  await enter(page, 'henry@demo.local', 'equivocada');
  await expect(page.getByTestId('login-error')).toHaveText('Correo o contraseña incorrectos.');
  await enter(page, 'nadie@demo.local', 'blackbelt2026');
  await expect(page.getByTestId('login-error')).toContainText('no tiene acceso');
  await enter(page, 'HENRY@demo.local', 'blackbelt2026');
  await expect(page.getByRole('heading', { name: 'Dashboard general' })).toBeVisible();
});

test('el admin crea la cuenta de un colaborador; el colaborador entra y solo ve lo suyo', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-1280', 'Flujo largo: solo en escritorio');
  await open(page);
  await enter(page, 'henry@demo.local', 'blackbelt2026');
  await page.locator('aside').getByRole('link', { name: /Equipo$/ }).click();
  const card = page.getByText('Johann Imanol Herrera Ramos', { exact: true }).locator("xpath=ancestor::li[1]");
  await card.getByRole('button', { name: 'Dar acceso' }).click();
  await card.locator('#acc-email').fill('johann@blackbelt.pe');
  await card.locator('#acc-password').fill('corta');
  await card.locator('form').getByRole('button', { name: 'Dar acceso' }).click();
  await expect(page.getByRole('alert')).toContainText('al menos 8');
  await card.locator('#acc-password').fill('johann2026');
  await card.locator('form').getByRole('button', { name: 'Dar acceso' }).click();
  await expect(page.getByTestId('users-msg')).toContainText('johann2026');

  await page.locator('aside').getByRole('button', { name: 'Salir' }).click();
  await enter(page, 'johann@blackbelt.pe', 'blackbelt2026');               // la de prueba ya no sirve
  await expect(page.getByTestId('login-error')).toHaveText('Correo o contraseña incorrectos.');
  await enter(page, 'johann@blackbelt.pe', 'johann2026');
  await expect(page.getByRole('heading', { name: 'Mi panel' })).toBeVisible();
  const nav = page.locator('aside');
  await expect(nav.getByRole('link', { name: /Horas-hombre$/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Resultados y caja$/ })).toHaveCount(0);

  // Cambia su propia contraseña
  await nav.getByTestId('my-password').click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('#pw-current').fill('johann2026');
  await dlg.locator('#pw-new').fill('nueva-clave-1');
  await dlg.locator('#pw-repeat').fill('nueva-clave-1');
  await dlg.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(dlg.getByTestId('password-changed')).toBeVisible();
  await dlg.getByRole('button', { name: 'Listo' }).click();
  await nav.getByRole('button', { name: 'Salir' }).click();
  await enter(page, 'johann@blackbelt.pe', 'nueva-clave-1');
  await expect(page.getByRole('heading', { name: 'Mi panel' })).toBeVisible();

  // El admin le quita el acceso: ya no puede entrar
  await nav.getByRole('button', { name: 'Salir' }).click();
  await enter(page, 'henry@demo.local', 'blackbelt2026');
  await page.locator('aside').getByRole('link', { name: /Equipo$/ }).click();
  const userCard = page.getByTestId('users-list').locator('li', { hasText: 'johann@blackbelt.pe' });
  await userCard.getByRole('button', { name: 'Quitar acceso' }).click();
  await userCard.getByRole('button', { name: 'Sí, quitar' }).click();
  await expect(userCard).toContainText('Sin acceso');
  await page.locator('aside').getByRole('button', { name: 'Salir' }).click();
  await enter(page, 'johann@blackbelt.pe', 'nueva-clave-1');
  await expect(page.getByTestId('login-error')).toContainText('no tiene acceso');
});
