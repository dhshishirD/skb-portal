import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { ProjectTabs } from '@/components/projects/ProjectTabs';
import { STAGE_LABELS } from '@/lib/projects';
import { getOwnOrganization, getProjectById } from '@/server/services/projectsData';

/*
 * Shared header for every project page. The title, code and stage come from the database,
 * through the signed-in user's own access (a project they may not see is a 404).
 */
export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const [project, org] = await Promise.all([getProjectById(params.id), getOwnOrganization().catch(() => null)]);
  if (!project) notFound();

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium">
            <Link href="/projects" className="hover:underline text-blue-600 font-bold">
              Projects
            </Link>
            <span aria-hidden="true">&rsaquo;</span>
            <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
              {project.code}
            </span>
            <span className="font-semibold text-slate-800">{project.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-3 py-1 rounded-full">
              {STAGE_LABELS[project.stage]}
            </span>
            {org?.registration_no && (
              <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                {org.registration_authority ? `${org.registration_authority} ` : 'Reg. '}
                {org.registration_no}
              </span>
            )}
          </div>
        </div>
        <ProjectTabs projectId={project.id} />
      </div>

      <div>{children}</div>
    </div>
  );
}
