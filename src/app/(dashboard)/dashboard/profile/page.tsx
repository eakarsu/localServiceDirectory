'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    serviceRadius: 25,
    priceRange: 2,
    yearEstablished: new Date().getFullYear(),
    licenseNumber: '',
    insured: false,
    categoryIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const catRes = await fetch('/api/categories?parent=null');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      // Fetch business profile if exists
      if (session?.user?.businessId) {
        const bizRes = await fetch(`/api/businesses/${session.user.businessId}`);
        if (bizRes.ok) {
          const bizData = await bizRes.json();
          setForm({
            name: bizData.name || '',
            description: bizData.description || '',
            shortDescription: bizData.shortDescription || '',
            phone: bizData.phone || '',
            email: bizData.email || '',
            website: bizData.website || '',
            address: bizData.address || '',
            city: bizData.city || '',
            state: bizData.state || '',
            zipCode: bizData.zipCode || '',
            serviceRadius: bizData.serviceRadius || 25,
            priceRange: bizData.priceRange || 2,
            yearEstablished: bizData.yearEstablished || new Date().getFullYear(),
            licenseNumber: bizData.licenseNumber || '',
            insured: bizData.insured || false,
            categoryIds: bizData.categories?.map((c: any) => c.id) || [],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const endpoint = session?.user?.businessId
        ? `/api/businesses/${session.user.businessId}`
        : '/api/businesses';
      const method = session?.user?.businessId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="Loading profile..." />;
  }

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
        <p className="text-gray-600">Manage your business information</p>
      </div>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Website"
              type="url"
              placeholder="https://"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Short Description"
              placeholder="Brief tagline for your business"
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Full Description"
              placeholder="Tell customers about your business..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Street Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Select
              label="State"
              options={states.map((s) => ({ value: s, label: s }))}
              value={form.state}
              onChange={(value) => setForm({ ...form, state: value })}
            />
            <Input
              label="ZIP Code"
              value={form.zipCode}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
            />
            <Input
              label="Service Radius (miles)"
              type="number"
              min={1}
              value={form.serviceRadius}
              onChange={(e) => setForm({ ...form, serviceRadius: parseInt(e.target.value) })}
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Business Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Categories"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={form.categoryIds[0] || ''}
              onChange={(value) => setForm({ ...form, categoryIds: [value] })}
            />
            <Select
              label="Price Range"
              options={[
                { value: '1', label: '$ - Budget' },
                { value: '2', label: '$$ - Moderate' },
                { value: '3', label: '$$$ - Premium' },
                { value: '4', label: '$$$$ - Luxury' },
              ]}
              value={form.priceRange.toString()}
              onChange={(value) => setForm({ ...form, priceRange: parseInt(value) })}
            />
            <Input
              label="Year Established"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={form.yearEstablished}
              onChange={(e) => setForm({ ...form, yearEstablished: parseInt(e.target.value) })}
            />
            <Input
              label="License Number"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.insured}
                onChange={(e) => setForm({ ...form, insured: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">This business is insured</span>
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
