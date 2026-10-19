import { expect, test } from '@playwright/test';
import { go, rowOf, vis, login, noHorizontalScroll } from './helpers';

test.describe('Admin: flujos principales', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Henry Torres');
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
    await expect(page.getByTestId('company-overview')).toBeVisible();   // abre en «Todo el tiempo»
    await page.getByTestId('dash-view-month').click();
    await expect(page.getByTestId('unit-row-CORP').or(page.locator('[data-testid^="unit-row-"]').first())).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('registrar horas-hombre de una hora a otra, con almuerzo', async ({ page }) => {
    await go(page, 'Horas-hombre');
    await page.getByLabel('Persona').selectOption({ index: 1 });
    await page.getByLabel('Proyecto', { exact: true }).selectOption({ index: 1 });
    await page.locator('#wh-start').fill('08:00');
    await page.locator('#wh-end').fill('17:30');
    await page.getByRole('button', { name: '+ Almuerzo 13:00–14:00' }).click();
    await expect(page.getByTestId('hours-total')).toContainText('Total: 8 h 30 min');
    await expect(page.getByTestId('hours-total')).toContainText('1 h de descanso');
    await page.getByLabel(/¿Qué hiciste\?/).fill('Hora E2E');
    await page.getByRole('button', { name: 'Registrar horas' }).click();
    await expect(vis(page, '08:00–17:30')).toBeVisible();
    await expect(vis(page, '8 h 30 min')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('un descanso fuera del horario muestra un aviso claro', async ({ page }) => {
    await go(page, 'Horas-hombre');
    await page.locator('#wh-start').fill('08:00');
    await page.locator('#wh-end').fill('12:00');
    await page.getByRole('button', { name: '+ Agregar descanso' }).click();
    await page.locator('#wh-b0-s').fill('12:30');
    await page.locator('#wh-b0-e').fill('13:00');
    await expect(page.getByTestId('hours-total')).toContainText('dentro del horario');
  });

  test('recorre todas las pantallas sin desborde horizontal', async ({ page }) => {
    for (const l of ['Ingresos y egresos', 'Clientes y Proyectos', 'Presupuesto', 'Resultados y caja', 'Kanban', 'Horas-hombre', 'Equipo', 'Dashboard']) {
      await go(page, l);
      await page.waitForTimeout(300);
      await noHorizontalScroll(page);
    }
  });
});

// Kanban y colaboradores: los datos reales del Excel no traen tareas ni colaboradores → datos demo (5174).
test.describe('Kanban (datos demo)', () => {
  test.use({ baseURL: 'http://127.0.0.1:5174' });
  test.beforeEach(async ({ page }) => { await login(page, 'Henry Torres'); });

  test('mover una tarea en Kanban', async ({ page }) => {
    await go(page, 'Kanban');
    await page.locator('a[href^="/kanban/"]').first().click();
    const tabs = page.locator('[role="tablist"][aria-label="Columnas del tablero"]');
    await expect(tabs).toBeAttached();
    // En celular/tablet se ve una columna a la vez: se elige una que tenga tareas.
    const withTasks = tabs.getByRole('tab').filter({ hasText: /^[1-9]/ }).first();
    if (await withTasks.isVisible()) await withTasks.click();
    const before = await tabs.textContent();
    const btn = page.getByRole('button', { name: /^Mover a / }).locator('visible=true').last();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect.poll(async () => tabs.textContent()).not.toBe(before); // los contadores por columna cambian
    await noHorizontalScroll(page);
  });

});

test.describe('Colaborador: acceso restringido', () => {
  test.use({ baseURL: 'http://127.0.0.1:5174' });
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
