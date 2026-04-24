'use client';

import React, { useState, useMemo } from 'react';
import Checkbox from '@/components/ui/Checkbox';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
  someSelected?: boolean;
  onRowClick?: (item: T) => void;
  sortable?: boolean;
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected = false,
  someSelected = false,
  onRowClick,
  sortable = true,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            {selectable && (
              <th className="px-4 py-3 w-12">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => onToggleSelectAll?.()}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-medium text-gray-600 ${
                  col.sortable !== false && sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''
                } ${col.className || ''}`}
                onClick={() => {
                  if (col.sortable !== false && sortable) {
                    handleSort(col.key);
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable !== false && sortable && (
                    <span className="text-gray-400">
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={item.id}
              className={`border-b last:border-0 transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'
              } ${selectedIds?.has(item.id) ? 'bg-blue-50' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {selectable && (
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds?.has(item.id) || false}
                    onChange={() => onToggleSelect?.(item.id)}
                  />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                  {col.render
                    ? col.render(item)
                    : String((item as any)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
