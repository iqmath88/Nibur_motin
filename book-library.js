/* Nibor Motion v0.18.0 — مكتبة أمثلة الكتاب (من مستودع Math-books).
 *
 * book-examples.js (يولّده book-import.cjs) يحمل نص الأمثلة وخطواتها كما في Math-books.
 * هذه الوحدة تحوّل مثالاً واحداً إلى مشاهد: مشهد للمسألة، ثم مشهد لكل معادلة في الحل بالترتيب،
 * وتضيف محاكاة رياضية للأمثلة التي لها نموذج في sim-engine.js، تثبت عند لحظة التعويض.
 */
'use strict';
window.NM = window.NM || {};
(function (NM) {
  /** Examples with a simulation model. Givens copied from the book; Ht of the tank is a drawing assumption only. */
  const SIMS = {
    'g12c3/rates:rTank:1': { model: 'tank', params: { s: 2, Ht: 2.2, rate: -0.4 }, target: 1.2, unit: 'm', time: 'h', note: 'ارتفاع الخزان 2.2 m افتراض للرسم فقط؛ الجواب لا يعتمد عليه.' },
    'g12c3/rates:rPlate:2': { model: 'plate', params: { A: 96, rate: 2 }, target: 12, unit: 'cm', time: 's' },
    'g12c3/rates:rIce:3': { model: 'cube', params: { a: 8, rate: -6 }, target: 1, unit: 'cm', time: 's' },
    'g12c3/rates:rLadder:4': { model: 'ladder', params: { L: 10, rate: 2 }, target: 8, unit: 'm', time: 's' },
    'g12c3/rates:rCone:5': { model: 'cone', params: { H: 24, R: 8, inflow: 5, outflow: 1 }, target: 12, unit: 'cm', time: 's' }
  };
  const MAX_SCENES = 24, MAX_Q = 150;

  // ---- text and TeX conversion ----
  const inline = t => String(t || '')
    .replace(/\*\*/g, '')
    .replace(/\[\[[a-z]+:([^\]]*)\]\]/g, '$1')
    // Part labels a) b) … and 1) 2) … become LTR math tokens, so they are not mirrored inside Arabic text.
    .replace(/(^|\s)([a-e]|[1-9]|i{1,3}|iv)\)(?=\s)/g, (m, sp, l) => `${sp}\\(\\text{${l})}\\)`)
    .replace(/\$([^$]+)\$/g, (m, x) => '\\(' + x.trim() + '\\)')
    .replace(/\s+([.،:؛])/g, '$1')
    .replace(/\s+/g, ' ').trim();
  const speak = t => String(t || '').replace(/\*\*/g, '').replace(/\[\[[a-z]+:([^\]]*)\]\]/g, '$1')
    .replace(/\$([^$]+)\$/g, (m, x) => ' ' + (NM.speechFromMath ? NM.speechFromMath(x) : x) + ' ').replace(/\s+/g, ' ').trim();
  /** TeX → readable Unicode text for a human reader (teleprompter, narration script). Math runs are LTR-isolated. */
  function texText(tex) {
    let t = String(tex || '');
    for (let k = 0; k < 4; k++) t = t.replace(/\\(?:c[a-z]{1,3}|mark|text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, '$1');
    const frac = /\\[dt]?frac\s*(?:\{([^{}]*)\}|(\d))\s*(?:\{([^{}]*)\}|(\d|[a-z]))/;
    for (let k = 0; k < 6 && frac.test(t); k++) t = t.replace(frac, (m, a, a1, b, b1) => { const A = a ?? a1, B = b ?? b1; return `${/^[\w.]+$/.test(A) ? A : '(' + A + ')'}/${/^[\w.]+$/.test(B) ? B : '(' + B + ')'}`; });
    const sup = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', 'n': 'ⁿ' };
    t = t.replace(/\^\{([0-9n-]+)\}|\^([0-9n])/g, (m, a, b) => [...(a ?? b)].map(c => sup[c] || c).join(''));
    const map = { pi: 'π', theta: 'θ', alpha: 'α', beta: 'β', cdot: '·', times: '×', div: '÷', Rightarrow: '⇒', Leftrightarrow: '⇔', therefore: '∴', because: '∵', approx: '≈', ne: '≠', neq: '≠', le: '≤', leq: '≤', ge: '≥', geq: '≥', pm: '±', infty: '∞', to: '→', ldots: '…', cdots: '⋯', in: '∈', sqrt: '√' };
    t = t.replace(/\\left|\\right|\\big|\\Big/g, '').replace(/\\[,;:! ]|\\quad|\\qquad|~/g, ' ').replace(/\\([A-Za-z]+)/g, (m, w) => map[w] ?? (/^(sin|cos|tan|cot|sec|csc|ln|log|lim|exp|max|min|arcsin|arccos|arctan|sinh|cosh)$/.test(w) ? w + ' ' : ''));
    t = t.replace(/[{}]/g, '').replace(/&/g, '').replace(/\s+/g, ' ').trim();
    return t;
  }
  const readable = q => String(q || '').replace(/\\\((.*?)\\\)/g, (m, x) => '⁦' + texText(x) + '⁩');
  /** Split a long question at a comma or space outside \( … \), so each scene stays readable. */
  function chunks(text) {
    const out = []; let rest = text;
    while (rest.length > MAX_Q) {
      let punct = -1, space = -1, after = -1, depth = 0;
      for (let i = 0; i < rest.length; i++) {
        if (rest.startsWith('\\(', i)) depth++; else if (rest.startsWith('\\)', i)) depth--;
        if (depth) continue;
        if (i <= MAX_Q && i > 50 && '،.:؛'.includes(rest[i])) punct = i + 1;
        if (i <= MAX_Q && rest[i] === ' ') space = i;
        if (i > MAX_Q && rest[i] === ' ') { after = i; break; }
      }
      const cut = punct > 0 ? punct : space > 50 ? space : after;
      if (cut <= 0) break;
      out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
    return out;
  }
  /** Left side of the last relation, used when a book line continues with "= …". */
  function lhs(tex) {
    let depth = 0;
    for (let i = 0; i < tex.length; i++) {
      const ch = tex[i];
      if (ch === '{' || ch === '(' || ch === '[') depth++; else if (ch === '}' || ch === ')' || ch === ']') depth--;
      else if (ch === '=' && !depth) return tex.slice(0, i);
    }
    return '';
  }
  function cleanEq(tex) {
    return String(tex || '')
      .replace(/^\\text\{[a-e]\)\}\s*/, '').replace(/^[a-e]\)\\?\s*/, '')
      .replace(/\\quad\\ldots\s*\(\d+\)\s*$/, '').replace(/\\;\s*$/, '').trim();
  }
  /** One book display line → one or more equation lines (aligned rows become separate steps). */
  function expand(tex, prev) {
    const t = cleanEq(tex), out = [];
    const m = t.match(/\\begin\{aligned\}([\s\S]*)\\end\{aligned\}/);
    const rows = m ? m[1].split(/\\\\/).map(r => r.replace(/&/g, '').trim()).filter(Boolean) : [t];
    for (let r of rows) {
      if (/^=/.test(r) && prev && lhs(prev)) r = lhs(prev) + r;
      out.push(r); prev = r;
    }
    return out;
  }

  // ---- example → scenes ----
  function findExample(key) {
    const [bookId, exKey] = String(key).split('/');
    const book = NM.bookData?.books.find(b => b.id === bookId); if (!book) return null;
    for (const lesson of book.lessons) { const ex = lesson.examples.find(e => e.key === exKey); if (ex) return { book, lesson, ex }; }
    return null;
  }

  function scenesFor(book, lesson, ex) {
    const scenes = [], heading = `مثال ${ex.num || ''} · ص ${ex.page}`.replace('  ', ' ');
    const push = (title, question, equation, result, statement) => {
      if (scenes.length >= MAX_SCENES) return;
      const q = question || '', words = (q.replace(/\\\(.*?\\\)/g, ' س ').split(/\s+/).length);
      scenes.push({ title, question: q, equation: equation || '', result: !!result, statement: !!statement, duration: Math.max(4, Math.min(12, 2.5 + words * .38 + (equation ? 2.5 : 0))) });
    };
    // Problem statement (the first step's text), split for readability.
    const first = ex.steps[0], statement = first.items.filter(i => i.t === 'text' && !i.from).map(i => inline(i.v)).join(' ');
    const parts = chunks(statement);
    parts.forEach((part, i) => push(ex.title || heading, part, '', false, true));
    let prevEq = '';
    ex.steps.forEach((st, si) => {
      const title = st.label || ex.title || heading;
      let pending = '';
      const items = si === 0 ? st.items.filter(i => !(i.t === 'text' && !i.from)) : st.items;
      for (const it of items) {
        if (it.t === 'text' || it.t === 'head') { const v = inline(it.v); if (v && !/^الحل:?$/.test(v)) pending = pending ? pending + ' ' + v : v; if (pending.length > MAX_Q) { const c = chunks(pending); c.slice(0, -1).forEach(x => push(title, x, '', false)); pending = c[c.length - 1]; } }
        else if (it.t === 'let') {
          const rows = it.rows.slice(0, 3).map(r => [inline(r[0]), inline(r[1]), r[2] && r[2].length < 45 ? inline(r[2]) : ''].filter(Boolean).join(' : '));
          push(title, `${it.title || 'نفرض'}: ${rows.join(' · ')}`, '', false);
        } else if (it.t === 'note') push('تنبيه على الكتاب', inline(it.v), '', false);
        else if (it.t === 'eq') {
          for (const row of expand(it.v, prevEq)) { push(title, pending, row, st.result); pending = ''; prevEq = row; }
        }
      }
      if (pending) push(title, pending, '', st.result);
    });
    return scenes;
  }

  /** Index of the first scene that substitutes the target value — the simulation holds it from there. */
  function holdIndex(scenes, target) {
    const re = new RegExp(`(^|[^\\d.])${String(target).replace('.', '\\.')}([^\\d.]|$)`);
    const i = scenes.findIndex((s, k) => k > 0 && re.test(s.equation));
    return i > 0 ? i : scenes.length;
  }

  const ASK = /(^|\s)(جد|أوجد|اوجد|احسب|برهن|اثبت|أثبت|بيّن|بين|حل|ما|كم|هل|عين|عيّن)\s/;
  /** Short reel: a hook with the question, then only equation scenes (the narrator explains the text), ≤ ~60 s.
   *  Text scenes that are dropped become part of the next scene's teleprompter script, so nothing is lost. */
  function reelScenes(full, ex) {
    const statement = full.filter(s => s.statement).map(s => s.question).join(' ');
    const sentences = statement.split(/(?<=[.،؛:])\s+/);
    let at = sentences.findIndex(x => ASK.test(x.replace(/\\\(.*?\\\)/g, ''))); if (at < 0) at = sentences.length - 1;
    let ask = sentences[at] || '';
    // «… مما يأتي:» — the parts follow; show them with the question.
    if (/:\s*$/.test(ask) && sentences[at + 1]) ask += ' ' + sentences.slice(at + 1).join(' ');
    if (ask.length > 110) { const m = ask.search(ASK); if (m > 0 && !/\\\([^)]*$/.test(ask.slice(0, m))) ask = ask.slice(m).trim(); }
    if (ask.length > 150) ask = chunks(ask)[0];
    const out = [{ title: ex.title || `مثال ${ex.num}`, question: ask, equation: '', result: false, duration: 4, speech: readable(statement) }];
    let notes = [];
    const body = full.filter(s => !s.statement);
    for (const s of body) {
      if (!s.equation) { if (s.question) notes.push(readable(s.question)); continue; }
      out.push({ title: s.title, question: '', equation: s.equation, result: s.result, duration: s.equation.length > 60 ? 4.5 : 3.5,
        speech: [...notes, readable(s.question), '\u2066' + texText(s.equation) + '\u2069'].filter(Boolean).join(' — ') });
      notes = [];
    }
    if (notes.length && out.length > 1) { const last = out[out.length - 1]; last.speech += ' — ' + notes.join(' — '); }
    // Too many equations for a reel: keep the first and last equation of each step, then only the last ones.
    const MAXEQ = 14;
    let eqs = out.slice(1);
    const thin = keepFirst => eqs.filter((s, i) => (keepFirst && (i === 0 || eqs[i - 1].title !== s.title)) || i === eqs.length - 1 || eqs[i + 1].title !== s.title);
    if (eqs.length > MAXEQ) eqs = thin(true);
    if (eqs.length > MAXEQ) eqs = thin(false);
    if (eqs.length > MAXEQ) eqs = eqs.slice(-MAXEQ);
    const res = [out[0], ...eqs];
    const last = res[res.length - 1]; if (res.length > 1) { last.result = true; if (!/الفقرة|^[a-e]\)/.test(last.title)) last.title = 'النتيجة'; last.duration = 4.5; }
    return res;
  }

  function buildProject(base, key, mode = 'reel') {
    const found = findExample(key); if (!found) throw Error('المثال غير موجود في المكتبة');
    const { book, lesson, ex } = found, full = scenesFor(book, lesson, ex);
    const raw = mode === 'full' ? full : reelScenes(full, ex);
    if (!raw.length) throw Error('لا توجد خطوات قابلة للتحويل في هذا المثال');
    const simSpec = SIMS[key];
    let sims = null;
    if (simSpec && NM.sim) {
      const m = NM.sim.MODELS[simSpec.model], params = NM.sim.clean({ model: simSpec.model, params: simSpec.params }).params;
      const { stops, extent } = NM.sim.approach(m, params, simSpec.target, raw.length, holdIndex(raw, simSpec.target));
      const hold = holdIndex(raw, simSpec.target), cams = NM.sim.cameraChain(raw.length, hold < raw.length ? hold : -1);
      sims = raw.map((s, i) => ({ model: simSpec.model, params, from: stops[i], to: stops[i + 1], extent, ease: 'physical', readout: true, unit: simSpec.unit, time: simSpec.time, camera: cams[i] }));
    }
    const existing = JSON.parse(JSON.stringify(base)), id = Date.now().toString(36);
    const reel = mode !== 'full';
    const layout = sims
      ? { titleY: 18, questionY: 27, equationY: 79, titleSize: 52, questionSize: 36, equationScale: 108 }
      : reel ? { titleY: 24, questionY: 40, equationY: 52, titleSize: 58, questionSize: 44, equationScale: 115 }
      : { titleY: 24, questionY: 40, equationY: 62, titleSize: 54, questionSize: 42, equationScale: 120 };
    return {
      ...existing,
      projectId: 'book-' + id,
      format: 'portrait', chapters: [],
      name: `${reel ? 'ريلز · ' : ''}${book.title} · مثال ${ex.num} ص ${ex.page}${ex.title ? ' — ' + ex.title : ''}`.slice(0, 120),
      theme: 'dark',
      branding: { ...existing.branding, showHeader: true, showFooter: true, header: `${book.grade} · ${book.title} · \u2066[${lesson.num}]\u2069`, footer: `مثال ${ex.num} · ص ${ex.page} · \u2066Math-books\u2069` },
      scenes: raw.map((s, i) => ({
        id: `book-${id}-${i + 1}`,
        title: s.title, question: s.question, equation: s.equation, answer: '',
        speechText: (s.speech ?? [readable(s.question), s.equation ? '\u2066' + texText(s.equation) + '\u2069' : ''].filter(Boolean).join(' — ')).slice(0, 4000),
        duration: Math.round(s.duration * 2) / 2, qAt: reel ? 4 : 6, eAt: s.question ? (reel ? 12 : 30) : 6, aAt: 80, equationAnimDuration: reel ? 22 : 30,
        ...layout,
        titleBg: s.result ? 'rounded' : 'none', titleBgColor: '#f4d96c', questionBg: 'none', equationAnim: 'morph', transition: 'slide',
        ...(sims ? { sim: sims[i] } : {})
      }))
    };
  }

  // ---- «درس كامل»: فيديو أفقي 16:9 لليوتيوب: الشرح ثم كل مثال في موضعه، مع فصول (chapters) ----
  const LAND = {
    sim: { titleX: 50, titleY: 14, questionX: 74, questionY: 32, equationX: 74, equationY: 64, titleSize: 52, questionSize: 42, equationScale: 105 },
    text: { titleX: 50, titleY: 15, questionX: 50, questionY: 38, equationX: 50, equationY: 66, titleSize: 58, questionSize: 48, equationScale: 125 },
    card: { titleX: 50, titleY: 40, questionX: 50, questionY: 58, equationX: 50, equationY: 75, titleSize: 76, questionSize: 40, equationScale: 110 }
  };
  function simFor(key, segment) {
    const spec = SIMS[key]; if (!spec || !NM.sim) return null;
    const m = NM.sim.MODELS[spec.model], params = NM.sim.clean({ model: spec.model, params: spec.params }).params;
    const hold = holdIndex(segment, spec.target);
    const { stops, extent } = NM.sim.approach(m, params, spec.target, segment.length, hold);
    const cams = NM.sim.cameraChain(segment.length, hold < segment.length ? hold : -1);
    return segment.map((s, i) => ({ model: spec.model, params, from: stops[i], to: stops[i + 1], extent, ease: 'physical', readout: true, unit: spec.unit, time: spec.time, camera: cams[i] }));
  }
  function lessonScenes(book, lesson) {
    const out = [], chapters = [];
    const card = (title, question) => ({ title, question, equation: '', result: false, duration: 4, layout: 'card', card: true });
    out.push(card(lesson.title, `${book.grade} · ${book.title} · البند [${lesson.num}] · ص ${lesson.pages}`));
    chapters.push({ scene: 0, title: 'مقدمة: ' + lesson.title });
    const done = new Set();
    const flow = [...(lesson.flow || []), ...lesson.examples.filter(e => !(lesson.flow || []).some(f => f.key === e.key)).map(e => ({ t: 'example', key: e.key }))];
    for (const f of flow) {
      if (f.t === 'concept') {
        const pseudo = { num: '', page: f.page, title: f.title || lesson.title, steps: [{ label: f.title || lesson.title, result: false, items: f.items.map(i => i.t === 'text' && !i.from ? { ...i, from: 'p' } : i) }] };
        for (const sc of scenesFor(book, lesson, pseudo)) out.push({ ...sc, layout: 'text' });
      } else {
        const ex = lesson.examples.find(e => e.key === f.key); if (!ex || done.has(ex.key)) continue; done.add(ex.key);
        const label = `مثال ${ex.num} · ص ${ex.page}`;
        chapters.push({ scene: out.length, title: label + (ex.title ? ' — ' + ex.title : '') });
        out.push(card(label, ex.title || ''));
        const seg = scenesFor(book, lesson, ex), sims = simFor(`${book.id}/${ex.key}`, seg);
        seg.forEach((sc, i) => out.push({ ...sc, layout: sims ? 'sim' : 'text', sim: sims ? sims[i] : undefined }));
      }
    }
    return { scenes: out, chapters };
  }
  function buildLesson(base, lessonKey) {
    const [bookId, lessonId] = String(lessonKey).split('/');
    const book = NM.bookData?.books.find(b => b.id === bookId), lesson = book?.lessons.find(l => l.id === lessonId);
    if (!lesson) throw Error('الدرس غير موجود في المكتبة');
    const { scenes, chapters } = lessonScenes(book, lesson);
    if (scenes.length > 600) throw Error('الدرس أطول من 600 مشهد');
    const existing = JSON.parse(JSON.stringify(base)), id = Date.now().toString(36);
    return {
      ...existing,
      projectId: 'lesson-' + id, format: 'landscape', chapters,
      name: `درس · ${book.title} · [${lesson.num}] ${lesson.title}`.slice(0, 120),
      theme: 'dark',
      overlays: { ...(existing.overlays || {}), safeGuide: 'none', progress: true },
      branding: { ...existing.branding, showHeader: true, showFooter: true, header: `${book.grade} · ${book.title} · \u2066[${lesson.num}]\u2069 ${lesson.title}`, footer: `ص ${lesson.pages} · \u2066Math-books\u2069` },
      scenes: scenes.map((s, i) => ({
        id: `lesson-${id}-${i + 1}`,
        title: s.title, question: s.question, equation: s.equation, answer: '',
        speechText: [readable(s.question), s.equation ? '⁦' + texText(s.equation) + '⁩' : ''].filter(Boolean).join(' — ').slice(0, 4000) || s.title,
        duration: Math.round(s.duration * 2) / 2, qAt: s.card ? 8 : 6, eAt: s.question ? 30 : 6, aAt: 80, equationAnimDuration: 30,
        ...LAND[s.layout],
        titleBg: s.result ? 'rounded' : 'none', titleBgColor: '#f4d96c', questionBg: 'none',
        equationAnim: s.card ? 'fade' : 'morph', transition: 'slide',
        ...(s.sim ? { sim: s.sim } : {})
      }))
    };
  }

  // ---- UI ----
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };
  function init() {
    const panel = document.getElementById('autoReelsPanel');
    if (!panel || document.getElementById('nmBookLibrary') || !NM.bookData) return;
    const data = NM.bookData;
    const box = el('section', { id: 'nmBookLibrary', className: 'nm-sim-generator' });
    const bookSel = el('select', { id: 'nmBookSelect' }), lessonSel = el('select', { id: 'nmLessonSelect' }), exSel = el('select', { id: 'nmExampleSelect' });
    const modeSel = el('select', { id: 'nmBookMode' }, el('option', { value: 'reel', textContent: 'ريلز قصير: المعادلات على الشاشة والشرح بصوتك (≈ دقيقة)' }), el('option', { value: 'full', textContent: 'شرح كامل لمثال: كل نصوص الكتاب على الشاشة' }), el('option', { value: 'lesson', textContent: 'درس كامل لليوتيوب (أفقي 16:9): الشرح وكل الأمثلة' }), el('option', { value: 'chalk', textContent: '🧑‍🏫 ريلز السبورة الطباشيرية (مثالا 4 و5 · ص 94–95)' }));
    const info = el('p', { className: 'muted', role: 'status' }), btn = el('button', { type: 'button', id: 'nmBookGenerate', textContent: '📚 إنشاء فيديو المثال' });
    for (const b of data.books) bookSel.append(el('option', { value: b.id, textContent: `${b.grade} · ${b.title}` }));
    const book = () => data.books.find(b => b.id === bookSel.value);
    const lesson = () => book()?.lessons.find(l => l.id === lessonSel.value);
    const key = () => `${bookSel.value}/${exSel.value}`;
    function fillLessons() { lessonSel.replaceChildren(); for (const l of book().lessons) lessonSel.append(el('option', { value: l.id, textContent: `[${l.num}] ${l.title} — ${l.examples.length} مثال` })); fillExamples(); }
    function fillExamples() { exSel.replaceChildren(); for (const e of lesson().examples) exSel.append(el('option', { value: e.key, textContent: `مثال ${e.num} · ص ${e.page}${e.title ? ' — ' + e.title : ''}${SIMS[`${bookSel.value}/${e.key}`] ? ' 🎬' : ''}` })); describe(); }
    function describe() {
      const f = findExample(key()); if (!f) { info.textContent = ''; return; }
      if (modeSel.value === 'lesson') { const L = lessonScenes(f.book, f.lesson), secs = L.scenes.reduce((a, s) => a + s.duration, 0); exSel.disabled = true;
        info.textContent = `الدرس كاملاً: ${L.scenes.length} مشهداً و${L.chapters.length - 1} مثالاً، نحو ${Math.round(secs / 60)} دقيقة قبل التسجيل (يطول مع صوتك). أفقي 1920×1080 مع فصول لليوتيوب.`; return; }
      exSel.disabled = false;
      if (modeSel.value === 'chalk') { const id = NM.chalk?.forKey(key()); info.textContent = id ? NM.chalk.describe(id) : 'ريلز السبورة متاح حالياً لمثالين: السلم (مثال 4 ص 94) والمرشح المخروطي (مثال 5 ص 95). اختر أحدهما.'; return; }
      const full = scenesFor(f.book, f.lesson, f.ex), list = modeSel.value === 'full' ? full : reelScenes(full, f.ex), n = list.length, sim = SIMS[key()];
      const secs = Math.round(list.reduce((a, s) => a + s.duration, 0));
      info.textContent = `${n} مشهداً · نحو ${secs} ث قبل التسجيل${sim ? ' · مع محاكاة: ' + NM.sim.MODELS[sim.model].label + (sim.note ? ' — ' + sim.note : '') : ''}. النص والمعادلات من الكتاب كما في Math-books؛ راجعها قبل النشر.`;
    }
    bookSel.onchange = fillLessons; lessonSel.onchange = fillExamples; exSel.onchange = describe; modeSel.onchange = describe;
    // Default to the related-rates lesson, example 5 p.95, when present.
    if (data.books.some(b => b.id === 'g12c3')) bookSel.value = 'g12c3';
    fillLessons();
    if ([...lessonSel.options].some(o => o.value === 'rates')) { lessonSel.value = 'rates'; fillExamples(); }
    if ([...exSel.options].some(o => o.value === 'rates:rCone:5')) { exSel.value = 'rates:rCone:5'; describe(); }
    btn.onclick = () => {
      if (!NM.core || !NM.loadProject) { info.textContent = 'المحرر غير جاهز بعد.'; return; }
      if (NM.core.busy()) { info.textContent = 'أوقف التشغيل أو التصدير أولاً.'; return; }
      if (modeSel.value === 'chalk' && !NM.chalk?.forKey(key())) { info.textContent = 'ريلز السبورة متاح حالياً لمثالي السلم (4 ص 94) والمرشح المخروطي (5 ص 95).'; return; }
      let project; try { project = modeSel.value === 'chalk' ? NM.chalk.build(NM.core.getState(), NM.chalk.forKey(key())) : modeSel.value === 'lesson' ? buildLesson(NM.core.getState(), `${bookSel.value}/${lessonSel.value}`) : buildProject(NM.core.getState(), key(), modeSel.value); } catch (e) { info.textContent = 'تعذر الإنشاء: ' + e.message; return; }
      if (!confirm('سيُنشأ مشروع جديد لهذا المثال، ويبقى المشروع الحالي محفوظاً في «🏠 مشاريعي». متابعة؟')) return;
      try { NM.loadProject(project, `تم إنشاء ${project.scenes.length} مشهداً من الكتاب. راجع المعادلات قبل التصدير.`); } catch (e) { info.textContent = 'تعذر الإنشاء: ' + e.message; }
    };
    const field = (t, i) => el('label', { className: 'nm-sim-field' }, t, i);
    box.append(el('h3', { textContent: '📚 أمثلة الكتاب (Math-books)' }),
      el('p', { className: 'muted', textContent: `${data.books.reduce((n, b) => n + b.lessons.reduce((m, l) => m + l.examples.length, 0), 0)} مثالاً محلولاً. اختر مثالاً فيُبنى فيديو بخطوات حله، و🎬 تعني أن له محاكاة متحركة.` }),
      field('الكتاب والفصل', bookSel), field('الدرس', lessonSel), field('المثال', exSel), field('نوع الفيديو', modeSel), el('div', { className: 'actions' }, btn), info);
    panel.insertBefore(box, document.getElementById('nmSimGenerator') || null);
  }
  NM.texText = texText; NM.readableText = readable;
  NM.bookLibrary = { SIMS, scenesFor, reelScenes, lessonScenes, buildLesson, buildProject, findExample, init, _expand: expand, _chunks: chunks };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);
  document.addEventListener('nm:core-ready', init);
})(window.NM);
