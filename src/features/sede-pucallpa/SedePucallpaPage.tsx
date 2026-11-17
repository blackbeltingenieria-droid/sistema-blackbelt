// features/sede-pucallpa/SedePucallpaPage.tsx
// Página «Sede Pucallpa» (solo Administrador, solo lectura): dashboard estilo tablero de Excel.
// El dashboard (dashboard-sede/) es una copia idéntica del que ve la sede en su app («Resumen»),
// así que ambas sedes ven el mismo tablero con las mismas cifras. Cada mes cuadra con Consolidado.

import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { todayIso } from '../../lib/autofill';
import { DashboardSede } from './dashboard-sede/DashboardSede';
import type { DatosSede } from './dashboard-sede/sede';
import { SedeNoDisponible, getDatosSede } from './services/sede-service';

export function SedePucallpaPage() {
  const [datos, setDatos] = useState<DatosSede | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null); setAviso(null);
    try { setDatos(await getDatosSede()); } catch (e) {
      if (e instanceof SedeNoDisponible) setAviso(e.message); else setError((e as Error).message);
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7" data-testid="sede-pucallpa">
      {error && <ErrorBanner message={error} onRetry={() => void cargar()} />}
      {aviso && <Card className="mb-4"><p className="bb-body text-sm text-ink-soft">{aviso}</p></Card>}
      {!datos && !error && !aviso && <p className="bb-body text-sm text-ink-soft">Cargando…</p>}
      {datos && <DashboardSede datos={datos} hoy={todayIso()} />}
    </div>
  );
}
