'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
