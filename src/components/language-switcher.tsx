'use client';

import { useLocale } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();

  const toggleLanguage = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs">
      <button
        onClick={() => toggleLanguage('en')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'en'
            ? 'bg-white dark:bg-slate-700 shadow font-semibold text-blue-600 dark:text-blue-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => toggleLanguage('bn')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'bn'
            ? 'bg-white dark:bg-slate-700 shadow font-semibold text-blue-600 dark:text-blue-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
        }`}
      >
        বাংলা
      </button>
    </div>
  );
}
