'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { X } from 'lucide-react';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  loading?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export default function BulkActionBar({
  selectedCount,
  actions,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-gray-600" />
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <Button
            key={i}
            size="sm"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            loading={action.loading}
            className={action.variant === 'outline' ? '!border-gray-500 !text-white hover:!bg-gray-700' : ''}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <button onClick={onClear} className="ml-2 p-1 hover:bg-gray-700 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
