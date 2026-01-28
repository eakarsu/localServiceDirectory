import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import prisma from '@/lib/prisma';

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          _count: { select: { businesses: true } },
        },
      },
      _count: { select: { businesses: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  const getIcon = (icon: string | null) => {
    switch (icon) {
      case 'Home': return '🏠';
      case 'Car': return '🚗';
      case 'Heart': return '❤️';
      case 'Briefcase': return '💼';
      case 'Music': return '🎵';
      case 'PawPrint': return '🐾';
      case 'Sparkles': return '✨';
      case 'GraduationCap': return '🎓';
      case 'Wrench': return '🔧';
      case 'Zap': return '⚡';
      case 'Wind': return '💨';
      case 'Sparkle': return '✨';
      case 'Trees': return '🌲';
      case 'Paintbrush': return '🎨';
      case 'Hammer': return '🔨';
      default: return '📁';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Service Categories</h1>
            <p className="text-gray-600 mt-2">
              Browse services by category to find what you need
            </p>
          </div>

          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm p-6">
                <Link
                  href={`/categories/${category.slug}`}
                  className="flex items-center gap-3 mb-4 hover:text-blue-600 transition-colors"
                >
                  <span className="text-3xl">{getIcon(category.icon)}</span>
                  <div>
                    <h2 className="text-xl font-semibold">{category.name}</h2>
                    <p className="text-sm text-gray-500">
                      {category._count?.businesses || 0} businesses
                    </p>
                  </div>
                </Link>

                {category.description && (
                  <p className="text-gray-600 mb-4">{category.description}</p>
                )}

                {category.children && category.children.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/categories/${child.slug}`}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span>{getIcon(child.icon)}</span>
                        <div>
                          <span className="text-sm font-medium">{child.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({child._count?.businesses || 0})
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
