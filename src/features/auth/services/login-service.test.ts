import { describe, expect, it } from 'vitest';
import { friendlyAuthError, passwordSignIn, setLoginPassword, validatePassword } from './login-service';

describe('login con contraseña', () => {
  it('reglas de contraseña', () => {
    expect(validatePassword('corta')).toContain('al menos 8');
    expect(validatePassword(' espacios ')).toContain('espacios');
    expect(validatePassword('blackbelt2026')).toBeNull();
  });
  it('mensajes en palabras simples', () => {
    expect(friendlyAuthError('Invalid login credentials')).toBe('Correo o contraseña incorrectos.');
    expect(friendlyAuthError('Email not confirmed')).toContain('no está activa');
  });
  it('en memoria: la contraseña puesta por el admin reemplaza a la de prueba', async () => {
    await setLoginPassword('Ana@x.pe', 'clave-ana-1');
    await expect(passwordSignIn('ana@x.pe', 'blackbelt2026')).rejects.toThrow('incorrectos');
    await expect(passwordSignIn('ANA@x.pe', 'clave-ana-1')).resolves.toBe('ana@x.pe');
    await expect(setLoginPassword('ana@x.pe', '123')).rejects.toThrow('al menos 8');
  });
});
