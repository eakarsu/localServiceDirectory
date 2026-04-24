'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const [resolve, setResolve] = useState<((val: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    return new Promise<boolean>((res) => {
      setDialog(options);
      setResolve(() => res);
    });
  }, []);

  const handleConfirm = () => {
    resolve?.(true);
    setDialog(null);
    setResolve(null);
  };

  const handleCancel = () => {
    resolve?.(false);
    setDialog(null);
    setResolve(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={!!dialog}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        variant={dialog?.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}
