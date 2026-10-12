// components/ui/DataTable.tsx
// Reusable table: uppercase 11px headers (ink-soft), rows with top-border (line).
// Generic column definitions so any module can use it.

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, rowIndex: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = 'Sin datos',
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto">
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
  );
}
