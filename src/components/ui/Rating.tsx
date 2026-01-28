'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export default function Rating({
  value,
  max = 5,
  size = 'md',
  showValue = false,
  interactive = false,
  onChange,
}: RatingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (rating: number) => {
    if (interactive && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const rating = i + 1;
        const filled = rating <= value;
        const partial = rating > value && rating - 1 < value;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(rating)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`${sizes[size]} ${
                filled
                  ? 'text-yellow-400 fill-yellow-400'
                  : partial
                  ? 'text-yellow-400 fill-yellow-200'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm text-gray-600">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
