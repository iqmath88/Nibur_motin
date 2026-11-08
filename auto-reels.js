/* Nibor Motion — automatic math reels generator (v0.14.1).
 * Deterministic, locally verified templates. Output goes through NM.loadProject → cleanProject,
 * so every generated scene passes the same validation as an imported JSON file.
 */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const btn = $("autoGenerate");
  if (!btn) return;
  const safe = (x) => String(x ?? "").trim();
  const MAX = 10000;

  // ---------- integer helpers ----------
  const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  };
  /** Reduced fraction p/q as LaTeX (sign in front, denominator positive). */
  function frac(p, q) {
    if (q < 0) {
      p = -p;
      q = -q;
    }
    const g = gcd(p, q) || 1;
    p /= g;
    q /= g;
    if (q === 1) return String(p);
    return (p < 0 ? "-" : "") + `\\frac{${Math.abs(p)}}{${q}}`;
  }
  /** √n = k√m with m square-free part. */
  function simplifyRoot(n) {
    let k = 1,
      m = n;
    for (let f = 2; f * f <= m; f++)
      while (m % (f * f) === 0) {
        m /= f * f;
        k *= f;
      }
    return { k, m };
  }
  const paren = (n) => (n < 0 ? `(${n})` : String(n));
  /** Polynomial ax^2+bx+c in LaTeX without 1x, +-, or zero terms. */
  function poly(a, b, c) {
    const terms = [
      [a, "x^2"],
      [b, "x"],
      [c, ""],
    ].filter(([k]) => k !== 0);
    if (!terms.length) return "0";
    return terms
      .map(([k, v], i) => {
        const sign = k < 0 ? "-" : i ? "+" : "";
        const abs = Math.abs(k);
        const coef = v && abs === 1 ? "" : String(abs);
        return sign + coef + v;
      })
      .join("");
  }
  /** a·√m term: "3\sqrt{2}", "\sqrt{2}". */
  const rootTerm = (k, m) => (m === 1 ? String(k) : (k === 1 ? "" : k) + `\\sqrt{${m}}`);

  // ---------- spoken Arabic ----------
  const speakNum = (n) => (n < 0 ? "سالب " + Math.abs(n) : String(n));
  const speakMath = (tex) => {
    tex = String(tex || "").replace(/\\pm/g, " زائد أو ناقص ").replace(/\\quad|\\,/g, " ");
    return window.NM?.speechFromMath ? window.NM.speechFromMath(tex) : safe(tex);
  };
  /** Arabic narration for text containing inline \( … \) or $ … $ math. */
  function speakMixed(text) {
    return safe(text)
      .replace(/\\\(([\s\S]*?)\\\)|\$([^$\n]+)\$/g, (_, a, b) => " " + speakMath(a ?? b) + " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ---------- parsers ----------
  const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
  function parseImaginary(input) {
    const s = safe(input)
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => "^" + [...m].map((ch) => SUP[ch]).join(""))
      .replace(/−/g, "-")
      .replace(/\s+/g, "");
    const m = s.match(/^i\^[{(]?(-?\d+)[})]?$/i);
    if (!m) throw Error("اكتب القوة بهذه الصيغة: i^58 أو i^-13 أو i⁵⁸");
    const n = Number(m[1]);
    if (!Number.isSafeInteger(n) || Math.abs(n) > 1000000)
      throw Error("الأس يجب أن يكون عدداً صحيحاً لا يتجاوز مليوناً");
    return n;
  }
  function parseSide(side) {
    if (!side) throw Error("أحد طرفي المعادلة فارغ");
    const terms = side.match(/[+-]?[^+-]+/g);
    if (!terms || terms.join("") !== side) throw Error("تعذر قراءة الحدود");
    let a = 0,
      b = 0,
      c = 0;
    for (const t of terms) {
      const m = t.match(/^([+-]?)(\d*)(x\^2|x)?$/);
      if (!m || (!m[2] && !m[3])) throw Error("حد غير مفهوم: " + t);
      const k = (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2]));
      if (m[3] === "x^2") a += k;
      else if (m[3] === "x") b += k;
      else c += k;
    }
    return [a, b, c];
  }
  function parseQuadratic(input) {
    const s = safe(input)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[−–]/g, "-")
      .replace(/²/g, "^2")
      .replace(/\^\{2\}/g, "^2")
      .replace(/\*/g, "");
    const sides = s.split("=");
    if (sides.length !== 2)
      throw Error("أدخل معادلة واحدة فيها علامة = مثل x^2-5x+6=0");
    const [l, r] = sides.map(parseSide);
    const [a, b, c] = [l[0] - r[0], l[1] - r[1], l[2] - r[2]];
    if (a === 0) throw Error("المعامل a يساوي صفراً؛ المعادلة ليست تربيعية");
    if (![a, b, c].every((v) => Number.isSafeInteger(v) && Math.abs(v) <= MAX))
      throw Error("استخدم معاملات صحيحة لا تتجاوز 10000");
    return { a, b, c };
  }

  // ---------- templates ----------
  // Each scene: [title, question, equation, answer, narration]
  function imaginaryScenes(n) {
    const r = ((n % 4) + 4) % 4;
    const q = (n - r) / 4;
    const values = ["1", "i", "-1", "-i"];
    const spoken = ["واحد", "آي", "سالب واحد", "سالب آي"];
    const next = n + 5;
    return {
      name: `قوى العدد التخيلي i^${n}`,
      scenes: [
        ["تحدي رياضي", `هل تستطيع حساب \\(i^{${n}}\\)؟`, `i^{${n}}`, "",
          `هل تستطيع حساب آي أس ${speakNum(n)}؟`],
        ["القاعدة الذهبية", "قوى العدد التخيلي تتكرر كل أربع قوى",
          "i^0=1,\\quad i^1=i,\\quad i^2=-1,\\quad i^3=-i", "",
          "قوى العدد التخيلي تتكرر كل أربع قوى: واحد، آي، سالب واحد، سالب آي."],
        ["نقسم الأس على 4", `نكتب ${n} بالصورة 4q + r حيث 0 ≤ r < 4`,
          `${n}=4\\times${paren(q)}+${r}`, "",
          `نقسم ${speakNum(n)} على أربعة، فيكون الباقي ${r}.`],
        ["الإجابة النهائية", "الباقي يحدد قيمة القوة", `i^{${n}}=i^{${r}}`, values[r],
          `إذن آي أس ${speakNum(n)} يساوي آي أس ${r}، أي ${spoken[r]}.`],
        ["دورك الآن", "جرّب حساب القوة التالية بنفسك", `i^{${next}}`, "",
          `دورك الآن: احسب آي أس ${speakNum(next)}، واكتب إجابتك في التعليقات.`],
      ],
    };
  }

  function quadraticScenes({ a, b, c }) {
    const D = b * b - 4 * a * c;
    const eq = poly(a, b, c) + "=0";
    const scenes = [
      ["تحدي رياضي", "كيف نحل هذه المعادلة؟", eq, "",
        "كيف نحل هذه المعادلة التربيعية؟ تابع معي."],
      ["القانون العام", `نحدد المعاملات: \\(a=${a}\\) ، \\(b=${b}\\) ، \\(c=${c}\\)`,
        "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", "",
        `نحدد المعاملات: أ يساوي ${speakNum(a)}، وب يساوي ${speakNum(b)}، وج يساوي ${speakNum(c)}، ثم نستخدم القانون العام.`],
      ["نحسب المميز", "المميز يحدد نوع الجذور",
        `\\Delta=b^2-4ac=${paren(b)}^2-4${paren(a)}${paren(c)}=${D}`, "",
        `نحسب المميز: ب تربيع ناقص أربعة أ ج يساوي ${speakNum(D)}.`],
    ];
    const den = 2 * a;
    const sub = `x=\\frac{${-b}\\pm\\sqrt{${D}}}{${den}}`;
    let kind, answer, spokenAnswer;
    if (D > 0) {
      const { k, m } = simplifyRoot(D);
      if (m === 1) {
        const r1 = frac(-b + k, den),
          r2 = frac(-b - k, den);
        answer = `x_1=${r1},\\quad x_2=${r2}`;
        spokenAnswer = `الجذران هما ${speakMath(r1)} و ${speakMath(r2)}.`;
      } else {
        // (−b ± k√m)/(2a), reduced by the common factor of −b, k and 2a.
        let g = gcd(gcd(b, k), den) || 1;
        let p = -b / g,
          kk = k / g,
          q = den / g;
        if (q < 0) {
          p = -p;
          q = -q;
        }
        const top = (p === 0 ? "" : p) + (p === 0 ? "\\pm " : "\\pm") + rootTerm(kk, m);
        answer = q === 1 ? `x=${top}` : `x=\\frac{${top}}{${q}}`;
        spokenAnswer = "الجذران حقيقيان غير نسبيين: إكس يساوي " + (p ? speakNum(p) + " " : "") + "زائد أو ناقص " + (kk > 1 ? kk + " في " : "") + "الجذر التربيعي لـ " + m + (q !== 1 ? "، والكل مقسوم على " + q : "") + ".";
      }
      kind = "المميز موجب: جذران حقيقيان مختلفان";
    } else if (D === 0) {
      const r = frac(-b, den);
      answer = `x=${r}`;
      kind = "المميز صفر: جذر حقيقي مكرر";
      spokenAnswer = `للمعادلة جذر مكرر هو ${speakMath(r)}.`;
    } else {
      const { k, m } = simplifyRoot(-D);
      let g = gcd(gcd(b, k), den) || 1;
      let p = -b / g,
        kk = k / g,
        q = den / g;
      if (q < 0) {
        p = -p;
        q = -q;
      }
      const im = (kk === 1 ? "" : String(kk)) + (m === 1 ? "" : `\\sqrt{${m}}`) + "\\,i";
      const top = (p === 0 ? "" : p) + "\\pm " + im;
      answer = q === 1 ? `x=${top}` : `x=\\frac{${top}}{${q}}`;
      kind = "المميز سالب: لا جذور حقيقية، والجذران عددان مركبان";
      spokenAnswer = "لا توجد جذور حقيقية، والجذران عددان مركبان مترافقان.";
    }
    scenes.push(["نعوّض في القانون", kind, sub, "",
      "نعوّض قيمة المميز في القانون العام. " + kind + "."]);
    scenes.push(["الحل النهائي", "نبسط الناتج", eq, answer, spokenAnswer]);
    scenes.push(["تذكر", "تحقق دائماً بالتعويض في المعادلة الأصلية", "\\Delta=b^2-4ac", "",
      "تذكر: تحقق من الحل دائماً بالتعويض في المعادلة الأصلية."]);
    return { name: "حل المعادلة " + eq, scenes };
  }

  function customScenes() {
    const lines = safe($("autoSteps").value).split(/\n/).map(safe).filter(Boolean);
    if (lines.length < 2 || lines.length > 20)
      throw Error("اكتب من خطوتين إلى 20 خطوة، كل خطوة في سطر");
    return {
      name: safe($("autoInput").value).slice(0, 120) || "شرح رياضي مخصص",
      scenes: lines.map((line, i) => {
        const title = i === 0 ? "السؤال" : i === lines.length - 1 ? "الخلاصة" : `الخطوة ${i}`;
        // A line that is only math ($…$, $$…$$ or \( … \)) becomes the scene equation.
        const only = line.match(/^\$\$?([^$]+)\$\$?$|^\\\(([\s\S]+)\\\)$/);
        const eqn = only ? safe(only[1] ?? only[2]) : "";
        return [title, eqn ? "" : line, eqn, "", title + ". " + (eqn ? speakMath(eqn) : speakMixed(line))];
      }),
    };
  }

  // Durations: split the target length by how much there is to read, with a 2.5 s floor.
  function timed(items, target) {
    const weight = ([t, q, e, a, n]) => 1 + (n || t + q).length / 45 + (e + a).length / 60;
    const total = items.reduce((s, x) => s + weight(x), 0);
    return items.map((x) => Math.max(2.5, Math.round(((target * weight(x)) / total) * 2) / 2));
  }

  function build() {
    const mode = $("autoTopic").value;
    const input = safe($("autoInput").value);
    const target = Number($("autoLength").value) || 30;
    let spec;
    if (mode === "imaginary") spec = imaginaryScenes(parseImaginary(input));
    else if (mode === "quadratic") spec = quadraticScenes(parseQuadratic(input));
    else spec = customScenes();
    const durations = timed(spec.scenes, target);
    const stamp = Date.now().toString(36);
    return {
      name: spec.name,
      scenes: spec.scenes.map(([title, question, equation, answer, narration], i) => ({
        id: `auto-${stamp}-${i}`,
        title,
        question,
        equation,
        answer,
        duration: durations[i],
        qAt: 12,
        eAt: 35,
        aAt: 65,
        speechText: narration,
      })),
    };
  }

  // Update the placeholder so the expected input is obvious for each template.
  const hints = {
    imaginary: "i^58   ·   i^-13",
    quadratic: "x^2-5x+6=0   ·   2x^2+3=7x",
    custom: "عنوان المشروع (اختياري)",
  };
  const syncHint = () => {
    const mode = $("autoTopic").value;
    $("autoInput").placeholder = hints[mode];
    $("autoInput").dir = mode === "custom" ? "auto" : "ltr";
    $("autoStepsWrap").hidden = mode !== "custom";
  };
  $("autoTopic").addEventListener("change", syncHint);
  syncHint();

  btn.addEventListener("click", () => {
    const status = $("autoStatus");
    try {
      const generated = build();
      const current = window.NM?.project;
      if (!current || !window.NM.loadProject) throw Error("المحرر لم يكتمل تحميله بعد؛ أعد المحاولة");
      if (!confirm(`سيستبدل المولّد مشاهد المشروع الحالي بـ ${generated.scenes.length} مشاهد (يحتفظ بالتصميم والهوية والموسيقى). احفظ نسخة JSON أولاً إن أردت. متابعة؟`))
        return;
      // Keep project-level settings (theme, branding, fonts, captions, music) — replace only name and scenes.
      window.NM.loadProject(
        { ...current, name: generated.name, scenes: generated.scenes },
        "تم إنشاء مشاهد الريلز. راجع كل خطوة، ثم ولّد أو سجّل الصوت لكل مشهد من قسم الصوت.",
      );
      status.textContent = `✓ أُنشئ ${generated.scenes.length} مشاهد. نص التعليق الصوتي جاهز في كل مشهد.`;
    } catch (e) {
      status.textContent = "تعذر التوليد: " + e.message;
    }
  });

  // Exposed for automated tests.
  window.NM = window.NM || {};
  window.NM.autoReels = { build, parseQuadratic, parseImaginary, quadraticScenes, imaginaryScenes, poly, frac };
})();
