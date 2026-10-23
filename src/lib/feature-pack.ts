// Feature pack wave 1A — pure helpers (no DB / no network).
// Search and client-side CSV export already exist; this adds the missing
// generic tasks validation, server export serialisation, and fallback AI.

export type PackTask = {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  assignee: string | null;
  businessId: string | null;
  dueDate: string | null;
  notes: string | null;
  createdBy: string;
};

export function validateTask(input: Record<string, unknown>): Omit<PackTask, 'id' | 'createdBy'> {
  const title = String(input.title ?? '').trim();
  if (!title) throw new Error('title is required');
  const status = ['open', 'in_progress', 'done'].includes(String(input.status))
    ? (input.status as PackTask['status'])
    : 'open';
  return {
    title,
    status,
    assignee: input.assignee ? String(input.assignee) : null,
    businessId: input.businessId ? String(input.businessId) : null,
    dueDate: input.dueDate ? String(input.dueDate) : null,
    notes: input.notes ? String(input.notes) : null,
  };
}

export function filterBusinesses<T extends Record<string, unknown>>(records: T[], filters: { search?: string; city?: string; verified?: string }): T[] {
  const q = String(filters.search ?? '').trim().toLowerCase();
  const city = String(filters.city ?? '').trim().toLowerCase();
  return (records ?? []).filter((r) => {
    if (city && !String(r.city ?? '').toLowerCase().includes(city)) return false;
    if (filters.verified === 'true' && r.verified !== true) return false;
    if (q && !`${r.name ?? ''} ${r.description ?? ''} ${r.city ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(records: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(','), ...(records ?? []).map((r) => columns.map((c) => csvEscape(r[c])).join(','))].join('\n');
}

// Labelled sections that preserve false / 0 / empty values.
export function renderAiSections(result: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(result)
    .filter(([k]) => k !== 'source' && k !== 'label')
    .map(([label, value]) => {
      let display: string;
      if (value === null || value === undefined) display = '';
      else if (Array.isArray(value)) display = value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : '(none)';
      else if (typeof value === 'object') display = JSON.stringify(value);
      else display = String(value);
      return { label, value: display };
    });
}

export function hasAiKey(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY);
}

// Deterministic fallback over the directory's own business records.
export function buildFallback(feature: string, records: Record<string, unknown>[]) {
  const list = records ?? [];
  const base = { source: 'fallback', aiGenerated: false, label: 'Deterministic fallback (no AI provider configured)' };
  if (feature === 'listing-quality-check') {
    const incomplete = list.filter((r) => !r.description || !r.phone);
    return { ...base, feature, total_businesses: list.length, incomplete_count: incomplete.length, needs_attention: incomplete.length > 0, recommendations: incomplete.map((r) => `Complete listing for ${String(r.name ?? r.id)} (missing description/phone)`) };
  }
  if (feature === 'review-summary') {
    const ratings = list.map((r) => Number(r.avgRating ?? 0)).filter((n) => Number.isFinite(n));
    const avg = ratings.length ? ratings.reduce((s, n) => s + n, 0) / ratings.length : 0;
    return { ...base, feature, total_businesses: list.length, average_rating: Math.round(avg * 100) / 100, has_ratings: ratings.length > 0, summary: `${list.length} businesses, average rating ${Math.round(avg * 100) / 100}.` };
  }
  const verified = list.filter((r) => r.verified === true).length;
  return { ...base, feature: 'business-recommendation', total_businesses: list.length, verified_count: verified, unverified_count: list.length - verified, recommendation: verified ? 'Promote verified businesses first.' : 'No verified businesses yet — prioritise verification.' };
}
