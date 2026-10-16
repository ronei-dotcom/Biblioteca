'use strict';
/* =====================================================================
   Folio — app de leitura (PWA). Dados locais (IndexedDB) + Supabase.
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const nowISO = () => new Date().toISOString();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dk = d => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; }
function fmtMin(sec) { return `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`; }
function fmtDur(sec) { const m = Math.round(sec / 60); if (m < 60) return m + 'm'; return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function periodName(iso) { const h = new Date(iso).getHours(); return h >= 5 && h < 12 ? 'Leitura matinal' : h >= 12 && h < 18 ? 'Leitura da tarde' : 'Leitura noturna'; }
function greeting() { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'; }

/* ---------- ícones ---------- */
const ICON = {
  home: '<path d="M4 10.5L12 4l8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  library: '<path d="M4 5h5a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-5a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h6z"/>',
  chart: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  flame: '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-10z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/>',
  zin: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M11 8v6M8 11h6"/>',
  zout: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8 11h6"/>',
  inf: '<path d="M7 8a4 4 0 1 0 0 8c4 0 6-8 10-8a4 4 0 1 1 0 8c-4 0-6-8-10-8z"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  marker: '<path d="M14.5 4.5l5 5-8 8H6.5v-5z"/><path d="M12 7l5 5"/><path d="M4 21h9"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  hourglass: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 6 10 6 10 9s-10 3-10 9"/><path d="M17 3c0 6-10 6-10 9s10 3 10 9"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  sunrise: '<path d="M3 19h18"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M12 4v4M5.5 10.5l1.8 1.5M18.5 10.5l-1.8 1.5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  leaf: '<path d="M5 20c0-9 6-15 15-15 0 9-5.5 15-14 15"/><path d="M5 20c3-4 6.5-7 10.5-9.5"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
  stack: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 20h8M9.5 17h5"/>'
};
const ic = (n, s = 24, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
const LOGO = (s = 36) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" fill="currentColor"><rect x="12" y="4" width="24" height="7" rx="3"/><rect x="6" y="14" width="22" height="7" rx="3"/><rect x="10" y="24" width="24" height="7" rx="3"/><rect x="4" y="33" width="16" height="4" rx="2" opacity=".5"/></svg>`;

/* ---------- tema ---------- */
function applyTheme() {
  let t = localStorage.getItem('theme') || 'auto';
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  const m = $('meta[name=theme-color]'); if (m) m.content = t === 'light' ? '#eef1f4' : '#121a2a';
}
applyTheme();
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch { }

/* ---------- toast ---------- */
let toastT;
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

/* ---------- banco local (IndexedDB) ---------- */
const STORES = { books: 'id', sessions: 'id', settings: 'key', blobs: 'key', highlights: 'id' };
const DB = {
  db: null,
  open() {
    return new Promise((ok, no) => {
      const r = indexedDB.open('folio', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const [n, k] of Object.entries(STORES)) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: k });
      };
      r.onsuccess = () => { this.db = r.result; ok(); };
      r.onerror = () => no(r.error);
    });
  },
  _r(store, mode, fn) {
    return new Promise((ok, no) => {
      const t = this.db.transaction(store, mode);
      const q = fn(t.objectStore(store));
      t.oncomplete = () => ok(q && q.result);
      t.onerror = () => no(t.error);
      t.onabort = () => no(t.error);
    });
  },
  get(s, k) { return this._r(s, 'readonly', o => o.get(k)); },
  all(s) { return this._r(s, 'readonly', o => o.getAll()); },
  put(s, v) { return this._r(s, 'readwrite', o => o.put(v)); },
  del(s, k) { return this._r(s, 'readwrite', o => o.delete(k)); }
};

/* ---------- estado ---------- */
const S = { books: [], sessions: [], hl: [], goal: 30, ach: null, tab: 'home', ptab: 'voce', lib: 'all', libv: 'books',
  mk: 'all', mbook: null, range: 7, sync: 'idle', syncMsg: '', noHL: false };

async function loadAll() {
  S.books = (await DB.all('books')).filter(b => !b.deleted);
  S.sessions = (await DB.all('sessions')).filter(x => !x.deleted);
  S.hl = (await DB.all('highlights')).filter(x => !x.deleted);
  const g = await DB.get('settings', 'goal');
  if (g && !g.deleted) S.goal = Number(g.value) || 30;
  const a = await DB.get('settings', 'ach');
  S.ach = a && a.value && typeof a.value === 'object' ? a.value : null;
}
async function saveRow(store, list, x) {
  x.updated_at = nowISO(); x._dirty = true;
  await DB.put(store, x);
  const i = list.findIndex(y => y.id === x.id);
  if (x.deleted) { if (i >= 0) list.splice(i, 1); } else if (i >= 0) list[i] = x; else list.push(x);
  queueSync(); queueAch();
}
const saveBook = b => saveRow('books', S.books, b);
const saveSession = x => saveRow('sessions', S.sessions, x);
const saveMark = x => saveRow('highlights', S.hl, x);
async function saveSetting(key, value) {
  await DB.put('settings', { key, value, updated_at: nowISO(), _dirty: true });
  queueSync();
}
async function saveGoal(min) { S.goal = min; await saveSetting('goal', min); }
const bookById = id => S.books.find(b => b.id === id);
const pct = b => b.total_pages > 0 ? Math.min(100, Math.round(b.current_page / b.total_pages * 100)) : 0;

/* ---------- arquivos (PDF e capa) ---------- */
const coverURLs = {};
async function getBlob(kind, book, download = true) {
  const key = kind + ':' + book.id;
  const rec = await DB.get('blobs', key);
  if (rec) return rec.blob;
  const path = book[kind + '_path'];
  if (!download || !path || !sb || !navigator.onLine) return null;
  try {
    const { data, error } = await sb.storage.from('books').download(path);
    if (error || !data) return null;
    await DB.put('blobs', { key, blob: data });
    return data;
  } catch { return null; }
}
async function hasLocalPdf(id) { return !!(await DB.get('blobs', 'pdf:' + id)); }

async function hydrateCovers(root = document) {
  for (const img of $$('img[data-cover]', root)) {
    const b = bookById(img.dataset.cover);
    if (!b) continue;
    let url = coverURLs[b.id];
    if (!url) {
      const blob = await getBlob('cover', b);
      if (!blob) continue;
      url = coverURLs[b.id] = URL.createObjectURL(blob);
    }
    img.onload = () => { img.hidden = false; const ph = img.parentElement.querySelector('.ph'); if (ph) ph.remove(); };
    img.src = url;
  }
}
const coverHTML = b => `<div class="cover"><img data-cover="${b.id}" hidden alt=""><span class="ph">${esc(b.title)}</span></div>`;

async function toJpeg(src, maxW = 480) {
  const bmp = await createImageBitmap(src);
  const k = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.85));
}

/* =====================================================================
   Supabase e sincronização
   - cada envio com erro é isolado: o resto continua e o download sempre acontece
   - "tempo real": quando outro aparelho grava algo, este aparelho é avisado na hora
   - capas/PDFs ganham um caminho novo a cada troca, assim os outros aparelhos baixam de novo
   ===================================================================== */
let sb = null;
try {
  const cfg = window.FOLIO_CONFIG || {};
  const url = String(cfg.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '');
  if (url && cfg.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(url, cfg.SUPABASE_ANON_KEY.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
  }
} catch (e) { console.warn('Supabase indisponível', e); }

let syncing = false, syncTimer = null, syncAgain = false, lastErr = '';
function setSync(state, msg = '') {
  S.sync = state; S.syncMsg = msg;
  const d = $('#syncDot'); if (d) d.className = 'dot ' + dotCls();
  const l = $('#syncLbl'); if (l) l.textContent = syncLabel();
}
const dotCls = () => ({ idle: 'ok', busy: 'busy', err: 'err', off: '' }[S.sync] || '');
const syncLabel = () => !sb ? 'Só neste aparelho' : S.sync === 'busy' ? 'Sincronizando…' : S.sync === 'err' ? 'Erro na sincronização' : S.sync === 'off' ? 'Sem internet' : 'Sincronizado';
function queueSync(ms = 1200) { if (!sb) return; clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }
const isMissingTable = e => e && (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|does not exist/i.test(e.message || ''));

async function pushBooks(errs) {
  for (const b0 of await DB.all('books')) {
    if (!b0._dirty) continue;
    try {
      const b = { ...b0 };
      if (b.deleted) {
        const paths = [b.pdf_path, b.cover_path].filter(Boolean);
        if (paths.length) await sb.storage.from('books').remove(paths).catch(() => { });
        await DB.del('blobs', 'pdf:' + b.id); await DB.del('blobs', 'cover:' + b.id);
      } else {
        if (b._upCover) {
          const rec = await DB.get('blobs', 'cover:' + b.id);
          if (rec) {
            const p = `covers/${b.id}-${Date.now()}.jpg`;
            const { error } = await sb.storage.from('books').upload(p, rec.blob, { upsert: true, contentType: 'image/jpeg' });
            if (error) throw new Error('capa: ' + (error.message || 'erro'));
            if (b.cover_path && b.cover_path !== p) sb.storage.from('books').remove([b.cover_path]).catch(() => { });
            b.cover_path = p;
          }
          b._upCover = false;
        }
        if (b._upPdf) {
          const rec = await DB.get('blobs', 'pdf:' + b.id);
          if (rec) {
            const p = `pdfs/${b.id}-${Date.now()}.pdf`;
            const { error } = await sb.storage.from('books').upload(p, rec.blob, { upsert: true, contentType: 'application/pdf' });
            if (error) throw new Error(`não consegui enviar o PDF de "${b.title}" (${error.message || 'erro'}). O limite grátis é 50 MB por arquivo.`);
            if (b.pdf_path && b.pdf_path !== p) sb.storage.from('books').remove([b.pdf_path]).catch(() => { });
            b.pdf_path = p;
          }
          b._upPdf = false;
        }
      }
      const { _dirty, _upCover, _upPdf, server_ts, ...row } = b;
      const { error } = await sb.from('books').upsert(row);
      if (error) throw error;
      const cur = await DB.get('books', b.id);
      cur.cover_path = b.cover_path; cur.pdf_path = b.pdf_path;
      if (cur.updated_at === b0.updated_at) { cur._dirty = false; cur._upCover = false; cur._upPdf = false; }
      await DB.put('books', cur);
      const i = S.books.findIndex(x => x.id === cur.id); if (i >= 0 && !cur.deleted) S.books[i] = cur;
    } catch (e) { errs.push(e.message || String(e)); }
  }
}
async function pushSimple(store, table, key, errs) {
  for (const r0 of await DB.all(store)) {
    if (!r0._dirty) continue;
    const { _dirty, server_ts, ...row } = r0;
    const { error } = await sb.from(table).upsert(row);
    if (error) { if (isMissingTable(error)) throw error; errs.push(error.message); continue; }
    const cur = await DB.get(store, r0[key]);
    if (cur && cur.updated_at === r0.updated_at) { cur._dirty = false; await DB.put(store, cur); }
  }
}
function mergeAch(a, b) { const o = { ...(a || {}) }; for (const k in (b || {})) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; }
async function pull(table, store, key) {
  const ck = 'cur2_' + table;
  const saved = localStorage.getItem(ck);
  // volta 2 minutos para não perder nada gravado "ao mesmo tempo" em outro aparelho
  let from = saved ? new Date(new Date(saved).getTime() - 120000).toISOString() : '1970-01-01T00:00:00Z';
  let maxTs = saved || from, changed = false;
  for (; ;) {
    const { data, error } = await sb.from(table).select('*').gt('server_ts', from).order('server_ts').limit(500);
    if (error) throw error;
    if (!data.length) break;
    for (const r of data) {
      if (!maxTs || new Date(r.server_ts) > new Date(maxTs)) maxTs = r.server_ts;
      const loc = await DB.get(store, r[key]);
      if (loc && !loc._dirty && loc.server_ts === r.server_ts) continue;   // já tenho
      if (store === 'settings' && r.key === 'ach') {
        const merged = mergeAch(loc && loc.value, r.value);
        const differs = JSON.stringify(merged) !== JSON.stringify(mergeAch({}, r.value));
        await DB.put(store, { ...r, value: merged, _dirty: differs, updated_at: differs ? nowISO() : r.updated_at });
        changed = true; continue;
      }
      if (loc && loc._dirty && new Date(loc.updated_at) >= new Date(r.updated_at)) continue;   // a minha versão é mais nova
      if (store === 'books' && loc) {
        if (loc.cover_path !== r.cover_path) { await DB.del('blobs', 'cover:' + r.id); if (coverURLs[r.id]) { URL.revokeObjectURL(coverURLs[r.id]); delete coverURLs[r.id]; } }
        if (loc.pdf_path !== r.pdf_path && !loc._upPdf) await DB.del('blobs', 'pdf:' + r.id);
      }
      await DB.put(store, r); changed = true;
    }
    from = data[data.length - 1].server_ts;
    if (data.length < 500) break;
  }
  if (maxTs) localStorage.setItem(ck, maxTs);
  return changed;
}
async function sync() {
  if (!sb) { setSync('off'); return; }
  if (!navigator.onLine) { setSync('off', 'Sem internet'); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; setSync('busy');
  const errs = [];
  let ch = false;
  try {
    await pushBooks(errs);
    await pushSimple('sessions', 'sessions', 'id', errs);
    await pushSimple('settings', 'settings', 'key', errs);
    if (!S.noHL) {
      try { await pushSimple('highlights', 'highlights', 'id', errs); }
      catch (e) { if (isMissingTable(e)) S.noHL = true; else errs.push(e.message); }
    }
    ch = (await pull('books', 'books', 'id')) || ch;
    ch = (await pull('sessions', 'sessions', 'id')) || ch;
    ch = (await pull('settings', 'settings', 'key')) || ch;
    if (!S.noHL) {
      try { ch = (await pull('highlights', 'highlights', 'id')) || ch; }
      catch (e) { if (isMissingTable(e)) S.noHL = true; else throw e; }
    }
    localStorage.setItem('lastSync', nowISO());
  } catch (e) { console.error(e); errs.push(e.message || String(e)); }
  finally {
    syncing = false;
    if (ch) { await loadAll(); refreshUI(); queueAch(); }
    if (errs.length) {
      setSync('err', errs[0]);
      if (errs[0] !== lastErr) toast('Erro ao sincronizar: ' + errs[0], 5000);
      lastErr = errs[0];
    } else { setSync('idle'); lastErr = ''; }
    if (syncAgain) { syncAgain = false; queueSync(400); }
  }
}
/* re-desenha a tela sem atrapalhar a leitura */
function refreshUI() {
  if ($('#reader')) { if (R) R.pages.forEach((_, i) => paintMarks(i + 1)); updateMarkCount(); return; }
  render(); refreshSetup();
  const bo = $('#bookOv'); if (bo && bookById(bo.dataset.id)) { const y = bo.scrollTop; openBook(bo.dataset.id).then(o => { if (o) o.scrollTop = y; }); }
}
let rtOn = false;
function startRealtime() {
  if (!sb || rtOn) return; rtOn = true;
  try {
    const ping = () => queueSync(700);
    let ch = sb.channel('folio-sync');
    for (const t of ['books', 'sessions', 'settings']) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, ping);
    ch.subscribe();
    sb.channel('folio-hl').on('postgres_changes', { event: '*', schema: 'public', table: 'highlights' }, ping).subscribe();
  } catch (e) { console.warn('tempo real indisponível', e); }
}

/* =====================================================================
   Estatísticas e conquistas
   ===================================================================== */
function stats() {
  const byDay = {}, pgDay = {}; let secs = 0, pages = 0, night = 0, morning = 0, longest = 0;
  const weekends = new Set();
  for (const s of S.sessions) {
    const d = new Date(s.started_at), k = dk(d), sec = s.duration_sec || 0;
    byDay[k] = (byDay[k] || 0) + sec; pgDay[k] = (pgDay[k] || 0) + (s.pages_read || 0);
    secs += sec; pages += s.pages_read || 0; longest = Math.max(longest, sec);
    if (sec >= 300) {
      const h = d.getHours();
      if (h >= 22 || h < 4) night++;
      if (h >= 4 && h < 9) morning++;
      const wd = d.getDay();
      if (wd === 0 || wd === 6) { const sat = new Date(d); sat.setDate(d.getDate() - (wd === 0 ? 1 : 0)); weekends.add(dk(sat)); }
    }
  }
  const active = Object.keys(byDay).filter(k => byDay[k] >= 60).sort();
  let streak = 0; const d = new Date();
  if (!(byDay[dk(d)] >= 60)) d.setDate(d.getDate() - 1);
  while (byDay[dk(d)] >= 60) { streak++; d.setDate(d.getDate() - 1); }
  let best = 0, run = 0, prev = null;
  for (const k of active) {
    const t = new Date(k + 'T12:00:00');
    run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  const fin = S.books.filter(b => b.status === 'finished');
  const authors = new Set(fin.map(b => (b.author || '').trim().toLowerCase()).filter(Boolean));
  return {
    byDay, secs, pages, days: active.length, streak, best, finished: fin.length,
    goalDays: Object.values(byDay).filter(v => v >= S.goal * 60).length,
    longest: longest / 60, maxPgDay: Math.max(0, ...Object.values(pgDay)), night, morning, weekends: weekends.size,
    marks: S.hl.length, solved: S.hl.filter(h => h.kind === 'doubt' && h.resolved).length,
    reviews: S.books.filter(b => (b.review || '').trim().length >= 20).length, authors: authors.size
  };
}
const ACH = [
  { id: 'ferro', name: 'Leitor de Ferro', icon: 'file', desc: 'Páginas lidas no total', unit: 'páginas', val: s => s.pages, tiers: [100, 500, 1000, 5000, 10000] },
  { id: 'ofensiva', name: 'Chama Acesa', icon: 'flame', desc: 'Maior sequência de dias lendo', unit: 'dias', val: s => s.best, tiers: [3, 7, 14, 30, 100] },
  { id: 'disc', name: 'Disciplinado', icon: 'clock', desc: 'Horas de leitura somadas', unit: 'horas', val: s => s.secs / 3600, tiers: [1, 10, 25, 50, 100] },
  { id: 'biblio', name: 'Bibliófilo', icon: 'book', desc: 'Livros terminados', unit: 'livros', val: s => s.finished, tiers: [1, 5, 10, 25, 50] },
  { id: 'meta', name: 'Palavra Cumprida', icon: 'target', desc: 'Dias em que você bateu a meta', unit: 'dias', val: s => s.goalDays, tiers: [1, 7, 30, 100, 365] },
  { id: 'maratona', name: 'Maratonista', icon: 'hourglass', desc: 'Sua sessão mais longa', unit: 'min', val: s => s.longest, tiers: [45, 60, 90, 120, 180] },
  { id: 'devora', name: 'Devorador', icon: 'bolt', desc: 'Mais páginas num só dia', unit: 'páginas', val: s => s.maxPgDay, tiers: [30, 60, 100, 200, 300] },
  { id: 'coruja', name: 'Coruja', icon: 'moon', desc: 'Leituras depois das 22h', unit: 'leituras', val: s => s.night, tiers: [1, 5, 15, 30, 60] },
  { id: 'aurora', name: 'Madrugador', icon: 'sunrise', desc: 'Leituras antes das 9h', unit: 'leituras', val: s => s.morning, tiers: [1, 5, 15, 30, 60] },
  { id: 'sabado', name: 'Sábado Literário', icon: 'calendar', desc: 'Fins de semana com leitura', unit: 'fins de semana', val: s => s.weekends, tiers: [1, 4, 12, 26, 52] },
  { id: 'marca', name: 'Marca-texto', icon: 'marker', desc: 'Trechos marcados nos livros', unit: 'trechos', val: s => s.marks, tiers: [1, 10, 50, 150, 500] },
  { id: 'curioso', name: 'Mente Curiosa', icon: 'bulb', desc: 'Dúvidas que você resolveu', unit: 'dúvidas', val: s => s.solved, tiers: [1, 5, 15, 40, 100] },
  { id: 'critico', name: 'Crítico', icon: 'pen', desc: 'Resenhas escritas', unit: 'resenhas', val: s => s.reviews, tiers: [1, 3, 10, 25, 50] },
  { id: 'explora', name: 'Explorador', icon: 'compass', desc: 'Autores diferentes lidos', unit: 'autores', val: s => s.authors, tiers: [2, 5, 10, 20, 40] },
  { id: 'constancia', name: 'Constância', icon: 'leaf', desc: 'Dias com alguma leitura', unit: 'dias', val: s => s.days, tiers: [7, 30, 100, 200, 365] }
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const TIERN = ['Bloqueada', 'Bronze', 'Prata', 'Ouro', 'Safira', 'Lendária'];
const METAL = [['#8592a6', '#4b5870'], ['#e0a878', '#8a5634'], ['#e3e8ee', '#8a96a6'], ['#f1d27a', '#a77c22'], ['#9cc8f0', '#3a6aa6'], ['#f3e2ff', '#9c7ad6']];
const achLevel = (a, st) => a.tiers.filter(t => a.val(st) >= t).length;
function badgeSVG(a, lvl, size = 76) {
  const [c1, c2] = METAL[lvl], g = 'g' + a.id + lvl + size;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <circle cx="50" cy="48" r="40" fill="${lvl ? `url(#${g})` : 'none'}" opacity="${lvl ? .16 : 1}"/>
    <circle cx="50" cy="48" r="40" fill="none" stroke="url(#${g})" stroke-width="${lvl ? 4 : 2.5}" ${lvl ? '' : 'stroke-dasharray="4 5"'}/>
    <circle cx="50" cy="48" r="31" fill="none" stroke="url(#${g})" stroke-width="1.2" opacity=".55"/>
    <g transform="translate(29 27) scale(1.75)" fill="none" stroke="url(#${g})" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[a.icon]}</g>
    ${lvl ? `<rect x="35" y="80" width="30" height="17" rx="8.5" fill="url(#${g})"/><text x="50" y="92.5" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="700" fill="#16203a">${ROMAN[lvl]}</text>` : ''}
  </svg>`;
}
function achProgress(a, st) {
  const v = a.val(st), lvl = achLevel(a, st), nxt = a.tiers[lvl], prv = lvl ? a.tiers[lvl - 1] : 0;
  return { v, lvl, nxt, p: nxt ? clamp((v - prv) / (nxt - prv)) : 1 };
}
const UNIT1 = { páginas: 'página', dias: 'dia', horas: 'hora', livros: 'livro', leituras: 'leitura', 'fins de semana': 'fim de semana', trechos: 'trecho', dúvidas: 'dúvida', resenhas: 'resenha', autores: 'autor' };
const unitOf = (a, v) => (Math.floor(v) === 1 ? UNIT1[a.unit] || a.unit : a.unit);
const fmtV = v => v >= 10 || Number.isInteger(v) ? Math.floor(v).toLocaleString('pt-BR') : v.toFixed(1).replace('.', ',');

/* novas conquistas: compara com o que já foi comemorado (guardado e sincronizado) */
let achT = null;
function queueAch() { clearTimeout(achT); achT = setTimeout(checkAch, 700); }
async function checkAch() {
  if (sb && !localStorage.getItem('lastSync')) return;   // espera a primeira sincronização para não comemorar à toa
  const st = stats(), cur = {};
  for (const a of ACH) cur[a.id] = achLevel(a, st);
  if (!S.ach) { S.ach = cur; await saveSetting('ach', cur); const n = Object.values(cur).reduce((x, y) => x + y, 0); if (n) toast(`Você já tem ${n} níveis de conquistas. Veja no Perfil.`, 4000); return; }
  const fresh = ACH.filter(a => cur[a.id] > (S.ach[a.id] || 0));
  const next = mergeAch(S.ach, cur);
  if (JSON.stringify(next) !== JSON.stringify(S.ach)) { S.ach = next; await saveSetting('ach', next); }
  if (fresh.length) celebrate(fresh.map(a => ({ a, lvl: cur[a.id] })));
}
function celebrate(list) {
  const { a, lvl } = list[0];
  navigator.vibrate && navigator.vibrate([40, 60, 40]);
  const m = modal(`<div class="celebrate"><div class="eyebrow">Nova conquista · ${TIERN[lvl]}</div>
    <div class="bd">${badgeSVG(a, lvl, 150)}</div><h3>${esc(a.name)} ${ROMAN[lvl]}</h3>
    <p class="mut" style="margin:6px 0 20px">${esc(a.desc)}: ${a.tiers[lvl - 1].toLocaleString('pt-BR')} ${unitOf(a, a.tiers[lvl - 1])}.${a.tiers[lvl] ? `<br>Próximo nível: ${a.tiers[lvl].toLocaleString('pt-BR')}.` : '<br>Você chegou ao nível máximo!'}</p>
    <button class="btn" id="ceOk">${list.length > 1 ? `Próxima (${list.length - 1})` : 'Que bom!'}</button></div>`);
  $('#ceOk', m).onclick = () => { m.remove(); if (list.length > 1) celebrate(list.slice(1)); else if (!$('#reader')) render(); };
}

/* =====================================================================
   Interface — helpers
   ===================================================================== */
function modal(html, sticky = false) {
  const m = document.createElement('div'); m.className = 'md';
  m.innerHTML = `<div>${html}</div>`;
  if (sticky) m.dataset.sticky = '1';
  m.addEventListener('click', e => { if (e.target === m && !m.dataset.sticky) m.remove(); });
  document.body.appendChild(m); return m;
}
function overlay(html, cls = '') {
  const o = document.createElement('div'); o.className = 'ov ' + cls; o.innerHTML = `<div class="inner">${html}</div>`;
  document.body.appendChild(o); hydrateCovers(o); return o;
}
function askNumber({ title, label, value, min = 0, max = 99999, hint = '' }) {
  return new Promise(ok => {
    const m = modal(`<h3>${esc(title)}</h3>${hint ? `<p class="mut" style="margin:2px 0 0">${hint}</p>` : ''}
      <label class="fld bignum"><span>${esc(label)}</span><input id="anIn" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value ?? ''}"></label>
      <div style="margin-top:18px"><button class="btn" id="anOk">Salvar</button><button class="btn sec2" id="anNo">Cancelar</button></div>`);
    const inp = $('#anIn', m);
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const done = v => { m.remove(); ok(v); };
    $('#anOk', m).onclick = () => { const v = parseInt(inp.value); if (isNaN(v)) { inp.focus(); return; } done(clamp(v, min, max)); };
    $('#anNo', m).onclick = () => done(null);
    inp.onkeydown = e => { if (e.key === 'Enter') $('#anOk', m).click(); };
    m.addEventListener('click', e => { if (e.target === m) ok(null); });
  });
}
function askConfirm(title, text, okLabel = 'Confirmar') {
  return new Promise(ok => {
    const m = modal(`<h3>${esc(title)}</h3><p class="mut" style="margin:6px 0 18px">${text}</p>
      <button class="btn danger" id="acOk">${esc(okLabel)}</button><button class="btn sec2" id="acNo">Cancelar</button>`);
    $('#acOk', m).onclick = () => { m.remove(); ok(true); };
    $('#acNo', m).onclick = () => { m.remove(); ok(false); };
    m.addEventListener('click', e => { if (e.target === m) ok(false); });
  });
}
const lastRead = b => { let t = ''; for (const s of S.sessions) if (s.book_id === b.id && s.started_at > t) t = s.started_at; return t || b.updated_at || ''; };
const KIND = { like: { n: 'Gostei', icon: 'heart' }, doubt: { n: 'Não entendi', icon: 'help' }, note: { n: 'Nota', icon: 'pen' } };

function render() {
  const v = $('#view');
  ({ home: viewHome, library: viewLibrary, stats: viewStats, profile: viewProfile }[S.tab])(v);
  renderNav();
}
function renderNav() {
  const it = (t, i, n) => `<button class="ni ${S.tab === t ? 'on' : ''}" data-act="tab" data-v="${t}" aria-label="${n}">${ic(i, 24)}<span>${n}</span></button>`;
  $('#nav').innerHTML = it('home', 'home', 'Início') + it('library', 'library', 'Biblioteca') +
    `<button class="go" data-act="read" aria-label="Ler agora">${LOGO(34)}</button>` +
    it('stats', 'chart', 'Números') + it('profile', 'user', 'Perfil');
}

/* ---------- Início ---------- */
function viewHome(v) {
  const st = stats(), today = st.byDay[dk(new Date())] || 0, goal = S.goal * 60, p = Math.min(1, today / goal);
  const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - (now.getDay() + 6) % 7);
  let wk = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const key = dk(d), isT = key === dk(now), fut = d > now && !isT, done = (st.byDay[key] || 0) >= 60;
    wk += `<div><div class="wd">${WD[i]}</div><div class="dc ${done ? 'done' : ''} ${isT ? 'today' : ''} ${fut ? 'fut' : ''}">${d.getDate()}</div></div>`;
  }
  const reading = S.books.filter(b => b.status === 'reading').sort((a, b) => lastRead(b).localeCompare(lastRead(a)));
  const shelf = reading.length ? `<div class="row">${reading.map(b => `<button class="bk" data-act="setup" data-id="${b.id}">
      ${coverHTML(b)}<div class="pct"><span>${pct(b)}%</span><span>p. ${b.current_page || 0}</span></div><div class="bar"><i style="width:${pct(b)}%"></i></div></button>`).join('')}</div>`
    : `<div class="empty"><b>Sua estante está vazia</b>Cadastre um livro com o PDF para começar a ler.
       <div style="margin-top:16px"><button class="btn sm" data-act="add">Adicionar livro</button></div></div>`;
  // próxima conquista (a mais perto de subir de nível)
  const near = ACH.map(a => ({ a, ...achProgress(a, st) })).filter(x => x.nxt).sort((x, y) => y.p - x.p)[0];
  const doubts = S.hl.filter(h => h.kind === 'doubt' && !h.resolved).length;
  const minis = `<div class="minis">
    ${near ? `<button class="mini" data-act="achInfo" data-id="${near.a.id}"><div class="mi">${badgeSVG(near.a, near.lvl, 44)}</div><div style="min-width:0;flex:1">
      <small>Próxima conquista</small><b>${esc(near.a.name)} ${ROMAN[near.lvl + 1]}</b><div class="pb"><i style="width:${Math.round(near.p * 100)}%"></i></div>
      <small>${fmtV(near.v)} / ${near.nxt.toLocaleString('pt-BR')} ${near.a.unit}</small></div></button>` : ''}
    <button class="mini doubt" data-act="goMarks" data-v="doubt"><div class="mi">${ic('help', 24)}</div><div><small>Para revisar</small>
      <b>${doubts ? `${doubts} ${doubts === 1 ? 'trecho' : 'trechos'}` : 'Nenhuma dúvida'}</b><small>${doubts ? 'que você não entendeu' : 'Marque no leitor'}</small></div></button></div>`;
  v.innerHTML = `
    <div class="top"><button class="syncb" data-act="settings"><span id="syncDot" class="dot ${dotCls()}"></span><span id="syncLbl">${syncLabel()}</span></button>
      <button class="ib" data-act="settings" aria-label="Ajustes">${ic('gear', 20)}</button></div>
    ${!sb ? `<div class="warn">${ic('help', 20)}<div><b>Sincronização desligada.</b> Preencha o config.js para ver os mesmos livros no celular e no tablet.</div></div>` : ''}
    <div class="hello"><div class="eyebrow">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greeting()}</h1></div>
    <div class="card"><div class="week">${wk}</div>
    <div class="goal">
      <svg viewBox="0 0 300 160" width="100%"><path class="arc-bg" d="M30 150A120 120 0 0 1 270 150" fill="none" stroke-width="16" stroke-linecap="round"/>
        <path class="arc-fg" d="M30 150A120 120 0 0 1 270 150" pathLength="100" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(p * 100).toFixed(2)} 100" opacity="${p > 0 ? 1 : 0}"/></svg>
      <div class="in"><div class="lbl">Leitura de hoje</div><div class="tm">${fmtMin(today)}</div>
      <div class="sub">${p >= 1 ? 'Meta de hoje cumprida ✓' : `da sua meta de ${S.goal} minutos`}</div></div></div></div>
    ${minis}
    <div class="sec"><h2>Continue lendo</h2>${reading.length ? '<button class="lnk" data-act="tab" data-v="library">Ver todos</button>' : ''}</div>${shelf}`;
  hydrateCovers(v);
}

/* ---------- Biblioteca ---------- */
function viewLibrary(v) {
  const seg = `<div class="seg"><button class="${S.libv === 'books' ? 'on' : ''}" data-act="libv" data-v="books">Livros</button>
    <button class="${S.libv === 'marks' ? 'on' : ''}" data-act="libv" data-v="marks">Marcações${S.hl.length ? ` · ${S.hl.length}` : ''}</button></div>`;
  if (S.libv === 'marks') { v.innerHTML = `<div class="top"><h1>Biblioteca</h1></div>${seg}${marksView()}`; hydrateCovers(v); return; }
  const f = S.lib, list = S.books.filter(b => f === 'all' || b.status === f).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  const chip = (k, n) => `<button class="chip ${f === k ? 'on' : ''}" data-act="plib" data-v="${k}">${n}</button>`;
  v.innerHTML = `<div class="top"><h1>Biblioteca</h1><span class="mut">${S.books.length} ${S.books.length === 1 ? 'livro' : 'livros'}</span></div>${seg}
    <div class="chips">${chip('all', 'Todos')}${chip('reading', 'Lendo')}${chip('finished', 'Já lidos')}${chip('want', 'Quero ler')}</div>
    ${list.length ? `<div class="grid">${list.map(b => `<button class="bcard" data-act="book" data-id="${b.id}">${coverHTML(b)}
      <div class="t">${esc(b.title)}</div><div class="a">${esc(b.author || ' ')}</div>
      <div class="bar"><i style="width:${b.status === 'finished' ? 100 : pct(b)}%"></i></div></button>`).join('')}</div>`
      : `<div class="empty"><b>Nada por aqui</b>Toque no botão + para cadastrar um livro.</div>`}
    <button class="fab" data-act="add" aria-label="Adicionar livro">${ic('plus', 26, 2)}</button>`;
  hydrateCovers(v);
}
function markItem(h, showPage = true) {
  return `<button class="mark k-${h.kind} ${h.resolved ? 'res' : ''}" data-act="markOpen" data-id="${h.id}">
    ${h.text ? `<div class="q">“${esc(h.text)}”</div>` : `<div class="q noq">Trecho marcado (imagem ou texto não reconhecido)</div>`}
    ${h.note ? `<div class="nt">${esc(h.note)}</div>` : ''}
    <div class="mf"><span class="kd">${KIND[h.kind].n}${h.kind === 'doubt' && h.resolved ? ' · resolvida ✓' : ''}</span>${showPage ? `<span>· página ${h.page}</span>` : ''}</div></button>`;
}
function filterMarks(list, k) {
  return list.filter(h => k === 'all' || (k === 'doubt' ? h.kind === 'doubt' && !h.resolved : h.kind === k));
}
function markChips(list, cur, act) {
  const c = (k, n, col) => `<button class="chip ${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}">${col ? `<i style="background:${col}"></i>` : ''}${n} <span style="opacity:.7">${filterMarks(list, k).length}</span></button>`;
  return `<div class="chips">${c('all', 'Todas')}${c('like', 'Gostei', 'var(--like)')}${c('doubt', 'Para revisar', 'var(--doubt)')}${c('note', 'Notas', 'var(--note)')}</div>`;
}
function marksView() {
  let base = S.hl;
  if (S.mbook) base = base.filter(h => h.book_id === S.mbook);
  const list = filterMarks(base, S.mk);
  const mb = S.mbook && bookById(S.mbook);
  let out = (mb ? `<div class="chips" style="margin-bottom:8px"><button class="chip on" data-act="mbookClear">${ic('x', 14, 2.2)} ${esc(mb.title)}</button></div>` : '') + markChips(base, S.mk, 'mkf');
  if (S.noHL) out += `<div class="warn">${ic('help', 20)}<div><b>Marcações só neste aparelho.</b> Rode o novo supabase-setup.sql no Supabase para sincronizá-las.</div></div>`;
  if (!list.length) return out + `<div class="empty"><b>${S.hl.length ? 'Nada neste filtro' : 'Nenhuma marcação ainda'}</b>No leitor, toque no marca-texto ${ic('marker', 16)} e arraste do começo ao fim de um trecho.</div>`;
  const groups = {};
  for (const h of list) (groups[h.book_id] = groups[h.book_id] || []).push(h);
  const ids = Object.keys(groups).sort((a, b) => (bookById(a)?.title || '').localeCompare(bookById(b)?.title || '', 'pt-BR'));
  for (const id of ids) {
    const b = bookById(id), items = groups[id].sort((x, y) => x.page - y.page || x.rects?.[0]?.[1] - y.rects?.[0]?.[1]);
    out += `<div class="bookhd">${b ? coverHTML(b) : ''}<div><b>${esc(b ? b.title : 'Livro removido')}</b><small>${items.length} ${items.length === 1 ? 'marcação' : 'marcações'}</small></div></div>`;
    out += items.map(h => markItem(h)).join('');
  }
  return out;
}

/* ---------- Estatísticas ---------- */
function viewStats(v) {
  const st = stats(), n = S.range, days = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const mins = days.map(d => Math.round((st.byDay[dk(d)] || 0) / 60)), keys = new Set(days.map(dk));
  let secs = 0, pg = 0;
  for (const s of S.sessions) if (keys.has(dk(s.started_at))) { secs += s.duration_sec || 0; pg += s.pages_read || 0; }
  const max = Math.max(S.goal, ...mins, 10), W = 340, H = 150, bw = (W - 8) / n;
  const bars = mins.map((m, i) => {
    const h = m / max * H, x = 4 + i * bw, step = Math.ceil(n / 6);
    const lab = n === 7 ? WD[(days[i].getDay() + 6) % 7] : (i % step === 0 || i === n - 1 ? days[i].getDate() : '');
    return `<rect class="c-bar ${m >= S.goal ? 'hit' : ''}" x="${x + bw * .18}" y="${H - h}" width="${bw * .64}" height="${Math.max(h, m ? 2 : 0)}" rx="${Math.min(5, bw * .25)}"/>
      <text class="c-lab" x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="11">${lab}</text>`;
  }).join('');
  const gy = H - S.goal / max * H;
  v.innerHTML = `<div class="top"><h1>Números</h1></div>
    <div class="seg">${[7, 30, 90].map(r => `<button class="${n === r ? 'on' : ''}" data-act="range" data-v="${r}">${r} dias</button>`).join('')}</div>
    <div class="chart"><div class="mut" style="font-size:13.5px;margin:0 4px 8px">Minutos lidos por dia</div>
      <svg viewBox="0 0 ${W} ${H + 26}" width="100%"><line class="c-goal" x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke-dasharray="4 4"/>${bars}</svg>
      <div class="mut" style="font-size:12.5px;margin:2px 4px 4px">A linha tracejada é a sua meta de ${S.goal} min.</div></div>
    <div class="kpis">
      <div class="kpi"><b>${fmtDur(secs)}</b><span>Tempo lido no período</span></div>
      <div class="kpi"><b>${pg}</b><span>Páginas lidas</span></div>
      <div class="kpi"><b>${Math.round(secs / n / 60)} min</b><span>Média por dia</span></div>
      <div class="kpi"><b>${secs > 60 ? (pg / (secs / 3600)).toFixed(0) : '–'}</b><span>Páginas por hora</span></div>
      <div class="kpi"><b>${st.streak}</b><span>Sequência atual (dias)</span></div>
      <div class="kpi"><b>${st.best}</b><span>Maior sequência (dias)</span></div></div>`;
}

/* ---------- Perfil ---------- */
function viewProfile(v) {
  const tab = (k, n) => `<button class="${S.ptab === k ? 'on' : ''}" data-act="ptab" data-v="${k}">${n}</button>`;
  const body = { voce: profileYou, ach: profileAch, ativ: profileActivity, estante: profileShelf }[S.ptab]();
  v.innerHTML = `<div class="top"><h1>Perfil</h1></div><div class="tabs">${tab('voce', 'Você')}${tab('ach', 'Conquistas')}${tab('ativ', 'Atividades')}${tab('estante', 'Estante')}</div>${body}`;
  hydrateCovers(v);
}
function profileYou() {
  const st = stats(), favs = S.books.filter(b => b.favorite).slice(0, 3);
  const slots = [0, 1, 2].map(i => favs[i] ? `<button data-act="book" data-id="${favs[i].id}">${coverHTML(favs[i])}</button>` : `<div class="slot"></div>`).join('');
  const hrs = st.secs / 3600;
  const row = (i, l, val) => `<div class="stat">${ic(i, 22)}<span>${l}</span><span>${val}</span></div>`;
  const got = ACH.map(a => ({ a, lvl: achLevel(a, st) })).filter(x => x.lvl).sort((x, y) => y.lvl - x.lvl).slice(0, 4);
  return `<div class="lab" style="margin-top:6px">Livros favoritos</div><div class="favs">${slots}</div>
    <p class="note">Toque no coração de um livro para fixá-lo aqui.</p>
    <div class="lab">Conquistas em destaque</div>
    ${got.length ? `<div class="achgrid" style="grid-template-columns:repeat(4,1fr);margin-top:0">${got.map(x => `<button data-act="achInfo" data-id="${x.a.id}" style="display:grid;justify-items:center;gap:4px">${badgeSVG(x.a, x.lvl, 64)}<span style="font-size:12px;color:var(--mut);text-align:center;line-height:1.2">${esc(x.a.name)}</span></button>`).join('')}</div>`
      : `<p class="mut" style="margin:0">Leia um pouco para desbloquear a primeira. <button class="lnk" data-act="ptab" data-v="ach">Ver todas</button></p>`}
    <div class="lab">Estatísticas</div>
    ${row('flame', 'Sequência atual', st.streak + (st.streak === 1 ? ' dia' : ' dias'))}${row('calendar', 'Dias com leitura', st.days)}${row('file', 'Páginas totais', st.pages.toLocaleString('pt-BR'))}
    ${row('clock', 'Horas lidas', hrs >= 1 ? Math.floor(hrs) + 'h ' + pad(Math.round(hrs % 1 * 60)) + 'm' : Math.round(hrs * 60) + 'm')}${row('book', 'Livros terminados', st.finished)}${row('marker', 'Trechos marcados', st.marks)}`;
}
function profileAch() {
  const st = stats(), all = ACH.map(a => ({ a, ...achProgress(a, st) }));
  const total = ACH.length * 5, have = all.reduce((x, y) => x + y.lvl, 0), p = have / total;
  return `<div class="card achsum"><svg class="ring" viewBox="0 0 80 80"><circle cx="40" cy="40" r="33" fill="none" stroke="var(--s2)" stroke-width="8"/>
      <circle cx="40" cy="40" r="33" fill="none" stroke="var(--acc)" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="${(p * 100).toFixed(1)} 100" transform="rotate(-90 40 40)"/>
      <text x="40" y="45" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor">${Math.round(p * 100)}%</text></svg>
    <div><b>${have} de ${total} níveis</b><div class="mut" style="font-size:14px">${all.filter(x => x.lvl).length} de ${ACH.length} conquistas desbloqueadas. Toque numa para ver os níveis.</div></div></div>
    <div class="achgrid">${all.map(x => `<button class="ach ${x.lvl ? '' : 'lock'}" data-act="achInfo" data-id="${x.a.id}">${badgeSVG(x.a, x.lvl)}
      <div class="n">${esc(x.a.name)}</div><div class="d">${esc(x.a.desc)}</div>
      <div class="pb"><i style="width:${Math.round(x.p * 100)}%"></i></div>
      <div class="v">${x.nxt ? `${fmtV(x.v)} / ${x.nxt.toLocaleString('pt-BR')}` : 'Nível máximo'}</div></button>`).join('')}</div>`;
}
function achInfo(id) {
  const a = ACH.find(x => x.id === id); if (!a) return;
  const st = stats(), { v, lvl, nxt } = achProgress(a, st);
  modal(`<div class="center"><div style="width:120px;margin:4px auto 6px">${badgeSVG(a, lvl, 120)}</div>
    <div class="eyebrow">${TIERN[lvl]}</div><h3 style="margin-top:4px">${esc(a.name)}</h3><p class="mut" style="margin:4px 0 0">${esc(a.desc)}</p></div>
    <div class="tiers">${a.tiers.map((t, i) => `<div class="${i < lvl ? 'got' : ''}"><b>${ROMAN[i + 1]}</b>${t.toLocaleString('pt-BR')}</div>`).join('')}</div>
    <p class="center" style="margin:12px 0 18px">Você tem <b>${fmtV(v)}</b> ${unitOf(a, v)}.${nxt ? ` Faltam <b>${fmtV(Math.max(0, nxt - v))}</b> para o nível ${ROMAN[lvl + 1]}.` : ''}</p>
    <button class="btn sec2" onclick="this.closest('.md').remove()">Fechar</button>`);
}
function profileActivity() {
  const items = [];
  for (const s of S.sessions) items.push({ t: s.started_at, k: 's', s });
  for (const b of S.books) if (b.status === 'finished' && b.finished_at) items.push({ t: b.finished_at, k: 'f', b });
  items.sort((a, b) => b.t.localeCompare(a.t));
  if (!items.length) return ADDBTN + `<div class="empty"><b>Sem atividades ainda</b>Suas sessões de leitura vão aparecer aqui.</div>`;
  return ADDBTN + items.slice(0, 150).map(it => {
    if (it.k === 'f') {
      const b = it.b, r = b.rating || 0;
      return `<div class="act"><div class="hd">Terminou este livro</div><div class="w"><div class="cover-w">${coverHTML(b)}</div><div style="min-width:0">
        <h3>${esc(b.title)}</h3><div class="meta">${esc(b.author)}</div>
        ${r ? `<div style="margin-top:8px"><span class="st">${'★'.repeat(r)}<span style="opacity:.25">${'★'.repeat(5 - r)}</span></span></div>` : ''}
        ${b.review ? `<div class="rev">${esc(b.review)}</div>` : ''}</div></div><div class="acts"><button data-act="editFin" data-id="${b.id}">Editar avaliação</button><button class="del" data-act="delFin" data-id="${b.id}">Remover</button></div></div>`;
    }
    const s = it.s, b = bookById(s.book_id);
    return `<div class="act"><div class="w">${b ? `<div>${coverHTML(b)}</div>` : ''}<div style="min-width:0">
      <h3>${periodName(s.started_at)}</h3><div class="meta">${fmtDate(s.started_at)}</div><div class="meta">${esc(b ? b.title : 'Livro removido')}</div>
      <div class="nums"><div><small>Tempo</small>${fmtDur(s.duration_sec)}</div><div><small>Páginas</small>${s.pages_read}</div></div></div></div><div class="acts"><button data-act="editSess" data-id="${s.id}">Editar</button><button class="del" data-act="delSess" data-id="${s.id}">Excluir</button></div></div>`;
  }).join('');
}
function profileShelf() {
  const per = innerWidth > 700 ? 6 : 4, groups = [['Lendo', 'reading'], ['Já lidos', 'finished'], ['Quero ler', 'want']];
  const out = groups.map(([n, k]) => {
    const list = S.books.filter(b => b.status === k); if (!list.length) return '';
    let rows = '';
    for (let i = 0; i < list.length; i += per) {
      const part = list.slice(i, i + per);
      rows += `<div class="shelf" style="grid-template-columns:repeat(${per},1fr)">${part.map(b => `<button class="bk" data-act="book" data-id="${b.id}">${coverHTML(b)}</button>`).join('')}</div><div class="ledge"></div>`;
    }
    return `<div class="tag">${n} · ${list.length}</div>${rows}`;
  }).join('');
  return `<div class="shelfwrap">${out || '<div class="empty"><b>Estante vazia</b>Cadastre livros na Biblioteca.</div>'}</div>`;
}

/* ---------- Detalhe do livro ---------- */
async function openBook(id) {
  const b = bookById(id); if (!b) return;
  const local = await hasLocalPdf(id);
  $$('.ov').forEach(o => o.remove());
  const hs = S.hl.filter(h => h.book_id === id);
  const cnt = k => hs.filter(h => h.kind === k).length;
  const o = overlay(`<div class="bar-top"><button class="ib" data-act="closeOv" aria-label="Fechar">${ic('x', 20)}</button>
      <button class="ib" data-act="fav" data-id="${id}" aria-label="Favorito" style="${b.favorite ? 'color:#e88b8b' : ''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="${b.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON.heart}</svg></button></div>
    <div class="det">${coverHTML(b)}<div style="min-width:0"><h1>${esc(b.title)}</h1><div class="mut" style="margin-top:6px">${esc(b.author || 'Autor desconhecido')}</div>
      <div style="margin-top:14px;font-size:15px">Página ${b.current_page || 0} de ${b.total_pages || '?'}</div><div class="bar"><i style="width:${b.status === 'finished' ? 100 : pct(b)}%"></i></div>
      <div class="badge-sm">${b.pdf_path || local ? (local ? '✓ Disponível offline' : '☁ Na nuvem (baixa ao abrir)') : '⚠ Sem PDF'}</div>
      ${b._upPdf ? '<div class="badge-sm">⏳ Aguardando envio do PDF</div>' : ''}
      ${hs.length ? `<div class="mcount"><span class="k-like"><i></i>${cnt('like')}</span><span class="k-doubt"><i></i>${cnt('doubt')}</span><span class="k-note"><i></i>${cnt('note')}</span></div>` : ''}</div></div>
    ${b.status === 'finished' && b.rating ? `<p class="center" style="margin:22px 0 0"><span style="color:var(--gold);font-size:24px;letter-spacing:3px">${'★'.repeat(b.rating)}</span></p>` : ''}
    ${b.review ? `<div class="quote" style="margin-top:16px">${esc(b.review)}</div>` : ''}
    <div style="margin-top:24px">
      <button class="btn" data-act="setup" data-id="${id}">${ic('book', 20)} ${b.status === 'finished' ? 'Reler' : 'Ler agora'}</button>
      ${hs.length ? `<button class="btn sec2" data-act="bookMarks" data-id="${id}">${ic('marker', 20)} Ver marcações (${hs.length})</button>` : ''}
      ${b.status !== 'finished' ? `<button class="btn sec2" data-act="finishBook" data-id="${id}">Marcar como lido</button>` : `<button class="btn sec2" data-act="reopen" data-id="${id}">Voltar para "Lendo"</button>`}
      <button class="btn sec2" data-act="edit" data-id="${id}">Editar livro</button>
      <button class="btn danger" data-act="del" data-id="${id}">Excluir livro</button></div>`);
  o.id = 'bookOv'; o.dataset.id = id;
  return o;
}

/* ---------- Cadastro / edição ---------- */
function openForm(id) {
  const b = id ? bookById(id) : null;
  let coverBlob = null, pdfBlob = null, autoCover = false;
  const m = modal(`<h3>${b ? 'Editar livro' : 'Novo livro'}</h3>
    <label class="fld"><span>Título</span><input id="fTitle" value="${esc(b?.title)}" autocomplete="off"></label>
    <label class="fld"><span>Autor</span><input id="fAuthor" value="${esc(b?.author)}" autocomplete="off"></label>
    <div class="two"><label class="fld"><span>Total de páginas</span><input id="fPages" type="number" inputmode="numeric" min="0" value="${b?.total_pages || ''}"></label>
      <label class="fld"><span>Situação</span><select id="fStatus">${[['reading', 'Lendo'], ['want', 'Quero ler'], ['finished', 'Já lido']].map(([k, n]) => `<option value="${k}" ${(b?.status || 'reading') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    ${b ? `<label class="fld"><span>Página em que você está</span><input id="fCur" type="number" inputmode="numeric" min="0" value="${b.current_page || 0}"></label>` : ''}
    <label class="fld"><span>Arquivo PDF</span><input id="fPdf" type="file" accept="application/pdf,.pdf"></label>
    <label class="fld"><span>Foto da capa (opcional)</span><input id="fCover" type="file" accept="image/*"></label>
    <div class="cover preview" id="fPrevBox" hidden><img id="fPrev" alt="" hidden></div>
    <p class="note" id="fNote">${b ? 'Deixe os arquivos em branco para manter os atuais.' : 'Ao escolher o PDF, o app preenche o total de páginas e cria a capa a partir da primeira página.'}</p>
    <div style="margin-top:18px"><button class="btn" id="fSave">Salvar livro</button><button class="btn sec2" id="fCancel">Cancelar</button></div>`, true);
  const note = t => $('#fNote', m).textContent = t;
  const showPrev = blob => { const u = URL.createObjectURL(blob); const i = $('#fPrev', m); i.src = u; i.hidden = false; $('#fPrevBox', m).hidden = false; };
  if (b && coverURLs[b.id]) { const img = $('#fPrev', m); img.src = coverURLs[b.id]; img.hidden = false; $('#fPrevBox', m).hidden = false; }

  $('#fCover', m).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { coverBlob = await toJpeg(f); autoCover = false; showPrev(coverBlob); } catch { note('Não consegui ler essa imagem.'); }
  };
  $('#fPdf', m).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    pdfBlob = f; note('Lendo o PDF…');
    try {
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
      $('#fPages', m).value = pdf.numPages;
      if (!$('#fTitle', m).value.trim()) $('#fTitle', m).value = f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ');
      if (!coverBlob || autoCover) {
        const pg = await pdf.getPage(1), v1 = pg.getViewport({ scale: 1 }), v2 = pg.getViewport({ scale: 480 / v1.width });
        const c = document.createElement('canvas'); c.width = v2.width; c.height = v2.height;
        await pg.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
        coverBlob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .85)); autoCover = true; showPrev(coverBlob);
      }
      const mb = f.size / 1048576;
      note(`PDF com ${pdf.numPages} páginas (${mb.toFixed(1)} MB).` + (mb > 50 ? ' Atenção: acima de 50 MB o envio para a nuvem pode falhar no plano grátis.' : ''));
      pdf.destroy();
    } catch (err) { console.error(err); note('Não consegui ler este PDF. Ele continuará sem o total de páginas automático.'); }
  };
  $('#fCancel', m).onclick = () => m.remove();
  $('#fSave', m).onclick = async () => {
    const title = $('#fTitle', m).value.trim();
    if (!title) { note('Digite o título do livro.'); $('#fTitle', m).focus(); return; }
    const nb = b || { id: uid(), created_at: nowISO(), current_page: 0, favorite: false, rating: null, review: '', finished_at: null, cover_path: null, pdf_path: null, deleted: false };
    nb.title = title; nb.author = $('#fAuthor', m).value.trim();
    nb.total_pages = Math.max(0, parseInt($('#fPages', m).value) || 0);
    if ($('#fCur', m)) nb.current_page = Math.max(0, parseInt($('#fCur', m).value) || 0);
    nb.status = $('#fStatus', m).value;
    if (nb.status === 'finished' && !nb.finished_at) { nb.finished_at = nowISO(); if (nb.total_pages) nb.current_page = nb.total_pages; }
    if (nb.status !== 'finished') nb.finished_at = null;
    if (nb.total_pages && nb.current_page > nb.total_pages) nb.current_page = nb.total_pages;
    if (coverBlob) { await DB.put('blobs', { key: 'cover:' + nb.id, blob: coverBlob }); nb._upCover = true; if (coverURLs[nb.id]) URL.revokeObjectURL(coverURLs[nb.id]); delete coverURLs[nb.id]; }
    if (pdfBlob) { await DB.put('blobs', { key: 'pdf:' + nb.id, blob: pdfBlob }); nb._upPdf = true; }
    await saveBook(nb);
    m.remove(); $$('.ov').forEach(o => o.remove()); render();
    toast(sb ? (pdfBlob ? 'Livro salvo. Enviando o PDF para a nuvem…' : 'Livro salvo.') : 'Livro salvo neste aparelho.');
  };
}

/* ---------- Preparar leitura ---------- */
const SU = { id: null, mode: localStorage.getItem('suMode') || 'timed', min: +localStorage.getItem('suMin') || 30 };
function setupHTML() {
  const b = bookById(SU.id);
  return `<div class="bar-top"><button class="ib" data-act="closeOv" aria-label="Fechar">${ic('x', 20)}</button><button class="lnk" data-act="swap">Trocar livro</button></div>
    <div class="setup"><div class="cv">${coverHTML(b)}</div><h1>${esc(b.title)}</h1><div class="au">${esc(b.author || '')}</div>
    <div class="where"><div><small>Você está na</small><b>Página ${b.current_page || 1} de ${b.total_pages || '?'}</b></div>
      <button class="ed" data-act="editPage">${ic('pen', 16)} Editar</button></div>
    <div class="where"><div><small>Total de páginas</small><b>${b.total_pages || 'Não informado'}</b></div>
      <button class="ed" data-act="editTotal">${ic('pen', 16)} Ajustar</button></div>
    <div class="pill2" style="margin-top:18px"><button class="pill ${SU.mode === 'timed' ? 'on' : ''}" data-act="suMode" data-v="timed">${ic('clock', 20)} Cronometrado</button>
      <button class="pill ${SU.mode === 'free' ? 'on' : ''}" data-act="suMode" data-v="free">${ic('inf', 22)} Leitura livre</button></div>
    ${SU.mode === 'timed' ? `<div class="big" id="suBig">${SU.min} min</div>
      <input type="range" id="suRange" min="5" max="120" step="5" value="${SU.min}" aria-label="Minutos">
      <div class="presets">${[15, 30, 45, 60].map(n => `<button class="${SU.min === n ? 'on' : ''}" data-act="suPre" data-v="${n}">${n}</button>`).join('')}</div>`
      : `<p class="freebox">O cronômetro conta para cima.<br>Encerre quando quiser.</p>`}
    <button class="btn" data-act="start">Iniciar leitura</button></div>`;
}
function openSetup(id) {
  SU.id = id; $$('.ov').forEach(o => o.remove());
  const o = overlay(setupHTML()); o.id = 'setupOv';
}
function refreshSetup() { const o = $('#setupOv'); if (o) { o.firstElementChild.innerHTML = setupHTML(); hydrateCovers(o); } }

/* =====================================================================
   Leitor de PDF (rolagem contínua) + marca-texto
   ===================================================================== */
let R = null;
const RTHEMES = ['paper', 'mist', 'night'], RTN = { paper: 'Papel', mist: 'Névoa', night: 'Noite' };
async function startReading() {
  const b = bookById(SU.id); if (!b) return;
  localStorage.setItem('suMode', SU.mode); localStorage.setItem('suMin', SU.min);
  if (!b.pdf_path && !(await hasLocalPdf(b.id))) { toast('Este livro não tem PDF. Abra "Editar livro" e adicione um.', 4000); return; }
  let rec = await DB.get('blobs', 'pdf:' + b.id), blob = rec && rec.blob;
  if (!blob) {
    if (!navigator.onLine) { toast('Sem internet, e o PDF ainda não foi baixado neste aparelho.', 4000); return; }
    toast('Baixando o PDF…', 60000);
    blob = await getBlob('pdf', b);
    $('#toast').classList.remove('show');
    if (!blob) { toast('Não consegui baixar o PDF. Tente de novo.', 4000); return; }
  }
  openReader(b, blob, SU.mode, SU.min);
}
async function openReader(b, blob, mode, min) {
  const theme = RTHEMES.includes(localStorage.getItem('rTheme')) ? localStorage.getItem('rTheme') : 'paper';
  const el = document.createElement('div'); el.id = 'reader'; el.className = 'th-' + theme;
  el.innerHTML = `<header id="rTop"><button class="ib" data-act="rClose" aria-label="Encerrar leitura">${ic('x', 20)}</button>
    <button id="rTimer" data-act="rPause" aria-label="Pausar"><span id="rT">00:00</span><small id="rSub"></small></button>
    <button class="ib" data-act="rMarks" aria-label="Marcações">${ic('list', 20)}<span class="cnt" id="rMC"></span></button></header>
    <div id="rStage"><div id="rWrap"></div><div id="rMsg">Abrindo o livro…</div></div>
    <div id="rHint" class="hidden">Arraste do começo ao fim do trecho</div>
    <footer id="rBot"><div class="frow"><button class="ib" data-act="rZout" aria-label="Diminuir">${ic('zout', 20)}</button>
      <button class="ib" data-act="rTheme" aria-label="Cor da página">${ic('contrast', 20)}</button>
      <button id="rPg" data-act="rGo" aria-label="Ir para a página">–</button>
      <button class="ib" id="rMarkBtn" data-act="rMark" aria-label="Marca-texto">${ic('marker', 20)}</button>
      <button class="ib" data-act="rZin" aria-label="Aumentar">${ic('zin', 20)}</button></div>
      <input type="range" id="rSeek" min="1" max="1" value="1" aria-label="Posição no livro"></footer>`;
  document.body.appendChild(el);
  let pdf, p1;
  try { pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise; p1 = await pdf.getPage(1); }
  catch (e) { console.error(e); el.remove(); toast('Não consegui abrir este PDF.'); return; }
  if (!el.isConnected) { try { pdf.destroy(); } catch { } return; }
  $('#rMsg').remove();
  if (!b.total_pages) { b.total_pages = pdf.numPages; await saveBook(b); }
  const start = Math.min(Math.max(1, b.current_page || 1), pdf.numPages);
  const base1 = p1.getViewport({ scale: 1 });
  R = { b, pdf, el, asp: new Array(pdf.numPages).fill(base1.height / base1.width), lastScroll: 0,
    page: start, startPage: start, furthest: start, read: 0, zoom: 1,
    mode, target: min * 60000, acc: 0, last: Date.now(), paused: false, done: false, startedAt: nowISO(),
    wake: null, draftAt: 0, theme, marking: false, drag: null, tc: {}, lastKind: localStorage.getItem('lastKind') || 'like',
    pages: [], rendered: new Set(), visible: new Set(), gen: 0, align: true, pumping: false, raf: 0, stageW: 0, pinch: null, seeking: false };
  const stage = $('#rStage'), seek = $('#rSeek');
  seek.max = pdf.numPages;
  seek.addEventListener('pointerdown', () => { if (R) R.seeking = true; });
  ['pointerup', 'pointercancel', 'change'].forEach(ev => seek.addEventListener(ev, () => { if (R) R.seeking = false; }));
  buildPages(); R.stageW = stage.clientWidth;

  stage.addEventListener('scroll', onScroll, { passive: true });
  const stopAlign = () => { if (R) R.align = false; };
  stage.addEventListener('wheel', stopAlign, { passive: true });
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  stage.addEventListener('touchstart', e => { stopAlign(); if (!R.marking && e.touches.length === 2) R.pinch = { d0: dist(e.touches), d: 0 }; }, { passive: true });
  stage.addEventListener('touchmove', e => { if (R && R.pinch && e.touches.length === 2) R.pinch.d = dist(e.touches); }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!R || !R.pinch || e.touches.length > 1) return;
    const p = R.pinch; R.pinch = null;
    if (p.d && p.d0) setZoom(R.zoom * p.d / p.d0);
  }, { passive: true });
  // marca-texto: arrastar sobre a página
  stage.addEventListener('pointerdown', markDown);
  stage.addEventListener('pointermove', markMove);
  stage.addEventListener('pointerup', markUp);
  stage.addEventListener('pointercancel', () => { if (R && R.drag) { clearTmp(R.drag); R.drag = null; } });
  // toque simples esconde/mostra os controles (modo foco)
  stage.addEventListener('click', e => {
    if (!R || R.marking || e.target.closest('[data-act]')) return;
    if (Date.now() - (R.dragEnd || 0) < 400) return;
    R.el.classList.toggle('zen');
  });

  R.timer = setInterval(tick, 250);
  wakeLock(); updatePg(); updateTimer(); updateMarkCount();
  requestAnimationFrame(() => rGo(start));
  loadSizes(R);
}

async function loadSizes(r) {
  let dirty = false;
  const apply = () => {
    const st = $('#rStage'), cur = r.pages[r.page - 1];
    const frac = cur.offsetHeight ? (st.scrollTop - cur.offsetTop) / cur.offsetHeight : 0;
    const w = parseFloat(r.pages[0].style.width);
    r.asp.forEach((a, i) => { r.pages[i].style.height = (w * a) + 'px'; });
    st.scrollTop = Math.max(0, cur.offsetTop + frac * cur.offsetHeight);
  };
  const settle = async () => {
    while (R === r && (Date.now() - r.lastScroll < 250 || r.seeking || r.drag)) await new Promise(ok => setTimeout(ok, 120));
    if (R === r) apply();
    dirty = false;
  };
  for (let i = 1; i < r.asp.length; i++) {
    if (R !== r) return;
    try {
      const p = await r.pdf.getPage(i + 1), v = p.getViewport({ scale: 1 }), a = v.height / v.width;
      if (Math.abs(a - r.asp[i]) > .003) { r.asp[i] = a; dirty = true; }
    } catch { }
    if (i % 20 === 0) { if (dirty) await settle(); else await new Promise(ok => setTimeout(ok, 0)); }
  }
  if (dirty && R === r) await settle();
}

function buildPages() {
  const wrap = $('#rWrap'), stage = $('#rStage');
  if (R.io) R.io.disconnect();
  wrap.innerHTML = ''; R.pages = []; R.rendered = new Set(); R.visible = new Set();
  const w = Math.max(100, Math.min(stage.clientWidth - 16, 900) * R.zoom);
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= R.pdf.numPages; i++) {
    const d = document.createElement('div'); d.className = 'pgx'; d.dataset.n = i;
    d.style.width = w + 'px'; d.style.height = (w * R.asp[i - 1]) + 'px';
    R.pages.push(d); frag.appendChild(d);
  }
  wrap.appendChild(frag);
  R.io = new IntersectionObserver(onIO, { root: stage, rootMargin: '1500px 0px 1500px 0px' });
  R.pages.forEach(d => R.io.observe(d));
}
function onIO(entries) {
  if (!R) return;
  for (const e of entries) {
    const n = +e.target.dataset.n;
    if (e.isIntersecting) R.visible.add(n); else { R.visible.delete(n); releasePage(n); }
  }
  pump();
}
function releasePage(n) {
  if (!R.rendered.has(n)) return;
  const d = R.pages[n - 1], c = d.querySelector('canvas');
  if (c) { c.width = 0; c.height = 0; }
  d.innerHTML = ''; d.classList.remove('ok'); R.rendered.delete(n);
}
async function pump() {
  const r = R; if (!r || r.pumping) return;
  r.pumping = true;
  try {
    while (R === r) {
      let best = null, bd = 1e9;
      for (const n of r.visible) { if (r.rendered.has(n)) continue; const dd = Math.abs(n - r.page); if (dd < bd) { bd = dd; best = n; } }
      if (best === null) break;
      r.rendered.add(best);
      const ok = await drawPage(best);
      if (!ok) r.rendered.delete(best);
    }
  } finally { r.pumping = false; }
}
async function drawPage(n) {
  const r = R, gen = r.gen, d = r.pages[n - 1];
  try {
    const page = await r.pdf.getPage(n);
    if (R !== r || gen !== r.gen) return false;
    const base = page.getViewport({ scale: 1 });
    const css = parseFloat(d.style.width) / base.width;
    const vp = page.getViewport({ scale: css });
    let s = css * Math.min(devicePixelRatio || 1, 2);
    while (base.width * s * base.height * s > 6e6) s *= .9;
    const out = page.getViewport({ scale: s });
    const c = document.createElement('canvas'); c.width = Math.floor(out.width); c.height = Math.floor(out.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: out }).promise;
    if (R !== r || gen !== r.gen) return false;
    if (!r.visible.has(n)) { c.width = 0; c.height = 0; return false; }
    d.style.height = vp.height + 'px';
    d.innerHTML = ''; d.appendChild(c);
    d.insertAdjacentHTML('beforeend', '<div class="tint"></div><div class="mk"></div>');
    d.classList.add('ok');
    paintMarks(n);
    if (r.align && n === r.startPage) { r.align = false; rGo(n); }
    return true;
  } catch (e) { console.error(e); return false; }
}

const rectsHTML = (h, cls = '') => (h.rects || []).map(([x, y, w, hh]) =>
  `<i class="hl k-${h.kind} ${h.resolved ? 'res' : ''} ${cls}" ${h.id ? `data-act="markOpen" data-id="${h.id}"` : ''} style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${hh * 100}%"></i>`).join('');
function paintMarks(n) {
  if (!R) return;
  const d = R.pages[n - 1], layer = d && d.querySelector('.mk:not(.tmp)'); if (!layer) return;
  layer.innerHTML = S.hl.filter(h => h.book_id === R.b.id && h.page === n).map(h => rectsHTML(h)).join('');
}
function updateMarkCount() { const c = $('#rMC'); if (c && R) { const n = S.hl.filter(h => h.book_id === R.b.id).length; c.textContent = n || ''; } }

/* --- texto da página (para o marca-texto "grudar" nas linhas) --- */
async function pageLines(n) {
  if (R.tc[n]) return R.tc[n];
  const page = await R.pdf.getPage(n), vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent();
  const items = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = pdfjsLib.Util.transform(vp.transform, it.transform);
    const fh = Math.hypot(t[2], t[3]) || it.height || 10;
    const w = (it.width || 0) * vp.scale;
    if (w <= 0) continue;
    items.push({ s: it.str, x: t[4] / vp.width, y: (t[5] - fh * .92) / vp.height, w: w / vp.width, h: fh * 1.18 / vp.height });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const c = it.y + it.h / 2;
    let L = lines.find(l => Math.abs(l.c - c) < Math.min(l.h, it.h) * .5);
    if (!L) { L = { c, y: it.y, h: it.h, items: [] }; lines.push(L); }
    L.items.push(it); L.y = Math.min(L.y, it.y); L.h = Math.max(L.h, it.y + it.h - L.y);
  }
  lines.sort((a, b) => a.y - b.y);
  lines.forEach(l => l.items.sort((a, b) => a.x - b.x));
  return (R.tc[n] = lines);
}
function lineAt(lines, p) {
  let best = -1, bd = 1e9;
  lines.forEach((l, i) => { const dd = p.y < l.y ? l.y - p.y : p.y > l.y + l.h ? p.y - l.y - l.h : 0; if (dd < bd) { bd = dd; best = i; } });
  return { i: best, d: bd };
}
function selectText(lines, a, b) {
  if (!lines || !lines.length) return null;
  let A = lineAt(lines, a), B = lineAt(lines, b);
  if (A.d > .04 && B.d > .04) return null;
  if (A.i > B.i || (A.i === B.i && a.x > b.x)) { [A, B] = [B, A]; [a, b] = [b, a]; }
  const rects = [], parts = [];
  for (let k = A.i; k <= B.i; k++) {
    const L = lines[k], xa = k === A.i ? a.x : -1, xb = k === B.i ? b.x : 2;
    let x0 = 2, x1 = -1, txt = '';
    for (const it of L.items) {
      if (it.x + it.w < xa || it.x > xb) continue;
      const n = it.s.length, cw = it.w / n;
      let c0 = clamp(Math.floor((xa - it.x) / cw), 0, n), c1 = clamp(Math.ceil((xb - it.x) / cw), 0, n);
      while (c0 > 0 && it.s[c0 - 1] !== ' ') c0--;   // completa a palavra
      while (c1 < n && it.s[c1] !== ' ') c1++;
      if (c1 <= c0) continue;
      x0 = Math.min(x0, it.x + c0 * cw); x1 = Math.max(x1, it.x + c1 * cw);
      txt += (txt && !/\s$/.test(txt) && !/^\s/.test(it.s.slice(c0, c1)) ? ' ' : '') + it.s.slice(c0, c1);
    }
    if (x1 > x0) { rects.push([x0 - .002, L.y, x1 - x0 + .004, L.h]); parts.push(txt.trim()); }
  }
  if (!rects.length) return null;
  const text = parts.join(' ').replace(/-\s+(?=[a-zà-ú])/g, '').replace(/\s+/g, ' ').trim();
  return { rects, text };
}
const rawRect = (a, b) => ({ rects: [[Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y)]], text: '' });
const ptIn = (e, r) => ({ x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) });
const round4 = rs => rs.map(r => r.map(v => Math.round(v * 10000) / 10000));

function markDown(e) {
  if (!R || !R.marking || e.button > 0) return;
  const pg = e.target.closest('.pgx'); if (!pg || !pg.classList.contains('ok')) return;
  const n = +pg.dataset.n, r = pg.getBoundingClientRect();
  R.drag = { n, pg, r, a: ptIn(e, r), b: null, x0: e.clientX, y0: e.clientY, moved: false };
  R.drag.pid = e.pointerId;
  pageLines(n).catch(() => { R && (R.tc[n] = []); });
  e.preventDefault();
}
function markMove(e) {
  const d = R && R.drag; if (!d) return;
  if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 8) return;
  if (!d.moved) { d.moved = true; try { d.pg.setPointerCapture(d.pid); } catch { } }
  d.b = ptIn(e, d.r);
  const sel = (R.tc[d.n] && selectText(R.tc[d.n], d.a, d.b)) || rawRect(d.a, d.b);
  let tmp = d.pg.querySelector('.mk.tmp');
  if (!tmp) { tmp = document.createElement('div'); tmp.className = 'mk tmp'; d.pg.appendChild(tmp); }
  tmp.innerHTML = rectsHTML({ kind: R.lastKind, rects: sel.rects });
}
function clearTmp(d) { const t = d && d.pg.querySelector('.mk.tmp'); if (t) t.remove(); }
async function markUp() {
  const d = R && R.drag; if (!d) return;
  R.drag = null; R.dragEnd = Date.now();
  if (!d.moved || !d.b) { clearTmp(d); return; }   // foi só um toque: o clique abre a marcação, se houver
  let sel = null;
  try { sel = selectText(await pageLines(d.n), d.a, d.b); } catch { }
  if (!sel) { const rr = rawRect(d.a, d.b); if (rr.rects[0][2] < .02 || rr.rects[0][3] < .008) { clearTmp(d); return; } sel = rr; }
  markSheet({ page: d.n, rects: round4(sel.rects), text: sel.text }, () => clearTmp(d));
}
function setMarking(on) {
  if (!R) return;
  R.marking = on;
  $('#rStage').classList.toggle('marking', on);
  $('#rMarkBtn').classList.toggle('on', on);
  $('#rHint').classList.toggle('hidden', !on);
  if (on) R.el.classList.remove('zen');
}

/* --- folha para salvar / editar uma marcação --- */
function kindPicker(cur) {
  return `<div class="kinds">${Object.entries(KIND).map(([k, v]) => `<button class="k-${k} ${cur === k ? 'on' : ''}" data-k="${k}">${ic(v.icon, 22)}${v.n}</button>`).join('')}</div>`;
}
function bindKinds(m, set) {
  $('.kinds', m).onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; $$('.kinds button', m).forEach(x => x.classList.toggle('on', x === b)); set(b.dataset.k); };
}
function markSheet(draft, onClose) {
  let kind = R ? R.lastKind : 'like';
  const m = modal(`<h3>Marcar trecho</h3><div class="mut" style="font-size:14px">Página ${draft.page}</div>
    ${draft.text ? `<div class="quote k-${kind}" id="msQ">“${esc(draft.text)}”</div>` : `<p class="note">Não encontrei texto nessa área (pode ser uma imagem ou um PDF escaneado). A área fica marcada mesmo assim.</p>`}
    ${kindPicker(kind)}
    <label class="fld"><span id="msLbl">Anotação (opcional)</span><textarea id="msNote" placeholder="Por que esse trecho chamou sua atenção?"></textarea></label>
    <div style="margin-top:16px"><button class="btn" id="msSave">Salvar marcação</button><button class="btn sec2" id="msNo">Cancelar</button></div>`, true);
  const ph = { like: 'Por que esse trecho chamou sua atenção?', doubt: 'O que ficou confuso? Volte aqui depois.', note: 'Escreva sua nota…' };
  bindKinds(m, k => { kind = k; const q = $('#msQ', m); if (q) q.className = 'quote k-' + k; $('#msNote', m).placeholder = ph[k]; });
  $('#msNote', m).placeholder = ph[kind];
  const close = () => { m.remove(); onClose && onClose(); setMarking(false); };
  $('#msNo', m).onclick = close;
  $('#msSave', m).onclick = async () => {
    const h = { id: uid(), book_id: (R ? R.b.id : null), page: draft.page, kind, rects: draft.rects, text: draft.text || '', note: $('#msNote', m).value.trim(),
      resolved: false, created_at: nowISO(), deleted: false };
    if (R) { R.lastKind = kind; localStorage.setItem('lastKind', kind); }
    await saveMark(h); close(); paintMarks(draft.page); updateMarkCount();
    toast(kind === 'doubt' ? 'Guardado em "Para revisar".' : 'Trecho marcado.');
  };
}
function openMark(id) {
  const h = S.hl.find(x => x.id === id); if (!h) return;
  const b = bookById(h.book_id);
  let kind = h.kind;
  const m = modal(`<h3>${esc(KIND[h.kind].n)}</h3><div class="mut" style="font-size:14px">${esc(b ? b.title : 'Livro removido')} · página ${h.page} · ${new Date(h.created_at).toLocaleDateString('pt-BR')}</div>
    ${h.text ? `<div class="quote k-${kind}" id="moQ">“${esc(h.text)}”</div>` : ''}
    ${kindPicker(kind)}
    <label class="tgl" id="moTgl" ${kind === 'doubt' ? '' : 'hidden'}><span><b>Já entendi</b><br><small class="mut">Conta para a conquista Mente Curiosa</small></span><input type="checkbox" id="moRes" ${h.resolved ? 'checked' : ''}></label>
    <label class="fld"><span>Anotação</span><textarea id="moNote" placeholder="Escreva aqui…">${esc(h.note)}</textarea></label>
    <div style="margin-top:16px"><button class="btn" id="moSave">Salvar</button>
    ${!R && b ? `<button class="btn sec2" id="moGo">${ic('book', 20)} Ler a partir daqui</button>` : ''}
    ${h.text ? `<button class="btn sec2" id="moCopy">Copiar trecho</button>` : ''}
    <button class="btn danger" id="moDel">Apagar marcação</button></div>`);
  bindKinds(m, k => { kind = k; const q = $('#moQ', m); if (q) q.className = 'quote k-' + k; $('#moTgl', m).hidden = k !== 'doubt'; });
  const after = () => { if (R) { paintMarks(h.page); updateMarkCount(); } else render(); };
  $('#moSave', m).onclick = async () => {
    h.kind = kind; h.note = $('#moNote', m).value.trim(); h.resolved = kind === 'doubt' && $('#moRes', m).checked;
    await saveMark(h); m.remove(); after(); toast('Marcação salva.');
  };
  if ($('#moGo', m)) $('#moGo', m).onclick = async () => { b.current_page = h.page; await saveBook(b); m.remove(); openSetup(b.id); };
  if ($('#moCopy', m)) $('#moCopy', m).onclick = async () => { try { await navigator.clipboard.writeText(`“${h.text}” — ${b ? b.title : ''}, p. ${h.page}`); toast('Trecho copiado.'); } catch { toast('Não consegui copiar.'); } };
  $('#moDel', m).onclick = async () => { h.deleted = true; await saveMark(h); m.remove(); after(); toast('Marcação apagada.'); };
}
function readerMarks() {
  if (!R) return;
  let f = 'all';
  const all = () => S.hl.filter(h => h.book_id === R.b.id).sort((a, b) => a.page - b.page || (a.rects?.[0]?.[1] || 0) - (b.rects?.[0]?.[1] || 0));
  const m = modal('');
  const draw = () => {
    const base = all(), list = filterMarks(base, f);
    m.firstElementChild.innerHTML = `<h3>Marcações deste livro</h3>${markChips(base, f, 'rmf')}
      ${list.length ? list.map(h => `<div style="display:flex;gap:8px;align-items:stretch" class="rmi">${markItem(h)}</div>`).join('').replace(/data-act="markOpen"/g, 'data-go="1" data-act="noop"')
        : `<div class="empty" style="margin-top:0"><b>${base.length ? 'Nada neste filtro' : 'Nenhuma marcação'}</b>Toque no ${ic('marker', 16)} e arraste sobre um trecho.</div>`}`;
    $$('.mark', m).forEach(x => x.style.flex = '1');
  };
  m.addEventListener('click', e => {
    const c = e.target.closest('[data-act="rmf"]'); if (c) { e.stopPropagation(); f = c.dataset.v; draw(); return; }
    const it = e.target.closest('.mark'); if (it) { const h = S.hl.find(x => x.id === it.dataset.id); m.remove(); if (h) { rGo(h.page); setTimeout(() => openMark(h.id), 250); } }
  });
  draw();
}

/* página atual = a que está no terço superior da tela */
function onScroll() {
  if (!R) return;
  R.lastScroll = Date.now();
  if (R.raf) return;
  R.raf = requestAnimationFrame(() => {
    if (!R) return; R.raf = 0;
    const st = $('#rStage'), y = st.scrollTop + st.clientHeight * .35;
    let lo = 0, hi = R.pages.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (R.pages[mid].offsetTop <= y) lo = mid; else hi = mid - 1; }
    let n = lo + 1;
    if (st.scrollTop + st.clientHeight >= st.scrollHeight - 4) n = R.pages.length;
    if (n !== R.page) { pageChanged(n); updatePg(); }
  });
}
function pageChanged(n) {
  const p = R.page; R.page = n;
  if (Math.abs(n - p) > 5) R.furthest = n;
  else if (n > R.furthest) { R.read += n - R.furthest; R.furthest = n; }
}
function updatePg() {
  const p = $('#rPg'); if (p && R) p.textContent = `${R.page} / ${R.pages.length}`;
  const s = $('#rSeek'); if (s && R && !R.seeking) s.value = R.page;
}
function rGo(n) {
  if (!R) return;
  n = Math.max(1, Math.min(R.pages.length, n));
  const top = R.el.classList.contains('zen') ? 8 : ($('#rTop').offsetHeight + 8);
  $('#rStage').scrollTop = Math.max(0, R.pages[n - 1].offsetTop - top);
}
function setZoom(z) {
  if (!R) return;
  z = Math.max(1, Math.min(4, Math.round(z * 20) / 20)); if (z === R.zoom) return;
  R.zoom = z; relayout();
}
const zoom = k => R && setZoom(R.zoom + k);
function relayout() {
  const st = $('#rStage'), cur = R.page, d = R.pages[cur - 1];
  const frac = d.offsetHeight ? (st.scrollTop - d.offsetTop) / d.offsetHeight : 0;
  R.gen++; buildPages(); R.stageW = st.clientWidth;
  const nd = R.pages[cur - 1]; st.scrollTop = Math.max(0, nd.offsetTop + frac * nd.offsetHeight);
}

/* ---------- cronômetro ---------- */
function tick() {
  if (!R) return;
  const n = Date.now(), dt = n - R.last; R.last = n;
  if (!R.paused && !document.hidden && dt < 2500) R.acc += dt;
  updateTimer();
  if (R.mode === 'timed' && !R.done && R.acc >= R.target) timeUp();
  if (n - R.draftAt > 5000) {
    R.draftAt = n;
    try { localStorage.setItem('folio_draft', JSON.stringify({ id: R.b.id, startedAt: R.startedAt, acc: R.acc, startPage: R.startPage, furthest: R.furthest, read: R.read, page: R.page, mode: R.mode })); } catch { }
  }
}
function updateTimer() {
  const t = $('#rT'); if (!t || !R) return;
  const timed = R.mode === 'timed' && !R.done;
  t.textContent = fmtClock(timed ? (R.target - R.acc) / 1000 : R.acc / 1000);
  $('#rSub').textContent = R.paused ? 'pausado · toque para retomar' : timed ? 'restante' : 'lendo';
}
function timeUp() {
  R.done = true; R.paused = true; navigator.vibrate && navigator.vibrate([250, 120, 250]);
  const m = modal(`<h3>Tempo concluído</h3><p class="mut" style="margin:6px 0 18px">Você leu por ${Math.round(R.acc / 60000)} minutos. Quer continuar?</p>
    <button class="btn" id="tuGo">Continuar lendo</button><button class="btn sec2" id="tuEnd">Encerrar sessão</button>`, true);
  $('#tuGo', m).onclick = () => { m.remove(); R.paused = false; R.last = Date.now(); };
  $('#tuEnd', m).onclick = () => { m.remove(); endDialog(); };
}
async function wakeLock() { try { if ('wakeLock' in navigator && R && !document.hidden) R.wake = await navigator.wakeLock.request('screen'); } catch { } }
document.addEventListener('visibilitychange', () => { if (!R) return; if (document.hidden) tick(); else { R.last = Date.now(); wakeLock(); } });

function closeReader() {
  if (!R) return;
  clearInterval(R.timer); cancelAnimationFrame(R.raf);
  try { R.io && R.io.disconnect(); } catch { }
  try { R.wake && R.wake.release(); } catch { }
  try { R.pdf.destroy(); } catch { }
  R.el.remove(); localStorage.removeItem('folio_draft'); R = null;
}
function endDialog() {
  if (!R) return;
  R.paused = true; setMarking(false);
  const r = R;
  const d = { book: r.b, startedAt: r.startedAt, sec: Math.round(r.acc / 1000), startPage: r.startPage, furthest: r.furthest, read: r.read, page: r.page, mode: r.mode };
  sessionDialog(d, {
    onSaved: () => { closeReader(); $$('.ov').forEach(o => o.remove()); },
    onContinue: () => { r.paused = false; r.last = Date.now(); },
    onDiscard: () => { closeReader(); $$('.ov').forEach(o => o.remove()); render(); }
  });
}
function sessionDialog(d, cb) {
  const b = d.book, pages0 = d.read != null ? d.read : Math.max(0, d.furthest - d.startPage);
  const m = modal(`<h3>Sessão de leitura</h3>
    <p class="mut" style="margin:4px 0 4px">${esc(b.title)} · ${fmtDur(d.sec)} de leitura</p>
    <div class="two"><label class="fld"><span>Parei na página</span><input id="sdEnd" type="number" inputmode="numeric" min="1" value="${d.page}"></label>
      <label class="fld"><span>Páginas lidas</span><input id="sdPg" type="number" inputmode="numeric" min="0" value="${pages0}"></label></div>
    <p class="note">As páginas lidas foram calculadas pelo avanço no leitor. Corrija se precisar.</p>
    <div style="margin-top:16px"><button class="btn" id="sdSave">Salvar sessão</button>
    ${cb.onContinue ? '<button class="btn sec2" id="sdCont">Continuar lendo</button>' : ''}
    <button class="btn danger" id="sdDisc">Descartar</button></div>`, true);
  $('#sdSave', m).onclick = async () => {
    const end = Math.max(1, parseInt($('#sdEnd', m).value) || d.page), pg = Math.max(0, parseInt($('#sdPg', m).value) || 0);
    if (d.sec >= 5 || pg > 0) await saveSession({ id: uid(), book_id: b.id, started_at: d.startedAt, ended_at: nowISO(), duration_sec: d.sec, start_page: d.startPage, end_page: end, pages_read: pg, mode: d.mode, deleted: false });
    const nb = bookById(b.id) || b; nb.current_page = end; if (nb.status === 'want') nb.status = 'reading';
    await saveBook(nb); m.remove(); cb.onSaved && cb.onSaved();
    render(); toast(`Sessão salva: ${fmtDur(d.sec)} e ${pg} ${pg === 1 ? 'página' : 'páginas'}.`);
    if (nb.total_pages && end >= nb.total_pages && nb.status !== 'finished') finishBookDialog(nb.id);
  };
  if (cb.onContinue) $('#sdCont', m).onclick = () => { m.remove(); cb.onContinue(); };
  $('#sdDisc', m).onclick = async () => {
    if (!(await askConfirm('Descartar sessão?', 'O tempo e as páginas desta leitura não serão contabilizados.', 'Descartar'))) return;
    m.remove(); cb.onDiscard && cb.onDiscard(); localStorage.removeItem('folio_draft');
  };
}
function checkDraft() {
  let d; try { d = JSON.parse(localStorage.getItem('folio_draft') || 'null'); } catch { }
  if (!d) return;
  const b = bookById(d.id);
  if (!b || d.acc < 30000) { localStorage.removeItem('folio_draft'); return; }
  const m = modal(`<h3>Leitura interrompida</h3><p class="mut" style="margin:6px 0 18px">O app foi fechado durante uma leitura de "${esc(b.title)}" (${fmtDur(d.acc / 1000)}). Quer salvar essa sessão?</p>
    <button class="btn" id="drYes">Revisar e salvar</button><button class="btn sec2" id="drNo">Descartar</button>`, true);
  $('#drYes', m).onclick = () => { m.remove(); sessionDialog({ book: b, startedAt: d.startedAt, sec: Math.round(d.acc / 1000), startPage: d.startPage, furthest: d.furthest, read: d.read, page: d.page, mode: d.mode }, { onSaved: () => localStorage.removeItem('folio_draft'), onDiscard: () => localStorage.removeItem('folio_draft') }); };
  $('#drNo', m).onclick = () => { m.remove(); localStorage.removeItem('folio_draft'); };
}

/* ---------- Finalizar livro ---------- */
function finishBookDialog(id) {
  const b = bookById(id); if (!b) return; let rating = b.rating || 0;
  const m = modal(`<h3>${b.status === 'finished' ? 'Sua avaliação' : 'Livro concluído!'}</h3><p class="mut" style="margin:4px 0">${esc(b.title)}</p>
    <div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" class="${n <= rating ? 'on' : ''}" aria-label="${n} estrelas">★</button>`).join('')}</div>
    <label class="fld"><span>Resenha (opcional)</span><textarea id="rv" placeholder="O que você achou do livro?">${esc(b.review)}</textarea></label>
    <div style="margin-top:16px"><button class="btn" id="rvSave">Salvar</button><button class="btn sec2" id="rvNo">Agora não</button></div>`, true);
  $('#stars', m).onclick = e => { const n = +e.target.dataset.n; if (!n) return; rating = n; $$('#stars button', m).forEach(x => x.classList.toggle('on', +x.dataset.n <= n)); };
  $('#rvNo', m).onclick = () => m.remove();
  $('#rvSave', m).onclick = async () => {
    b.status = 'finished'; b.finished_at = b.finished_at || nowISO(); b.rating = rating || null; b.review = $('#rv', m).value.trim();
    if (b.total_pages) b.current_page = b.total_pages;
    await saveBook(b); m.remove(); $$('.ov').forEach(o => o.remove()); render(); toast('Livro marcado como lido.');
  };
}

/* ---------- Ajustes ---------- */
function openSettings() {
  $$('.ov').forEach(o => o.remove());
  const last = localStorage.getItem('lastSync'), th = localStorage.getItem('theme') || 'auto';
  const o = overlay(`<div class="bar-top"><h1>Ajustes</h1><button class="ib" data-act="closeOv" aria-label="Fechar">${ic('x', 20)}</button></div>
    <div class="lab">Aparência</div>
    <div class="seg">${[['auto', 'Automático'], ['dark', 'Escuro'], ['light', 'Claro']].map(([k, n]) => `<button class="${th === k ? 'on' : ''}" data-act="theme" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="lab">Meta diária de leitura</div>
    <div class="presets" style="margin:0 0 4px">${[15, 30, 45, 60].map(n => `<button class="${S.goal === n ? 'on' : ''}" data-act="goal" data-v="${n}">${n} min</button>`).join('')}</div>
    <label class="fld"><span>Ou digite outro valor (minutos)</span><input id="goalIn" type="number" inputmode="numeric" min="5" max="600" value="${S.goal}"></label>
    <div class="lab">Sincronização</div>
    <div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px"><span class="dot ${dotCls()}"></span><b>${syncLabel()}</b></div>
      <p class="mut" style="margin:8px 0 0;font-size:14.5px;line-height:1.5">${sb ? `${last ? 'Última sincronização: ' + fmtDate(last) + '.' : 'Ainda não sincronizou.'} As mudanças feitas em outro aparelho chegam aqui sozinhas em poucos segundos.
        ${S.sync === 'err' ? '<br><b style="color:var(--danger)">Erro: ' + esc(S.syncMsg) + '</b>' : ''}
        ${S.noHL ? '<br><b>As marcações ainda não sincronizam:</b> rode o novo supabase-setup.sql no Supabase.' : ''}` : 'Modo local: preencha o arquivo config.js para sincronizar entre celular e tablet.'}</p></div>
    ${sb ? '<button class="btn sec2 sm" data-act="syncNow">Sincronizar agora</button><button class="btn sec2 sm" data-act="dlAll">Baixar todos os PDFs para ler offline</button><button class="btn sec2 sm" data-act="resync">Baixar tudo da nuvem de novo</button>' : ''}
    <p class="note" style="margin-top:22px">Folio · seus dados ficam guardados neste aparelho e sincronizam quando houver internet.</p>`);
  $('#goalIn', o).onchange = async e => { const n = clamp(parseInt(e.target.value) || 30, 5, 600); await saveGoal(n); render(); openSettings(); };
}
async function downloadAll() {
  const list = S.books.filter(b => b.pdf_path); let n = 0, ok = 0;
  for (const b of list) {
    n++; if (await hasLocalPdf(b.id)) { ok++; continue; }
    toast(`Baixando ${n} de ${list.length}…`, 60000);
    if (await getBlob('pdf', b)) ok++;
  }
  toast(`${ok} de ${list.length} PDFs disponíveis offline.`, 4000);
}

/* ---------- Editar atividades ---------- */
const ADDBTN = '<button class="btn sec2 sm" data-act="addSess" style="margin-bottom:6px">Registrar leitura manual</button>';
const toLocalInput = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function openSessionEdit(id) {
  const s = id ? S.sessions.find(x => x.id === id) : null;
  if (id && !s) return;
  if (!s && !S.books.length) { toast('Cadastre um livro primeiro.'); return; }
  let opts = [...S.books].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    .map(b => `<option value="${b.id}" ${s && s.book_id === b.id ? 'selected' : ''}>${esc(b.title)}</option>`).join('');
  if (s && !bookById(s.book_id)) opts = `<option value="${s.book_id}" selected>Livro removido</option>` + opts;
  const m = modal(`<h3>${s ? 'Editar sessão' : 'Registrar leitura'}</h3>
    <label class="fld"><span>Livro</span><select id="seBook">${opts}</select></label>
    <label class="fld"><span>Data e hora de início</span><input id="seWhen" type="datetime-local" value="${toLocalInput(s ? s.started_at : nowISO())}"></label>
    <div class="two"><label class="fld"><span>Duração (minutos)</span><input id="seMin" type="number" inputmode="numeric" min="0" value="${s ? Math.round(s.duration_sec / 60) : 30}"></label>
      <label class="fld"><span>Páginas lidas</span><input id="sePg" type="number" inputmode="numeric" min="0" value="${s ? s.pages_read : 0}"></label></div>
    <div style="margin-top:18px"><button class="btn" id="seSave">Salvar</button><button class="btn sec2" id="seCancel">Cancelar</button></div>`, true);
  $('#seCancel', m).onclick = () => m.remove();
  $('#seSave', m).onclick = async () => {
    const when = new Date($('#seWhen', m).value);
    if (isNaN(when)) { toast('Informe a data e a hora.'); return; }
    const min = Math.max(0, parseFloat($('#seMin', m).value) || 0), pg = Math.max(0, parseInt($('#sePg', m).value) || 0);
    const o = s || { id: uid(), deleted: false, mode: 'manual', start_page: 0, end_page: 0 };
    const keep = s && Math.round(s.duration_sec / 60) === Math.round(min);
    o.book_id = $('#seBook', m).value; o.started_at = when.toISOString();
    o.duration_sec = keep ? s.duration_sec : Math.round(min * 60);
    o.ended_at = new Date(when.getTime() + o.duration_sec * 1000).toISOString();
    o.pages_read = pg;
    await saveSession(o); m.remove(); render();
    toast(s ? 'Sessão atualizada.' : 'Leitura registrada.');
  };
}

/* ---------- Ações ---------- */
const ACT = {
  noop: () => { },
  tab: t => { S.tab = t.dataset.v; render(); $('#view').scrollTo(0, 0); },
  plib: t => { S.lib = t.dataset.v; render(); },
  libv: t => { S.libv = t.dataset.v; render(); },
  mkf: t => { S.mk = t.dataset.v; render(); },
  mbookClear: () => { S.mbook = null; render(); },
  goMarks: t => { S.tab = 'library'; S.libv = 'marks'; S.mk = t.dataset.v || 'all'; S.mbook = null; render(); $('#view').scrollTo(0, 0); },
  bookMarks: (t, id) => { $$('.ov').forEach(o => o.remove()); S.tab = 'library'; S.libv = 'marks'; S.mk = 'all'; S.mbook = id; render(); $('#view').scrollTo(0, 0); },
  markOpen: (t, id) => openMark(id),
  ptab: t => { S.ptab = t.dataset.v; render(); },
  achInfo: (t, id) => achInfo(id),
  range: t => { S.range = +t.dataset.v; render(); },
  settings: () => openSettings(),
  theme: t => { localStorage.setItem('theme', t.dataset.v); applyTheme(); openSettings(); render(); },
  add: () => openForm(),
  edit: (t, id) => { $$('.ov').forEach(o => o.remove()); openForm(id); },
  book: (t, id) => openBook(id),
  closeOv: t => { t.closest('.ov').remove(); render(); },
  fav: async (t, id) => { const b = bookById(id); b.favorite = !b.favorite; await saveBook(b); render(); openBook(id); },
  reopen: async (t, id) => { const b = bookById(id); b.status = 'reading'; await saveBook(b); render(); openBook(id); },
  finishBook: (t, id) => finishBookDialog(id),
  del: async (t, id) => {
    const b = bookById(id);
    if (!(await askConfirm('Excluir livro?', `"${esc(b.title)}" e o PDF serão removidos da nuvem e de todos os aparelhos.`, 'Excluir'))) return;
    b.deleted = true; await saveBook(b); $$('.ov').forEach(o => o.remove()); render(); toast('Livro excluído.');
  },
  setup: (t, id) => openSetup(id),
  read: () => {
    const c = S.books.filter(b => b.status !== 'finished' && (b.pdf_path || b._upPdf)).sort((a, b) => lastRead(b).localeCompare(lastRead(a)));
    if (c.length) openSetup(c[0].id); else if (S.books.length) { S.tab = 'library'; render(); toast('Escolha um livro com PDF para ler.'); } else openForm();
  },
  swap: () => {
    const list = S.books.filter(b => b.pdf_path || b._upPdf);
    const m = modal(`<h3>Escolha o livro</h3><div style="margin-top:12px">${list.map(b => `<button class="btn sec2 sm" style="justify-content:flex-start;padding:14px 16px" data-pick="${b.id}">${esc(b.title)}</button>`).join('') || '<p class="mut">Nenhum livro com PDF.</p>'}</div>`);
    m.onclick = e => { const p = e.target.closest('[data-pick]'); if (p) { m.remove(); openSetup(p.dataset.pick); } else if (e.target === m) m.remove(); };
  },
  suMode: t => { SU.mode = t.dataset.v; refreshSetup(); },
  suPre: t => { SU.min = +t.dataset.v; refreshSetup(); },
  editPage: async () => {
    const b = bookById(SU.id); if (!b) return;
    const v = await askNumber({ title: 'Em que página você está?', label: b.total_pages ? `Página (1 a ${b.total_pages})` : 'Página', value: b.current_page || 1, min: 1, max: b.total_pages || 99999, hint: 'A leitura vai abrir nesta página.' });
    if (v === null) return;
    b.current_page = v; await saveBook(b); refreshSetup(); render(); toast(`Pronto: página ${v}.`);
  },
  editTotal: async () => {
    const b = bookById(SU.id); if (!b) return;
    const v = await askNumber({ title: 'Total de páginas', label: 'Número de páginas do livro', value: b.total_pages || '', min: 0, max: 99999 });
    if (v === null) return;
    b.total_pages = v; if (v && b.current_page > v) b.current_page = v; await saveBook(b); refreshSetup(); render();
  },
  start: () => startReading(),
  rClose: () => { if (R) endDialog(); else { const e = $('#reader'); if (e) e.remove(); } },
  rPause: () => { if (!R) return; R.paused = !R.paused; R.last = Date.now(); updateTimer(); },
  rTheme: () => {
    if (!R) return;
    R.theme = RTHEMES[(RTHEMES.indexOf(R.theme) + 1) % RTHEMES.length];
    R.el.className = R.el.className.replace(/th-\w+/, 'th-' + R.theme);
    localStorage.setItem('rTheme', R.theme); toast('Página: ' + RTN[R.theme], 1400);
  },
  rMark: () => { if (!R) return; setMarking(!R.marking); },
  rMarks: () => readerMarks(),
  rGo: async () => {
    if (!R) return;
    const v = await askNumber({ title: 'Ir para a página', label: `Página (1 a ${R.pdf.numPages})`, value: R.page, min: 1, max: R.pdf.numPages });
    if (v !== null) rGo(v);
  },
  rZin: () => zoom(.25), rZout: () => zoom(-.25),
  goal: async t => { await saveGoal(+t.dataset.v); render(); openSettings(); },
  syncNow: () => { toast('Sincronizando…'); sync().then(() => { if (S.sync === 'idle') toast('Tudo sincronizado.'); openSettings(); }); },
  resync: async () => {
    if (!(await askConfirm('Baixar tudo de novo?', 'O app vai buscar todos os dados da nuvem outra vez. Nada é apagado.', 'Baixar'))) return;
    for (const t of ['books', 'sessions', 'settings', 'highlights']) localStorage.removeItem('cur2_' + t);
    S.noHL = false; toast('Sincronizando…'); await sync(); if (S.sync === 'idle') toast('Tudo sincronizado.'); openSettings();
  },
  dlAll: () => downloadAll(),
  addSess: () => openSessionEdit(),
  editSess: (t, id) => openSessionEdit(id),
  delSess: async (t, id) => {
    const x = S.sessions.find(y => y.id === id); if (!x) return;
    if (!(await askConfirm('Excluir sessão?', 'O tempo e as páginas deixam de ser contabilizados.', 'Excluir'))) return;
    x.deleted = true; await saveSession(x); render(); toast('Sessão excluída.');
  },
  editFin: (t, id) => finishBookDialog(id),
  delFin: async (t, id) => {
    const b = bookById(id); if (!b) return;
    if (!(await askConfirm('Remover registro?', 'O livro volta para "Lendo" e a nota e a resenha são apagadas.', 'Remover'))) return;
    b.status = 'reading'; b.finished_at = null; b.rating = null; b.review = '';
    await saveBook(b); render(); toast('Registro removido.');
  }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const f = ACT[t.dataset.act]; if (f) f(t, t.dataset.id, e);
});
document.addEventListener('input', e => {
  if (e.target.id === 'rSeek' && R) { rGo(+e.target.value); return; }
  if (e.target.id === 'suRange') {
    SU.min = +e.target.value; $('#suBig').textContent = SU.min + ' min';
    $$('.presets button').forEach(b => b.classList.toggle('on', +b.dataset.v === SU.min));
  }
});
window.addEventListener('resize', () => {
  if (!R) return; clearTimeout(R.rt);
  R.rt = setTimeout(() => { const st = $('#rStage'); if (R && st && st.clientWidth !== R.stageW) relayout(); }, 250);
});
window.addEventListener('pagehide', () => { if (R) tick(); });

/* ---------- Início do app ---------- */
(async function init() {
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  await DB.open(); await loadAll(); render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => { });
    // quando sai uma versão nova do app, recarrega uma vez (fora do leitor)
    let reloaded = false; const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || reloaded || R) return; reloaded = true; location.reload(); });
  }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { }
  if (sb) { queueSync(200); startRealtime(); setInterval(() => queueSync(0), 30000); } else setSync('off');
  window.addEventListener('online', () => queueSync(300));
  window.addEventListener('focus', () => queueSync(300));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueSync(300); });
  checkDraft();
  if (!sb || localStorage.getItem('lastSync')) queueAch();
})();
