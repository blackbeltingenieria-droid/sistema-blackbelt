import { describe, expect, it } from 'vitest';
import { EXCEL_TOTALES } from './excel-raw';
import { XLS_CLIENTS, XLS_MOVEMENTS, XLS_PROJECTS, XLS_SPECIALISTS, datasetTotals } from './excel-dataset';

describe('datos reales del Excel', () => {
  const t = datasetTotals();
  it('cuadran con los totales del Excel', () => {
    expect(t.ingresos).toBe(EXCEL_TOTALES.ingresos);
    expect(t.cobros).toBe(EXCEL_TOTALES.ingresos);
    expect(t.egresos).toBe(EXCEL_TOTALES.egresos);
    expect(t.pagos).toBe(EXCEL_TOTALES.egresos);
    expect(t.inversion).toBe(EXCEL_TOTALES.inversion);
    expect(t.fondoEnCaja).toBe(EXCEL_TOTALES.fondoEnCaja);
    expect(t.contratado).toBe(EXCEL_TOTALES.contratado);
    expect(t.pagadoClientes).toBe(EXCEL_TOTALES.pagadoClientes);
  });
  it('13 clientes, 13 proyectos, 8 especialistas y 165 movimientos (12×2 + 69×2 + 3)', () => {
    expect(XLS_CLIENTS).toHaveLength(13);   // sin los números de cuenta (filas 39–44) ni Diana duplicada (fila 21)
    expect(XLS_PROJECTS).toHaveLength(13);
    expect(XLS_SPECIALISTS).toHaveLength(8);
    expect(XLS_MOVEMENTS).toHaveLength(12 * 2 + 69 * 2 + 3);
  });
  it('códigos únicos y correlativos por fecha', () => {
    const codes = XLS_MOVEMENTS.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
    // La empresa empezó en 2026: todo es MOV-2026-NNNN, en orden de fecha.
    expect(codes[0]).toBe('MOV-2026-0001');
    expect(XLS_MOVEMENTS.every((m) => m.date >= '2026-01-01' && m.code.startsWith('MOV-2026-'))).toBe(true);
    expect(XLS_MOVEMENTS.every((m, i) => i === 0 || XLS_MOVEMENTS[i - 1].date <= m.date)).toBe(true);
  });
  it('lo que falta cobrar por proyecto coincide con TABLA_CLIENTES', () => {
    const paid = (pid: number) => XLS_MOVEMENTS.filter((m) => m.type === 'COBRO' && m.projectId === pid).reduce((a, m) => a + m.amount, 0);
    const pending = XLS_PROJECTS.reduce((a, p) => a + (p.contracted - paid(p.id)), 0);
    expect(pending).toBe(EXCEL_TOTALES.faltaCobrar);   // 9,440 = 12,440 del Excel − 3,000 de Diana duplicada
  });
});

describe('filas locales', () => {
  it('todos los movimientos pasan el control (VALIDADO + OK) y el resultado = ingresos − egresos', async () => {
    const { EXCEL_DB_MOVEMENTS } = await import('./excel-local');
    const { enrichMovement, isEligible } = await import('../movements/domain/movement-rules');
    const { SEED_BUSINESS_UNITS } = await import('../catalogs/services/seed-data');
    const { computeResults, computeCash } = await import('../results-cash/domain/calculations');
    const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
    const enriched = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));
    expect(enriched.filter((m) => !isEligible(m)).map((m) => `${m.movement_code} ${m.control}`)).toEqual([]);
    const months = [...new Set(enriched.map((m) => m.mes))];
    const result = months.reduce((a, mes) => a + computeResults(enriched, mes, {}).totals.finalResult, 0);
    expect(Math.round(result * 100) / 100).toBe(Math.round((EXCEL_TOTALES.ingresos - EXCEL_TOTALES.egresos) * 100) / 100);
    expect(computeCash(enriched, '2026-11', 0).closingBalance).toBe(EXCEL_TOTALES.fondoEnCaja);
    // Octubre 2026: Sthefany 90 + Anthenol 400 + Erika 400 + Wilmer 1,500 + Tania 2,050 + Ángeles 100.
    expect(computeResults(enriched, '2026-10', {}).totals.income).toBe(4540);
  });
});

describe('Excel del 12/11/2026', () => {
  it('ids fijos: proyecto = cliente = fila de TABLA_CLIENTES − 9 (las tareas y horas de la nube no se mueven)', () => {
    const rowOf = (clientId: number) => XLS_CLIENTS.find((c) => c.id === clientId)?.row;
    expect(XLS_PROJECTS.map((p) => [p.code, rowOf(p.clientId)])).toEqual(
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23].map((row) => [`PRY-2026-${String(row - 9).padStart(3, '0')}`, row]));
  });
  it('Diana (fila 21, mismo DNI que la fila 17) es un registro duplicado y no se carga', () => {
    expect(XLS_CLIENTS.filter((c) => c.doc === '76547570').map((c) => c.row)).toEqual([17]);
    expect(datasetTotals().contratado).toBe(15720);
  });
  it('la validación de expertos es costo directo del proyecto de Anthenol (Investigación y Desarrollo)', () => {
    const anthenol = XLS_PROJECTS.find((p) => p.name.includes('ANTHENOL'))?.id;
    const rows = XLS_MOVEMENTS.filter((m) => m.type === 'COSTO_RECONOCIDO' && m.detail.startsWith('Validación de expertos'));
    expect(rows.map((m) => [m.unitCode, m.categoryCode, m.cls, m.projectId])).toEqual(Array(4).fill(['UN03', 'TERC', 'DIRECTO', anthenol]));
    expect(rows.reduce((a, m) => a + m.amount, 0)).toBe(320);
  });
  it('S/ 500 de la fila 9 de TABLA_INVERSIONES es préstamo del socio (entra a caja, no es ingreso ni aporte)', async () => {
    const { XLS_INVESTMENTS } = await import('./excel-dataset');
    expect(XLS_INVESTMENTS.map((i) => [i.kind, i.amount])).toEqual([['patrimonio', 1000], ['patrimonio', 500], ['deuda', 500]]);
    const t = datasetTotals();
    expect(t.aportes).toBe(1500);
    expect(t.prestamos).toBe(500);
    expect(XLS_MOVEMENTS.filter((m) => m.type === 'PRESTAMO_RECIBIDO').map((m) => m.notes?.slice(0, 22))).toEqual(['Inversión INV-2026-003']);
  });
});
