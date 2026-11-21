#!/usr/bin/env node
/* Nibor Motion — Math-books importer (أداة تطوير، لا يحمّلها التطبيق).
 *
 * يقرأ مصدر دروس Math-books (src/<book>.l<n>.txt بالصيغة الموصوفة في docs/LESSON_FORMAT.md)
 * ويكتب book-examples.js: كل «مثال» من الكتاب مع خطواته ومعادلاته، دون تعديل المستودع الأصلي.
 *
 * الاستعمال:
 *   git clone --depth 1 https://github.com/iqmath88/Math-books ../math-books
 *   node book-import.cjs ../math-books
 * ثم ارفع book-examples.js المحدَّث (وارفع APP_VERSION).
 */
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');

const root = process.argv[2];
if (!root || !fs.existsSync(path.join(root, 'src'))) {
  console.error('usage: node book-import.cjs <path-to-Math-books>');
  process.exit(2);
}

/** Chapter metadata from the built v2__<id>.js (window.BOOK=Object.assign({...}, ...)). */
function bookMeta(id) {
  for (const f of [`v2__${id}.js`, `v2/${id}.js`]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/window\.BOOK=Object\.assign\((\{.*?\})\s*,/);
    if (m) { try { const d = JSON.parse(m[1]); return { grade: d.grade, chapter: d.chapter, title: d.title }; } catch (e) { /* fall through */ } }
  }
  return { grade: '', chapter: id, title: id };
}

// Instructions for the website's interactive drawings are not part of the book text.
const INTERACTIVE = /^(حرّك|حرك|اسحب|راقب|المس|شغّل|شغل|اضغط|جرّب)/;

/** Parse one lesson file into lessons → steps. */
function parseFile(text) {
  const lessons = [];
  let lesson = null, step = null, block = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('=== ')) {
      const [id, num, title, pages] = line.slice(4).split('|').map(s => s.trim());
      lesson = { id, num, title, pages, steps: [] }; lessons.push(lesson); step = null; block = null; continue;
    }
    if (!lesson) continue;
    if (line.startsWith('--- ')) { step = null; block = null; continue; }
    if (line.startsWith('>>> ')) {
      const head = line.slice(4);
      const label = (head.match(/::\s*(.+)$/) || [])[1] || '';
      const marks = head.replace(/::.*$/, '');
      const kind = (marks.match(/\.(book|extra|act|enr)\b/) || [])[1] || '';
      const n = (marks.match(/#(\d+)/) || [])[1];
      step = { name: marks.trim().split(/\s+/)[0], kind, n: n ? +n : 0, result: /(^|\s)!(\s|$)/.test(marks), label: label.trim(), items: [] };
      lesson.steps.push(step); block = null; continue;
    }
    if (!step) continue;
    // Block continuation lines: "| ..."
    if (line.startsWith('| ') || line === '|') {
      const body = line.slice(2);
      if (!block) continue;
      if (block.type === 'skip') continue;
      if (block.type === 'let') { const cells = body.split(' ; ').map(s => s.trim()); block.rows.push(cells); continue; }
      if (block.type === 'main' || block.type === 'aux' || block.type === 'law') {
        if (body.startsWith('$$')) step.items.push({ t: 'eq', v: body.slice(2).trim(), from: block.type });
        else if (body.trim()) step.items.push({ t: 'text', v: body.trim(), from: block.type });
        continue;
      }
      continue;
    }
    block = null;
    const m = line.match(/^([a-z][a-z0-9]*\*?):\s?(.*)$/);
    if (line.startsWith('$$')) { step.items.push({ t: 'eq', v: line.slice(2).trim() }); continue; }
    if (!m) continue;
    const [, key, val] = m;
    switch (key) {
      case 'k': (step.ks = step.ks || []).push(val); if (!step.k || /^مثال/.test(val)) { step.k = val; step.h = ''; if (/^مثال/.test(val)) step.items = []; } break;
      case 'h1': case 'h2': step.h = step.h || val; break;
      case 'p': case 'lead': if (!INTERACTIVE.test(val)) step.items.push({ t: 'text', v: val }); break;
      case 'rel': if (!val.startsWith('»')) step.items.push({ t: 'text', v: val, from: 'rel' }); break;
      case 'main': case 'aux': case 'law':
        block = { type: key }; if (val) step.items.push({ t: 'head', v: val, from: key }); break;
      case 'let': block = { type: 'let', title: val, rows: [] }; step.items.push({ t: 'let', title: val, rows: block.rows }); break;
      case 'err': step.items.push({ t: 'note', v: val }); break;
      default: block = { type: 'skip' }; // xp, tnote, prac, sol, hint, ask, ... are not part of the book example.
    }
  }
  return lessons;
}

/** Lesson flow for the «درس كامل» video: book explanation steps in order, with each example at its place.
 *  Exercises (تمرين), website-only steps (.act/.extra/.enr) and the numbered solution steps of examples are excluded. */
function flowOf(lesson, examples) {
  const flow = [], byStep = new Map(examples.map(e => [e.step + '|' + e.num, e]));
  let inExample = false;
  for (const s of lesson.steps) {
    const isEx = [s.k, s.h].some(x => x && /^مثال/.test(x)) && s.kind !== 'enr';
    if (isEx) {
      const num = ((s.k || s.h).match(/^مثال\s*(\d+)/) || [])[1] || '';
      const ex = byStep.get(s.name + '|' + num) || examples.find(e => e.step === s.name);
      if (ex && !flow.some(f => f.t === 'example' && f.key === ex.key)) flow.push({ t: 'example', key: ex.key });
      inExample = true; continue;
    }
    if (s.n && inExample) continue;           // numbered solution step of the current example
    inExample = false;
    if (s.kind !== 'book') continue;
    if ((s.ks || []).some(k => /تمرين|الفكرة|تمارين/.test(k))) continue;
    const items = s.items.filter(i => i.t !== 'let' || i.rows.length);
    if (!items.length && !s.h) continue;
    flow.push({ t: 'concept', title: s.h || '', page: ((s.ks || []).join(' ').match(/ص\s*([\d–\-]+)/) || [])[1] || '', items });
  }
  return flow;
}

/** Group steps into book examples: a non-enrichment step whose k:/h2: starts with «مثال», plus the numbered steps after it. */
function examplesOf(lesson) {
  const out = [];
  for (let i = 0; i < lesson.steps.length; i++) {
    const s = lesson.steps[i];
    const tag = [s.k, s.h].find(x => x && /^مثال/.test(x));
    if (!tag || s.kind === 'enr') continue;
    const num = (tag.match(/^مثال\s*(\d+)/) || [])[1] || '';
    const page = (String(s.k || '').match(/ص\s*([\d–\-]+)/) || [])[1] || '';
    const title = s.h && !/^مثال/.test(s.h) ? s.h : '';
    const steps = [{ label: '', result: s.result, items: s.items }];
    for (let j = i + 1; j < lesson.steps.length; j++) {
      const t = lesson.steps[j];
      if (!t.n || t.kind === 'enr' || (t.k && /^مثال/.test(t.k))) break;
      steps.push({ label: t.label, result: t.result, items: t.items });
    }
    out.push({ key: `${lesson.id}:${s.name}:${num || out.length + 1}`, step: s.name, num, page, title, steps });
  }
  return out;
}

const files = fs.readdirSync(path.join(root, 'src')).filter(f => /^[a-z0-9]+\.l\d+\.txt$/.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const books = new Map();
let total = 0;
for (const f of files) {
  const id = f.split('.')[0];
  if (!books.has(id)) books.set(id, { id, ...bookMeta(id), lessons: [] });
  for (const lesson of parseFile(fs.readFileSync(path.join(root, 'src', f), 'utf8'))) {
    const examples = examplesOf(lesson);
    if (!examples.length) continue;
    total += examples.length;
    books.get(id).lessons.push({ id: lesson.id, num: lesson.num, title: lesson.title, pages: lesson.pages, examples, flow: flowOf(lesson, examples) });
  }
}
const order = id => (/^g12/.test(id) ? 0 : /^ch/.test(id) ? 1 : 2);
const list = [...books.values()].filter(b => b.lessons.length).sort((a, b) => order(a.id) - order(b.id) || a.id.localeCompare(b.id, 'en', { numeric: true }));
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch (e) { /* not a git checkout */ }
const data = { source: 'https://github.com/iqmath88/Math-books', commit, imported: new Date().toISOString().slice(0, 10), books: list };
const out = '/* Generated by book-import.cjs from Math-books — do not edit by hand. */\n' +
  'window.NM=window.NM||{};window.NM.bookData=' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(__dirname, 'book-examples.js'), out);
console.log(`books ${list.length}, examples ${total}, ${(out.length / 1024).toFixed(0)} KB, commit ${commit}`);
for (const b of list) console.log(' ', b.id, b.grade, '·', b.title, '—', b.lessons.reduce((n, l) => n + l.examples.length, 0), 'examples');
