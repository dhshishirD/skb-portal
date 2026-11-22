'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, MapPin } from 'lucide-react';
import { checkInAction, checkOutAction, getMyAttendanceAction } from '@/server/actions/attendance';
import { LOCATION_NOTICE, dayState, hoursText, timeText, workedMinutes, type LocationFix, type MyAttendance } from '@/lib/attendance';
import { mapLink } from '@/lib/teamAttendance';
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

  const badge =
    state === 'not_in' ? { text: 'Not checked in', cls: 'bg-slate-100 text-slate-700' }
    : state === 'in' ? { text: 'At work', cls: 'bg-emerald-100 text-emerald-800' }
    : { text: 'Day complete', cls: 'bg-sky-100 text-sky-800' };
  const tile = 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3';
  const tileLabel = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';
  const tileValue = 'mt-0.5 text-xl font-bold text-slate-900 tabular-nums';
  const placeOf = (at: string | null | undefined, lat: number | null | undefined, lng: number | null | undefined) => {
    if (!at) return null;
    const link = mapLink(lat ?? null, lng ?? null);
    return link
      ? <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-700 underline underline-offset-2"><MapPin className="w-3 h-3" /> View place</a>
      : <span className="mt-1 block text-xs text-slate-400">Location not shared</span>;
  };

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5" aria-labelledby="attendance-today">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 id="attendance-today" className="text-base font-bold text-slate-900">Today · {shortDate(data.today)}</h2>
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${badge.cls}`} aria-live="polite">{badge.text}</span>
        </div>
        {state === 'not_in' && (
          <button type="button" disabled={busy} onClick={() => press('in')} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-60">
            <LogIn className="w-4 h-4" /> {busy ? 'Checking in…' : 'Check in'}
          </button>
        )}
        {state === 'in' && (
          <button type="button" disabled={busy} onClick={() => press('out')} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-60">
            <LogOut className="w-4 h-4" /> {busy ? 'Checking out…' : 'Check out'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={tile}><p className={tileLabel}>Check-in</p><p className={tileValue}>{row?.checkInAt ? timeText(row.checkInAt) : '-'}</p>{placeOf(row?.checkInAt, row?.checkInLat, row?.checkInLng)}</div>
        <div className={tile}><p className={tileLabel}>Check-out</p><p className={tileValue}>{row?.checkOutAt ? timeText(row.checkOutAt) : '-'}</p>{placeOf(row?.checkOutAt, row?.checkOutLat, row?.checkOutLng)}</div>
        <div className={tile}><p className={tileLabel}>{state === 'in' ? 'So far' : 'Total'}</p><p className={tileValue}>{row ? hoursText(workedMinutes(row, now)) : '-'}</p></div>
      </div>

      {note && <p role="status" className="text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{note}</p>}

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-bold text-slate-800">{monthTitle(month)}</h3>
          <p className="text-xs text-slate-500">Leave days this year: <b className="text-slate-800">{data.leaveDaysThisYear}</b></p>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-slate-500">No check-ins this month yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">In</th>
                  <th className="py-2 px-3 font-semibold">Out</th>
                  <th className="py-2 px-3 font-semibold">Hours</th>
                  <th className="py-2 px-3 font-semibold">Places</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.date} className={`border-t border-slate-100 ${r.date === data.today ? 'bg-emerald-50/50' : ''}`}>
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">{shortDate(r.date)}</td>
                    <td className="py-2 px-3 whitespace-nowrap tabular-nums">{timeText(r.checkInAt)}</td>
                    <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                      {r.checkOutAt ? timeText(r.checkOutAt) : r.date === data.today ? '-' : <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-800">Not checked out</span>}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap tabular-nums">{r.checkOutAt ? hoursText(workedMinutes(r)) : '-'}</td>
                    <td className="py-2 px-3 whitespace-nowrap text-xs">
                      {[['In', r.checkInAt, r.checkInLat, r.checkInLng], ['Out', r.checkOutAt, r.checkOutLat, r.checkOutLng]].map(([label, at, lat, lng]) => {
                        if (!at) return null;
                        const link = mapLink(lat as number | null, lng as number | null);
                        return link
                          ? <a key={label as string} href={link} target="_blank" rel="noopener noreferrer" className="mr-2 text-sky-700 underline underline-offset-2">{label as string}</a>
                          : <span key={label as string} className="mr-2 text-slate-400">{label as string}: not shared</span>;
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {LOCATION_NOTICE}</p>
    </section>
  );
}
