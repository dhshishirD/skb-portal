export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole =
  | 'super_admin'
  | 'executive'
  | 'programme_manager'
  | 'project_officer'
  | 'field_officer'
  | 'finance'
  | 'procurement'
  | 'me_officer'
  | 'donor'
  | 'partner'
  | 'auditor'

export type OrgType = 'internal' | 'donor' | 'implementing_partner'
export type ProjectStage = 'concept' | 'proposal' | 'approved' | 'implementation' | 'monitoring_evaluation' | 'closed'
export type GrantStatus = 'draft' | 'active' | 'closed'
export type LocationLevel = 'division' | 'district' | 'upazila' | 'union' | 'village'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          type: OrgType
          country: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: OrgType
          country?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: OrgType
          country?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string | null
          full_name: string
          phone: string | null
          language: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id?: string | null
          full_name?: string
          phone?: string | null
          language?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          full_name?: string
          phone?: string | null
          language?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: AppRole
          granted_by: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          role: AppRole
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: AppRole
          granted_by?: string | null
          created_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          parent_id: string | null
          level: LocationLevel
          name_en: string
          name_bn: string | null
          code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          level: LocationLevel
          name_en: string
          name_bn?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          level?: LocationLevel
          name_en?: string
          name_bn?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grants: {
        Row: {
          id: string
          code: string
          title: string
          donor_org_id: string
          currency: string
          total_amount: number
          start_date: string | null
          end_date: string | null
          status: GrantStatus
          created_at: string
          created_by: string | null
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          code: string
          title: string
          donor_org_id: string
          currency?: string
          total_amount: number
          start_date?: string | null
          end_date?: string | null
          status?: GrantStatus
          created_at?: string
          created_by?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          title?: string
          donor_org_id?: string
          currency?: string
          total_amount?: number
          start_date?: string | null
          end_date?: string | null
          status?: GrantStatus
          created_at?: string
          created_by?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          code: string
          title: string
          description: string | null
          grant_id: string | null
          stage: ProjectStage
          manager_id: string | null
          start_date: string | null
          end_date: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          code: string
          title: string
          description?: string | null
          grant_id?: string | null
          stage?: ProjectStage
          manager_id?: string | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string | null
          grant_id?: string | null
          stage?: ProjectStage
          manager_id?: string | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
      }
      user_project_access: {
        Row: {
          user_id: string
          project_id: string
          granted_by: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          user_id: string
          project_id: string
          granted_by?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          user_id?: string
          project_id?: string
          granted_by?: string | null
          created_at?: string
          expires_at?: string | null
        }
      }
      user_location_access: {
        Row: {
          user_id: string
          location_id: string
          granted_by: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          user_id: string
          location_id: string
          granted_by?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          user_id?: string
          location_id?: string
          granted_by?: string | null
          created_at?: string
          expires_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: number
          occurred_at: string
          actor_id: string | null
          table_name: string
          record_id: string | null
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
        }
        Insert: {
          id?: never
          occurred_at?: string
          actor_id?: string | null
          table_name: string
          record_id?: string | null
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
        }
        Update: {
          id?: never
          occurred_at?: string
          actor_id?: string | null
          table_name?: string
          record_id?: string | null
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
        }
      }
    }
  }
}
