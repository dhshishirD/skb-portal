'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import {
  EMPTY_ITEM_FORM,
  MEASURES,
  calculateBudget,
  formatBdtCents,
  formatBp,
  formatMilli,
  type BudgetData,
  type BudgetItem,
  type BudgetItemFormValues,
  type BudgetWarning,
} from '@/lib/budget';
import {
  addBudgetItemAction,
  deleteBudgetItemAction,
  getBudgetAction,
  saveBudgetSettingsAction,
  setExchangeRateAction,
  updateBudgetItemAction,
} from '@/server/actions/budget';

type Note = { kind: 'ok' | 'error'; text: string } | null;

const WARNING_TEXT: Record<BudgetWarning, string> = {
  missing_rate: 'No exchange rate yet. The Executive Director must set it before donor-currency amounts can be shown.',
  missing_donor_amount: 'The project has no donor amount. Set it on the project to see the administration cost.',
  packages_missing: 'Items are listed, but the number of packages is 0.',
  overspent: 'The project cost is more than the donor amount. The balance is negative.',
  admin_above_target: 'The administration cost is above the target percentage.',
};

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';

const itemToForm = (i: BudgetItem): BudgetItemFormValues => ({
  kind: i.kind,
  groupName: i.groupName ?? '',
  name: i.name,
  measure: i.measure,
  quantity: String(i.quantity),
  unitPriceBdt: String(i.unitPriceBdt),
});

/** Budget tab: what one package contains, one-off costs, the exchange rate, and the calculated totals. */
export function BudgetPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [packages, setPackages] = useState('0');
  const [adminPct, setAdminPct] = useState('5');
  const [rate, setRate] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [rateNote, setRateNote] = useState('');
  const [form, setForm] = useState<BudgetItemFormValues>(EMPTY_ITEM_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getBudgetAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
        setPackages(String(r.data.settings.packagesCount));
        setAdminPct(String(r.data.settings.adminPercent));
        setRate(r.data.settings.exchangeRate === null ? '' : String(r.data.settings.exchangeRate));
        setRateDate(r.data.settings.rateDate ?? '');
        setRateNote(r.data.settings.rateNote ?? '');
      } else {
        setLoadError(r.error);
      }
    } catch {
      setLoadError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const calc = useMemo(
    () =>
      data
        ? calculateBudget({
            items: data.items,
            packagesCount: data.settings.packagesCount,
            adminPercent: data.settings.adminPercent,
            exchangeRate: data.settings.exchangeRate,
            donorAmount: data.donorAmount,
            currency: data.currency,
          })
        : null,
    [data],
  );

  async function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) {
    setBusy(true);
    setNote(null);
    try {
      const r = await action();
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message ?? 'Saved.' });
        after?.();
        await load();
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
        <button className={btnCls} onClick={() => { setLoadError(null); load(); }}>Try again</button>
      </section>
    );
  }
  if (!data || !calc) return <p className="text-sm text-slate-500">Loading the budget…</p>;

  const cur = data.currency;
  const needsRate = calc.needsRate;
  const money = (milli: number | null) => (calc.canConvert ? formatMilli(milli) : '—');

  const startEdit = (i: BudgetItem) => {
    setEditingId(i.id);
    setForm(itemToForm(i));
    setNote(null);
  };
  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_ITEM_FORM);
  };

  const renderRow = (id: string) => {
    const item = data.items.find((i) => i.id === id)!;
    const line = calc.lines[id];
    return (
      <tr key={id} className="border-t border-slate-100">
        <td className="py-2 pr-2">{item.name}</td>
        <td className="py-2 pr-2 text-slate-500">{item.measure}</td>
        <td className="py-2 pr-2 text-right">{item.quantity.toLocaleString('en-US')}</td>
        <td className="py-2 pr-2 text-right">{item.unitPriceBdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td className="py-2 pr-2 text-right">{formatBdtCents(line.lineBdtCents)}</td>
        {needsRate && <td className="py-2 pr-2 text-right">{money(line.lineConvertedMilli)}</td>}
        <td className="py-2 text-right whitespace-nowrap">
          {data.canEdit && (
            <>
              <button aria-label={`Edit ${item.name}`} className="p-1.5 text-slate-500 hover:text-slate-900" onClick={() => startEdit(item)}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                aria-label={`Remove ${item.name}`}
                className="p-1.5 text-slate-500 hover:text-red-700"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove "${item.name}" from the budget?`)) run(() => deleteBudgetItemAction(projectId, id));
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </td>
      </tr>
    );
  };

  const tableHead = (
    <thead>
      <tr className="text-left text-[11px] uppercase text-slate-500">
        <th className="pb-1 pr-2">Item</th>
        <th className="pb-1 pr-2">Measure</th>
        <th className="pb-1 pr-2 text-right">Qty</th>
        <th className="pb-1 pr-2 text-right">Unit price (BDT)</th>
        <th className="pb-1 pr-2 text-right">Total (BDT)</th>
        {needsRate && <th className="pb-1 pr-2 text-right">Total ({cur})</th>}
        <th className="pb-1" />
      </tr>
    </thead>
  );

  return (
    <div className="space-y-5">
      {data.closed && (
        <p className="text-sm bg-slate-100 border border-slate-200 rounded-xl p-3">This project is closed. Its budget can no longer be changed.</p>
      )}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}>
          {note.text}
        </p>
      )}

      {calc.warnings.length > 0 && (
        <ul className="space-y-1.5">
          {calc.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{WARNING_TEXT[w]}</span>
            </li>
          ))}
        </ul>
      )}

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold">Packages and administration</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls} htmlFor="b-packages">Number of packages (families)</label>
            <input id="b-packages" className={inputCls} inputMode="numeric" value={packages} disabled={!data.canEdit} onChange={(e) => setPackages(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="b-admin">Administration target (%)</label>
            <input id="b-admin" className={inputCls} inputMode="decimal" value={adminPct} disabled={!data.canEdit} onChange={(e) => setAdminPct(e.target.value)} />
          </div>
          {data.canEdit && (
            <div className="flex items-end">
              <button className={btnCls} disabled={busy} onClick={() => run(() => saveBudgetSettingsAction(projectId, { packagesCount: packages, adminPercent: adminPct }))}>
                Save
              </button>
            </div>
          )}
        </div>
      </section>

      {needsRate && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <h2 className="text-sm font-bold">Exchange rate (BDT for 1 {cur})</h2>
          {data.settings.exchangeRate !== null && (
            <p className="text-xs text-slate-600">
              Set by {data.settings.rateSetByName ?? 'the Executive Director'}
              {data.settings.rateSetAt ? ` on ${new Date(data.settings.rateSetAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}` : ''}.
            </p>
          )}
          {data.canSetRate ? (
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls} htmlFor="b-rate">Rate</label>
                <input id="b-rate" className={inputCls} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="b-rate-date">Date of the rate</label>
                <input id="b-rate-date" type="date" className={inputCls} value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="b-rate-note">Note (optional)</label>
                <input id="b-rate-note" className={inputCls} value={rateNote} onChange={(e) => setRateNote(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button className={btnCls} disabled={busy} onClick={() => run(() => setExchangeRateAction(projectId, { rate, rateDate, note: rateNote }))}>
                  Save rate
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700">
              {data.settings.exchangeRate !== null
                ? `${data.settings.exchangeRate} on ${data.settings.rateDate}${data.settings.rateNote ? ` (${data.settings.rateNote})` : ''}`
                : 'Not set yet. Only the Executive Director can set it.'}
            </p>
          )}
        </section>
      )}

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold">What one package contains</h2>
        {calc.groups.length === 0 && <p className="text-sm text-slate-500">No items yet.</p>}
        {calc.groups.map((g) => (
          <div key={g.name ?? '(none)'} className="overflow-x-auto">
            {g.name && <h3 className="text-xs font-bold text-slate-700 mb-1">{g.name}</h3>}
            <table className="w-full text-sm">
              {tableHead}
              <tbody>{g.itemIds.map(renderRow)}</tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-bold">
                  <td colSpan={4} className="py-2">Subtotal{g.name ? ` – ${g.name}` : ''}</td>
                  <td className="py-2 pr-2 text-right">{formatBdtCents(g.bdtCents)}</td>
                  {needsRate && <td className="py-2 pr-2 text-right">{money(g.convertedMilli)}</td>}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
        <p className="text-sm font-bold">
          Cost of one package: {formatBdtCents(calc.packageBdtCents)} BDT{needsRate ? ` = ${money(calc.packageConvertedMilli)} ${cur}` : ''}
        </p>
      </section>

      {calc.oneOffIds.length > 0 && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 overflow-x-auto">
          <h2 className="text-sm font-bold">One-off costs (not multiplied by packages)</h2>
          <table className="w-full text-sm">
            {tableHead}
            <tbody>{calc.oneOffIds.map(renderRow)}</tbody>
          </table>
        </section>
      )}

      {data.canEdit && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <h2 className="text-sm font-bold">{editingId ? 'Edit item' : 'Add an item'}</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="i-kind">Type</label>
              <select id="i-kind" className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BudgetItemFormValues['kind'] })}>
                <option value="per_package">In every package</option>
                <option value="one_off">One-off cost</option>
              </select>
            </div>
            {form.kind === 'per_package' && (
              <div>
                <label className={labelCls} htmlFor="i-group">Group (optional, e.g. Food, Hygiene)</label>
                <input id="i-group" className={inputCls} value={form.groupName ?? ''} onChange={(e) => setForm({ ...form, groupName: e.target.value })} />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="i-name">Item name</label>
              <input id="i-name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="i-measure">Measure</label>
              <input id="i-measure" list="b-measures" className={inputCls} value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} />
              <datalist id="b-measures">{MEASURES.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
            <div>
              <label className={labelCls} htmlFor="i-qty">Quantity</label>
              <input id="i-qty" className={inputCls} inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="i-price">Unit price (BDT)</label>
              <input id="i-price" className={inputCls} inputMode="decimal" value={form.unitPriceBdt} onChange={(e) => setForm({ ...form, unitPriceBdt: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={btnCls}
              disabled={busy}
              onClick={() =>
                run(
                  () => (editingId ? updateBudgetItemAction(projectId, editingId, form) : addBudgetItemAction(projectId, form)),
                  resetForm,
                )
              }
            >
              {editingId ? 'Save item' : 'Add item'}
            </button>
            {editingId && (
              <button className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}

      <section className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold mb-3">Totals (calculated)</h2>
        <dl className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-xs font-bold text-slate-500 uppercase">&nbsp;</dt>
          <dd className="text-xs font-bold text-slate-500 text-right">BDT</dd>
          <dd className="text-xs font-bold text-slate-500 text-right">{cur}</dd>
          <dt>All {calc.packagesCount.toLocaleString('en-US')} packages</dt>
          <dd className="text-right">{formatBdtCents(calc.allPackagesBdtCents)}</dd>
          <dd className="text-right">{money(calc.allPackagesConvertedMilli)}</dd>
          <dt>One-off costs</dt>
          <dd className="text-right">{formatBdtCents(calc.oneOffBdtCents)}</dd>
          <dd className="text-right">{money(calc.oneOffConvertedMilli)}</dd>
          <dt className="font-bold">Project cost</dt>
          <dd className="text-right font-bold">{formatBdtCents(calc.projectBdtCents)}</dd>
          <dd className="text-right font-bold">{money(calc.projectConvertedMilli)}</dd>
          <dt>Donor amount</dt>
          <dd className="text-right">—</dd>
          <dd className="text-right">{data.donorAmount === null ? '—' : formatMilli(calc.donorAmountMilli)}</dd>
          <dt className="font-bold">Administration cost (donor amount − project cost)</dt>
          <dd className="text-right">—</dd>
          <dd className="text-right font-bold">{money(calc.adminConvertedMilli)}</dd>
          <dt>Administration share of project cost (target {formatBp(calc.targetBp)})</dt>
          <dd className="text-right">—</dd>
          <dd className="text-right">{formatBp(calc.adminBp)}</dd>
        </dl>
      </section>
    </div>
  );
}
