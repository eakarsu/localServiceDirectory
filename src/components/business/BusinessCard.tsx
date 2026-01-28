'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Star, Phone, Clock, Shield } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface BusinessCardProps {
  business: {
    id: string;
    name: string;
    slug: string;
    shortDescription?: string | null;
    city?: string | null;
    state?: string | null;
    avgRating: number;
    reviewCount: number;
    priceRange?: number | null;
    verified: boolean;
    featured: boolean;
    categories: { id: string; name: string }[];
    photos: { url: string }[];
  };
}

export default function BusinessCard({ business }: BusinessCardProps) {
  const priceRangeDisplay = business.priceRange
    ? '$'.repeat(business.priceRange)
    : '';

  return (
    <Link href={`/businesses/${business.slug}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        {/* Image */}
        <div className="relative h-48 bg-gray-200">
          {business.photos[0] ? (
            <img
              src={business.photos[0].url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {business.featured && (
            <div className="absolute top-2 left-2">
              <Badge variant="warning">Featured</Badge>
            </div>
          )}
          {business.verified && (
            <div className="absolute top-2 right-2">
              <div className="bg-green-500 text-white p-1 rounded-full">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {business.name}
            </h3>
            {priceRangeDisplay && (
              <span className="text-gray-500 text-sm">{priceRangeDisplay}</span>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-medium">{business.avgRating.toFixed(1)}</span>
            <span className="text-gray-500 text-sm">
              ({business.reviewCount} reviews)
            </span>
          </div>

          {/* Location */}
          {(business.city || business.state) && (
            <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              <span>
                {[business.city, business.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Description */}
          {business.shortDescription && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {business.shortDescription}
            </p>
          )}

          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {business.categories.slice(0, 2).map((category) => (
              <Badge key={category.id} variant="info" size="sm">
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
