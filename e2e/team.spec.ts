import { expect, test } from '@playwright/test';
import { go, login, noHorizontalScroll } from './helpers';

test.describe('Equipo: especialistas y usuarios', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'Administración Blackbelt'); });

  test('agregar un especialista que entra al sistema: queda con usuario vinculado y aparece en Horas', async ({ page }) => {
    await go(page, 'Equipo');
    await page.getByRole('button', { name: /¿Qué es un especialista/ }).click();
    await expect(page.getByTestId('team-help')).toContainText('Por qué se vinculan');

    await page.getByTestId('add-specialist').click();
    await page.getByLabel('Nombre completo').fill('Rosa Especialista E2E');
    await page.getByLabel(/Especialidad/).fill('Topografía');
    await page.getByLabel(/^Correo/).fill('rosa.e2e@blackbelt.local');
    await page.getByRole('button', { name: 'Agregar especialista' }).click();
    await expect(page.getByTestId('users-msg')).toContainText('Ya puede entrar al sistema');
    const card = page.getByTestId('specialists-list').locator('li', { hasText: 'Rosa Especialista E2E' });
    await expect(card).toContainText('Entra al sistema como Colaborador');
    await expect(page.getByTestId('users-list')).toContainText('rosa.e2e@blackbelt.local');
    await noHorizontalScroll(page);

    await go(page, 'Horas-hombre');
    await expect(page.getByLabel('Persona').locator('option', { hasText: 'Rosa Especialista E2E' })).toHaveCount(1);
  });

  test('un externo sin acceso; luego se le da acceso; desactivar lo saca de las listas', async ({ page }) => {
    await go(page, 'Equipo');
    await page.getByTestId('add-specialist').click();
    await page.getByLabel('Nombre completo').fill('Externo E2E');
    await page.getByLabel('Va a entrar al sistema').uncheck();
    await page.getByRole('button', { name: 'Agregar especialista' }).click();
    const card = page.getByTestId('specialists-list').locator('li', { hasText: 'Externo E2E' });
    await expect(card).toContainText('No entra al sistema');

    await card.getByRole('button', { name: 'Dar acceso' }).click();
    await card.getByLabel('Correo para entrar').fill('externo.e2e@blackbelt.local');
    await card.getByRole('button', { name: 'Dar acceso' }).last().click();
    await expect(page.getByTestId('users-msg')).toContainText('ya puede entrar');
    await expect(card).toContainText('Entra al sistema');

    await card.getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByTestId('users-msg')).toContainText('se conservan');
    await expect(page.getByTestId('specialists-list').locator('li', { hasText: 'Externo E2E' })).toHaveCount(0);
  });
});
