'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'Something went wrong in the dashboard.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
