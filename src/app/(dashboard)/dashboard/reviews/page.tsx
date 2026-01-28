'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Modal from '@/components/ui/Modal';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';
import Loading from '@/components/ui/Loading';
import { format } from 'date-fns';
import { Star, MessageSquare, User } from 'lucide-react';

export default function ReviewsPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [session]);

  const fetchReviews = async () => {
    if (!session?.user?.businessId) return;

    try {
      const res = await fetch(`/api/reviews?businessId=${session.user.businessId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!selectedReview || !response.trim()) return;

    setResponding(true);
    try {
      const res = await fetch(`/api/reviews/${selectedReview.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: response }),
      });

      if (res.ok) {
        setSelectedReview(null);
        setResponse('');
        fetchReviews();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setResponding(false);
    }
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      positive: 'success',
      neutral: 'warning',
      negative: 'danger',
    };
    return <Badge variant={variants[sentiment] || 'default'}>{sentiment}</Badge>;
  };

  if (loading) {
    return <Loading text="Loading reviews..." />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-600">Manage and respond to customer reviews</p>
      </div>

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.user.name}</span>
                      {review.isVerified && (
                        <Badge variant="success" size="sm">Verified</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(review.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Rating value={review.rating} size="sm" />
                  {getSentimentBadge(review.aiSentiment)}
                </div>
              </div>

              {review.title && (
                <h3 className="font-semibold mb-2">{review.title}</h3>
              )}

              <p className="text-gray-700 mb-4">{review.content}</p>

              {(review.pros || review.cons) && (
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  {review.pros && (
                    <div>
                      <span className="font-medium text-green-600">Pros:</span>
                      <p className="text-gray-600">{review.pros}</p>
                    </div>
                  )}
                  {review.cons && (
                    <div>
                      <span className="font-medium text-red-600">Cons:</span>
                      <p className="text-gray-600">{review.cons}</p>
                    </div>
                  )}
                </div>
              )}

              {review.response ? (
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info" size="sm">Your Response</Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(review.response.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.response.content}</p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReview(review)}
                  className="mt-4"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Respond
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reviews yet</p>
          </div>
        </Card>
      )}

      {/* Response Modal */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Respond to Review"
      >
        {selectedReview && (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Rating value={selectedReview.rating} size="sm" />
                <span className="font-medium">{selectedReview.user.name}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedReview.content}</p>
            </div>

            <Textarea
              label="Your Response"
              placeholder="Thank the customer and address their feedback..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button onClick={submitResponse} loading={responding}>
                Submit Response
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
