import { createClient } from '@/lib/supabase/client';

export interface BeneficiaryRecord {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  sex: string;
  birthYear: number;
  locationCode: string;
  projectId?: string;
  householdSize?: number;
  summary?: string;
  consentCaptured: boolean;
  registeredAt: string;
}

export const INITIAL_BENEFICIARIES: BeneficiaryRecord[] = [
  {
    id: 'BEN-001',
    fullName: 'Fatema Begum',
    nationalId: '1985269123456',
    phone: '01711223344',
    sex: 'female',
    birthYear: 1985,
    locationCode: 'UP-TEKNAF',
    projectId: 'PID 22567',
    householdSize: 6,
    summary: 'Guardian of orphan beneficiary #14 in Sylhet livestock distribution.',
    consentCaptured: true,
    registeredAt: '2026-09-21 02:30 PM',
  },
  {
    id: 'BEN-002',
    fullName: 'Abdul Karim',
    nationalId: '1990269987654',
    phone: '01819887766',
    sex: 'male',
    birthYear: 1990,
    locationCode: 'UP-UKHIYA',
    projectId: 'PID 22211',
    householdSize: 5,
    summary: 'Camp 11 emergency WASH kit recipient.',
    consentCaptured: true,
    registeredAt: '2026-09-28 11:15 AM',
  },
  {
    id: 'BEN-003',
    fullName: 'Rashida Khatun',
    nationalId: '1994269554433',
    phone: '01912345678',
    sex: 'female',
    birthYear: 1994,
    locationCode: 'UP-KURIGRAM',
    projectId: 'PID 23431',
    householdSize: 4,
    summary: 'Flood embankment afforestation worker.',
    consentCaptured: true,
    registeredAt: '2026-09-29 04:00 PM',
  },
];

const LOCAL_STORAGE_KEY = 'skb_portal_beneficiaries';

export class BeneficiaryService {
  private static getSupabaseClient() {
    try {
      return createClient();
    } catch {
      return null;
    }
  }

  /**
   * Get all registered beneficiaries with database + localStorage fallback
   */
  static async getBeneficiaries(): Promise<BeneficiaryRecord[]> {
    const supabase = this.getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return (data as any[]).map((b: any) => ({
            id: b.id,
            fullName: b.full_name || b.beneficiary_name,
            nationalId: b.national_id,
            phone: b.phone || '01700000000',
            sex: b.sex || 'female',
            birthYear: b.birth_year || 1990,
            locationCode: b.location_code || 'UP-FIELD',
            projectId: b.project_id,
            householdSize: b.household_size,
            summary: b.summary,
            consentCaptured: b.consent_captured ?? true,
            registeredAt: b.registered_at || new Date(b.created_at || Date.now()).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
          }));
        }
      } catch (e) {
        // Fallback to localStorage
      }
    }

    // LocalStorage / Pre-seeded Fallback
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // parse error fallback
        }
      }
    }

    return INITIAL_BENEFICIARIES;
  }

  /**
   * Save a new beneficiary (Database + LocalStorage fallback)
   */
  static async addBeneficiary(record: Omit<BeneficiaryRecord, 'id' | 'registeredAt'>): Promise<BeneficiaryRecord> {
    const newRecord: BeneficiaryRecord = {
      ...record,
      id: `BEN-${Math.floor(1000 + Math.random() * 9000)}`,
      registeredAt: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
    };

    // 1. Local state / localStorage update
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        let currentList: BeneficiaryRecord[] = INITIAL_BENEFICIARIES;
        if (stored) {
          try { currentList = JSON.parse(stored); } catch {}
        }
        const updatedList = [newRecord, ...currentList];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {
        console.error('Failed to save beneficiary locally:', e);
      }
    }

    // 2. Supabase DB Insert attempt
    const supabase = this.getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('beneficiaries').insert({
          id: newRecord.id,
          full_name: newRecord.fullName,
          national_id: newRecord.nationalId,
          phone: newRecord.phone,
          sex: newRecord.sex,
          birth_year: newRecord.birthYear,
          location_code: newRecord.locationCode,
          project_id: newRecord.projectId,
          household_size: newRecord.householdSize,
          summary: newRecord.summary,
          consent_captured: newRecord.consentCaptured,
        } as any);
      } catch (e) {
        console.error('Failed to sync beneficiary to Supabase:', e);
      }
    }

    return newRecord;
  }
}
