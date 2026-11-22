import { notFound } from 'next/navigation';
import { OfficerAssignment } from '@/components/projects/OfficerAssignment';
import { ProjectHealthPanel } from '@/components/projects/ProjectHealthPanel';
import { Form3ExportPanel } from '@/components/projects/Form3ExportPanel';
import { canSeeBudgetVsActual } from '@/lib/budgetVsActual';
import { Form7ExportPanel } from '@/components/projects/Form7ExportPanel';
import { Form3ImportPanel } from '@/components/projects/Form3ImportPanel';
import { ProjectDeckPanel } from '@/components/projects/ProjectDeckPanel';
import { ProjectDonorPanel } from '@/components/projects/ProjectDonorPanel';
import { FormTextsPanel } from '@/components/projects/FormTextsPanel';
import { ProjectAreasPanel } from '@/components/projects/ProjectAreasPanel';
import { ProjectOverviewActions } from '@/components/projects/ProjectOverviewActions';
import {
  STAGE_LABELS,
  canArchiveProjects,
  canAssignOfficers,
  canEditProjects,
  formatMoney,
} from '@/lib/projects';
import { canReadAreas } from '@/lib/projectAreas';
import { canSetProjectDonor } from '@/lib/donors';
import { canReadFormTexts } from '@/lib/formTexts';
import { getProjectHealthAction } from '@/server/actions/projectHealth';
import { getActor, getProjectById } from '@/server/services/projectsData';

const dash = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, actor] = await Promise.all([getProjectById(id), getActor()]);
  if (!project || !actor) notFound();
  const health = await getProjectHealthAction(project.id);

  const rows: Array<[string, string]> = [
    ['Stage', STAGE_LABELS[project.stage]],
    ['Location', dash(project.location)],
    ['Donor', dash(project.donor_name)],
    ['NGOAB reference', dash(project.ngoab_ref)],
    ['Budget', formatMoney(project.budget_amount, project.budget_currency)],
    ['Beneficiary target', project.beneficiary_target === null ? '—' : project.beneficiary_target.toLocaleString('en-US')],
    ['Start date', dash(project.start_date)],
    ['End date', dash(project.end_date)],
  ];

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{project.code}</p>
            <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
          </div>
          <ProjectOverviewActions
            project={project}
            canEdit={canEditProjects(actor.roles)}
            canArchive={canArchiveProjects(actor.roles)}
          />
        </div>
        {project.description && <p className="text-sm text-slate-700 whitespace-pre-line">{project.description}</p>}
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {health.ok && <ProjectHealthPanel projectId={project.id} health={health.data} />}

      {canSetProjectDonor(actor.roles) && <ProjectDonorPanel projectId={project.id} />}

      {canReadAreas(actor.roles) && <ProjectAreasPanel projectId={project.id} />}

      {canReadFormTexts(actor.roles) && <FormTextsPanel projectId={project.id} />}

      {canEditProjects(actor.roles) && <Form3ImportPanel projectId={project.id} />}

      <ProjectDeckPanel
        project={{
          id: project.id,
          code: project.code,
          title: project.title,
          stageLabel: STAGE_LABELS[project.stage],
          location: project.location,
          donorName: project.donor_name,
          startDate: project.start_date,
          endDate: project.end_date,
          beneficiaryTarget: project.beneficiary_target,
        }}
      />
      {canEditProjects(actor.roles) && <Form3ExportPanel projectId={project.id} />}

      {canSeeBudgetVsActual(actor.roles) && <Form7ExportPanel projectId={project.id} />}

      {canAssignOfficers(actor.roles) && <OfficerAssignment projectId={project.id} />}
    </div>
  );
}
