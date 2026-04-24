'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenParam = searchParams.get('token') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    token: tokenParam,
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: form.token,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <div className="text-center py-4">
          <div className="text-green-500 text-4xl mb-4">&#10003;</div>
          <h3 className="text-lg font-semibold mb-2">Password Reset!</h3>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          label="Reset Token"
          placeholder="Paste your reset token"
          value={form.token}
          onChange={(e) => setForm({ ...form, token: e.target.value })}
          required
        />

        <Input
          label="New Password"
          type="password"
          placeholder="At least 6 characters"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          required
        />

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Confirm your new password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        <Button type="submit" loading={loading} className="w-full">
          Reset Password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            LocalServices
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Set New Password</h1>
          <p className="mt-2 text-gray-600">Enter your new password below</p>
        </div>

        <Suspense fallback={<Loading />}>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
