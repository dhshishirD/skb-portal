'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Tag, 
  User, 
  Paperclip, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search,
  Check
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
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  useEffect(() => {
    const stored = localStorage.getItem('skb_hq_community_posts');
    if (stored) {
      try {
        setPosts(JSON.parse(stored));
      } catch (e) {
        setPosts(INITIAL_COMMUNITY_POSTS);
      }
    } else {
      setPosts(INITIAL_COMMUNITY_POSTS);
    }
  }, []);

  const savePosts = (updated: CommunityPost[]) => {
    setPosts(updated);
    localStorage.setItem('skb_hq_community_posts', JSON.stringify(updated));
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
      createdAt: new Date().toLocaleString(),
      comments: [],
    };

    const updated = [post, ...posts];
    savePosts(updated);
    setNewTitle('');
    setNewContent('');
    setNewAttachment('');
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
              createdAt: new Date().toLocaleString(),
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

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
          <Building2 className="w-4 h-4" /> SKB Operations • HQ Staff Community Hub
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          HQ Internal Discussion & Field Announcement Bulletin
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Share project milestones, field updates, donor feedback alerts, and inter-departmental notices with HQ officers and executive management.
        </p>
      </div>

      {/* New Post Creator Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Publish Announcement / Field Note
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Post As:</span>
            <select
              value={currentAuthor}
              onChange={(e) => {
                setCurrentAuthor(e.target.value);
                if (e.target.value === 'Md. Abu Huraira') setCurrentRole('Executive Director');
                else if (e.target.value === 'Mizbah Uddin') setCurrentRole('Program Officer');
                else if (e.target.value === 'MD. Emran') setCurrentRole('Program Officer');
                else setCurrentRole('HQ Admin');
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold px-2 py-1 outline-none"
            >
              <option value="Mizbah Uddin">Mizbah Uddin (Program Officer)</option>
              <option value="Md. Abu Huraira">Md. Abu Huraira (Executive Director)</option>
              <option value="MD. Emran">MD. Emran (Program Officer)</option>
              <option value="Muktadir Rahaman">Muktadir Rahaman (Admin & IT)</option>
            </select>
          </div>
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
                <option value="Field Updates">🌾 Field Updates</option>
                <option value="HQ Announcements">📢 HQ Announcements</option>
                <option value="Donor Objections & Corrections">⚠️ Donor Objections & Corrections</option>
                <option value="NGO Best Practices">💡 NGO Best Practices</option>
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
            className={`px-3 py-1.5 rounded-xl transition ${
              activeCategory === 'HQ Announcements' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            📢 HQ Announcements
          </button>
          <button
            onClick={() => setActiveCategory('Field Updates')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeCategory === 'Field Updates' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            🌾 Field Updates
          </button>
          <button
            onClick={() => setActiveCategory('Donor Objections & Corrections')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeCategory === 'Donor Objections & Corrections' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
            }`}
          >
            ⚠️ Donor Objections
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

              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                post.category === 'HQ Announcements' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                post.category === 'Field Updates' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {post.category}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900">{post.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
              
              {post.attachmentName && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition">
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
  );
}
