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
const WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; }
function fmtMin(sec) { return `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`; }
function fmtDur(sec) { const m = Math.round(sec / 60); if (m < 60) return m + 'm'; return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function periodName(iso) { const h = new Date(iso).getHours(); return h >= 5 && h < 12 ? 'Leitura matinal' : h >= 12 && h < 18 ? 'Leitura da tarde' : 'Leitura noturna'; }

/* ---------- ícones ---------- */
const ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  library: '<path d="M4 4h5a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6z"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
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
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>'
};
const ic = (n, s = 24, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
const LOGO = (s = 36) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" fill="currentColor"><rect x="12" y="4" width="24" height="7" rx="1.5"/><rect x="6" y="14" width="22" height="7" rx="1.5"/><rect x="10" y="24" width="24" height="7" rx="1.5"/><rect x="4" y="33" width="16" height="4" rx="1.2" opacity=".55"/></svg>`;

/* ---------- toast ---------- */
let toastT;
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

/* ---------- banco local (IndexedDB) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((ok, no) => {
      const r = indexedDB.open('folio', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('books', { keyPath: 'id' });
        d.createObjectStore('sessions', { keyPath: 'id' });
        d.createObjectStore('settings', { keyPath: 'key' });
        d.createObjectStore('blobs', { keyPath: 'key' });
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
const S = { books: [], sessions: [], goal: 30, tab: 'home', ptab: 'voce', lib: 'all', range: 7, sync: 'idle', syncMsg: '' };

async function loadAll() {
  S.books = (await DB.all('books')).filter(b => !b.deleted);
  S.sessions = (await DB.all('sessions')).filter(x => !x.deleted);
  const g = await DB.get('settings', 'goal');
  if (g && !g.deleted) S.goal = Number(g.value) || 30;
}
async function saveBook(b) {
  b.updated_at = nowISO(); b._dirty = true;
  await DB.put('books', b);
  const i = S.books.findIndex(x => x.id === b.id);
  if (b.deleted) { if (i >= 0) S.books.splice(i, 1); } else if (i >= 0) S.books[i] = b; else S.books.push(b);
  queueSync();
}
async function saveSession(x) {
  x.updated_at = nowISO(); x._dirty = true;
  await DB.put('sessions', x);
  const i = S.sessions.findIndex(y => y.id === x.id);
  if (i >= 0) S.sessions[i] = x; else S.sessions.push(x);
  queueSync();
}
async function saveGoal(min) {
  S.goal = min;
  await DB.put('settings', { key: 'goal', value: min, updated_at: nowISO(), _dirty: true });
  queueSync();
}
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
  let bmp = src instanceof Blob ? await createImageBitmap(src) : src;
  const w = bmp.width || src.width, h = bmp.height || src.height;
  const k = Math.min(1, maxW / w);
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.85));
}

/* ---------- Supabase e sincronização ---------- */
let sb = null;
try {
  const cfg = window.FOLIO_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }
} catch (e) { console.warn('Supabase indisponível', e); }

let syncing = false, syncTimer = null, syncAgain = false;
function setSync(state, msg = '') { S.sync = state; S.syncMsg = msg; const d = $('#syncDot'); if (d) d.className = 'dot ' + ({ idle: 'ok', busy: 'busy', err: 'err', off: '' }[state] || ''); }
function queueSync(ms = 1500) { if (!sb) return; clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }

async function pushBooks() {
  for (const b0 of await DB.all('books')) {
    if (!b0._dirty) continue;
    const b = { ...b0 };
    if (b.deleted) {
      const paths = [b.pdf_path, b.cover_path].filter(Boolean);
      if (paths.length) await sb.storage.from('books').remove(paths).catch(() => { });
      await DB.del('blobs', 'pdf:' + b.id); await DB.del('blobs', 'cover:' + b.id);
    } else {
      if (b._upCover) {
        const rec = await DB.get('blobs', 'cover:' + b.id);
        if (rec) {
          const p = 'covers/' + b.id + '.jpg';
          const { error } = await sb.storage.from('books').upload(p, rec.blob, { upsert: true, contentType: 'image/jpeg' });
          if (error) throw error; b.cover_path = p;
        }
        b._upCover = false;
      }
      if (b._upPdf) {
        const rec = await DB.get('blobs', 'pdf:' + b.id);
        if (rec) {
          const p = 'pdfs/' + b.id + '.pdf';
          const { error } = await sb.storage.from('books').upload(p, rec.blob, { upsert: true, contentType: 'application/pdf' });
          if (error) throw new Error('Não consegui enviar o PDF (' + (error.message || 'erro') + '). O limite do plano grátis é 50 MB por arquivo.');
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
  }
}
async function pushSimple(store, table) {
  for (const r0 of await DB.all(store)) {
    if (!r0._dirty) continue;
    const { _dirty, server_ts, ...row } = r0;
    const { error } = await sb.from(table).upsert(row);
    if (error) throw error;
    const cur = await DB.get(store, store === 'settings' ? r0.key : r0.id);
    if (cur.updated_at === r0.updated_at) { cur._dirty = false; await DB.put(store, cur); }
  }
}
async function pull(table, store, key) {
  const ck = 'cur_' + table;
  let from = localStorage.getItem(ck) || '1970-01-01T00:00:00+00:00', maxTs = from, changed = false;
  for (; ;) {
    const { data, error } = await sb.from(table).select('*').gt('server_ts', from).order('server_ts').limit(500);
    if (error) throw error;
    if (!data.length) break;
    for (const r of data) {
      const loc = await DB.get(store, r[key]);
      const keepLocal = loc && loc._dirty && new Date(loc.updated_at) >= new Date(r.updated_at);
      if (!keepLocal) { await DB.put(store, r); changed = true; }
      if (r.server_ts > maxTs) maxTs = r.server_ts;
    }
    from = data[data.length - 1].server_ts;
    if (data.length < 500) break;
  }
  localStorage.setItem(ck, maxTs);
  return changed;
}
async function sync() {
  if (!sb) { setSync('off'); return; }
  if (!navigator.onLine) { setSync('off', 'Sem internet'); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; setSync('busy');
  try {
    await pushBooks();
    await pushSimple('sessions', 'sessions');
    await pushSimple('settings', 'settings');
    let ch = false;
    ch = (await pull('books', 'books', 'id')) || ch;
    ch = (await pull('sessions', 'sessions', 'id')) || ch;
    ch = (await pull('settings', 'settings', 'key')) || ch;
    if (ch) { await loadAll(); if (!$('#reader') && !$('.ov')) render(); }
    localStorage.setItem('lastSync', nowISO());
    setSync('idle');
  } catch (e) {
    console.error(e);
    setSync('err', e.message || String(e));
    toast('Erro ao sincronizar: ' + (e.message || e), 5000);
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; queueSync(500); }
  }
}

/* ---------- estatísticas e conquistas ---------- */
function stats() {
  const byDay = {}; let secs = 0, pages = 0;
  for (const s of S.sessions) { const k = dk(s.started_at); byDay[k] = (byDay[k] || 0) + (s.duration_sec || 0); secs += s.duration_sec || 0; pages += s.pages_read || 0; }
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
  const finished = S.books.filter(b => b.status === 'finished').length;
  return { byDay, secs, pages, days: active.length, streak, best, finished };
}
const ACH = [
  { id: 'ferro', name: 'Leitor de Ferro', icon: 'sun', unit: 'páginas', val: s => s.pages, tiers: [100, 500, 1000, 5000, 10000] },
  { id: 'ofensiva', name: 'Ofensiva', icon: 'flame', unit: 'dias seguidos', val: s => s.best, tiers: [3, 7, 14, 30, 100] },
  { id: 'disc', name: 'Disciplinado', icon: 'clock', unit: 'horas', val: s => s.secs / 3600, tiers: [1, 5, 10, 25, 50] },
  { id: 'biblio', name: 'Bibliófilo', icon: 'book', unit: 'livros', val: s => s.finished, tiers: [1, 5, 10, 25, 50] }
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const METAL = [['#6b5a4d', '#3a2e27'], ['#d09a6a', '#7a4a2a'], ['#cfd3d6', '#6f777d'], ['#e8c35a', '#8a6a1c'], ['#9fe0e8', '#3c7f8a'], ['#e8c35a', '#8a6a1c']];
function badgeSVG(a, st, size = 92) {
  const v = a.val(st); const lvl = a.tiers.filter(t => v >= t).length;
  const [c1, c2] = METAL[lvl];
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs><linearGradient id="g${a.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="#2a1f19" stroke="url(#g${a.id})" stroke-width="4"/>
    <g transform="translate(26 22) scale(2)" fill="none" stroke="url(#g${a.id})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[a.icon]}</g>
    ${lvl ? `<polygon points="50,66 66,76 50,92 34,76" fill="${c1}" opacity="0"/><circle cx="50" cy="84" r="11" fill="#e8d9c4" stroke="${c2}" stroke-width="2"/><text x="50" y="89" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="#2a1f19">${ROMAN[lvl]}</text>` : ''}
  </svg>`;
}

/* =====================================================================
   Interface
   ===================================================================== */
function modal(html, sticky = false) {
  const m = document.createElement('div'); m.className = 'md';
  m.innerHTML = `<div>${html}</div>`;
  if (sticky) m.dataset.sticky = '1';
  m.addEventListener('click', e => { if (e.target === m && !m.dataset.sticky) m.remove(); });
  document.body.appendChild(m); return m;
}
function overlay(html, cls = '') {
  const o = document.createElement('div'); o.className = 'ov ' + cls; o.innerHTML = html;
  document.body.appendChild(o); hydrateCovers(o); return o;
}
const lastRead = b => { let t = ''; for (const s of S.sessions) if (s.book_id === b.id && s.started_at > t) t = s.started_at; return t || b.updated_at || ''; };

function render() {
  const v = $('#view');
  ({ home: viewHome, library: viewLibrary, stats: viewStats, profile: viewProfile }[S.tab])(v);
  renderNav();
}
function renderNav() {
  const it = (t, i) => `<button class="ni ${S.tab === t ? 'on' : ''}" data-act="tab" data-v="${t}" aria-label="${t}">${ic(i, 28)}</button>`;
  $('#nav').innerHTML = it('home', 'home') + it('library', 'library') +
    `<button class="go" data-act="read" aria-label="Ler agora">${LOGO(44)}</button>` +
    it('stats', 'chart') + it('profile', 'user');
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
      <div class="pct">${pct(b)}%</div>${coverHTML(b)}</button>`).join('')}</div><div class="plank"></div>`
    : `<div class="empty"><b>Sua estante está vazia</b>Cadastre um livro com o PDF para começar a ler.
       <div style="margin-top:16px"><button class="btn sm" data-act="add">Adicionar livro</button></div></div>`;
  v.innerHTML = `
    <div class="top"><div style="width:44px;padding-left:4px"><span id="syncDot" class="dot ${({ idle: 'ok', busy: 'busy', err: 'err', off: '' })[S.sync] || ''}" title="${esc(S.syncMsg)}"></span></div>
      <div class="logo">${LOGO(40)}</div>
      <button class="round" data-act="settings" aria-label="Ajustes">${ic('gear', 22)}</button></div>
    <div class="week">${wk}</div>
    <div class="goal">
      <svg viewBox="0 0 300 165" width="100%"><path d="M30 150A120 120 0 0 1 270 150" fill="none" stroke="#261c17" stroke-width="22" stroke-linecap="round"/>
        <path d="M30 150A120 120 0 0 1 270 150" pathLength="100" fill="none" stroke="#e8d9c4" stroke-width="22" stroke-linecap="round" stroke-dasharray="${(p * 100).toFixed(2)} 100" opacity="${p > 0 ? 1 : 0}"/></svg>
      <div class="in"><div class="lbl">Leitura de hoje</div><div class="tm">${fmtMin(today)}</div>
      <div class="sub">da sua meta de ${S.goal} minutos</div></div></div>
    <div class="sec">Continue lendo</div>${shelf}`;
  hydrateCovers(v);
}

/* ---------- Biblioteca ---------- */
function viewLibrary(v) {
  const f = S.lib, list = S.books.filter(b => f === 'all' || b.status === f).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  const chip = (k, n) => `<button class="chip ${f === k ? 'on' : ''}" data-act="plib" data-v="${k}">${n}</button>`;
  v.innerHTML = `<div class="top"><h1>Biblioteca</h1><span class="mut">${S.books.length} ${S.books.length === 1 ? 'livro' : 'livros'}</span></div>
    <div class="chips">${chip('all', 'Todos')}${chip('reading', 'Lendo')}${chip('finished', 'Já lidos')}${chip('want', 'Quero ler')}</div>
    ${list.length ? `<div class="grid">${list.map(b => `<button class="card" data-act="book" data-id="${b.id}">${coverHTML(b)}
      <div class="t">${esc(b.title)}</div><div class="a">${esc(b.author || ' ')}</div>
      <div class="bar"><i style="width:${b.status === 'finished' ? 100 : pct(b)}%"></i></div></button>`).join('')}</div>`
      : `<div class="empty"><b>Nada por aqui</b>Toque no botão + para cadastrar um livro.</div>`}
    <button class="fab" data-act="add" aria-label="Adicionar livro">${ic('plus', 28, 2)}</button>`;
  hydrateCovers(v);
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
    return `<rect x="${x + bw * .15}" y="${H - h}" width="${bw * .7}" height="${Math.max(h, m ? 2 : 0)}" rx="${Math.min(4, bw * .2)}" fill="${m >= S.goal ? '#e8d9c4' : '#8a7664'}"/>
      <text x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="11" fill="#a39482">${lab}</text>`;
  }).join('');
  const gy = H - S.goal / max * H;
  v.innerHTML = `<div class="top"><h1>Estatísticas</h1></div>
    <div class="seg">${[7, 30, 90].map(r => `<button class="${n === r ? 'on' : ''}" data-act="range" data-v="${r}">${r} dias</button>`).join('')}</div>
    <div class="chart"><div class="mut" style="font-size:14px;margin:0 4px 8px">Minutos lidos por dia</div>
      <svg viewBox="0 0 ${W} ${H + 26}" width="100%"><line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="#6b5d52" stroke-dasharray="4 4"/>${bars}</svg>
      <div class="mut" style="font-size:12.5px;margin:2px 4px 6px">A linha tracejada é a sua meta de ${S.goal} min.</div></div>
    <div class="kpis">
      <div class="kpi"><b>${fmtDur(secs)}</b><span>Tempo lido no período</span></div>
      <div class="kpi"><b>${pg}</b><span>Páginas lidas</span></div>
      <div class="kpi"><b>${Math.round(secs / n / 60)} min</b><span>Média por dia</span></div>
      <div class="kpi"><b>${secs > 60 ? (pg / (secs / 3600)).toFixed(0) : '–'}</b><span>Páginas por hora</span></div>
      <div class="kpi"><b>${st.streak}</b><span>Ofensiva atual (dias)</span></div>
      <div class="kpi"><b>${st.best}</b><span>Maior ofensiva (dias)</span></div></div>`;
}

/* ---------- Perfil ---------- */
function viewProfile(v) {
  const tab = (k, n) => `<button class="${S.ptab === k ? 'on' : ''}" data-act="ptab" data-v="${k}">${n}</button>`;
  let body = '';
  if (S.ptab === 'voce') body = profileYou();
  else if (S.ptab === 'ativ') body = profileActivity();
  else body = profileShelf();
  v.innerHTML = `<div class="top"><h1>Perfil</h1></div><div class="tabs">${tab('voce', 'Você')}${tab('ativ', 'Atividades')}${tab('estante', 'Estante')}</div>${body}`;
  hydrateCovers(v);
}
function profileYou() {
  const st = stats(), favs = S.books.filter(b => b.favorite).slice(0, 3);
  const slots = [0, 1, 2].map(i => favs[i] ? `<button data-act="book" data-id="${favs[i].id}">${coverHTML(favs[i])}</button>` : `<div class="cover" style="opacity:.25;box-shadow:none;border:1.5px dashed var(--line);background:none"></div>`).join('');
  const hrs = st.secs / 3600;
  const row = (i, l, val) => `<div class="stat">${ic(i, 24)}<span>${l}</span><span>${val}</span></div>`;
  return `<div class="lab">LIVROS FAVORITOS</div><div class="favs">${slots}</div><div class="plank" style="margin:6px 6px 0"></div>
    <p class="note center">Toque no coração de um livro para fixá-lo aqui.</p>
    <div class="lab">CONQUISTAS</div>
    <div class="badges">${ACH.map(a => { const val = a.val(st), lvl = a.tiers.filter(t => val >= t).length, nxt = a.tiers[lvl];
      return `<div class="badge ${lvl ? '' : 'lock'}" style="display:grid;justify-items:center">${badgeSVG(a, st)}<div class="n">${a.name}</div>
        <div class="v">${nxt ? Math.floor(val) + ' / ' + nxt + ' ' + a.unit : 'Nível máximo'}</div></div>`; }).join('')}</div>
    <div class="lab">ESTATÍSTICAS</div>
    ${row('flame', 'Ofensiva atual', st.streak)}${row('library', 'Dias ativos', st.days)}${row('file', 'Páginas totais', st.pages.toLocaleString('pt-BR'))}
    ${row('clock', 'Horas lidas', hrs >= 1 ? Math.floor(hrs) + 'h ' + pad(Math.round(hrs % 1 * 60)) + 'm' : Math.round(hrs * 60) + 'm')}${row('book', 'Livros finalizados', st.finished)}`;
}
function profileActivity() {
  const items = [];
  for (const s of S.sessions) items.push({ t: s.started_at, k: 's', s });
  for (const b of S.books) if (b.status === 'finished' && b.finished_at) items.push({ t: b.finished_at, k: 'f', b });
  items.sort((a, b) => b.t.localeCompare(a.t));
  if (!items.length) return `<div class="empty"><b>Sem atividades ainda</b>Suas sessões de leitura vão aparecer aqui.</div>`;
  return items.slice(0, 150).map(it => {
    if (it.k === 'f') {
      const b = it.b, r = b.rating || 0;
      return `<div class="act"><div class="hd">Finalizou este livro</div><div class="w"><div>${coverHTML(b)}</div><div style="min-width:0">
        <h3>${esc(b.title)}</h3><div class="meta">${esc(b.author)}</div>
        ${r ? `<div style="margin-top:12px"><span class="st">${'★'.repeat(r)}<span style="color:#5a4d43">${'★'.repeat(5 - r)}</span></span> <b>${r}/5 estrelas</b></div>` : ''}
        ${b.review ? `<div class="rev">${esc(b.review)}</div>` : ''}</div></div></div>`;
    }
    const s = it.s, b = bookById(s.book_id);
    return `<div class="act"><div class="w">${b ? `<div>${coverHTML(b)}</div>` : ''}<div style="min-width:0">
      <h3>${periodName(s.started_at)}</h3><div class="meta">${fmtDate(s.started_at)}</div><div class="meta">${esc(b ? b.title : 'Livro removido')}</div>
      <div class="nums"><div><small>Tempo</small>${fmtDur(s.duration_sec)}</div><div><small>Páginas</small>${s.pages_read}</div></div></div></div></div>`;
  }).join('');
}
function profileShelf() {
  const per = innerWidth > 700 ? 6 : 4, groups = [['Lendo', 'reading'], ['Já lidos', 'finished'], ['Quero ler', 'want']];
  const out = groups.map(([n, k]) => {
    const list = S.books.filter(b => b.status === k); if (!list.length) return '';
    let rows = '';
    for (let i = 0; i < list.length; i += per) {
      const part = list.slice(i, i + per);
      rows += `<div class="shelf" style="grid-template-columns:repeat(${per},1fr)">${part.map(b => `<button class="bk" data-act="book" data-id="${b.id}">${coverHTML(b)}</button>`).join('')}</div><div class="plank" style="margin-bottom:30px"></div>`;
    }
    return `<div class="tag">${n}</div>${rows}`;
  }).join('');
  return `<div class="paper">${out || '<p style="text-align:center;padding:30px 0">Sua estante está vazia.</p>'}</div>`;
}

/* ---------- Detalhe do livro ---------- */
async function openBook(id) {
  const b = bookById(id); if (!b) return;
  const local = await hasLocalPdf(id);
  const o = overlay(`<div class="bar-top"><button class="round" data-act="closeOv" aria-label="Fechar">${ic('x')}</button>
      <button class="round" data-act="fav" data-id="${id}" aria-label="Favorito" style="${b.favorite ? 'color:#e07a6a' : ''}"><svg width="24" height="24" viewBox="0 0 24 24" fill="${b.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON.heart}</svg></button></div>
    <div class="det">${coverHTML(b)}<div style="min-width:0"><h1>${esc(b.title)}</h1><div class="mut" style="margin-top:6px">${esc(b.author || 'Autor desconhecido')}</div>
      <div style="margin-top:16px">Página ${b.current_page} de ${b.total_pages || '?'}</div><div class="bar"><i style="width:${b.status === 'finished' ? 100 : pct(b)}%"></i></div>
      <div class="badge-sm">${b.pdf_path || local ? (local ? '✓ PDF disponível offline' : '☁ PDF na nuvem (baixa ao abrir)') : '⚠ Sem PDF'}</div>
      ${b._upPdf ? '<div class="badge-sm">⏳ Aguardando envio do PDF</div>' : ''}</div></div>
    <div style="margin-top:28px">
      ${b.status === 'finished' && b.rating ? `<p class="center"><span class="st" style="color:#d9b866;font-size:24px">${'★'.repeat(b.rating)}</span></p>` : ''}
      <button class="btn" data-act="setup" data-id="${id}">${b.status === 'finished' ? 'Reler' : 'Ler'}</button>
      ${b.status !== 'finished' ? `<button class="btn sec2" data-act="finishBook" data-id="${id}">Marcar como lido</button>` : `<button class="btn sec2" data-act="reopen" data-id="${id}">Voltar para "Lendo"</button>`}
      <button class="btn sec2" data-act="edit" data-id="${id}">Editar livro</button>
      <button class="btn danger" data-act="del" data-id="${id}">Excluir livro</button></div>`);
  return o;
}

/* ---------- Cadastro / edição ---------- */
function openForm(id) {
  const b = id ? bookById(id) : null;
  let coverBlob = null, pdfBlob = null;
  const m = modal(`<h3>${b ? 'Editar livro' : 'Novo livro'}</h3>
    <label class="fld"><span>Título</span><input id="fTitle" value="${esc(b?.title)}" autocomplete="off"></label>
    <label class="fld"><span>Autor</span><input id="fAuthor" value="${esc(b?.author)}" autocomplete="off"></label>
    <div class="two"><label class="fld"><span>Total de páginas</span><input id="fPages" type="number" inputmode="numeric" min="0" value="${b?.total_pages || ''}"></label>
      <label class="fld"><span>Situação</span><select id="fStatus">${[['reading', 'Lendo'], ['want', 'Quero ler'], ['finished', 'Já lido']].map(([k, n]) => `<option value="${k}" ${(b?.status || 'reading') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <label class="fld"><span>Foto da capa</span><input id="fCover" type="file" accept="image/*"></label>
    <div class="cover preview" id="fPrevBox" ${b ? '' : 'hidden'}><img id="fPrev" alt="" hidden></div>
    <label class="fld"><span>Arquivo PDF</span><input id="fPdf" type="file" accept="application/pdf,.pdf"></label>
    <p class="note" id="fNote">${b ? 'Deixe os arquivos em branco para manter os atuais.' : 'Ao escolher o PDF, o app preenche o total de páginas e cria a capa a partir da primeira página (se você não escolher uma foto).'}</p>
    <div style="margin-top:20px"><button class="btn" id="fSave">Salvar livro</button><button class="btn sec2" id="fCancel">Cancelar</button></div>`, true);
  const note = t => $('#fNote', m).textContent = t;
  const showPrev = blob => { const u = URL.createObjectURL(blob); const i = $('#fPrev', m); i.src = u; i.hidden = false; $('#fPrevBox', m).hidden = false; };
  if (b) { const img = $('#fPrev', m); const u = coverURLs[b.id]; if (u) { img.src = u; img.hidden = false; } else { $('#fPrevBox', m).hidden = true; } }

  $('#fCover', m).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { coverBlob = await toJpeg(f); showPrev(coverBlob); } catch { note('Não consegui ler essa imagem.'); }
  };
  $('#fPdf', m).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    pdfBlob = f; note('Lendo o PDF…');
    try {
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
      $('#fPages', m).value = pdf.numPages;
      if (!$('#fTitle', m).value.trim()) $('#fTitle', m).value = f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ');
      if (!coverBlob || coverBlob.__auto) {
        const pg = await pdf.getPage(1), v1 = pg.getViewport({ scale: 1 }), v2 = pg.getViewport({ scale: 480 / v1.width });
        const c = document.createElement('canvas'); c.width = v2.width; c.height = v2.height;
        await pg.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
        coverBlob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .85)); coverBlob.__auto = true; showPrev(coverBlob);
      }
      const mb = f.size / 1048576;
      note(`PDF com ${pdf.numPages} páginas (${mb.toFixed(1)} MB).` + (mb > 50 ? ' Atenção: acima de 50 MB o envio para a nuvem pode falhar no plano grátis.' : ''));
    } catch (err) { console.error(err); note('Não consegui ler este PDF. Ele continuará sem o total de páginas automático.'); }
  };
  $('#fCancel', m).onclick = () => m.remove();
  $('#fSave', m).onclick = async () => {
    const title = $('#fTitle', m).value.trim();
    if (!title) { note('Digite o título do livro.'); $('#fTitle', m).focus(); return; }
    const nb = b || { id: uid(), created_at: nowISO(), current_page: 0, favorite: false, rating: null, review: '', finished_at: null, cover_path: null, pdf_path: null, deleted: false };
    nb.title = title; nb.author = $('#fAuthor', m).value.trim();
    nb.total_pages = Math.max(0, parseInt($('#fPages', m).value) || 0);
    nb.status = $('#fStatus', m).value;
    if (nb.status === 'finished' && !nb.finished_at) { nb.finished_at = nowISO(); if (nb.total_pages) nb.current_page = nb.total_pages; }
    if (nb.status !== 'finished') nb.finished_at = null;
    if (nb.total_pages && nb.current_page > nb.total_pages) nb.current_page = nb.total_pages;
    if (coverBlob) { await DB.put('blobs', { key: 'cover:' + nb.id, blob: coverBlob }); nb._upCover = true; delete coverURLs[nb.id]; }
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
  return `<div class="bar-top"><button class="round" data-act="closeOv" aria-label="Fechar">${ic('x')}</button><button class="lnk" data-act="swap" style="font-size:16px;color:var(--mut)">Trocar livro</button></div>
    <div class="setup"><div class="cv">${coverHTML(b)}</div><h1>${esc(b.title)}</h1>
    <div class="pg">Página ${b.current_page || 1} de ${b.total_pages || '?'} &nbsp;<a data-act="editPage">editar</a></div>
    <a class="adj" data-act="editTotal">Ajustar o total de páginas</a>
    <div class="pill2"><button class="pill ${SU.mode === 'timed' ? 'on' : ''}" data-act="suMode" data-v="timed">${ic('clock', 24)} Cronometrado</button>
      <button class="pill ${SU.mode === 'free' ? 'on' : ''}" data-act="suMode" data-v="free">${ic('inf', 26)} Leitura livre</button></div>
    ${SU.mode === 'timed' ? `<div class="big" id="suBig">${SU.min} min</div>
      <input type="range" id="suRange" min="5" max="120" step="5" value="${SU.min}" aria-label="Minutos">
      <div class="presets">${[15, 30, 45, 60].map(n => `<button class="${SU.min === n ? 'on' : ''}" data-act="suPre" data-v="${n}">${n}</button>`).join('')}</div>`
      : `<p class="mut" style="margin:40px 0 70px;font-size:18px;line-height:1.5">O cronômetro conta para cima.<br>Encerre quando quiser.</p>`}
    <button class="btn" data-act="start">Iniciar leitura</button></div>`;
}
function openSetup(id) {
  SU.id = id; $$('.ov').forEach(o => o.remove());
  const o = overlay(setupHTML(), 'setupov'); o.id = 'setupOv';
}
function refreshSetup() { const o = $('#setupOv'); if (o) { o.innerHTML = setupHTML(); hydrateCovers(o); } }

/* ---------- Leitor de PDF ---------- */
let R = null;
async function startReading() {
  const b = bookById(SU.id); if (!b) return;
  localStorage.setItem('suMode', SU.mode); localStorage.setItem('suMin', SU.min);
  if (!b.pdf_path && !(await hasLocalPdf(b.id))) { toast('Este livro não tem PDF. Toque em "editar livro" e adicione um.', 4000); return; }
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
  const el = document.createElement('div'); el.id = 'reader';
  el.innerHTML = `<header><button class="round" data-act="rClose" aria-label="Encerrar leitura">${ic('x')}</button>
    <button id="rTimer" data-act="rPause" aria-label="Pausar"><span id="rT">00:00</span><small id="rSub"></small></button>
    <button class="round" data-act="rInv" aria-label="Fundo escuro">${ic('moon')}</button></header>
    <div id="rStage"><div id="rWrap"><canvas id="rCanvas"></canvas></div><div id="rMsg">Abrindo o livro…</div></div>
    <footer><button class="round" data-act="rZout" aria-label="Diminuir">${ic('zout')}</button><button class="round" data-act="rPrev" aria-label="Página anterior">${ic('prev')}</button>
      <button id="rPg" data-act="rGo">–</button><button class="round" data-act="rNext" aria-label="Próxima página">${ic('next')}</button><button class="round" data-act="rZin" aria-label="Aumentar">${ic('zin')}</button></footer>`;
  document.body.appendChild(el);
  let pdf;
  try { pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise; }
  catch (e) { console.error(e); el.remove(); toast('Não consegui abrir este PDF.'); return; }
  $('#rMsg').remove();
  if (!b.total_pages) { b.total_pages = pdf.numPages; await saveBook(b); }
  const start = Math.min(Math.max(1, b.current_page || 1), pdf.numPages);
  R = { b, pdf, el, page: start, startPage: start, furthest: start, zoom: 1, mode, target: min * 60000, acc: 0, last: Date.now(), paused: false, done: false,
    startedAt: nowISO(), rendering: false, pending: null, wake: null, draftAt: 0, inv: localStorage.getItem('rInv') === '1' };
  $('#rStage').classList.toggle('inv', R.inv);
  R.timer = setInterval(tick, 250);
  wakeLock(); updatePg(); renderPage(start); updateTimer();

  // deslizar para trocar de página (quando não há zoom)
  let sx = 0, sy = 0, st = 0; const stage = $('#rStage');
  stage.addEventListener('touchstart', e => { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); } }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!R || R.zoom > 1.05 || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && Date.now() - st < 600) dx < 0 ? rGo(R.page + 1) : rGo(R.page - 1);
  }, { passive: true });
}
function tick() {
  if (!R) return;
  const n = Date.now(), dt = n - R.last; R.last = n;
  if (!R.paused && !document.hidden && dt < 2500) R.acc += dt;
  updateTimer();
  if (R.mode === 'timed' && !R.done && R.acc >= R.target) timeUp();
  if (n - R.draftAt > 5000) {
    R.draftAt = n;
    try { localStorage.setItem('folio_draft', JSON.stringify({ id: R.b.id, startedAt: R.startedAt, acc: R.acc, startPage: R.startPage, furthest: R.furthest, page: R.page, mode: R.mode })); } catch { }
  }
}
function updateTimer() {
  const t = $('#rT'); if (!t || !R) return;
  const timed = R.mode === 'timed' && !R.done;
  t.textContent = fmtClock(timed ? (R.target - R.acc) / 1000 : R.acc / 1000);
  $('#rSub').textContent = R.paused ? 'pausado (toque para retomar)' : timed ? 'restante' : 'lendo';
}
function timeUp() {
  R.done = true; R.paused = true; navigator.vibrate && navigator.vibrate([250, 120, 250]);
  const m = modal(`<h3>Tempo concluído</h3><p class="mut" style="margin:6px 0 18px">Você leu por ${Math.round(R.acc / 60000)} minutos. Quer continuar?</p>
    <button class="btn" id="tuGo">Continuar lendo</button><button class="btn sec2" id="tuEnd">Encerrar sessão</button>`, true);
  $('#tuGo', m).onclick = () => { m.remove(); R.paused = false; R.last = Date.now(); };
  $('#tuEnd', m).onclick = () => { m.remove(); closeReader(); };
}
async function wakeLock() { try { if ('wakeLock' in navigator && R && !document.hidden) R.wake = await navigator.wakeLock.request('screen'); } catch { } }
document.addEventListener('visibilitychange', () => { if (!R) return; if (document.hidden) tick(); else { R.last = Date.now(); wakeLock(); } });

function updatePg() { const p = $('#rPg'); if (p && R) p.textContent = `${R.page} / ${R.pdf.numPages}`; }
async function renderPage(n) {
  if (!R) return;
  if (R.rendering) { R.pending = n; return; }
  R.rendering = true;
  try {
    const page = await R.pdf.getPage(n), stage = $('#rStage'); if (!stage) return;
    const base = page.getViewport({ scale: 1 });
    const css = (stage.clientWidth - 6) / base.width * R.zoom;
    const vp = page.getViewport({ scale: css });
    let s = css * Math.min(devicePixelRatio || 1, 2.5);
    while (base.width * s * base.height * s > 16e6) s *= .9;
    const out = page.getViewport({ scale: s }), c = $('#rCanvas');
    c.width = Math.floor(out.width); c.height = Math.floor(out.height);
    c.style.width = vp.width + 'px'; c.style.height = vp.height + 'px';
    await page.render({ canvasContext: c.getContext('2d'), viewport: out }).promise;
  } catch (e) { console.error(e); }
  if (!R) return;
  R.rendering = false;
  if (R.pending) { const p = R.pending; R.pending = null; renderPage(p); }
}
function rGo(n) {
  if (!R) return;
  n = Math.max(1, Math.min(R.pdf.numPages, n)); if (n === R.page) return;
  R.page = n; R.furthest = Math.max(R.furthest, n);
  updatePg(); renderPage(n); $('#rStage').scrollTo(0, 0);
}
function zoom(k) { if (!R) return; R.zoom = Math.max(1, Math.min(4, +(R.zoom + k).toFixed(2))); renderPage(R.page); }

function closeReader(discard) {
  if (!R) return;
  clearInterval(R.timer); try { R.wake && R.wake.release(); } catch { }
  try { R.pdf.destroy(); } catch { }
  R.el.remove(); localStorage.removeItem('folio_draft'); R = null;
}
function endDialog() {
  if (!R) return;
  R.paused = true;
  const r = R;
  const d = { book: r.b, startedAt: r.startedAt, sec: Math.round(r.acc / 1000), startPage: r.startPage, furthest: r.furthest, page: r.page, mode: r.mode };
  sessionDialog(d, {
    onSaved: () => { closeReader(); },
    onContinue: () => { r.paused = false; r.last = Date.now(); },
    onDiscard: () => { closeReader(); }
  });
}
function sessionDialog(d, cb) {
  const b = d.book, pages0 = Math.max(0, d.furthest - d.startPage);
  const m = modal(`<h3>Sessão de leitura</h3>
    <p class="mut" style="margin:4px 0 4px">${esc(b.title)} · ${fmtDur(d.sec)} de leitura</p>
    <div class="two"><label class="fld"><span>Parei na página</span><input id="sdEnd" type="number" inputmode="numeric" min="1" value="${d.page}"></label>
      <label class="fld"><span>Páginas lidas</span><input id="sdPg" type="number" inputmode="numeric" min="0" value="${pages0}"></label></div>
    <p class="note">As páginas lidas foram calculadas pelo avanço no leitor. Corrija se precisar.</p>
    <div style="margin-top:18px"><button class="btn" id="sdSave">Salvar sessão</button>
    ${cb.onContinue ? '<button class="btn sec2" id="sdCont">Continuar lendo</button>' : ''}
    <button class="btn danger" id="sdDisc">Descartar</button></div>`, true);
  let manual = false;
  $('#sdPg', m).oninput = () => manual = true;
  $('#sdEnd', m).oninput = e => { if (!manual) $('#sdPg', m).value = Math.max(0, (parseInt(e.target.value) || 0) - d.startPage); };
  $('#sdSave', m).onclick = async () => {
    const end = Math.max(1, parseInt($('#sdEnd', m).value) || d.page), pg = Math.max(0, parseInt($('#sdPg', m).value) || 0);
    if (d.sec >= 5 || pg > 0) await saveSession({ id: uid(), book_id: b.id, started_at: d.startedAt, ended_at: nowISO(), duration_sec: d.sec, start_page: d.startPage, end_page: end, pages_read: pg, mode: d.mode, deleted: false });
    const nb = bookById(b.id) || b; nb.current_page = end; if (nb.status === 'want') nb.status = 'reading';
    await saveBook(nb); m.remove(); cb.onSaved && cb.onSaved();
    render(); toast(`Sessão salva: ${fmtDur(d.sec)} e ${pg} ${pg === 1 ? 'página' : 'páginas'}.`);
    if (nb.total_pages && end >= nb.total_pages && nb.status !== 'finished') finishBookDialog(nb.id);
  };
  if (cb.onContinue) $('#sdCont', m).onclick = () => { m.remove(); cb.onContinue(); };
  $('#sdDisc', m).onclick = () => { if (confirm('Descartar esta sessão? O tempo e as páginas não serão contabilizados.')) { m.remove(); cb.onDiscard && cb.onDiscard(); localStorage.removeItem('folio_draft'); } };
}
function checkDraft() {
  let d; try { d = JSON.parse(localStorage.getItem('folio_draft') || 'null'); } catch { }
  if (!d) return;
  const b = bookById(d.id);
  if (!b || d.acc < 30000) { localStorage.removeItem('folio_draft'); return; }
  const m = modal(`<h3>Leitura interrompida</h3><p class="mut" style="margin:6px 0 18px">O app foi fechado durante uma leitura de "${esc(b.title)}" (${fmtDur(d.acc / 1000)}). Quer salvar essa sessão?</p>
    <button class="btn" id="drYes">Revisar e salvar</button><button class="btn sec2" id="drNo">Descartar</button>`, true);
  $('#drYes', m).onclick = () => { m.remove(); sessionDialog({ book: b, startedAt: d.startedAt, sec: Math.round(d.acc / 1000), startPage: d.startPage, furthest: d.furthest, page: d.page, mode: d.mode }, { onSaved: () => localStorage.removeItem('folio_draft'), onDiscard: () => localStorage.removeItem('folio_draft') }); };
  $('#drNo', m).onclick = () => { m.remove(); localStorage.removeItem('folio_draft'); };
}

/* ---------- Finalizar livro ---------- */
function finishBookDialog(id) {
  const b = bookById(id); if (!b) return; let rating = b.rating || 0;
  const m = modal(`<h3>${b.status === 'finished' ? 'Sua avaliação' : 'Livro concluído!'}</h3><p class="mut" style="margin:4px 0">${esc(b.title)}</p>
    <div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" class="${n <= rating ? 'on' : ''}" aria-label="${n} estrelas">★</button>`).join('')}</div>
    <label class="fld"><span>Resenha (opcional)</span><textarea id="rv" placeholder="O que você achou do livro?">${esc(b.review)}</textarea></label>
    <div style="margin-top:18px"><button class="btn" id="rvSave">Salvar</button><button class="btn sec2" id="rvNo">Agora não</button></div>`, true);
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
  const last = localStorage.getItem('lastSync');
  const o = overlay(`<div class="bar-top"><h1>Ajustes</h1><button class="round" data-act="closeOv" aria-label="Fechar">${ic('x')}</button></div>
    <div class="lab" style="text-align:left;margin-top:20px">META DIÁRIA DE LEITURA</div>
    <div class="presets" style="margin:0 0 8px">${[15, 30, 45, 60].map(n => `<button class="${S.goal === n ? 'on' : ''}" data-act="goal" data-v="${n}">${n} min</button>`).join('')}</div>
    <label class="fld"><span>Ou digite outro valor (minutos)</span><input id="goalIn" type="number" inputmode="numeric" min="5" max="600" value="${S.goal}"></label>
    <div class="lab" style="text-align:left">SINCRONIZAÇÃO</div>
    <p class="mut" style="line-height:1.5;margin:0 0 12px">${sb ? `Conectado ao Supabase. ${last ? 'Última sincronização: ' + fmtDate(last) + '.' : ''} ${S.sync === 'err' ? '<br><b style="color:#d9846f">Erro: ' + esc(S.syncMsg) + '</b>' : ''}` : 'Modo local: preencha o arquivo config.js para sincronizar entre celular e tablet.'}</p>
    ${sb ? '<button class="btn sec2 sm" data-act="syncNow">Sincronizar agora</button><button class="btn sec2 sm" data-act="dlAll">Baixar todos os PDFs para ler offline</button>' : ''}
    <p class="note" style="margin-top:22px">Folio · seus dados ficam guardados neste aparelho e sincronizam quando houver internet.</p>`);
  $('#goalIn', o).onchange = async e => { const n = Math.max(5, Math.min(600, parseInt(e.target.value) || 30)); await saveGoal(n); o.remove(); render(); openSettings(); };
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

/* ---------- Ações ---------- */
const ACT = {
  tab: t => { S.tab = t.dataset.v; render(); $('#view').scrollTo(0, 0); },
  plib: t => { S.lib = t.dataset.v; render(); },
  ptab: t => { S.ptab = t.dataset.v; render(); },
  range: t => { S.range = +t.dataset.v; render(); },
  settings: () => openSettings(),
  add: () => openForm(),
  edit: (t, id) => { $$('.ov').forEach(o => o.remove()); openForm(id); },
  book: (t, id) => openBook(id),
  closeOv: t => { t.closest('.ov').remove(); render(); },
  fav: async (t, id) => { const b = bookById(id); b.favorite = !b.favorite; await saveBook(b); $$('.ov').forEach(o => o.remove()); render(); openBook(id); },
  reopen: async (t, id) => { const b = bookById(id); b.status = 'reading'; await saveBook(b); $$('.ov').forEach(o => o.remove()); render(); openBook(id); },
  finishBook: (t, id) => finishBookDialog(id),
  del: async (t, id) => { const b = bookById(id); if (!confirm(`Excluir "${b.title}"? O PDF também será removido da nuvem e dos aparelhos.`)) return; b.deleted = true; await saveBook(b); $$('.ov').forEach(o => o.remove()); render(); toast('Livro excluído.'); },
  setup: (t, id) => openSetup(id),
  read: () => {
    const c = S.books.filter(b => b.status !== 'finished' && (b.pdf_path || b._upPdf)).sort((a, b) => lastRead(b).localeCompare(lastRead(a)));
    if (c.length) openSetup(c[0].id); else if (S.books.length) { S.tab = 'library'; render(); toast('Escolha um livro com PDF para ler.'); } else openForm();
  },
  swap: () => {
    const list = S.books.filter(b => b.pdf_path || b._upPdf);
    const m = modal(`<h3>Escolha o livro</h3><div style="margin-top:12px">${list.map(b => `<button class="btn sec2 sm" style="text-align:left;padding:14px 18px" data-pick="${b.id}">${esc(b.title)}</button>`).join('') || '<p class="mut">Nenhum livro com PDF.</p>'}</div>`);
    m.onclick = e => { const p = e.target.closest('[data-pick]'); if (p) { m.remove(); openSetup(p.dataset.pick); } else if (e.target === m) m.remove(); };
  },
  suMode: t => { SU.mode = t.dataset.v; refreshSetup(); },
  suPre: t => { SU.min = +t.dataset.v; refreshSetup(); },
  editPage: () => {
    const b = bookById(SU.id), v = prompt('Em que página você está?', b.current_page || 1); if (v === null) return;
    b.current_page = Math.max(0, Math.min(b.total_pages || 99999, parseInt(v) || 0)); saveBook(b).then(refreshSetup);
  },
  editTotal: () => {
    const b = bookById(SU.id), v = prompt('Total de páginas do livro:', b.total_pages || ''); if (v === null) return;
    b.total_pages = Math.max(0, parseInt(v) || 0); saveBook(b).then(refreshSetup);
  },
  start: () => startReading(),
  rClose: () => endDialog(),
  rPause: () => { if (!R) return; R.paused = !R.paused; R.last = Date.now(); updateTimer(); },
  rInv: () => { R.inv = !R.inv; localStorage.setItem('rInv', R.inv ? '1' : '0'); $('#rStage').classList.toggle('inv', R.inv); },
  rPrev: () => rGo(R.page - 1), rNext: () => rGo(R.page + 1),
  rGo: () => { const v = prompt(`Ir para a página (1 a ${R.pdf.numPages}):`, R.page); if (v !== null && parseInt(v)) rGo(parseInt(v)); },
  rZin: () => zoom(.25), rZout: () => zoom(-.25),
  goal: async t => { await saveGoal(+t.dataset.v); $$('.ov').forEach(o => o.remove()); render(); openSettings(); },
  syncNow: () => { toast('Sincronizando…'); sync().then(() => { if (S.sync === 'idle') toast('Tudo sincronizado.'); }); },
  dlAll: () => downloadAll()
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const f = ACT[t.dataset.act]; if (f) f(t, t.dataset.id, e);
});
document.addEventListener('input', e => {
  if (e.target.id === 'suRange') {
    SU.min = +e.target.value; $('#suBig').textContent = SU.min + ' min';
    $$('.presets button').forEach(b => b.classList.toggle('on', +b.dataset.v === SU.min));
  }
});
document.addEventListener('keydown', e => {
  if (!R || e.target.matches('input,textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') rGo(R.page + 1);
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') rGo(R.page - 1);
});
window.addEventListener('resize', () => { if (R) renderPage(R.page); });
window.addEventListener('pagehide', () => { if (R) tick(); });

/* ---------- Início do app ---------- */
(async function init() {
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  await DB.open(); await loadAll(); render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { }
  if (sb) { queueSync(300); setInterval(() => queueSync(0), 60000); } else setSync('off');
  window.addEventListener('online', () => queueSync(500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueSync(800); });
  checkDraft();
})();
