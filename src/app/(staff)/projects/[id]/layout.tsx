'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Target, 
  CheckSquare, 
  Users, 
  FolderArchive, 
  ShieldCheck, 
  Building2 
} from 'lucide-react';

export default function ProjectDetailSubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const pid = params.id || 'PID-2026';

  const navTabs = [
    { name: '1. Project Charter', href: `/projects/${pid}/charter`, icon: FileText, isNew: true },
    { name: '2. Logframe Tree', href: `/projects/${pid}/logframe`, icon: Target, isNew: false },
    { name: '3. Tasks & Workplan', href: `/projects/${pid}/tasks`, icon: CheckSquare, isNew: false },
    { name: '4. Beneficiaries', href: `/projects/${pid}/beneficiaries`, icon: Users, isNew: false },
    { name: '5. Compliance Docs', href: `/projects/${pid}/documents`, icon: FolderArchive, isNew: false },
    { name: '6. Closing & Form-7 Audit', href: `/projects/${pid}/closing-report`, icon: ShieldCheck, isNew: true },
  ];

  return (
    <div className="space-y-6">
      {/* Shared Project Top Breadcrumb & Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Link href="/projects" className="hover:underline text-blue-600 font-bold">
              Projects Portfolio
            </Link>
            <span>&rsaquo;</span>
            <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
              {decodeURIComponent(pid)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> SKB Operations • NGOAB Reg #2938
            </span>
          </div>
        </div>

        {/* Lifecycle Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.name}</span>
                {tab.isNew && (
                  <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                    New
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content View */}
      <div>{children}</div>
    </div>
  );
}
