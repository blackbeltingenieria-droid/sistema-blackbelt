// features/clients-projects/domain/balance.ts
// Saldo pendiente de un proyecto: calculado, nunca guardado como columna.

import type { DbProject, DbProjectPayment } from '../../../types/database';

export function calcBalances(
  project: Pick<DbProject, 'id' | 'contracted_amount'>,
  payments: DbProjectPayment[],
) {
  const projectPayments = payments.filter((p) => p.project_id === project.id);
  const paidAmount = projectPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingBalance = Number(project.contracted_amount) - paidAmount;
  return { paidAmount, pendingBalance, payments: projectPayments };
}
