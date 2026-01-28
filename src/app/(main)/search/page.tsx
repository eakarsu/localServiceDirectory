import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BusinessCard from '@/components/business/BusinessCard';
import SearchFilters from '@/components/search/SearchFilters';
import Loading from '@/components/ui/Loading';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    state?: string;
    minRating?: string;
    priceRange?: string;
    verified?: string;
    sortBy?: string;
    page?: string;
  }>;
}

async function searchBusinesses(params: any) {
  const page = parseInt(params.page || '1');
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: any = { active: true };

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
      { services: { some: { name: { contains: params.q, mode: 'insensitive' } } } },
    ];
  }

  if (params.category) {
    where.categories = { some: { slug: params.category } };
  }

  if (params.city) {
    where.city = { contains: params.city, mode: 'insensitive' };
  }

  if (params.minRating) {
    where.avgRating = { gte: parseFloat(params.minRating) };
  }

  if (params.priceRange) {
    const [min, max] = params.priceRange.split(',').map(Number);
    where.priceRange = { gte: min, lte: max };
  }

  if (params.verified === 'true') {
    where.verified = true;
  }

  let orderBy: any = [{ featured: 'desc' }, { avgRating: 'desc' }];
  if (params.sortBy === 'reviews') {
    orderBy = [{ featured: 'desc' }, { reviewCount: 'desc' }];
  } else if (params.sortBy === 'name') {
    orderBy = [{ name: 'asc' }];
  } else if (params.sortBy === 'newest') {
    orderBy = [{ createdAt: 'desc' }];
  }

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        categories: true,
        photos: { where: { isPrimary: true }, take: 1 },
      },
      orderBy,
      take: limit,
      skip,
    }),
    prisma.business.count({ where }),
  ]);

  return {
    businesses,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const [results, categories] = await Promise.all([
    searchBusinesses(params),
    getCategories(),
  ]);

  const buildPageUrl = (pageNum: number) => {
    const p = new URLSearchParams();
    if (params.q) p.set('q', params.q);
    if (params.category) p.set('category', params.category);
    if (params.city) p.set('city', params.city);
    if (params.minRating) p.set('minRating', params.minRating);
    if (params.priceRange) p.set('priceRange', params.priceRange);
    if (params.verified) p.set('verified', params.verified);
    if (params.sortBy) p.set('sortBy', params.sortBy);
    p.set('page', pageNum.toString());
    return `/search?${p.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {params.q ? `Search results for "${params.q}"` : 'Browse Services'}
            </h1>
            <p className="text-gray-600">
              {results.total} {results.total === 1 ? 'business' : 'businesses'} found
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <Suspense fallback={<Loading />}>
                <SearchFilters categories={categories} />
              </Suspense>
            </aside>

            {/* Results */}
            <div className="flex-1">
              {results.businesses.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {results.businesses.map((business) => (
                      <BusinessCard key={business.id} business={business as any} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {results.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      {results.page > 1 && (
                        <Link
                          href={buildPageUrl(results.page - 1)}
                          className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Link>
                      )}

                      <span className="px-4 py-2 text-gray-600">
                        Page {results.page} of {results.totalPages}
                      </span>

                      {results.page < results.totalPages && (
                        <Link
                          href={buildPageUrl(results.page + 1)}
                          className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg">
                  <p className="text-gray-500 mb-4">No businesses found matching your criteria.</p>
                  <Link
                    href="/search"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all filters
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
