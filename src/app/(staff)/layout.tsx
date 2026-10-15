'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  ChevronRight,
  MessageSquare,
  Camera,
  ChevronDown,
  User
} from 'lucide-react';
import { DEFAULT_APPROVED_USERS } from '@/server/services/userApprovalService';
import { getOfficialAvatar } from '@/lib/avatarPresets';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string; initial: string; avatarUrl?: string }>({
    name: 'SKB Staff User',
    role: 'Staff Workspace',
    initial: 'S'
  });

  const pathname = usePathname();
  const commonT = useTranslations('Common');
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  useEffect(() => {
    const resolveUser = async () => {
      const storedAuthor = typeof window !== 'undefined' ? localStorage.getItem('skb_current_community_author') : null;
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('skb_current_user_email') : null;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Priority 1: Match by authenticated Supabase user
      if (user) {
        const email = user.email || '';
        const metaName = user.user_metadata?.full_name;
        const matched = DEFAULT_APPROVED_USERS.find(
          u => u.email.toLowerCase() === email.toLowerCase() || (metaName && u.fullName.toLowerCase() === metaName.toLowerCase())
        );

        if (matched) {
          setUserProfile({
            name: matched.fullName,
            role: matched.designation || matched.requestedRole,
            initial: matched.fullName.charAt(0).toUpperCase(),
            avatarUrl: matched.avatarUrl || getOfficialAvatar(matched)
          });
          setLoadingUser(false);
          return;
        }

        const fullName = metaName || email.split('@')[0] || 'SKB Officer';
        const designation = user.user_metadata?.designation || 'Staff Member';
        setUserProfile({
          name: fullName,
          role: designation,
          initial: fullName.charAt(0).toUpperCase(),
          avatarUrl: user.user_metadata?.avatar_url || getOfficialAvatar({ fullName, requestedRole: designation as any })
        });
        setLoadingUser(false);
        return;
      }

      // Priority 2: Match by active local session
      if (storedAuthor || storedEmail) {
        const matched = DEFAULT_APPROVED_USERS.find(
          u => (storedAuthor && u.fullName.toLowerCase() === storedAuthor.toLowerCase()) ||
               (storedEmail && u.email.toLowerCase() === storedEmail.toLowerCase())
        );
        if (matched) {
          setUserProfile({
            name: matched.fullName,
            role: matched.designation || matched.requestedRole,
            initial: matched.fullName.charAt(0).toUpperCase(),
            avatarUrl: matched.avatarUrl || getOfficialAvatar(matched)
          });
          setLoadingUser(false);
          return;
        }
      }

      // Default fallback
      const defaultOfficer = DEFAULT_APPROVED_USERS[2]; // Daloyar Hassan (Super Admin / HR)
      setUserProfile({
        name: defaultOfficer.fullName,
        role: defaultOfficer.designation || defaultOfficer.requestedRole,
        initial: defaultOfficer.fullName.charAt(0).toUpperCase(),
        avatarUrl: defaultOfficer.avatarUrl || getOfficialAvatar(defaultOfficer)
      });
      setLoadingUser(false);
    };

    resolveUser();
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
    { href: '/community', label: 'HQ Staff Community', icon: MessageSquare },
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
              <Image
                src="/skb-logo.png"
                alt="Small Kindness Bangladesh Logo"
                width={32}
                height={32}
                priority
                className="w-8 h-8 object-contain filter drop-shadow transition-transform group-hover:scale-105"
              />
              <span className="hidden sm:inline tracking-tight font-extrabold text-slate-100">SKB Works Portal</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                HQ Staff
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {loadingUser ? (
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-slate-700" />
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-slate-700 rounded" />
                  <div className="h-2.5 w-14 bg-slate-700/60 rounded" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="hidden sm:flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 transition text-left"
                >
                  {userProfile.avatarUrl ? (
                    <img 
                      src={userProfile.avatarUrl} 
                      alt={userProfile.name} 
                      className="w-7 h-7 rounded-full object-cover border border-blue-400/50" 
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm">
                      {userProfile.initial}
                    </div>
                  )}
                  <div className="text-left leading-none">
                    <p className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      {userProfile.name} <ChevronDown className="w-3 h-3 text-slate-400" />
                    </p>
                    <p className="text-[10px] text-blue-400 font-medium mt-0.5">{userProfile.role}</p>
                  </div>
                </button>

                {/* Real Officer Account Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 p-2 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <img 
                        src={userProfile.avatarUrl || getOfficialAvatar({ fullName: userProfile.name, requestedRole: userProfile.role as any })} 
                        alt={userProfile.name} 
                        className="w-10 h-10 rounded-full object-cover border border-emerald-500 shrink-0" 
                      />
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-100 text-xs truncate">{userProfile.name}</p>
                        <p className="text-[10px] text-blue-400 font-bold truncate">{userProfile.role}</p>
                        <p className="text-[9px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Authenticated Officer
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-1 space-y-0.5">
                      <Link
                        href="/me/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full text-left p-2 hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200 transition"
                      >
                        <User className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>My Official Profile & ID Badge</span>
                      </Link>

                      <Link
                        href="/community"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full text-left p-2 hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200 transition"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>HQ Staff Community</span>
                      </Link>

                      <Link
                        href="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full text-left p-2 hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200 transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Staff Workspace Desk</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        onClick={async () => {
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('skb_current_community_author');
                            localStorage.removeItem('skb_current_user_email');
                          }
                          const supabase = createClient();
                          await supabase.auth.signOut();
                          window.location.href = '/login';
                        }}
                        className="w-full text-left p-2 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-xl flex items-center gap-2.5 font-bold transition"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Sign Out of Portal</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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

