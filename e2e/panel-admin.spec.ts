import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

test.describe('Mi panel del Admin', () => {
  test('muestra el resumen de la empresa y las alertas', async ({ page }) => {
    await login(page, 'Administración Blackbelt');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('admin-summary')).toBeVisible();
    await expect(page.getByText('Tareas abiertas del equipo')).toBeVisible();
    await expect(page.getByText('Horas del mes (todos)')).toBeVisible();
    await expect(page.getByText('Proyectos activos')).toBeVisible();
    await expect(page.getByText('Por validar')).toBeVisible();
    await expect(page.getByTestId('alerts')).toContainText('control distinto de OK');
    await noHorizontalScroll(page);
  });

  test('sin vínculo: el aviso trae un enlace a Usuarios; al vincular aparecen sus tareas', async ({ page }) => {
    await login(page, 'Administración Blackbelt');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('my-work')).toHaveCount(0);
    await page.getByTestId('link-users').click();
    await expect(page).toHaveURL(/\/users$/);
    await page.locator('select[id^="link-"]').first().selectOption({ label: 'Henry Torres Rivera' });
    await expect(page.getByTestId('users-msg')).toContainText('Vínculo guardado');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('admin-summary')).toBeVisible(); // el resumen sigue arriba
    await expect(page.getByTestId('my-work')).toBeVisible();       // y sus tareas personales debajo
    await expect(page.getByTestId('not-linked')).toHaveCount(0);
    await noHorizontalScroll(page);
  });

  test('el Colaborador sigue viendo solo lo suyo (sin resumen de empresa ni Usuarios)', async ({ page }) => {
    await login(page, 'Marco');
    await expect(page).toHaveURL(/\/my$/);
    await expect(page.getByTestId('admin-summary')).toHaveCount(0);
    await expect(page.getByTestId('my-work')).toBeVisible();
    await page.goto('/users');
    await expect(page).toHaveURL(/\/my$/);
  });
});
