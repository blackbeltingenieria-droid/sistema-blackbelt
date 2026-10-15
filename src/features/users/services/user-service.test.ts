import { describe, expect, it } from 'vitest';
import { validateNewUser } from './user-service';

const ok = { fullName: 'Ana Ruiz', email: 'ana@x.pe', role: 'colaborador' as const, specialistId: null };

describe('validateNewUser', () => {
  it('acepta datos válidos', () => expect(validateNewUser(ok, [])).toBeNull());
  it('exige nombre y correo válido', () => {
    expect(validateNewUser({ ...ok, fullName: ' ' }, [])).toMatch(/nombre/i);
    expect(validateNewUser({ ...ok, email: 'ana' }, [])).toMatch(/correo/i);
  });
  it('rechaza correo repetido sin importar mayúsculas', () => {
    expect(validateNewUser(ok, ['ANA@x.pe'])).toMatch(/ya existe/i);
  });
});
