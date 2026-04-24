'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { format } from 'date-fns';
import { Calendar, User, Phone, Mail, Clock, DollarSign } from 'lucide-react';

interface BookingDetailModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookingDetailModal({
  booking,
  isOpen,
  onClose,
  onUpdate,
}: BookingDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: booking?.status || '',
    notes: booking?.notes || '',
  });
  const { addToast } = useToast();
  const confirm = useConfirm();

  if (!booking) return null;

  const statusVariants: Record<string, 'warning' | 'success' | 'default' | 'danger'> = {
    PENDING: 'warning',
    CONFIRMED: 'success',
    COMPLETED: 'default',
    CANCELLED: 'danger',
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Booking updated' });
        setEditing(false);
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update booking' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Booking',
      message: 'Are you sure you want to delete this booking? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Booking deleted' });
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete booking' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Booking Details" size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {booking.service?.name || 'General Appointment'}
          </h3>
          <Badge variant={statusVariants[booking.status]}>{booking.status}</Badge>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Select
              label="Status"
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
            />
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(booking.date), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{booking.startTime}{booking.endTime ? ` - ${booking.endTime}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>{booking.user.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{booking.user.email}</span>
              </div>
              {booking.user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{booking.user.phone}</span>
                </div>
              )}
              {booking.totalPrice && (
                <div className="flex items-center gap-2 text-blue-600 font-semibold">
                  <DollarSign className="w-4 h-4" />
                  <span>${booking.totalPrice}</span>
                </div>
              )}
            </div>

            {booking.notes && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{booking.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setForm({ status: booking.status, notes: booking.notes || '' });
                setEditing(true);
              }}>
                Edit
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
