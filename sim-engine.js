/* Nibor Motion v0.17.0 — Simulation engine (محرك المحاكاة الرياضية).
 *
 * A scene can carry `sim = {model, params, from, to, extent, ease, readout, unit}`.
 * The drawing is a pure function of (params, value), where value is interpolated from `from` to `to`
 * by the scene progress. Nothing depends on wall-clock time, so preview and frame-by-frame export match.
 * A scene that must show one exact instant (for example the substitution h = 12) uses from = to.
 *
 * Every model provides: its parameters, the driving variable, the instantaneous rate from the governing
 * equation, a deterministic Canvas drawing, and a six-scene lesson script with exact LaTeX steps.
 */
'use strict';
window.NM = window.NM || {};
(function (NM) {
  const num = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  const fmt = (v, d = 2) => { if (!Number.isFinite(v)) return '—'; const r = Number(v.toFixed(d)); return String(Object.is(r, -0) ? 0 : r); };
  const fmtFixed = (v, d) => Number.isFinite(v) ? v.toFixed(d) : '—';
  const UNITS = ['cm', 'm'];
  const UNIT_AR = { cm: 'سم', m: 'م' };
  const TIMES = ['s', 'min', 'h'];
  const TIME_AR = { s: 'الثانية', min: 'الدقيقة', h: 'الساعة' };
  const EASES = ['physical', 'linear', 'smooth'];

  // ---- exact fractions for the LaTeX steps ----
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  /** Scale n/d to integers when both have at most 4 decimals; otherwise null. */
  function intPair(n, d) {
    for (let k = 0; k <= 4; k++) {
      const f = 10 ** k, N = n * f, D = d * f;
      if (Math.abs(N - Math.round(N)) < 1e-9 && Math.abs(D - Math.round(D)) < 1e-9) {
        let a = Math.round(N), b = Math.round(D); if (!b) return null;
        const g = gcd(a, b); a /= g; b /= g; if (b < 0) { a = -a; b = -b; }
        return [a, b];
      }
    }
    return null;
  }
  /** n/d as LaTeX. */
  function frac(n, d) {
    const p = intPair(n, d); if (!p) return fmt(n / d, 4);
    const [a, b] = p; if (b === 1) return String(a);
    return (a < 0 ? '-' : '') + `\\frac{${Math.abs(a)}}{${b}}`;
  }
  /** (n/d)·π as LaTeX. */
  function piFrac(n, d) {
    const p = intPair(n, d); if (!p) return fmt(n / d, 4) + '\\pi';
    const [a, b] = p, sign = a < 0 ? '-' : '', A = Math.abs(a), top = A === 1 ? '\\pi' : A + '\\pi';
    return sign + (b === 1 ? top : `\\frac{${top}}{${b}}`);
  }
  /** n/(d·π) as LaTeX. */
  function overPi(n, d) {
    const p = intPair(n, d); if (!p) return fmt(n / (d * Math.PI), 4);
    const [a, b] = p, sign = a < 0 ? '-' : '', A = Math.abs(a);
    return sign + `\\frac{${A}}{${b === 1 ? '' : b}\\pi}`;
  }
  /** sqrt(n) as LaTeX, simplified when n is a perfect square. */
  function sqrtTex(n) {
    const r = Math.sqrt(n);
    if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
    if (Number.isInteger(n)) return `\\sqrt{${n}}\\approx ${fmt(r)}`;
    return fmt(r);
  }
  const paren = v => (v < 0 ? `(${fmt(v, 4)})` : fmt(v, 4));
  const V = '\\mark'; // the driving variable is always drawn in the same highlight colour.

  // ---- drawing helpers ----
  function palette(dark) {
    return dark
      ? { stroke: '#72b9ca', text: '#cfe8f3', v: '#f4d96c', accent: '#86d4df', panel: 'rgba(8,37,55,.93)', panelText: '#e8fbff', fill: 'rgba(31,175,200,.17)', solid: '#3b5a78', solid2: '#2c4762', solid3: '#4d7194' }
      : { stroke: '#2f6f86', text: '#173a5c', v: '#b7791f', accent: '#1f8aa0', panel: 'rgba(23,58,92,.92)', panelText: '#ffffff', fill: 'rgba(31,138,160,.12)', solid: '#6d8fae', solid2: '#58799a', solid3: '#86a7c4' };
  }
  function line(c, x1, y1, x2, y2, color, width = 3, dash) {
    c.save(); if (dash) c.setLineDash(dash);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = width; c.strokeStyle = color; c.stroke(); c.restore();
  }
  function ellipse(c, x, y, a, b, fill, stroke, width = 3) {
    if (a <= 0 || b <= 0) return;
    c.beginPath(); c.ellipse(x, y, a, b, 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  function label(c, s, x, y, color, size = 32, italic = false, align = 'center') {
    c.save(); c.direction = 'ltr'; c.textAlign = align; c.textBaseline = 'middle';
    c.font = `${italic ? 'italic ' : ''}bold ${size}px Georgia, "Times New Roman", serif`;
    c.lineWidth = 7; c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeText(s, x, y);
    c.fillStyle = color; c.fillText(s, x, y); c.restore();
  }
  /** Dimension line with end ticks; vertical when x1 === x2. */
  function dim(c, x1, y1, x2, y2, color, width = 3) {
    line(c, x1, y1, x2, y2, color, width);
    const vertical = Math.abs(x1 - x2) < 1;
    for (const [x, y] of [[x1, y1], [x2, y2]]) vertical ? line(c, x - 14, y, x + 14, y, color, width) : line(c, x, y - 14, x, y + 14, color, width);
  }
  function arrow(c, x1, y1, x2, y2, color, width = 5) {
    line(c, x1, y1, x2, y2, color, width);
    const a = Math.atan2(y2 - y1, x2 - x1), L = 22;
    c.save(); c.beginPath(); c.moveTo(x2, y2);
    c.lineTo(x2 - L * Math.cos(a - .45), y2 - L * Math.sin(a - .45));
    c.lineTo(x2 - L * Math.cos(a + .45), y2 - L * Math.sin(a + .45));
    c.closePath(); c.fillStyle = color; c.fill(); c.restore();
  }
  function halo(c, pal, cx, cy, r) {
    const g = c.createRadialGradient(cx, cy, 40, cx, cy, r);
    g.addColorStop(0, pal.fill); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // ---- models ----
  const MODELS = {
    cone: {
      label: 'مخروط رأسه للأسفل يمتلئ بسائل',
      v: 'h', vLabel: 'عمق السائل h', rateName: 'dh/dt', rateUnit: 'len',
      params: [
        { key: 'H', label: 'ارتفاع المخروط', def: 24, min: .1, max: 1000 },
        { key: 'R', label: 'نصف قطر القاعدة', def: 8, min: .1, max: 1000 },
        { key: 'inflow', label: 'معدل الصب (حجم لكل وحدة زمن)', def: 4, min: -100000, max: 100000 },
        { key: 'outflow', label: 'معدل التسرب من الرأس', def: 0, min: 0, max: 100000 }
      ],
      legacy(raw) { return raw && raw.inflow == null && raw.rate != null ? { ...raw, inflow: raw.rate, outflow: 0 } : raw; },
      fix(p) { p.rate = p.inflow - p.outflow; return p; },
      range: p => [0, p.H],
      extent: p => p.H,
      // Volume is linear in time when dV/dt = inflow − outflow is constant: V = πR²h³ / (3H²).
      toQ: (p, h) => Math.PI * p.R * p.R * h ** 3 / (3 * p.H * p.H),
      fromQ: (p, V) => Math.cbrt(Math.max(0, V) * 3 * p.H * p.H / (Math.PI * p.R * p.R)),
      rate: (p, h) => h > 1e-9 ? p.rate * p.H * p.H / (Math.PI * p.R * p.R * h * h) : NaN,
      draw(c, p, h, pal, sim, prog) {
        const s = Math.min(450 / p.H, 300 / p.R), cx = 540, tip = 1235, rimY = tip - p.H * s, rx = p.R * s, ry = Math.max(16, rx * .17);
        const wy = tip - h * s, wr = (p.R / p.H) * h * s, wry = ry * (rx ? wr / rx : 0);
        halo(c, pal, cx, (rimY + tip) / 2, 520);
        line(c, cx - rx, rimY, cx, tip, pal.stroke, 5); line(c, cx + rx, rimY, cx, tip, pal.stroke, 5);
        if (h > 0) {
          const g = c.createLinearGradient(0, wy, 0, tip);
          g.addColorStop(0, 'rgba(93,224,246,.80)'); g.addColorStop(.5, 'rgba(20,151,203,.68)'); g.addColorStop(1, 'rgba(12,74,159,.78)');
          c.beginPath(); c.moveTo(cx - wr, wy); c.lineTo(cx, tip); c.lineTo(cx + wr, wy); c.closePath(); c.fillStyle = g; c.fill();
          ellipse(c, cx, wy, wr, wry, 'rgba(107,238,250,.65)', '#b4fbff');
        }
        ellipse(c, cx, rimY, rx, ry, 'rgba(4,42,62,.18)', pal.stroke, 4);
        line(c, cx, rimY, cx, tip, pal.text, 2, [10, 12]);
        // Pouring stream (inflow) and drops leaving the tip (outflow). Phases depend only on scene progress.
        const phase = (Number(prog) || 0) * 8;
        if (p.inflow > 0) { const top = rimY - ry - 70; line(c, cx + 18, top, cx + 18, Math.max(wy, rimY - ry), 'rgba(120,225,250,.85)', 7); for (let i = 0; i < 4; i++) { const f = (phase + i / 4) % 1; ellipse(c, cx + 18, top + f * (Math.max(wy, rimY) - top), 5, 9, '#c9f6ff', null); } }
        if (p.outflow > 0 && h > 0) for (let i = 0; i < 3; i++) { const f = (phase * 1.3 + i / 3) % 1; ellipse(c, cx, tip + 14 + f * 90, 6, 10, `rgba(150,230,250,${(1 - f).toFixed(2)})`, null); }
        const u = sim.unit;
        dim(c, cx + rx + 60, rimY, cx + rx + 60, tip, pal.text, 2);
        label(c, `${fmt(p.H)} ${u}`, cx + rx + 75, (rimY + tip) / 2, pal.text, 30, false, 'left');
        dim(c, cx - rx, rimY - ry - 34, cx + rx, rimY - ry - 34, pal.accent, 3);
        label(c, `${fmt(2 * p.R)} ${u}`, cx - rx / 2, rimY - ry - 66, pal.accent, 30);
        if (h > 0) {
          dim(c, cx - rx - 60, wy, cx - rx - 60, tip, pal.v, 4);
          label(c, 'h', cx - rx - 92, (wy + tip) / 2, pal.v, 42, true);
          line(c, cx, wy, cx + wr, wy, pal.accent, 3);
          if (wr > 40) label(c, 'r', cx + wr / 2, wy - wry - 22, pal.accent, 34, true);
        }
      },
      script(p, t, u, T) {
        const ua = UNIT_AR[u], ta = TIME_AR[T], k = frac(p.R, p.H), coef = piFrac(p.R * p.R, 3 * p.H * p.H), dcoef = piFrac(p.R * p.R, p.H * p.H);
        const result = p.rate * p.H * p.H / (Math.PI * p.R * p.R * t * t);
        const exact = overPi(p.rate * p.H * p.H, p.R * p.R * t * t);
        const flows = p.outflow > 0
          ? `يُصب فيه سائل بمعدل ${fmt(p.inflow, 4)} ويتسرب منه بمعدل ${fmt(p.outflow, 4)} ${ua} مكعب في ${ta}`
          : `${p.rate >= 0 ? 'يُصب فيه سائل' : 'يتسرب منه السائل'} بمعدل ${fmt(Math.abs(p.rate), 4)} ${ua} مكعب في ${ta}`;
        const steps = [
          { title: 'المسألة', question: `مخروط رأسه للأسفل، ارتفاعه ${fmt(p.H)} ${ua} وطول قطر قاعدته ${fmt(2 * p.R)} ${ua}`, equation: p.outflow > 0 ? `\\text{in}=${fmt(p.inflow, 4)}\\,,\\ \\text{out}=${fmt(p.outflow, 4)}\\ \\mathrm{${u}^3/${T}}` : `\\frac{dV}{dt}=${fmt(p.rate, 4)}\\ \\mathrm{${u}^3/${T}}`, speech: `لدينا مخروط رأسه إلى الأسفل، ارتفاعه ${fmt(p.H)} وطول قطر قاعدته ${fmt(2 * p.R)}. ${flows}. نريد معدل تغيّر عمق السائل عندما يكون ${fmt(t)} ${ua}.` },
          { title: 'تشابه المثلثات', question: `نصف القطر ${fmt(p.R)} لأن القطر ${fmt(2 * p.R)}، ونسبة r إلى h ثابتة`, equation: `\\frac{r}{${V}{h}}=\\frac{${fmt(p.R)}}{${fmt(p.H)}}\\Rightarrow r=${k}\\,${V}{h}`, speech: 'مثلث السائل يشابه مثلث المخروط كله، فنسبة نصف القطر إلى الارتفاع ثابتة. نكتب نصف القطر بدلالة الارتفاع قبل الاشتقاق.' },
          { title: 'قانون الحجم', question: 'نعوّض علاقة التشابه في حجم المخروط', equation: `V=\\frac{\\pi}{3}r^2${V}{h}=${coef}\\,${V}{h}^3`, speech: 'حجم السائل ثلث باي في مربع نصف القطر في الارتفاع. بعد التعويض يصبح الحجم دالة في الارتفاع وحده.' },
          { title: 'الاشتقاق بالنسبة للزمن', question: 'نشتق طرفي العلاقة بالنسبة للزمن t', equation: `\\frac{dV}{dt}=${dcoef}\\,${V}{h}^2\\frac{d${V}{h}}{dt}`, speech: 'الحجم والارتفاع كلاهما يتغيران مع الزمن، فنشتق الطرفين باستعمال قاعدة السلسلة.' },
          { title: 'التعويض', question: `في اللحظة التي يكون فيها العمق ${fmt(t)} ${ua}`, equation: `${paren(p.rate)}=${dcoef}\\,(${fmt(t)})^2\\frac{dh}{dt}`, speech: `نعوّض معدل الحجم، والعمق ${fmt(t)} في هذه اللحظة فقط.` },
          { title: 'النتيجة', question: `معدل تغيّر عمق السائل عند h = ${fmt(t)} ${ua}`, equation: `\\frac{dh}{dt}=${exact}\\approx ${fmt(result, 4)}\\ \\mathrm{${u}/${T}}`, speech: `إذن يتغير العمق بمعدل ${fmt(Math.abs(result), 4)} ${ua} في ${ta} تقريباً. الإشارة ${result >= 0 ? 'موجبة، فالعمق يزداد' : 'سالبة، فالعمق يقل'}.` }
        ];
        if (p.outflow > 0) steps.splice(3, 0, { title: 'معدل تغير الحجم', question: 'معدل تغير الحجم = معدل الصب − معدل التسرب', equation: `\\frac{dV}{dt}=${fmt(p.inflow, 4)}-${fmt(p.outflow, 4)}=${fmt(p.rate, 4)}\\ \\mathrm{${u}^3/${T}}`, speech: `الحجم يتغير بالفرق بين الصب والتسرب، أي ${fmt(p.rate, 4)}.` });
        return steps;
      }
    },

    tank: {
      label: 'خزان قاعدته مربعة يتسرب منه الماء',
      v: 'h', vLabel: 'ارتفاع الماء h', rateName: 'dh/dt', rateUnit: 'len',
      params: [
        { key: 's', label: 'طول ضلع القاعدة', def: 2, min: .1, max: 1000 },
        { key: 'Ht', label: 'ارتفاع الخزان (للرسم فقط)', def: 2.2, min: .1, max: 1000 },
        { key: 'rate', label: 'معدل تغيّر الحجم dV/dt (سالب للتسرب)', def: -.4, min: -100000, max: 100000 }
      ],
      fix(p) { return p; },
      range: p => [0, p.Ht],
      extent: p => p.Ht,
      toQ: (p, h) => p.s * p.s * h,
      fromQ: (p, V) => V / (p.s * p.s),
      rate: p => p.rate / (p.s * p.s),
      draw(c, p, h, pal, sim) {
        const S = Math.max(p.s, p.Ht), k = 300 / S, cx = 540, cy = 1060;
        const P = (X, Y, Z) => [cx + (X - Z) * .866 * k, cy + (X + Z) * .5 * k - Y * k];
        const half = p.s / 2;
        halo(c, pal, cx, 900, 500);
        const face = (pts, fill, stroke, w = 3) => { c.beginPath(); pts.forEach(([X, Y, Z], i) => { const [u, v] = P(X, Y, Z); i ? c.lineTo(u, v) : c.moveTo(u, v); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); } };
        // Back walls, water prism s × s × h, then front glass and edges.
        face([[-half, 0, -half], [half, 0, -half], [half, p.Ht, -half], [-half, p.Ht, -half]], 'rgba(120,180,210,.10)', pal.stroke);
        face([[-half, 0, -half], [-half, 0, half], [-half, p.Ht, half], [-half, p.Ht, -half]], 'rgba(120,180,210,.10)', pal.stroke);
        if (h > 0) {
          face([[-half, h, -half], [half, h, -half], [half, h, half], [-half, h, half]], 'rgba(107,238,250,.70)', '#b4fbff');
          face([[-half, h, half], [half, h, half], [half, 0, half], [-half, 0, half]], 'rgba(20,151,203,.62)', null);
          face([[half, h, -half], [half, h, half], [half, 0, half], [half, 0, -half]], 'rgba(12,110,180,.62)', null);
        }
        face([[-half, 0, half], [half, 0, half], [half, p.Ht, half], [-half, p.Ht, half]], 'rgba(200,240,255,.06)', pal.stroke, 4);
        face([[half, 0, -half], [half, 0, half], [half, p.Ht, half], [half, p.Ht, -half]], 'rgba(200,240,255,.06)', pal.stroke, 4);
        const [b1x, b1y] = P(-half, 0, half), [b2x, b2y] = P(half, 0, half), [b3x, b3y] = P(half, 0, -half);
        label(c, `${fmt(p.s)} ${sim.unit}`, (b1x + b2x) / 2 - 30, (b1y + b2y) / 2 + 40, pal.accent, 30);
        label(c, `${fmt(p.s)} ${sim.unit}`, (b2x + b3x) / 2 + 40, (b2y + b3y) / 2 + 40, pal.accent, 30);
        if (h > 0) { const [x1, y1] = P(half, 0, -half), [, y2] = P(half, h, -half); dim(c, x1 + 50, y2, x1 + 50, y1, pal.v, 4); label(c, 'h', x1 + 84, (y1 + y2) / 2, pal.v, 42, true, 'left'); }
        if (p.rate < 0) { const [vx, vy] = P(half * .2, .02 * p.Ht, half); for (let i = 0; i < 3; i++) ellipse(c, vx, vy + 26 + i * 26, 5, 8, 'rgba(150,230,250,.8)', null); }
      },
      script(p, t, u, T) {
        const ua = UNIT_AR[u], ta = TIME_AR[T], A = p.s * p.s, result = p.rate / A;
        return [
          { title: 'المسألة', question: `خزان على شكل متوازي سطوح قاعدته مربعة طول ضلعها ${fmt(p.s)} ${ua}`, equation: `\\frac{dV}{dt}=${fmt(p.rate, 4)}\\ \\mathrm{${u}^3/${T}}`, speech: `خزان قاعدته مربعة طول ضلعها ${fmt(p.s)} ${ua}، ${p.rate < 0 ? 'يتسرب منه الماء' : 'يُصب فيه الماء'} بمعدل ${fmt(Math.abs(p.rate), 4)} ${ua} مكعب في ${ta}. نريد معدل تغير ارتفاع الماء.` },
          { title: 'قانون الحجم', question: 'الحجم = مساحة القاعدة × الارتفاع', equation: `V=(${fmt(p.s)})(${fmt(p.s)})${V}{h}=${fmt(A, 4)}\\,${V}{h}`, speech: `حجم الماء مساحة القاعدة في الارتفاع، أي ${fmt(A, 4)} في h. القاعدة لا تتغير.` },
          { title: 'الاشتقاق بالنسبة للزمن', question: 'نشتق الطرفين بالنسبة للزمن t', equation: `\\frac{dV}{dt}=${fmt(A, 4)}\\,\\frac{d${V}{h}}{dt}`, speech: 'نشتق الطرفين بالنسبة للزمن.' },
          { title: 'التعويض', question: 'نعوّض معدل تغير الحجم', equation: `${paren(p.rate)}=${fmt(A, 4)}\\,\\frac{dh}{dt}`, speech: `نعوّض معدل الحجم ${fmt(p.rate, 4)}.` },
          { title: 'النتيجة', question: 'المعدل ثابت لأن مساحة المقطع ثابتة', equation: `\\frac{dh}{dt}=${frac(p.rate, A)}=${fmt(result, 4)}\\ \\mathrm{${u}/${T}}`, speech: `إذن ${result < 0 ? 'ينخفض' : 'يرتفع'} الماء بمعدل ${fmt(Math.abs(result), 4)} ${ua} في ${ta}، وهو معدل ثابت في كل لحظة.` }
        ];
      }
    },

    plate: {
      label: 'مستطيل مساحته ثابتة يتمدد طوله',
      v: 'x', vLabel: 'الطول x', rateName: 'dy/dt', rateUnit: 'len',
      params: [
        { key: 'A', label: 'المساحة الثابتة', def: 96, min: .01, max: 1e6 },
        { key: 'rate', label: 'معدل تغير الطول dx/dt', def: 2, min: -10000, max: 10000 }
      ],
      fix(p) { return p; },
      range: p => [Math.sqrt(p.A) * .05, Math.sqrt(p.A) * 20],
      extent: (p, from, to) => Math.max(from, to) * 1.1,
      rate: (p, x) => -(p.A / x) / x * p.rate,
      draw(c, p, x, pal, sim) {
        const ext = sim.extent, s = Math.min(820 / ext, 520 / (p.A / (ext * .4))), y = p.A / x;
        const w = x * s, hgt = y * s, left = 540 - w / 2, bottom = 1170, top = bottom - hgt;
        halo(c, pal, 540, 900, 480);
        const g = c.createLinearGradient(left, top, left + w, bottom); g.addColorStop(0, '#9fb3c4'); g.addColorStop(.5, '#d7e2ea'); g.addColorStop(1, '#7f95a8');
        c.save(); c.fillStyle = g; c.globalAlpha = .9; c.fillRect(left, top, w, hgt); c.restore();
        c.strokeStyle = pal.stroke; c.lineWidth = 4; c.strokeRect(left, top, w, hgt);
        label(c, `A = ${fmt(p.A)} ${sim.unit}²`, 540, top + hgt / 2, '#0c2233', 34);
        dim(c, left, bottom + 50, left + w, bottom + 50, pal.v, 4); label(c, 'x', 540, bottom + 90, pal.v, 42, true);
        dim(c, left - 50, top, left - 50, bottom, pal.accent, 3); label(c, 'y', left - 84, (top + bottom) / 2, pal.accent, 40, true);
        if (p.rate) arrow(c, left + w + 16, top + hgt / 2, left + w + 16 + Math.sign(p.rate) * 80, top + hgt / 2, pal.v, 5);
      },
      script(p, t, u, T) {
        const ua = UNIT_AR[u], ta = TIME_AR[T], y = p.A / t, result = -y / t * p.rate;
        return [
          { title: 'المسألة', question: `مستطيل مساحته ${fmt(p.A)} ${ua} مربع ثابتة، ويتغير طوله`, equation: `\\frac{d${V}{x}}{dt}=${fmt(p.rate, 4)}\\ \\mathrm{${u}/${T}}`, speech: `صفيحة مستطيلة مساحتها ${fmt(p.A)} ثابتة. طولها يتغير بمعدل ${fmt(p.rate, 4)} ${ua} في ${ta}. نريد معدل تغير عرضها.` },
          { title: 'العلاقة', question: 'مساحة المستطيل = الطول × العرض', equation: `${fmt(p.A)}=${V}{x}\\,y`, speech: 'المساحة حاصل ضرب الطول في العرض، وهي ثابتة.' },
          { title: 'الاشتقاق بالنسبة للزمن', question: 'قاعدة الضرب، ومشتقة الثابت صفر', equation: `0=${V}{x}\\frac{dy}{dt}+y\\frac{d${V}{x}}{dt}`, speech: 'نشتق بقاعدة الضرب. مشتقة المساحة الثابتة صفر.' },
          { title: 'قيمة x في تلك اللحظة', question: `عندما يكون العرض ${fmt(y)} ${ua}`, equation: `${fmt(p.A)}=${V}{x}(${fmt(y)})\\Rightarrow ${V}{x}=${fmt(t)}`, speech: `من المساحة نجد الطول في تلك اللحظة: ${fmt(t)}.` },
          { title: 'التعويض', question: 'نعوّض القيم', equation: `0=${fmt(t)}\\,\\frac{dy}{dt}+${fmt(y)}(${fmt(p.rate, 4)})`, speech: 'نعوّض الطول والعرض ومعدل الطول.' },
          { title: 'النتيجة', question: 'الإشارة سالبة: العرض يتناقص', equation: `\\frac{dy}{dt}=${frac(-y * p.rate, t)}\\ \\mathrm{${u}/${T}}`, speech: `إذن يتغير العرض بمعدل ${fmt(result, 4)} ${ua} في ${ta}.` }
        ];
      }
    },

    ladder: {
      label: 'سلم ينزلق على جدار',
      v: 'x', vLabel: 'بعد قاعدة السلم عن الجدار x', rateName: 'dy/dt', rateUnit: 'len',
      params: [
        { key: 'L', label: 'طول السلم', def: 10, min: .1, max: 1000 },
        { key: 'rate', label: 'معدل ابتعاد القاعدة dx/dt', def: 1, min: -10000, max: 10000 }
      ],
      fix(p) { return p; },
      range: p => [0, p.L * .995],
      extent: p => p.L,
      rate: (p, x) => { const y = Math.sqrt(Math.max(0, p.L * p.L - x * x)); return y > 1e-9 ? -x * p.rate / y : NaN; },
      draw(c, p, x, pal, sim) {
        const s = 540 / p.L, wallX = 190, floorY = 1170, y = Math.sqrt(Math.max(0, p.L * p.L - x * x));
        const fx = wallX + x * s, ty = floorY - y * s;
        halo(c, pal, 520, 900, 480);
        c.save(); c.fillStyle = pal.solid2; c.fillRect(wallX - 46, floorY - 580, 46, 580); c.fillRect(wallX - 46, floorY, 840, 18); c.restore();
        line(c, wallX, floorY - 580, wallX, floorY, pal.stroke, 5); line(c, wallX, floorY, wallX + 790, floorY, pal.stroke, 5);
        // Ladder: two rails and rungs, always touching wall and floor because y = √(L² − x²).
        const len = Math.hypot(fx - wallX, floorY - ty) || 1, nx = -(floorY - ty) / len * 14, ny = (fx - wallX) / len * 14;
        line(c, wallX + nx + 14, ty + ny, fx + nx, floorY + ny, '#e8b46a', 9);
        line(c, wallX - nx + 14, ty - ny, fx - nx, floorY - ny, '#e8b46a', 9);
        const rungs = Math.max(3, Math.round(p.L * s / 70));
        for (let i = 1; i < rungs; i++) { const t = i / rungs, px = wallX + 14 + (fx - wallX - 14) * t, py = ty + (floorY - ty) * t; line(c, px + nx, py + ny, px - nx, py - ny, '#e8b46a', 6); }
        label(c, `${fmt(p.L)} ${sim.unit}`, (wallX + fx) / 2 + 48, (ty + floorY) / 2 - 20, pal.text, 30, false, 'left');
        if (x > 0) { dim(c, wallX, floorY + 58, fx, floorY + 58, pal.v, 4); label(c, 'x', (wallX + fx) / 2, floorY + 98, pal.v, 42, true); }
        if (y > 0) { dim(c, wallX - 82, ty, wallX - 82, floorY, pal.accent, 3); label(c, 'y', wallX - 118, (ty + floorY) / 2, pal.accent, 40, true); }
        if (p.rate) arrow(c, fx, floorY - 40, fx + Math.sign(p.rate) * 90, floorY - 40, pal.v, 5);
      },
      script(p, t, u, T) {
        const ua = UNIT_AR[u], ta = TIME_AR[T], y2 = p.L * p.L - t * t, y = Math.sqrt(y2), result = -t * p.rate / y;
        const exact = frac(-t * p.rate, y), yTex = sqrtTex(Number(y2.toFixed(6)));
        return [
          { title: 'مسألة السلم', question: `سلم طوله ${fmt(p.L)} ${ua} يستند إلى جدار رأسي، وتنزلق قاعدته على الأرض`, equation: `\\frac{d${V}{x}}{dt}=${fmt(p.rate, 4)}\\ \\mathrm{${u}/${T}}`, speech: `سلم طوله ${fmt(p.L)} ${ua} يستند إلى جدار. قاعدته ${p.rate >= 0 ? 'تبتعد عن' : 'تقترب من'} الجدار بمعدل ${fmt(Math.abs(p.rate), 4)} ${ua} في ${ta}. ما سرعة تحرك قمته عندما تبعد القاعدة ${fmt(t)} ${ua}؟` },
          { title: 'مبرهنة فيثاغورس', question: 'السلم والجدار والأرض تكوّن مثلثاً قائماً', equation: `${V}{x}^2+y^2=${fmt(p.L)}^2`, speech: 'السلم وتر في مثلث قائم ضلعاه بعد القاعدة عن الجدار وارتفاع القمة.' },
          { title: 'الاشتقاق بالنسبة للزمن', question: 'طول السلم ثابت، فمشتقته صفر', equation: `2${V}{x}\\frac{d${V}{x}}{dt}+2y\\frac{dy}{dt}=0`, speech: 'نشتق الطرفين بالنسبة للزمن. الطرف الأيمن ثابت فمشتقته صفر.' },
          { title: 'ارتفاع القمة في تلك اللحظة', question: `عندما يكون x = ${fmt(t)} ${ua}`, equation: `y=\\sqrt{${fmt(p.L)}^2-${fmt(t)}^2}=${yTex}`, speech: `نحسب ارتفاع القمة عندما تبعد القاعدة ${fmt(t)} ${ua}.` },
          { title: 'التعويض', question: 'نعوّض القيم في المعادلة المشتقة', equation: `${fmt(t)}\\cdot${paren(p.rate)}+${fmt(y)}\\,\\frac{dy}{dt}=0`, speech: 'نعوّض بعد القاعدة ومعدلها وارتفاع القمة.' },
          { title: 'النتيجة', question: `معدل تغيّر ارتفاع القمة عند x = ${fmt(t)} ${ua}`, equation: `\\frac{dy}{dt}=${exact}\\approx ${fmt(result, 4)}\\ \\mathrm{${u}/${T}}`, speech: `إذن قمة السلم ${result < 0 ? 'تنزل' : 'ترتفع'} بمعدل ${fmt(Math.abs(result), 4)} ${ua} في ${ta} تقريباً.` }
        ];
      }
    },

    shadow: {
      label: 'ظل شخص يمشي مبتعداً عن مصباح',
      v: 'x', vLabel: 'بعد الشخص عن عمود المصباح x', rateName: 'dy/dt', rateUnit: 'len',
      params: [
        { key: 'H', label: 'ارتفاع المصباح', def: 6, min: .2, max: 1000 },
        { key: 'hp', label: 'طول الشخص', def: 1.8, min: .1, max: 1000 },
        { key: 'rate', label: 'سرعة المشي dx/dt', def: 1.5, min: -10000, max: 10000 }
      ],
      fix(p) { if (p.hp >= p.H) p.hp = p.H * .9; return p; },
      range: p => [0, 1e6],
      extent: (p, from, to) => Math.max(1, from, to) * 1.15,
      // y = hp·x/(H − hp) for the shadow length; the tip moves at dx/dt + dy/dt.
      shadow: (p, x) => p.hp * x / (p.H - p.hp),
      rate: p => p.hp / (p.H - p.hp) * p.rate,
      draw(c, p, x, pal, sim) {
        const k = p.hp / (p.H - p.hp), ext = sim.extent, s = Math.min(480 / p.H, 800 / (ext * (1 + k))), base = 140, ground = 1165;
        const px = base + x * s, tipX = base + (x + k * x) * s, lampY = ground - p.H * s, headY = ground - p.hp * s;
        halo(c, pal, 540, 900, 480);
        line(c, 60, ground, 1020, ground, pal.stroke, 5);
        // Shadow on the ground.
        c.save(); c.globalAlpha = .55; c.fillStyle = '#05121c'; c.beginPath(); c.moveTo(px, ground - 6); c.lineTo(tipX, ground - 6); c.lineTo(tipX, ground + 6); c.lineTo(px, ground + 6); c.closePath(); c.fill(); c.restore();
        line(c, px, ground, tipX, ground, '#0b2333', 14);
        // Lamp post and light ray through the head to the shadow tip (similar triangles).
        line(c, base, ground, base, lampY, pal.text, 8);
        ellipse(c, base, lampY, 22, 22, '#ffe9a6', '#ffd36a', 3);
        const glow = c.createRadialGradient(base, lampY, 10, base, lampY, 150); glow.addColorStop(0, 'rgba(255,230,150,.55)'); glow.addColorStop(1, 'rgba(255,230,150,0)');
        c.fillStyle = glow; c.fillRect(base - 150, lampY - 150, 300, 300);
        line(c, base, lampY, tipX, ground, 'rgba(255,214,120,.75)', 3, [14, 10]);
        // Person.
        const hs = p.hp * s, r = Math.max(10, hs * .11);
        line(c, px, ground, px, headY + 2 * r, pal.panelText, 10);
        ellipse(c, px, headY + r, r, r, pal.panelText, null);
        dim(c, base - 60, lampY, base - 60, ground, pal.text, 2); label(c, `${fmt(p.H)} ${sim.unit}`, base - 72, (lampY + ground) / 2, pal.text, 28, false, 'right');
        dim(c, px + 36, headY, px + 36, ground, pal.accent, 2); label(c, `${fmt(p.hp)}`, px + 48, (headY + ground) / 2, pal.accent, 28, false, 'left');
        if (x > 0) { dim(c, base, ground + 58, px, ground + 58, pal.v, 4); label(c, 'x', (base + px) / 2, ground + 98, pal.v, 42, true); }
        if (tipX - px > 4) { dim(c, px, ground + 58, tipX, ground + 58, pal.accent, 3); label(c, 'y', (px + tipX) / 2, ground + 98, pal.accent, 40, true); }
      },
      script(p, t, u, T) {
        const ua = UNIT_AR[u], ta = TIME_AR[T], d = p.H - p.hp, k = frac(p.hp, d), dy = p.hp / d * p.rate, tip = p.rate + dy;
        return [
          { title: 'مسألة الظل', question: `شخص طوله ${fmt(p.hp)} ${ua} يمشي مبتعداً عن مصباح ارتفاعه ${fmt(p.H)} ${ua}`, equation: `\\frac{d${V}{x}}{dt}=${fmt(p.rate, 4)}\\ \\mathrm{${u}/${T}}`, speech: `شخص طوله ${fmt(p.hp)} ${ua} يمشي بسرعة ${fmt(Math.abs(p.rate), 4)} ${ua} في ${ta}، ومصباح ارتفاعه ${fmt(p.H)} ${ua}. ما سرعة ازدياد طول ظله؟ وما سرعة طرف الظل؟` },
          { title: 'تشابه المثلثات', question: 'شعاع الضوء يمر برأس الشخص ويصل إلى طرف الظل', equation: `\\frac{${fmt(p.H)}}{${V}{x}+y}=\\frac{${fmt(p.hp)}}{y}`, speech: 'المثلث الكبير من المصباح إلى طرف الظل يشابه المثلث الصغير من الشخص إلى طرف الظل.' },
          { title: 'طول الظل بدلالة x', question: 'نضرب تبادلياً ونجمع حدود y', equation: `${fmt(d)}\\,y=${fmt(p.hp)}\\,${V}{x}\\Rightarrow y=${k}\\,${V}{x}`, speech: 'بعد الضرب التبادلي نجد أن طول الظل يتناسب طردياً مع بعد الشخص عن المصباح.' },
          { title: 'الاشتقاق بالنسبة للزمن', question: 'نشتق طول الظل بالنسبة للزمن', equation: `\\frac{dy}{dt}=${k}\\,\\frac{d${V}{x}}{dt}`, speech: 'نشتق الطرفين. معدل تغير طول الظل ثابت لا يعتمد على مكان الشخص.' },
          { title: 'سرعة ازدياد الظل', question: 'نعوّض سرعة المشي', equation: `\\frac{dy}{dt}=${k}\\cdot${paren(p.rate)}=${fmt(dy, 4)}\\ \\mathrm{${u}/${T}}`, speech: `إذن يزداد طول الظل بمعدل ${fmt(Math.abs(dy), 4)} ${ua} في ${ta}.` },
          { title: 'سرعة طرف الظل', question: 'طرف الظل يبعد x + y عن المصباح، وهي غير سرعة نمو الظل', equation: `\\frac{d(${V}{x}+y)}{dt}=${fmt(p.rate, 4)}+${paren(dy)}=${fmt(tip, 4)}\\ \\mathrm{${u}/${T}}`, speech: `أما طرف الظل فيتحرك بسرعة ${fmt(Math.abs(tip), 4)} ${ua} في ${ta}، لأنه يجمع سرعة الشخص وسرعة نمو الظل.` }
        ];
      }
    },

    cube: {
      label: 'مكعب مغطى بطبقة جليد',
      v: 'x', vLabel: 'سمك الجليد x', rateName: 'dx/dt', rateUnit: 'len',
      params: [
        { key: 'a', label: 'طول حرف المكعب الصلد', def: 8, min: .1, max: 1000 },
        { key: 'rate', label: 'معدل تغيّر حجم الجليد dV/dt (سالب للذوبان)', def: -6, min: -100000, max: 100000 }
      ],
      fix(p) { return p; },
      range: p => [0, p.a * 5],
      extent: (p, from, to) => Math.max(p.a * .05, from, to),
      // V = (a + 2x)³ − a³ ⇒ dV/dt = 6(a + 2x)² dx/dt; all six faces grow or shrink together.
      toQ: (p, x) => (p.a + 2 * x) ** 3 - p.a ** 3,
      fromQ: (p, V) => Math.max(0, (Math.cbrt(V + p.a ** 3) - p.a) / 2),
      rate: (p, x) => p.rate / (6 * (p.a + 2 * x) ** 2),
      draw(c, p, x, pal, sim) {
        const Lmax = p.a + 2 * sim.extent, s = 275 / Lmax, cx = 540, cy = 960;
        const P = (X, Y, Z) => [cx + (X - Z) * .866 * s, cy + (X + Z) * .5 * s - Y * s];
        function cube(S, top, left, right, stroke, alpha) {
          const h = S / 2, face = (pts, fill) => { c.beginPath(); pts.forEach(([X, Y, Z], i) => { const [u, v] = P(X, Y, Z); i ? c.lineTo(u, v) : c.moveTo(u, v); }); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 3; c.stroke(); };
          c.save(); c.globalAlpha = alpha;
          face([[-h, h, -h], [h, h, -h], [h, h, h], [-h, h, h]], top);
          face([[-h, h, h], [h, h, h], [h, -h, h], [-h, -h, h]], left);
          face([[h, h, -h], [h, h, h], [h, -h, h], [h, -h, -h]], right);
          c.restore();
        }
        halo(c, pal, cx, cy, 520);
        cube(p.a, pal.solid3, pal.solid, pal.solid2, pal.text, 1);
        const L = p.a + 2 * x;
        if (x > 0) cube(L, 'rgba(200,245,255,.42)', 'rgba(130,215,240,.32)', 'rgba(90,185,225,.36)', '#d9fbff', 1);
        if (x > 0) { const [x1, y1] = P(p.a / 2, 0, 0), [x2, y2] = P(L / 2, 0, 0); line(c, x1, y1, x2, y2, pal.v, 6); label(c, 'x', x2 + 30, y2 - 6, pal.v, 42, true, 'left'); }
        const [ax1, ay1] = P(-p.a / 2, -p.a / 2, Lmax / 2 + .02 * Lmax), [ax2, ay2] = P(p.a / 2, -p.a / 2, Lmax / 2 + .02 * Lmax);
        label(c, `a = ${fmt(p.a)} ${sim.unit}`, (ax1 + ax2) / 2 - 40, (ay1 + ay2) / 2 + 52, pal.text, 30);
      },
      script(p, t, u, T) {
        const ua = UNIT_AR[u], ta = TIME_AR[T], L = p.a + 2 * t, k = 6 * L * L, result = p.rate / k, melting = p.rate < 0;
        return [
          { title: 'المسألة', question: `مكعب صلد طول حرفه ${fmt(p.a)} ${ua} مغطى بطبقة جليد يبقى شكلها مكعباً`, equation: `\\frac{dV}{dt}=${fmt(p.rate, 4)}\\ \\mathrm{${u}^3/${T}}`, speech: `مكعب صلد طول حرفه ${fmt(p.a)} ${ua} مغطى بطبقة جليد. ${melting ? 'يذوب' : 'يزداد'} الجليد بمعدل ${fmt(Math.abs(p.rate), 4)} ${ua} مكعب في ${ta}. ما معدل تغير سمك الجليد عندما يكون ${fmt(t)} ${ua}؟` },
          { title: 'حجم الجليد', question: 'حجم المكعب المغطى بالجليد − حجم المكعب الأصلي', equation: `V=(${fmt(p.a)}+2${V}{x})^3-${fmt(p.a)}^3`, speech: 'الجليد يغطي الوجهين المتقابلين، فيزيد طول الحرف سمكين. حجم الجليد هو الفرق بين المكعبين.' },
          { title: 'الاشتقاق بالنسبة للزمن', question: 'قاعدة السلسلة: الأس 3 ومشتقة ما داخل القوس 2', equation: `\\frac{dV}{dt}=3(${fmt(p.a)}+2${V}{x})^2(2)\\frac{d${V}{x}}{dt}`, speech: 'نشتق بالنسبة للزمن. ثلاثة من الأس، واثنان من مشتقة ما داخل القوس.' },
          { title: 'التعويض', question: `عندما يكون سمك الجليد ${fmt(t)} ${ua}`, equation: `${paren(p.rate)}=3(${fmt(L)})^2(2)\\frac{dx}{dt}=${fmt(k)}\\,\\frac{dx}{dt}`, speech: `نعوّض السمك ${fmt(t)} ومعدل الحجم.` },
          { title: 'النتيجة', question: `معدل تغيّر سمك الجليد عند x = ${fmt(t)} ${ua}`, equation: `\\frac{dx}{dt}=${frac(p.rate, k)}=${fmt(result, 4)}\\ \\mathrm{${u}/${T}}`, speech: `إذن يتغير سمك الجليد بمعدل ${fmt(Math.abs(result), 4)} ${ua} في ${ta}. الإشارة ${result < 0 ? 'سالبة لأن الجليد يذوب' : 'موجبة لأن الجليد يزداد'}.` }
        ];
      }
    }
  };


  function cleanParams(model, raw) {
    const m = MODELS[model], p = {};
    if (m.legacy) raw = m.legacy(raw);
    for (const f of m.params) p[f.key] = num(raw?.[f.key], f.min, f.max, f.def);
    return m.fix(p);
  }
  /** Legacy v0.16.1 cone scenes (coneStage 1–6) become simulation scenes. Scenes 5–6 show exactly h = 12. */
  const LEGACY_CONE = [[9.5, 10.5], [10.5, 11.2], [11.2, 11.7], [11.7, 12], [12, 12], [12, 12]];
  function legacyCone(stage) {
    const [from, to] = LEGACY_CONE[stage - 1] || [12, 12];
    return clean({ model: 'cone', params: { H: 24, R: 8, rate: 4 }, from, to, ease: 'physical', readout: true, unit: 'cm' });
  }
  function clean(x, scene) {
    if (!x && Number.isInteger(scene?.coneStage) && scene.coneStage >= 1 && scene.coneStage <= 6) return legacyCone(scene.coneStage);
    const model = MODELS[x?.model] ? x.model : '';
    if (!model) return { model: '' };
    const m = MODELS[model], params = cleanParams(model, x.params), [lo, hi] = m.range(params);
    const from = num(x.from, lo, hi, lo + (hi - lo) * .3), to = num(x.to, lo, hi, from);
    const extDefault = m.extent(params, from, to);
    return {
      model, params, from, to,
      extent: num(x.extent, Math.max(from, to, 1e-6), 1e6, Math.max(extDefault, from, to)),
      ease: EASES.includes(x.ease) ? x.ease : 'physical',
      readout: x.readout !== false,
      unit: UNITS.includes(x.unit) ? x.unit : 'cm',
      time: TIMES.includes(x.time) ? x.time : 's'
    };
  }

  /** Value of the driving variable at scene progress p — exact, deterministic. */
  function valueAt(sim, p) {
    const m = MODELS[sim.model], t = Math.max(0, Math.min(1, Number(p) || 0));
    if (sim.from === sim.to) return sim.from;
    if (sim.ease === 'smooth') { const e = t * t * (3 - 2 * t); return sim.from + (sim.to - sim.from) * e; }
    if (sim.ease === 'physical' && m.toQ) { const q0 = m.toQ(sim.params, sim.from), q1 = m.toQ(sim.params, sim.to); return m.fromQ(sim.params, q0 + (q1 - q0) * t); }
    return sim.from + (sim.to - sim.from) * t;
  }

  function readout(c, sim, value, pal) {
    const m = MODELS[sim.model], r = m.rate(sim.params, value), u = sim.unit;
    const rateUnit = m.rateUnit === 'vol' ? `${u}³/${sim.time}` : `${u}/${sim.time}`;
    c.save(); c.fillStyle = pal.panel; c.beginPath(); c.roundRect(150, 1272, 780, 100, 24); c.fill(); c.restore();
    label(c, `${m.v} = ${fmtFixed(value, 2)} ${u}`, 345, 1322, pal.v, 36, false);
    label(c, `${m.rateName} = ${fmtFixed(r, 4)} ${rateUnit}`, 715, 1322, '#e8fbff', 32, false);
  }

  function draw(c, scene, p, opts = {}) {
    const sim = scene?.sim; if (!sim?.model || !MODELS[sim.model]) return false;
    const pal = palette(opts.dark !== false), value = valueAt(sim, p);
    c.save();
    try { MODELS[sim.model].draw(c, sim.params, value, pal, sim, p); if (sim.readout) readout(c, sim, value, pal); }
    finally { c.restore(); }
    return true;
  }

  /** Where the driving variable starts and the value at each scene boundary: it approaches the target until the
   *  substitution scene (index `hold`) and stays exactly at the target from there on. */
  function approach(m, params, t, count, hold) {
    const [lo, hi] = m.range(params), rising = (params.rate ?? 1) >= 0;
    const start = rising ? Math.max(lo + (t - lo) * .45, lo) : Math.min(hi * .97, t * 1.6, (t + hi) / 2);
    hold = Math.max(1, Math.min(count, hold));
    const stops = [];
    for (let i = 0; i <= count; i++) stops.push(i >= hold ? t : start + (t - start) * (i / hold));
    return { start, stops, extent: m.extent(params, start, t) };
  }
  /** Six-scene lesson: the driving variable moves toward the target and holds it from the substitution scene on. */
  function buildProject(base, model, rawParams, target, unit, secondsPerScene, time) {
    const m = MODELS[model]; if (!m) throw Error('نموذج غير معروف');
    const params = cleanParams(model, rawParams), [lo, hi] = m.range(params), u = UNITS.includes(unit) ? unit : 'cm';
    const t = Number(target);
    if (!Number.isFinite(t) || t <= lo || t >= hi) throw Error(`القيمة المطلوبة يجب أن تكون بين ${fmt(lo)} و${fmt(hi)}`);
    if (model === 'ladder' && Math.abs(t) >= params.L) throw Error('بعد القاعدة يجب أن يكون أقل من طول السلم');
    const T = TIMES.includes(time) ? time : 's';
    const steps = m.script(params, t, u, T), dur = num(secondsPerScene, 4, 30, 9);
    let hold = steps.findIndex(st => /التعويض/.test(st.title)); if (hold < 0) hold = steps.length - 2;
    const { stops, extent } = approach(m, params, t, steps.length, hold);
    const existing = JSON.parse(JSON.stringify(base)), id = Date.now().toString(36);
    return {
      ...existing,
      projectId: 'sim-' + id,
      name: `المعدلات المرتبطة — ${m.label}`,
      theme: 'dark',
      branding: { ...existing.branding, header: existing.branding?.header || 'المعدلات المرتبطة بالزمن', footer: existing.branding?.footer || 'Nibor Motion' },
      scenes: steps.map((st, i) => ({
        id: `sim-${id}-${i + 1}`,
        sim: { model, params, from: stops[i], to: stops[i + 1], extent, ease: 'physical', readout: true, unit: u, time: T },
        title: st.title, question: st.question, equation: st.equation, answer: '', speechText: st.speech,
        duration: dur, qAt: 8, eAt: 40, aAt: 80,
        titleY: 19, questionY: 29, equationY: 79, titleSize: 55, questionSize: 38, equationScale: 112,
        titleBg: 'none', questionBg: 'none', equationAnim: 'morph', equationAnimDuration: 30
      }))
    };
  }

  // ---- editor UI (built with DOM methods; user text never goes through innerHTML) ----
  let bridge = null;
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };
  function field(labelText, input) { return el('label', { className: 'nm-sim-field' }, labelText, input); }
  function numberInput(value, step = 'any') { return el('input', { type: 'number', step, value: String(value), inputMode: 'decimal' }); }
  function modelSelect(value, withNone) {
    const s = el('select');
    if (withNone) s.append(el('option', { value: '', textContent: 'بدون محاكاة' }));
    for (const [k, m] of Object.entries(MODELS)) s.append(el('option', { value: k, textContent: m.label }));
    s.value = value; return s;
  }
  function timeSelect(value) { const s = el('select'); for (const t of TIMES) s.append(el('option', { value: t, textContent: `${t} (${TIME_AR[t]})` })); s.value = value; return s; }
  function unitSelect(value) { const s = el('select'); for (const u of UNITS) s.append(el('option', { value: u, textContent: `${u} (${UNIT_AR[u]})` })); s.value = value; return s; }

  function sceneEditor(host) {
    const scene = bridge?.scene(); host.replaceChildren(); if (!scene) return;
    const sim = scene.sim || { model: '' }, busy = bridge.playing?.();
    const pick = modelSelect(sim.model, true); pick.disabled = busy;
    host.append(field('نموذج المحاكاة في هذا المشهد', pick));
    const commit = next => { scene.sim = clean(next); bridge.commit(); };
    pick.onchange = () => { const model = pick.value; commit(model ? { model, readout: true } : null); sceneEditor(host); };
    if (!sim.model) { host.append(el('p', { className: 'muted', textContent: 'اختر نموذجاً ليُرسم الشكل من المعادلة نفسها. الحركة تُحسب من النموذج، فتطابق المعاينة الفيديو المصدَّر.' })); return; }
    const m = MODELS[sim.model], grid = el('div', { className: 'nm-sim-grid' }), inputs = {};
    for (const f of m.params) { inputs[f.key] = numberInput(sim.params[f.key]); grid.append(field(f.label, inputs[f.key])); }
    const from = numberInput(+sim.from.toFixed(4)), to = numberInput(+sim.to.toFixed(4)), extent = numberInput(+sim.extent.toFixed(4));
    grid.append(field(`${m.vLabel} — بداية المشهد`, from), field(`${m.vLabel} — نهاية المشهد`, to), field('أكبر قيمة يتسع لها الرسم', extent));
    const ease = el('select'); for (const [k, t] of [['physical', 'فيزيائية (معدل ثابت)'], ['linear', 'خطية'], ['smooth', 'ناعمة']]) ease.append(el('option', { value: k, textContent: t })); ease.value = sim.ease;
    const unit = unitSelect(sim.unit), time = timeSelect(sim.time), show = el('input', { type: 'checkbox', checked: sim.readout });
    grid.append(field('نوع الحركة', ease), field('وحدة الطول', unit), field('وحدة الزمن', time), field('لوحة القيم اللحظية', show));
    host.append(grid);
    const hint = el('p', { className: 'muted' });
    const update = () => {
      const params = {}; for (const f of m.params) params[f.key] = inputs[f.key].value;
      commit({ model: sim.model, params, from: from.value, to: to.value, extent: extent.value, ease: ease.value, unit: unit.value, time: time.value, readout: show.checked });
      const s = scene.sim; hint.textContent = s.from === s.to ? `المشهد يثبت عند ${m.v} = ${fmt(s.from)}، مناسب لمشهد التعويض.` : `${m.v} يتغير من ${fmt(s.from)} إلى ${fmt(s.to)} خلال المشهد.`;
    };
    for (const i of [...Object.values(inputs), from, to, extent]) { i.onchange = update; i.disabled = busy; }
    for (const i of [ease, unit, time, show]) { i.onchange = update; i.disabled = busy; }
    const hold = el('button', { type: 'button', className: 'secondary', textContent: 'تثبيت القيمة طوال المشهد' });
    hold.onclick = () => { to.value = from.value; update(); };
    host.append(el('div', { className: 'actions' }, hold), hint);
    hint.textContent = sim.from === sim.to ? `المشهد يثبت عند ${m.v} = ${fmt(sim.from)}، مناسب لمشهد التعويض.` : `${m.v} يتغير من ${fmt(sim.from)} إلى ${fmt(sim.to)} خلال المشهد.`;
  }

  function generatorUI(panel) {
    if (!panel || document.getElementById('nmSimGenerator')) return;
    const box = el('section', { id: 'nmSimGenerator', className: 'nm-sim-generator' });
    box.append(el('h3', { textContent: '🎬 فيديو محاكاة: المعدلات المرتبطة بالزمن' }),
      el('p', { className: 'muted', textContent: 'أدخل معطيات المسألة، فتُبنى ستة مشاهد: الشكل يتحرك وفق المعادلة، والخطوات محسوبة بدقة، ومشهدا التعويض والنتيجة يثبتان عند القيمة المطلوبة.' }));
    const pick = modelSelect('cone', false), wrap = el('div'), btn = el('button', { type: 'button', textContent: '🎬 إنشاء فيديو المحاكاة (6 مشاهد)' }), msg = el('p', { className: 'muted', role: 'status' });
    let inputs = {}, target, unit, time, secs;
    const TARGET = { cone: ['عمق السائل المطلوب h', 12, 'cm', 's'], tank: ['ارتفاع الماء عند لحظة الشرح h', 1, 'm', 'h'], plate: ['الطول في اللحظة المطلوبة x', 12, 'cm', 's'], ladder: ['بعد القاعدة المطلوب x', 8, 'm', 's'], shadow: ['بعد الشخص عند لحظة الشرح x', 4, 'm', 's'], cube: ['سمك الجليد المطلوب x', 1, 'cm', 's'] };
    const build = () => {
      const m = MODELS[pick.value], grid = el('div', { className: 'nm-sim-grid' }); inputs = {};
      for (const f of m.params) { inputs[f.key] = numberInput(f.def); grid.append(field(f.label, inputs[f.key])); }
      const [tl, tv, tu, tt] = TARGET[pick.value];
      target = numberInput(tv); unit = unitSelect(tu); time = timeSelect(tt); secs = numberInput(9, '0.5');
      grid.append(field(tl, target), field('وحدة الطول', unit), field('وحدة الزمن', time), field('مدة كل مشهد (ثانية)', secs));
      wrap.replaceChildren(grid);
    };
    pick.onchange = build; build();
    btn.onclick = () => {
      if (!NM.core || !NM.loadProject) { msg.textContent = 'المحرر غير جاهز بعد.'; return; }
      if (NM.core.busy()) { msg.textContent = 'أوقف التشغيل أو التصدير أولاً.'; return; }
      const params = {}; for (const [k, i] of Object.entries(inputs)) params[k] = i.value;
      let project; try { project = buildProject(NM.core.getState(), pick.value, params, target.value, unit.value, secs.value, time.value); } catch (e) { msg.textContent = 'تعذر الإنشاء: ' + e.message; return; }
      if (!confirm('سيُستبدل المشروع الحالي بمشاهد المحاكاة. يمكنك التراجع، أو حفظ نسخة احتياطية أولاً. متابعة؟')) return;
      try { NM.loadProject(project, 'تم إنشاء مشاهد المحاكاة الستة. راجع الخطوات قبل التصدير.'); msg.textContent = 'تم الإنشاء.'; } catch (e) { msg.textContent = 'تعذر الإنشاء: ' + e.message; }
    };
    box.append(field('نوع المسألة', pick), wrap, el('div', { className: 'actions' }, btn), msg);
    panel.append(box);
  }

  function init(b) {
    bridge = b;
    generatorUI(document.getElementById('autoReelsPanel'));
    refresh();
  }
  function refresh() { const host = document.getElementById('nmSimBody'); if (host && bridge) sceneEditor(host); }

  NM.sim = { MODELS, clean, draw, valueAt, buildProject, approach, legacyCone, init, refresh, _tex: { frac, piFrac, overPi, sqrtTex } };
})(window.NM);
