import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

test.describe('Inversiones', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Henry Torres'); });

  test('muestra el aporte real del socio, su rendimiento y el préstamo de S/ 500 por devolver', async ({ page }) => {
    await go(page, 'Inversiones');
    await expect(page.getByTestId('inv-headline')).toContainText('Por cada S/ 1 que pusieron los socios, la empresa perdió S/ 1.23');
    await expect(page.getByTestId('inv-kpis')).toContainText('S/ 1,500.00');
    await expect(page.getByTestId('inv-kpis')).toContainText('-123.37 %');
    await expect(page.getByTestId('inv-investors')).toContainText('HANS CARLOS TORRES MURRIETA');
    await expect(page.getByTestId('inv-value-today')).toHaveText(/350\.52/);   // 1,500 − 1,850.52
    const hans = page.getByTestId('inv-debts').locator('li', { hasText: 'HANS CARLOS TORRES MURRIETA' });
    await expect(hans.getByTestId('inv-outstanding')).toHaveText('S/ 500.00');
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
    const banco = page.getByTestId('inv-debts').locator('li', { hasText: 'BANCO E2E' });
    await expect(banco.getByTestId('inv-outstanding')).toHaveText('S/ 1,200.00');

    await banco.getByRole('button', { name: 'Registrar pago' }).click();
    const form = page.getByTestId('loan-payment-form');
    await expect(form.locator('#lp-interest')).toHaveValue('12');
    await expect(form.locator('#lp-capital')).toHaveValue('94.62');
    await form.getByRole('button', { name: 'Guardar pago' }).click();
    await expect(banco.getByTestId('inv-outstanding')).toHaveText('S/ 1,105.38');

    // Caja: 149.48 + 1,200 (préstamo) − 94.62 (capital) − 12 (intereses) = 1,242.86
    await go(page, 'Resultados y caja');
    await expect(page.getByTestId('summary-cash')).toHaveText('S/ 1,242.86');
  });
});
