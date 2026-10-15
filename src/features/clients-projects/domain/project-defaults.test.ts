import { describe, expect, it } from 'vitest';
import { clientTypeFromDoc, lastUnitOfClient, suggestProjectName, suggestUnitCode } from './project-defaults';

describe('autorrelleno de proyecto', () => {
  it('unidad según el servicio', () => {
    expect(suggestUnitCode('DESARROLLO DE TESIS')).toBe('UN03');
    expect(suggestUnitCode('Página web corporativa')).toBe('UN02');
    expect(suggestUnitCode('Estudio geofísico de suelos')).toBe('UN04');
    expect(suggestUnitCode('Plan de negocio')).toBe('UN05');
    expect(suggestUnitCode('Mejora de procesos Lean')).toBe('UN01');
    expect(suggestUnitCode('Algo')).toBeNull();
  });
  it('tipo de cliente por DNI/RUC', () => {
    expect(clientTypeFromDoc('20601234567')).toBe('Empresa');
    expect(clientTypeFromDoc('45678901')).toBe('Persona');
    expect(clientTypeFromDoc('123')).toBeNull();
  });
  it('nombre sugerido y unidad habitual del cliente', () => {
    expect(suggestProjectName('DESARROLLO DE TESIS', 'Wilmer Sánchez')).toBe('Desarrollo de tesis – Wilmer Sánchez');
    expect(lastUnitOfClient([{ id: 1, clientId: 7, businessUnitId: 2 }, { id: 5, clientId: 7, businessUnitId: 3 }], 7)).toBe(3);
    expect(lastUnitOfClient([], 7)).toBeNull();
  });
});
