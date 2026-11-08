'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, FileDown } from 'lucide-react';
import {
  CHARTER_FIELDS,
  MAX_FIELD_LENGTH,
  emptyCharterText,
  formatCharterDate,
  sameCharterText,
  textOf,
  type CharterData,
  type CharterText,
} from '@/lib/charter';
import {
  approveCharterVersionAction,
  exportCharterPdfAction,
  getCharterAction,
  saveCharterVersionAction,
} from '@/server/actions/charter';

type Note = { kind: 'ok' | 'error'; text: string } | null;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';

function downloadPdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Charter tab: write the charter, save it as numbered versions, approve a version, export a PDF. */
export function CharterPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<CharterData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<CharterText>(emptyCharterText());
  const [changeNote, setChangeNote] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(
    async (resetForm: boolean) => {
      try {
        const r = await getCharterAction(projectId);
        if (r.ok) {
          setData(r.data);
          setLoadError(null);
          if (resetForm || !loaded) {
            setText(r.data.versions[0] ? textOf(r.data.versions[0]) : emptyCharterText());
            setChangeNote('');
            setLoaded(true);
          }
        } else {
          setLoadError(r.error);
        }
      } catch {
        setLoadError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
      }
    },
    [projectId, loaded],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, resetForm = false) {
    setBusy(true);
    setNote(null);
    try {
      const r = await action();
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message ?? 'Done.' });
        await load(resetForm);
      } else {
        setNote({ kind: 'error', text: r.error ?? 'Something went wrong.' });
      }
    } catch {
      setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !data) {
    return (
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <p role="alert" className="text-sm text-red-700">{loadError}</p>
        <button className={btnCls} onClick={() => { setLoadError(null); load(true); }}>Try again</button>
      </section>
    );
  }
  if (!data) return <p className="text-sm text-slate-500">Loading the charter…</p>;

  const latest = data.versions[0];
  const changed = latest ? !sameCharterText(text, latest) : CHARTER_FIELDS.some((f) => text[f.key].trim() !== '');
  const exportPdf = async (versionId: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await exportCharterPdfAction(projectId, versionId);
      if (r.ok) downloadPdf(r.data.filename, r.data.base64);
      else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Could not make the PDF. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {data.closed && (
        <p className="text-sm bg-slate-100 border border-slate-200 rounded-xl p-3">This project is closed. Its charter can no longer be changed.</p>
      )}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}>
          {note.text}
        </p>
      )}

      <section className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold mb-1">
          {latest ? `Charter, version ${latest.version}` : 'Charter'}
          {latest?.approvedAt && <span className="ml-2 text-xs font-bold text-green-700">Approved</span>}
        </h2>
        <p className="text-xs text-slate-500">
          Project facts (donor, amount, dates, location, target) come from the project itself and are added to the PDF automatically.
          Every save makes a new numbered version; earlier versions are kept.
        </p>
      </section>

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        {CHARTER_FIELDS.map((f) => (
          <div key={f.key}>
            <label className={labelCls} htmlFor={`c-${f.key}`}>{f.label}</label>
            <textarea
              id={`c-${f.key}`}
              className={`${inputCls} min-h-[96px]`}
              value={text[f.key]}
              maxLength={MAX_FIELD_LENGTH}
              disabled={!data.canWrite}
              placeholder={f.hint}
              onChange={(e) => setText({ ...text, [f.key]: e.target.value })}
            />
          </div>
        ))}
        {data.canWrite && (
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className={labelCls} htmlFor="c-note">What changed? (optional)</label>
              <input id="c-note" className={inputCls} maxLength={500} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
            </div>
            <button
              className={btnCls}
              disabled={busy || !changed}
              onClick={() => run(() => saveCharterVersionAction(projectId, { ...text, changeNote }), true)}
            >
              Save as new version
            </button>
          </div>
        )}
        {data.canWrite && !changed && latest && <p className="text-xs text-slate-500">No changes since version {latest.version}.</p>}
      </section>

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 overflow-x-auto">
        <h2 className="text-sm font-bold">Versions</h2>
        {data.versions.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing saved yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-500">
                <th className="pb-1 pr-2">Version</th>
                <th className="pb-1 pr-2">Saved</th>
                <th className="pb-1 pr-2">What changed</th>
                <th className="pb-1 pr-2">Approval</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody>
              {data.versions.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-2 font-bold">{v.version}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {formatCharterDate(v.createdAt)}
                    {v.createdByName && <div className="text-xs text-slate-500">{v.createdByName}</div>}
                  </td>
                  <td className="py-2 pr-2">{v.changeNote ?? '—'}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {v.approvedAt ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        {formatCharterDate(v.approvedAt)}
                        {v.approvedByName && <span className="text-xs text-slate-500">by {v.approvedByName}</span>}
                      </span>
                    ) : data.canApprove ? (
                      <button
                        className="text-xs font-bold underline disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Approve charter version ${v.version}? This cannot be undone.`)) {
                            run(() => approveCharterVersionAction(projectId, v.id));
                          }
                        }}
                      >
                        Approve
                      </button>
                    ) : (
                      <span className="text-slate-500">Not approved</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      aria-label={`Download version ${v.version} as PDF`}
                      title="Download PDF"
                      className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => exportPdf(v.id)}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
