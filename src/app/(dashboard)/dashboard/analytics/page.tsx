'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { Eye, MousePointer, Phone, Calendar, MessageSquare, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Loading analytics..." />;
  }

  const stats = [
    { label: 'Total Views', value: analytics?.totals?.views || 0, icon: Eye, color: 'blue' },
    { label: 'Profile Clicks', value: analytics?.totals?.clicks || 0, icon: MousePointer, color: 'green' },
    { label: 'Phone Calls', value: analytics?.totals?.calls || 0, icon: Phone, color: 'purple' },
    { label: 'Bookings', value: analytics?.totals?.bookings || 0, icon: Calendar, color: 'orange' },
    { label: 'Quote Requests', value: analytics?.totals?.quoteRequests || 0, icon: MessageSquare, color: 'pink' },
    { label: 'Search Appearances', value: analytics?.totals?.searches || 0, icon: TrendingUp, color: 'indigo' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your business performance</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Views Over Time</h2>
        <div className="h-64">
          {analytics?.daily && analytics.daily.length > 0 ? (
            <div className="flex items-end justify-between h-48 gap-1 px-4">
              {analytics.daily.map((day: any, i: number) => {
                const maxViews = Math.max(...analytics.daily.map((d: any) => d.views), 1);
                const height = (day.views / maxViews) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${day.views} views`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No data available for this period
            </div>
          )}
        </div>
        {analytics?.daily && analytics.daily.length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-gray-500 px-4">
            <span>{analytics.daily[0]?.date}</span>
            <span>{analytics.daily[analytics.daily.length - 1]?.date}</span>
          </div>
        )}
      </Card>

      {/* Business Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card>
          <h3 className="font-semibold mb-4">Review Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-semibold">{analytics?.stats?.avgRating?.toFixed(1) || '0.0'} / 5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Reviews</span>
              <span className="font-semibold">{analytics?.stats?.reviewCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">New Reviews ({days} days)</span>
              <span className="font-semibold">{analytics?.stats?.recentReviews || 0}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Lead Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">New Leads ({days} days)</span>
              <span className="font-semibold">{analytics?.stats?.recentLeads || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Bookings</span>
              <span className="font-semibold">{analytics?.stats?.pendingBookings || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
