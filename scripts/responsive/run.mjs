// Opens every portal page at phone, tablet and desktop widths against the made-up backend and reports
// pages that scroll sideways, crash, or redirect. Usage:
//   MOCK_PORT=54321 BASE_URL=http://localhost:3000 node scripts/responsive/run.mjs [--only=/finance] [--widths=360,390]
// The app must already be running with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 (see check.sh).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startMock, PROJECT_ID } from './mock-supabase.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PORT = Number(process.env.MOCK_PORT || 54321);
const OUT = process.env.OUT_DIR || '/tmp/responsive-out';
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const WIDTHS = (arg('widths') || '360,390,768,1280').split(',').map(Number);
const ONLY = arg('only');
const HEIGHTS = { 360: 740, 390: 844, 768: 1024, 1280: 800 };

const PAGES = [
  '/login', '/dashboard', '/projects', `/projects/${PROJECT_ID}/overview`, `/projects/${PROJECT_ID}/charter`,
  `/projects/${PROJECT_ID}/kanban`, `/projects/${PROJECT_ID}/budget`, `/projects/${PROJECT_ID}/receipts`,
  `/projects/${PROJECT_ID}/logframe`, `/projects/${PROJECT_ID}/tasks`, `/projects/${PROJECT_ID}/beneficiaries`,
  `/projects/${PROJECT_ID}/documents`, `/projects/${PROJECT_ID}/closing-report`,
  '/beneficiaries', '/community', '/finance/expense-claims', '/finance/approvals', '/finance/budgets',
  '/procurement/requests', '/procurement/vendors', '/me/dashboard', '/me/profile',
  '/admin/users', '/admin/audit-log', '/field-dashboard', '/field-dashboard/new-report',
  '/field-dashboard/new-beneficiary', '/donor-dashboard',
].filter((p) => !ONLY || p.includes(ONLY));

const slug = (p) => p.replace(PROJECT_ID, 'P').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';

function measure() {
  const w = window.innerWidth;
  const doc = document.documentElement;
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 6).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}" right=${Math.round(el.getBoundingClientRect().right)}`;
  };
  const offenders = [];
  const cutOff = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (r.right > w + 1) {
      let a = el.parentElement, kind = 'overflow';
      while (a && a !== document.body) {
        const s = getComputedStyle(a);
        if (['auto', 'scroll'].includes(s.overflowX)) { kind = 'scroller'; break; }
        if (['hidden', 'clip'].includes(s.overflowX)) { kind = 'cut'; break; }
        a = a.parentElement;
      }
      if (kind === 'overflow') offenders.push(describe(el));
      if (kind === 'cut' && !el.classList.contains('sr-only') && !/^(img|svg)$/i.test(el.tagName)) cutOff.push(describe(el));
    }
    // text or boxes inside an overflow:hidden box that are wider than the box (not meant to be ellipsised)
    const isNoise = el.classList.contains('sr-only') || /^(input|textarea|select|img|svg)$/i.test(el.tagName);
    if (isNoise && cs.overflowX !== 'visible') continue;
    if (['hidden', 'clip'].includes(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && !/^(html|body)$/i.test(el.tagName)) {
      cutOff.push(`${describe(el)} (box ${el.clientWidth}px, content ${el.scrollWidth}px)`);
    }
  }
  let tiny = 0;
  for (const el of document.querySelectorAll('a, button, input, select, textarea, [role=button]')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && r.right <= w && (r.height < 28 || r.width < 28)) tiny++;
  }
  const text = document.body.innerText || '';
  return {
    innerWidth: w, scrollWidth: doc.scrollWidth, overflowPx: Math.max(0, doc.scrollWidth - w),
    offenders: offenders.slice(0, 6), cutOff: [...new Set(cutOff)].slice(0, 6), tiny,
    crashed: /Application error|Unhandled Runtime Error|Internal Server Error|This page couldn.t load/i.test(text),
    hasViewportMeta: !!document.querySelector('meta[name=viewport]'),
    heading: (document.querySelector('h1')?.textContent || '').trim().slice(0, 60),
  };
}

const { server, session, unknown } = await startMock(PORT);
const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
const host = new URL(BASE).hostname;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox'],
});
const results = [];
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHTS[width] || 800 }, isMobile: width < 700, hasTouch: width < 700, deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: 'sb-127-auth-token', value: cookieValue, domain: host, path: '/' }]);
  const dir = path.join(OUT, String(width));
  fs.mkdirSync(dir, { recursive: true });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
    let status = 0, finalUrl = '';
    try {
      const resp = await page.goto(BASE + p, { waitUntil: 'load', timeout: 120000 });
      status = resp?.status() ?? 0;
      await page.waitForTimeout(1200);
      finalUrl = new URL(page.url()).pathname;
      const m = await page.evaluate(measure);
      await page.screenshot({ path: path.join(dir, `${slug(p)}.png`), fullPage: true }).catch(() => {});
      results.push({ width, path: p.replace(PROJECT_ID, ':id'), status, redirectedTo: finalUrl !== p ? finalUrl : null, errors, ...m });
    } catch (e) {
      results.push({ width, path: p.replace(PROJECT_ID, ':id'), status, error: String(e.message).slice(0, 160) });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 1));

let bad = 0;
for (const r of results) {
  const flags = [];
  if (r.error) flags.push(`ERROR ${r.error}`);
  if (r.overflowPx > 0) flags.push(`sideways +${r.overflowPx}px`);
  if (r.crashed) flags.push('CRASHED');
  if (r.cutOff?.length) flags.push(`${r.cutOff.length} cut off`);
  if (r.redirectedTo) flags.push(`redirect->${r.redirectedTo}`);
  if (r.hasViewportMeta === false) flags.push('no viewport meta');
  if (flags.length) { bad++; console.log(`${r.width}px ${r.path}: ${flags.join('; ')}`); for (const o of r.offenders ?? []) console.log(`    overflow: ${o}`); for (const o of r.cutOff ?? []) console.log(`    cut: ${o}`); }
}
console.log(`\n${results.length} page views, ${bad} with problems. Unmocked tables asked for: ${[...unknown].join(', ') || 'none'}`);
console.log(`Screenshots and report.json in ${OUT}`);
// --strict (used by CI): fail only on clear breakage, not on advisory notes
const broken = results.filter((r) => r.error || r.crashed || r.overflowPx > 0 || r.status >= 500);
if (process.argv.includes('--strict') && broken.length) {
  console.log(`\nFAILED: ${broken.length} page view(s) are broken (sideways scroll, crash or error).`);
  process.exit(1);
}
process.exit(0);
