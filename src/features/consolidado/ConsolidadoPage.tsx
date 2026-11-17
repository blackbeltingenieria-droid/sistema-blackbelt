// features/consolidado/ConsolidadoPage.tsx
// Página «Consolidado» (solo Administrador): la empresa completa = operación principal + BlackBelt Institute.
// Lee consolidado.resumen_mensual. Es la ÚNICA página que suma Pucallpa; los demás reportes
// siguen mostrando solo la operación principal (para no contar dos veces).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { currentMonth, formatPen, monthLabel } from '../../lib/format';
import { acumulado, filasDelMes, mesesDisponibles, totalCuadra, type ResumenFila } from './domain/consolidado';
import { ConsolidadoNoDisponible, getResumenMensual } from './services/consolidado-service';
import { getPeriodReport } from '../results-cash/services/results-service';

const TODO = 'todo';

const COLUMNAS: { key: keyof Pick<ResumenFila, 'ingresos' | 'costos' | 'margen' | 'cobros' | 'pagos'>; label: string; ayuda: string }[] = [
  { key: 'ingresos', label: 'Vendió', ayuda: 'Ingresos reconocidos (BlackBelt Institute: cuotas que vencieron)' },
  { key: 'costos', label: 'Gastó', ayuda: 'Costos reconocidos' },
  { key: 'margen', label: 'Ganó', ayuda: 'Vendió − gastó (negativo = perdió)' },
  { key: 'cobros', label: 'Entró', ayuda: 'Dinero que entró a caja (cobros)' },
  { key: 'pagos', label: 'Salió', ayuda: 'Dinero que salió de caja (pagos)' },
];

export function ConsolidadoPage() {
  const [rows, setRows] = useState<ResumenFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(null);
  // Dinero en caja HOY de la operación principal: la misma cifra que el Dashboard general (incluye saldo inicial y aportes).
  const [cajaPrincipal, setCajaPrincipal] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null); setAviso(null);
    try {
      const [r, rep] = await Promise.all([getResumenMensual(), getPeriodReport({ kind: 'all' }).catch(() => null)]);
      setCajaPrincipal(rep ? rep.cash.closingBalance : null);
      setRows(r);
      // Abre en «Todo el tiempo» (desde el inicio hasta hoy), igual que el Dashboard general.
      setMes((m) => m ?? TODO);
    } catch (e) {
      if (e instanceof ConsolidadoNoDisponible) setAviso(e.message); else setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const meses = useMemo(() => mesesDisponibles(rows, currentMonth()), [rows]);
  const filas = useMemo(() => (mes === TODO ? acumulado(rows, currentMonth()) : filasDelMes(rows, mes ?? '')), [rows, mes]);
  const total = filas[2];
  const cuadra = totalCuadra(filas);
  const pucHoy = acumulado(rows, currentMonth())[1];
  const cajaPucallpa = Math.round((pucHoy.cobros - pucHoy.pagos) * 100) / 100;
  const cajaTotal = cajaPrincipal === null ? null : Math.round((cajaPrincipal + cajaPucallpa) * 100) / 100;

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
      <PageHeader
        title="Consolidado"
        subtitle="Toda la empresa: operación principal + BlackBelt Institute. Solo lectura; los demás reportes muestran solo la operación principal."
        actions={meses.length > 0 && (
          <select className="bb-input sm:w-56" aria-label="Periodo" value={mes ?? TODO} onChange={(e) => setMes(e.target.value)}>
            <option value={TODO}>Todo el tiempo (hasta hoy)</option>
            {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        )}
      />
      {error && <ErrorBanner message={error} onRetry={cargar} />}
      {aviso && <Card className="mb-4"><p className="bb-body text-sm text-ink-soft">{aviso}</p></Card>}
      {loading && <p className="bb-body text-sm text-ink-soft">Cargando…</p>}

      {!loading && !aviso && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Vendió (total)" value={formatPen(total.ingresos)} />
            <KpiCard label="Gastó (total)" value={formatPen(total.costos)} />
            <KpiCard label={total.margen < 0 ? 'Perdió (total)' : 'Ganó (total)'} value={formatPen(Math.abs(total.margen))} valueColor={total.margen < 0 ? 'text-rust' : 'text-ink'}
              note={total.ingresos > 0 ? `Margen ${Math.round((total.margen / total.ingresos) * 100)} %` : undefined} />
            {cajaTotal !== null ? (
              <KpiCard label="Dinero en caja hoy" value={formatPen(cajaTotal)} valueColor={cajaTotal < 0 ? 'text-rust' : 'text-ink'}
                note={`Principal ${formatPen(cajaPrincipal ?? 0)} · Institute ${formatPen(cajaPucallpa)}`} />
            ) : (
              <KpiCard label="Entró − salió" value={formatPen(total.cobros - total.pagos)} valueColor={total.cobros - total.pagos < 0 ? 'text-rust' : 'text-ink'} />
            )}
          </div>

          <Card padding="p-0" className="overflow-x-auto">
            <table className="w-full bb-body text-sm" data-testid="tabla-consolidado">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="bb-label-xs text-ink-soft px-3 py-2">Sede</th>
                  {COLUMNAS.map((c) => <th key={c.key} title={c.ayuda} className="bb-label-xs text-ink-soft px-3 py-2 text-right">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.sede} className={f.sede === 'Total BlackBelt' ? 'bg-canvas font-semibold' : ''}>
                    <td className="px-3 py-2 border-b border-line">{f.sede}</td>
                    {COLUMNAS.map((c) => (
                      <td key={c.key} className={`px-3 py-2 border-b border-line text-right bb-mono ${f[c.key] < 0 ? 'text-rust' : ''}`}>{formatPen(f[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className={`bb-body text-xs mt-2 ${cuadra ? 'text-ink-soft' : 'text-rust'}`}>
            {cuadra ? '✓ El total cuadra: Principal + BlackBelt Institute.' : '✗ El total no cuadra con Principal + BlackBelt Institute: revisar.'}
            {' '}BlackBelt Institute se presenta como UN05 · Capacitación (U05-CAP).
          </p>
        </>
      )}
    </div>
  );
}
