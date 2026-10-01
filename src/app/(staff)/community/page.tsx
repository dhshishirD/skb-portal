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
  Circle,
  FileText
} from 'lucide-react';

export interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  category: 'HQ Announcements' | 'Field Updates' | 'Donor Objections & Corrections' | 'NGO Best Practices';
  title: string;
  content: string;
  attachmentName?: string;
  attachmentUrl?: string;
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
  attachmentName?: string;
  timestamp: string;
  isMine: boolean;
}

export interface StaffContact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastMessage: string;
  lastMessageTime: string;
}

const INITIAL_STAFF_CONTACTS: StaffContact[] = [
  {
    id: 'user-1',
    name: 'Md. Abu Huraira',
    role: 'Executive Director',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    status: 'online',
    lastMessage: 'Verified the IHH clarification package. Great work team.',
    lastMessageTime: '03:15 PM',
  },
  {
    id: 'user-2',
    name: 'MD. Emran',
    role: 'Program Officer (Rohingya Relief)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    status: 'online',
    lastMessage: 'You can generate Form-7 report with multi-currency export.',
    lastMessageTime: '11:15 AM',
  },
  {
    id: 'user-3',
    name: 'Muktadir Rahaman',
    role: 'Admin & IT Manager',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    status: 'online',
    lastMessage: 'Supabase storage vault sync is active for all officers.',
    lastMessageTime: 'Yesterday',
  },
  {
    id: 'user-4',
    name: 'Tariq Ahmed',
    role: 'Field Operations Lead (Teknaf)',
    status: 'away',
    lastMessage: 'GPS photos uploaded for embankment afforestation site.',
    lastMessageTime: 'Sep 29',
  },
  {
    id: 'user-5',
    name: 'Sharmin Akter',
    role: 'Finance & Audit Officer',
    status: 'online',
    lastMessage: 'Requisition batch PR-2026-02 approved for disbursement.',
    lastMessageTime: 'Sep 28',
  },
];

const INITIAL_DIRECT_MESSAGES: Record<string, DirectMessage[]> = {
  'Md. Abu Huraira': [
    {
      id: 'dm-1',
      senderName: 'Md. Abu Huraira',
      senderRole: 'Executive Director',
      recipientName: 'Mizbah Uddin',
      text: 'Mizbah, please verify if the guardian NID clarification for PID 22567 beneficiary #14 was attached to the donor portal.',
      timestamp: '02:15 PM',
      isMine: false,
    },
    {
      id: 'dm-2',
      senderName: 'Mizbah Uddin',
      senderRole: 'Program Officer (IGP)',
      recipientName: 'Md. Abu Huraira',
      text: 'Yes Sir! Legal mother Fatema Begum NID clarification letter (PDF) was signed and uploaded directly to the IHH Vault.',
      attachmentName: 'Clarification_Letter_Underage_Beneficiaries_PID_22567.pdf',
      timestamp: '02:30 PM',
      isMine: true,
    },
    {
      id: 'dm-3',
      senderName: 'Md. Abu Huraira',
      senderRole: 'Executive Director',
      recipientName: 'Mizbah Uddin',
      text: 'Verified the IHH clarification package. Great work team.',
      timestamp: '03:15 PM',
      isMine: false,
    },
  ],
  'MD. Emran': [
    {
      id: 'dm-4',
      senderName: 'MD. Emran',
      senderRole: 'Program Officer',
      recipientName: 'Mizbah Uddin',
      text: 'Mizbah, do you have the Form-7 template for the Coxs Bazar WASH distribution?',
      timestamp: '11:10 AM',
      isMine: false,
    },
    {
      id: 'dm-5',
      senderName: 'Mizbah Uddin',
      senderRole: 'Program Officer',
      recipientName: 'MD. Emran',
      text: 'You can generate it automatically at /me/report-generator with instant multi-currency export.',
      timestamp: '11:15 AM',
      isMine: true,
    },
  ],
};

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'POST-001',
    authorName: 'Mizbah Uddin',
    authorRole: 'Program Officer (IGP)',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    category: 'Donor Objections & Corrections',
    title: 'PID 22567 Beneficiary #14 Guardian Clarification Letter Submitted',
    content: 'Posted formal clarification letter for IHH Audit regarding orphan child beneficiary #14 in Sylhet livestock distribution. Legal mother Fatema Begum (NID 1985269123456) signed as guardian. Inspection file attached in portal vault.',
    attachmentName: 'Clarification_Letter_Underage_Beneficiaries_PID_22567.pdf',
    likesCount: 12,
    likedByMe: true,
    createdAt: '2026-09-21 02:30 PM',
    comments: [
      {
        id: 'c1',
        authorName: 'Md. Abu Huraira',
        authorRole: 'Executive Director',
        text: 'Excellent work Mizbah! Prompt clarification maintains our 100% audit trust rating with IHH Turkey.',
        createdAt: '2026-09-21 03:00 PM',
      },
      {
        id: 'c2',
        authorName: 'Muktadir Rahaman',
        authorRole: 'Admin & IT Manager',
        text: 'Verified file integrity in Supabase vault. Donor hub link updated.',
        createdAt: '2026-09-21 03:45 PM',
      },
    ],
  },
  {
    id: 'POST-002',
    authorName: 'Md. Abu Huraira',
    authorRole: 'Executive Director',
    category: 'HQ Announcements',
    title: 'New 2026 International Donor Reporting Environment Live on SKB Portal',
    content: 'We have officially deployed the multi-currency grant tracking engine and standard 9-file compliance vault at /donor-dashboard. All officers should ensure Form-7 reports and 3-proposal vendor quotes are generated via /me/report-generator.',
    likesCount: 24,
    likedByMe: false,
    createdAt: '2026-09-27 10:15 AM',
    comments: [
      {
        id: 'c3',
        authorName: 'MD. Emran',
        authorRole: 'Program Officer (Rohingya Relief)',
        text: 'This will save us hours during UNHCR quarterly reporting! Auto Form-7 exporter is super smooth.',
        createdAt: '2026-09-27 11:30 AM',
      },
    ],
  },
  {
    id: 'POST-003',
    authorName: 'MD. Emran',
    authorRole: 'Program Officer (Rohingya Relief)',
    category: 'Field Updates',
    title: 'Rohingya Camp 11 Emergency Fire Relief Distribution Completed',
    content: '1,800 affected families received shelter maintenance kits and clean water containers. GPS photo documentation album uploaded to Drive.',
    attachmentName: 'Ukhiya_Camp11_Fire_Relief_Distribution.docx',
    likesCount: 18,
    likedByMe: false,
    createdAt: '2026-09-28 05:20 PM',
    comments: [],
  },
];

export default function StaffCommunityPage() {
  const [activeTab, setActiveTab] = useState<'PUBLIC_FEED' | 'PERSONAL_CHAT'>('PUBLIC_FEED');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Personal Direct Messages State
  const [selectedContact, setSelectedContact] = useState<StaffContact>(INITIAL_STAFF_CONTACTS[0]);
  const [directMessages, setDirectMessages] = useState<Record<string, DirectMessage[]>>(INITIAL_DIRECT_MESSAGES);
  const [dmInputText, setDmInputText] = useState('');
  const [dmAttachment, setDmAttachment] = useState('');
  const [dmContactSearch, setDmContactSearch] = useState('');

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<CommunityPost['category']>('Field Updates');
  const [newAttachment, setNewAttachment] = useState('');
  const [currentAuthor, setCurrentAuthor] = useState('Mizbah Uddin');
  const [currentRole, setCurrentRole] = useState('Program Officer');

  // Comment Input State map (postId -> text)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load community posts
    const storedPosts = localStorage.getItem('skb_hq_community_posts');
    if (storedPosts) {
      try {
        setPosts(JSON.parse(storedPosts));
      } catch (e) {
        setPosts(INITIAL_COMMUNITY_POSTS);
      }
    } else {
      setPosts(INITIAL_COMMUNITY_POSTS);
    }

    // Load direct messages
    const storedDms = localStorage.getItem('skb_hq_direct_messages');
    if (storedDms) {
      try {
        setDirectMessages(JSON.parse(storedDms));
      } catch (e) {
        setDirectMessages(INITIAL_DIRECT_MESSAGES);
      }
    } else {
      setDirectMessages(INITIAL_DIRECT_MESSAGES);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'PERSONAL_CHAT') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, selectedContact, directMessages]);

  const savePosts = (updated: CommunityPost[]) => {
    setPosts(updated);
    localStorage.setItem('skb_hq_community_posts', JSON.stringify(updated));
  };

  const saveDirectMessages = (updatedMap: Record<string, DirectMessage[]>) => {
    setDirectMessages(updatedMap);
    localStorage.setItem('skb_hq_direct_messages', JSON.stringify(updatedMap));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const post: CommunityPost = {
      id: `POST-${Math.floor(100 + Math.random() * 900)}`,
      authorName: currentAuthor,
      authorRole: currentRole,
      category: newCategory,
      title: newTitle,
      content: newContent,
      attachmentName: newAttachment.trim() || undefined,
      likesCount: 1,
      likedByMe: true,
      createdAt: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      comments: [],
    };

    const updated = [post, ...posts];
    savePosts(updated);
    setNewTitle('');
    setNewContent('');
    setNewAttachment('');
  };

  const handleSendDirectMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dmInputText.trim() && !dmAttachment.trim()) return;

    const newDm: DirectMessage = {
      id: `dm-${Date.now()}`,
      senderName: currentAuthor,
      senderRole: currentRole,
      recipientName: selectedContact.name,
      text: dmInputText.trim(),
      attachmentName: dmAttachment.trim() || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    };

    const currentThread = directMessages[selectedContact.name] || [];
    const updatedThread = [...currentThread, newDm];
    const updatedMap = { ...directMessages, [selectedContact.name]: updatedThread };

    saveDirectMessages(updatedMap);
    setDmInputText('');
    setDmAttachment('');
  };

  const handleToggleLike = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likesCount: liked ? p.likesCount + 1 : p.likesCount - 1,
        };
      }
      return p;
    });
    savePosts(updated);
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
    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/community#${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(postId);
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

  const filteredContacts = INITIAL_STAFF_CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(dmContactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(dmContactSearch.toLowerCase())
  );

  const activeThread = directMessages[selectedContact.name] || [];

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      {/* Top Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <Building2 className="w-4 h-4" /> SKB Operations • HQ Staff Community
          </div>

          {/* Active User Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Logged in as:</span>
            <select
              value={currentAuthor}
              onChange={(e) => {
                setCurrentAuthor(e.target.value);
                if (e.target.value === 'Md. Abu Huraira') setCurrentRole('Executive Director');
                else if (e.target.value === 'Mizbah Uddin') setCurrentRole('Program Officer');
                else if (e.target.value === 'MD. Emran') setCurrentRole('Program Officer');
                else setCurrentRole('HQ Admin & IT');
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold px-2.5 py-1 outline-none focus:border-blue-500"
            >
              <option value="Mizbah Uddin">Mizbah Uddin (Program Officer)</option>
              <option value="Md. Abu Huraira">Md. Abu Huraira (Executive Director)</option>
              <option value="MD. Emran">MD. Emran (Program Officer)</option>
              <option value="Muktadir Rahaman">Muktadir Rahaman (Admin & IT)</option>
            </select>
          </div>
        </div>

        {/* Heading 1 as strictly requested */}
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          HQ Internal Discussion
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Collaborate across departments with public team announcements, field bulletins, and direct 1-on-1 staff messaging.
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
              <span className="text-xs text-slate-400 font-medium">Post Author: {currentAuthor} ({currentRole})</span>
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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    placeholder="Optional Attachment Name (e.g. Form7_PID22567.pdf)..."
                    className="bg-slate-50 border border-slate-200 text-slate-900 text-[11px] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 w-full sm:w-72"
                  />
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
            {filteredPosts.map((post) => (
              <div key={post.id} id={post.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                {/* Author Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} className="w-9 h-9 rounded-full object-cover border border-blue-200" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {post.authorName.charAt(0)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{post.authorName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                          {post.authorRole}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{post.createdAt}</p>
                    </div>
                  </div>

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
                <div className="space-y-1.5">
                  <h3 className="text-sm font-extrabold text-slate-900">{post.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
                  
                  {post.attachmentName && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" /> {post.attachmentName}
                      </span>
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
                          <span className="font-bold text-slate-900">{c.authorName} ({c.authorRole})</span>
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
            ))}
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
                  {INITIAL_STAFF_CONTACTS.length} Officers
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
                const thread = directMessages[contact.name] || [];
                const lastMsg = thread.length > 0 ? thread[thread.length - 1].text : contact.lastMessage;
                const lastTime = thread.length > 0 ? thread[thread.length - 1].timestamp : contact.lastMessageTime;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3.5 text-left transition flex items-start gap-3 ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="relative">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                          {contact.name.charAt(0)}
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        contact.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">{contact.name}</p>
                        <span className="text-[10px] text-slate-400">{lastTime}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{contact.role}</p>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5 italic">{lastMsg}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Conversation Chat Window */}
          <div className="md:col-span-8 flex flex-col h-full bg-white">
            {/* Active Contact Bar Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/40">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedContact.avatar ? (
                    <img src={selectedContact.avatar} alt={selectedContact.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                      {selectedContact.name.charAt(0)}
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    selectedContact.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'
                  }`} />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    {selectedContact.name}
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                      ● Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">{selectedContact.role}</p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600">Private 1-on-1 Channel</span>
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
                      className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm space-y-1.5 ${
                        msg.isMine
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>

                      {msg.attachmentName && (
                        <div className={`pt-1 text-[11px] font-bold flex items-center gap-1.5 ${
                          msg.isMine ? 'text-blue-100' : 'text-blue-600'
                        }`}>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{msg.attachmentName}</span>
                        </div>
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
                  <span className="flex items-center gap-1.5 font-bold">
                    <Paperclip className="w-3.5 h-3.5" /> Attachment: {dmAttachment}
                  </span>
                  <button onClick={() => setDmAttachment('')} className="text-slate-400 hover:text-slate-700 text-xs font-bold">✕</button>
                </div>
              )}

              <form onSubmit={handleSendDirectMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={dmInputText}
                  onChange={(e) => setDmInputText(e.target.value)}
                  placeholder={`Type personal message to ${selectedContact.name}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  value={dmAttachment}
                  onChange={(e) => setDmAttachment(e.target.value)}
                  placeholder="Attachment filename..."
                  className="hidden sm:block w-44 bg-slate-50 border border-slate-200 text-[11px] rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
