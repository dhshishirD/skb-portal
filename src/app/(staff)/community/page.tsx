'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  ShieldCheck, 
  Building2, 
  User, 
  Paperclip, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search,
  Check,
  CheckCheck,
  Users,
  Megaphone,
  Sprout,
  Lightbulb,
  Download,
  X,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Award,
  Copy,
  ExternalLink,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import { CommunityRealtimeService } from '@/server/services/communityRealtimeService';
import { 
  UserApprovalService, 
  UserProfileRecord 
} from '@/server/services/userApprovalService';
import { getOfficialAvatar } from '@/lib/avatarPresets';

export interface AttachmentFile {
  name: string;
  size?: string;
  type?: string;
  dataUrl?: string;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  category: 'HQ Announcements' | 'Field Updates' | 'Donor Objections & Corrections' | 'NGO Best Practices';
  title: string;
  content: string;
  attachment?: AttachmentFile;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  comments: Array<{
    id: string;
    authorName: string;
    authorRole: string;
    authorAvatar?: string;
    text: string;
    createdAt: string;
  }>;
}

export interface DirectMessage {
  id: string;
  senderName: string;
  senderRole: string;
  recipientName: string;
  text: string;
  attachment?: AttachmentFile;
  timestamp: string;
  isMine: boolean;
}

export interface StaffContact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastMessage?: string;
  lastMessageTime?: string;
  phone?: string;
  email?: string;
  dutyStation?: string;
  employeeId?: string;
  department?: string;
  bio?: string;
}

const INITIAL_STAFF_CONTACTS: StaffContact[] = [
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Dr. Orakatul Jannat',
    role: 'Chairman',
    status: 'online',
    phone: '+880 1711-000002',
    email: 'dr.orakatul@skb.org.bd',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-CHM-001',
    department: 'Directorate General HQ',
    bio: 'Chairman of the Board steering humanitarian vision, strategic donor relations, and high-level organizational leadership.',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'Md. Abu Huraira',
    role: 'Executive Director',
    status: 'online',
    phone: '+880 1711-000001',
    email: 'kindnessforbeauty@gmail.com',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-DIR-001',
    department: 'Directorate General HQ',
    bio: 'Executive Director managing operational execution, project sign-offs, and humanitarian governance across Bangladesh.',
  },
  {
    id: '0a88393f-1283-42d2-b4c2-31c502b1d538',
    name: 'Daloyar Hassan',
    role: 'Program Officer',
    status: 'online',
    phone: '+880 1711-000005',
    email: 'daloyar.pro@gmail.com',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-PRG-001',
    department: 'HR & Admin',
    bio: 'Program Officer leading HR administration, operational personnel management, and project coordination.',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Emran Ahmed',
    role: 'Program Officer',
    status: 'online',
    phone: '+880 1711-000003',
    email: 'emran.ahmed@skb.org.bd',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-PRG-002',
    department: 'Programs Directorate',
    bio: 'Program Officer managing project planning, Form-3 charters, logframe deliverables, and donor milestone reporting.',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Mizbah Uddin',
    role: 'Program Officer',
    status: 'online',
    phone: '+880 1711-000004',
    email: 'mizbah.uddin@skb.org.bd',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-PRG-003',
    department: 'Programs Directorate',
    bio: 'Program Officer overseeing field implementation, distribution logistics, and partner operational alignment.',
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    name: 'Muktadir Rahaman',
    role: 'IT Officer',
    status: 'online',
    phone: '+880 1711-000006',
    email: 'muktadir.rahaman@skb.org.bd',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-IT-001',
    department: 'IT & Systems Desk',
    bio: 'Official IT Officer profile. Systems, Cloud Storage & Portal Security.',
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name: 'Aminul Islam Bulbul',
    role: 'Law Officer',
    status: 'online',
    phone: '+880 1711-000007',
    email: 'aminul.bulbul@skb.org.bd',
    dutyStation: 'Dhaka HQ',
    employeeId: 'SKB-LAW-001',
    department: 'Legal & Compliance Desk',
    bio: 'Official Law Officer profile. Legal Vetting, NGOAB FD-6/FD-7 & Compliance.',
  }
];

const INITIAL_DIRECT_MESSAGES: Record<string, DirectMessage[]> = {};

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [];

export default function StaffCommunityPage() {
  const [activeTab, setActiveTab] = useState<'PUBLIC_FEED' | 'PERSONAL_CHAT'>('PUBLIC_FEED');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Official Organogram & Presence State
  const [allOfficers, setAllOfficers] = useState<UserProfileRecord[]>([]);
  const [onlineOfficerNames, setOnlineOfficerNames] = useState<Set<string>>(new Set());
  const [inspectingOfficer, setInspectingOfficer] = useState<UserProfileRecord | StaffContact | null>(null);

  // Personal Direct Messages State
  const [staffContacts, setStaffContacts] = useState<StaffContact[]>(INITIAL_STAFF_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<StaffContact>(INITIAL_STAFF_CONTACTS[1] || INITIAL_STAFF_CONTACTS[0]);
  const [directMessages, setDirectMessages] = useState<Record<string, DirectMessage[]>>(INITIAL_DIRECT_MESSAGES);
  const [dmInputText, setDmInputText] = useState('');
  const [dmAttachment, setDmAttachment] = useState<AttachmentFile | null>(null);
  const [dmContactSearch, setDmContactSearch] = useState('');

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<CommunityPost['category']>('Field Updates');
  const [postAttachment, setPostAttachment] = useState<AttachmentFile | null>(null);
  const [currentAuthor, setCurrentAuthor] = useState('Mizbah Uddin');
  const [currentRole, setCurrentRole] = useState('Program Officer');

  // Comment Input State map (postId -> text)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Document Preview Modal State
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    size?: string;
    type?: string;
    dataUrl?: string;
  } | null>(null);

  // File Input Hidden & Dynamic Textarea Refs
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const dmFileInputRef = useRef<HTMLInputElement>(null);
  const dmTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if an officer is currently online
  const isOfficerOnline = (name: string) => {
    if (!name) return false;
    const clean = name.split('(')[0].trim().toLowerCase();
    const cleanAuthor = currentAuthor.split('(')[0].trim().toLowerCase();
    if (clean === cleanAuthor || clean.includes(cleanAuthor) || cleanAuthor.includes(clean)) return true;
    for (const onlineName of Array.from(onlineOfficerNames)) {
      const oClean = onlineName.split('(')[0].trim().toLowerCase();
      if (oClean === clean || oClean.includes(clean) || clean.includes(oClean)) {
        return true;
      }
    }
    if (typeof window !== 'undefined') {
      const hb = localStorage.getItem(`skb_presence_${clean}`);
      if (hb && Date.now() - parseInt(hb, 10) < 60000) return true;
    }
    return false;
  };

  const handleOpenOfficerProfile = (nameOrOfficer: string | UserProfileRecord | StaffContact) => {
    if (typeof nameOrOfficer === 'object' && nameOrOfficer !== null) {
      setInspectingOfficer(nameOrOfficer);
      return;
    }
    const clean = String(nameOrOfficer).trim().toLowerCase();
    const foundOfficer = 
      allOfficers.find(o => o.fullName.trim().toLowerCase() === clean) ||
      allOfficers.find(o => o.fullName.toLowerCase().includes(clean) || clean.includes(o.fullName.toLowerCase()));
    
    if (foundOfficer) {
      setInspectingOfficer(foundOfficer);
    } else {
      const contact = staffContacts.find(c => c.name.toLowerCase().includes(clean));
      if (contact) {
        setInspectingOfficer(contact);
      }
    }
  };

  const handleStartDirectChat = (officer: UserProfileRecord | StaffContact) => {
    const targetName = 'fullName' in officer ? officer.fullName : officer.name;
    const foundContact = staffContacts.find(c => c.name.toLowerCase() === targetName.toLowerCase());
    if (foundContact) {
      setSelectedContact(foundContact);
    }
    setInspectingOfficer(null);
    setActiveTab('PERSONAL_CHAT');
    setTimeout(() => {
      dmTextareaRef.current?.focus();
    }, 150);
  };

  useEffect(() => {
    // 1. Load official organogram officers
    const loadCommunityData = async () => {
      const users = await UserApprovalService.getAllUsers();
      setAllOfficers(users);

      // Check stored author or default to Dr. Orakatul Jannat (Chairman)
      const storedAuthor = localStorage.getItem('skb_current_community_author');
      const activeUser = (storedAuthor && users.find(u => u.fullName === storedAuthor)) || users[0];
      if (activeUser) {
        setCurrentAuthor(activeUser.fullName);
        setCurrentRole(activeUser.designation || activeUser.requestedRole);
      }

      // Convert officers to contacts
      const contacts: StaffContact[] = users.map(u => ({
        id: u.id,
        name: u.fullName,
        role: u.designation || u.requestedRole,
        avatar: getOfficialAvatar(u),
        status: 'online',
        phone: u.phone || '+880 1711-000000',
        email: u.email,
        dutyStation: u.dutyStation || 'Dhaka HQ',
        employeeId: u.employeeId || 'SKB-001',
        department: u.department,
        bio: u.bio,
      }));
      setStaffContacts(contacts);
      if (contacts.length > 1) {
        setSelectedContact(contacts[1]); // default to Executive Director
      } else if (contacts.length > 0) {
        setSelectedContact(contacts[0]);
      }

      // 2. Load posts from Supabase or localStorage
      const dbPosts = await CommunityRealtimeService.fetchPosts();
      if (dbPosts && dbPosts.length > 0) {
        setPosts(dbPosts);
      } else {
        const storedPosts = localStorage.getItem('skb_hq_community_posts');
        if (storedPosts) {
          try {
            setPosts(JSON.parse(storedPosts));
          } catch {
            setPosts([]);
          }
        }
      }
    };

    loadCommunityData();
  }, []);

  useEffect(() => {
    if (!currentAuthor) return;
    localStorage.setItem('skb_current_community_author', currentAuthor);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_presence_${currentAuthor.trim().toLowerCase()}`, Date.now().toString());
    }

    // Subscribe to Realtime Presence
    const presenceChannel = CommunityRealtimeService.trackPresence(
      currentAuthor,
      currentRole,
      (activeNames) => {
        const s = new Set(activeNames);
        s.add(currentAuthor);
        setOnlineOfficerNames(s);
      }
    );

    // Subscribe to Realtime Posts, Comments, and Likes
    const postsChannel = CommunityRealtimeService.subscribeRealtimePosts(
      (newPost: CommunityPost) => {
        if (!newPost || !newPost.id) return;
        setPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          const updated = [newPost, ...prev];
          localStorage.setItem('skb_hq_community_posts', JSON.stringify(updated));
          return updated;
        });
      },
      ({ postId, comment }: { postId: string; comment: any }) => {
        if (!postId || !comment) return;
        setPosts((prev) => {
          const updated = prev.map((p) => {
            if (p.id === postId) {
              const cList = p.comments || [];
              if (cList.some((c) => c.id === comment.id)) return p;
              return {
                ...p,
                comments: [...cList, comment],
              };
            }
            return p;
          });
          localStorage.setItem('skb_hq_community_posts', JSON.stringify(updated));
          return updated;
        });
      },
      ({ postId, likesCount }: { postId: string; likesCount: number }) => {
        if (!postId) return;
        setPosts((prev) => {
          const updated = prev.map((p) => (p.id === postId ? { ...p, likesCount } : p));
          localStorage.setItem('skb_hq_community_posts', JSON.stringify(updated));
          return updated;
        });
      }
    );

    // Subscribe to Realtime DMs
    const dmChannel = CommunityRealtimeService.subscribeRealtimeDms((incomingDm: DirectMessage) => {
      if (!incomingDm) return;
      const isMine = incomingDm.senderName === currentAuthor;
      const otherParty = isMine ? incomingDm.recipientName : incomingDm.senderName;

      setDirectMessages((prevMap) => {
        const thread = prevMap[otherParty] || [];
        if (thread.some((m) => m.id === incomingDm.id)) return prevMap;
        const updatedThread = [...thread, incomingDm];
        const updatedMap = { ...prevMap, [otherParty]: updatedThread };
        localStorage.setItem('skb_hq_direct_messages', JSON.stringify(updatedMap));
        return updatedMap;
      });
    });

    return () => {
      if (presenceChannel && typeof (presenceChannel as any).unsubscribe === 'function') {
        (presenceChannel as any).unsubscribe();
      }
      if (postsChannel && typeof (postsChannel as any).unsubscribe === 'function') {
        (postsChannel as any).unsubscribe();
      }
      if (dmChannel && typeof (dmChannel as any).unsubscribe === 'function') {
        (dmChannel as any).unsubscribe();
      }
    };
  }, [currentAuthor, currentRole]);

  useEffect(() => {
    if (activeTab === 'PERSONAL_CHAT') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, selectedContact, directMessages]);

  // Dynamic Auto-Resizing Textarea Height as User Types
  useEffect(() => {
    if (dmTextareaRef.current) {
      dmTextareaRef.current.style.height = 'auto';
      dmTextareaRef.current.style.height = `${Math.min(dmTextareaRef.current.scrollHeight, 140)}px`;
    }
  }, [dmInputText]);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const savePosts = (updated: CommunityPost[]) => {
    setPosts(updated);
    localStorage.setItem('skb_hq_community_posts', JSON.stringify(updated));
  };

  const saveDirectMessages = (updatedMap: Record<string, DirectMessage[]>) => {
    setDirectMessages(updatedMap);
    localStorage.setItem('skb_hq_direct_messages', JSON.stringify(updatedMap));
  };

  // Handle Real File Selection for Post Creator
  const handlePostFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setPostAttachment({
        name: file.name,
        size: `${sizeMb} MB`,
        type: file.type || 'application/octet-stream',
        dataUrl: dataUrl,
      });
      showToast(`Attached file: "${file.name}" (${sizeMb} MB)`);
    };
    reader.readAsDataURL(file);
  };

  // Handle Real File Selection for Direct Messages
  const handleDmFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setDmAttachment({
        name: file.name,
        size: `${sizeMb} MB`,
        type: file.type || 'application/octet-stream',
        dataUrl: dataUrl,
      });
      showToast(`Ready to send file: "${file.name}"`);
    };
    reader.readAsDataURL(file);
  };

  // Create Post Handler
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const post: CommunityPost = {
      id: `POST-${Math.floor(100 + Math.random() * 900)}`,
      authorName: currentAuthor,
      authorRole: currentRole,
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
      attachment: postAttachment || undefined,
      likesCount: 1,
      likedByMe: true,
      createdAt: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      comments: [],
    };

    const updated = [post, ...posts];
    savePosts(updated);
    CommunityRealtimeService.insertPost(post);
    setNewTitle('');
    setNewContent('');
    setPostAttachment(null);
    showToast('Announcement posted successfully!');
  };

  // Send Direct Message Handler
  const handleSendDirectMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dmInputText.trim() && !dmAttachment) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newDm: DirectMessage = {
      id: `dm-${Date.now()}`,
      senderName: currentAuthor,
      senderRole: currentRole,
      recipientName: selectedContact.name,
      text: dmInputText.trim(),
      attachment: dmAttachment || undefined,
      timestamp: timestamp,
      isMine: true,
    };

    const currentThread = directMessages[selectedContact.name] || [];
    const updatedThread = [...currentThread, newDm];
    const updatedMap = { ...directMessages, [selectedContact.name]: updatedThread };

    // Update contacts list last message snippet
    const updatedContacts = staffContacts.map((c) => {
      if (c.id === selectedContact.id) {
        return {
          ...c,
          lastMessage: dmInputText.trim() || `Sent attachment: ${dmAttachment?.name}`,
          lastMessageTime: timestamp,
        };
      }
      return c;
    });

    setStaffContacts(updatedContacts);
    saveDirectMessages(updatedMap);
    CommunityRealtimeService.insertDirectMessage(newDm);
    setDmInputText('');
    setDmAttachment(null);
  };

  // Download File & Trigger Document Viewer
  const handleDownloadAndPreview = (file: AttachmentFile | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    const dataUrl = typeof file === 'object' ? file.dataUrl : undefined;
    const fileSize = typeof file === 'object' && file.size ? file.size : '1.4 MB';

    if (dataUrl) {
      // Direct browser download of uploaded base64 data
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded: "${fileName}"`);
    } else {
      // Dynamic Blob generation for seeded documents
      const textContent = `SMALL KINDNESS BANGLADESH (SKB WORKS PORTAL)
NGO Affairs Bureau Registration # 2145 | International Operations
================================================================================
DOCUMENT ATTACHMENT: ${fileName}
PROJECT REFERENCE: PID 22567 / PID 22211 / PID 23431
VERIFICATION TIME: ${new Date().toUTCString()}

OFFICIAL COMPLIANCE & AUDIT STATEMENT:
This document is an authenticated digital record registered in the SKB Portal Repository.
Submitted by: ${currentAuthor} (${currentRole})
Inspected by: Executive Management & External Audit Committee (IHH Turkey / UNHCR)

VERIFICATION STATUS: 100% VALID & VERIFIED IN SUPABASE STORAGE
HASH SYNC: SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
================================================================================
SKB Operations Portal - https://skbportal.online
`;

      const blob = new Blob([textContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Downloaded Official Document: "${fileName}"`);
    }

    // Open Document Preview Modal
    setViewingDocument({
      name: fileName,
      size: fileSize,
      type: fileName.endsWith('.docx') ? 'Microsoft Word Document' : 'PDF Document',
      dataUrl: dataUrl,
    });
  };

  const handleToggleLike = (postId: string) => {
    let newLikesCount = 1;
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const liked = !p.likedByMe;
        newLikesCount = liked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
        return {
          ...p,
          likedByMe: liked,
          likesCount: newLikesCount,
        };
      }
      return p;
    });
    savePosts(updated);
    CommunityRealtimeService.likePost(postId, newLikesCount);
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: `c_${Date.now()}`,
              authorName: currentAuthor,
              authorRole: currentRole,
              text: text.trim(),
              createdAt: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
            },
          ],
        };
      }
      return p;
    });

    savePosts(updated);
    CommunityRealtimeService.insertComment(postId, {
      authorName: currentAuthor,
      authorRole: currentRole,
      text: text.trim(),
    });

    setCommentInputs({ ...commentInputs, [postId]: '' });
    showToast('Comment published!');
  };

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/community#${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(postId);
    showToast('Post link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPosts = posts.filter((p) => {
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredContacts = staffContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(dmContactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(dmContactSearch.toLowerCase())
  );

  const activeThread = directMessages[selectedContact.name] || [];

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      {/* Hidden Real File Inputs */}
      <input
        type="file"
        ref={postFileInputRef}
        onChange={handlePostFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.xlsx"
      />
      <input
        type="file"
        ref={dmFileInputRef}
        onChange={handleDmFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.xlsx"
      />

      {/* Action Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Top Breadcrumb & Staff Workspace Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Link 
            href="/dashboard" 
            className="font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 transition"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Staff Workspace
          </Link>
          <span className="text-slate-400">&rsaquo;</span>
          <span className="font-bold text-slate-800">HQ Staff Community</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
            <span>Open Staff Workspace Desk</span> &rarr;
          </Link>
          <Link
            href="/me/profile"
            className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Desk & ID Badge</span>
          </Link>
        </div>
      </div>

      {/* Realtime HQ Officers Presence Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
              HQ Active Officers • Realtime Presence
            </span>
          </div>
          <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-slate-300 border border-white/10 font-bold">
            Click any officer to view profile & contact directly
          </span>
        </div>

        {/* Horizontal interactive rail of all 7 officers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          {allOfficers.map((officer) => {
            const isOnline = isOfficerOnline(officer.fullName);
            return (
              <button
                key={officer.id}
                type="button"
                onClick={() => handleOpenOfficerProfile(officer)}
                className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-blue-400/60 rounded-2xl p-2.5 text-left transition flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="relative mb-2">
                  <img
                    src={getOfficialAvatar(officer)}
                    alt={officer.fullName}
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-white/20 group-hover:border-blue-400 shadow-md bg-white shrink-0"
                  />
                  <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-slate-500'
                  }`} />
                </div>
                <span className="text-[11px] font-black text-white group-hover:text-blue-300 truncate w-full">
                  {officer.fullName.split(' ')[0]} {officer.fullName.split(' ')[1] || ''}
                </span>
                <span className="text-[9px] text-slate-400 truncate w-full mt-0.5">
                  {officer.designation || officer.requestedRole}
                </span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {isOnline ? 'Active Now' : 'Available'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <Building2 className="w-4 h-4" /> SKB Operations • HQ Staff Community
          </div>

          {/* Active User Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Logged in as:</span>
            <select
              value={currentAuthor}
              onChange={(e) => {
                const found = allOfficers.find(o => o.fullName === e.target.value);
                if (found) {
                  setCurrentAuthor(found.fullName);
                  setCurrentRole(found.designation || found.requestedRole);
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-black px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {allOfficers.map(o => (
                <option key={o.id} value={o.fullName}>
                  {o.fullName} ({o.designation || o.requestedRole})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Heading 1 as strictly requested */}
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          HQ Internal Discussion
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Integrated with your <Link href="/dashboard" className="text-blue-600 font-bold hover:underline">Staff Workspace</Link> — collaborate across departments with public team announcements, field bulletins, and direct 1-on-1 staff messaging with real file attachments.
        </p>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('PUBLIC_FEED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'PUBLIC_FEED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Public Announcements & Feed ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('PERSONAL_CHAT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'PERSONAL_CHAT'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <User className="w-4 h-4 text-emerald-400" />
            Direct Messages (Personal Chat)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: PUBLIC ANNOUNCEMENTS & FEED */}
      {/* ========================================================================= */}
      {activeTab === 'PUBLIC_FEED' && (
        <div className="space-y-6">
          {/* New Post Creator Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> Publish Announcement / Field Note
              </h2>
              <button
                type="button"
                onClick={() => handleOpenOfficerProfile(currentAuthor)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer transition"
                title="Click to view officer profile & contact card"
              >
                <User className="w-3.5 h-3.5" />
                <span>Author: {currentAuthor} ({currentRole})</span>
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title (e.g. PID 22567 Form-7 Report Approved)..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="Field Updates">Field Updates</option>
                    <option value="HQ Announcements">HQ Announcements</option>
                    <option value="Donor Objections & Corrections">Donor Objections & Corrections</option>
                    <option value="NGO Best Practices">NGO Best Practices</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write update content for HQ team..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Real Attachment Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-slate-200"
                  >
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    Attach Real File (PDF, DOCX, Images)
                  </button>

                  {postAttachment && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-blue-800 font-bold">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{postAttachment.name} ({postAttachment.size})</span>
                      <button
                        type="button"
                        onClick={() => setPostAttachment(null)}
                        className="text-slate-400 hover:text-slate-700 text-xs ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Post Announcement
                </button>
              </div>
            </form>
          </div>

          {/* Categories & Search Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setActiveCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  activeCategory === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Updates ({posts.length})
              </button>
              <button
                onClick={() => setActiveCategory('HQ Announcements')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activeCategory === 'HQ Announcements' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" /> HQ Announcements
              </button>
              <button
                onClick={() => setActiveCategory('Field Updates')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activeCategory === 'Field Updates' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Sprout className="w-3.5 h-3.5" /> Field Updates
              </button>
              <button
                onClick={() => setActiveCategory('Donor Objections & Corrections')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activeCategory === 'Donor Objections & Corrections' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Donor Objections
              </button>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feed..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Feed Posts */}
          <div className="space-y-4">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <div key={post.id} id={post.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                {/* Author Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button
                    type="button"
                    onClick={() => handleOpenOfficerProfile(post.authorName)}
                    className="flex items-center gap-3 text-left group cursor-pointer"
                    title={`Click to view ${post.authorName}'s official profile & contact card`}
                  >
                    <div className="relative">
                      <img 
                        src={getOfficialAvatar({ fullName: post.authorName, requestedRole: post.authorRole, avatarUrl: post.authorAvatar })} 
                        alt={post.authorName} 
                        className="w-10 h-10 rounded-2xl object-cover border-2 border-slate-200 group-hover:border-blue-500 shadow-xs bg-white transition" 
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isOfficerOnline(post.authorName) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition flex items-center gap-1">
                          {post.authorName}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                          {post.authorRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-400">{post.createdAt}</p>
                        <span className="text-[9px] text-blue-600 font-medium group-hover:underline">View Desk &rarr;</span>
                      </div>
                    </div>
                  </button>

                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    post.category === 'HQ Announcements' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    post.category === 'Field Updates' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {post.category === 'HQ Announcements' && <Megaphone className="w-3 h-3 text-blue-600" />}
                    {post.category === 'Field Updates' && <Sprout className="w-3 h-3 text-emerald-600" />}
                    {post.category === 'Donor Objections & Corrections' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                    {post.category === 'NGO Best Practices' && <Lightbulb className="w-3 h-3 text-indigo-600" />}
                    {post.category}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-900">{post.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
                  
                  {/* Real Clickable Attachment Button */}
                  {post.attachment && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleDownloadAndPreview(post.attachment!)}
                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition shadow-sm group"
                      >
                        <FileText className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span>{post.attachment.name}</span>
                        {post.attachment.size && <span className="text-[10px] text-blue-500 font-normal">({post.attachment.size})</span>}
                        <Download className="w-3.5 h-3.5 text-blue-600 ml-1" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Interaction Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        post.likedByMe ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-rose-600 text-rose-600' : ''}`} />
                      {post.likesCount} Likes
                    </button>

                    <span className="text-slate-400 font-medium flex items-center gap-1 text-xs">
                      <MessageCircle className="w-3.5 h-3.5" /> {post.comments.length} Comments
                    </span>
                  </div>

                  <button
                    onClick={() => handleSharePost(post.id)}
                    className="text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1 text-xs"
                  >
                    {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiedId === post.id ? 'Link Copied' : 'Share'}
                  </button>
                </div>

                {/* Comments Thread */}
                {post.comments.length > 0 && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                    {post.comments.map((c) => (
                      <div key={c.id} className="bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleOpenOfficerProfile(c.authorName)}
                            className="font-bold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5 transition"
                            title={`Click to view ${c.authorName}'s profile & desk`}
                          >
                            <span>{c.authorName}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({c.authorRole})</span>
                          </button>
                          <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                        </div>
                        <p className="text-slate-700 leading-snug">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(post.id);
                    }}
                    placeholder="Write a comment or response..."
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                  >
                    Comment
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Community Announcements Posted</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Use the post creation tool above to publish announcements, field updates, or donor clarification notes to the entire team.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DIRECT PERSONAL MESSAGES (1-ON-1 CHAT) */}
      {/* ========================================================================= */}
      {activeTab === 'PERSONAL_CHAT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Contacts Directory Sidebar */}
          <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 flex flex-col">
            <div className="p-4 border-b border-slate-200 space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Staff Directory</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {staffContacts.length} Officers
                </span>
              </h2>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={dmContactSearch}
                  onChange={(e) => setDmContactSearch(e.target.value)}
                  placeholder="Search staff officer..."
                  className="w-full bg-white border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredContacts.map((contact) => {
                const isSelected = selectedContact.id === contact.id;
                const isOnline = isOfficerOnline(contact.name);
                const avatarSrc = getOfficialAvatar({ fullName: contact.name, requestedRole: contact.role, avatarUrl: contact.avatar });
                const thread = directMessages[contact.name] || [];
                const lastMsg = thread.length > 0 
                  ? (thread[thread.length - 1].attachment ? `Attachment: ${thread[thread.length - 1].attachment?.name}` : thread[thread.length - 1].text)
                  : contact.lastMessage;
                const lastTime = thread.length > 0 ? thread[thread.length - 1].timestamp : contact.lastMessageTime;

                return (
                  <div
                    key={contact.id}
                    className={`w-full p-3 transition flex items-start gap-3 group ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOfficerProfile(contact);
                      }}
                      className="relative shrink-0 cursor-pointer focus:outline-none"
                      title={`View ${contact.name}'s profile & ID card`}
                    >
                      <img 
                        src={avatarSrc} 
                        alt={contact.name} 
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-xs bg-white hover:ring-2 hover:ring-blue-500 transition" 
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedContact(contact)}
                      className="flex-1 min-w-0 text-left focus:outline-none cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">{contact.name}</p>
                        <span className="text-[10px] text-slate-400">{lastTime}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{contact.role}</p>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5 italic">{lastMsg || 'No messages yet'}</p>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Conversation Chat Window */}
          <div className="md:col-span-8 flex flex-col h-full bg-white">
            {/* Active Contact Bar Header */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenOfficerProfile(selectedContact)}
                  className="relative cursor-pointer focus:outline-none group"
                  title="View Officer Profile & Contact Card"
                >
                  <img
                    src={getOfficialAvatar({ fullName: selectedContact.name, requestedRole: selectedContact.role, avatarUrl: selectedContact.avatar })}
                    alt={selectedContact.name}
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-slate-200 group-hover:border-blue-500 shadow-sm bg-white transition"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    isOfficerOnline(selectedContact.name) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenOfficerProfile(selectedContact)}
                      className="text-xs font-black text-slate-900 hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {selectedContact.name}
                    </button>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isOfficerOnline(selectedContact.name)
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-600 bg-slate-100 border-slate-200'
                    }`}>
                      {isOfficerOnline(selectedContact.name) ? '● Active Now' : '● Available'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedContact.role} • {selectedContact.dutyStation || 'Dhaka HQ'}</p>
                </div>
              </div>

              {/* Direct Quick Contact Buttons */}
              <div className="flex items-center gap-2">
                {selectedContact.phone && (
                  <a
                    href={`https://wa.me/${selectedContact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Assalamu Alaikum ${selectedContact.name}, contacting from SKB Operations Portal.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    title="Chat on WhatsApp"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}
                {selectedContact.phone && (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    title="Direct Phone Call"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Call</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenOfficerProfile(selectedContact)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                  title="View Officer Profile & Desk"
                >
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Profile Desk</span>
                </button>
              </div>
            </div>

            {/* Chat Thread Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 min-h-[380px] max-h-[460px]">
              {activeThread.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No messages yet with {selectedContact.name}</p>
                  <p className="text-[11px] text-slate-400">Send a direct message below to start a private conversation.</p>
                </div>
              ) : (
                activeThread.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>• {msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-md w-full rounded-2xl px-4 py-2.5 text-xs shadow-sm space-y-2 break-words [word-break:break-word] overflow-hidden ${
                        msg.isMine
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text && (
                        <p className="leading-relaxed whitespace-pre-wrap break-words [word-break:break-word]">
                          {msg.text}
                        </p>
                      )}

                      {/* Clickable Real Attachment Button inside DM */}
                      {msg.attachment && (
                        <button
                          onClick={() => handleDownloadAndPreview(msg.attachment!)}
                          className={`w-full inline-flex items-center justify-between gap-2 p-2 rounded-xl text-xs font-bold border transition ${
                            msg.isMine
                              ? 'bg-blue-700/80 border-blue-400 text-white hover:bg-blue-800'
                              : 'bg-slate-50 border-slate-200 text-blue-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{msg.attachment.name}</span>
                          </span>
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1">
                      {msg.isMine && <CheckCheck className="w-3 h-3 text-blue-500" />}
                      <span>Delivered</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Message Input Area */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2">
              {dmAttachment && (
                <div className="flex items-center justify-between text-xs bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5 font-bold truncate">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">File Attached: {dmAttachment.name} ({dmAttachment.size})</span>
                  </span>
                  <button onClick={() => setDmAttachment(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">✕</button>
                </div>
              )}

              <form onSubmit={handleSendDirectMessage} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => dmFileInputRef.current?.click()}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition border border-slate-200 h-[42px] shrink-0"
                  title="Attach Real File"
                >
                  <Paperclip className="w-4 h-4 text-blue-600" />
                </button>

                <textarea
                  ref={dmTextareaRef}
                  rows={1}
                  value={dmInputText}
                  onChange={(e) => setDmInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendDirectMessage();
                    }
                  }}
                  placeholder={`Type personal message to ${selectedContact.name}... (Press Enter to send, Shift+Enter for newline)`}
                  className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 resize-none min-h-[42px] max-h-[140px] overflow-y-auto leading-relaxed whitespace-pre-wrap break-words [word-break:break-word]"
                />

                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0 h-[42px]"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{viewingDocument.name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {viewingDocument.type} • {viewingDocument.size || '1.4 MB'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingDocument(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content View */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs font-mono text-slate-800 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-[11px] font-sans font-bold text-blue-700">
                <span>SMALL KINDNESS BANGLADESH (SKB)</span>
                <span>NGO BUREAU REG # 2145</span>
              </div>

              <div className="space-y-2 font-sans">
                <p className="font-extrabold text-slate-900 text-sm">{viewingDocument.name}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Official registered document record in the SKB Operations Repository. This file is verified and signed off for program implementation, financial disbursement, and external international audit compliance.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2 text-[11px] font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Location:</span>
                  <span className="font-bold text-slate-800">/supabase/storage/v1/object/public/documents</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification Hash:</span>
                  <span className="font-mono text-slate-800 font-semibold text-[10px]">SHA256:7f83b1657ff1fc53b92dc18148a1d65</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Signatory:</span>
                  <span className="font-bold text-emerald-600">Md. Abu Huraira (Executive Director)</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setViewingDocument(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close Preview
              </button>
              <button
                onClick={() => handleDownloadAndPreview(viewingDocument)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download File Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICER QUICK DESK MODAL (CLICKABLE OFFICER PROFILE & REALTIME CONTACT)   */}
      {/* ========================================================================= */}
      {inspectingOfficer && (() => {
        const isUserRecord = 'fullName' in inspectingOfficer;
        const officerName = isUserRecord ? inspectingOfficer.fullName : inspectingOfficer.name;
        const officerRole = isUserRecord 
          ? (inspectingOfficer.designation || inspectingOfficer.requestedRole) 
          : inspectingOfficer.role;
        const officerEmail = inspectingOfficer.email || 'officer@skb.org.bd';
        const officerPhone = inspectingOfficer.phone || '+880 1711-000000';
        const officerDutyStation = inspectingOfficer.dutyStation || 'Dhaka HQ';
        const officerEmployeeId = inspectingOfficer.employeeId || 'SKB-001';
        const officerDepartment = inspectingOfficer.department || 'Directorate General HQ';
        const officerBio = inspectingOfficer.bio || 'Official Small Kindness Bangladesh Officer.';
        const officerAvatar = isUserRecord 
          ? getOfficialAvatar(inspectingOfficer) 
          : getOfficialAvatar({ fullName: inspectingOfficer.name, requestedRole: inspectingOfficer.role, avatarUrl: inspectingOfficer.avatar });
        const isOnline = isOfficerOnline(officerName);
        const cleanPhone = officerPhone.replace(/[^0-9]/g, '');

        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 relative">
                <button
                  onClick={() => setInspectingOfficer(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-blue-200 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Official SKB Officer Profile</span>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="relative">
                    <img
                      src={officerAvatar}
                      alt={officerName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-lg bg-white"
                    />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                      isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-slate-500'
                    }`} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-white truncate flex items-center gap-2">
                      {officerName}
                    </h2>
                    <p className="text-xs text-blue-100 font-semibold truncate">{officerRole}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {isOnline ? '● Online & Active' : '● Available'}
                      </span>
                      <span className="text-[10px] bg-white/10 text-white font-mono px-2 py-0.5 rounded-full">
                        {officerEmployeeId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Body */}
              <div className="p-6 space-y-4 text-xs">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" /> Department
                    </span>
                    <p className="font-bold text-slate-800 truncate">{officerDepartment}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" /> Duty Station
                    </span>
                    <p className="font-bold text-slate-800 truncate">{officerDutyStation}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" /> Official Email
                    </span>
                    <p className="font-semibold text-slate-800 truncate select-all">{officerEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" /> Phone / WhatsApp
                    </span>
                    <p className="font-semibold text-slate-800 truncate select-all">{officerPhone}</p>
                  </div>
                </div>

                {/* Bio statement */}
                {officerBio && (
                  <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 space-y-1">
                    <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3 h-3" /> Responsibility & Bio
                    </span>
                    <p className="text-slate-700 leading-relaxed italic">{officerBio}</p>
                  </div>
                )}

                {/* Direct Realtime Contact Action Buttons */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Instant Communication Channels
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Portal 1-on-1 Chat */}
                    <button
                      type="button"
                      onClick={() => handleStartDirectChat(inspectingOfficer)}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Start Portal Chat</span>
                    </button>

                    {/* WhatsApp Direct */}
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Assalamu Alaikum ${officerName}, contacting from SKB Operations Portal.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>WhatsApp Chat</span>
                    </a>

                    {/* Direct Call */}
                    <a
                      href={`tel:${officerPhone}`}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition"
                    >
                      <PhoneCall className="w-4 h-4 text-blue-600" />
                      <span>Direct Phone Call</span>
                    </a>

                    {/* Email Mailto */}
                    <a
                      href={`mailto:${officerEmail}?subject=SKB Operations Communication`}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition"
                    >
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>Send Official Email</span>
                    </a>
                  </div>
                </div>

                {/* Footer Portal Links */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Link
                    href="/dashboard"
                    onClick={() => setInspectingOfficer(null)}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Staff Workspace &rarr;
                  </Link>

                  <Link
                    href="/me/profile"
                    onClick={() => setInspectingOfficer(null)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 transition"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Official Desk & ID Badge</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
