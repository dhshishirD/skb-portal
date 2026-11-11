/*
 * Staff directory for the Community page: who works at SKB, from the portal database.
 * Replaces the old hard-coded list (names, e-mails, phone numbers and employee IDs kept in code).
 * Only name and designation are shared; e-mail and phone stay private to the person and the administrators.
 */

export interface UserProfileRecord {
  id: string;
  fullName: string;
  designation?: string;
  /** Kept so older screens keep compiling; always empty here (the directory does not carry e-mails). */
  email: string;
  requestedRole: string;
  department: string;
  avatarUrl?: string;
  phone?: string;
  dutyStation?: string;
  employeeId?: string;
  bio?: string;
}

interface DirectoryRow {
  id: string;
  fullName: string;
  designation: string | null;
}

export function directoryRowsToRecords(rows: DirectoryRow[]): UserProfileRecord[] {
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    designation: r.designation ?? undefined,
    email: '',
    requestedRole: r.designation ?? 'Staff',
    department: '',
  }));
}

/** Active staff, in the order set by the administrator. Empty list if the lookup fails. */
export async function fetchStaffDirectory(): Promise<UserProfileRecord[]> {
  try {
    const res = await fetch('/api/staff-directory', { cache: 'no-store' });
    if (!res.ok) return [];
    const body = (await res.json()) as { staff?: DirectoryRow[] };
    return directoryRowsToRecords(body.staff ?? []);
  } catch {
    return [];
  }
}
