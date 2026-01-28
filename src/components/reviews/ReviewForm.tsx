'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Rating from '@/components/ui/Rating';

interface ReviewFormProps {
  businessId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({
  businessId,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    rating: 0,
    title: '',
    content: '',
    pros: '',
    cons: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      setError('Please sign in to leave a review');
      return;
    }

    if (form.rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!form.content.trim()) {
      setError('Please write a review');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...form,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating
        </label>
        <Rating
          value={form.rating}
          size="lg"
          interactive
          onChange={(value) => setForm({ ...form, rating: value })}
        />
      </div>

      <Input
        label="Review Title (optional)"
        placeholder="Summarize your experience"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <Textarea
        label="Your Review"
        placeholder="Tell others about your experience..."
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Textarea
          label="Pros (optional)"
          placeholder="What did you like?"
          value={form.pros}
          onChange={(e) => setForm({ ...form, pros: e.target.value })}
          rows={2}
        />
        <Textarea
          label="Cons (optional)"
          placeholder="What could be improved?"
          value={form.cons}
          onChange={(e) => setForm({ ...form, cons: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          Submit Review
        </Button>
      </div>
    </form>
  );
}
