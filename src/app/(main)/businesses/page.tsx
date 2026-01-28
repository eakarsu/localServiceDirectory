import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BusinessCard from '@/components/business/BusinessCard';
import prisma from '@/lib/prisma';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BusinessesPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
  }>;
}

async function getBusinesses(params: any) {
  const page = parseInt(params.page || '1');
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: any = { active: true };

  if (params.category) {
    where.categories = { some: { slug: params.category } };
  }

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        categories: true,
        photos: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: [{ featured: 'desc' }, { avgRating: 'desc' }],
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

export default async function BusinessesPage({ searchParams }: BusinessesPageProps) {
  const params = await searchParams;
  const results = await getBusinesses(params);

  const buildPageUrl = (pageNum: number) => {
    const p = new URLSearchParams();
    if (params.category) p.set('category', params.category);
    p.set('page', pageNum.toString());
    return `/businesses?${p.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">All Businesses</h1>
            <p className="text-gray-600 mt-2">
              Discover {results.total} trusted local service providers
            </p>
          </div>

          {results.businesses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 bg-white"
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
                      className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 bg-white"
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
              <p className="text-gray-500">No businesses found.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
