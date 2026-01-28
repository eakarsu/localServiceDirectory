'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Phone } from 'lucide-react';
import Link from 'next/link';

export default function MyBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'quotes'>('bookings');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/my-bookings');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [bookingsRes, quotesRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/quotes'),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings);
      }

      if (quotesRes.ok) {
        const data = await quotesRes.json();
        setQuoteRequests(data.quoteRequests);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'success' | 'default' | 'danger'> = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      COMPLETED: 'default',
      CANCELLED: 'danger',
      SENT: 'info' as any,
      ACCEPTED: 'success',
      REJECTED: 'danger',
      EXPIRED: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Loading fullScreen text="Loading your bookings..." />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'bookings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Appointments ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'quotes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Quote Requests ({quoteRequests.length})
            </button>
          </div>

          {activeTab === 'bookings' ? (
            bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link
                            href={`/businesses/${booking.business.slug}`}
                            className="font-semibold text-lg hover:text-blue-600"
                          >
                            {booking.business.name}
                          </Link>
                          {getStatusBadge(booking.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(booking.date), 'EEEE, MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{booking.startTime}</span>
                          </div>
                          {booking.business.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{booking.business.address}</span>
                            </div>
                          )}
                          {booking.business.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <a
                                href={`tel:${booking.business.phone}`}
                                className="hover:text-blue-600"
                              >
                                {booking.business.phone}
                              </a>
                            </div>
                          )}
                        </div>

                        {booking.service && (
                          <p className="mt-2 text-sm">
                            <strong>Service:</strong> {booking.service.name}
                          </p>
                        )}

                        {booking.totalPrice && (
                          <p className="mt-1 text-lg font-semibold text-blue-600">
                            ${booking.totalPrice}
                          </p>
                        )}
                      </div>

                      {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => cancelBooking(booking.id)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No bookings yet</p>
                  <Link href="/search">
                    <Button>Find Services</Button>
                  </Link>
                </div>
              </Card>
            )
          ) : quoteRequests.length > 0 ? (
            <div className="space-y-4">
              {quoteRequests.map((quote) => (
                <Card key={quote.id}>
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      href={`/businesses/${quote.business.slug}`}
                      className="font-semibold hover:text-blue-600"
                    >
                      {quote.business.name}
                    </Link>
                    {getStatusBadge(quote.status)}
                  </div>

                  <p className="text-gray-600 mb-2">{quote.serviceDescription}</p>

                  {quote.aiEstimate && (
                    <p className="text-sm text-gray-500 mb-2">
                      AI Estimate: ${Math.round(quote.aiEstimate * 0.8)} - $
                      {Math.round(quote.aiEstimate * 1.2)}
                    </p>
                  )}

                  {quote.quote && (
                    <div className="bg-green-50 p-3 rounded-lg mt-3">
                      <p className="font-semibold text-green-700">
                        Quote: ${quote.quote.price}
                      </p>
                      <p className="text-sm text-gray-600">{quote.quote.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Valid until: {format(new Date(quote.quote.validUntil), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    Requested: {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No quote requests yet</p>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
