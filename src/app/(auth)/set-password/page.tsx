import { setPasswordAction } from '@/app/actions/auth';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES_TEXT } from '@/lib/auth/passwordPolicy';

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = typeof searchParams?.error === 'string' ? searchParams.error : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-slate-900">Set Your Account Password</h2>
        <p className="text-xs text-slate-500">
          You have been invited to the NGO Operations Portal. Set a strong password to continue.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form action={setPasswordAction} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            New Password
          </label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            aria-describedby="password-rules"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p id="password-rules" className="mt-1 text-[11px] text-slate-500">
            {PASSWORD_RULES_TEXT}
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          Set Password & Access Portal
        </button>
      </form>
    </div>
  );
}
