'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, MapPin } from 'lucide-react';
import { checkInAction, checkOutAction, getMyAttendanceAction } from '@/server/actions/attendance';
import { LOCATION_NOTICE, dayState, hoursText, timeText, workedMinutes, type LocationFix, type MyAttendance } from '@/lib/attendance';
import { monthOf, monthTitle, shortDate, todayInDhaka } from '@/lib/workStatement';

/** Asks the browser for the place; resolves to null when the person says no, the device cannot, or it takes too long. */
function getFix(): Promise<LocationFix | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  });
}

export function AttendanceCard() {
  const month = monthOf(todayInDhaka());
  const [data, setData] = useState<MyAttendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    const r = await getMyAttendanceAction(month);
    if (r.ok) { setData(r.data); setError(null); } else setError(r.error);
  }, [month]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const press = async (kind: 'in' | 'out') => {
    setBusy(true);
    setNote(null);
    try {
      const fix = await getFix();
      const r = await (kind === 'in' ? checkInAction(fix) : checkOutAction(fix));
      setNote(r.ok ? r.message : r.error);
      await load();
    } catch {
      setNote('Something went wrong. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading your attendance…</p>;

  const state = dayState(data.todayRow);
  const row = data.todayRow;

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4" aria-labelledby="attendance-today">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="attendance-today" className="text-sm font-bold text-slate-900">Today · {shortDate(data.today)}</h2>
          <p className="text-sm text-slate-600 mt-0.5" aria-live="polite">
            {state === 'not_in' && 'You have not checked in yet.'}
            {state === 'in' && row && <>Checked in at <b>{timeText(row.checkInAt)}</b> · {hoursText(workedMinutes(row, now))} so far</>}
            {state === 'done' && row && <>In <b>{timeText(row.checkInAt)}</b> · Out <b>{timeText(row.checkOutAt)}</b> · {hoursText(workedMinutes(row, now))} in total</>}
          </p>
        </div>
        {state === 'not_in' && (
          <button type="button" disabled={busy} onClick={() => press('in')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-slate-900 text-white disabled:opacity-60">
            <LogIn className="w-4 h-4" /> {busy ? 'Checking in…' : 'Check in'}
          </button>
        )}
        {state === 'in' && (
          <button type="button" disabled={busy} onClick={() => press('out')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-slate-900 text-white disabled:opacity-60">
            <LogOut className="w-4 h-4" /> {busy ? 'Checking out…' : 'Check out'}
          </button>
        )}
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {LOCATION_NOTICE}</p>
      {note && <p role="status" className="text-sm text-slate-700">{note}</p>}

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <h3 className="text-xs font-bold text-slate-700">{monthTitle(month)}</h3>
          <p className="text-xs text-slate-500">Leave days this year: <b className="text-slate-800">{data.leaveDaysThisYear}</b></p>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-slate-500">No check-ins this month yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1.5 pr-3 font-semibold">Date</th>
                  <th className="py-1.5 pr-3 font-semibold">In</th>
                  <th className="py-1.5 pr-3 font-semibold">Out</th>
                  <th className="py-1.5 font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.date} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{shortDate(r.date)}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{timeText(r.checkInAt)}{r.checkInAt && !r.checkInShared ? <span className="ml-1 text-slate-400" title="Location not shared">·</span> : null}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{r.checkOutAt ? timeText(r.checkOutAt) : r.date === data.today ? '-' : 'Not checked out'}</td>
                    <td className="py-1.5 whitespace-nowrap">{r.checkOutAt ? hoursText(workedMinutes(r)) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
