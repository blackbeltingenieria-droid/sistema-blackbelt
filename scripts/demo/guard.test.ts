import { describe, expect, it } from 'vitest';
import { assessTarget, hostOf, type TargetFacts } from './guard';

const base: TargetFacts = {
  url: 'https://dev-abc.supabase.co', anonKey: 'key', productionUrls: ['https://prod-xyz.supabase.co'],
  confirmHost: 'dev-abc.supabase.co', realMovements: 0, allowExisting: false, mode: 'load',
};

describe('guardia del seed demo', () => {
  it('permite una base de desarrollo confirmada y sin datos reales', () => {
    expect(assessTarget(base)).toEqual({ ok: true, reasons: [] });
  });
  it('se detiene sin base configurada o con valores de ejemplo', () => {
    expect(assessTarget({ ...base, url: undefined }).ok).toBe(false);
    expect(assessTarget({ ...base, url: 'https://placeholder.supabase.co' }).ok).toBe(false);
    expect(assessTarget({ ...base, anonKey: '' }).ok).toBe(false);
  });
  it('se detiene si la URL es la de producción (aunque cambien mayúsculas o la barra final)', () => {
    const r = assessTarget({ ...base, url: 'https://PROD-xyz.supabase.co/', confirmHost: 'prod-xyz.supabase.co' });
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/PRODUCCIÓN/);
  });
  it('exige --confirm-dev con el host exacto', () => {
    expect(assessTarget({ ...base, confirmHost: undefined }).ok).toBe(false);
    expect(assessTarget({ ...base, confirmHost: 'otro.supabase.co' }).ok).toBe(false);
  });
  it('se detiene si hay movimientos reales, salvo --allow-existing', () => {
    expect(assessTarget({ ...base, realMovements: 3 }).ok).toBe(false);
    expect(assessTarget({ ...base, realMovements: 3, allowExisting: true }).ok).toBe(true);
  });
  it('al limpiar no se mira si hay datos reales (solo borra lo demo) pero sí la producción', () => {
    expect(assessTarget({ ...base, mode: 'clean', realMovements: 50 }).ok).toBe(true);
    expect(assessTarget({ ...base, mode: 'clean', url: 'https://prod-xyz.supabase.co', confirmHost: 'prod-xyz.supabase.co' }).ok).toBe(false);
  });
  it('hostOf tolera URLs inválidas', () => {
    expect(hostOf('no es url')).toBeNull();
  });
});
