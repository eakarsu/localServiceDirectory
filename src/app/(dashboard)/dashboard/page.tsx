'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import {
  Eye,
  Calendar,
  Star,
  Users,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

interface Stats {
  views: number;
  bookings: number;
  reviews: number;
  leads: number;
  rating: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/analytics?days=30');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        setStats({
          views: data.totals.views,
          bookings: data.totals.bookings,
          reviews: data.stats.recentReviews,
          leads: data.stats.recentLeads,
          rating: data.stats.avgRating,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  const statCards = [
    {
      title: 'Total Views',
      value: stats?.views || 0,
      icon: Eye,
      color: 'blue',
    },
    {
      title: 'Bookings',
      value: stats?.bookings || 0,
      icon: Calendar,
      color: 'green',
    },
    {
      title: 'New Reviews',
      value: stats?.reviews || 0,
      icon: Star,
      color: 'yellow',
    },
    {
      title: 'New Leads',
      value: stats?.leads || 0,
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Avg Rating',
      value: stats?.rating?.toFixed(1) || '0.0',
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {session?.user?.name}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colors = colorClasses[stat.color];

          return (
            <Card key={stat.title}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Chart placeholder */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Performance Overview (Last 30 Days)</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          {analytics?.daily && analytics.daily.length > 0 ? (
            <div className="w-full px-4">
              <div className="flex items-end justify-between h-48 gap-1">
                {analytics.daily.slice(-14).map((day: any, i: number) => {
                  const maxViews = Math.max(...analytics.daily.map((d: any) => d.views));
                  const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;

                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${day.date}: ${day.views} views`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>14 days ago</span>
                <span>Today</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No data available yet</p>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover onClick={() => window.location.href = '/dashboard/profile'}>
          <h3 className="font-semibold mb-2">Update Profile</h3>
          <p className="text-sm text-gray-500">
            Keep your business information up to date
          </p>
        </Card>
        <Card hover onClick={() => window.location.href = '/dashboard/services'}>
          <h3 className="font-semibold mb-2">Manage Services</h3>
          <p className="text-sm text-gray-500">
            Add or update your service offerings
          </p>
        </Card>
        <Card hover onClick={() => window.location.href = '/dashboard/reviews'}>
          <h3 className="font-semibold mb-2">Respond to Reviews</h3>
          <p className="text-sm text-gray-500">
            Engage with your customers
          </p>
        </Card>
      </div>
    </div>
  );
}
