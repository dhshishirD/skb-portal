import { resetPasswordAction } from '@/app/actions/auth';
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-slate-900">Reset Your Password</h2>
        <p className="text-xs text-slate-500">
          Enter your registered email address to receive a password reset link.
        </p>
      </div>

      <form action={resetPasswordAction} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="user@organization.org"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          Send Reset Link
        </button>
      </form>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs text-blue-600 hover:underline">
          &larr; Return to Login
        </Link>
      </div>
    </div>
  );
}
