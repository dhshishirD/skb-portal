import { resetPasswordAction } from '@/app/actions/auth';
import Link from 'next/link';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const error = typeof searchParams?.error === 'string' ? searchParams.error : null;
  const success = typeof searchParams?.success === 'string' ? searchParams.success : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-slate-900">Reset Your Password</h2>
        <p className="text-xs text-slate-500">
          Enter your registered email address to receive a password reset link.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      <form action={resetPasswordAction} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
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
