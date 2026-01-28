'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Loading from '@/components/ui/Loading';
import { format } from 'date-fns';
import { Calendar, User, Phone, Mail, Clock } from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);

      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchBookings();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'success' | 'default' | 'danger'> = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      COMPLETED: 'default',
      CANCELLED: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return <Loading text="Loading bookings..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage your appointments and bookings</p>
        </div>
        <Select
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          value={filter}
          onChange={setFilter}
          placeholder="All Bookings"
        />
      </div>

      {bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {booking.service?.name || 'General Appointment'}
                    </h3>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(booking.date), 'MMM d, yyyy')} at {booking.startTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{booking.user.name}</span>
                    </div>
                    {booking.user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${booking.user.phone}`} className="hover:text-blue-600">
                          {booking.user.phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${booking.user.email}`} className="hover:text-blue-600">
                        {booking.user.email}
                      </a>
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="mt-2 text-sm text-gray-500">
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  )}

                  {booking.totalPrice && (
                    <p className="mt-2 text-lg font-semibold text-blue-600">
                      ${booking.totalPrice}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {booking.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'CONFIRMED')}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {booking.status === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'COMPLETED')}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        </Card>
      )}
    </div>
  );
}
