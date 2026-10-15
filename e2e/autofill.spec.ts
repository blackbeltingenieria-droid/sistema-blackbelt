import { expect, test } from '@playwright/test';
import { go, login } from './helpers';

// Autorrelleno: lo que se puede deducir se completa solo (siempre editable).
test.describe('Autorrelleno (datos base)', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Henry Torres'); });

  test('repetir un gasto conocido: escribir el concepto rellena monto, categoría y medio de pago', async ({ page }) => {
    await go(page, 'Ingresos y egresos');
    await page.getByTestId('quick-open').click();
    let dlg = page.getByRole('dialog');
    await dlg.getByLabel('¿Qué fue?').fill('Internet oficina E2E');
    await dlg.getByLabel('Monto (S/)').fill('89.90');
    await dlg.getByRole('button', { name: 'PLIN' }).click();
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByTestId('quick-open').click();
    dlg = page.getByRole('dialog');
    await dlg.getByLabel('¿Qué fue?').fill('internet oficina e2e');
    await expect(dlg.getByTestId('quick-memory')).toContainText('última vez');
    await expect(dlg.getByLabel('Monto (S/)')).toHaveValue('89.9');
    await expect(dlg.getByRole('button', { name: 'PLIN' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('nuevo proyecto: código, fechas, unidad, nombre y tipo de cliente se rellenan solos', async ({ page }) => {
    await go(page, 'Clientes y Proyectos');
    await page.getByRole('button', { name: /Nuevo proyecto/ }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.locator('input[name="code"]')).toHaveValue(/^PRY-\d{4}-\d{3}$/);
    await expect(dlg.locator('input[name="startDate"]')).not.toHaveValue('');
    await expect(dlg.locator('input[name="endDate"]')).not.toHaveValue('');
    await dlg.getByRole('button', { name: '+ Nuevo cliente' }).click();
    await dlg.locator('input[name="newClientName"]').fill('Ana Ríos');
    await dlg.locator('input[name="newClientDocNumber"]').fill('20601234567');
    await expect(dlg.locator('select[name="newClientType"]')).toHaveValue('Empresa');
    await dlg.locator('input[name="service"]').fill('Desarrollo de tesis');
    await expect(dlg.locator('select[name="businessUnitId"] option:checked')).toContainText('Investigación');
    await expect(dlg.locator('input[name="name"]')).toHaveValue('Desarrollo de tesis – Ana Ríos');
    await expect(dlg.getByTestId('project-autofill')).toBeVisible();
  });

  test('nuevo sprint: nombre y fechas de 2 semanas', async ({ page }) => {
    await go(page, 'Kanban');
    await page.locator('a[href^="/kanban/"]').first().click();
    await page.getByRole('button', { name: '+ Nuevo sprint' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByLabel('Nombre')).toHaveValue(/^Sprint \d+$/);
    await expect(dlg.getByLabel('Inicio')).not.toHaveValue('');
    await expect(dlg.getByLabel('Fin')).not.toHaveValue('');
  });
});

test.describe('Autorrelleno (datos demo)', () => {
  test.use({ baseURL: 'http://127.0.0.1:5174' });
  test.beforeEach(async ({ page }) => { await login(page, 'Henry Torres'); });

  test('horas: Henry entra y ya tiene persona, proyecto y horario de su último registro', async ({ page }) => {
    await go(page, 'Horas-hombre');
    await expect(page.getByTestId('hours-hint')).toBeVisible();
    await expect(page.locator('#wh-end')).not.toHaveValue('');
    await expect(page.getByTestId('hours-total')).toContainText('Total:');
  });

  test('presupuesto: al elegir la unidad se rellena con lo del mes pasado', async ({ page }) => {
    await go(page, 'Presupuesto');
    await page.getByTestId('budget-add').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: /Investigación y Desarrollo/ }).click();
    await expect(dlg.getByTestId('budget-hint')).toContainText('El mes pasado');
    await expect(dlg.getByLabel(/¿Cuánto quieres gastar como máximo\?/)).not.toHaveValue('');
  });

  test('reparto: "Según las ventas del mes" rellena porcentajes que suman 100', async ({ page }) => {
    await go(page, 'Presupuesto');
    await page.getByRole('tab', { name: 'Reparto de gastos comunes' }).click();
    await page.getByRole('button', { name: 'Según las ventas del mes' }).click();
    let sum = 0;
    for (const c of ['UN01', 'UN02', 'UN03', 'UN04', 'UN05']) sum += Number((await page.locator(`#alloc-${c}`).inputValue()) || 0);
    expect(sum).toBe(100);
    await expect(page.locator('#alloc-note')).not.toHaveValue('');
  });
});
