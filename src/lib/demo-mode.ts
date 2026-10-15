// lib/demo-mode.ts
// «Modo demo»: `npm run dev:demo` (vite --mode demo → .env.demo) carga datos de demostración EN MEMORIA
// y nunca toca Supabase, aunque haya un .env con credenciales reales.
export const DEMO_MODE: boolean = (import.meta.env.VITE_DEMO_DATA as string | undefined) === '1';
