// components/ui/DataTableCard.tsx
// Fila de DataTable convertida en tarjeta (Card) para pantallas angostas.
// Uso interno de DataTable — no se usa directamente desde los módulos.

import { useState } from 'react';
import { Card } from './Card';
import type { Column } from './DataTable';

interface DataTableCardProps<T> {
  row: T;
  rowIndex: number;
  columns: Column<T>[];
  onClick?: (row: T) => void;
}

export function DataTableCard<T>({ row, rowIndex, columns, onClick }: DataTableCardProps<T>) {
  const [open, setOpen] = useState(false);

  // Rol de cada columna en la tarjeta. Por defecto: la primera es título y el resto "key".
  const roleOf = (col: Column<T>, idx: number) => col.mobile ?? (idx === 0 ? 'title' : 'key');
  const withRole = (role: string) => columns.filter((c, i) => roleOf(c, i) === role);

  const titles     = withRole('title');
  const highlights = withRole('highlight');
  const keys       = withRole('key');
  const details    = withRole('detail');
  const actions    = withRole('action');

  const clickable = Boolean(onClick);

  return (
    <Card
      padding="p-4"
      className={clickable ? 'cursor-pointer active:bg-canvas transition-colors' : ''}
    >
      <div
        onClick={() => onClick?.(row)}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (clickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.(row);
          }
        }}
      >
        {/* Título + cifra destacada */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {titles.map((c) => (
              <div key={c.key}>{c.render(row, rowIndex)}</div>
            ))}
          </div>
          {highlights.length > 0 && (
            <div className="shrink-0 text-right space-y-0.5">
              {highlights.map((c) => (
                <div key={c.key}>
                  <p className="bb-label-xs text-ink-soft text-[9px] mb-0.5">{c.header}</p>
                  {c.render(row, rowIndex)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Datos clave */}
        {keys.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {keys.map((c) => (
              <div key={c.key} className={`min-w-0 ${c.mobileFull ? 'col-span-2' : ''}`}>
                <dt className="bb-label-xs text-ink-soft text-[10px] mb-0.5">{c.header}</dt>
                <dd className="min-w-0 break-words">{c.render(row, rowIndex)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Detalle expandible */}
      {details.length > 0 && (
        <>
          {open && (
            <dl className="mt-3 pt-3 border-t border-line space-y-2.5">
              {details.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="bb-label-xs text-ink-soft text-[10px] mb-0.5">{c.header}</dt>
                  <dd className="min-w-0 break-words">{c.render(row, rowIndex)}</dd>
                </div>
              ))}
            </dl>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 -mb-1 w-full min-h-[44px] flex items-center justify-between bb-body text-xs font-medium text-ink-soft hover:text-ink"
          >
            <span>{open ? 'Ocultar detalle' : 'Ver detalle'}</span>
            <span aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </>
      )}

      {/* Acciones (botón grande, siempre visible) */}
      {actions.length > 0 && (
        <div
          className="mt-3 pt-3 border-t border-line flex justify-end gap-2 [&_button]:min-h-[44px] [&_button]:px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((c) => (
            <div key={c.key}>{c.render(row, rowIndex)}</div>
          ))}
        </div>
      )}
    </Card>
  );
}
