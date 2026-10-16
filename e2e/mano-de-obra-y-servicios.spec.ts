import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

// Datos base = Excel real. Mano de obra (TABLA_M.O), Servicios y marketing, y periodos de Resultados y caja.

test('mano de obra: lo que falta pagar cuadra con el Excel y pagar se rellena solo', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Mano de obra');
  await expect(page.getByTestId('labor-headline')).toHaveText('Falta pagar S/ 1,400.00');
  await expect(page.getByTestId('labor-kpis')).toContainText('S/ 4,700.00');
  await expect(page.getByTestId('labor-kpis')).toContainText('S/ 3,300.00');
  await noHorizontalScroll(page);

  const teddy = page.locator('[data-testid="labor-row"][data-worker="TEDDY GARCIA MURRIETA"]');
  await expect(teddy.getByTestId('labor-pending')).toHaveText('S/ 250.00');
  await teddy.getByTestId('labor-pay').click();
  const form = teddy.getByTestId('labor-pay-form');
  await expect(form.getByLabel('Monto (S/)')).toHaveValue('250');
  await expect(form.getByTestId('labor-pay-note')).toHaveText('Con este pago queda todo pagado.');
  await form.getByRole('button', { name: 'YAPE' }).click();
  await form.getByRole('button', { name: 'Guardar pago' }).click();
  await expect(teddy.getByTestId('labor-pending')).toHaveText('S/ 0.00');
  await expect(page.getByTestId('labor-total-pending')).toHaveText('S/ 1,150.00');

  // El pago ya cuenta en caja
  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 1,650.27');
});

test('egreso: "¿Es pago a un colaborador?" rellena con lo que falta', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Ingresos y egresos');
  await page.getByTestId('quick-open').click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('#q-labor').selectOption({ label: 'JOHANN IMANOL HERRERA RAMOS · PRACTICANTE — falta S/ 700.00' });
  await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('700');
  await expect(dlg.getByLabel('¿Qué fue?')).toHaveValue(/Pago a JOHANN IMANOL HERRERA RAMOS/);
  await expect(dlg.getByTestId('labor-note')).toHaveText('Con este pago queda todo pagado.');
  await expect(dlg.getByTestId('quick-summary')).toContainText('Especialistas');
});

test('servicios y marketing: pagos que se repiten, por mes', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Servicios y marketing');
  await expect(page.getByTestId('rec-grand-total')).toHaveText('S/ 1,093.00');
  await expect(page.getByTestId('rec-total-servicios')).toHaveText('S/ 119.70');
  await expect(page.getByTestId('rec-total-marketing')).toHaveText('S/ 326.40');
  await noHorizontalScroll(page);
  await page.getByTestId('rec-group-herramientas').click();       // solo servicios + publicidad
  await expect(page.getByTestId('rec-grand-total')).toHaveText('S/ 446.10');
  // Pagar Bitel este mes: abre el registro ya lleno con lo de la última vez
  await page.locator('tr', { hasText: 'BITEL' }).getByTestId('rec-repeat').click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('39.9');
  await expect(dlg.getByLabel('¿Qué fue?')).toHaveValue('Bitel');
});

test('resultados y caja: un mes, varios meses y todo desde el inicio', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Resultados y caja');
  await page.getByTestId('period-all').click();
  await expect(page.getByTestId('summary-period')).toContainText('Desde el inicio');
  await expect(page.getByTestId('summary-income')).toHaveText('S/ 5,240.00');
  await expect(page.getByTestId('summary-spent')).toHaveText('S/ 4,839.73');
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 1,900.27');
  await expect(page.getByTestId('summary-verdict')).toHaveText('Estás ganando S/ 400.27');
  await noHorizontalScroll(page);

  await page.getByTestId('period-range').click();
  await page.locator('#rc-from').selectOption('2026-08');
  await page.locator('#rc-to').selectOption('2026-10');
  await expect(page.getByTestId('summary-income')).toHaveText('S/ 1,690.00');   // sin los adelantos de 2025
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 1,900.27');

  await page.getByTestId('period-month').click();
  await page.locator('#rc-month').selectOption('2025-10');
  await expect(page.getByTestId('summary-verdict')).toHaveText('Estás ganando S/ 3,550.00');

  await page.getByRole('tab', { name: 'Detalle' }).click();
  await page.getByTestId('period-year').click();               // toma el año del mes elegido: 2025
  await expect(page.getByTestId('cash-closing')).toHaveText('S/ 3,550.00');
  await page.locator('#rc-year').selectOption('2026');
  await expect(page.getByTestId('cash-closing')).toHaveText('S/ 1,900.27');
  await expect(page.getByTestId('cash-period-opening')).toHaveText('S/ 3,550.00');
});
