import { signOutAction } from '@/app/actions/auth';

const MESSAGES: Record<string, { title: string; body: string }> = {
  'no-role': {
    title: 'Your account has no role yet',
    body: 'You are signed in, but a Super Admin has not given your account a role. Please ask the Executive Director or HR & Admin to assign one.',
  },
  inactive: {
    title: 'Your account is deactivated',
    body: 'This account has been switched off. If you think this is a mistake, contact HR & Admin.',
  },
  error: {
    title: 'We could not check your access',
    body: 'Something went wrong while loading your role. Please try again in a minute.',
  },
};

export default function NoAccessPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const reason = typeof searchParams?.reason === 'string' && MESSAGES[searchParams.reason] ? searchParams.reason : 'no-role';
  const msg = MESSAGES[reason];

  return (
    <div className="space-y-5 text-center">
      <h2 className="text-lg font-bold text-slate-900">{msg.title}</h2>
      <p className="text-sm text-slate-600">{msg.body}</p>
      <div className="flex flex-col gap-2">
        {reason === 'error' && (
          <a href="/home" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            Try again
          </a>
        )}
        <form action={signOutAction}>
          <button type="submit" className="w-full py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
