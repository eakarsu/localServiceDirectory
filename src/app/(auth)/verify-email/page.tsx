'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState(tokenParam);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setSuccess(true);
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
          <h3 className="text-lg font-semibold mb-2">Email Verified!</h3>
          <p className="text-gray-600 mb-4">Your email has been verified successfully.</p>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in to continue
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleVerify} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          label="Verification Token"
          placeholder="Paste your verification token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />

        <Button type="submit" loading={loading} className="w-full">
          Verify Email
        </Button>
      </form>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            LocalServices
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Verify Email</h1>
          <p className="mt-2 text-gray-600">Enter your verification token to confirm your email</p>
        </div>

        <Suspense fallback={<Loading />}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
