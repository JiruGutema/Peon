'use client';

import * as React from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  onRowClick,
  isLoading = false,
  emptyState,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  if (!isLoading && rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className={cn('bg-card border-border overflow-hidden rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-4 w-2/3" /></TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => {
                const href = rowHref?.(row);
                return (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn((href || onRowClick) && 'cursor-pointer')}
                  >
                    {columns.map((c, i) => (
                      <TableCell key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)}>
                        {href && i === 0 ? (
                          <Link href={href} className="after:absolute after:inset-0 relative font-medium">
                            {c.cell(row)}
                          </Link>
                        ) : (
                          c.cell(row)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
