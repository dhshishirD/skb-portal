'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Receipt, 
  ShieldCheck, 
  BarChart2, 
  Users, 
  Sparkles,
  Menu, 
  X,
  Building2,
  UserCheck,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string; initial: string }>({
    name: 'SKB Staff User',
    role: 'Staff Workspace',
    initial: 'S'
  });

  const pathname = usePathname();
  const commonT = useTranslations('Common');
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'SKB User';
        const designation = user.user_metadata?.designation || 'Staff Member';
        const initial = fullName.charAt(0).toUpperCase();
        setUserProfile({
          name: fullName,
          role: designation,
          initial: initial
        });
      }
    });
  }, []);

  const isAdminUser = 
    userProfile.role.toLowerCase().includes('admin') || 
    userProfile.role.toLowerCase().includes('director') || 
    userProfile.role.toLowerCase().includes('executive') || 
    userProfile.role.toLowerCase().includes('it');

  const navItems = [
    { href: '/dashboard', label: navT('dashboard'), icon: LayoutDashboard },
    { href: '/projects', label: navT('projects'), icon: FolderKanban },
    { href: '/finance/approvals', label: 'Finance & Approvals', icon: Receipt },
    { href: '/me/dashboard', label: 'M&E Analytics', icon: BarChart2 },
    { href: '/me/report-generator', label: 'AI Donor Generator', icon: Sparkles, badge: 'AI' },
    { href: '/beneficiaries', label: 'Beneficiary Registry', icon: Users },
    ...(isAdminUser ? [{ href: '/admin/users', label: 'Admin & Governance', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/dashboard" className="font-bold text-base sm:text-lg flex items-center gap-2.5 text-white group">
              <img
                src="/skb-logo.png"
                alt="Small Kindness Bangladesh Logo"
                className="w-8 h-8 object-contain filter drop-shadow transition-transform group-hover:scale-105"
              />
              <span className="hidden sm:inline tracking-tight font-extrabold text-slate-100">SKB Works Portal</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                HQ Staff
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <div className="w-6.5 h-6.5 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm">
                {userProfile.initial}
              </div>
              <div className="text-left leading-none">
                <p className="text-xs font-bold text-slate-100">{userProfile.name}</p>
                <p className="text-[10px] text-blue-400 font-medium mt-0.5">{userProfile.role}</p>
              </div>
            </div>

            <LanguageSwitcher />
            
            <Link 
              href="/login" 
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Staff Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar (Desktop) */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 p-4 space-y-6 transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0 pt-20 md:pt-4' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 mb-3">
              HQ Workspaces & Tools
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Multi-Tenant Active
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                HQ NGO Operations • Connected to Supabase Production
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop overlay */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          />
        )}

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

