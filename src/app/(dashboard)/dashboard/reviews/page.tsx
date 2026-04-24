'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Modal from '@/components/ui/Modal';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';
import Loading from '@/components/ui/Loading';
import DataTable, { Column } from '@/components/ui/DataTable';
import BulkActionBar from '@/components/ui/BulkActionBar';
import { useSelection } from '@/hooks/useSelection';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { exportCsv } from '@/lib/exportCsv';
import { exportPdf } from '@/lib/exportPdf';
import { format } from 'date-fns';
import ReviewDetailModal from '@/components/dashboard/ReviewDetailModal';
import { Star, MessageSquare, Download } from 'lucide-react';

export default function ReviewsPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState(false);
  const { addToast } = useToast();
  const confirm = useConfirm();
  const selection = useSelection(reviews);
  const [detailReview, setDetailReview] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
  }, [session]);

  const fetchReviews = async () => {
    if (!session?.user?.businessId) return;

    try {
      const res = await fetch(`/api/reviews?businessId=${session.user.businessId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!selectedReview || !response.trim()) return;

    setResponding(true);
    try {
      const res = await fetch(`/api/reviews/${selectedReview.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: response }),
      });

      if (res.ok) {
        addToast({ type: 'success', message: 'Response submitted' });
        setSelectedReview(null);
        setResponse('');
        fetchReviews();
      }
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to submit response' });
    } finally {
      setResponding(false);
    }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Delete Reviews',
      message: `Are you sure you want to delete ${selection.selectedCount} review(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/reviews/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selection.selectedIds) }),
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'Reviews deleted' });
        selection.clearSelection();
        fetchReviews();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete reviews' });
    }
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      positive: 'success',
      neutral: 'warning',
      negative: 'danger',
    };
    return <Badge variant={variants[sentiment] || 'default'}>{sentiment}</Badge>;
  };

  const exportColumns = [
    { key: 'customer', header: 'Customer' },
    { key: 'rating', header: 'Rating' },
    { key: 'title', header: 'Title' },
    { key: 'sentiment', header: 'Sentiment' },
    { key: 'date', header: 'Date' },
    { key: 'responded', header: 'Responded' },
  ];

  const getExportData = () =>
    reviews.map((r) => ({
      customer: r.user.name,
      rating: `${r.rating}/5`,
      title: r.title || '-',
      sentiment: r.aiSentiment || '-',
      date: format(new Date(r.createdAt), 'MMM d, yyyy'),
      responded: r.response ? 'Yes' : 'No',
    }));

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: 'Customer',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.user.name}</span>
          {r.isVerified && <Badge variant="success" size="sm">Verified</Badge>}
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => <Rating value={r.rating} size="sm" />,
    },
    {
      key: 'title',
      header: 'Title',
      render: (r) => r.title || <span className="text-gray-400">No title</span>,
    },
    {
      key: 'aiSentiment',
      header: 'Sentiment',
      render: (r) => getSentimentBadge(r.aiSentiment),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (r) => format(new Date(r.createdAt), 'MMM d, yyyy'),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (r) =>
        !r.response ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedReview(r);
            }}
          >
            <MessageSquare className="w-4 h-4 mr-1" /> Respond
          </Button>
        ) : (
          <Badge variant="info" size="sm">Responded</Badge>
        ),
    },
  ];

  if (loading) {
    return <Loading text="Loading reviews..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600">Manage and respond to customer reviews</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(getExportData(), exportColumns, 'reviews')}
          >
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPdf(getExportData(), exportColumns, 'reviews', 'Reviews Report')}
          >
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {reviews.length > 0 ? (
        <DataTable
          data={reviews}
          columns={columns}
          selectable
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={selection.toggleAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          onRowClick={setDetailReview}
        />
      ) : (
        <Card>
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reviews yet</p>
          </div>
        </Card>
      )}

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clearSelection}
        actions={[
          { label: 'Delete', onClick: handleBulkDelete, variant: 'danger' },
        ]}
      />

      <ReviewDetailModal
        review={detailReview}
        isOpen={!!detailReview}
        onClose={() => setDetailReview(null)}
        onUpdate={fetchReviews}
      />

      {/* Response Modal */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Respond to Review"
      >
        {selectedReview && (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Rating value={selectedReview.rating} size="sm" />
                <span className="font-medium">{selectedReview.user.name}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedReview.content}</p>
            </div>

            <Textarea
              label="Your Response"
              placeholder="Thank the customer and address their feedback..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button onClick={submitResponse} loading={responding}>
                Submit Response
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
