export interface OfflineFieldReport {
  id: string;
  projectId: string;
  locationId?: string;
  period: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  payload: Record<string, any>;
  createdAt: string;
}

const STORAGE_KEY = 'ngo_portal_offline_reports';

export function getOfflineReports(): OfflineFieldReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineReport(report: OfflineFieldReport): void {
  if (typeof window === 'undefined') return;
  const existing = getOfflineReports();
  existing.push(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function clearOfflineReport(id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getOfflineReports();
  const filtered = existing.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
