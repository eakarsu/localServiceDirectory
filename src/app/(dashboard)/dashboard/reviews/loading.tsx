import React from 'react';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ReviewsLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-28 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-60" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
