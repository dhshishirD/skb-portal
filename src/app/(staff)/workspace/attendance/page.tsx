import { TeamAttendancePanel } from '@/components/workspace/TeamAttendancePanel';

export const metadata = { title: 'Team Attendance' };

export default function TeamAttendancePage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Team Attendance</h1>
        <p className="text-sm text-slate-600">Who is in, when they checked in and out, and where. Only the Executive Director and the Super Admin can open this page.</p>
      </div>
      <TeamAttendancePanel />
    </div>
  );
}
