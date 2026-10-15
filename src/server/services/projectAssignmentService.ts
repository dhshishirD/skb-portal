import { DEFAULT_APPROVED_USERS } from './userApprovalService';

export interface AssignableOfficer {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
  dutyStation: string;
}

const INITIAL_ASSIGNMENTS: Record<string, string[]> = {
  // 1. Adak Aqiqa (Sacrificing 20 Cows) for Rohingya Refugees
  'BD-SKB-2026-COW-20': ['Md. Abu Huraira', 'Mizbah Uddin'],
  'P-SKB-2026-COW': ['Md. Abu Huraira', 'Mizbah Uddin'],

  // 2. Goats, Clothing & Food Packets for Orphans
  'BD-SKB-2026-LIV-CLO': ['Emran Ahmed'],
  'P-SKB-2026-GOAT': ['Emran Ahmed'],

  // 3. Women-Friendly Space (Skill Development - WFS 22221)
  'BD-SKB-2026-WFS-SDLP': ['Daloyar Hassan', 'Emran Ahmed'],
  'P-SKB-2026-WFS': ['Daloyar Hassan', 'Emran Ahmed'],

  // 4. Clean Drinking Water Deep Tube-Well
  'BD-SKB-2026-UOL-WTR': ['Mizbah Uddin'],

  // 5. Rohingya Refugee Emergency Food Rations & Medical Clinic
  'BD-SKB-2026-MVM-REF': ['Emran Ahmed'],

  // 6. Widow Sustenance & Women Livelihood
  'BD-SKB-2026-QWC-WLF': ['Daloyar Hassan'],

  // 7. Boat Distribution Project
  'PID 22222': ['Muktadir Rahaman', 'Mizbah Uddin']
};

const CODE_ALIAS_MAP: Record<string, string[]> = {
  'BD-SKB-2026-COW-20': ['P-SKB-2026-COW'],
  'P-SKB-2026-COW': ['BD-SKB-2026-COW-20'],
  'BD-SKB-2026-LIV-CLO': ['P-SKB-2026-GOAT'],
  'P-SKB-2026-GOAT': ['BD-SKB-2026-LIV-CLO'],
  'BD-SKB-2026-WFS-SDLP': ['P-SKB-2026-WFS'],
  'P-SKB-2026-WFS': ['BD-SKB-2026-WFS-SDLP'],
};

const STORAGE_KEY = 'skb_project_officer_assignments_v2';

export class ProjectAssignmentService {
  /**
   * Retrieve all project officer assignments map from cache / localStorage
   */
  public static getAllAssignments(): Record<string, string[]> {
    if (typeof window === 'undefined') {
      return { ...INITIAL_ASSIGNMENTS };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...INITIAL_ASSIGNMENTS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse project officer assignments', e);
    }

    return { ...INITIAL_ASSIGNMENTS };
  }

  /**
   * Get the list of assigned officer names for a specific project
   */
  public static getAssignedOfficers(projectIdOrCode: string, fallbackOfficer?: string): string[] {
    if (!projectIdOrCode) {
      return fallbackOfficer ? [fallbackOfficer] : [];
    }

    const all = this.getAllAssignments();
    
    // Check direct match
    if (all[projectIdOrCode] && all[projectIdOrCode].length > 0) {
      return all[projectIdOrCode];
    }

    // Check alias match
    const aliases = CODE_ALIAS_MAP[projectIdOrCode] || [];
    for (const alias of aliases) {
      if (all[alias] && all[alias].length > 0) {
        return all[alias];
      }
    }

    // Fallback
    return fallbackOfficer ? [fallbackOfficer] : [];
  }

  /**
   * Assign one or more officers to a project.
   * Only the Executive Director or Board Chairman should invoke this.
   */
  public static setAssignedOfficers(projectIdOrCode: string, officerNames: string[]): void {
    if (!projectIdOrCode) return;

    const all = this.getAllAssignments();
    const cleanOfficers = Array.from(new Set(officerNames.map(o => o.trim()).filter(Boolean)));
    
    all[projectIdOrCode] = cleanOfficers;

    // Synchronize aliases as well
    const aliases = CODE_ALIAS_MAP[projectIdOrCode] || [];
    for (const alias of aliases) {
      all[alias] = cleanOfficers;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('skb_assignments_changed', { 
          detail: { projectId: projectIdOrCode, officers: cleanOfficers } 
        }));
      } catch (e) {
        console.error('Failed to save project officer assignments', e);
      }
    }
  }

  /**
   * Check if a specific officer is assigned to a project.
   */
  public static isUserAssigned(
    projectIdOrCode: string,
    userName: string,
    userEmail?: string,
    fallbackOfficer?: string
  ): boolean {
    if (!projectIdOrCode || !userName) return false;

    const assigned = this.getAssignedOfficers(projectIdOrCode, fallbackOfficer);
    const cleanName = userName.trim().toLowerCase();

    return assigned.some(officer => {
      const cleanOfficer = officer.trim().toLowerCase();
      return cleanOfficer === cleanName || cleanOfficer.includes(cleanName) || cleanName.includes(cleanOfficer);
    });
  }

  /**
   * Determine if the user has authority to assign officers to projects.
   * Per organizational mandate: ONLY Executive Director (Md. Abu Huraira) or Board Chairman.
   */
  public static canUserAssignOfficers(userName: string, userRole?: string, userEmail?: string): boolean {
    const cleanName = (userName || '').trim().toLowerCase();
    const cleanRole = (userRole || '').trim().toLowerCase();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    if (
      cleanName.includes('huraira') || 
      cleanEmail === 'kindnessforbeauty@gmail.com' ||
      cleanRole.includes('executive director') ||
      cleanRole.includes('director') ||
      cleanName.includes('orakatul') ||
      cleanRole.includes('chairman')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get all assignable officers across SKB departments
   */
  public static getAssignableOfficers(): AssignableOfficer[] {
    const officers: AssignableOfficer[] = DEFAULT_APPROVED_USERS
      .filter(u => u.status === 'APPROVED')
      .map(u => ({
        id: u.id,
        name: u.fullName,
        role: u.designation || u.requestedRole,
        email: u.email,
        department: u.department,
        dutyStation: u.dutyStation || 'Dhaka HQ'
      }));

    return officers;
  }
}
