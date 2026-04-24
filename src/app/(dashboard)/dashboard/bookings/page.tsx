'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Loading from '@/components/ui/Loading';
import DataTable, { Column } from '@/components/ui/DataTable';
import BulkActionBar from '@/components/ui/BulkActionBar';
import { useSelection } from '@/hooks/useSelection';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { exportCsv } from '@/lib/exportCsv';
import { exportPdf } from '@/lib/exportPdf';
import { format } from 'date-fns';
import BookingDetailModal from '@/components/dashboard/BookingDetailModal';
import { Calendar, Download } from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { addToast } = useToast();
  const confirm = useConfirm();
  const selection = useSelection(bookings);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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
        addToast({ type: 'success', message: `Booking ${status.toLowerCase()}` });
        fetchBookings();
      }
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to update booking' });
    }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Delete Bookings',
      message: `Are you sure you want to delete ${selection.selectedCount} booking(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/bookings/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selection.selectedIds) }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Bookings deleted' });
        selection.clearSelection();
        fetchBookings();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete bookings' });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const res = await fetch('/api/bookings/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selection.selectedIds), data: { status } }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: `Bookings marked as ${status.toLowerCase()}` });
        selection.clearSelection();
        fetchBookings();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update bookings' });
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

  const exportColumns = [
    { key: 'service', header: 'Service' },
    { key: 'customer', header: 'Customer' },
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time' },
    { key: 'status', header: 'Status' },
    { key: 'price', header: 'Price' },
  ];

  const getExportData = () =>
    bookings.map((b) => ({
      service: b.service?.name || 'General',
      customer: b.user.name,
      date: format(new Date(b.date), 'MMM d, yyyy'),
      time: b.startTime,
      status: b.status,
      price: b.totalPrice ? `$${b.totalPrice}` : '-',
    }));

  const columns: Column<any>[] = [
    {
      key: 'service',
      header: 'Service',
      render: (b) => (
        <span className="font-medium">{b.service?.name || 'General Appointment'}</span>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (b) => b.user.name,
    },
    {
      key: 'date',
      header: 'Date & Time',
      render: (b) => (
        <span>{format(new Date(b.date), 'MMM d, yyyy')} at {b.startTime}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => getStatusBadge(b.status),
    },
    {
      key: 'totalPrice',
      header: 'Price',
      render: (b) => b.totalPrice ? <span className="font-semibold text-blue-600">${b.totalPrice}</span> : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (b) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {b.status === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => updateBookingStatus(b.id, 'CONFIRMED')}>
                Confirm
              </Button>
              <Button size="sm" variant="danger" onClick={() => updateBookingStatus(b.id, 'CANCELLED')}>
                Decline
              </Button>
            </>
          )}
          {b.status === 'CONFIRMED' && (
            <Button size="sm" onClick={() => updateBookingStatus(b.id, 'COMPLETED')}>
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

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
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportCsv(getExportData(), exportColumns, 'bookings')}
            >
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportPdf(getExportData(), exportColumns, 'bookings', 'Bookings Report')}
            >
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
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
      </div>

      {bookings.length > 0 ? (
        <DataTable
          data={bookings}
          columns={columns}
          selectable
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={selection.toggleAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          onRowClick={setSelectedBooking}
        />
      ) : (
        <Card>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        </Card>
      )}

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clearSelection}
        actions={[
          { label: 'Confirm All', onClick: () => handleBulkStatusUpdate('CONFIRMED') },
          { label: 'Delete', onClick: handleBulkDelete, variant: 'danger' },
        ]}
      />

      <BookingDetailModal
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdate={fetchBookings}
      />
    </div>
  );
}
