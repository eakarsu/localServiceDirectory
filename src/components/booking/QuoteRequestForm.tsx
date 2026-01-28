'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';

interface QuoteRequestFormProps {
  businessId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function QuoteRequestForm({
  businessId,
  onSuccess,
  onCancel,
}: QuoteRequestFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiEstimate, setAiEstimate] = useState<number | null>(null);
  const [form, setForm] = useState({
    serviceDescription: '',
    details: '',
    preferredDate: '',
    budget: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      router.push('/login');
      return;
    }

    if (!form.serviceDescription.trim()) {
      setError('Please describe the service you need');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...form,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit quote request');
      }

      const data = await res.json();
      setAiEstimate(data.aiEstimate);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (aiEstimate) {
    return (
      <div className="text-center py-6">
        <div className="text-green-500 text-5xl mb-4">&#10003;</div>
        <h3 className="text-xl font-semibold mb-2">Quote Request Submitted!</h3>
        <p className="text-gray-600 mb-4">
          The business will review your request and get back to you soon.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-1">AI Estimated Price Range:</p>
          <p className="text-2xl font-bold text-blue-600">
            ${Math.round(aiEstimate * 0.8)} - ${Math.round(aiEstimate * 1.2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            *This is an estimate. Actual price may vary.
          </p>
        </div>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Textarea
        label="What service do you need?"
        placeholder="Describe the service you're looking for..."
        value={form.serviceDescription}
        onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
        required
      />

      <Textarea
        label="Additional Details (optional)"
        placeholder="Any specific requirements, measurements, conditions, etc..."
        value={form.details}
        onChange={(e) => setForm({ ...form, details: e.target.value })}
        rows={3}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Preferred Date (optional)"
          type="date"
          value={form.preferredDate}
          onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
        />

        <Input
          label="Budget Range (optional)"
          placeholder="e.g., $500-1000"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
        />
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {session?.user ? 'Request Quote' : 'Sign In to Request'}
        </Button>
      </div>
    </form>
  );
}
