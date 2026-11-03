import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll, rowOf } from './helpers';

// Datos base = Excel real. Mano de obra (TABLA_M.O), Servicios y marketing, y periodos de Resultados y caja.

test('mano de obra: lo que falta pagar cuadra con el Excel y pagar se rellena solo', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Mano de obra');
  await expect(page.getByTestId('labor-headline')).toHaveText('Falta pagar S/ 2,249.30');
  await expect(page.getByTestId('labor-kpis')).toContainText('S/ 5,940.00');
  await expect(page.getByTestId('labor-kpis')).toContainText('S/ 3,690.70');
  await noHorizontalScroll(page);

  const teddy = page.locator('[data-testid="labor-row"][data-worker="TEDDY GARCIA MURRIETA"]');
  await expect(teddy.getByTestId('labor-pending')).toHaveText('S/ 390.00');
  await teddy.getByTestId('labor-pay').click();
  const form = teddy.getByTestId('labor-pay-form');
  await expect(form.getByLabel('Monto (S/)')).toHaveValue('390');
  await expect(form.getByTestId('labor-pay-note')).toHaveText('Con este pago queda todo pagado.');
  await form.getByRole('button', { name: 'YAPE' }).click();
  await form.getByRole('button', { name: 'Guardar pago' }).click();
  await expect(teddy.getByTestId('labor-pending')).toHaveText('S/ 0.00');
  await expect(page.getByTestId('labor-total-pending')).toHaveText('S/ 1,859.30');

  // El pago ya cuenta en caja: 557.90 − 390 = 167.90
  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 167.90');
});

test('egreso: "¿Es pago a un colaborador?" rellena con lo que falta', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Ingresos y egresos');
  await page.getByTestId('quick-open').click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('#q-labor').selectOption({ label: 'JOHANN IMANOL HERRERA RAMOS · PRACTICANTE — falta S/ 800.00' });
  await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('800');
  await expect(dlg.getByLabel('¿Qué fue?')).toHaveValue(/Pago a JOHANN IMANOL HERRERA RAMOS/);
  await expect(dlg.getByTestId('labor-note')).toHaveText('Con este pago queda todo pagado.');
  await expect(dlg.getByTestId('quick-summary')).toContainText('Especialistas');
});

test('servicios y marketing: pagos que se repiten, por mes', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Servicios y marketing');
  await expect(page.getByTestId('rec-grand-total')).toHaveText('S/ 1,633.24');
  await expect(page.getByTestId('rec-total-servicios')).toHaveText('S/ 119.70');
  await expect(page.getByTestId('rec-total-marketing')).toHaveText('S/ 605.26');
  await noHorizontalScroll(page);
  await page.getByTestId('rec-group-herramientas').click();       // solo servicios + publicidad
  await expect(page.getByTestId('rec-grand-total')).toHaveText('S/ 724.96');
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
  await expect(page.getByTestId('summary-income')).toHaveText('S/ 5,340.00');
  await expect(page.getByTestId('summary-spent')).toHaveText('S/ 6,282.10');
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 557.90');
  await expect(page.getByTestId('summary-verdict')).toHaveText('Estás perdiendo S/ 942.10');
  await noHorizontalScroll(page);

  await page.getByTestId('period-range').click();
  await page.locator('#rc-from').selectOption('2026-09');
  await page.locator('#rc-to').selectOption('2026-10');
  await expect(page.getByTestId('summary-income')).toHaveText('S/ 5,340.00');   // todo se cobró en sep–oct
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 878.60');       // al cierre de octubre (noviembre gastó 320.70)

  await page.getByTestId('period-month').click();
  await page.locator('#rc-month').selectOption('2026-10');
  await expect(page.getByTestId('summary-income')).toHaveText('S/ 4,540.00');

  await page.getByRole('tab', { name: 'Detalle' }).click();
  await page.getByTestId('period-year').click();               // el año del mes elegido: 2026
  await expect(page.getByTestId('cash-closing')).toHaveText('S/ 557.90');
  await expect(page.getByTestId('cash-period-opening')).toHaveText('S/ 0.00');
});

test('pago a colaborador por error: se deshace y vuelve todo como estaba', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Mano de obra');
  const johann = page.locator('[data-testid="labor-row"][data-worker="JOHANN IMANOL HERRERA RAMOS"]');
  await johann.getByTestId('labor-pay').click();
  await johann.getByTestId('labor-pay-form').getByRole('button', { name: 'Guardar pago' }).click();
  await expect(johann.getByTestId('labor-pending')).toHaveText('S/ 0.00');
  await expect(page.getByTestId('labor-total-pending')).toHaveText('S/ 1,449.30');
  // Deshacer al instante
  await page.getByTestId('labor-undo-last').click();
  await expect(johann.getByTestId('labor-pending')).toHaveText('S/ 800.00');
  await expect(page.getByTestId('labor-total-pending')).toHaveText('S/ 2,249.30');
  // O después, desde "Pagos hechos"
  const teddy = page.locator('[data-testid="labor-row"][data-worker="TEDDY GARCIA MURRIETA"]');
  await teddy.getByText('Pagos hechos (2)').click();
  await teddy.getByTestId('labor-undo').first().click();
  await teddy.getByRole('button', { name: 'Sí, deshacer' }).click();
  await expect(teddy.getByTestId('labor-paid')).toHaveText('S/ 100.00');
  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-cash')).toHaveText('S/ 567.90');     // volvieron los S/ 10
});

test('editar un cobro ya guardado muestra lo que de verdad falta', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Ingresos y egresos');
  await page.locator('#f-month').selectOption('');
  await rowOf(page, 'MOV-2026-0059').getByRole('button', { name: 'Editar' }).click();
  const box = page.getByRole('dialog').getByTestId('project-balance');
  await expect(box).toContainText('S/ 400.00');                  // ya pagó
  await expect(box).toContainText('S/ 1,600.00');                // falta
  await expect(box.getByTestId('project-includes-this')).toBeVisible();
  await expect(box.getByTestId('fill-pending')).toHaveCount(0);
  await expect(box.getByTestId('project-payment-note')).toHaveText('Después de este pago faltarán S/ 1,600.00.');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await rowOf(page, 'MOV-2026-0075').getByRole('button', { name: 'Editar' }).click();
  const tania = page.getByRole('dialog').getByTestId('project-balance');
  await expect(tania).toContainText('S/ 2,050.00');
  await expect(tania.getByText('S/ 0.00')).toBeVisible();
  await expect(tania.getByTestId('project-payment-note')).toHaveText('Con este pago el proyecto queda pagado por completo.');
});

test('resultados: si se cobra y se paga todo (como Hoja1 del Excel)', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-projected')).toContainText('S/ 8,190.00');
  await expect(page.getByTestId('summary-projected')).toContainText('S/ 2,249.30');
  await expect(page.getByTestId('summary-projected')).toContainText('ganarías S/ 4,998.60');
});

test('dashboard: la empresa desde el inicio, con gráficos simples', async ({ page }) => {
  await login(page, 'Henry Torres');
  await expect(page.getByTestId('company-overview')).toBeVisible();          // abre en «Todo el tiempo»
  await expect(page.getByTestId('overview-verdict')).toHaveText('La empresa ha perdido S/ 942.10');
  await expect(page.getByTestId('ov-income')).toHaveText('S/ 5,340.00');
  await expect(page.getByTestId('ov-spent')).toHaveText('S/ 6,282.10');
  await expect(page.getByTestId('ov-cash')).toHaveText('S/ 557.90');
  await expect(page.getByTestId('ov-receivable')).toHaveText('S/ 8,190.00');
  await expect(page.getByTestId('ov-payable')).toHaveText('S/ 2,249.30');    // lo que falta pagar al equipo
  await expect(page.getByTestId('overview-months').locator('> div')).toHaveCount(4); // ago, sep, oct, nov 2026
  await expect(page.getByTestId('overview-sales')).toContainText('WILMER WILFREDO SANCHEZ MAMANI');
  await noHorizontalScroll(page);
  await page.getByTestId('dash-view-month').click();
  await expect(page.locator('#dash-month')).toBeVisible();
});

test('resumen: «Debes» incluye lo que falta pagar al equipo', async ({ page }) => {
  await login(page, 'Henry Torres');
  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-owes')).toHaveText('Te deben S/ 8,190.00 · Debes S/ 2,249.30');
  await expect(page.getByTestId('summary-trend').locator('li')).toHaveCount(4);  // ago–nov 2026, sin meses antes
});
