/* Nibor Motion v0.23.0 — المسار السريع والوضع البسيط.
 *
 * قسم «ابدأ» بثلاث خطوات: اختر مثالاً ← سجّل صوتك ← صدّر. لا يكرر أي منطق: ينقل لوحة «أمثلة الكتاب»
 * إلى الخطوة الأولى، ويفتح استوديو التسجيل، ويضغط زر التصدير الأصلي.
 * «الوضع البسيط» يخفي الأدوات المتقدمة فقط (تبويبا العناصر والحركة وشريط الإدراج)؛ لا شيء يُحذف،
 * وزر «كل الأدوات» في شريط الأدوات (واحد فقط) يعيدها. التفضيل محفوظ في هذا المتصفح.
 */
'use strict';
window.NM = window.NM || {};
(function (NM) {
  const $ = id => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) if (k != null) e.append(k); return e; };
  const KEY = 'nm.simpleMode';
  const store = { get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } } };

  let ui = null;
  function step(n, title, hint) {
    const badge = el('span', { className: 'nm-qp-badge', textContent: String(n) });
    const status = el('p', { className: 'nm-qp-status', role: 'status' });
    const body = el('div', { className: 'nm-qp-body' });
    const box = el('section', { className: 'nm-qp-step' }, el('header', {}, badge, el('h3', { textContent: title })), el('p', { className: 'muted', textContent: hint }), body, status);
    return { box, badge, body, status };
  }

  function build() {
    const host = $('nmQuickPath'); if (!host || ui) return;
    const s1 = step(1, 'اختر مثالاً من الكتاب', 'اختر الفصل والدرس والمثال، ثم «إنشاء فيديو المثال». الريلز القصير هو الأنسب للمنصات.');
    const s2 = step(2, 'سجّل صوتك', 'اقرأ نص كل مشهد من الملقّن واضغط «التالي». الصمت يُحذف ومدة المشاهد تتبع صوتك.');
    const s3 = step(3, 'شاهد وصدّر', 'شغّل الفيديو للمراجعة، ثم صدّره بصيغة MP4.');
    const rec = el('button', { type: 'button', className: 'nm-qp-main', textContent: '🎙️ افتح استوديو التسجيل' });
    rec.onclick = () => { const list = document.querySelectorAll('#scenes .scene'); const firstMissing = sceneIds().findIndex(id => !NM.core.hasVoice(id)); if (firstMissing >= 0 && list[firstMissing]) list[firstMissing].click(); NM.voiceBooth?.open(); };
    s2.body.append(rec);
    const play = el('button', { type: 'button', className: 'secondary', textContent: '▶ تشغيل' });
    play.onclick = () => { $('play')?.click(); };
    const exp = el('button', { type: 'button', className: 'nm-qp-main', textContent: '⇩ تصدير الفيديو' });
    exp.onclick = () => { $('export')?.click(); };
    s3.body.append(el('div', { className: 'actions' }, play, exp));
    host.replaceChildren(
      el('div', { className: 'nm-qp-intro' }, el('strong', { textContent: 'فيديو من الكتاب في ثلاث خطوات' })),
      s1.box, s2.box, s3.box);
    ui = { s1, s2, s3, rec };
    adoptLibrary();
  }

  /** Move the existing «أمثلة الكتاب» panel into step 1 (same element, same IDs, same handlers). */
  function adoptLibrary() {
    const lib = $('nmBookLibrary'); if (!ui || !lib || ui.s1.body.contains(lib)) return !!lib;
    const ph = el('p', { className: 'muted', id: 'nmBookLibraryMoved' }, '📚 أمثلة الكتاب انتقلت إلى قسم «ابدأ». ', el('button', { type: 'button', className: 'secondary', textContent: 'اذهب إليها', onclick: () => document.querySelector('[data-mobile-tab=start]')?.click() }));
    lib.replaceWith(ph); ui.s1.body.append(lib);
    lib.querySelector('h3')?.remove(); lib.querySelector(':scope > p.muted')?.remove();
    return true;
  }

  function sceneIds() { try { return NM.core.getState().scenes.map(s => s.id); } catch (e) { return []; } }
  function refresh() {
    if (!ui || !NM.core) return;
    const st = NM.core.getState(), ids = st.scenes.map(s => s.id), voiced = ids.filter(id => NM.core.hasVoice(id)).length;
    const fromBook = /^book-|^sim-/.test(st.projectId || '');
    const mark = (s, done, text) => { s.box.classList.toggle('done', done); s.badge.textContent = done ? '✓' : s.badge.dataset.n || s.badge.textContent; s.status.textContent = text; };
    ui.s1.badge.dataset.n = '1'; ui.s2.badge.dataset.n = '2'; ui.s3.badge.dataset.n = '3';
    const secs = Math.round(st.scenes.reduce((a, s) => a + (+s.duration || 0), 0));
    mark(ui.s1, fromBook, fromBook ? `المشروع الحالي: ${st.name || ''} — ${ids.length} مشهداً، نحو ${secs} ث.` : 'المشروع الحالي ليس من أمثلة الكتاب. يمكنك المتابعة به أيضاً.');
    mark(ui.s2, ids.length > 0 && voiced === ids.length, voiced ? `سُجّل صوت ${voiced} من ${ids.length} مشهداً.${voiced < ids.length ? ' سيبدأ الاستوديو من أول مشهد بلا صوت.' : ''}` : 'لا يوجد صوت مسجّل بعد.');
    ui.rec.textContent = voiced && voiced < ids.length ? '🎙️ أكمل التسجيل' : voiced ? '🎙️ أعد تسجيل مشهد' : '🎙️ افتح استوديو التسجيل';
    const cut = st.scenes.map((x, i) => NM.core.hasVoice(x.id) && (+x.voiceDuration || 0) > x.duration + .05 ? i + 1 : 0).filter(Boolean);
    mark(ui.s3, false, cut.length ? `تنبيه: صوت المشهد ${cut.join('، ')} أطول من مدته وسيُقص. أطِل المدة أو فعّل «ضبط المدة تلقائياً».` : voiced < ids.length && ids.length ? 'يمكنك التصدير الآن، لكن المشاهد بلا صوت ستكون صامتة.' : 'جاهز للتصدير.');
  }

  function setSimple(on) {
    document.body.classList.toggle('nm-simple', on); store.set(on ? '1' : '0');
    const extra = $('nmSimpleToggle'); if (extra) { extra.textContent = on ? '⚙ كل الأدوات' : '✨ الوضع البسيط'; extra.title = on ? 'إظهار تبويبات العناصر والحركة وشريط الإدراج' : 'إخفاء الأدوات المتقدمة'; extra.setAttribute('aria-pressed', String(on)); }
    // Leaving a hidden tab in simple mode: go to «ابدأ».
    const view = document.body.dataset.studioView;
    if (on && (view === 'elements' || view === 'motion' || view === 'advanced')) document.querySelector('[data-mobile-tab=start]')?.click();
  }

  // ---------- «مشاريعي»: شاشة رئيسية للخروج من المشروع الحالي وفتح غيره ----------
  let homeUi = null;
  function goTab(tab) { document.querySelector(`[data-mobile-tab=${tab}]`)?.click(); }
  function buildHome() {
    if (homeUi) return homeUi;
    const close = el('button', { type: 'button', className: 'secondary', textContent: '✕ متابعة المشروع الحالي' });
    const fromBook = el('button', { type: 'button', className: 'primary', textContent: '📚 فيديو جديد من أمثلة الكتاب' });
    const blank = el('button', { type: 'button', className: 'secondary', textContent: '＋ مشروع فارغ' });
    const pack = el('button', { type: 'button', className: 'secondary', textContent: '📂 فتح حزمة .nibor' });
    const listHost = el('div', { className: 'nm-home-list' }), current = el('p', { className: 'muted' });
    const box = el('div', { className: 'nm-home', role: 'dialog', ariaModal: 'true', ariaLabel: 'مشاريعي', hidden: true },
      el('div', { className: 'nm-home-inner' },
        el('div', { className: 'nm-home-head' }, el('h2', { textContent: '🏠 مشاريعي' }), close),
        current,
        el('div', { className: 'nm-home-new' }, fromBook, blank, pack),
        el('h3', { textContent: 'المشاريع المحفوظة على هذا الجهاز' }), listHost,
        el('p', { className: 'muted', textContent: 'كل مشروع يُحفظ تلقائياً مع أصواته. الخروج من المشروع لا يحذف شيئاً.' })));
    document.body.append(box);
    // The library list is rendered by project-store.js into #nmProjectList; show that same element here.
    const list = $('nmProjectList');
    const anchor = el('p', { className: 'muted' }, el('button', { type: 'button', className: 'secondary', textContent: '🏠 افتح شاشة مشاريعي', onclick: () => openHome() }));
    if (list) { list.replaceWith(anchor); listHost.append(list); }
    const start = tab => { if (!NM.core || NM.core.busy()) return; $('nmNewProject')?.click(); setTimeout(() => { closeHome(); goTab(tab); refresh(); }, 400); };
    // Generating from the book always creates a new project (new id); the current one stays in the library.
    fromBook.onclick = () => { closeHome(); goTab('start'); $('nmBookLibrary')?.scrollIntoView({ block: 'start' }); };
    blank.onclick = () => { setSimple(false); start('content'); };
    pack.onclick = () => { $('nmPackImport')?.click(); };
    $('nmPackFile')?.addEventListener('change', () => setTimeout(() => { closeHome(); goTab('start'); refresh(); }, 800));
    close.onclick = closeHome;
    listHost.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.textContent === 'فتح') setTimeout(() => { closeHome(); goTab('start'); refresh(); }, 700); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) closeHome(); });
    homeUi = { box, current };
    return homeUi;
  }
  function openHome() {
    if (!NM.core) return;
    if (NM.core.busy()) { NM.core.status('أوقف التشغيل أو التصدير أولاً'); return; }
    const h = buildHome(), st = NM.core.getState();
    h.current.textContent = `المفتوح الآن: ${st.name || 'مشروع بلا اسم'} (${st.scenes.length} مشهداً). محفوظ تلقائياً.`;
    NM.store?.renderLibrary?.(); h.box.hidden = false;
  }
  function closeHome() { if (homeUi) homeUi.box.hidden = true; }

  function init() {
    build(); if (!ui) return;
    const header = document.querySelector('.header');
    if (header && !$('nmHomeButton')) { header.append(el('button', { type: 'button', id: 'nmHomeButton', className: 'secondary nm-home-btn', textContent: '🏠 مشاريعي', onclick: openHome })); const sub = header.querySelector('p'); if (sub) sub.textContent = 'اختر مثالاً ← سجّل صوتك ← صدّر'; }
    buildHome();
    const tb = document.querySelector('.studio-actions');
    if (tb && !$('nmSimpleToggle')) { const b = el('button', { type: 'button', id: 'nmSimpleToggle', className: 'secondary' }); b.onclick = () => setSimple(!document.body.classList.contains('nm-simple')); tb.append(b); }
    const saved = store.get(); setSimple(saved == null ? true : saved === '1');
    if (!adoptLibrary()) { let n = 0; const t = setInterval(() => { if (adoptLibrary() || ++n > 40) clearInterval(t); }, 250); }
    const list = $('scenes'); if (list) new MutationObserver(refresh).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    const wait = setInterval(() => { if (NM.core) { clearInterval(wait); refresh(); } }, 200);
  }
  /** After a project is created: bring step n into view and pulse it, so the next action is obvious. */
  function focusStep(n) {
    if (!ui) return; const s = ui['s' + n]; if (!s) return;
    if (document.body.dataset.studioView !== 'start') goTab('start');
    refresh();
    setTimeout(() => {
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      s.box.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
      s.box.classList.remove('nm-qp-next'); void s.box.offsetWidth; s.box.classList.add('nm-qp-next');
      setTimeout(() => s.box.classList.remove('nm-qp-next'), 2600);
    }, 120);
  }
  NM.quickPath = { refresh, setSimple, openHome, closeHome, focusStep };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50)); else setTimeout(init, 50);
})(window.NM);
