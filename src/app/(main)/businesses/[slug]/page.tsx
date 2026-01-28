'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Rating from '@/components/ui/Rating';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import ReviewCard from '@/components/reviews/ReviewCard';
import ReviewForm from '@/components/reviews/ReviewForm';
import BookingForm from '@/components/booking/BookingForm';
import QuoteRequestForm from '@/components/booking/QuoteRequestForm';
import {
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  Shield,
  Star,
  Heart,
  Calendar,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function BusinessDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetchBusiness();
  }, [params.slug]);

  const fetchBusiness = async () => {
    try {
      const res = await fetch(`/api/businesses/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        setBusiness(data);
      }
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!session?.user) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.favorited);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Loading fullScreen />
        <Footer />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Business not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const sortedHours = business.hours?.sort(
    (a: any, b: any) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Photo */}
              <div className="lg:w-1/3">
                {business.photos?.[0] ? (
                  <img
                    src={business.photos[0].url}
                    alt={business.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="lg:w-2/3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
                      {business.verified && (
                        <div className="bg-green-100 text-green-700 p-1 rounded-full">
                          <Shield className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1">
                        <Rating value={business.avgRating} showValue />
                        <span className="text-gray-500">
                          ({business.reviewCount} reviews)
                        </span>
                      </div>
                      {business.priceRange && (
                        <span className="text-gray-600">
                          {'$'.repeat(business.priceRange)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {business.categories?.map((cat: any) => (
                        <Badge key={cat.id} variant="info">
                          {cat.name}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-gray-600 mb-4">{business.description}</p>
                  </div>

                  <button
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-400 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {business.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-5 h-5" />
                      <span>
                        {business.address}, {business.city}, {business.state} {business.zipCode}
                      </span>
                    </div>
                  )}
                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
                    >
                      <Phone className="w-5 h-5" />
                      <span>{business.phone}</span>
                    </a>
                  )}
                  {business.email && (
                    <a
                      href={`mailto:${business.email}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
                    >
                      <Mail className="w-5 h-5" />
                      <span>{business.email}</span>
                    </a>
                  )}
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
                    >
                      <Globe className="w-5 h-5" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button onClick={() => setShowBooking(true)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Button>
                  <Button variant="outline" onClick={() => setShowQuote(true)}>
                    Request Quote
                  </Button>
                  <Button variant="ghost">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Services */}
              {business.services?.length > 0 && (
                <Card>
                  <h2 className="text-xl font-semibold mb-4">Services</h2>
                  <div className="space-y-3">
                    {business.services.map((service: any) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-500">{service.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {service.price ? (
                            <span className="font-semibold text-blue-600">
                              ${service.price}
                              {service.priceType === 'hourly' && '/hr'}
                            </span>
                          ) : (
                            <span className="text-gray-500">Quote Required</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Reviews */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Reviews</h2>
                  <Button variant="outline" size="sm" onClick={() => setShowReview(true)}>
                    Write a Review
                  </Button>
                </div>

                {business.reviews?.length > 0 ? (
                  <div className="space-y-4">
                    {business.reviews.map((review: any) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No reviews yet. Be the first to leave a review!
                  </p>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Hours */}
              {sortedHours?.length > 0 && (
                <Card>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Business Hours
                  </h3>
                  <div className="space-y-2">
                    {sortedHours.map((h: any) => (
                      <div key={h.dayOfWeek} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">
                          {h.dayOfWeek.toLowerCase()}
                        </span>
                        <span className={h.isClosed ? 'text-red-500' : 'text-gray-900'}>
                          {h.isClosed
                            ? 'Closed'
                            : `${h.openTime} - ${h.closeTime}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Service Areas */}
              {business.serviceAreas?.length > 0 && (
                <Card>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Service Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {business.serviceAreas.map((area: any, i: number) => (
                      <Badge key={i} variant="default">
                        {area.city}, {area.state}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Business Info */}
              <Card>
                <h3 className="font-semibold mb-3">Business Info</h3>
                <div className="space-y-2 text-sm">
                  {business.yearEstablished && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Established</span>
                      <span>{business.yearEstablished}</span>
                    </div>
                  )}
                  {business.licenseNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">License #</span>
                      <span>{business.licenseNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insured</span>
                    <span>{business.insured ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Radius</span>
                    <span>{business.serviceRadius} miles</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Booking Modal */}
      <Modal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        title="Book an Appointment"
        size="lg"
      >
        <BookingForm
          businessId={business.id}
          services={business.services || []}
          onSuccess={() => {
            setShowBooking(false);
            alert('Booking submitted successfully!');
          }}
          onCancel={() => setShowBooking(false)}
        />
      </Modal>

      {/* Quote Modal */}
      <Modal
        isOpen={showQuote}
        onClose={() => setShowQuote(false)}
        title="Request a Quote"
        size="lg"
      >
        <QuoteRequestForm
          businessId={business.id}
          onSuccess={() => {}}
          onCancel={() => setShowQuote(false)}
        />
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        title="Write a Review"
        size="lg"
      >
        <ReviewForm
          businessId={business.id}
          onSuccess={() => {
            setShowReview(false);
            fetchBusiness();
          }}
          onCancel={() => setShowReview(false)}
        />
      </Modal>
    </div>
  );
}
