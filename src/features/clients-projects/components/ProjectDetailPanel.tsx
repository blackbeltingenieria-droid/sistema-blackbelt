// features/clients-projects/components/ProjectDetailPanel.tsx
// Right-side detail panel showing client info, project data, payment progress.
// Opens when a row is clicked in the listing table.

import { Card } from '../../../components/ui/Card';
import { KpiCard } from '../../../components/ui/KpiCard';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StatusChip } from '../../../components/ui/StatusChip';
import { useProjectDetail } from '../hooks/useProjectDetail';

import { UnitBadge } from '../../catalogs/components/UnitBadge';

interface ProjectDetailPanelProps {
  projectId: number | null;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function ProjectDetailPanel({ projectId, onClose }: ProjectDetailPanelProps) {
  const { detail, loading, error } = useProjectDetail(projectId);

  if (projectId === null) {
    return (
      <aside className="w-[360px] flex-shrink-0 flex items-center justify-center bg-canvas border-l border-line h-full min-h-[400px]">
        <p className="bb-body text-ink-soft text-sm text-center px-8">
          Selecciona un proyecto para ver el detalle
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-[360px] flex-shrink-0 bg-canvas border-l border-line overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-paper">
        <p className="bb-label-xs text-ink-soft">Detalle del proyecto</p>
        <button
          onClick={onClose}
          className="text-ink-soft hover:text-ink text-lg leading-none transition-colors"
          aria-label="Cerrar detalle"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="bb-body text-ink-soft text-sm">Cargando…</span>
        </div>
      )}

      {error && (
        <div className="m-4 p-3 bg-rust/10 border border-rust/30 rounded-card">
          <p className="bb-body text-rust text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && detail && (
        <div className="p-5 space-y-4">
          {/* Project name + code + status */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                {detail.code && (
                  <span className="bb-mono text-[10px] font-bold text-ink-soft bg-canvas border border-line px-1.5 py-0.5 rounded mr-1.5">
                    {detail.code}
                  </span>
                )}
                <h2 className="bb-display font-semibold text-ink text-base leading-snug inline">
                  {detail.name}
                </h2>
              </div>
              <StatusChip status={detail.status} />
            </div>
            {detail.service && (
              <p className="bb-body text-ink-soft text-sm mt-1">{detail.service}</p>
            )}
          </div>

          {/* Client info */}
          <Card padding="p-4">
            <p className="bb-label-xs text-ink-soft mb-2">Cliente</p>
            <div className="flex items-center justify-between">
              <p className="bb-body font-medium text-ink text-sm">{detail.clientName}</p>
              {detail.clientType && (
                <span className="bb-mono text-[10px] bg-canvas border border-line px-1.5 py-0.5 rounded text-ink-soft">
                  {detail.clientType}
                </span>
              )}
            </div>
            <div className="space-y-1 mt-2 text-xs">
              {detail.clientDocNumber && (
                <p className="bb-mono text-ink-soft">
                  DNI/RUC: <span className="text-ink">{detail.clientDocNumber}</span>
                </p>
              )}
              {detail.clientPhone && (
                <p className="bb-mono text-ink-soft">
                  WhatsApp: <span className="text-ink">{detail.clientPhone}</span>
                </p>
              )}
              {detail.clientEmail && (
                <p className="bb-body text-ink-soft truncate">
                  Correo: <span className="text-ink">{detail.clientEmail}</span>
                </p>
              )}
            </div>
          </Card>

          {/* Project meta */}
          <Card padding="p-4">
            <p className="bb-label-xs text-ink-soft mb-3">Datos del proyecto</p>
            <dl className="space-y-2.5">
              <div className="flex justify-between items-center">
                <dt className="bb-body text-xs text-ink-soft">Unidad de negocio</dt>
                <dd>
                  <UnitBadge
                    code={detail.businessUnitCode}
                    name={detail.businessUnitName}
                    color={detail.businessUnitColor}
                    size="xs"
                  />
                </dd>
              </div>
              {detail.manager && (
                <div className="flex justify-between">
                  <dt className="bb-body text-xs text-ink-soft">Responsable</dt>
                  <dd className="bb-body text-xs text-ink font-medium text-right">
                    {detail.manager}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="bb-body text-xs text-ink-soft">Inicio previsto</dt>
                <dd className="bb-mono text-xs text-ink">{formatDate(detail.startDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="bb-body text-xs text-ink-soft">Fin previsto</dt>
                <dd className="bb-mono text-xs text-ink">{formatDate(detail.endDate)}</dd>
              </div>
              {detail.notes && (
                <div className="pt-2 border-t border-line">
                  <dt className="bb-body text-[11px] text-ink-soft mb-0.5">Observación / alcance</dt>
                  <dd className="bb-body text-xs text-ink italic">{detail.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 gap-3">
            <KpiCard
              label="Monto contratado"
              value={formatCurrency(detail.contractedAmount)}
            />
            <KpiCard
              label="Monto pagado"
              value={formatCurrency(detail.paidAmount)}
              valueColor="text-ink"
            />
            <KpiCard
              label="Saldo pendiente"
              value={formatCurrency(detail.pendingBalance)}
              valueColor={detail.pendingBalance > 0 ? 'text-rust' : 'text-ink'}
              subtext={detail.pendingBalance <= 0 ? '✓ Pagado completo' : undefined}
            />
          </div>

          {/* Payment progress bar */}
          <Card padding="p-4">
            <ProgressBar
              pct={
                detail.contractedAmount > 0
                  ? (detail.paidAmount / detail.contractedAmount) * 100
                  : 0
              }
              showLabel
              height="h-3"
            />
            {/* Payment history */}
            {detail.payments.length > 0 && (
              <div className="mt-4">
                <p className="bb-label-xs text-ink-soft mb-2">Historial de pagos</p>
                <ul className="space-y-1.5">
                  {detail.payments.map((pmt) => (
                    <li key={pmt.id} className="flex justify-between items-center">
                      <span className="bb-mono text-xs text-ink-soft">
                        {formatDate(pmt.payment_date)}
                        {pmt.payment_method && (
                          <span className="ml-1 opacity-60">· {pmt.payment_method}</span>
                        )}
                      </span>
                      <span className="bb-mono text-xs font-medium text-ink">
                        {formatCurrency(pmt.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Link to Kanban (not built yet — per scope) */}
          <button
            className="w-full py-2.5 px-4 border border-line rounded-card bb-body text-sm text-ink-soft hover:bg-paper hover:text-ink transition-colors text-left flex items-center gap-2"
            disabled
            title="Módulo Kanban — próximo sprint"
          >
            <span>🗂️</span>
            <span>Ver Kanban del proyecto</span>
            <span className="ml-auto bb-mono text-[10px] text-ink-soft">Próximamente</span>
          </button>
        </div>
      )}
    </aside>
  );
}
