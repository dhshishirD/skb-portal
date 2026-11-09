import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/supabase/env';

export interface CloudProjectRecord {
  id: string;
  code: string;
  title: string;
  description?: string;
  stage: string;
  partnerKey?: string;
  budgetAmount?: number;
  beneficiariesCount?: number;
  location?: string;
  assignedOfficer?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CloudDocumentRecord {
  id: string;
  projectId: string;
  name: string;
  category: 'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC';
  auditDomainTag?: string;
  fileSize: string;
  fileType?: string;
  fileDataUrl?: string;
  fileUrl?: string;
  status: 'Submitted' | 'Pending Officer Upload';
  specialReason?: string;
  uploadedBy: string;
  uploadedAt: string;
  publishedToDonorWorkspace?: boolean;
  publishedBy?: string;
  publishedAt?: string;
}

export const PROJECT_CODE_TO_UUID: Record<string, string> = {
  'BD-SKB-2026-COW-20': '30000000-0000-0000-0000-000000000011',
  'BD-SKB-2026-LIV-CLO': '30000000-0000-0000-0000-000000000012',
  'BD-SKB-2026-WFS-SDLP': '30000000-0000-0000-0000-000000000013',
  'BD-SKB-2026-UOL-WTR': '30000000-0000-0000-0000-000000000014',
  'BD-SKB-2026-MVM-REF': '30000000-0000-0000-0000-000000000015',
  'BD-SKB-2026-QWC-WLF': '30000000-0000-0000-0000-000000000016',
};

export function resolveProjectDbUuid(pid: string): string {
  if (pid && pid.length === 36 && pid.includes('-')) return pid;
  return PROJECT_CODE_TO_UUID[pid] || '30000000-0000-0000-0000-000000000011';
}

export class CloudSyncService {
  private static getClient(): any {
    try {
      // Always the signed-in user's client: Row Level Security decides what they may see.
      if (!hasSupabaseConfig()) return null;
      return createClient();
    } catch {
      return null;
    }
  }

  // ==========================================
  // 1. PROJECTS CLOUD SYNC
  // ==========================================

  public static async getLiveProjects(): Promise<CloudProjectRecord[]> {
    const supabase = this.getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((p: any) => ({
            id: p.id,
            code: p.code || 'BD-SKB-2026',
            title: p.title || 'Untitled Project',
            description: p.description || '',
            stage: p.stage || 'implementation',
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase projects fetch failed, fallback to local', err);
      }
    }
    return [];
  }

  // ==========================================
  // 2. DOCUMENTS CLOUD SYNC
  // ==========================================

  public static async getProjectDocuments(projectId: string): Promise<CloudDocumentRecord[]> {
    const supabase = this.getClient();
    const dbPid = resolveProjectDbUuid(projectId);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', dbPid)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            projectId: d.project_id,
            name: d.title || 'Document',
            category: (d.category as any) || 'MANDATORY_PRIMARY',
            fileSize: '1.5 MB',
            status: 'Submitted',
            uploadedBy: d.created_by || 'Officer Desk',
            uploadedAt: new Date(d.created_at || Date.now()).toLocaleDateString(),
          }));
        }
      } catch (err) {
        console.warn('Supabase documents fetch failed, using local vault', err);
      }
    }

    // Local fallback
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`skb_documents_${projectId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return [];
  }

  public static async saveProjectDocument(doc: CloudDocumentRecord): Promise<boolean> {
    // 1. Save to local storage for instant offline availability
    if (typeof window !== 'undefined') {
      try {
        const key = `skb_documents_${doc.projectId}`;
        const stored = localStorage.getItem(key);
        let list: CloudDocumentRecord[] = [];
        if (stored) {
          try { list = JSON.parse(stored); } catch {}
        }
        const filtered = list.filter(d => d.id !== doc.id);
        const updated = [doc, ...filtered];
        localStorage.setItem(key, JSON.stringify(updated));

        // Update global donor view cache
        const globalSaved = localStorage.getItem('skb_portal_all_documents');
        let globalList: CloudDocumentRecord[] = [];
        if (globalSaved) {
          try { globalList = JSON.parse(globalSaved); } catch {}
        }
        const otherDocs = globalList.filter(d => d.id !== doc.id);
        localStorage.setItem('skb_portal_all_documents', JSON.stringify([doc, ...otherDocs]));
      } catch (e) {
        console.error('Local doc save error', e);
      }
    }

    // 2. Save to Supabase Postgres
    const supabase = this.getClient();
    if (supabase) {
      try {
        const targetProjectId = resolveProjectDbUuid(doc.projectId);
        const docUuid = (doc.id && doc.id.includes('-') && doc.id.length === 36)
          ? doc.id
          : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `50000000-0000-0000-0000-${Date.now().toString().slice(-12)}`);

        const { error } = await supabase
          .from('documents')
          .upsert({
            id: docUuid,
            project_id: targetProjectId,
            title: doc.name,
            category: doc.category,
            updated_at: new Date().toISOString(),
          });
        if (error) {
          console.warn('Supabase doc upsert failed, stored in local cache', error);
        }
      } catch (err) {
        console.warn('Supabase doc upsert exception, stored in local cache', err);
      }
    }
    return true;
  }

  public static async getAllDocuments(): Promise<CloudDocumentRecord[]> {
    if (typeof window !== 'undefined') {
      const globalSaved = localStorage.getItem('skb_portal_all_documents');
      if (globalSaved) {
        try {
          return JSON.parse(globalSaved);
        } catch {}
      }
    }
    return [];
  }

  public static async togglePublicationToDonor(
    projectId: string, 
    docId: string, 
    publish: boolean, 
    signatoryName: string = 'Md. Abu Huraira (Executive Director)'
  ): Promise<boolean> {
    if (typeof window !== 'undefined') {
      const key = `skb_documents_${projectId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const list: CloudDocumentRecord[] = JSON.parse(stored);
          const updated = list.map(d => {
            if (d.id === docId) {
              return {
                ...d,
                publishedToDonorWorkspace: publish,
                publishedBy: publish ? signatoryName : undefined,
                publishedAt: publish ? new Date().toLocaleString() : undefined,
              };
            }
            return d;
          });
          localStorage.setItem(key, JSON.stringify(updated));

          // Also update global all documents
          const globalSaved = localStorage.getItem('skb_portal_all_documents');
          if (globalSaved) {
            const gList: CloudDocumentRecord[] = JSON.parse(globalSaved);
            const gUpdated = gList.map(d => d.id === docId ? {
              ...d,
              publishedToDonorWorkspace: publish,
              publishedBy: publish ? signatoryName : undefined,
              publishedAt: publish ? new Date().toLocaleString() : undefined,
            } : d);
            localStorage.setItem('skb_portal_all_documents', JSON.stringify(gUpdated));
          }
        } catch (e) {
          console.error('Publication toggle error:', e);
        }
      }
    }

    this.broadcastLiveEvent(publish ? 'document-published' : 'document-unpublished', {
      projectId,
      docId,
      publishedToDonorWorkspace: publish,
      signatoryName,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  // ==========================================
  // 4. REALTIME LIVE SUBSCRIPTIONS & BROADCASTS
  // ==========================================

  /**
   * Subscribe to live document uploads & changes across projects
   */
  public static subscribeToDocuments(callback: (event: { type: string; doc: any }) => void) {
    const supabase = this.getClient();
    if (!supabase) return { unsubscribe: () => {} };

    try {
      const channel = supabase
        .channel('realtime:skb_documents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload: any) => {
          callback({ type: payload.eventType || 'UPDATE', doc: payload.new || payload.old });
        })
        .on('broadcast', { event: 'document-uploaded' }, (payload: any) => {
          callback({ type: 'BROADCAST_UPLOAD', doc: payload.payload });
        })
        .on('broadcast', { event: 'document-published' }, (payload: any) => {
          callback({ type: 'BROADCAST_PUBLISHED', doc: payload.payload });
        })
        .on('broadcast', { event: 'document-unpublished' }, (payload: any) => {
          callback({ type: 'BROADCAST_UNPUBLISHED', doc: payload.payload });
        })
        .subscribe();

      return {
        unsubscribe: () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        },
      };
    } catch (e) {
      console.warn('Realtime subscription failed:', e);
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Subscribe to live project milestone and stage transitions
   */
  public static subscribeToProjects(callback: (event: { type: string; project: any }) => void) {
    const supabase = this.getClient();
    if (!supabase) return { unsubscribe: () => {} };

    try {
      const channel = supabase
        .channel('realtime:skb_projects')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
          callback({ type: payload.eventType || 'UPDATE', project: payload.new || payload.old });
        })
        .on('broadcast', { event: 'project-stage-updated' }, (payload: any) => {
          callback({ type: 'BROADCAST_STAGE', project: payload.payload });
        })
        .subscribe();

      return {
        unsubscribe: () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        },
      };
    } catch (e) {
      console.warn('Realtime projects subscription failed:', e);
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Broadcast an instant live event cross-browser/cross-tab to all connected donor & staff sessions
   */
  public static broadcastLiveEvent(
    eventName: 'document-uploaded' | 'project-stage-updated' | 'dossier-approved' | 'document-published' | 'document-unpublished', 
    payload: any
  ) {
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      const channelName = eventName === 'project-stage-updated' ? 'realtime:skb_projects' : 'realtime:skb_documents';
      const channel = supabase.channel(channelName);
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: eventName,
            payload,
          });
        }
      });
    } catch (e) {
      console.warn('Realtime broadcast failed:', e);
    }
  }
}
