import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll, vis } from './helpers';

// Presupuesto simple: ¿cómo voy?, poner meta y copiar del mes anterior. Datos demo (puerto 5174).
test.use({ baseURL: 'http://127.0.0.1:5174' });

test.describe('Presupuesto simple', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Admin General'); });

  test('¿Cómo voy? dice si vas bien, con ventas, gastos y cada unidad; el Resumen de caja lo repite', async ({ page }) => {
    await go(page, 'Presupuesto');
    await expect(page.getByTestId('budget-verdict')).toHaveText(/Vas bien|Cuidado|Las ventas|cerca del límite/);
    await expect(page.getByTestId('budget-sales-text')).toContainText('Vendiste');
    await expect(page.getByTestId('budget-spend-text')).toContainText('Gastaste');
    await expect(page.getByTestId('budget-units').locator('li').first()).toBeVisible();
    await page.getByRole('button', { name: '¿Qué es el presupuesto y cómo se lee?' }).click();
    await expect(page.getByText('El presupuesto es tu plan del mes:')).toBeVisible();
    await noHorizontalScroll(page);

    const verdict = (await page.getByTestId('budget-verdict').textContent()) ?? '';
    await go(page, 'Resultados y caja');
    await expect(page.getByTestId('summary-budget')).toContainText(verdict);
  });

  test('poner una meta en 3 pasos y verla en Mis metas', async ({ page }) => {
    await go(page, 'Presupuesto');
    await page.getByTestId('budget-add').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: /Investigación y Desarrollo/ }).click();
    await dlg.getByLabel(/¿Cuánto planeas vender\?/).fill('4321');
    await dlg.getByLabel(/¿Cuánto quieres gastar como máximo\?/).fill('1234');
    await dlg.getByRole('button', { name: 'Guardar meta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Mis metas' }).click();
    await expect(vis(page, 'S/ 4,321.00')).toBeVisible();
    await expect(vis(page, 'S/ 1,234.00')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('Toda la empresa no pide ventas; copiar metas avisa el resultado', async ({ page }) => {
    await go(page, 'Presupuesto');
    await page.getByTestId('budget-add').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: /Toda la empresa/ }).click();
    await expect(dlg.getByLabel(/¿Cuánto planeas vender\?/)).toHaveCount(0);
    await dlg.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('tab', { name: 'Mis metas' }).click();
    await page.getByRole('button', { name: 'Copiar metas del mes anterior' }).click();
    await expect(page.getByRole('status')).toContainText(/copiaron|No había metas/);
  });
});
