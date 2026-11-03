import { describe, expect, it } from 'vitest';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';
import { EXCEL_DB_CLIENTS, EXCEL_DB_MOVEMENTS, EXCEL_DB_PROJECTS } from '../../excel-data/excel-local';
import { enrichMovement } from '../../movements/domain/movement-rules';
import { EXCEL_CLIENTES, EXCEL_TOTALES } from '../../excel-data/excel-raw';
import { salesByClient } from './company-overview';

const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
const movs = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));
const clientOf = new Map(EXCEL_DB_PROJECTS.map((p) => [p.id, EXCEL_DB_CLIENTS.find((c) => c.id === p.client_id)?.name ?? '']));

describe('ventas por cliente', () => {
  it('suma lo que pagó cada cliente (= TABLA_CLIENTES monto pagado)', () => {
    const bars = salesByClient(movs, clientOf, 20);
    const expected = EXCEL_CLIENTES.filter((c) => c.paid > 0).map((c) => [c.name, c.paid] as [string, number])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    expect(bars.map((b) => [b.name, b.amount])).toEqual(expected);
    expect(bars.reduce((a, b) => a + b.amount, 0)).toBe(EXCEL_TOTALES.pagadoClientes);
  });
});
