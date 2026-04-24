'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Rating from '@/components/ui/Rating';
import Textarea from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { format } from 'date-fns';
import { User } from 'lucide-react';

interface ReviewDetailModalProps {
  review: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReviewDetailModal({
  review,
  isOpen,
  onClose,
  onUpdate,
}: ReviewDetailModalProps) {
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const confirm = useConfirm();

  if (!review) return null;

  const sentimentVariants: Record<string, 'success' | 'warning' | 'danger'> = {
    positive: 'success',
    neutral: 'warning',
    negative: 'danger',
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: response }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Response submitted' });
        setResponding(false);
        setResponse('');
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to submit response' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/reviews/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [review.id] }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Review deleted' });
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete review' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Details" size="lg">
      <div className="space-y-4">
        {/* Reviewer info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{review.user.name}</span>
                {review.isVerified && <Badge variant="success" size="sm">Verified</Badge>}
              </div>
              <p className="text-sm text-gray-500">
                {format(new Date(review.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Rating value={review.rating} size="sm" />
            {review.aiSentiment && (
              <Badge variant={sentimentVariants[review.aiSentiment]}>{review.aiSentiment}</Badge>
            )}
          </div>
        </div>

        {/* Review content */}
        {review.title && <h4 className="font-semibold">{review.title}</h4>}
        <p className="text-gray-700">{review.content}</p>

        {(review.pros || review.cons) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {review.pros && (
              <div className="bg-green-50 p-3 rounded-lg">
                <span className="font-medium text-green-700">Pros</span>
                <p className="text-green-600 mt-1">{review.pros}</p>
              </div>
            )}
            {review.cons && (
              <div className="bg-red-50 p-3 rounded-lg">
                <span className="font-medium text-red-700">Cons</span>
                <p className="text-red-600 mt-1">{review.cons}</p>
              </div>
            )}
          </div>
        )}

        {/* Existing response */}
        {review.response && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="info" size="sm">Your Response</Badge>
              <span className="text-xs text-gray-500">
                {format(new Date(review.response.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
            <p className="text-sm text-gray-700">{review.response.content}</p>
          </div>
        )}

        {/* Respond form */}
        {!review.response && responding && (
          <div className="space-y-3">
            <Textarea
              label="Your Response"
              placeholder="Thank the customer and address their feedback..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setResponding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitResponse} loading={submitting}>
                Submit
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Delete
          </Button>
          {!review.response && !responding && (
            <Button variant="outline" size="sm" onClick={() => setResponding(true)}>
              Respond
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
