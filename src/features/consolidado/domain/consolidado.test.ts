import { describe, expect, it } from 'vitest';
import { acumulado, filasDelMes, mesesDisponibles, normalizar, totalCuadra } from './consolidado';

const rows = normalizar([
  { sede: 'Principal', mes: '2026-10', ingresos: '4540.00', costos: '4581.94', margen: '-41.94', cobros: '4540.00', pagos: '4581.94' },
  { sede: 'Total BlackBelt', mes: '2026-10', ingresos: '4540.00', costos: '4581.94', margen: '-41.94', cobros: '4540.00', pagos: '4581.94' },
  { sede: 'Principal', mes: '2026-11', ingresos: 940, costos: 2169.12, margen: -1229.12, cobros: 940, pagos: 2169.12 },
  { sede: 'BlackBelt Institute', mes: '2026-11', ingresos: 450, costos: 390, margen: 60, cobros: 250, pagos: 390 },
  { sede: 'Total BlackBelt', mes: '2026-11', ingresos: 1390, costos: 2559.12, margen: -1169.12, cobros: 1190, pagos: 2559.12 },
]);

describe('consolidado', () => {
  it('convierte los numeric de PostgREST a número', () => {
    expect(rows[0].costos).toBe(4581.94);
  });

  it('meses del más reciente al más antiguo', () => {
    expect(mesesDisponibles(rows)).toEqual(['2026-11', '2026-10']);
  });

  it('siempre devuelve las tres sedes; la que no tiene datos sale en cero', () => {
    const oct = filasDelMes(rows, '2026-10');
    expect(oct.map((f) => f.sede)).toEqual(['Principal', 'BlackBelt Institute', 'Total BlackBelt']);
    expect(oct[1].ingresos).toBe(0);
  });

  it('el total cuadra con Principal + BlackBelt Institute', () => {
    expect(totalCuadra(filasDelMes(rows, '2026-11'))).toBe(true);
    expect(totalCuadra(filasDelMes(rows, '2026-10'))).toBe(true);
    const roto = filasDelMes(rows, '2026-11').map((f) => (f.sede === 'Total BlackBelt' ? { ...f, cobros: 1 } : f));
    expect(totalCuadra(roto)).toBe(false);
  });

  it('hasta hoy: los meses futuros no cuentan (mismo criterio que el Dashboard general)', () => {
    const conFuturo = [...rows, ...normalizar([{ sede: 'BlackBelt Institute', mes: '2026-12', ingresos: 200, costos: 0, margen: 200, cobros: 0, pagos: 0 }])];
    expect(mesesDisponibles(conFuturo, '2026-11')).toEqual(['2026-11', '2026-10']);
    expect(acumulado(conFuturo, '2026-11')[1].ingresos).toBe(450);
  });

  it('acumulado de todos los meses', () => {
    const t = acumulado(rows);
    expect(t[0].ingresos).toBe(5480);
    expect(t[1].margen).toBe(60);
    expect(totalCuadra(t)).toBe(true);
  });
});

import { canAccess } from '../../auth/access';

describe('acceso a Consolidado', () => {
  it('solo el administrador entra', () => {
    expect(canAccess('admin', '/consolidado')).toBe(true);
    expect(canAccess('colaborador', '/consolidado')).toBe(false);
    expect(canAccess(null, '/consolidado')).toBe(false);
  });
});
