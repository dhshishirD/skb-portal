// Reads supabase/migrations/*.sql and builds a rough picture of the tables (column names and types)
// and enums. Only used to make believable test rows for the responsive check; it is NOT a SQL parser.
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS = path.resolve(process.cwd(), 'supabase/migrations');

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, '');
}

function splitTopLevel(body) {
  const parts = [];
  let depth = 0, cur = '', q = false;
  for (const ch of body) {
    if (ch === "'") q = !q;
    if (!q) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function loadSchema() {
  const tables = {}; // name -> { columns: {name: type} }
  const enums = {};
  const choices = {}; // 'table.column' -> allowed values from a CHECK ... IN (...)
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = stripComments(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'));
    for (const m of sql.matchAll(/create type (?:public\.)?(\w+) as enum \(([^)]*)\)/gi)) {
      enums[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
    }
    for (const m of sql.matchAll(/alter type (?:public\.)?(\w+) add value (?:if not exists )?'([^']*)'/gi)) {
      (enums[m[1]] ||= []).push(m[2]);
    }
    const re = /create table (?:if not exists )?(?:public\.)?(\w+)\s*\(/gi;
    let m;
    while ((m = re.exec(sql))) {
      const name = m[1];
      let i = re.lastIndex, depth = 1;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '(') depth++;
        if (sql[i] === ')') depth--;
        i++;
      }
      const body = sql.slice(re.lastIndex, i - 1);
      const columns = {};
      for (const part of splitTopLevel(body)) {
        if (/^(constraint|primary|unique|check|foreign|exclude)\b/i.test(part)) continue;
        const mm = part.match(/^"?(\w+)"?\s+([\w.]+(?:\s*\([^)]*\))?(?:\[\])?)/);
        if (mm) {
          columns[mm[1]] = mm[2].replace(/^public\./, '').toLowerCase();
          const ck = part.match(/check\s*\(\s*"?\w+"?\s+in\s*\(([^)]*)\)/i);
          if (ck) choices[`${name}.${mm[1]}`] = [...ck[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
        }
      }
      tables[name] = { columns: { ...(tables[name]?.columns ?? {}), ...columns } };
    }
    for (const m2 of sql.matchAll(/alter table (?:if exists )?(?:only )?(?:public\.)?(\w+)\s+([^;]+);/gi)) {
      const t = tables[m2[1]];
      if (!t) continue;
      for (const part of splitTopLevel(m2[2])) {
        const add = part.match(/^add column (?:if not exists )?"?(\w+)"?\s+([\w.]+(?:\s*\([^)]*\))?(?:\[\])?)/i);
        if (add) t.columns[add[1]] = add[2].replace(/^public\./, '').toLowerCase();
        const drop = part.match(/^drop column (?:if exists )?"?(\w+)"?/i);
        if (drop) delete t.columns[drop[1]];
      }
    }
  }
  return { tables, enums, choices };
}

if (process.argv[1] && process.argv[1].endsWith('schema.mjs')) {
  const s = loadSchema();
  console.log(Object.keys(s.tables).length, 'tables', Object.keys(s.enums).length, 'enums');
  console.log(Object.keys(s.tables).join(' '));
}
