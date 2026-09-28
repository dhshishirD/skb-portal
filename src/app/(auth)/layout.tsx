import Image from 'next/image';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 space-y-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-col items-center space-y-2 text-center">
        <Image 
          src="/skb-logo.png" 
          alt="Small Kindness Bangladesh Logo" 
          width={80}
          height={80}
          priority
          className="w-20 h-20 object-contain drop-shadow-md"
        />
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SKB Works Portal</h1>
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Small Kindness Bangladesh
        </p>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
