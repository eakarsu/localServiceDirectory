'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Loading from '@/components/ui/Loading';
import DataTable, { Column } from '@/components/ui/DataTable';
import BulkActionBar from '@/components/ui/BulkActionBar';
import { useSelection } from '@/hooks/useSelection';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { exportCsv } from '@/lib/exportCsv';
import { exportPdf } from '@/lib/exportPdf';
import { format } from 'date-fns';
import LeadDetailModal from '@/components/dashboard/LeadDetailModal';
import { Users, TrendingUp, Download } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { addToast } = useToast();
  const confirm = useConfirm();
  const selection = useSelection(leads);
  const [selectedLead, setSelectedLead] = useState<any>(null);

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
        addToast({ type: 'success', message: `Lead marked as ${status.toLowerCase()}` });
        fetchLeads();
      }
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to update lead' });
    }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Delete Leads',
      message: `Are you sure you want to delete ${selection.selectedCount} lead(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selection.selectedIds) }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Leads deleted' });
        selection.clearSelection();
        fetchLeads();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete leads' });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selection.selectedIds), data: { status } }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: `Leads marked as ${status.toLowerCase()}` });
        selection.clearSelection();
        fetchLeads();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update leads' });
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

  const exportColumns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'source', header: 'Source' },
    { key: 'score', header: 'Quality Score' },
    { key: 'date', header: 'Date' },
  ];

  const getExportData = () =>
    leads.map((l) => ({
      name: l.name,
      email: l.email,
      phone: l.phone || '-',
      status: l.status,
      source: l.source || 'Unknown',
      score: l.aiScore ? `${Math.round(l.aiScore * 100)}%` : '-',
      date: format(new Date(l.createdAt), 'MMM d, yyyy'),
    }));

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (l) => <span className="font-medium">{l.name}</span>,
    },
    {
      key: 'email',
      header: 'Contact',
      render: (l) => (
        <div className="text-sm">
          <div>{l.email}</div>
          {l.phone && <div className="text-gray-400">{l.phone}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => getStatusBadge(l.status),
    },
    {
      key: 'aiScore',
      header: 'Quality',
      render: (l) =>
        l.aiScore ? (
          <div className={`flex items-center gap-1 ${getScoreColor(l.aiScore)}`}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">{Math.round(l.aiScore * 100)}%</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (l) => <span className="text-gray-500 capitalize">{l.source || 'Unknown'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (l) => format(new Date(l.createdAt), 'MMM d, yyyy'),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (l) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {l.status === 'NEW' && (
            <Button size="sm" onClick={() => updateLeadStatus(l.id, 'CONTACTED')}>
              Contact
            </Button>
          )}
          {l.status === 'CONTACTED' && (
            <>
              <Button size="sm" onClick={() => updateLeadStatus(l.id, 'QUALIFIED')}>
                Qualify
              </Button>
              <Button size="sm" variant="danger" onClick={() => updateLeadStatus(l.id, 'LOST')}>
                Lost
              </Button>
            </>
          )}
          {l.status === 'QUALIFIED' && (
            <Button size="sm" variant="outline" onClick={() => updateLeadStatus(l.id, 'CONVERTED')}>
              Convert
            </Button>
          )}
        </div>
      ),
    },
  ];

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
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportCsv(getExportData(), exportColumns, 'leads')}
            >
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportPdf(getExportData(), exportColumns, 'leads', 'Leads Report')}
            >
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
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
      </div>

      {leads.length > 0 ? (
        <DataTable
          data={leads}
          columns={columns}
          selectable
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={selection.toggleAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          onRowClick={setSelectedLead}
        />
      ) : (
        <Card>
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No leads found</p>
          </div>
        </Card>
      )}

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clearSelection}
        actions={[
          { label: 'Mark Contacted', onClick: () => handleBulkStatusUpdate('CONTACTED') },
          { label: 'Delete', onClick: handleBulkDelete, variant: 'danger' },
        ]}
      />

      <LeadDetailModal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={fetchLeads}
      />
    </div>
  );
}
