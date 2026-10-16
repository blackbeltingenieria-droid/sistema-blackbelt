import { expect, test, type Page } from '@playwright/test';
import { EXCEL_CLIENTES, EXCEL_EGRESOS, EXCEL_INGRESOS, EXCEL_INVERSIONES, EXCEL_TOTALES } from '../src/features/excel-data/excel-raw';
import { go, login } from './helpers';

// Prueba de punta a punta: se cargan TODAS las filas del Excel «CUADRO DE COSTOS» A MANO por la página
// (modo vacío, puerto 5175), como lo haría una persona, y al final la página debe cuadrar con el Excel.
// Solo en escritorio (es larga). Mide el tiempo por registro para saber si es fácil de ingresar.
test.use({ baseURL: 'http://127.0.0.1:5175' });

const CATEGORY_CHIP: Record<string, string> = {
  SOFT: 'Software y apps', SERV: 'Servicios (luz, internet, celular)', MO: 'Especialistas y personal', PUB: 'Publicidad',
  MOV: 'Transporte y viáticos', ADM: 'Trámites', MAT: 'Materiales', OTR: 'Otros',
};
function categoryOf(group: string, product: string, spec: string): string {
  const g = group.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (g === 'HERRAMIENTAS DIGITALES') return 'SOFT';
  if (g === 'SERVICIO TELEFONICO') return 'SERV';
  if (g === 'SERVICIOS DE INVESTIGACION') return 'MO';
  if (g === 'MARKETING DIGITAL') return product.startsWith('PUBLICIDAD') ? 'PUB' : 'MO';
  if (g === 'TRANSPORTES Y TRAMITES') return product === 'TRANSPORTE' || /transporte/i.test(spec) ? 'MOV' : 'ADM';
  if (g === 'HERRAMIENTA') return 'MAT';
  return 'OTR';
}
const clientOfIncome = (r: (typeof EXCEL_INGRESOS)[number]) =>
  EXCEL_CLIENTES.find((c) => (r.doc && c.doc === r.doc) || c.name.startsWith(r.client.split(' ')[0])) as (typeof EXCEL_CLIENTES)[number];
const projectClientOfExpense = (spec: string): string | null =>
  /wilmer|teddy/i.test(spec) ? EXCEL_CLIENTES[0].name : /jhimmy/i.test(spec) ? EXCEL_CLIENTES[2].name : null;

async function selectOptionContaining(page: Page, selector: string, text: string) {
  const value = await page.locator(`${selector} option`, { hasText: text }).first().getAttribute('value');
  await page.locator(selector).selectOption(value as string);
}

test('el Excel cargado a mano por la página cuadra con el Excel', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-1280', 'Prueba larga: solo en escritorio');
  test.setTimeout(15 * 60_000);
  const t0 = Date.now();
  await login(page, 'Henry Torres');

  // 1) Clientes y proyectos (TABLA_CLIENTES)
  await go(page, 'Clientes y Proyectos');
  for (const c of EXCEL_CLIENTES) {
    await page.getByRole('button', { name: /Nuevo proyecto/ }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: '+ Nuevo cliente' }).click();
    await dlg.locator('input[name="newClientName"]').fill(c.name);
    if (c.doc) await dlg.locator('input[name="newClientDocNumber"]').fill(c.doc);
    if (c.phone) await dlg.locator('input[name="newClientPhone"]').fill(c.phone);
    await dlg.locator('input[name="service"]').fill(c.service);
    await selectOptionContaining(page, 'select[name="businessUnitId"]', 'UN03');
    await dlg.locator('input[name="contractedAmount"]').fill(String(c.contracted));
    await dlg.locator('input[name="startDate"]').fill(c.start);
    await dlg.locator('input[name="endDate"]').fill(c.end);
    await dlg.getByRole('button', { name: 'Crear proyecto' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 8000 });
  }
  const tProjects = Date.now();

  // 2) Ingresos (TABLA_INGRESOS): Ingreso → proyecto → monto, qué fue, fecha, medio
  await go(page, 'Ingresos y egresos');
  for (const r of EXCEL_INGRESOS) {
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByTestId('quick-kind-ingreso').click();
    await selectOptionContaining(page, '#q-income-project', clientOfIncome(r).name);
    await dlg.getByLabel('Monto (S/)').fill(String(r.amount));
    await dlg.getByLabel('¿Qué fue?').fill(r.spec);
    await dlg.getByLabel('Fecha').fill(r.date);
    await dlg.getByRole('button', { name: r.method, exact: true }).click();
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const tIncomes = Date.now();

  // 3) Egresos (TABLA_EGRESOS): Egreso → qué fue, monto, fecha, medio, y en "Más detalles" para quién y en qué
  for (const r of EXCEL_EGRESOS) {
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('¿Qué fue?').fill(`${r.product} – ${r.spec}`);
    await dlg.getByLabel('Monto (S/)').fill(String(r.amount));
    await dlg.getByLabel('Fecha').fill(r.date);
    await dlg.getByRole('button', { name: r.method, exact: true }).click();
    await dlg.getByTestId('quick-more').click();
    await dlg.getByRole('button', { name: r.unit === 'GENERAL' ? 'Toda la empresa' : /Solo Investigación y Desarrollo/ }).click();
    const projectClient = r.unit === 'GENERAL' ? null : projectClientOfExpense(r.spec);
    if (projectClient) await selectOptionContaining(page, '#q-project', projectClient);
    await dlg.getByRole('button', { name: CATEGORY_CHIP[categoryOf(r.group, r.product, r.spec)], exact: true }).click();
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const tExpenses = Date.now();

  // 4) Inversiones (TABLA_INVERSIONES)
  await go(page, 'Inversiones');
  for (const r of EXCEL_INVERSIONES) {
    await page.getByTestId('inv-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.locator('#inv-name').fill(r.name);
    await dlg.locator('#inv-doc').fill(r.doc);
    await dlg.locator('#inv-amount').fill(String(r.amount));
    await dlg.locator('#inv-date').fill(r.date);
    await dlg.getByRole('button', { name: r.method, exact: true }).click();
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const tInvest = Date.now();

  // 5) ¿Cuadra con el Excel?
  const fmt = (n: number) => `S/ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  await expect(page.getByTestId('inv-kpis')).toContainText(fmt(EXCEL_TOTALES.inversion));
  await expect(page.getByTestId('inv-kpis')).toContainText('26.68 %');

  await go(page, 'Ingresos y egresos');
  await page.locator('#f-month').selectOption('');
  await expect(page.getByText(fmt(EXCEL_TOTALES.ingresos)).first()).toBeVisible();
  await expect(page.getByText(fmt(EXCEL_TOTALES.egresos)).first()).toBeVisible();
  await expect(page.getByText(/No cuentan todavía/).locator('..')).toContainText('0');

  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-cash')).toHaveText(fmt(EXCEL_TOTALES.fondoEnCaja));
  const since = page.getByTestId('summary-since-start');
  await expect(since).toContainText(fmt(EXCEL_TOTALES.ingresos));
  await expect(since).toContainText(fmt(EXCEL_TOTALES.egresos));
  await expect(since).toContainText(fmt(EXCEL_TOTALES.ingresos - EXCEL_TOTALES.egresos));
  await expect(page.getByText(`Te deben ${fmt(EXCEL_TOTALES.faltaCobrar)}`)).toBeVisible();

  const per = (from: number, to: number, n: number) => ((to - from) / 1000 / n).toFixed(1);
  console.log(`[tiempos] proyectos ${per(t0, tProjects, EXCEL_CLIENTES.length)} s c/u · ingresos ${per(tProjects, tIncomes, EXCEL_INGRESOS.length)} s c/u · egresos ${per(tIncomes, tExpenses, EXCEL_EGRESOS.length)} s c/u · inversiones ${per(tExpenses, tInvest, EXCEL_INVERSIONES.length)} s c/u`);
});
