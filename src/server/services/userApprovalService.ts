export type SystemRole = 
  | 'Executive Director'
  | 'Program Officer'
  | 'Field Operations Officer'
  | 'Finance Manager'
  | 'IT & Admin Officer'
  | 'Medical / Health Officer'
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

export const DEFAULT_APPROVED_USERS: UserProfileRecord[] = [
  {
    id: '10000000-0000-0000-0000-000000000002',
    fullName: 'Md. Abu Huraira',
    email: 'kindnessforbeauty@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '+880 1711-000001',
    dutyStation: 'Dhaka HQ',
    designation: 'Executive Director & General Secretariat',
    employeeId: 'SKB-DIR-001',
    requestedRole: 'Executive Director',
    department: 'Directorate General HQ',
    status: 'APPROVED',
    approvedBy: 'Founding Charter',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'General Executive Director overseeing strategic governance, donor liaisons, and humanitarian missions across Bangladesh.',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    fullName: 'Dr. Orakatul Jannat',
    email: 'dr.orakatul@skb.org.bd',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    phone: '+880 1711-000002',
    dutyStation: 'Cox\'s Bazar & Dhaka HQ',
    designation: 'Medical Lead & Health Programs Consultant',
    employeeId: 'SKB-MED-002',
    requestedRole: 'Medical / Health Officer',
    department: 'Health, Nutrition & Emergency Relief',
    status: 'APPROVED',
    approvedBy: 'Directorate General',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Lead Medical Consultant managing community health outreach, nutrition initiatives, and clinical relief missions.',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    fullName: 'Safwanur Rahman',
    email: 'safwanur.rahman@skb.org.bd',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '+880 1711-000003',
    dutyStation: 'Dhaka HQ',
    designation: 'Senior Program & Operations Coordinator',
    employeeId: 'SKB-PRG-003',
    requestedRole: 'Program Officer',
    department: 'Programs & International Donors Desk',
    status: 'APPROVED',
    approvedBy: 'Directorate General',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Senior Program Coordinator supervising Form-3 proposals, donor compliance, and project logframe execution.',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    fullName: 'Mizbah Uddin',
    email: 'mizbah.uddin@skb.org.bd',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    phone: '+880 1711-000004',
    dutyStation: 'Cox\'s Bazar Field Hub',
    designation: 'Field Operations & Logistics Lead',
    employeeId: 'SKB-FLD-004',
    requestedRole: 'Field Operations Officer',
    department: 'Field Logistics & Emergency Response',
    status: 'APPROVED',
    approvedBy: 'Directorate General',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Lead Field Operations Officer coordinating on-ground distribution, Teknaf warehouse logistics, and beneficiary verification.',
  },
  {
    id: '0a88393f-1283-42d2-b4c2-31c502b1d538',
    fullName: 'Daloyar Hassan',
    email: 'daloyar.pro@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    phone: '+880 1711-000005',
    dutyStation: 'Dhaka HQ',
    designation: 'Lead IT & Systems Administrator',
    employeeId: 'SKB-ADM-005',
    requestedRole: 'IT & Admin Officer',
    department: 'IT & Super Admin',
    status: 'APPROVED',
    approvedBy: 'System Pre-Authorization',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Systems Architect overseeing portal security, cloud infrastructure, Supabase integrations, and RBAC governance.',
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    fullName: 'Muktadir Rahaman',
    email: 'muktadir.rahaman@skb.org.bd',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+880 1711-000006',
    dutyStation: 'Dhaka HQ',
    designation: 'Finance & Compliance Specialist',
    employeeId: 'SKB-FIN-006',
    requestedRole: 'Finance Manager',
    department: 'Finance, Grants & Audits',
    status: 'APPROVED',
    approvedBy: 'Directorate General',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
    bio: 'Finance Specialist handling multi-currency disbursement, bank reconciliations, Form-8/9 financial reports, and grant audits.',
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
      const parsed: UserProfileRecord[] = JSON.parse(stored);
      // Ensure all 6 core team members are present even if localStorage was initialized with older data
      const existingEmails = new Set(parsed.map(p => p.email.toLowerCase()));
      let hasMissing = false;
      const merged = [...parsed];
      for (const defUser of DEFAULT_APPROVED_USERS) {
        if (!existingEmails.has(defUser.email.toLowerCase())) {
          merged.push(defUser);
          hasMissing = true;
        }
      }
      if (hasMissing) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
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
      avatarUrl: googleUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      requestedRole: googleUser.requestedRole || 'Program Officer',
      department: 'Operations & Projects',
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
