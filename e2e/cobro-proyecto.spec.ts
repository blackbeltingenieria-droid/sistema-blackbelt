import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll, rowOf, vis } from './helpers';

test.describe('Cobrar lo que falta de un proyecto', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Henry Torres'); });

  test('desde el proyecto: "Registrar pago" abre el ingreso ya lleno y el proyecto queda pagado', async ({ page }) => {
    await go(page, 'Clientes y Proyectos');
    await vis(page, 'PRY-2026-001').click();
    await page.getByTestId('register-payment').click();
    await expect(page).toHaveURL(/\/movements/);
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('700'); // Excel: Wilmer debe S/ 700
    await expect(dlg.getByTestId('project-balance')).toContainText('S/ 700.00');
    await expect(dlg.getByTestId('project-payment-note')).toContainText('queda pagado por completo');
    await expect(dlg.getByLabel('¿Qué fue?')).toHaveValue(/^Pago de /);
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(rowOf(page, 'S/ 700.00')).toContainText('Cobrado');

    await go(page, 'Clientes y Proyectos');
    await vis(page, 'PRY-2026-001').click();
    await expect(page.getByText('✓ Pagado completo')).toBeVisible();
    await expect(page.getByTestId('register-payment')).toHaveCount(0);
    await noHorizontalScroll(page);
  });

  test('desde Ingresos: elegir el proyecto rellena lo que falta y avisa cuánto quedará', async ({ page }) => {
    await go(page, 'Ingresos y egresos');
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByTestId('quick-kind-ingreso').click();
    const select = dlg.getByLabel('¿Es el pago de un proyecto?');
    const option = await select.locator('option', { hasText: 'PRY-2026-002' }).getAttribute('value');
    await select.selectOption(option!);
    await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('1600'); // Excel: Erika debe S/ 1,600
    await dlg.getByLabel('Monto (S/)').fill('600');
    await expect(dlg.getByTestId('project-payment-note')).toContainText('faltarán S/ 1,000.00');
    await dlg.getByTestId('fill-pending').click();
    await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('1600');
    await noHorizontalScroll(page);
  });
});
