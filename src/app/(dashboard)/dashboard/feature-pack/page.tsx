'use client';

import React, { useCallback, useEffect, useState } from 'react';

type PackTask = { id: string; title: string; status: string };
type Section = { label: string; value: string };

// Wave 15B UI: tasks, business export, and directory AI over own records.
// AI JSON is rendered as readable labelled sections (false/0/empty kept).
export default function FeaturePackPage() {
  const [tasks, setTasks] = useState<PackTask[]>([]);
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    if (res.ok) setTasks((await res.json()).data ?? []);
  }, []);
  useEffect(() => { loadTasks().catch(() => {}); }, [loadTasks]);

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    if (res.ok) { setTitle(''); loadTasks(); } else setError('Could not create the task.');
  }
  async function toggleTask(task: PackTask) {
    await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: task.status === 'done' ? 'open' : 'done' }) });
    loadTasks();
  }
  async function downloadExport(format: string) {
    const res = await fetch(`/api/export/businesses?format=${format}`);
    if (!res.ok) { setError('Export failed.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `businesses.${format}`; link.click();
    URL.revokeObjectURL(url);
  }
  async function runAi(feature: string) {
    setError('');
    const res = await fetch('/api/ai/feature-pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? 'AI request failed.'); return; }
    setBanner(data.aiGenerated ? `AI-generated (${data.source ?? 'provider'})` : (data.label ?? 'Deterministic fallback — not AI-generated.'));
    setSections(Array.isArray(data.sections) ? data.sections : []);
  }

  return (
    <div>
      <h1>Tasks, export &amp; directory AI</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={addTask}>
        <label>New task <input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <button type="submit">Add task</button>
      </form>
      <ul>{tasks.map((t) => <li key={t.id}><span>{t.title} — {t.status}</span> <button type="button" onClick={() => toggleTask(t)}>{t.status === 'done' ? 'Reopen' : 'Mark done'}</button></li>)}</ul>
      <div>
        <button type="button" onClick={() => downloadExport('csv')}>Export businesses (CSV)</button>
        <button type="button" onClick={() => downloadExport('json')}>Export businesses (JSON)</button>
      </div>
      <div>
        <button type="button" onClick={() => runAi('business-recommendation')}>Business recommendation</button>
        <button type="button" onClick={() => runAi('listing-quality-check')}>Listing quality check</button>
        <button type="button" onClick={() => runAi('review-summary')}>Review summary</button>
      </div>
      {banner && <p><strong>{banner}</strong></p>}
      {sections.map((s) => (
        <section key={s.label}><h2>{s.label}</h2><p>{s.value === '' ? 'Empty string' : s.value}</p></section>
      ))}
    </div>
  );
}
