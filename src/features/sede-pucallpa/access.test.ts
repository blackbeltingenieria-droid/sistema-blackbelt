import { describe, expect, it } from 'vitest';
import { canAccess } from '../auth/access';

describe('acceso a BlackBelt Institute', () => {
  it('solo el administrador entra', () => {
    expect(canAccess('admin', '/blackbelt-institute')).toBe(true);
    expect(canAccess('colaborador', '/blackbelt-institute')).toBe(false);
  });
});
