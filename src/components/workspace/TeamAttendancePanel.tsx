'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, MapPin, Pencil } from 'lucide-react';
import { correctAttendanceAction, getTeamAttendanceAction } from '@/server/actions/teamAttendance';
import { hoursText, timeText, workedMinutes } from '@/lib/attendance';
import {
  CELL_LABEL, buildAttendanceXlsx, cellState, dhakaHHMM, leaveKey, mapLink, monthSummary, teamFileName,
  type CellState, type TeamAttendance, type TeamPerson, type TeamRecord,
} from '@/lib/teamAttendance';
import { addMonths, daysOfMonth, monthOf, monthTitle, shortDate, todayInDhaka, weekdayName } from '@/lib/workStatement';

const SYMBOL: Record<CellState, string> = { present: 'P', in: 'In', not_out: 'N', leave: 'L', off: '-', none: '·', future: '' };
const TONE: Record<CellState, string> = {
  present: 'bg-emerald-100 text-emerald-800',
  in: 'bg-sky-100 text-sky-800',
  not_out: 'bg-amber-100 text-amber-800',
  leave: 'bg-violet-100 text-violet-800',
  off: 'text-slate-300',
  none: 'text-slate-400',
  future: '',
};

function Place({ lat, lng, shared, has }: { lat: number | null; lng: number | null; shared: boolean; has: boolean }) {
  if (!has) return <span className="text-slate-400">-</span>;
  const link = mapLink(lat, lng);
  if (!shared || !link) return <span className="text-slate-400">not shared</span>;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 underline underline-offset-2">
      <MapPin className="w-3 h-3" /> map
    </a>
  );
}

export function TeamAttendancePanel() {
  const [date, setDate] = useState(todayInDhaka());
  const [view, setView] = useState<'day' | 'month'>('day');
  const month = monthOf(date);
  const [data, setData] = useState<TeamAttendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [fix, setFix] = useState<{ person: TeamPerson; date: string; checkIn: string; checkOut: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await getTeamAttendanceAction(month);
    if (r.ok) { setData(r.data); setError(null); } else setError(r.error);
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  const byKey = useMemo(() => new Map((data?.records ?? []).map((r) => [leaveKey(r.userId, r.date), r])), [data]);
  const leave = useMemo(() => new Set(data?.leave ?? []), [data]);
  const today = data?.today ?? todayInDhaka();
  const stateOf = (userId: string, d: string) => cellState(d, today, byKey.get(leaveKey(userId, d)), leave.has(leaveKey(userId, d)));

  const openFix = (person: TeamPerson, d: string, rec?: TeamRecord) => {
    setFix({ person, date: d, checkIn: dhakaHHMM(rec?.checkInAt ?? null), checkOut: dhakaHHMM(rec?.checkOutAt ?? null) });
    setReason('');
    setNote(null);
  };

  const saveFix = async () => {
    if (!fix) return;
    setBusy(true);
    const r = await correctAttendanceAction({ userId: fix.person.userId, date: fix.date, checkIn: fix.checkIn, checkOut: fix.checkOut, reason });
    setBusy(false);
    if (r.ok) { setNote(r.message); setFix(null); await load(); } else setNote(r.error);
  };

  const download = async () => {
    if (!data) return;
    const blob = await buildAttendanceXlsx(data, month);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = teamFileName(data.from, data.to);
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  const dayShift = (n: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    const next = d.toISOString().slice(0, 10);
    if (next <= today) setDate(next);
  };
  const monthShift = (n: number) => {
    const m = addMonths(month, n);
    if (m > monthOf(today)) return;
    setDate(m === monthOf(today) ? today : `${m}-01`);
  };

  const days = daysOfMonth(month);
  const summary = monthSummary(data, month);
  const present = data.people.filter((p) => byKey.get(leaveKey(p.userId, date))?.checkInAt).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5" role="tablist">
          {(['day', 'month'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${view === v ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              {v === 'day' ? 'Day' : 'Month'}
            </button>
          ))}
        </div>
        {view === 'day' ? (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous day" onClick={() => dayShift(-1)} className="p-1.5 rounded-lg border border-slate-200 bg-white"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-slate-800 min-w-[10.5rem] text-center">{weekdayName(date)}, {shortDate(date)}</span>
            <button type="button" aria-label="Next day" onClick={() => dayShift(1)} disabled={date >= today} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous month" onClick={() => monthShift(-1)} className="p-1.5 rounded-lg border border-slate-200 bg-white"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-slate-800 min-w-[8.5rem] text-center">{monthTitle(month)}</span>
            <button type="button" aria-label="Next month" onClick={() => monthShift(1)} disabled={month >= monthOf(today)} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        <button type="button" onClick={download} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white">
          <Download className="w-4 h-4" /> Excel ({monthTitle(month)})
        </button>
      </div>

      {note && <p role="status" className="text-sm text-slate-700">{note}</p>}

      {fix && (
        <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3" aria-label="Correct attendance">
          <h2 className="text-sm font-bold text-slate-900">Correct {fix.person.name} · {shortDate(fix.date)}</h2>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-semibold text-slate-600">Check-in
              <input type="time" value={fix.checkIn} onChange={(e) => setFix({ ...fix, checkIn: e.target.value })} className="mt-1 block px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Check-out (leave empty if none)
              <input type="time" value={fix.checkOut} onChange={(e) => setFix({ ...fix, checkOut: e.target.value })} className="mt-1 block px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-600">Reason (required, saved in the audit log)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className="mt-1 block w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={saveFix} className="px-3 py-1.5 text-sm font-bold rounded-xl bg-slate-900 text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save correction'}</button>
            <button type="button" onClick={() => setFix(null)} className="px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white">Cancel</button>
          </div>
        </section>
      )}

      {view === 'day' ? (
        <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2" aria-label="Day attendance">
          <p className="text-sm text-slate-600"><b className="text-slate-900">{present}</b> of {data.people.length} checked in.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1.5 pr-3 font-semibold">Name</th><th className="py-1.5 pr-3 font-semibold">Status</th>
                  <th className="py-1.5 pr-3 font-semibold">In</th><th className="py-1.5 pr-3 font-semibold">Place</th>
                  <th className="py-1.5 pr-3 font-semibold">Out</th><th className="py-1.5 pr-3 font-semibold">Place</th>
                  <th className="py-1.5 pr-3 font-semibold">Hours</th><th className="py-1.5 font-semibold"><span className="sr-only">Correct</span></th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((p) => {
                  const rec = byKey.get(leaveKey(p.userId, date));
                  const st = stateOf(p.userId, date);
                  return (
                    <tr key={p.userId} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3 font-medium text-slate-800">{p.name}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded ${TONE[st]}`}>{st === 'none' ? 'Not in' : CELL_LABEL[st]}</span>{rec?.correctedAt ? <span className="ml-1 text-slate-400" title={rec.correctionReason ?? ''}>corrected</span> : null}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{timeText(rec?.checkInAt ?? null)}</td>
                      <td className="py-1.5 pr-3"><Place lat={rec?.checkInLat ?? null} lng={rec?.checkInLng ?? null} shared={rec?.checkInShared ?? false} has={!!rec?.checkInAt} /></td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{timeText(rec?.checkOutAt ?? null)}</td>
                      <td className="py-1.5 pr-3"><Place lat={rec?.checkOutLat ?? null} lng={rec?.checkOutLng ?? null} shared={rec?.checkOutShared ?? false} has={!!rec?.checkOutAt} /></td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{rec?.checkInAt && rec.checkOutAt ? hoursText(workedMinutes(rec)) : '-'}</td>
                      <td className="py-1.5"><button type="button" onClick={() => openFix(p, date, rec)} className="inline-flex items-center gap-1 text-slate-600 underline underline-offset-2"><Pencil className="w-3 h-3" /> Correct</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2" aria-label="Month attendance">
          <p className="text-xs text-slate-500">P = present · In = in now · N = no check-out · L = leave · - = off day (Fri/Sat) · · = no record. Tap a day to correct it.</p>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="text-slate-500">
                  <th className="sticky left-0 bg-white py-1 pr-3 text-left font-semibold">Name</th>
                  {days.map((d) => <th key={d} className="px-0.5 py-1 font-semibold w-7 text-center">{d.slice(8)}</th>)}
                  <th className="px-2 font-semibold">Present</th><th className="px-2 font-semibold">Leave</th><th className="px-2 font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((p, i) => (
                  <tr key={p.userId} className="border-t border-slate-100">
                    <td className="sticky left-0 bg-white py-1 pr-3 font-medium text-slate-800 whitespace-nowrap">{p.name}</td>
                    {days.map((d) => {
                      const st = stateOf(p.userId, d);
                      return (
                        <td key={d} className="p-0.5 text-center">
                          {st === 'future' ? null : (
                            <button type="button" title={`${shortDate(d)}: ${CELL_LABEL[st] || ''}`} aria-label={`${p.name} ${shortDate(d)} ${CELL_LABEL[st]}`}
                              onClick={() => { openFix(p, d, byKey.get(leaveKey(p.userId, d))); setView('month'); }}
                              className={`w-7 h-6 rounded ${TONE[st]}`}>{SYMBOL[st]}</button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 text-center font-semibold">{summary[i]?.present}</td>
                    <td className="px-2 text-center font-semibold">{summary[i]?.leave}</td>
                    <td className="px-2 text-center whitespace-nowrap">{hoursText(summary[i]?.minutes ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
