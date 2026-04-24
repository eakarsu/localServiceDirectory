'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { DollarSign, Clock, Tag } from 'lucide-react';

interface ServiceDetailModalProps {
  service: any;
  categories: any[];
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ServiceDetailModal({
  service,
  categories,
  businessId,
  isOpen,
  onClose,
  onUpdate,
}: ServiceDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    categoryId: service?.categoryId || '',
    price: service?.price?.toString() || '',
    priceType: service?.priceType || 'fixed',
    duration: service?.duration?.toString() || '',
  });
  const { addToast } = useToast();
  const confirm = useConfirm();

  if (!service) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: service.id,
          price: form.price ? parseFloat(form.price) : null,
          duration: form.duration ? parseInt(form.duration) : null,
        }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Service updated' });
        setEditing(false);
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update service' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Service',
      message: `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/businesses/${businessId}/services?serviceId=${service.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Service deleted' });
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete service' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Service Details" size="lg">
      <div className="space-y-4">
        {editing ? (
          <div className="space-y-4">
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
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
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
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold">{service.name}</h3>
            {service.description && (
              <p className="text-gray-600">{service.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4" />
                <span>{service.category?.name || 'No category'}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                {service.price ? (
                  <span className="font-semibold text-blue-600">
                    ${service.price}{service.priceType === 'hourly' && '/hr'}
                  </span>
                ) : (
                  <span className="text-gray-400">Quote Required</span>
                )}
              </div>
              {service.duration && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{service.duration} minutes</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <span className="capitalize">Type: {service.priceType}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setForm({
                  name: service.name,
                  description: service.description || '',
                  categoryId: service.categoryId || '',
                  price: service.price?.toString() || '',
                  priceType: service.priceType || 'fixed',
                  duration: service.duration?.toString() || '',
                });
                setEditing(true);
              }}>
                Edit
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
