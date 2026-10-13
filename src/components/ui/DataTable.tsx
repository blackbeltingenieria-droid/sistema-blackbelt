// components/ui/DataTable.tsx
// Reusable table: uppercase 11px headers (ink-soft), rows with top-border (line).
// Generic column definitions so any module can use it.
//
// Responsive: por debajo del breakpoint `cardsBelow` cada fila se muestra como tarjeta
// (Card) apilada, en vez de una tabla con scroll horizontal. Cada columna decide su rol
// en la tarjeta con `mobile`:
//   title     → encabezado de la tarjeta (por defecto, la 1.ª columna)
//   highlight → cifra destacada a la derecha del título (ej. monto)
//   key       → dato visible con su etiqueta (por defecto, el resto de columnas)
//   detail    → oculto dentro de "Ver detalle" (expandible)
//   action    → botón de acción al pie de la tarjeta
//   hidden    → no se muestra en tarjeta (usar solo si el dato ya aparece en otra columna)

import type { ReactNode } from 'react';
import { DataTableCard } from './DataTableCard';

export type MobileRole = 'title' | 'highlight' | 'key' | 'detail' | 'action' | 'hidden';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, rowIndex: number) => ReactNode;
  className?: string;
  /** Rol de la columna cuando la fila se muestra como tarjeta. */
  mobile?: MobileRole;
  /** En tarjeta, la columna "key" ocupa todo el ancho (para contenido largo, ej. chips). */
  mobileFull?: boolean;
}

type CardsBelow = 'md' | 'lg' | 'xl';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Ancho mínimo desde el cual se usa tabla; por debajo, tarjetas. Default: md (768px). */
  cardsBelow?: CardsBelow;
}

// Clases literales (Tailwind necesita verlas completas para generarlas)
const SHOW_CARDS: Record<CardsBelow, string> = {
  md: 'md:hidden',
  lg: 'lg:hidden',
  xl: 'xl:hidden',
};
const SHOW_TABLE: Record<CardsBelow, string> = {
  md: 'hidden md:block',
  lg: 'hidden lg:block',
  xl: 'hidden xl:block',
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = 'Sin datos',
  cardsBelow = 'md',
}: DataTableProps<T>) {
  return (
    <>
      {/* Vista tarjetas (pantallas angostas) */}
      <div className={SHOW_CARDS[cardsBelow]}>
        {rows.length === 0 ? (
          <p className="bb-body text-ink-soft text-center py-12 text-sm">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 items-start">
            {rows.map((row, rowIndex) => (
              <DataTableCard<T>
                key={getRowKey(row)}
                row={row}
                rowIndex={rowIndex}
                columns={columns}
                onClick={onRowClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Vista tabla (pantallas anchas) */}
      <div className={`w-full overflow-x-auto ${SHOW_TABLE[cardsBelow]}`}>
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`bb-label-xs text-ink-soft text-left px-4 py-3 border-b border-line bg-paper ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="bb-body text-ink-soft text-center py-12 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-t border-line bg-paper transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-canvas' : '',
                  ].join(' ')}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                      {col.render(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
