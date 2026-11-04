'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Archive } from 'lucide-react';
import { ProjectForm } from './ProjectForm';
import { archiveProjectAction, updateProjectAction } from '@/server/actions/projects';
import { projectRowToForm, type ProjectRow } from '@/lib/projects';

/** Edit and archive buttons for the overview page. The page decides who sees which. */
export function ProjectOverviewActions({
  project,
  canEdit,
  canArchive,
}: {
  project: ProjectRow;
  canEdit: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (editing) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Edit project</h2>
        <ProjectForm
          initial={projectRowToForm(project)}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const r = await updateProjectAction(project.id, values);
            if (r.ok) {
              setEditing(false);
              router.refresh();
            }
            return r;
          }}
        />
      </div>
    );
  }

  const archive = async () => {
    setBusy(true);
    setError(null);
    const r = await archiveProjectAction(project.id);
    setBusy(false);
    if (r.ok) router.push('/projects');
    else setError(r.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200">
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
        </button>
      )}
      {canArchive &&
        (confirming ? (
          <>
            <span className="text-xs text-slate-700">Archive this project for everyone?</span>
            <button onClick={archive} disabled={busy} className="px-3 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60">
              {busy ? 'Archiving…' : 'Yes, archive'}
            </button>
            <button onClick={() => setConfirming(false)} className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg">
              Keep
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100">
            <Archive className="w-3.5 h-3.5" aria-hidden="true" /> Archive
          </button>
        ))}
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
