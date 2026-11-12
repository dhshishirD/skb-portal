// A tiny stand-in for Supabase (auth + REST) that serves made-up rows, so the portal's signed-in pages
// can be opened and measured without a real database. TEST ONLY: nothing here touches production.
import http from 'node:http';
import crypto from 'node:crypto';
import { loadSchema } from './schema.mjs';

const { tables, enums, choices } = loadSchema();

const ALL_ROLES = [
  'super_admin', 'executive', 'programme_manager', 'project_officer', 'field_officer', 'finance',
  'procurement', 'me_officer', 'auditor', 'board', 'legal_officer', 'it_officer',
];

export function uuid(seed) {
  const h = crypto.createHash('sha1').update(String(seed)).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const USER_ID = uuid('user');
export const PROJECT_ID = uuid('projects:0');
export const ORG_ID = uuid('org');
const NOW = new Date();
const iso = (d = 0) => new Date(NOW.getTime() - d * 86400000).toISOString();
const day = (d = 0) => iso(d).slice(0, 10);

const NAMES = ['Mohammad Abdullah Al Mamun Chowdhury', 'Nusrat Jahan', 'Rafiqul Islam Sarker', 'Tahmina Akter Banu'];
const SENTENCES = [
  'Purchase of school uniforms and learning materials for 120 scholarship students in Cox’s Bazar district',
  'Monthly field monitoring visit to the Teknaf and Ukhiya upazilas, including transport and refreshments',
  'Training workshop on child protection for community volunteers and teachers',
  'Printing and distribution of awareness leaflets',
];

const USERISH = /(^|_)(user|claimant|requester|actor|owner|assignee|assigned_to|author|sender|recipient|uploaded|created_by|updated_by|approved_by|reviewed_by|verified_by|validated_by|submitted_by|entered_by|recorded_by|signed_off_by)(_id|_by)?$/;
const NULLISH = /^(deleted_at|archived_at|cancelled_at|closed_at|rejected_at|returned_at|paid_at|revoked_at|last_error|blacklist_reason|reopened_at|signed_off_at|sent_at|read_at)$/;

function singular(s) { return s.endsWith('ies') ? s.slice(0, -3) + 'y' : s.replace(/s$/, ''); }
function tableForFk(col) {
  const base = col.replace(/_id$/, '');
  if (base === 'project') return 'projects';
  if (base === 'parent') return null;
  for (const t of Object.keys(tables)) if (t === base || singular(t) === base || t === base + 's') return t;
  return null;
}

function valueFor(table, col, type, i) {
  const key = `${table}.${col}`;
  if (NULLISH.test(col)) return null;
  if (choices[key]) return choices[key][i % choices[key].length];
  if (enums[type]) return enums[type][i % enums[type].length];
  if (type.endsWith('[]')) return type.startsWith('uuid') ? [] : ['sample'];
  if (type.startsWith('uuid')) {
    if (col === 'id') return table === 'profiles' ? USER_ID : uuid(`${table}:${i}`);
    if (USERISH.test(col)) return USER_ID;
    if (/^(org|organization|donor_org|owner_org|implementing_org)(anization)?_id$/.test(col) || col === 'organization_id') return ORG_ID;
    const t = tableForFk(col);
    if (t === 'profiles') return USER_ID;
    if (t) return t === 'projects' ? PROJECT_ID : uuid(`${t}:${i}`);
    return uuid(`${key}`);
  }
  if (type.startsWith('bool')) return /^is_(blacklisted|deleted|archived|selected|read|locked|reopened)$/.test(col) ? false : true;
  if (type === 'date') return day(i * 9 + 1);
  if (type.startsWith('timestamp')) return iso(i + 1);
  if (type.startsWith('json')) return {};
  if (/^(int|integer|bigint|smallint|serial|bigserial|numeric|decimal|real|double|float)/.test(type)) {
    if (/percent|progress|pct/.test(col)) return 42;
    if (/count|number|no$|_no|step|version|year/.test(col)) return col.includes('year') ? 2026 : (i % 3) + 1;
    if (/fx_rate/.test(col)) return 1;
    return 12500 * (i + 1) + 0.5;
  }
  // text-ish
  if (/email/.test(col)) return `staff${i}@skb.example`;
  if (/phone|mobile/.test(col)) return '+8801700000000';
  if (/full_name|display_name|^name$|_name$/.test(col)) return NAMES[i % NAMES.length];
  if (/description|comment|note|body|content|reason|summary|objective|justification|remarks?/.test(col)) return SENTENCES[i % SENTENCES.length];
  if (/title|label|subject/.test(col)) return SENTENCES[i % SENTENCES.length].slice(0, 60);
  if (/code|ref|number/.test(col)) return `SKB-2026-00${i + 1}`;
  if (/currency/.test(col)) return 'BDT';
  if (/path|url|link/.test(col)) return 'sample/file.pdf';
  return 'Sample text';
}

const cache = new Map();
export function rowsFor(table, n = 4) {
  const key = `${table}:${n}`;
  if (cache.has(key)) return cache.get(key);
  const def = tables[table];
  const rows = [];
  if (def) {
    for (let i = 0; i < n; i++) {
      const row = {};
      for (const [col, type] of Object.entries(def.columns)) row[col] = valueFor(table, col, type, i);
      rows.push(row);
    }
    // a few tables need to look like the signed-in person
    if (table === 'profiles') {
      rows.forEach((r, i) => { r.full_name = NAMES[i % NAMES.length]; if (i > 0) r.id = uuid(`profile:${i}`); r.is_active = true; });
    }
    if (table === 'user_roles') {
      return (cache.set(key, ALL_ROLES.map((role) => ({ ...rows[0], user_id: USER_ID, role })) ), cache.get(key));
    }
    if (table === 'projects') {
      rows.forEach((r, i) => { r.title = ['Rohingya Undergraduate Scholarship', 'Girls’ Education Support', 'Community Learning Centres', 'Youth Skills Pilot'][i]; r.code = `SKB-2026-00${i + 1}`; });
    }
  }
  cache.set(key, rows);
  return rows;
}

function parseSelect(sel) {
  // top-level embeds: alias:table!hint(...) | table(...)
  const out = [];
  let depth = 0, cur = '', parts = [];
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) parts.push(cur);
  for (const p of parts) {
    const m = p.trim().match(/^(?:(\w+):)?(\w+)(?:!(\w+))?(?:!inner)?\(([\s\S]*)\)$/);
    if (m) out.push({ key: m[1] || m[2], table: m[2], hint: m[3], inner: m[4] });
  }
  return out;
}

function withEmbeds(table, rows, select) {
  if (!select || !select.includes('(')) return rows;
  const embeds = parseSelect(select);
  if (!embeds.length) return rows;
  return rows.map((row, ri) => {
    const copy = { ...row };
    for (const e of embeds) {
      const childTable = tables[e.table] ? e.table : tableForFk(`${e.table}_id`);
      if (!childTable) { copy[e.key] = []; continue; }
      const cols = tables[table]?.columns ?? {};
      const toOne = (e.hint && cols[e.hint]) || cols[`${singular(childTable)}_id`] || cols[`${childTable}_id`] ||
        (childTable === 'profiles' && Object.keys(cols).some((c) => USERISH.test(c)));
      const kids = withEmbeds(childTable, rowsFor(childTable, toOne ? 1 : 3).map((r) => ({ ...r })), e.inner);
      if (toOne) {
        const one = { ...kids[0] };
        if (childTable === 'profiles') one.id = USER_ID;
        copy[e.key] = one;
      } else {
        copy[e.key] = kids;
      }
    }
    return copy;
  });
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(k)) continue;
    if (k === 'or' || k === 'and') continue;
    const m = v.match(/^(not\.)?(\w+)\.(.*)$/);
    if (!m) continue;
    const [, not, op, val] = m;
    const test = (r) => {
      if (!(k in r)) return true;
      const cell = r[k];
      if (op === 'eq') return String(cell) === val;
      if (op === 'neq') return String(cell) !== val;
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')).includes(String(cell));
      if (op === 'is') return val === 'null' ? cell == null : val === 'true' ? cell === true : val === 'false' ? cell === false : true;
      return true;
    };
    out = out.filter((r) => (not ? !test(r) : test(r)));
  }
  return out;
}

export function makeSession(port) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const payload = Buffer.from(JSON.stringify({
    sub: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'ed@skb.example',
    exp, iat: Math.floor(Date.now() / 1000), aal: 'aal2', session_id: uuid('session'),
    amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }],
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', 'test-secret').update(`${header}.${payload}`).digest('base64url');
  const user = {
    id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'ed@skb.example',
    app_metadata: { provider: 'email' }, user_metadata: { full_name: NAMES[0] },
    created_at: iso(30), updated_at: iso(1), email_confirmed_at: iso(30), last_sign_in_at: iso(0),
  };
  return {
    access_token: `${header}.${payload}.${sig}`, refresh_token: 'test-refresh', token_type: 'bearer',
    expires_in: 86400, expires_at: exp, user,
  };
}

export function startMock(port = 54321, log = () => {}) {
  const session = makeSession(port);
  const unknown = new Set();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') return send(204);
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const p = url.pathname;
      if (p === '/auth/v1/user') return send(200, session.user);
      if (p === '/auth/v1/token') return send(200, session);
      if (p.startsWith('/auth/v1/factors') || p.startsWith('/auth/v1/mfa')) return send(200, []);
      if (p.startsWith('/auth/v1/')) return send(200, {});
      if (p.startsWith('/rest/v1/rpc/')) { log(`rpc ${p.split('/').pop()}`); return send(200, []); }
      if (p.startsWith('/rest/v1/')) {
        const table = p.split('/')[3];
        if (!tables[table]) { unknown.add(table); return send(200, []); }
        const select = url.searchParams.get('select') || '*';
        if (req.method === 'GET' || req.method === 'HEAD') {
          let rows = applyFilters(rowsFor(table), url.searchParams);
          const total = rows.length;
          const limit = Number(url.searchParams.get('limit'));
          const offset = Number(url.searchParams.get('offset') || 0);
          if (limit) rows = rows.slice(offset, offset + limit);
          const shaped = withEmbeds(table, rows, select);
          const range = `${total ? `0-${total - 1}` : '*'}/${total}`;
          if (req.method === 'HEAD') return send(200, undefined, { 'content-range': range });
          if ((req.headers.accept || '').includes('vnd.pgrst.object')) {
            if (shaped.length === 0) return send(406, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' });
            return send(200, shaped[0], { 'content-range': range });
          }
          return send(200, shaped, { 'content-range': range });
        }
        // writes are accepted but nothing is stored
        return send(req.method === 'POST' ? 201 : 204, req.method === 'POST' ? [] : undefined);
      }
      if (p.startsWith('/storage/v1/')) return send(200, { signedURL: '', signedUrl: '' });
      return send(404, { message: 'not mocked' });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, session, unknown })));
}

if (process.argv[1] && process.argv[1].endsWith('mock-supabase.mjs')) {
  startMock(54321, console.log).then(() => console.log('mock supabase on 54321'));
}
