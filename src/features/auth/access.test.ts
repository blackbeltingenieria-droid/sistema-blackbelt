import { describe, expect, it } from 'vitest';
import { canAccess, homeFor } from './access';

describe('acceso por rol', () => {
  it('admin entra a todo', () => {
    for (const p of ['/dashboard', '/clients-projects', '/movements', '/budgets', '/results-cash', '/kanban/3', '/work-hours', '/my']) {
      expect(canAccess('admin', p)).toBe(true);
    }
  });
  it('colaborador solo ve su panel, su Kanban y sus horas', () => {
    expect(canAccess('colaborador', '/my')).toBe(true);
    expect(canAccess('colaborador', '/kanban')).toBe(true);
    expect(canAccess('colaborador', '/kanban/2')).toBe(true);
    expect(canAccess('colaborador', '/work-hours')).toBe(true);
  });
  it('colaborador no ve finanzas ni proyectos', () => {
    for (const p of ['/dashboard', '/clients-projects', '/movements', '/budgets', '/results-cash', '/movements/5']) {
      expect(canAccess('colaborador', p)).toBe(false);
    }
  });
  it('sin sesión o ruta desconocida no hay acceso', () => {
    expect(canAccess(null, '/dashboard')).toBe(false);
    expect(canAccess('admin', '/otra')).toBe(false);
  });
  it('inicio por rol', () => {
    expect(homeFor('admin')).toBe('/dashboard');
    expect(homeFor('colaborador')).toBe('/my');
  });
});
