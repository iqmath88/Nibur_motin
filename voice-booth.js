/* Nibor Motion v0.19.0 — استوديو التسجيل (تعليق صوتي بشري مباشر).
 *
 * تسجيل واحد متصل لكل المشاهد: المعلّم يقرأ نص المشهد من الملقّن وهو يرى حركته، ثم يضغط «التالي».
 * عند الإنهاء يُقص التسجيل عند حدود المشاهد، ويُحذف الصمت من الطرفين، ويُضبط مستوى الصوت،
 * ويُحفظ لكل مشهد ملف WAV، وتصبح مدة المشهد = مدة صوته + 0.6 ث (إن كان «مدة المشهد تتبع الصوت» مفعّلاً).
 */
'use strict';
window.NM = window.NM || {};
(function (NM) {
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) if (k != null) e.append(k); return e; };

  // ---------- audio processing (pure, testable) ----------
  /** Mono Float32 from an AudioBuffer-like object. */
  function mono(buf) {
    const n = buf.length, out = new Float32Array(n), ch = buf.numberOfChannels;
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / ch; }
    return out;
  }
  /** Voiced region of a clip: 20 ms RMS frames above an adaptive threshold. Returns null for silence. */
  function voiced(x, sr) {
    const w = Math.max(1, Math.round(sr * .02)), frames = [];
    for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; frames.push(Math.sqrt(s / w)); }
    if (!frames.length) return null;
    const sorted = [...frames].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * .1)];
    const thr = Math.max(.008, floor * 3.5);
    let first = frames.findIndex(v => v > thr), last = -1;
    for (let i = frames.length - 1; i >= 0; i--) if (frames[i] > thr) { last = i; break; }
    if (first < 0) return null;
    let sum = 0, cnt = 0; for (let i = first; i <= last; i++) if (frames[i] > thr) { sum += frames[i] * frames[i]; cnt++; }
    return { start: first * w, end: Math.min(x.length, (last + 1) * w), rms: Math.sqrt(sum / Math.max(1, cnt)), thr };
  }
  /** Trim silence (keeping natural padding), level to about −20 dBFS speech RMS with a −1 dB peak ceiling, fade edges. */
  function processClip(x, sr, opt = {}) {
    const v = voiced(x, sr); if (!v) return null;
    const pre = Math.round(sr * (opt.pre ?? .12)), post = Math.round(sr * (opt.post ?? .25));
    const a = Math.max(0, v.start - pre), b = Math.min(x.length, v.end + post), y = x.slice(a, b);
    let peak = 0; for (const s of y) peak = Math.max(peak, Math.abs(s));
    const gain = Math.min(8, .1 / Math.max(1e-6, v.rms), .89 / Math.max(1e-6, peak));
    const fade = Math.min(Math.round(sr * .012), y.length >> 1);
    for (let i = 0; i < y.length; i++) { let g = gain; if (i < fade) g *= i / fade; else if (i >= y.length - fade) g *= (y.length - 1 - i) / fade; y[i] *= g; }
    return { samples: y, seconds: y.length / sr, gain, trimmedStart: a / sr };
  }
  function wav(samples, sr) {
    const buf = new ArrayBuffer(44 + samples.length * 2), d = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); d.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true);
    d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); str(36, 'data'); d.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) d.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
    return new Blob([buf], { type: 'audio/wav' });
  }
  /** Cut one continuous take into scene clips at the marks [{id, start, end}] (seconds from take start). */
  function split(x, sr, marks, opt) {
    return marks.map(m => {
      const a = Math.max(0, Math.round(m.start * sr)), b = Math.min(x.length, Math.round(m.end * sr));
      const clip = b > a ? processClip(x.slice(a, b), sr, opt) : null;
      return { id: m.id, clip };
    });
  }

  // ---------- booth UI ----------
  let ui = null, session = null;
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function sceneText(s) {
    const t = String(s.speechText || '').trim();
    if (t) return t;
    const q = NM.readableText ? NM.readableText(s.question) : String(s.question || '');
    const e = s.equation ? '\u2066' + (NM.texText ? NM.texText(s.equation) : s.equation) + '\u2069' : '';
    return [q, e].filter(Boolean).join(' — ') || 'لا يوجد نص تعليق لهذا المشهد. تحدّث بحرية.';
  }

  function build() {
    const preview = el('canvas', { width: 360, height: 640, className: 'nm-booth-preview' });
    const counter = el('div', { className: 'nm-booth-counter' }), title = el('h2', { className: 'nm-booth-title' });
    const prompt = el('div', { className: 'nm-booth-prompt', dir: 'rtl' });
    const meter = el('div', { className: 'nm-booth-meter' }, el('i'));
    const clock = el('div', { className: 'nm-booth-clock', textContent: '0:00' });
    const take = el('p', { className: 'nm-booth-take', role: 'status' });
    const msg = el('p', { className: 'nm-booth-msg', role: 'status' });
    const big = el('button', { type: 'button', className: 'nm-booth-big', textContent: '● ابدأ التسجيل' });
    const retake = el('button', { type: 'button', className: 'secondary', textContent: '↺ أعِد هذا المشهد', disabled: true });
    const prev = el('button', { type: 'button', className: 'secondary', textContent: '→ المشهد السابق' });
    const cancel = el('button', { type: 'button', className: 'secondary', textContent: 'إلغاء' });
    const close = el('button', { type: 'button', className: 'secondary nm-booth-close', textContent: '✕ إغلاق' });
    const one = el('input', { type: 'checkbox' }), fit = el('input', { type: 'checkbox', checked: true });
    const opts = el('div', { className: 'nm-booth-opts' },
      el('label', {}, one, ' مشهد واحد فقط (إعادة تسجيله)'),
      el('label', {}, fit, ' مدة المشهد تتبع الصوت (تقصر وتطول معه)'));
    const box = el('div', { className: 'nm-booth', role: 'dialog', ariaModal: 'true', ariaLabel: 'استوديو التسجيل' },
      el('div', { className: 'nm-booth-head' }, el('strong', { textContent: '🎙️ استوديو التسجيل' }), counter, close),
      el('div', { className: 'nm-booth-body' },
        el('div', { className: 'nm-booth-stage' }, preview, el('div', { className: 'nm-booth-live' }, meter, clock), take),
        el('div', { className: 'nm-booth-side' }, title, prompt, opts,
          el('div', { className: 'nm-booth-actions' }, big),
          el('div', { className: 'nm-booth-actions' }, prev, retake, cancel), msg)));
    const wrap = el('div', { className: 'nm-booth-backdrop', hidden: true }, box);
    document.body.append(wrap);
    ui = { wrap, preview, counter, title, prompt, meter: meter.firstChild, clock, take, msg, big, retake, prev, cancel, close, one, fit };
    close.onclick = () => closeBooth();
    cancel.onclick = () => stop(false);
    retake.onclick = () => { if (!session?.recording) return; session.segStart = session.now(); session.segScene = session.i; ui.msg.textContent = 'أعد قراءة المشهد من بدايته.'; };
    prev.onclick = () => { if (session?.recording) { if (session.i > session.first) { session.marks = session.marks.filter(m => m.index !== session.i - 1); session.i--; session.segStart = session.now(); show(); } } else { select(-1); } };
    big.onclick = () => { if (!session) start(); else if (session.recording) next(); };
  }

  function state() { return NM.core.getState(); }
  let cursor = 0;
  function select(delta) { const n = state().scenes.length; cursor = Math.max(0, Math.min(n - 1, cursor + delta)); show(); }

  function show() {
    const st = state(), i = session ? session.i : cursor, s = st.scenes[i];
    ui.counter.textContent = `المشهد ${i + 1} / ${st.scenes.length}${NM.core.hasVoice(s.id) ? ' · له صوت' : ''}`;
    ui.title.textContent = s.title || 'مشهد';
    ui.prompt.textContent = sceneText(s);
    const last = session && (session.single || session.i === st.scenes.length - 1);
    ui.big.textContent = !session ? '● ابدأ التسجيل' : session.recording ? (last ? '✓ إنهاء وحفظ' : 'التالي ←') : '…';
    ui.prev.textContent = session?.recording ? '→ أعد المشهد السابق' : '→ المشهد السابق';
    ui.prev.disabled = session?.recording ? session.i <= session.first : i === 0;
    if (!session) { NM.core.preview(i, 1); mirror(); }
  }
  function mirror() { const src = document.getElementById('stage'); if (src) { const c = ui.preview.getContext('2d'); c.drawImage(src, 0, 0, ui.preview.width, ui.preview.height); } }

  function openBooth() {
    if (!NM.core) return;
    if (NM.core.busy()) { NM.core.status('أوقف التشغيل أو التصدير أولاً'); return; }
    if (!ui) build();
    cursor = 0;
    const sel = document.querySelector('#scenes .scene.active'); if (sel) cursor = [...sel.parentNode.children].indexOf(sel);
    ui.wrap.hidden = false; ui.msg.textContent = 'اقرأ نص الملقّن بصوت طبيعي. اضغط «التالي» بعد آخر كلمة في كل مشهد. لا بأس بالتوقف؛ الصمت يُحذف آلياً.';
    show();
  }
  function closeBooth() { if (session) stop(false); if (ui) ui.wrap.hidden = true; }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { ui.msg.textContent = 'التسجيل غير مدعوم في هذا المتصفح.'; return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 } }); }
    catch (e) { ui.msg.textContent = 'لم يُسمح باستعمال الميكروفون: ' + e.message; return; }
    const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'], mime = types.find(t => MediaRecorder.isTypeSupported(t));
    const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 1024;
    ac.createMediaStreamSource(stream).connect(an);
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {}), chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const st = state();
    session = { stream, ac, an, rec, chunks, first: cursor, i: cursor, single: ui.one.checked, fit: ui.fit.checked, marks: [], recording: false, t0: 0, segStart: 0, ids: st.scenes.map(s => s.id) };
    session.now = () => (performance.now() - session.t0) / 1000;
    ui.one.disabled = ui.fit.disabled = true; ui.big.disabled = true;
    for (const n of [3, 2, 1]) { ui.big.textContent = String(n); NM.core.preview(cursor, 0); mirror(); await new Promise(r => setTimeout(r, 700)); if (!session) return; }
    await new Promise(r => { rec.onstart = r; rec.start(250); });
    session.t0 = performance.now(); session.segStart = 0; session.recording = true;
    ui.big.disabled = false; ui.retake.disabled = false; show(); loop();
  }

  function loop() {
    if (!session?.recording) return;
    const st = state(), s = st.scenes[session.i], el2 = session.now() - session.segStart;
    NM.core.preview(session.i, Math.min(1, el2 / Math.max(1, s.duration))); mirror();
    const d = new Uint8Array(session.an.fftSize); session.an.getByteTimeDomainData(d);
    let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v - 128) / 128);
    ui.meter.style.width = Math.min(100, peak * 140) + '%'; ui.meter.className = peak > .92 ? 'hot' : '';
    ui.clock.textContent = '● ' + fmtT(session.now());
    const over = el2 > s.duration;
    ui.take.textContent = `هذا المشهد: ${el2.toFixed(1)} ث${over ? ` (أطول من ${s.duration} ث الحالية — لا مشكلة، المدة ستتمدد مع صوتك)` : ''}. التسجيل مفتوح بلا حد؛ خذ وقتك ثم اضغط «التالي».`;
    ui.take.classList.toggle('over', over);
    requestAnimationFrame(loop);
  }

  function next() {
    const t = session.now();
    session.marks.push({ id: session.ids[session.i], index: session.i, start: session.segStart, end: t });
    if (session.single || session.i >= session.ids.length - 1) { stop(true); return; }
    session.i++; session.segStart = t; show();
  }

  async function stop(keep) {
    const s = session; if (!s) return;
    s.recording = false;
    const done = new Promise(r => { s.rec.onstop = r; });
    try { if (s.rec.state !== 'inactive') s.rec.stop(); } catch (e) { /* already stopped */ }
    await done.catch(() => {});
    s.stream.getTracks().forEach(t => t.stop());
    session = null; ui.one.disabled = ui.fit.disabled = false; ui.retake.disabled = true; ui.big.disabled = false;
    ui.clock.textContent = '0:00'; ui.meter.style.width = '0'; ui.take.textContent = '';
    if (!keep || !s.marks.length) { s.ac.close().catch(() => {}); ui.msg.textContent = 'أُلغي التسجيل، ولم يتغير شيء.'; show(); return; }
    ui.msg.textContent = 'جارٍ معالجة التسجيل…';
    try {
      const blob = new Blob(s.chunks, { type: s.rec.mimeType || 'audio/webm' });
      const buf = await s.ac.decodeAudioData(await blob.arrayBuffer());
      const x = mono(buf), sr = buf.sampleRate;
      const results = split(x, sr, s.marks);
      let saved = 0; const silent = [];
      const long = [];
      for (const r of results) {
        if (!r.clip) { silent.push(s.ids.indexOf(r.id) + 1); continue; }
        if (r.clip.seconds > 119) long.push(s.ids.indexOf(r.id) + 1);
        NM.core.setVoice(r.id, wav(r.clip.samples, sr), r.clip.seconds, s.fit); saved++;
      }
      ui.msg.textContent = `حُفظ صوت ${saved} مشهداً، ومدة كل مشهد صارت بطول صوته${silent.length ? ` · لم يُلتقط كلام في المشهد ${silent.join('، ')}` : ''}${long.length ? ` · المشهد ${long.join('، ')} أطول من دقيقتين، فقُص عند 120 ث؛ قسّمه إلى مشهدين` : ''}. شغّل الفيديو للمعاينة، أو أعد تسجيل أي مشهد.`;
      cursor = Math.min(state().scenes.length - 1, s.i + (s.single ? 0 : 1));
    } catch (e) { ui.msg.textContent = 'تعذرت معالجة التسجيل: ' + e.message; }
    finally { s.ac.close().catch(() => {}); show(); }
  }

  function init() {
    const host = document.getElementById('recordAudio')?.closest('.actions');
    if (host && !document.getElementById('nmOpenBooth')) {
      const b = el('button', { type: 'button', id: 'nmOpenBooth', textContent: '🎙️ استوديو التسجيل (كل المشاهد)' });
      b.onclick = openBooth; host.parentNode.insertBefore(el('div', { className: 'actions' }, b), host);
    }
    const exp = document.getElementById('export')?.parentNode;
    if (exp && !document.getElementById('nmOpenBooth2')) { const b = el('button', { type: 'button', id: 'nmOpenBooth2', className: 'secondary', textContent: '🎙️ سجّل التعليق' }); b.onclick = openBooth; exp.insertBefore(b, exp.firstChild?.nextSibling || null); }
  }
  NM.voiceBooth = { open: openBooth, close: closeBooth, init, _processClip: processClip, _split: split, _voiced: voiced, _wav: wav };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NM);
