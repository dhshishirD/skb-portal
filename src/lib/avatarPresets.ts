/**
 * Official Small Kindness Bangladesh (SKB) Staff Avatar Presets
 * Vector SVG Data URIs with zero network latency & 100% offline reliability.
 * Specifically incorporates:
 * - Professional Hijabi Female Avatar for Chairman Dr. Orakatul Jannat
 * - Professional Executive Male Avatar for Executive Director Md. Abu Huraira
 * - Professional Program, IT & Law Officer Avatars
 */

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim().replace(/\s+/g, ' '))}`;
}

export const HIJABI_CHAIRMAN_AVATAR = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <defs>
    <linearGradient id="bgHj" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    <linearGradient id="hijabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="60%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#075985" />
    </linearGradient>
    <linearGradient id="skin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fcd34d" />
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="32" fill="url(#bgHj)" />
  <!-- Formal Executive Blazer Shoulders -->
  <path d="M15 140 C15 105, 45 96, 70 96 C95 96, 125 105, 125 140 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
  <!-- Lapel & Inner Blouse -->
  <polygon points="70,96 58,140 82,140" fill="#ffffff" />
  <polygon points="66,102 70,140 74,102" fill="#0284c7" />
  <!-- Hijab Chest Wrap / Drape -->
  <path d="M38 88 C48 112, 92 112, 102 88 C98 120, 42 120, 38 88 Z" fill="url(#hijabGrad)" />
  <!-- Outer Hijab Hood Framing Face -->
  <path d="M34 56 C34 22, 106 22, 106 56 C106 88, 92 98, 70 98 C48 98, 34 88, 34 56 Z" fill="url(#hijabGrad)" />
  <!-- Face Oval -->
  <ellipse cx="70" cy="58" rx="21" ry="26" fill="url(#skin)" />
  <!-- Inner Hijab Under-cap Band -->
  <path d="M50 44 C58 38, 82 38, 90 44 C84 40, 56 40, 50 44 Z" fill="#ffffff" />
  <!-- Eyebrows -->
  <path d="M57 49 Q63 46 67 49" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" />
  <path d="M73 49 Q77 46 83 49" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" />
  <!-- Dignified Eyes -->
  <ellipse cx="62" cy="55" rx="2.5" ry="1.8" fill="#0f172a" />
  <ellipse cx="78" cy="55" rx="2.5" ry="1.8" fill="#0f172a" />
  <!-- Doctor / Professional Glasses Frame -->
  <rect x="54" y="50" width="15" height="11" rx="3" fill="none" stroke="#0284c7" stroke-width="1.6" />
  <rect x="71" y="50" width="15" height="11" rx="3" fill="none" stroke="#0284c7" stroke-width="1.6" />
  <line x1="69" y1="55" x2="71" y2="55" stroke="#0284c7" stroke-width="1.6" />
  <!-- Nose & Smile -->
  <path d="M69 61 L70 65 L73 65" fill="none" stroke="#d97706" stroke-width="1.3" stroke-linecap="round" />
  <path d="M64 73 Q70 77 76 73" fill="none" stroke="#b45309" stroke-width="1.8" stroke-linecap="round" />
  <!-- Gold Chairman Seal Badge on Top Right -->
  <circle cx="114" cy="26" r="14" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" />
  <polygon points="114,17 116.5,23.5 123,23.8 118,28 119.5,34.5 114,31 108.5,34.5 110,28 105,23.8 111.5,23.5" fill="#fef08a" />
</svg>
`);

export const MALE_EXECUTIVE_AVATAR = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <defs>
    <linearGradient id="bgEx" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <linearGradient id="maleSkin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fcd34d" />
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="32" fill="url(#bgEx)" />
  <!-- Dark Navy Executive Suit -->
  <path d="M15 140 C15 102, 45 92, 70 92 C95 92, 125 102, 125 140 Z" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5" />
  <!-- White Shirt & Collar -->
  <polygon points="70,94 54,140 86,140" fill="#ffffff" />
  <!-- Royal Blue Silk Tie -->
  <polygon points="66,94 74,94 77,126 70,138 63,126" fill="#2563eb" />
  <!-- Neck -->
  <rect x="60" y="78" width="20" height="18" rx="4" fill="url(#maleSkin)" />
  <!-- Head -->
  <ellipse cx="70" cy="54" rx="23" ry="28" fill="url(#maleSkin)" />
  <!-- Hair: Executive Groomed -->
  <path d="M46 50 C46 26, 94 26, 94 50 C94 32, 52 30, 46 50 Z" fill="#1e293b" />
  <path d="M46 50 C45 36, 56 22, 76 22 C91 22, 96 32, 94 48 C90 36, 70 32, 53 38 Z" fill="#0f172a" />
  <!-- Eyebrows -->
  <path d="M57 45 Q63 42 67 45" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
  <path d="M73 45 Q77 42 83 45" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
  <!-- Eyes -->
  <circle cx="62" cy="51" r="2.5" fill="#0f172a" />
  <circle cx="78" cy="51" r="2.5" fill="#0f172a" />
  <!-- Nose & Confident Expression -->
  <path d="M69 57 L70 63 L73 63" fill="none" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" />
  <path d="M64 71 Q70 75 76 71" fill="none" stroke="#b45309" stroke-width="1.8" stroke-linecap="round" />
  <!-- Director Badge on Top Right -->
  <circle cx="114" cy="26" r="14" fill="#2563eb" stroke="#60a5fa" stroke-width="1.5" />
  <text x="114" y="30" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ED</text>
</svg>
`);

export const MALE_OFFICER_AVATAR = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <defs>
    <linearGradient id="bgOff" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="skinOff" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fcd34d" />
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="32" fill="url(#bgOff)" />
  <!-- Field Semi-Formal Shirt -->
  <path d="M15 140 C15 105, 45 96, 70 96 C95 96, 125 105, 125 140 Z" fill="#1e293b" stroke="#64748b" stroke-width="1.5" />
  <!-- Button Placket -->
  <polygon points="70,96 64,140 76,140" fill="#0284c7" />
  <circle cx="70" cy="112" r="2" fill="#ffffff" />
  <circle cx="70" cy="126" r="2" fill="#ffffff" />
  <!-- Neck -->
  <rect x="61" y="80" width="18" height="18" rx="4" fill="url(#skinOff)" />
  <!-- Head -->
  <ellipse cx="70" cy="56" rx="22" ry="27" fill="url(#skinOff)" />
  <!-- Hair -->
  <path d="M47 50 C47 28, 93 28, 93 50 C93 34, 55 32, 47 50 Z" fill="#0f172a" />
  <!-- Eyes -->
  <circle cx="62" cy="53" r="2.2" fill="#0f172a" />
  <circle cx="78" cy="53" r="2.2" fill="#0f172a" />
  <path d="M57 47 Q62 44 66 47" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" />
  <path d="M74 47 Q78 44 83 47" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" />
  <!-- Smile -->
  <path d="M64 72 Q70 76 76 72" fill="none" stroke="#b45309" stroke-width="1.8" stroke-linecap="round" />
  <!-- SKB Shield Badge -->
  <circle cx="114" cy="26" r="14" fill="#0f766e" stroke="#2dd4bf" stroke-width="1.5" />
  <text x="114" y="30" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">SKB</text>
</svg>
`);

export const IT_OFFICER_AVATAR = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <defs>
    <linearGradient id="bgIt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="32" fill="url(#bgIt)" />
  <path d="M15 140 C15 105, 45 96, 70 96 C95 96, 125 105, 125 140 Z" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5" />
  <rect x="61" y="80" width="18" height="18" rx="4" fill="#fed7aa" />
  <ellipse cx="70" cy="56" rx="22" ry="27" fill="#fed7aa" />
  <path d="M47 50 C47 28, 93 28, 93 50 Z" fill="#1e293b" />
  <!-- IT Specialist Glasses -->
  <rect x="54" y="50" width="14" height="10" rx="2" fill="none" stroke="#6366f1" stroke-width="1.5" />
  <rect x="72" y="50" width="14" height="10" rx="2" fill="none" stroke="#6366f1" stroke-width="1.5" />
  <line x1="68" y1="55" x2="72" y2="55" stroke="#6366f1" stroke-width="1.5" />
  <circle cx="61" cy="55" r="2" fill="#0f172a" />
  <circle cx="79" cy="55" r="2" fill="#0f172a" />
  <path d="M64 73 Q70 76 76 73" fill="none" stroke="#b45309" stroke-width="1.5" stroke-linecap="round" />
  <!-- Tech Chip Badge -->
  <circle cx="114" cy="26" r="14" fill="#4338ca" stroke="#a5b4fc" stroke-width="1.5" />
  <text x="114" y="30" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">&lt;/&gt;</text>
</svg>
`);

export const LAW_OFFICER_AVATAR = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <defs>
    <linearGradient id="bgLaw" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#27272a" />
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="32" fill="url(#bgLaw)" />
  <path d="M15 140 C15 105, 45 96, 70 96 C95 96, 125 105, 125 140 Z" fill="#09090b" stroke="#a1a1aa" stroke-width="1.5" />
  <polygon points="70,96 58,140 82,140" fill="#ffffff" />
  <polygon points="67,96 73,96 75,124 70,135 65,124" fill="#52525b" />
  <rect x="61" y="80" width="18" height="18" rx="4" fill="#fed7aa" />
  <ellipse cx="70" cy="56" rx="22" ry="27" fill="#fed7aa" />
  <path d="M47 50 C47 28, 93 28, 93 50 Z" fill="#18181b" />
  <circle cx="62" cy="54" r="2.2" fill="#0f172a" />
  <circle cx="78" cy="54" r="2.2" fill="#0f172a" />
  <path d="M64 73 Q70 76 76 73" fill="none" stroke="#b45309" stroke-width="1.5" stroke-linecap="round" />
  <!-- Scales of Justice Badge -->
  <circle cx="114" cy="26" r="14" fill="#3f3f46" stroke="#d4d4d8" stroke-width="1.5" />
  <text x="114" y="31" font-size="12" font-weight="900" fill="#fef08a" text-anchor="middle" font-family="sans-serif">⚖</text>
</svg>
`);

export function getOfficialAvatar(officer: { fullName?: string; designation?: string; requestedRole?: string; avatarUrl?: string }): string {
  // If user uploaded a custom photo (data URL or non-broken external URL)
  if (officer.avatarUrl && (officer.avatarUrl.startsWith('data:image/') || (officer.avatarUrl.startsWith('http') && !officer.avatarUrl.includes('images.unsplash.com')))) {
    return officer.avatarUrl;
  }

  const name = (officer.fullName || '').toLowerCase();
  const role = (officer.requestedRole || officer.designation || '').toLowerCase();

  // Chairman Dr. Orakatul Jannat (Hijabi Executive Avatar)
  if (name.includes('orakatul') || name.includes('jannat') || role.includes('chairman')) {
    return HIJABI_CHAIRMAN_AVATAR;
  }

  // Executive Director Md. Abu Huraira
  if (name.includes('huraira') || name.includes('director') || role.includes('executive director')) {
    return MALE_EXECUTIVE_AVATAR;
  }

  // IT Officer Muktadir Rahaman
  if (name.includes('muktadir') || role.includes('it officer')) {
    return IT_OFFICER_AVATAR;
  }

  // Law Officer Aminul Islam Bulbul
  if (name.includes('bulbul') || name.includes('aminul') || role.includes('law officer')) {
    return LAW_OFFICER_AVATAR;
  }

  // Program Officers (Daloyar Hassan, Emran Ahmed, Mizbah Uddin)
  return MALE_OFFICER_AVATAR;
}
