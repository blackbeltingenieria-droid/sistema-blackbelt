import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

test.describe('Mi panel del Admin', () => {
  test('muestra el resumen de la empresa y las alertas', async ({ page }) => {
    await login(page, 'Henry Torres');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('admin-summary')).toBeVisible();
    await expect(page.getByText('Tareas abiertas del equipo')).toBeVisible();
    await expect(page.getByText('Horas del mes (todos)')).toBeVisible();
    await expect(page.getByText('Proyectos activos')).toBeVisible();
    await expect(page.getByText('Por validar')).toBeVisible();
    await expect(page.getByTestId('alerts')).toContainText('Reparto CORP sin definir'); // Excel real: gasto común sin repartir
    await noHorizontalScroll(page);
  });

  test('Henry Torres (Gerente General) es el primer usuario: Administrador con sus propias tareas', async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Henry Torres Rivera/ }).first()).toBeVisible();
    await page.getByRole('button', { name: /Henry Torres Rivera/ }).first().click();
    await go(page, 'Mi panel');
    await expect(page.getByTestId('admin-summary')).toBeVisible();
    await expect(page.getByTestId('my-work')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('sin vínculo: el aviso trae un enlace a Equipo; al volver a vincular aparecen sus tareas', async ({ page }) => {
    await login(page, 'Henry Torres');
    await go(page, 'Equipo');
    const mine = page.getByTestId('users-list').locator('li', { hasText: 'henry@demo.local' });
    await mine.locator('select[id^="link-"]').selectOption({ label: 'Ninguno' });
    await expect(page.getByTestId('users-msg')).toContainText('Vínculo guardado');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('my-work')).toHaveCount(0);
    await page.getByTestId('link-users').click();
    await expect(page).toHaveURL(/\/users$/);
    await page.getByTestId('users-list').locator('li', { hasText: 'henry@demo.local' }).locator('select[id^="link-"]').selectOption({ label: 'Henry Torres Rivera' });
    await expect(page.getByTestId('users-msg')).toContainText('Vínculo guardado');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('admin-summary')).toBeVisible();
    await expect(page.getByTestId('my-work')).toBeVisible();
    await expect(page.getByTestId('not-linked')).toHaveCount(0);
    await noHorizontalScroll(page);
  });

});

test.describe('Colaborador (datos demo)', () => {
  test.use({ baseURL: 'http://127.0.0.1:5174' });
  test('el Colaborador sigue viendo solo lo suyo (sin resumen de empresa ni Usuarios)', async ({ page }) => {
    await login(page, 'Marco');
    await expect(page).toHaveURL(/\/my$/);
    await expect(page.getByTestId('admin-summary')).toHaveCount(0);
    await expect(page.getByTestId('my-work')).toBeVisible();
    await page.goto('/users');
    await expect(page).toHaveURL(/\/my$/);
  });
});
