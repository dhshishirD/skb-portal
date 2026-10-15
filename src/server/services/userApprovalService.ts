import { 
  HIJABI_CHAIRMAN_AVATAR, 
  MALE_EXECUTIVE_AVATAR, 
  MALE_OFFICER_AVATAR, 
  IT_OFFICER_AVATAR, 
  LAW_OFFICER_AVATAR,
  getOfficialAvatar
} from '@/lib/avatarPresets';

export type SystemRole = 
  | 'Chairman'
  | 'Executive Director'
  | 'Program Officer'
  | 'IT Officer'
  | 'Law Officer'
  | 'Finance Manager'
  | 'Field Operations Officer'
  | 'General Staff';

export interface UserProfileRecord {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  dutyStation?: string;
  designation?: string;
  employeeId?: string;
  department: string;
  requestedRole: SystemRole;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  bio?: string;
}

const STORAGE_KEY = 'skb_user_approval_profiles';

export const ORGANOGRAM_HIERARCHY: Record<string, number> = {
  'dr. orakatul jannat': 1,
  'orakatul jannat': 1,
  'md. abu huraira': 2,
  'abu huraira': 2,
  'daloyar hassan': 3,
  'emran ahmed': 4,
  'md. emran': 4,
  'md. emran ahmed': 4,
  'mizbah uddin': 5,
  'muktadir rahaman': 6,
  'aminul islam bulbul': 7,
  'aminul islam': 7,
};

export function sortOrganogramUsers(users: UserProfileRecord[]): UserProfileRecord[] {
  const getRank = (name: string) => {
    const clean = name.trim().toLowerCase();
    if (ORGANOGRAM_HIERARCHY[clean]) return ORGANOGRAM_HIERARCHY[clean];
    if (clean.includes('orakatul')) return 1;
    if (clean.includes('huraira')) return 2;
    if (clean.includes('daloyar')) return 3;
    if (clean.includes('emran')) return 4;
    if (clean.includes('mizbah')) return 5;
    if (clean.includes('muktadir')) return 6;
    if (clean.includes('bulbul') || clean.includes('aminul')) return 7;
    return 99;
  };

  return [...users].sort((a, b) => {
    const rankA = getRank(a.fullName);
    const rankB = getRank(b.fullName);
    if (rankA !== rankB) return rankA - rankB;
    return a.fullName.localeCompare(b.fullName);
  });
}

export const DEFAULT_APPROVED_USERS: UserProfileRecord[] = [
  {
    id: '10000000-0000-0000-0000-000000000003',
    fullName: 'Dr. Orakatul Jannat',
    email: 'dr.orakatul@skb.org.bd',
    avatarUrl: HIJABI_CHAIRMAN_AVATAR,
    phone: '+880 1711-000002',
    dutyStation: 'Dhaka HQ',
    designation: 'Chairman',
    employeeId: 'SKB-CHM-001',
    requestedRole: 'Chairman',
    department: 'Directorate General HQ',
    status: 'APPROVED',
    approvedBy: 'Governing Board',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Chairman of the Board steering humanitarian vision, strategic donor relations, and high-level organizational leadership.',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    fullName: 'Md. Abu Huraira',
    email: 'kindnessforbeauty@gmail.com',
    avatarUrl: MALE_EXECUTIVE_AVATAR,
    phone: '+880 1711-000001',
    dutyStation: 'Dhaka HQ',
    designation: 'Executive Director',
    employeeId: 'SKB-DIR-001',
    requestedRole: 'Executive Director',
    department: 'Directorate General HQ',
    status: 'APPROVED',
    approvedBy: 'Founding Charter',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Executive Director managing operational execution, project sign-offs, and humanitarian governance across Bangladesh.',
  },
  {
    id: '0a88393f-1283-42d2-b4c2-31c502b1d538',
    fullName: 'Daloyar Hassan',
    email: 'daloyar.pro@gmail.com',
    avatarUrl: MALE_OFFICER_AVATAR,
    phone: '+880 1711-000005',
    dutyStation: 'Dhaka HQ',
    designation: 'Program Officer',
    employeeId: 'SKB-PRG-001',
    requestedRole: 'Program Officer',
    department: 'HR & Admin',
    status: 'APPROVED',
    approvedBy: 'Executive Directorate',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Program Officer leading HR administration, operational personnel management, and project coordination.',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    fullName: 'Emran Ahmed',
    email: 'emran.ahmed@skb.org.bd',
    avatarUrl: MALE_OFFICER_AVATAR,
    phone: '+880 1711-000003',
    dutyStation: 'Dhaka HQ',
    designation: 'Program Officer',
    employeeId: 'SKB-PRG-002',
    requestedRole: 'Program Officer',
    department: 'Programs Directorate',
    status: 'APPROVED',
    approvedBy: 'Executive Directorate',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Program Officer managing project planning, Form-3 charters, logframe deliverables, and donor milestone reporting.',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    fullName: 'Mizbah Uddin',
    email: 'mizbah.uddin@skb.org.bd',
    avatarUrl: MALE_OFFICER_AVATAR,
    phone: '+880 1711-000004',
    dutyStation: 'Dhaka HQ',
    designation: 'Program Officer',
    employeeId: 'SKB-PRG-003',
    requestedRole: 'Program Officer',
    department: 'Programs Directorate',
    status: 'APPROVED',
    approvedBy: 'Executive Directorate',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Program Officer overseeing field implementation, distribution logistics, and partner operational alignment.',
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    fullName: 'Muktadir Rahaman',
    email: 'muktadir.rahaman@skb.org.bd',
    avatarUrl: IT_OFFICER_AVATAR,
    phone: '+880 1711-000006',
    dutyStation: 'Dhaka HQ',
    designation: 'IT Officer',
    employeeId: 'SKB-IT-001',
    requestedRole: 'IT Officer',
    department: 'IT & Systems Desk',
    status: 'APPROVED',
    approvedBy: 'Executive Directorate',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Official IT Officer profile. Non-operational in daily project execution; official advisory access with detailed operational scope to be defined later.',
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    fullName: 'Aminul Islam Bulbul',
    email: 'aminul.bulbul@skb.org.bd',
    avatarUrl: LAW_OFFICER_AVATAR,
    phone: '+880 1711-000007',
    dutyStation: 'Dhaka HQ',
    designation: 'Law Officer',
    employeeId: 'SKB-LAW-001',
    requestedRole: 'Law Officer',
    department: 'Legal & Compliance Desk',
    status: 'APPROVED',
    approvedBy: 'Executive Directorate',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Official Law Officer profile. Non-operational in daily project execution; official legal advisory access with detailed operational scope to be defined later.',
  }
];

export class UserApprovalService {
  private static getStoredProfiles(): UserProfileRecord[] {
    if (typeof window === 'undefined') return DEFAULT_APPROVED_USERS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APPROVED_USERS));
        return DEFAULT_APPROVED_USERS;
      }
      let parsed: UserProfileRecord[] = JSON.parse(stored);
      // Clean up legacy entries not part of the active organogram
      parsed = parsed.filter(p => !p.email.toLowerCase().includes('safwanur.rahman'));

      let hasUpdates = false;
      const merged = [...parsed];
      for (const defUser of DEFAULT_APPROVED_USERS) {
        const foundIndex = merged.findIndex(p => p.email.toLowerCase() === defUser.email.toLowerCase());
        if (foundIndex === -1) {
          merged.push(defUser);
          hasUpdates = true;
        } else {
          // If role/designation was updated in default organogram, refresh default fields if they were untouched
          if (merged[foundIndex].requestedRole !== defUser.requestedRole && (defUser.email.includes('dr.orakatul') || defUser.email.includes('muktadir') || defUser.email.includes('daloyar'))) {
            merged[foundIndex].designation = defUser.designation;
            merged[foundIndex].requestedRole = defUser.requestedRole;
            merged[foundIndex].department = defUser.department;
            hasUpdates = true;
          }
        }
      }

      // Upgrade any broken external Unsplash links or missing avatars to official vector SVGs
      for (const p of merged) {
        if (p.email.toLowerCase().includes('emran') && p.fullName !== 'Emran Ahmed') {
          p.fullName = 'Emran Ahmed';
          hasUpdates = true;
        }
        if (!p.avatarUrl || p.avatarUrl.includes('images.unsplash.com')) {
          p.avatarUrl = getOfficialAvatar(p);
          hasUpdates = true;
        }
      }

      const sorted = sortOrganogramUsers(merged);

      if (hasUpdates || parsed.length !== merged.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      }
      return sorted;
    } catch {
      return DEFAULT_APPROVED_USERS;
    }
  }

  private static saveProfiles(profiles: UserProfileRecord[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
  }

  public static async getAllUsers(): Promise<UserProfileRecord[]> {
    return this.getStoredProfiles();
  }

  public static async getPendingUsers(): Promise<UserProfileRecord[]> {
    const profiles = this.getStoredProfiles();
    return profiles.filter((p) => p.status === 'PENDING_APPROVAL');
  }

  public static async getUserProfile(emailOrId: string): Promise<UserProfileRecord | undefined> {
    const profiles = this.getStoredProfiles();
    return profiles.find((p) => p.email.toLowerCase() === emailOrId.toLowerCase() || p.id === emailOrId);
  }

  public static async registerGoogleUser(googleUser: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    requestedRole?: UserProfileRecord['requestedRole'];
  }): Promise<UserProfileRecord> {
    const profiles = this.getStoredProfiles();
    const existing = profiles.find((p) => p.email.toLowerCase() === googleUser.email.toLowerCase());
    if (existing) {
      return existing;
    }

    // Pre-approved executive/admin emails
    const isPreApproved = 
      googleUser.email.toLowerCase() === 'daloyar.pro@gmail.com' || 
      googleUser.email.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
      DEFAULT_APPROVED_USERS.some(u => u.email.toLowerCase() === googleUser.email.toLowerCase());

    const newRecord: UserProfileRecord = {
      id: `usr-${Date.now()}`,
      fullName: googleUser.fullName,
      email: googleUser.email,
      avatarUrl: googleUser.avatarUrl || getOfficialAvatar({ fullName: googleUser.fullName, requestedRole: googleUser.requestedRole }),
      requestedRole: googleUser.requestedRole || 'Program Officer',
      department: 'Operations & Projects',
      status: isPreApproved ? 'APPROVED' : 'PENDING_APPROVAL',
      createdAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    };

    const updated = [newRecord, ...profiles];
    this.saveProfiles(updated);
    return newRecord;
  }

  public static async registerOfficerRequest(data: {
    fullName: string;
    email: string;
    phone?: string;
    dutyStation?: string;
    department?: string;
    requestedRole: SystemRole;
    designation?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<UserProfileRecord> {
    const profiles = this.getStoredProfiles();
    const existingIndex = profiles.findIndex((p) => p.email.toLowerCase() === data.email.toLowerCase());
    if (existingIndex !== -1) {
      return profiles[existingIndex];
    }

    const isPreApproved = 
      data.email.toLowerCase() === 'daloyar.pro@gmail.com' || 
      data.email.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
      DEFAULT_APPROVED_USERS.some(u => u.email.toLowerCase() === data.email.toLowerCase());

    const newRecord: UserProfileRecord = {
      id: `usr-${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || '',
      dutyStation: data.dutyStation || 'Dhaka HQ',
      department: data.department || 'Operations & Projects',
      designation: data.designation || data.requestedRole,
      requestedRole: data.requestedRole || 'Program Officer',
      avatarUrl: data.avatarUrl || getOfficialAvatar({ fullName: data.fullName, requestedRole: data.requestedRole }),
      bio: data.bio || `Official ${data.requestedRole} profile awaiting onboarding review.`,
      status: isPreApproved ? 'APPROVED' : 'PENDING_APPROVAL',
      createdAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    };

    const updated = [newRecord, ...profiles];
    this.saveProfiles(updated);
    return newRecord;
  }

  public static async updateFullProfile(
    userId: string,
    updates: Partial<Omit<UserProfileRecord, 'id' | 'email' | 'createdAt'>>
  ): Promise<UserProfileRecord | null> {
    const profiles = this.getStoredProfiles();
    const index = profiles.findIndex((p) => p.id === userId || p.email.toLowerCase() === userId.toLowerCase());
    if (index === -1) return null;

    profiles[index] = {
      ...profiles[index],
      ...updates,
    };
    this.saveProfiles(profiles);
    return profiles[index];
  }

  public static async updateRequestedRole(
    userId: string, 
    requestedRole: UserProfileRecord['requestedRole'], 
    department: string
  ): Promise<UserProfileRecord | null> {
    const profiles = this.getStoredProfiles();
    const index = profiles.findIndex((p) => p.id === userId || p.email === userId);
    if (index === -1) return null;

    profiles[index].requestedRole = requestedRole;
    profiles[index].department = department;
    this.saveProfiles(profiles);
    return profiles[index];
  }

  public static async approveUser(userId: string, adminName: string): Promise<UserProfileRecord | null> {
    const profiles = this.getStoredProfiles();
    const index = profiles.findIndex((p) => p.id === userId || p.email === userId);
    if (index === -1) return null;

    profiles[index].status = 'APPROVED';
    profiles[index].approvedBy = adminName;
    profiles[index].approvedAt = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    this.saveProfiles(profiles);
    return profiles[index];
  }

  public static async rejectUser(userId: string, adminName: string): Promise<UserProfileRecord | null> {
    const profiles = this.getStoredProfiles();
    const index = profiles.findIndex((p) => p.id === userId || p.email === userId);
    if (index === -1) return null;

    profiles[index].status = 'REJECTED';
    profiles[index].approvedBy = adminName;
    profiles[index].approvedAt = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    this.saveProfiles(profiles);
    return profiles[index];
  }
}
