import { expect, test, type Page } from '@playwright/test';
import { go, login, noHorizontalScroll, rowOf, vis } from './helpers';

// Registro simple (Ingreso / Egreso) y Resumen "¿ganas o pierdes?". Datos demo (puerto 5174).
test.use({ baseURL: 'http://127.0.0.1:5174' });

const money = async (page: Page, id: string) =>
  Number(((await page.getByTestId(id).textContent()) ?? '').replace(/[^\d.-]/g, ''));

test.describe('Registro simple y resumen del negocio', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Admin General'); });

  test('el resumen dice si gana o pierde, por qué, y cuadra: vendiste − gastaste = resultado', async ({ page }) => {
    await go(page, 'Resultados y caja');
    await expect(page.getByTestId('summary-verdict')).toContainText(/Estás (ganando|perdiendo)/);
    await expect(page.getByTestId('summary-reasons').locator('li').first()).toContainText('Vendiste');
    const verdict = (await page.getByTestId('summary-verdict').textContent()) ?? '';
    const result = Number(verdict.replace(/[^\d.]/g, '')) * (verdict.includes('perdiendo') ? -1 : 1);
    const income = await money(page, 'summary-income');
    const spent = await money(page, 'summary-spent');
    expect(Math.abs(income - spent - result)).toBeLessThan(0.01);
    await expect(page.getByTestId('summary-expenses').locator('li').first()).toBeVisible();
    await expect(page.getByTestId('summary-trend').locator('li')).toHaveCount(6);
    await noHorizontalScroll(page);
  });

  test('un egreso pagado se registra con 3 datos: crea el gasto y su pago, y cuenta al guardar', async ({ page }) => {
    await go(page, 'Ingresos y egresos');
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Monto (S/)').fill('39.90');
    await dlg.getByLabel('¿Qué fue?').fill('Bitel mensajes E2E');
    await expect(dlg.getByTestId('quick-suggestion')).toContainText('Servicios');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const row = rowOf(page, 'Bitel mensajes E2E');
    await expect(row).toContainText('Cuenta');
    await expect(row).toContainText('Pagado');
    await expect(row).toContainText('Toda la empresa');

    // En la vista contable aparecen las dos filas del Modelo C
    await page.getByTestId('toggle-view').click();
    await expect(page.getByText('COSTO_RECONOCIDO').locator('visible=true').first()).toBeVisible();
    await expect(page.getByText('S/ 39.90').locator('visible=true')).toHaveCount(2);
    await noHorizontalScroll(page);
  });

  test('un ingreso pide la unidad y sube "Vendiste" en el resumen', async ({ page }) => {
    await go(page, 'Resultados y caja');
    const before = await money(page, 'summary-income');

    await go(page, 'Ingresos y egresos');
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByTestId('quick-kind-ingreso').click();
    await dlg.getByLabel('Monto (S/)').fill('1000');
    await dlg.getByLabel('¿Qué fue?').fill('Venta E2E');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(dlg.getByRole('alert')).toContainText('unidad');
    await dlg.getByRole('button', { name: /Investigación y Desarrollo/ }).first().click();
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(rowOf(page, 'Venta E2E')).toContainText('Cobrado');

    await go(page, 'Resultados y caja');
    await expect.poll(() => money(page, 'summary-income')).toBeCloseTo(before + 1000, 2);
  });

  test('eliminar desde el formulario pide confirmación y quita el registro', async ({ page }) => {
    await go(page, 'Ingresos y egresos');
    await page.getByTestId('quick-open').click();
    let dlg = page.getByRole('dialog');
    await dlg.getByLabel('Monto (S/)').fill('12.34');
    await dlg.getByLabel('¿Qué fue?').fill('Borrar E2E');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await rowOf(page, 'Borrar E2E').getByRole('button', { name: 'Editar' }).click();
    dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: 'Eliminar registro' }).click();
    await dlg.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(vis(page, 'Borrar E2E')).toHaveCount(0);
  });
});
