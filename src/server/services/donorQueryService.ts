export interface DonorQueryTicket {
  id: string;
  pid: string;
  donorName: string;
  donorEmail: string;
  queryType: 
    | 'Beneficiary Verification Query'
    | 'Underage Beneficiary Query' 
    | 'Budget Discrepancy' 
    | 'Receipt / Voucher Clarification'
    | 'Photo Request' 
    | 'Special Document Request'
    | 'Logframe Question' 
    | 'General Feedback'
    | 'General Project Inquiry';
  message: string;
  status: 'Pending Officer Review' | 'Officer Clarification Posted' | 'Resolved';
  assignedOfficerName: string;
  assignedOfficerEmail: string;
  createdAt: string;
  officerResponse?: {
    responderName: string;
    responderRole: string;
    responseText: string;
    attachmentName?: string;
    respondedAt: string;
  };
}

export const INITIAL_DONOR_QUERIES: DonorQueryTicket[] = [];

export function createDonorQuery(
  pid: string,
  donorName: string,
  donorEmail: string,
  queryType: DonorQueryTicket['queryType'],
  message: string,
  assignedOfficerName = 'Mizbah Uddin',
  assignedOfficerEmail = 'uddinmizbah902@gmail.com'
): DonorQueryTicket {
  return {
    id: `TICKET-2026-${Math.floor(100 + Math.random() * 900)}`,
    pid,
    donorName,
    donorEmail,
    queryType,
    message,
    status: 'Pending Officer Review',
    assignedOfficerName,
    assignedOfficerEmail,
    createdAt: new Date().toLocaleString(),
  };
}

export function respondToDonorQuery(
  ticket: DonorQueryTicket,
  responderName: string,
  responderRole: string,
  responseText: string,
  attachmentName?: string
): DonorQueryTicket {
  return {
    ...ticket,
    status: 'Officer Clarification Posted',
    officerResponse: {
      responderName,
      responderRole,
      responseText,
      attachmentName,
      respondedAt: new Date().toLocaleString(),
    },
  };
}

export class DonorQueryService {
  /**
   * Fetch all persistent donor tickets from Supabase database
   */
  static async fetchTickets(pid?: string): Promise<DonorQueryTicket[]> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/community/sync');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.donorTickets)) {
            const tickets = pid 
              ? json.donorTickets.filter((t: DonorQueryTicket) => t.pid === pid)
              : json.donorTickets;
            localStorage.setItem('skb_donor_query_tickets', JSON.stringify(json.donorTickets));
            return tickets;
          }
        }
      }
    } catch (e) {
      console.warn('API sync donor tickets fetch error:', e);
    }

    // LocalStorage fallback if offline
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('skb_donor_query_tickets');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return pid ? parsed.filter((t: DonorQueryTicket) => t.pid === pid) : parsed;
          }
        } catch {}
      }
    }

    return [];
  }

  /**
   * Save or update donor inquiry ticket in Supabase
   */
  static async saveTicket(ticket: DonorQueryTicket): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        // Optimistic local cache update
        const cached = localStorage.getItem('skb_donor_query_tickets');
        const list: DonorQueryTicket[] = cached ? JSON.parse(cached) : [];
        const updated = list.some(t => t.id === ticket.id)
          ? list.map(t => t.id === ticket.id ? ticket : t)
          : [ticket, ...list];
        localStorage.setItem('skb_donor_query_tickets', JSON.stringify(updated));

        // Persist to Supabase
        fetch('/api/community/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'DONOR_TICKET', payload: { ticket } }),
        }).catch((err) => console.warn('Background donor ticket sync error:', err));
      }
      return true;
    } catch (e) {
      console.warn('Error saving donor ticket:', e);
      return false;
    }
  }
}

