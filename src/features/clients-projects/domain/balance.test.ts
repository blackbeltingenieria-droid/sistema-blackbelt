import { describe, expect, it } from 'vitest';
import { calcBalances } from './balance';

describe('saldo pendiente de proyecto', () => {
  const pays = [
    { id: 1, project_id: 1, amount: 2000, payment_date: '2026-02-15', payment_method: null },
    { id: 2, project_id: 2, amount: 40000, payment_date: '2026-03-20', payment_method: null },
    { id: 3, project_id: 1, amount: 500, payment_date: '2026-04-01', payment_method: null },
  ];
  it('contratado − Σ pagos del proyecto', () => {
    const r = calcBalances({ id: 1, contracted_amount: 3000 }, pays);
    expect(r.paidAmount).toBe(2500);
    expect(r.pendingBalance).toBe(500);
  });
  it('sin pagos el saldo es el monto contratado', () => {
    expect(calcBalances({ id: 9, contracted_amount: 1200 }, pays).pendingBalance).toBe(1200);
  });
  it('totalmente pagado deja saldo 0', () => {
    expect(calcBalances({ id: 2, contracted_amount: 40000 }, pays).pendingBalance).toBe(0);
  });
});
