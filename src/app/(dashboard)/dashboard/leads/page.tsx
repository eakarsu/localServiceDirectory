'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Loading from '@/components/ui/Loading';
import { format } from 'date-fns';
import { Users, Mail, Phone, TrendingUp } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchLeads();
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
      NEW: 'info',
      CONTACTED: 'warning',
      QUALIFIED: 'success',
      CONVERTED: 'success',
      LOST: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <Loading text="Loading leads..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage and track potential customers</p>
        </div>
        <Select
          options={[
            { value: 'NEW', label: 'New' },
            { value: 'CONTACTED', label: 'Contacted' },
            { value: 'QUALIFIED', label: 'Qualified' },
            { value: 'CONVERTED', label: 'Converted' },
            { value: 'LOST', label: 'Lost' },
          ]}
          value={filter}
          onChange={setFilter}
          placeholder="All Leads"
        />
      </div>

      {leads.length > 0 ? (
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                    {getStatusBadge(lead.status)}
                    {lead.aiScore && (
                      <div className={`flex items-center gap-1 ${getScoreColor(lead.aiScore)}`}>
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {Math.round(lead.aiScore * 100)}% quality
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Phone className="w-4 h-4" />
                        {lead.phone}
                      </a>
                    )}
                    <span className="text-gray-400">
                      Source: {lead.source || 'Unknown'}
                    </span>
                    <span className="text-gray-400">
                      {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {lead.notes && (
                    <p className="mt-2 text-sm text-gray-500">{lead.notes}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {lead.status === 'NEW' && (
                    <Button
                      size="sm"
                      onClick={() => updateLeadStatus(lead.id, 'CONTACTED')}
                    >
                      Mark Contacted
                    </Button>
                  )}
                  {lead.status === 'CONTACTED' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateLeadStatus(lead.id, 'QUALIFIED')}
                      >
                        Qualify
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateLeadStatus(lead.id, 'LOST')}
                      >
                        Lost
                      </Button>
                    </>
                  )}
                  {lead.status === 'QUALIFIED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateLeadStatus(lead.id, 'CONVERTED')}
                    >
                      Convert
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No leads found</p>
          </div>
        </Card>
      )}
    </div>
  );
}
