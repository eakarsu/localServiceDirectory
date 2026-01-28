import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BusinessCard from '@/components/business/BusinessCard';
import prisma from '@/lib/prisma';
import { ChevronRight } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: {
        include: {
          _count: { select: { businesses: true } },
        },
      },
    },
  });
}

async function getBusinesses(categorySlug: string) {
  return prisma.business.findMany({
    where: {
      active: true,
      categories: { some: { slug: categorySlug } },
    },
    include: {
      categories: true,
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: [{ featured: 'desc' }, { avgRating: 'desc' }],
    take: 12,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [category, businesses] = await Promise.all([
    getCategory(slug),
    getBusinesses(slug),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/categories" className="hover:text-gray-700">
              Categories
            </Link>
            <ChevronRight className="w-4 h-4" />
            {category.parent && (
              <>
                <Link
                  href={`/categories/${category.parent.slug}`}
                  className="hover:text-gray-700"
                >
                  {category.parent.name}
                </Link>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
            <span className="text-gray-900">{category.name}</span>
          </nav>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="text-gray-600 mt-2">{category.description}</p>
            )}
          </div>

          {/* Subcategories */}
          {category.children && category.children.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Subcategories</h2>
              <div className="flex flex-wrap gap-3">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {child.name}
                    <span className="text-gray-500 ml-2">
                      ({child._count?.businesses || 0})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Businesses */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {businesses.length} Businesses in {category.name}
            </h2>

            {businesses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business as any} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">
                  No businesses found in this category yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
