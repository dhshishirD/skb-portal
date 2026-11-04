'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CURRENCIES, EMPTY_PROJECT_FORM, projectInputSchema, type ProjectFormValues } from '@/lib/projects';
import type { ActionResult, DataResult } from '@/server/actions/projects';

const field = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-medium text-slate-700 space-y-1">
      <span>{label}</span>
      {children}
      {hint && !error && <span className="block text-[11px] text-slate-500 font-normal">{hint}</span>}
      {error && (
        <span role="alert" className="block text-[11px] text-red-600 font-normal">
          {error}
        </span>
      )}
    </label>
  );
}

/** Create or edit a project. Saves through a server action; nothing is kept in the browser. */
export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ProjectFormValues;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<ActionResult | DataResult<unknown>>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    // Browser check for quick feedback only; the server action validates the raw text again.
    resolver: zodResolver(projectInputSchema) as unknown as Resolver<ProjectFormValues>,
    defaultValues: initial ?? EMPTY_PROJECT_FORM,
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = handleSubmit(async () => {
    setBusy(true);
    setFormError(null);
    // The server validates the raw text again; the browser check above is for quick feedback.
    const result = await onSubmit(getValues());
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(name as keyof ProjectFormValues, { message });
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Project code *" error={errors.code?.message} hint="For example WFS-SDLP">
          <input {...register('code')} className={`${field} font-mono`} autoComplete="off" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Project title *" error={errors.title?.message}>
            <input {...register('title')} className={field} autoComplete="off" />
          </Field>
        </div>
      </div>

      <Field label="Description" error={errors.description?.message}>
        <textarea {...register('description')} rows={3} className={field} />
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Location" error={errors.location?.message}>
          <input {...register('location')} className={field} />
        </Field>
        <Field label="Donor" error={errors.donor_name?.message}>
          <input {...register('donor_name')} className={field} />
        </Field>
        <Field label="NGOAB reference" error={errors.ngoab_ref?.message} hint="This project's reference, if you have it">
          <input {...register('ngoab_ref')} className={field} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Budget" error={errors.budget_amount?.message}>
          <input {...register('budget_amount')} inputMode="decimal" className={field} />
        </Field>
        <Field label="Currency" error={errors.budget_currency?.message}>
          <select {...register('budget_currency')} className={field}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Beneficiary target" error={errors.beneficiary_target?.message}>
          <input {...register('beneficiary_target')} inputMode="numeric" className={field} />
        </Field>
        <div />
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Start date" error={errors.start_date?.message}>
          <input type="date" {...register('start_date')} className={field} />
        </Field>
        <Field label="End date" error={errors.end_date?.message}>
          <input type="date" {...register('end_date')} className={field} />
        </Field>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
