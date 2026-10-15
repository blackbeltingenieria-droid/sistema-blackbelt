import { describe, expect, it } from 'vitest';
import { CAT_ID, mov } from '../../../test/factories';
import { computeAdminOverview, monthsWithoutAllocation } from './admin-overview';

const corpShared = (date: string, over = {}) =>
  mov({ unit: 'CORP', record_type: 'COSTO_RECONOCIDO', expense_class: 'COMPARTIDO', cost_category_id: CAT_ID.SOFT, amount: 100, movement_date: date, ...over });

describe('resumen del Admin', () => {
  const movements = [
    corpShared('2026-09-05'),
    corpShared('2026-10-05'),
    corpShared('2026-08-05'),
    corpShared('2026-10-06', { status: 'BORRADOR' }),
    mov({ unit: 'UN02', record_type: 'COSTO_RECONOCIDO', expense_class: 'COMPARTIDO', movement_date: '2026-10-07' }), // REVISAR CORP
  ];
  const alloc = { '2026-08': { pcts: { UN01: 100 } }, '2026-10': { pcts: { UN01: 50, UN02: 50 } } };

  it('detecta meses con gasto CORP compartido y reparto sin definir (solo hasta el mes actual)', () => {
    expect(monthsWithoutAllocation(movements, alloc, '2026-10')).toEqual(['2026-09']);
    expect(monthsWithoutAllocation([corpShared('2026-12-01')], {}, '2026-10')).toEqual([]);
  });

  it('cuenta tareas abiertas, horas del mes, proyectos activos y pendientes', () => {
    const o = computeAdminOverview({
      tasks: [{ status: 'hecho' }, { status: 'en_curso' }, { status: 'backlog' }],
      hours: [{ work_date: '2026-10-03', hours: 4 }, { work_date: '2026-10-20', hours: 2.5 }, { work_date: '2026-09-30', hours: 8 }],
      projects: [{ status: 'activo' }, { status: 'finalizado' }, { status: 'activo' }],
      movements, allocationByMonth: alloc, month: '2026-10',
    });
    expect(o).toMatchObject({ openTasks: 2, doneTasks: 1, monthHours: 6.5, activeProjects: 2, pendingValidation: 1, controlIssues: 1 });
  });

  it('genera las alertas con su enlace', () => {
    const o = computeAdminOverview({ tasks: [], hours: [], projects: [], movements, allocationByMonth: alloc, month: '2026-10' });
    expect(o.alerts.map((a) => a.key)).toEqual(['control', 'allocation']);
    expect(o.alerts[1].text).toContain('septiembre 2026');
    expect(o.alerts[1].link).toBe('/budgets');
  });

  it('sin problemas no hay alertas', () => {
    const o = computeAdminOverview({ tasks: [], hours: [], projects: [], movements: [corpShared('2026-10-01')], allocationByMonth: { '2026-10': { pcts: { UN01: 100 } } }, month: '2026-10' });
    expect(o.alerts).toEqual([]);
  });
});
