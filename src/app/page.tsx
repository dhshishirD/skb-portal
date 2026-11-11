import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';

/*
 * Public landing page. It shows no project data and no statistics: only the name of the portal
 * and the way in. Everything else is behind sign-in.
 */
export default function RootPage() {
  const t = useTranslations('Common');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/skb-logo.png" alt="Small Kindness Bangladesh logo" width={38} height={38} priority className="w-9 h-9 object-contain" />
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-none">{t('appName')}</h1>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Small Kindness Bangladesh</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <section className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <h2 className="text-2xl font-black text-slate-900">{t('appName')}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('tagline')}. This portal is for Small Kindness Bangladesh staff and invited partners. Please sign in with the account you were given.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
          >
            Sign in
          </Link>
        </section>
      </main>
    </div>
  );
}
