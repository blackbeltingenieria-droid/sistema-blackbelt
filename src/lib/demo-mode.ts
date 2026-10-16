// lib/demo-mode.ts
// «Modo demo»: `npm run dev:demo` (vite --mode demo → .env.demo) carga datos de demostración EN MEMORIA
// y nunca toca Supabase, aunque haya un .env con credenciales reales.
export const DEMO_MODE: boolean = (import.meta.env.VITE_DEMO_DATA as string | undefined) === '1';

// «Modo vacío»: `npm run dev:vacio` (.env.vacio) arranca SIN movimientos, clientes, proyectos ni inversiones
// (solo catálogos, Henry y los especialistas) para probar a mano cargar el Excel por la página.
export const EMPTY_MODE: boolean = (import.meta.env.VITE_EMPTY_DATA as string | undefined) === '1';
