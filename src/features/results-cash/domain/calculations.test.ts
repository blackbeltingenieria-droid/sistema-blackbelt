import { describe, expect, it } from 'vitest';
import { AREA_ID, CAT_ID, mov } from '../../../test/factories';
import {
  ALLOCATION_STATUS, allocationStatus, computeCash, computeResults, corpSharedExpense, effectivePct, summarizeAllocation,
} from './calculations';

const MES = '2026-10';

function scenario() {
  return [
    mov({ unit: 'UN03', record_type: 'INGRESO_RECONOCIDO', expense_class: 'NO_APLICA', amount: 1000, cost_category_id: CAT_ID.OTR }),
    mov({ unit: 'UN05', record_type: 'INGRESO_RECONOCIDO', expense_class: 'NO_APLICA', amount: 500, cost_category_id: CAT_ID.OTR }),
    mov({ unit: 'UN03', expense_class: 'DIRECTO', amount: 300, cost_category_id: CAT_ID.MO }),
    mov({ unit: 'UN03', expense_class: 'ATRIBUIBLE', amount: 100, cost_category_id: CAT_ID.PUB, area_id: AREA_ID.MKT }),
    mov({ unit: 'UN05', expense_class: 'DIRECTO', amount: 200, cost_category_id: CAT_ID.MO }),
    mov({ unit: 'CORP', expense_class: 'COMPARTIDO', amount: 400 }),
    // excluidos: borrador, incompleto, otro mes, compartido mal ubicado
    mov({ unit: 'UN03', expense_class: 'DIRECTO', amount: 999, status: 'BORRADOR', cost_category_id: CAT_ID.MO }),
    mov({ unit: 'UN03', expense_class: 'DIRECTO', amount: 0, cost_category_id: CAT_ID.MO }),
    mov({ unit: 'UN03', expense_class: 'DIRECTO', amount: 777, movement_date: '2026-09-30', cost_category_id: CAT_ID.MO }),
    mov({ unit: 'UN03', expense_class: 'COMPARTIDO', amount: 555 }),
  ];
}

describe('reparto mensual (08_REPARTO)', () => {
  it('estados: sin repartir, parcial, completo, >100%', () => {
    expect(allocationStatus({})).toBe(ALLOCATION_STATUS.SIN_REPARTIR);
    expect(allocationStatus({ UN01: 50, UN02: 25 })).toBe(ALLOCATION_STATUS.PARCIAL);
    expect(allocationStatus({ UN01: 20, UN02: 20, UN03: 20, UN04: 20, UN05: 20 })).toBe(ALLOCATION_STATUS.COMPLETO);
    expect(allocationStatus({ UN01: 60, UN02: 50 })).toBe(ALLOCATION_STATUS.REVISAR);
  });
  it('por defecto NO se reparte parejo: sin filas = 0% para todos', () => {
    expect(effectivePct({}, 'UN03')).toBe(0);
  });
  it('si suma >100% el % efectivo es 0 (no se reparte nada)', () => {
    expect(effectivePct({ UN01: 60, UN02: 50 }, 'UN01')).toBe(0);
  });
  it('gasto CORP compartido solo cuenta validado+OK del mes y es trazable', () => {
    const r = corpSharedExpense(scenario(), MES);
    expect(r.amount).toBe(400);
    expect(r.ids).toHaveLength(1);
  });
  it('sin asignar: I*(1−suma); con >100% queda todo sin asignar', () => {
    const movs = scenario();
    expect(summarizeAllocation(movs, MES, { UN03: 50, UN05: 25 }).unassigned).toBe(100);
    expect(summarizeAllocation(movs, MES, { UN01: 60, UN02: 50 }).unassigned).toBe(400);
    expect(summarizeAllocation(movs, MES, {}).unassigned).toBe(400);
  });
});

describe('resultados por unidad (09_RESULTADOS)', () => {
  const report = computeResults(scenario(), MES, { UN03: 50, UN05: 25 });
  const un03 = report.units.find((u) => u.unit === 'UN03')!;
  const un05 = report.units.find((u) => u.unit === 'UN05')!;

  it('contribución = ingresos − directos − atribuibles', () => {
    expect(un03.income.amount).toBe(1000);
    expect(un03.directCosts.amount).toBe(300);
    expect(un03.attributableExpenses.amount).toBe(100);
    expect(un03.contribution).toBe(600);
    expect(un05.contribution).toBe(300);
  });
  it('resultado final = contribución − reparto corporativo recibido', () => {
    expect(un03.allocatedCommonExpense).toBe(200);
    expect(un03.finalResult).toBe(400);
    expect(un05.allocatedCommonExpense).toBe(100);
    expect(un05.finalResult).toBe(200);
  });
  it('margen = resultado final / ingresos', () => {
    expect(un03.marginPct).toBeCloseTo(40, 6);
    expect(un05.marginPct).toBeCloseTo(40, 6);
  });
  it('unidades sin ingresos tienen margen 0 (no divide por cero)', () => {
    expect(report.units.find((u) => u.unit === 'UN01')!.marginPct).toBe(0);
  });
  it('excluye borradores, incompletos, otros meses y compartidos fuera de CORP', () => {
    expect(report.totals.directCosts).toBe(500);
    expect(report.corpSharedExpense.amount).toBe(400);
  });
  it('CORP sin repartir y total consolidado', () => {
    expect(report.corpUnassigned).toBe(100);
    expect(report.totals.allocatedCommonExpense).toBe(300);
    expect(report.totals.finalResult).toBe(500);
  });
  it('conciliación: ingresos − gastos = Σ resultado final + CORP no repartido', () => {
    expect(report.reconciliation.incomeMinusAllExpenses).toBe(500);
    expect(report.reconciliation.difference).toBe(0);
    expect(report.reconciliation.ok).toBe(true);
  });
  it('conciliación se cumple también sin reparto y con reparto completo', () => {
    expect(computeResults(scenario(), MES, {}).reconciliation.ok).toBe(true);
    expect(computeResults(scenario(), MES, { UN01: 20, UN02: 20, UN03: 20, UN04: 20, UN05: 20 }).reconciliation.ok).toBe(true);
  });
  it('cada cifra es trazable hasta sus movement_id', () => {
    expect(un03.directCosts.ids).toHaveLength(1);
    expect(un03.income.ids).toHaveLength(1);
  });
});

describe('caja (10_CAJA)', () => {
  const movs = [
    mov({ record_type: 'COBRO', expense_class: 'NO_APLICA', unit: 'UN03', amount: 800, movement_date: '2026-09-10', cost_category_id: CAT_ID.CXC }),
    mov({ record_type: 'COBRO', expense_class: 'NO_APLICA', unit: 'UN03', amount: 200, cost_category_id: CAT_ID.CXC }),
    mov({ record_type: 'APORTE_SOCIO', expense_class: 'NO_APLICA', unit: 'CORP', amount: 1000, cost_category_id: CAT_ID.SOC }),
    mov({ record_type: 'PAGO', expense_class: 'NO_APLICA', unit: 'CORP', amount: 300 }),
    mov({ record_type: 'RETIRO_SOCIO', expense_class: 'NO_APLICA', unit: 'CORP', amount: 100, movement_date: '2026-09-20', cost_category_id: CAT_ID.SOC }),
    // no cuentan: costo devengado, borrador, mes futuro
    mov({ unit: 'UN01', expense_class: 'DIRECTO', amount: 9999 }),
    mov({ record_type: 'COBRO', expense_class: 'NO_APLICA', unit: 'UN03', amount: 5000, status: 'BORRADOR' }),
    mov({ record_type: 'COBRO', expense_class: 'NO_APLICA', unit: 'UN03', amount: 7000, movement_date: '2026-11-02' }),
  ];
  const cash = computeCash(movs, MES, 500);

  it('saldo acumulado = inicial + cobros + aportes − pagos − retiros', () => {
    expect(cash.closingBalance).toBe(2100); // 500 + 1000 + 1000 − 300 − 100
  });
  it('movimiento neto del mes', () => {
    expect(cash.month.cobros.amount).toBe(200);
    expect(cash.month.aportes.amount).toBe(1000);
    expect(cash.month.pagos.amount).toBe(300);
    expect(cash.month.retiros.amount).toBe(0);
    expect(cash.netFlow).toBe(900);
  });
  it('costos reconocidos no afectan caja y los pagos no repiten el gasto', () => {
    expect(cash.accumulated.pagos.amount).toBe(300);
  });
  it('trazabilidad de cada componente', () => {
    expect(cash.accumulated.cobros.ids).toHaveLength(2);
  });
});
