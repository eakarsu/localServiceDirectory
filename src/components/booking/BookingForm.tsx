'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

interface Service {
  id: string;
  name: string;
  price?: number | null;
  duration?: number | null;
  priceType?: string | null;
}

interface BookingFormProps {
  businessId: string;
  services: Service[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BookingForm({
  businessId,
  services,
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    serviceId: '',
    date: '',
    startTime: '',
    notes: '',
  });

  const selectedService = services.find((s) => s.id === form.serviceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      router.push('/login');
      return;
    }

    if (!form.date || !form.startTime) {
      setError('Please select a date and time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          serviceId: form.serviceId || undefined,
          date: form.date,
          startTime: form.startTime,
          notes: form.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      const time = `${hour}:${minute}`;
      const label = `${h > 12 ? h - 12 : h}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
      timeSlots.push({ value: time, label });
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {services.length > 0 && (
        <Select
          label="Select Service"
          options={services.map((s) => ({
            value: s.id,
            label: `${s.name}${s.price ? ` - $${s.price}` : s.priceType === 'quote' ? ' - Quote Required' : ''}`,
          }))}
          value={form.serviceId}
          onChange={(value) => setForm({ ...form, serviceId: value })}
          placeholder="Choose a service (optional)"
        />
      )}

      {selectedService && selectedService.price && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Estimated Price:</span>
            <span className="font-semibold text-blue-600">
              ${selectedService.price}
              {selectedService.priceType === 'hourly' && '/hr'}
            </span>
          </div>
          {selectedService.duration && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-700">Duration:</span>
              <span className="text-gray-600">{selectedService.duration} mins</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          min={today}
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />

        <Select
          label="Time"
          options={timeSlots}
          value={form.startTime}
          onChange={(value) => setForm({ ...form, startTime: value })}
          placeholder="Select time"
        />
      </div>

      <Textarea
        label="Notes (optional)"
        placeholder="Any specific requirements or details..."
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        rows={3}
      />

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {session?.user ? 'Book Now' : 'Sign In to Book'}
        </Button>
      </div>
    </form>
  );
}
