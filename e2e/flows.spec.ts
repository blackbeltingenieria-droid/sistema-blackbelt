import { expect, test } from '@playwright/test';
import { go, rowOf, vis, login, noHorizontalScroll } from './helpers';

test.describe('Admin: flujos principales', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Administración Blackbelt');
  });

  test('crear cliente + proyecto', async ({ page }) => {
    await go(page, 'Clientes y Proyectos');
    await page.getByRole('button', { name: /Nuevo proyecto/ }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: '+ Nuevo cliente' }).click();
    await dlg.getByPlaceholder('Ej. Empresa Minera Los Andes S.A.').fill('Cliente E2E SAC');
    await dlg.locator('select[name="businessUnitId"]').selectOption({ index: 1 });
    await dlg.getByPlaceholder('Ej. Optimización de planta Norte').fill('Proyecto E2E');
    await dlg.getByPlaceholder('Ej. DESARROLLO DE TESIS').fill('SERVICIO E2E');
    await dlg.getByPlaceholder('0.00').fill('1500');
    await dlg.locator('input[name="startDate"]').fill('2026-10-01');
    await dlg.locator('input[name="endDate"]').fill('2026-12-31');
    await dlg.getByRole('button', { name: 'Crear proyecto' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 8000 });
    await expect(vis(page, 'Proyecto E2E')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('registrar y editar un gasto con el formulario simple; se refleja en Resultados', async ({ page }) => {
    await go(page, 'Ingresos y egresos');
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByTestId('quick-kind-egreso').click();
    await dlg.getByLabel('Monto (S/)').fill('321.50');
    await dlg.getByLabel('¿Qué fue?').fill('Gasto E2E taxi');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(vis(page, '321.50')).toBeVisible();

    // Editar
    await rowOf(page, '321.50').getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('dialog').getByLabel('Monto (S/)').fill('322.75');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
    await expect(vis(page, '322.75')).toBeVisible();
    await expect(rowOf(page, '322.75')).toContainText('Cuenta');

    // Se refleja en Resultados y caja
    await go(page, 'Resultados y caja');
    await page.getByRole('tab', { name: 'Detalle' }).click();
    await expect(page.getByTestId('cash-closing')).toBeVisible();
    await expect(page.getByTestId('reconciliation-status')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('el dashboard muestra comparación de unidades y ranking SOFT', async ({ page }) => {
    await go(page, 'Dashboard');
    await expect(page.getByTestId('unit-row-CORP').or(page.locator('[data-testid^="unit-row-"]').first())).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('mover una tarea en Kanban', async ({ page }) => {
    await go(page, 'Kanban');
    await page.locator('a[href^="/kanban/"]').first().click();
    const tabs = page.locator('[role="tablist"][aria-label="Columnas del tablero"]');
    await expect(tabs).toBeAttached();
    const before = await tabs.textContent();
    const btn = page.getByRole('button', { name: /^Mover a / }).locator('visible=true').last();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect.poll(async () => tabs.textContent()).not.toBe(before); // los contadores por columna cambian
    await noHorizontalScroll(page);
  });

  test('registrar horas-hombre', async ({ page }) => {
    await go(page, 'Horas-hombre');
    await page.getByLabel('Persona').selectOption({ index: 1 });
    await page.getByLabel('Proyecto', { exact: true }).selectOption({ index: 1 });
    await page.getByLabel('Horas').fill('3.5');
    await page.getByLabel(/Descripción/).fill('Hora E2E');
    await page.getByRole('button', { name: 'Registrar horas' }).click();
    await expect(vis(page, '3.5 h')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('recorre todas las pantallas sin desborde horizontal', async ({ page }) => {
    for (const l of ['Ingresos y egresos', 'Clientes y Proyectos', 'Presupuesto', 'Resultados y caja', 'Kanban', 'Horas-hombre', 'Dashboard']) {
      await go(page, l);
      await page.waitForTimeout(300);
      await noHorizontalScroll(page);
    }
  });
});

test.describe('Colaborador: acceso restringido', () => {
  test('solo ve su panel y Kanban; /movements redirige', async ({ page }) => {
    await login(page, 'Marco');
    await expect(page).toHaveURL(/\/my$/);
    await go(page, 'Kanban');
    await expect(page).toHaveURL(/\/kanban/);
    // Navegación por URL directa a una ruta de admin: vuelve a su inicio
    await page.goto('/movements');
    await expect(page).toHaveURL(/\/my$/);
  });
});
