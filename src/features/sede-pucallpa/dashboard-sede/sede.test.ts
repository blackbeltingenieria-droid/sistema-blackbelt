import { describe, expect, it } from 'vitest';
import {
  TODO, aniosDisponibles, cartera, filtrarPrograma, programasDisponibles, cobrosPorMedio, gastosPorCategoria, mesesDisponibles, morosos,
  normalizarDatos, proximosVencimientos, resumen, serieMensual, ventasPorPrograma,
} from './sede';

const d = normalizarDatos({
  inscripciones: [
    { id: 1, nro_contrato: 'C-1', fecha_contrato: '2026-10-20', estado: 'activa', alumno_id: 10, alumno: 'Ríos, Ana', programa: 'Excel', precio_neto: '450', descuento: '50', vencido: 0, saldo: 0 },
    { id: 2, nro_contrato: 'C-2', fecha_contrato: '2026-11-02', estado: 'activa', alumno_id: 11, alumno: 'Paz, Luis', programa: 'SSOMA', precio_neto: '300', descuento: '0', vencido: 0, saldo: 0 },
    { id: 3, nro_contrato: 'C-3', fecha_contrato: '2026-11-03', estado: 'anulada', alumno_id: 12, alumno: 'Anulado', programa: 'SSOMA', precio_neto: '999', descuento: '0', vencido: 0, saldo: 0 },
  ],
  cuotas: [
    { id: 1, inscripcion_id: 1, monto: '150', vencimiento: '2026-10-25', pagado: '150', saldo: '0' },
    { id: 2, inscripcion_id: 1, monto: '150', vencimiento: '2026-11-05', pagado: '50', saldo: '100' },
    { id: 3, inscripcion_id: 1, monto: '150', vencimiento: '2026-12-05', pagado: '0', saldo: '150' },
    { id: 4, inscripcion_id: 2, monto: '300', vencimiento: '2026-11-20', pagado: '0', saldo: '300' },
    { id: 5, inscripcion_id: 3, monto: '999', vencimiento: '2026-11-10', pagado: '0', saldo: '999' },
  ],
  pagos: [
    { cuota_id: 1, fecha: '2026-10-25', monto: '150', medio: 'qr', anulado: false },
    { cuota_id: 2, fecha: '2026-11-04', monto: '50', medio: 'efectivo', anulado: false },
    { cuota_id: 2, fecha: '2026-11-04', monto: '80', medio: 'qr', anulado: true },
  ],
  gastos: [
    { fecha: '2026-10-28', fecha_pago: '2026-10-28', monto: '100', categoria_id: 2, pagado: true, anulado: false },
    { fecha: '2026-11-03', fecha_pago: '2026-11-06', monto: '120', categoria_id: 1, programa_id: 1, pagado: true, anulado: false },
    { fecha: '2026-11-09', fecha_pago: null, monto: '40', categoria_id: 1, pagado: false, anulado: false },
    { fecha: '2026-11-09', fecha_pago: null, monto: '500', categoria_id: 1, pagado: false, anulado: true },
  ],
  categorias: [{ id: 1, nombre: 'Insumos' }, { id: 2, nombre: 'Publicidad' }],
  programas: [{ id: 1, nombre: 'Excel' }, { id: 2, nombre: 'SSOMA' }],
});
const HOY = '2026-11-15';

describe('resumen de BlackBelt Institute (mismo criterio que el Dashboard general: hasta hoy)', () => {
  it('meses desde el inicio hasta el mes actual (diciembre aún no llega)', () => {
    expect(mesesDisponibles(d, HOY)).toEqual(['2026-11', '2026-10']);
  });

  it('un mes: ignora anulados y cuadra con la fila BlackBelt Institute de Consolidado', () => {
    const r = resumen(d, '2026-11', HOY);
    expect(r.vendio).toBe(450); // 150 + 300 (la cuota de la inscripción anulada no cuenta)
    expect(r.gasto).toBe(160); // 120 + 40 (el gasto anulado no cuenta)
    expect(r.gano).toBe(290);
    expect(r.entro).toBe(50); // el pago anulado no cuenta
    expect(r.salio).toBe(120);
    expect(r.caja).toBe(-20); // (150 + 50) − (100 + 120)
    expect(r.nuevas).toBe(1);
    expect(r.ticket).toBe(300);
    expect(r.proyectado).toBeNull();
  });

  it('todo el tiempo = hasta hoy: las cuotas de diciembre no son venta todavía', () => {
    const r = resumen(d, TODO, HOY);
    expect(r.vendio).toBe(600);
    expect(r.gasto).toBe(260);
    expect(r.gano).toBe(340);
    expect(r.caja).toBe(-20);
    expect(r.porVender).toBe(150);
    expect(r.proyectado).toBe(490); // si cobra todo lo contratado
    expect(r.leDeben).toBe(550);
    expect(r.vencido).toBe(100);
    expect(r.debe).toBe(40);
    expect(r.cobranzaPct).toBeCloseTo((200 / 300) * 100);
    expect(r.alumnosActivos).toBe(2);
    expect(r.descuentos).toBe(50);
  });

  it('la caja de «todo» es la del cierre del mes actual, y cuadra: entró − salió', () => {
    const r = resumen(d, TODO, HOY);
    expect(r.caja).toBe(r.entro - r.salio);
  });

  it('serie mensual con dinero en caja al cierre', () => {
    const s = serieMensual(d, HOY);
    expect(s.map((x) => x.mes)).toEqual(['2026-10', '2026-11']);
    expect(s.map((x) => x.caja)).toEqual([50, -20]);
    expect(s.map((x) => x.gano)).toEqual([50, 290]);
  });

  it('desgloses: categorías, programas, medios y cartera', () => {
    expect(gastosPorCategoria(d, TODO, HOY)).toEqual([{ nombre: 'Insumos', monto: 160 }, { nombre: 'Publicidad', monto: 100 }]);
    // Con las 6M, las categorías se agrupan por su M.
    const d6 = { ...d, categorias: d.categorias.map((c) => ({ ...c, m6: 'metodo' })) };
    expect(gastosPorCategoria(d6, TODO, HOY)).toEqual([{ nombre: 'Método', monto: 260 }]);
    expect(ventasPorPrograma(d, '2026-11', HOY)).toEqual([{ nombre: 'SSOMA', monto: 300 }, { nombre: 'Excel', monto: 150 }]);
    expect(cobrosPorMedio(d, TODO, HOY).map((b) => b.nombre)).toEqual(['QR / Yape-Plin', 'Efectivo']);
    expect(cartera(d, HOY)).toEqual([
      { nombre: 'Cobrado', monto: 200 }, { nombre: 'Por vencer', monto: 450 }, { nombre: 'Vencido', monto: 100 },
    ]);
  });

  it('alertas: morosos y próximos vencimientos', () => {
    expect(morosos(d, HOY)).toEqual([{ contrato: 'C-1', alumno: 'Ríos, Ana', programa: 'Excel', monto: 100 }]);
    expect(proximosVencimientos(d, HOY).map((a) => a.fecha)).toEqual(['2026-11-20', '2026-12-05']);
  });
});

describe('filtros del dashboard (como los segmentadores de Excel)', () => {
  it('años y programas disponibles', () => {
    expect(aniosDisponibles(d, HOY)).toEqual(['2026']);
    expect(programasDisponibles(d)).toEqual(['Excel', 'SSOMA']);
  });

  it('un año = todos sus meses hasta hoy', () => {
    const r = resumen(d, '2026', HOY);
    expect(r.vendio).toBe(600);
    expect(r.caja).toBe(-20);
    expect(serieMensual(d, HOY, '2026-11').map((x) => x.mes)).toEqual(['2026-10', '2026-11']);
  });

  it('un programa: sus ventas y cobros, y solo los gastos asignados a él', () => {
    const r = resumen(filtrarPrograma(d, 'Excel'), TODO, HOY);
    expect(r.vendio).toBe(300);
    expect(r.gasto).toBe(120);
    expect(r.entro).toBe(200);
    expect(filtrarPrograma(d, null)).toBe(d);
  });
});
