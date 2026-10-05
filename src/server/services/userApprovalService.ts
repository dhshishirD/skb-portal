export interface UserProfileRecord {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  requestedRole: 'Program Officer' | 'Field Operations Officer' | 'Finance Manager' | 'Executive Director' | 'IT & Admin Officer';
  department: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

const STORAGE_KEY = 'skb_user_approval_profiles';

const DEFAULT_APPROVED_USERS: UserProfileRecord[] = [
  {
    id: '10000000-0000-0000-0000-000000000002',
    fullName: 'Md. Abu Huraira',
    email: 'kindnessforbeauty@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    requestedRole: 'Executive Director',
    department: 'Directorate HQ',
    status: 'APPROVED',
    approvedBy: 'System Pre-Authorization',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
  },
  {
    id: '0a88393f-1283-42d2-b4c2-31c502b1d538',
    fullName: 'Daloyar Hassan',
    email: 'daloyar.pro@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    requestedRole: 'IT & Admin Officer',
    department: 'IT & Super Admin',
    status: 'APPROVED',
    approvedBy: 'System Pre-Authorization',
    approvedAt: '2026-01-01 00:00 AM',
    createdAt: '2026-01-01 00:00 AM',
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
      return JSON.parse(stored);
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
      googleUser.email.toLowerCase() === 'kindnessforbeauty@gmail.com';

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
