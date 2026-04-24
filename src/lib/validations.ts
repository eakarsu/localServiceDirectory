import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['CONSUMER', 'BUSINESS_OWNER']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

export const bookingSchema = z.object({
  serviceId: z.string().optional(),
  date: z.string().min(1, 'Please select a date'),
  startTime: z.string().min(1, 'Please select a time'),
  notes: z.string().optional(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().optional(),
  content: z.string().min(10, 'Review must be at least 10 characters'),
  pros: z.string().optional(),
  cons: z.string().optional(),
});

export const quoteRequestSchema = z.object({
  serviceDescription: z.string().min(10, 'Please describe the service you need (min 10 characters)'),
  details: z.string().optional(),
  preferredDate: z.string().optional(),
  budget: z.string().optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Please select a category'),
  price: z.string().optional(),
  priceType: z.enum(['fixed', 'hourly', 'quote']),
  duration: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type QuoteRequestFormData = z.infer<typeof quoteRequestSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
