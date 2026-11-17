import type { AppRole } from './database.types';
import { STAGE_LABELS, formatMoney } from './projects';

/**
 * What a donor sees. Only the projects of the donor's own organisation, and for each only a short summary and the
 * documents the Executive Director or Programme Manager released to the donor. No tasks, expense claims, purchase
 * requests, field reports, budget lines or fund receipts.
 */

export interface DonorDocument {
  id: string;
  title: string;
  category: string;
  description: string | null;
  releasedAt: string | null;
  fileName: string | null;
  size: number;
  versionId: string | null;
}

export interface DonorProjectCard {
  id: string;
  code: string;
  title: string;
  stageLabel: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  budgetText: string;
  families: number | null;
  documentCount: number;
}

export interface DonorHome {
  orgName: string;
  preview: boolean;
  projects: DonorProjectCard[];
}

export interface DonorProjectView {
  orgName: string;
  preview: boolean;
  project: DonorProjectCard;
  description: string | null;
  documents: DonorDocument[];
}

export const canViewDonorPortal = (roles: readonly AppRole[]) => roles.some((r) => r === 'donor' || r === 'executive' || r === 'programme_manager' || r === 'board');
/** Staff who may preview what one donor sees (they pick the donor with ?org=): the Executive Director, Programme Manager and Board. */
export const canPreviewDonorPortal = (roles: readonly AppRole[]) => roles.some((r) => r === 'executive' || r === 'programme_manager' || r === 'board');

export function toCard(p: {
  id: string;
  code: string;
  title: string;
  stage: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_amount: number | string | null;
  budget_currency: string | null;
}, families: number | null, documentCount: number): DonorProjectCard {
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    stageLabel: (STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage,
    location: p.location,
    startDate: p.start_date,
    endDate: p.end_date,
    budgetText: p.budget_amount === null ? '' : formatMoney(p.budget_amount, p.budget_currency),
    families,
    documentCount,
  };
}

export const fileSizeText = (bytes: number): string =>
  bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
