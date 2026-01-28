import { Business, Category, Service, Review, Booking, User, Lead, QuoteRequest } from '@prisma/client';

export type BusinessWithRelations = Business & {
  categories: Category[];
  services: Service[];
  reviews: (Review & { user: Pick<User, 'id' | 'name' | 'avatar'> })[];
  photos: { id: string; url: string; caption: string | null; isPrimary: boolean }[];
  hours: { dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }[];
  serviceAreas: { city: string; state: string }[];
  owner: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
};

export type CategoryWithChildren = Category & {
  children: Category[];
  parent: Category | null;
  _count?: { businesses: number };
};

export type ReviewWithUser = Review & {
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  photos: { id: string; url: string; caption: string | null }[];
  response?: { content: string; createdAt: Date } | null;
};

export type BookingWithDetails = Booking & {
  business: Pick<Business, 'id' | 'name' | 'slug' | 'phone' | 'address'>;
  service: Pick<Service, 'id' | 'name' | 'price' | 'duration'> | null;
  user: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
};

export type LeadWithBusiness = Lead & {
  business: Pick<Business, 'id' | 'name'>;
};

export type QuoteRequestWithDetails = QuoteRequest & {
  business: Pick<Business, 'id' | 'name' | 'slug'>;
  user: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  quote?: { price: number; description: string; validUntil: Date } | null;
};

export interface SearchFilters {
  query?: string;
  category?: string;
  city?: string;
  state?: string;
  minRating?: number;
  priceRange?: number[];
  hasAvailability?: boolean;
  verified?: boolean;
  sortBy?: 'rating' | 'reviews' | 'distance' | 'name';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  businesses: BusinessWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardStats {
  views: number;
  bookings: number;
  reviews: number;
  leads: number;
  rating: number;
  revenue: number;
}

export interface AnalyticsData {
  date: string;
  views: number;
  clicks: number;
  bookings: number;
  calls: number;
}
