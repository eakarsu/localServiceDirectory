'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Rating from '@/components/ui/Rating';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import Link from 'next/link';

export default function MyReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/my-reviews');
    } else if (status === 'authenticated') {
      fetchReviews();
    }
  }, [status, session, router]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?userId=${session?.user?.id}`);
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Loading fullScreen text="Loading your reviews..." />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Reviews</h1>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link
                        href={`/businesses/${review.business.slug}`}
                        className="font-semibold text-lg hover:text-blue-600"
                      >
                        {review.business.name}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {format(new Date(review.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Rating value={review.rating} size="sm" />
                      <Badge
                        variant={review.status === 'APPROVED' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {review.status}
                      </Badge>
                    </div>
                  </div>

                  {review.title && (
                    <h3 className="font-medium mb-2">{review.title}</h3>
                  )}

                  <p className="text-gray-700 mb-3">{review.content}</p>

                  {(review.pros || review.cons) && (
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
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

                  {review.response && (
                    <div className="bg-gray-50 p-3 rounded-lg mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Business Response:
                      </p>
                      <p className="text-sm text-gray-600">{review.response.content}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven&apos;t written any reviews yet</p>
              <Link href="/search">
                <Button>Find Services to Review</Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
