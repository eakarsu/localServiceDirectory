'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Sparkles, Search, Star, FileText } from 'lucide-react';

type TabKey = 'match-provider' | 'review-analysis' | 'quote-aggregator';

interface AIResponse {
  success?: boolean;
  result?: any;
  model?: string;
  error?: string;
  candidate_count?: number;
  review_count?: number;
  input_count?: number;
}

export default function AICenterPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabKey>('match-provider');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Center</h1>
          <p className="text-sm text-gray-600">Provider matching, review analysis, and quote aggregation.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" role="tablist">
          <TabButton active={tab === 'match-provider'} onClick={() => setTab('match-provider')} icon={<Search className="w-4 h-4" />}>
            Match Provider
          </TabButton>
          <TabButton active={tab === 'review-analysis'} onClick={() => setTab('review-analysis')} icon={<Star className="w-4 h-4" />}>
            Review Analysis
          </TabButton>
          <TabButton active={tab === 'quote-aggregator'} onClick={() => setTab('quote-aggregator')} icon={<FileText className="w-4 h-4" />}>
            Quote Aggregator
          </TabButton>
        </nav>
      </div>

      {tab === 'match-provider' && <MatchProviderPanel />}
      {tab === 'review-analysis' && <ReviewAnalysisPanel businessId={session?.user?.businessId} />}
      {tab === 'quote-aggregator' && <QuoteAggregatorPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

async function postAI(path: string, body: any): Promise<AIResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  let data: any = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    if (res.status === 503) {
      return { error: data.error || 'AI service unavailable. Configure OPENROUTER_API_KEY on the server.' };
    }
    return { error: data.error || `Request failed (${res.status})` };
  }
  return data as AIResponse;
}

function ResultBlock({ data }: { data: AIResponse | null }) {
  if (!data) return null;
  if (data.error) {
    return (
      <Card className="mt-4 border border-red-200 bg-red-50">
        <CardContent>
          <p className="text-red-700 text-sm">{data.error}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent>
        {data.result?.summary && (
          <p className="text-sm text-gray-800 mb-3">{data.result.summary}</p>
        )}
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-96">
          {JSON.stringify(data.result, null, 2)}
        </pre>
        {data.model && (
          <p className="text-xs text-gray-500 mt-2">Model: {data.model}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MatchProviderPanel() {
  const [needs, setNeeds] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [data, setData] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!needs.trim()) return;
    setLoading(true);
    const res = await postAI('/api/ai/match-provider', {
      needs: needs.trim(),
      city: city.trim() || undefined,
      state: stateVal.trim() || undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
    });
    setData(res);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match a service provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          label="What do you need?"
          placeholder="e.g. emergency plumber for a leaking water heater this weekend"
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="State (optional)" value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
          <Input label="Budget max (optional)" type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
        </div>
        <Button onClick={submit} loading={loading} disabled={!needs.trim() || loading}>
          Find matches
        </Button>
        <ResultBlock data={data} />
      </CardContent>
    </Card>
  );
}

function ReviewAnalysisPanel({ businessId }: { businessId?: string | null }) {
  const [bizId, setBizId] = useState(businessId || '');
  const [lookback, setLookback] = useState(90);
  const [data, setData] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!bizId.trim()) return;
    setLoading(true);
    const res = await postAI('/api/ai/review-analysis', {
      businessId: bizId.trim(),
      lookbackDays: Number(lookback),
    });
    setData(res);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyze reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Business ID" value={bizId} onChange={(e) => setBizId(e.target.value)} placeholder="cuid..." />
          <Input label="Lookback days" type="number" min={1} max={365} value={lookback} onChange={(e) => setLookback(Number(e.target.value))} />
        </div>
        <Button onClick={submit} loading={loading} disabled={!bizId.trim() || loading}>
          Analyze
        </Button>
        <ResultBlock data={data} />
      </CardContent>
    </Card>
  );
}

function QuoteAggregatorPanel() {
  const [requestIds, setRequestIds] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [data, setData] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const ids = requestIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0 && !serviceDescription.trim()) return;
    setLoading(true);
    const res = await postAI('/api/ai/quote-aggregator', {
      quoteRequestIds: ids.length ? ids : undefined,
      serviceDescription: serviceDescription.trim() || undefined,
    });
    setData(res);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aggregate quotes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Quote request IDs (comma-separated)"
          value={requestIds}
          onChange={(e) => setRequestIds(e.target.value)}
          placeholder="cuid1, cuid2"
        />
        <Textarea
          label="...or describe the service to compare candidates"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          placeholder="e.g. interior repaint of a 3-bedroom home"
        />
        <Button onClick={submit} loading={loading} disabled={(!requestIds.trim() && !serviceDescription.trim()) || loading}>
          Aggregate &amp; compare
        </Button>
        <ResultBlock data={data} />
      </CardContent>
    </Card>
  );
}
