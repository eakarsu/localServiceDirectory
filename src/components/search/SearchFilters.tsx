'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface SearchFiltersProps {
  categories: Category[];
}

export default function SearchFilters({ categories }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentCity = searchParams.get('city') || '';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentPriceRange = searchParams.get('priceRange') || '';
  const currentVerified = searchParams.get('verified') || '';
  const currentSort = searchParams.get('sortBy') || 'rating';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    const query = searchParams.get('q');
    router.push(query ? `/search?q=${query}` : '/search');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-900">Filters</h3>

      <Select
        label="Category"
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        value={currentCategory}
        onChange={(value) => updateFilters('category', value)}
        placeholder="All Categories"
      />

      <Input
        label="City"
        placeholder="Enter city name"
        value={currentCity}
        onChange={(e) => updateFilters('city', e.target.value)}
      />

      <Select
        label="Minimum Rating"
        options={[
          { value: '4', label: '4+ Stars' },
          { value: '3', label: '3+ Stars' },
          { value: '2', label: '2+ Stars' },
        ]}
        value={currentMinRating}
        onChange={(value) => updateFilters('minRating', value)}
        placeholder="Any Rating"
      />

      <Select
        label="Price Range"
        options={[
          { value: '1,1', label: '$ - Budget' },
          { value: '2,2', label: '$$ - Moderate' },
          { value: '3,3', label: '$$$ - Premium' },
          { value: '4,4', label: '$$$$ - Luxury' },
        ]}
        value={currentPriceRange}
        onChange={(value) => updateFilters('priceRange', value)}
        placeholder="Any Price"
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="verified"
          checked={currentVerified === 'true'}
          onChange={(e) => updateFilters('verified', e.target.checked ? 'true' : '')}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="verified" className="text-sm text-gray-700">
          Verified businesses only
        </label>
      </div>

      <hr />

      <Select
        label="Sort By"
        options={[
          { value: 'rating', label: 'Highest Rated' },
          { value: 'reviews', label: 'Most Reviews' },
          { value: 'name', label: 'Name (A-Z)' },
          { value: 'newest', label: 'Newest' },
        ]}
        value={currentSort}
        onChange={(value) => updateFilters('sortBy', value)}
      />

      <Button variant="ghost" onClick={clearFilters} className="w-full">
        Clear Filters
      </Button>
    </div>
  );
}
