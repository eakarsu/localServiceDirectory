'use client';

import React from 'react';

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded h-4 ${className}`} />
  );
}

function SkeletonCircle({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-full w-10 h-10 ${className}`} />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonCircle />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-1/3" />
          <SkeletonLine className="w-1/4 h-3" />
        </div>
      </div>
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-1/2" />
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="border-b px-6 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="flex-1 h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="border-b px-6 py-4 flex gap-4">
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonLine key={col} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { SkeletonLine, SkeletonCircle, SkeletonCard, SkeletonTable };
