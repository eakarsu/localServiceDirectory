'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Loading from '@/components/ui/Loading';
import { Wrench, Plus, Edit, Trash2 } from 'lucide-react';

export default function ServicesPage() {
  const { data: session } = useSession();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    categoryId: '',
    price: '',
    priceType: 'fixed',
    duration: '',
  });

  useEffect(() => {
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [catRes, servRes] = await Promise.all([
        fetch('/api/categories'),
        session?.user?.businessId
          ? fetch(`/api/businesses/${session.user.businessId}/services`)
          : Promise.resolve(null),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      if (servRes && servRes.ok) {
        const servData = await servRes.json();
        setServices(servData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (service?: any) => {
    if (service) {
      setForm({
        id: service.id,
        name: service.name,
        description: service.description || '',
        categoryId: service.categoryId,
        price: service.price?.toString() || '',
        priceType: service.priceType || 'fixed',
        duration: service.duration?.toString() || '',
      });
    } else {
      setForm({
        id: '',
        name: '',
        description: '',
        categoryId: categories[0]?.id || '',
        price: '',
        priceType: 'fixed',
        duration: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.businessId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${session.user.businessId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : null,
          duration: form.duration ? parseInt(form.duration) : null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="Loading services..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600">Manage your service offerings</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{service.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(service)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {service.description && (
                <p className="text-sm text-gray-600 mb-2">{service.description}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {service.category?.name || 'No category'}
                </span>
                {service.price ? (
                  <span className="font-semibold text-blue-600">
                    ${service.price}
                    {service.priceType === 'hourly' && '/hr'}
                  </span>
                ) : (
                  <span className="text-gray-400">Quote Required</span>
                )}
              </div>

              {service.duration && (
                <p className="text-xs text-gray-400 mt-1">
                  Duration: {service.duration} mins
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No services added yet</p>
            <Button onClick={() => openModal()}>Add Your First Service</Button>
          </div>
        </Card>
      )}

      {/* Add/Edit Service Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={form.id ? 'Edit Service' : 'Add Service'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />

          <Select
            label="Category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.categoryId}
            onChange={(value) => setForm({ ...form, categoryId: value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              step="0.01"
              placeholder="Leave empty for quote"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />

            <Select
              label="Price Type"
              options={[
                { value: 'fixed', label: 'Fixed Price' },
                { value: 'hourly', label: 'Hourly Rate' },
                { value: 'quote', label: 'Quote Required' },
              ]}
              value={form.priceType}
              onChange={(value) => setForm({ ...form, priceType: value })}
            />
          </div>

          <Input
            label="Duration (minutes)"
            type="number"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {form.id ? 'Save Changes' : 'Add Service'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
