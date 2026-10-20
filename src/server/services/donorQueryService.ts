export interface DonorMessageItem {
  id: string;
  sender: 'donor' | 'officer';
  senderName: string;
  senderRole?: string;
  text: string;
  attachmentName?: string;
  createdAt: string;
}

export interface DonorQueryTicket {
  id: string;
  pid: string;
  donorName: string;
  donorEmail: string;
  queryType?: 
    | 'Beneficiary Verification Query'
    | 'Underage Beneficiary Query' 
    | 'Budget Discrepancy' 
    | 'Receipt / Voucher Clarification'
    | 'Photo Request' 
    | 'Special Document Request'
    | 'Logframe Question' 
    | 'General Feedback'
    | 'General Project Inquiry'
    | string;
  message: string;
  status: 'Pending Officer Review' | 'Officer Clarification Posted' | 'Resolved';
  assignedOfficerName: string;
  assignedOfficerEmail: string;
  createdAt: string;
  messages?: DonorMessageItem[];
  officerResponse?: {
    responderName: string;
    responderRole: string;
    responseText: string;
    attachmentName?: string;
    respondedAt: string;
  };
}

export const INITIAL_DONOR_QUERIES: DonorQueryTicket[] = [];

/**
 * Normalize and retrieve all messages from a ticket
 */
export function getTicketMessages(ticket: DonorQueryTicket): DonorMessageItem[] {
  if (Array.isArray(ticket.messages) && ticket.messages.length > 0) {
    return ticket.messages;
  }
  const initialList: DonorMessageItem[] = [];
  if (ticket.message) {
    initialList.push({
      id: `msg-${ticket.id}-1`,
      sender: 'donor',
      senderName: ticket.donorName || 'Donor Partner',
      text: ticket.message,
      createdAt: ticket.createdAt,
    });
  }
  if (ticket.officerResponse) {
    initialList.push({
      id: `msg-${ticket.id}-2`,
      sender: 'officer',
      senderName: ticket.officerResponse.responderName,
      senderRole: ticket.officerResponse.responderRole,
      text: ticket.officerResponse.responseText,
      attachmentName: ticket.officerResponse.attachmentName,
      createdAt: ticket.officerResponse.respondedAt,
    });
  }
  return initialList;
}

/**
 * Play a gentle, crisp audio notification chime for incoming messages
 */
export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // Ignore audio restrictions
  }
}

export function createDonorQuery(
  pid: string,
  donorName: string,
  donorEmail: string,
  queryType: DonorQueryTicket['queryType'],
  message: string,
  assignedOfficerName = 'Mizbah Uddin',
  assignedOfficerEmail = 'uddinmizbah902@gmail.com'
): DonorQueryTicket {
  const timeStr = new Date().toLocaleString();
  const initialMsg: DonorMessageItem = {
    id: `msg-${Date.now()}-1`,
    sender: 'donor',
    senderName: donorName,
    text: message,
    createdAt: timeStr,
  };

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
    createdAt: timeStr,
    messages: [initialMsg],
  };
}

export function addMessageToTicket(
  ticket: DonorQueryTicket,
  sender: 'donor' | 'officer',
  senderName: string,
  text: string,
  senderRole?: string,
  attachmentName?: string
): DonorQueryTicket {
  const currentMessages = getTicketMessages(ticket);
  const newMsg: DonorMessageItem = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sender,
    senderName,
    senderRole,
    text,
    attachmentName,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const updatedMessages = [...currentMessages, newMsg];

  if (sender === 'officer') {
    return {
      ...ticket,
      status: 'Officer Clarification Posted',
      messages: updatedMessages,
      officerResponse: {
        responderName: senderName,
        responderRole: senderRole || 'Program Officer',
        responseText: text,
        attachmentName,
        respondedAt: new Date().toLocaleString(),
      },
    };
  } else {
    return {
      ...ticket,
      status: 'Pending Officer Review',
      message: text,
      messages: updatedMessages,
    };
  }
}

export function respondToDonorQuery(
  ticket: DonorQueryTicket,
  responderName: string,
  responderRole: string,
  responseText: string,
  attachmentName?: string
): DonorQueryTicket {
  return addMessageToTicket(
    ticket,
    'officer',
    responderName,
    responseText,
    responderRole,
    attachmentName
  );
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

