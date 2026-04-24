'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setSubmitted(true);
      if (data.token) {
        setToken(data.token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            LocalServices
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-gray-600">
            Enter your email to receive a password reset link
          </p>
        </div>

        <Card>
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-green-500 text-4xl mb-4">&#10003;</div>
              <h3 className="text-lg font-semibold mb-2">Check your email</h3>
              <p className="text-gray-600 mb-4">
                If an account exists with that email, a reset link has been sent.
              </p>
              {token && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-xs text-gray-500 mb-1">Demo: Reset Token</p>
                  <p className="text-sm font-mono break-all text-blue-700">{token}</p>
                  <Link
                    href={`/reset-password?token=${token}`}
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click here to reset password
                  </Link>
                </div>
              )}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>
            </form>
          )}
        </Card>

        <div className="mt-4 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
