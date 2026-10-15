import { expect, type Page } from '@playwright/test';

const SHORT: Record<string, string> = {
  Dashboard: 'Inicio', 'Mi panel': 'Mi panel', 'Ingresos y egresos': 'Registros', Kanban: 'Kanban', 'Horas-hombre': 'Horas',
};

/** Entra como un usuario del selector «¿Quién eres?». Datos seed en memoria: cada carga reinicia. */
export async function login(page: Page, name: string) {
  // Evita esperar a Google Fonts (más rápido y estable sin red)
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(name) }).click();
}

/** Navega con clicks (no goto: recargar reinicia los datos seed). Funciona en mobile y desktop. */
export async function go(page: Page, label: string) {
  const wide = (page.viewportSize()?.width ?? 0) >= 1024;
  if (wide) {
    await page.locator('aside').getByRole('link', { name: new RegExp(`${label}$`) }).click();
  } else if (SHORT[label]) {
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: SHORT[label] }).click();
  } else {
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: /Más/ }).click();
    await page.getByRole('menuitem', { name: label }).click();
  }
}

export async function noHorizontalScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(page.viewportSize()!.width);
}

/** Primer texto visible (las tablas responsivas renderizan tabla y tarjetas; una está oculta). */
export function vis(page: Page, text: string) {
  return page.getByText(text).locator('visible=true').first();
}

/** Fila/tarjeta (ancestro más cercano con botón «Editar») que contiene el texto visible dado. */
export function rowOf(page: Page, text: string) {
  return vis(page, text).locator("xpath=ancestor::*[.//button[normalize-space()='Editar']][1]");
}
