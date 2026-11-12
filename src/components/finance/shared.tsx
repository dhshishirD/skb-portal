'use client';

import { useState } from 'react';

export const inputClass = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white';
export const labelClass = 'block text-xs font-semibold text-slate-700 mb-1';
export const primaryButton =
  'px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-sm transition-colors';
export const quietButton = 'px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors';
export const dangerButton = 'px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60 rounded-lg transition-colors';
export const goodButton = 'px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg shadow-sm transition-colors';

export function Notice({ kind, children }: { kind: 'ok' | 'error' | 'info'; children: React.ReactNode }) {
  const tone =
    kind === 'ok'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : kind === 'error'
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-blue-50 border-blue-200 text-blue-800';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`border p-3 rounded-xl text-xs ${tone}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'amber' | 'green' | 'red' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
  } as const;
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm space-y-2">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {children && <p className="text-xs text-slate-500 max-w-md mx-auto">{children}</p>}
    </div>
  );
}

/** A small inline box that asks for a comment (needed to return or reject). */
export function CommentBox({
  label,
  minLength,
  busy,
  confirmLabel,
  onSubmit,
  onCancel,
}: {
  label: string;
  minLength: number;
  busy: boolean;
  confirmLabel: string;
  onSubmit: (comment: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const ok = text.trim().length >= minLength;
  return (
    <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
      <label className={labelClass}>{label}</label>
      <textarea className={inputClass} rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button type="button" className={quietButton} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={dangerButton} disabled={busy || !ok} onClick={() => onSubmit(text.trim())}>
          {confirmLabel}
        </button>
      </div>
      {!ok && <p className="text-[10px] text-slate-500">Write at least {minLength} characters.</p>}
    </div>
  );
}

export const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
export const formatBdt = (n: number) => `BDT ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
