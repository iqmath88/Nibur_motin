/* Nibor Motion v0.20.0 — محرك حركة المعادلات (تحول الرموز).
 *
 * كل معادلة تُحلَّل إلى «ممثلين»: رموز MathJax (مسار لكل حرف) وخطوط الكسور والجذور، ولكل ممثل
 * مفتاح (رمز الحرف) ومصفوفة موضع ولون. عند الانتقال من معادلة المشهد السابق إلى معادلة المشهد:
 * الرموز المشتركة (بمطابقة أطول تتابع مشترك) تنزلق من مكانها القديم إلى الجديد، والمحذوفة تتلاشى،
 * والجديدة تظهر. كل شيء دالة في نسبة التقدم فقط، فالمعاينة تطابق التصدير.
 */
'use strict';
window.NM = window.NM || {};
(function (NM) {
  const cache = new Map(), MAX = 200;
  const ACCENT = '#f4d96c';

  // ---- 2D affine matrices [a, b, c, d, e, f] (canvas order) ----
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const I = [1, 0, 0, 1, 0, 0];
  function parseTransform(str) {
    let m = I; const re = /(translate|scale|matrix)\s*\(([^)]*)\)/g; let t;
    while ((t = re.exec(String(str || '')))) {
      const v = t[2].split(/[\s,]+/).filter(Boolean).map(Number);
      if (t[1] === 'translate') m = mul(m, [1, 0, 0, 1, v[0] || 0, v[1] || 0]);
      else if (t[1] === 'scale') m = mul(m, [v[0], 0, 0, v.length > 1 ? v[1] : v[0], 0, 0]);
      else if (v.length === 6) m = mul(m, v);
    }
    return m;
  }

  /** Walk a MathJax SVG and collect actors in document order. */
  function actorsOf(svg, baseColor) {
    const out = [];
    function walk(node, m, fill) {
      for (const el of node.children) {
        const tag = el.tagName.toLowerCase();
        let mm = el.hasAttribute('transform') ? mul(m, parseTransform(el.getAttribute('transform'))) : m;
        const f = el.getAttribute('fill'); const color = f && f !== 'currentColor' && f !== 'none' ? f : fill;
        if (tag === 'svg') {
          const vb = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
          const x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0, w = +el.getAttribute('width'), h = +el.getAttribute('height');
          if (vb.length === 4 && w > 0 && h > 0 && vb[2] > 0 && vb[3] > 0) mm = mul(mul(mm, [1, 0, 0, 1, x, y]), [w / vb[2], 0, 0, h / vb[3], -vb[0] * w / vb[2], -vb[1] * h / vb[3]]);
          walk(el, mm, color);
        } else if (tag === 'path') {
          const d = el.getAttribute('d'); if (!d) continue;
          out.push({ key: el.getAttribute('data-c') || 'p', path: new Path2D(d), m: mm, color });
        } else if (tag === 'rect') {
          const x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0, w = +el.getAttribute('width') || 0, h = +el.getAttribute('height') || 0;
          if (w > 0 && h > 0) out.push({ key: 'rect', rect: [x, y, w, h], m: mm, color });
        } else walk(el, mm, color);
      }
    }
    walk(svg, I, baseColor);
    return out;
  }

  /** Actors + viewBox for a TeX string (with \mark → accent, as in the static renderer). Sync once MathJax is ready. */
  function layout(tex, color) {
    tex = String(tex || '').trim(); if (!tex) return null;
    const key = color + '\u0000' + tex; if (cache.has(key)) return cache.get(key);
    if (!window.MathJax?.tex2svg) return null;
    let res = null;
    try {
      const marked = NM.mathanim ? NM.mathanim.marked(tex, ACCENT) : tex;
      const svg = window.MathJax.tex2svg(marked, { display: true }).querySelector('svg');
      if (svg && !svg.querySelector('[data-mjx-error],[data-mml-node="merror"]')) {
        const vb = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);
        res = { vb, actors: actorsOf(svg, color) };
      }
    } catch (e) { res = null; }
    cache.set(key, res); if (cache.size > MAX) cache.delete(cache.keys().next().value);
    return res;
  }

  /** Screen matrix for an actor drawn in box {cx, cy, w, h} — same fit as app.js math(): contain + centre. */
  function place(L, box) {
    const [vx, vy, vw, vh] = L.vb, s = Math.min(box.w / vw, box.h / vh);
    const ox = box.cx - vw * s / 2 - vx * s, oy = box.cy - vh * s / 2 - vy * s;
    return a => mul([s, 0, 0, s, ox, oy], a.m);
  }

  /** Longest common subsequence of actor keys → pairs [i, j]. */
  function match(A, B) {
    const n = A.length, m = B.length, T = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = A[i].key === B[j].key ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
    const pairs = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i].key === B[j].key) { pairs.push([i, j]); i++; j++; } else if (T[i + 1][j] >= T[i][j + 1]) i++; else j++; }
    return pairs;
  }

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function drawActor(c, a, M, color, alpha) {
    if (alpha <= 0.002) return;
    c.save(); c.globalAlpha *= Math.min(1, alpha); c.setTransform(...mulCtx(c, M)); c.fillStyle = color || a.color;
    if (a.path) c.fill(a.path); else c.fillRect(...a.rect);
    c.restore();
  }
  // Compose with the canvas' current transform (the app renders with an identity base, but stay safe).
  function mulCtx(c, M) { const t = c.getTransform ? c.getTransform() : null; return t ? mul([t.a, t.b, t.c, t.d, t.e, t.f], M) : M; }
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpM = (P, Q, k) => P.map((v, i) => lerp(v, Q[i], k));

  /** Draw the transition from (texA in boxA) to (texB in boxB) at k ∈ [0, 1]. Returns false if layouts are not ready. */
  function draw(c, texA, boxA, texB, boxB, k, color) {
    const A = layout(texA, color), B = layout(texB, color);
    if (!A || !B) return false;
    const PA = place(A, boxA), PB = place(B, boxB), pairs = match(A.actors, B.actors);
    const usedA = new Set(pairs.map(p => p[0])), usedB = new Set(pairs.map(p => p[1]));
    const e = ease(Math.max(0, Math.min(1, k)));
    // Leaving symbols fade out early and drift up; arriving symbols fade in late and settle down.
    const out = Math.max(0, 1 - e * 2.2), inn = Math.max(0, Math.min(1, (e - .35) / .65));
    A.actors.forEach((a, i) => { if (!usedA.has(i)) drawActor(c, a, mul([1, 0, 0, 1, 0, -40 * e], PA(a)), a.color, out); });
    B.actors.forEach((b, j) => { if (!usedB.has(j)) drawActor(c, b, mul([1, 0, 0, 1, 0, 36 * (1 - inn)], PB(b)), b.color, inn); });
    for (const [i, j] of pairs) {
      const a = A.actors[i], b = B.actors[j];
      if (a.rect && b.rect) {
        // Fraction bars: interpolate the screen rectangle so a bar can grow or shrink.
        const ra = rectScreen(PA(a), a.rect), rb = rectScreen(PB(b), b.rect), r = ra.map((v, q) => lerp(v, rb[q], e));
        c.save(); c.fillStyle = e < .5 ? a.color : b.color; c.fillRect(r[0], r[1], r[2], r[3]); c.restore();
      } else drawActor(c, a.path ? a : b, lerpM(PA(a), PB(b), e), e < .5 ? a.color : b.color, 1);
    }
    return true;
  }
  function rectScreen(M, [x, y, w, h]) {
    const p = (u, v) => [M[0] * u + M[2] * v + M[4], M[1] * u + M[3] * v + M[5]];
    const [x1, y1] = p(x, y), [x2, y2] = p(x + w, y + h);
    return [Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)];
  }
  /** Static draw through the actor pipeline (used when holding the previous equation before the morph starts). */
  function drawStatic(c, tex, box, color, alpha = 1) {
    const L = layout(tex, color); if (!L) return false;
    const P = place(L, box); for (const a of L.actors) drawActor(c, a, P(a), a.color, alpha); return true;
  }
  /** How many symbols carry over — used by the UI hint. */
  function shared(texA, texB, color = '#ffffff') { const A = layout(texA, color), B = layout(texB, color); return A && B ? match(A.actors, B.actors).length : 0; }

  NM.eqMorph = { layout, draw, drawStatic, shared, _match: match, _parseTransform: parseTransform };
})(window.NM);
