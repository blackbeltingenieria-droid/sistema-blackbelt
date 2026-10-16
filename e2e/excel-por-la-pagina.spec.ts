import { expect, test, type Page } from '@playwright/test';
import { EXCEL_CLIENTES, EXCEL_EGRESOS, EXCEL_INGRESOS, EXCEL_INVERSIONES, EXCEL_MANO_OBRA, EXCEL_TOTALES } from '../src/features/excel-data/excel-raw';
import { XLS_CLIENTS, XLS_LABOR_CONTRACTS, XLS_PROJECTS } from '../src/features/excel-data/excel-dataset';
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
/** Colaborador al que se le paga en un egreso (como en TABLA_M.O). TEDDY antes que EDDY. */
const workerOfExpense = (spec: string): string | null => {
  const s = spec.toUpperCase();
  return s.includes('TEDDY') ? 'TEDDY' : s.includes('EDDY') ? 'EDDY' : s.includes('JHIMMY') ? 'JHIMMY' : s.includes('ALANIS') ? 'ALANIS'
    : s.includes('(HENRY)') ? 'HENRY' : s.includes('ASESORAMIENTO DE INVESTIGACION') ? 'MANUEL' : null;
};
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
  const fmt = (n: number) => `S/ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  // 1b) Mano de obra (TABLA_M.O): un contrato por colaborador
  await go(page, 'Mano de obra');
  for (const c of XLS_LABOR_CONTRACTS) {
    await page.getByTestId('labor-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.locator('#lc-worker').fill(c.name);
    await dlg.locator('#lc-doc').fill(c.doc);
    await dlg.locator('#lc-service').fill(c.service);
    const project = XLS_PROJECTS.find((p) => p.id === c.projectId);
    if (project) await selectOptionContaining(page, '#lc-project', (XLS_CLIENTS.find((x) => x.id === project.clientId) as { name: string }).name);
    else await dlg.getByRole('button', { name: c.unitCode === 'CORP' ? 'Toda la empresa' : /Solo Investigación y Desarrollo/ }).click();
    await dlg.getByRole('button', { name: c.type === 'MENSUAL' ? 'Mensual' : 'Por proyecto', exact: true }).click();
    await dlg.locator('#lc-amount').fill(String(c.agreed));
    await dlg.locator('#lc-start').fill(c.start);
    await dlg.locator('#lc-end').fill(c.end);
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const tLabor = Date.now();

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

  // 3) Egresos (TABLA_EGRESOS): Egreso → qué fue, monto, fecha, medio, y en "Más detalles" para quién y en qué.
  //    Los pagos a colaboradores se enlazan a su contrato ("¿Es pago a un colaborador?") mientras no pasen lo acordado.
  const linkedSoFar = new Map<string, number>();
  for (const r of EXCEL_EGRESOS) {
    await page.getByTestId('quick-open').click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('¿Qué fue?').fill(`${r.product} – ${r.spec}`);
    await dlg.getByLabel('Monto (S/)').fill(String(r.amount));
    await dlg.getByLabel('Fecha').fill(r.date);
    await dlg.getByRole('button', { name: r.method, exact: true }).click();
    const who = categoryOf(r.group, r.product, r.spec) === 'MO' ? workerOfExpense(r.spec) : null;
    const contract = who ? EXCEL_MANO_OBRA.find((m) => m.name.startsWith(who)) : undefined;
    if (contract && (linkedSoFar.get(contract.name) ?? 0) + r.amount <= contract.required + 0.001) {
      linkedSoFar.set(contract.name, (linkedSoFar.get(contract.name) ?? 0) + r.amount);
      await selectOptionContaining(page, '#q-labor', contract.name);
    }
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
  await go(page, 'Mano de obra');
  await expect(page.getByTestId('labor-kpis')).toContainText(fmt(EXCEL_TOTALES.manoObraRequerido));
  await expect(page.getByTestId('labor-kpis')).toContainText(fmt(EXCEL_TOTALES.manoObraPagado));
  await expect(page.getByTestId('labor-total-pending')).toHaveText(fmt(EXCEL_TOTALES.manoObraFalta));
  for (const m of EXCEL_MANO_OBRA) {
    const row = page.locator(`[data-testid="labor-row"][data-worker="${m.name}"]`);
    await expect(row.getByTestId('labor-paid')).toHaveText(fmt(m.paid));
    await expect(row.getByTestId('labor-pending')).toHaveText(fmt(m.pending));
  }

  await go(page, 'Inversiones');
  await expect(page.getByTestId('inv-kpis')).toContainText(fmt(EXCEL_TOTALES.inversion));
  await expect(page.getByTestId('inv-kpis')).toContainText('26.68 %');

  await go(page, 'Ingresos y egresos');
  await page.locator('#f-month').selectOption('');
  await expect(page.getByText(fmt(EXCEL_TOTALES.ingresos)).first()).toBeVisible();
  await expect(page.getByText(fmt(EXCEL_TOTALES.egresos)).first()).toBeVisible();
  await expect(page.getByText(/No cuentan todavía/).locator('..')).toContainText('0');

  await go(page, 'Resultados y caja');
  await expect(page.getByTestId('summary-cash')).toHaveText(fmt(EXCEL_TOTALES.fondoEnCaja));
  // Todo desde el inicio = el Excel completo (incluye los adelantos de octubre 2025)
  await page.getByTestId('period-all').click();
  await expect(page.getByTestId('summary-income')).toHaveText(fmt(EXCEL_TOTALES.ingresos));
  await expect(page.getByTestId('summary-spent')).toHaveText(fmt(EXCEL_TOTALES.egresos));
  await expect(page.getByTestId('summary-cash')).toHaveText(fmt(EXCEL_TOTALES.fondoEnCaja));
  await page.getByTestId('period-month').click();
  await page.locator('#rc-month').selectOption('2025-10');
  await expect(page.getByTestId('summary-income')).toHaveText(fmt(3550));
  await page.locator('#rc-month').selectOption('2026-10');
  const since = page.getByTestId('summary-since-start');
  await expect(since).toContainText(fmt(EXCEL_TOTALES.ingresos));
  await expect(since).toContainText(fmt(EXCEL_TOTALES.egresos));
  await expect(since).toContainText(fmt(EXCEL_TOTALES.ingresos - EXCEL_TOTALES.egresos));
  await expect(page.getByText(`Te deben ${fmt(EXCEL_TOTALES.faltaCobrar)}`)).toBeVisible();

  const per = (from: number, to: number, n: number) => ((to - from) / 1000 / n).toFixed(1);
  console.log(`[tiempos] proyectos ${per(t0, tProjects, EXCEL_CLIENTES.length)} s c/u · contratos M.O ${per(tProjects, tLabor, XLS_LABOR_CONTRACTS.length)} s c/u · ingresos ${per(tLabor, tIncomes, EXCEL_INGRESOS.length)} s c/u · egresos ${per(tIncomes, tExpenses, EXCEL_EGRESOS.length)} s c/u · inversiones ${per(tExpenses, tInvest, EXCEL_INVERSIONES.length)} s c/u`);
});
