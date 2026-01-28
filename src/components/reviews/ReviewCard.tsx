'use client';

import React from 'react';
import { format } from 'date-fns';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';
import { User, ThumbsUp, CheckCircle } from 'lucide-react';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title?: string | null;
    content: string;
    pros?: string | null;
    cons?: string | null;
    isVerified: boolean;
    createdAt: string | Date;
    user: {
      name: string;
      avatar?: string | null;
    };
    photos?: { url: string; caption?: string | null }[];
    response?: {
      content: string;
      createdAt: string | Date;
    } | null;
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {review.user.avatar ? (
              <img
                src={review.user.avatar}
                alt={review.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{review.user.name}</span>
              {review.isVerified && (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(review.createdAt), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
        <Rating value={review.rating} size="sm" />
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Content */}
      <p className="text-gray-700 mb-3">{review.content}</p>

      {/* Pros & Cons */}
      {(review.pros || review.cons) && (
        <div className="grid grid-cols-2 gap-4 mb-3">
          {review.pros && (
            <div>
              <span className="text-sm font-medium text-green-600">Pros:</span>
              <p className="text-sm text-gray-600">{review.pros}</p>
            </div>
          )}
          {review.cons && (
            <div>
              <span className="text-sm font-medium text-red-600">Cons:</span>
              <p className="text-sm text-gray-600">{review.cons}</p>
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {review.photos.map((photo, index) => (
            <img
              key={index}
              src={photo.url}
              alt={photo.caption || 'Review photo'}
              className="w-20 h-20 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Business Response */}
      {review.response && (
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="info" size="sm">Business Response</Badge>
            <span className="text-xs text-gray-500">
              {format(new Date(review.response.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          <p className="text-sm text-gray-700">{review.response.content}</p>
        </div>
      )}
    </div>
  );
}
