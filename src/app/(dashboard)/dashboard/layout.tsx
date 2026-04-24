'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import Loading from '@/components/ui/Loading';
import { Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard');
    } else if (status === 'authenticated' && session?.user?.role !== 'BUSINESS_OWNER' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <Loading fullScreen text="Loading dashboard..." />;
  }

  if (status === 'unauthenticated' || (session?.user?.role !== 'BUSINESS_OWNER' && session?.user?.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900">Dashboard</span>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
