import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

// Corre contra `npm run dev:demo` (puerto 5174): datos de demostración en memoria.
test.use({ baseURL: 'http://127.0.0.1:5174' });

test.describe('Datos demo + Resultados y caja visual', () => {
  test('el Admin ve los 5 gráficos, KPIs con variación y frases simples, sin desbordes', async ({ page }) => {
    await login(page, 'Admin General');
    await go(page, 'Resultados y caja');
    await page.getByRole('tab', { name: 'Gráficos' }).click();
    for (const id of ['chart-unit-bars', 'chart-waterfall', 'chart-trend', 'chart-cash', 'chart-categories']) {
      await expect(page.getByTestId(id)).toBeVisible();
      await expect(page.getByTestId(id).locator('svg').first()).toBeVisible();
    }
    await expect(page.getByTestId('kpi-delta').first()).toContainText('vs mes anterior');
    await expect(page.getByTestId('kpi-note').first()).not.toBeEmpty();
    await expect(page.getByTestId('waterfall-result')).toBeVisible();
    await noHorizontalScroll(page);
    // ningún gráfico se sale de la pantalla
    const vw = page.viewportSize()!.width;
    for (const id of ['chart-unit-bars', 'chart-waterfall', 'chart-trend', 'chart-cash', 'chart-categories']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
    }
  });

  test('clic en una barra abre la lista de movimientos que la forman (trazabilidad)', async ({ page }) => {
    await login(page, 'Admin General');
    await go(page, 'Resultados y caja');
    await page.getByRole('tab', { name: 'Gráficos' }).click();
    await expect(page.getByTestId('chart-unit-bars')).toBeVisible();
    await page.getByTestId('chart-unit-bars').locator('.recharts-bar-rectangle path').first().click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('DEMO-');
  });

  test('la pestaña Detalle conserva las tablas y la conciliación', async ({ page }) => {
    await login(page, 'Admin General');
    await go(page, 'Resultados y caja');
    await page.getByRole('tab', { name: 'Detalle' }).click();
    await expect(page.getByTestId('reconciliation-status')).toBeVisible();
    await expect(page.getByTestId('cash-closing')).toBeVisible();
  });

  test('Mi panel del Admin con datos demo: resumen + alertas (control ≠ OK y reparto sin definir)', async ({ page }) => {
    await login(page, 'Admin General');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('alerts')).toContainText('control distinto de OK');
    await expect(page.getByTestId('alerts')).toContainText('Reparto CORP sin definir');
  });

  test('Henry Torres (Gerente General) ve el resumen y sus tareas personales', async ({ page }) => {
    await login(page, 'Henry Torres');
    await go(page, 'Mi panel');
    await expect(page.getByTestId('admin-summary')).toBeVisible();
    await expect(page.getByTestId('my-work')).toBeVisible();
  });

  test('un Colaborador demo ve solo lo suyo', async ({ page }) => {
    await login(page, 'Valeria');
    await expect(page).toHaveURL(/\/my$/);
    await expect(page.getByTestId('admin-summary')).toHaveCount(0);
    await expect(page.getByTestId('my-work')).toBeVisible();
  });
});
