'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { format } from 'date-fns';
import { Mail, Phone, TrendingUp, Globe, Calendar } from 'lucide-react';

interface LeadDetailModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function LeadDetailModal({
  lead,
  isOpen,
  onClose,
  onUpdate,
}: LeadDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: lead?.status || '',
    notes: lead?.notes || '',
  });
  const { addToast } = useToast();
  const confirm = useConfirm();

  if (!lead) return null;

  const statusVariants: Record<string, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
    NEW: 'info',
    CONTACTED: 'warning',
    QUALIFIED: 'success',
    CONVERTED: 'success',
    LOST: 'danger',
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Lead updated' });
        setEditing(false);
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update lead' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Lead deleted' });
        onUpdate();
        onClose();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete lead' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lead Details" size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{lead.name}</h3>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariants[lead.status]}>{lead.status}</Badge>
            {lead.aiScore && (
              <span className={`text-sm font-medium ${getScoreColor(lead.aiScore)}`}>
                {Math.round(lead.aiScore * 100)}% quality
              </span>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Select
              label="Status"
              options={[
                { value: 'NEW', label: 'New' },
                { value: 'CONTACTED', label: 'Contacted' },
                { value: 'QUALIFIED', label: 'Qualified' },
                { value: 'CONVERTED', label: 'Converted' },
                { value: 'LOST', label: 'Lost' },
              ]}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
            />
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${lead.email}`} className="hover:text-blue-600">{lead.email}</a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-4 h-4" />
                <span className="capitalize">{lead.source || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(lead.createdAt), 'MMMM d, yyyy')}</span>
              </div>
              {lead.aiScore && (
                <div className={`flex items-center gap-2 ${getScoreColor(lead.aiScore)}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">{Math.round(lead.aiScore * 100)}% quality score</span>
                </div>
              )}
            </div>

            {lead.notes && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{lead.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setForm({ status: lead.status, notes: lead.notes || '' });
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
