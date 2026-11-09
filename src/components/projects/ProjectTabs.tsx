'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, Calculator, CheckSquare, FileText, FolderArchive, FolderKanban, LayoutDashboard, ShieldCheck, Target, Users } from 'lucide-react';

/** Tabs that are connected to the database show no badge; the rest are marked "Soon". */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { name: 'Overview', href: `${base}/overview`, icon: LayoutDashboard, ready: true },
    { name: 'Charter', href: `${base}/charter`, icon: FileText, ready: true },
    { name: 'Stage gates', href: `${base}/kanban`, icon: FolderKanban, ready: true },
    { name: 'Budget', href: `${base}/budget`, icon: Calculator, ready: true },
    { name: 'Fund receipts', href: `${base}/receipts`, icon: Banknote, ready: true },
    { name: 'Logframe', href: `${base}/logframe`, icon: Target, ready: true },
    { name: 'Tasks', href: `${base}/tasks`, icon: CheckSquare, ready: true },
    { name: 'Beneficiaries', href: `${base}/beneficiaries`, icon: Users, ready: false },
    { name: 'Documents', href: `${base}/documents`, icon: FolderArchive, ready: false },
    { name: 'Closing & Form-7', href: `${base}/closing-report`, icon: ShieldCheck, ready: false },
  ];

  return (
    <nav aria-label="Project sections" className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              active
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-500'}`} aria-hidden="true" />
            <span>{tab.name}</span>
            {!tab.ready && (
              <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full uppercase">Soon</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
