import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

test.describe('Inversiones', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Henry Torres'); });

  test('muestra el aporte real del socio y su rendimiento', async ({ page }) => {
    await go(page, 'Inversiones');
    await expect(page.getByTestId('inv-headline')).toContainText('Por cada S/ 1 que pusieron los socios, la empresa ganó S/ 0.27');
    await expect(page.getByTestId('inv-kpis')).toContainText('S/ 1,500.00');
    await expect(page.getByTestId('inv-kpis')).toContainText('26.68 %');
    await expect(page.getByTestId('inv-investors')).toContainText('HANS CARLOS TORRES MURRIETA');
    await expect(page.getByTestId('inv-value-today')).toHaveText('S/ 1,900.27');
    await noHorizontalScroll(page);
  });

  test('un préstamo entra a caja; su pago se rellena solo con la cuota y baja la deuda', async ({ page }) => {
    await go(page, 'Inversiones');
    await page.getByTestId('inv-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByTestId('inv-kind-deuda').click();
    await dlg.locator('#inv-name').fill('Banco E2E');
    await dlg.locator('#inv-amount').fill('1200');
    await dlg.locator('#inv-rate').fill('12');
    await dlg.locator('#inv-term').fill('12');
    await expect(dlg.getByTestId('inv-installment')).toContainText('S/ 106.62');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('inv-outstanding')).toHaveText('S/ 1,200.00');

    await page.getByRole('button', { name: 'Registrar pago' }).click();
    const form = page.getByTestId('loan-payment-form');
    await expect(form.locator('#lp-interest')).toHaveValue('12');
    await expect(form.locator('#lp-capital')).toHaveValue('94.62');
    await form.getByRole('button', { name: 'Guardar pago' }).click();
    await expect(page.getByTestId('inv-outstanding')).toHaveText('S/ 1,105.38');

    // Caja: 1,900.27 + 1,200 (préstamo) − 94.62 (capital) − 12 (intereses) = 2,993.65
    await go(page, 'Resultados y caja');
    await expect(page.getByTestId('summary-cash')).toHaveText('S/ 2,993.65');
  });
});
