'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onCancel} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
          <div className="flex items-start gap-4">
            {variant === 'danger' && (
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
