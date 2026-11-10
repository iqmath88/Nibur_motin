/* Nibor Motion — project library, automatic backups, .nibor packages and global undo/redo (v0.15).
 * Talks to the editor only through NM.core (defined at the end of app.js) and NM.loadProject.
 */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const LIB_DB = "nibor-motion-library";
  const CLIP_DB = "nibor-motion-scene-voices";
  const AUTOSAVE_MS = 1200;
  const BACKUP_EVERY_MS = 3 * 60 * 1000;
  const BACKUPS_PER_PROJECT = 20;
  const UNDO_LIMIT = 80;
  const COMMIT_MS = 450;

  // ---------------- IndexedDB helpers ----------------
  function openLib() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(LIB_DB, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore("projects", { keyPath: "id" });
        const v = db.createObjectStore("versions", { keyPath: "key", autoIncrement: true });
        v.createIndex("byProject", "projectId");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function openClips() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(CLIP_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("clips");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function tx(open, stores, mode, fn) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const t = db.transaction(stores, mode);
        let result;
        Promise.resolve(fn(t, (v) => (result = v))).catch(reject);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || Error("IndexedDB aborted"));
      });
    } finally {
      db.close();
    }
  }
  const req = (r) => new Promise((res, rej) => ((r.onsuccess = () => res(r.result)), (r.onerror = () => rej(r.error))));

  const lib = {
    put: (rec) => tx(openLib, ["projects"], "readwrite", (t) => t.objectStore("projects").put(rec)),
    get: (id) => tx(openLib, ["projects"], "readonly", async (t, set) => set(await req(t.objectStore("projects").get(id)))),
    list: () => tx(openLib, ["projects"], "readonly", async (t, set) => set(await req(t.objectStore("projects").getAll()))),
    remove: (id) =>
      tx(openLib, ["projects", "versions"], "readwrite", async (t) => {
        t.objectStore("projects").delete(id);
        const keys = await req(t.objectStore("versions").index("byProject").getAllKeys(id));
        for (const k of keys) t.objectStore("versions").delete(k);
      }),
    versions: (pid) =>
      tx(openLib, ["versions"], "readonly", async (t, set) => set(await req(t.objectStore("versions").index("byProject").getAll(pid)))),
    addVersion: (rec) =>
      tx(openLib, ["versions"], "readwrite", async (t) => {
        const store = t.objectStore("versions");
        store.add(rec);
        const all = await req(store.index("byProject").getAll(rec.projectId));
        all.sort((a, b) => a.at - b.at);
        for (const old of all.slice(0, Math.max(0, all.length + 1 - BACKUPS_PER_PROJECT))) store.delete(old.key);
      }),
  };
  const clips = {
    keys: (prefix) =>
      tx(openClips, ["clips"], "readonly", async (t, set) => {
        const range = IDBKeyRange.bound(prefix, prefix + "￿");
        set(await req(t.objectStore("clips").getAllKeys(range)));
      }),
    removeKeys: (keys) =>
      tx(openClips, ["clips"], "readwrite", (t) => {
        for (const k of keys) t.objectStore("clips").delete(k);
      }),
  };

  // ---------------- small utils ----------------
  const fmtDate = (ms) => {
    try {
      return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
    } catch (e) {
      return new Date(ms).toLocaleString();
    }
  };
  const safeName = (s) => String(s || "nibor-project").replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 80) || "nibor-project";
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/flac": "flac" };
  const extFor = (type) => EXT[String(type || "").split(";")[0]] || "bin";

  function start() {
    const core = window.NM?.core;
    if (!core || start.done) return;
    start.done = true;
    const say = (m) => core.status(m);
    const busyGuard = () => {
      if (core.busy()) {
        say("أوقف التشغيل أو التصدير أولاً");
        return true;
      }
      return false;
    };

    // ---------------- autosave + backups ----------------
    let saveTimer = null;
    const lastBackup = new Map();
    async function persist() {
      clearTimeout(saveTimer);
      saveTimer = null;
      const s = core.getState();
      const data = JSON.stringify(s);
      const now = Date.now();
      try {
        await lib.put({ id: s.projectId, name: s.name, updated: now, scenes: s.scenes.length, seconds: s.scenes.reduce((a, x) => a + x.duration, 0), data });
        const prev = lastBackup.get(s.projectId);
        if (!prev || (now - prev.at >= BACKUP_EVERY_MS && prev.data !== data)) {
          await lib.addVersion({ projectId: s.projectId, at: now, name: s.name, data });
          lastBackup.set(s.projectId, { at: now, data });
        }
        if ($("nmLibrary")?.open) renderLibrary();
      } catch (e) {
        console.warn("library save failed", e);
      }
    }
    const scheduleSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(persist, AUTOSAVE_MS);
    };
    const flush = () => (saveTimer ? persist() : Promise.resolve());
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
    window.addEventListener("pagehide", flush);

    // ---------------- undo / redo ----------------
    const hist = { pid: core.getState().projectId, undo: [], redo: [], committed: JSON.stringify(core.getState()) };
    let commitTimer = null;
    function commit() {
      clearTimeout(commitTimer);
      commitTimer = null;
      const s = core.getState();
      const cur = JSON.stringify(s);
      if (s.projectId !== hist.pid) {
        Object.assign(hist, { pid: s.projectId, undo: [], redo: [], committed: cur });
      } else if (cur !== hist.committed) {
        hist.undo.push(hist.committed);
        if (hist.undo.length > UNDO_LIMIT) hist.undo.shift();
        hist.redo = [];
        hist.committed = cur;
      }
      syncUndoButtons();
    }
    function step(from, to, label) {
      if (busyGuard()) return;
      commit();
      if (!from.length) return;
      to.push(hist.committed);
      const target = from.pop();
      hist.committed = target;
      try {
        core.restore(target);
        say(label);
      } catch (e) {
        say("تعذر " + label + ": " + e.message);
      }
      syncUndoButtons();
    }
    const undo = () => step(hist.undo, hist.redo, "تم التراجع");
    const redo = () => step(hist.redo, hist.undo, "تمت الإعادة");

    core.onSave = () => {
      scheduleSave();
      if (core.restoring) {
        // A restore (undo/redo/backup) becomes the new committed point without adding history.
        const s = core.getState();
        if (s.projectId !== hist.pid) Object.assign(hist, { pid: s.projectId, undo: [], redo: [] });
        hist.committed = JSON.stringify(s);
        syncUndoButtons();
        return;
      }
      clearTimeout(commitTimer);
      commitTimer = setTimeout(commit, COMMIT_MS);
      syncUndoButtons();
    };

    // Undo/redo buttons: preview action bar + phone sheet header.
    const undoButtons = [];
    function makeUndoPair(host, before) {
      if (!host) return;
      const wrap = document.createElement("span");
      wrap.className = "nm-history";
      for (const [label, icon, fn, kind] of [
        ["تراجع (Ctrl+Z)", "↶", undo, "undo"],
        ["إعادة (Ctrl+Shift+Z)", "↷", redo, "redo"],
      ]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "secondary nm-history-btn";
        b.textContent = icon;
        b.title = label;
        b.setAttribute("aria-label", label);
        b.dataset.kind = kind;
        b.addEventListener("click", fn);
        wrap.append(b);
        undoButtons.push(b);
      }
      host.insertBefore(wrap, before || host.firstChild);
    }
    makeUndoPair(document.querySelector(".studio-actions"));
    const sheetHead = $("mobileSheet");
    makeUndoPair(sheetHead, sheetHead?.querySelector(".sheet-peek-toggle"));
    function syncUndoButtons() {
      for (const b of undoButtons) b.disabled = b.dataset.kind === "undo" ? !hist.undo.length && !commitTimer : !hist.redo.length;
    }
    syncUndoButtons();
    // Capture phase on window: other widgets (e.g. MathLive) listen for Ctrl+Z on the document and stop it.
    window.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const t = e.target;
      // Text fields and math fields keep their own native undo.
      if (t?.closest?.("input,textarea,select,math-field,[contenteditable=''],[contenteditable='true']")) return;
      e.preventDefault();
      e.stopPropagation();
      if (k === "y" || e.shiftKey) redo();
      else undo();
    }, true);

    // ---------------- library UI ----------------
    const panel = $("nmLibrary");
    async function renderLibrary() {
      const list = $("nmProjectList");
      if (!list) return;
      const current = core.getState().projectId;
      let items = [];
      try {
        items = await lib.list();
      } catch (e) {
        list.textContent = "تعذر قراءة مكتبة المشاريع: " + e.message;
        return;
      }
      items.sort((a, b) => b.updated - a.updated);
      list.replaceChildren();
      for (const it of items) {
        const row = document.createElement("div");
        row.className = "nm-project" + (it.id === current ? " current" : "");
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = it.name || "بلا اسم";
        const meta = document.createElement("small");
        meta.textContent = `${it.scenes} مشاهد · ${Math.round(it.seconds || 0)} ث · ${fmtDate(it.updated)}`;
        info.append(name, meta);
        row.append(info);
        if (it.id === current) {
          const tag = document.createElement("span");
          tag.className = "nm-tag";
          tag.textContent = "مفتوح الآن";
          row.append(tag);
        } else {
          const open = document.createElement("button");
          open.type = "button";
          open.textContent = "فتح";
          open.onclick = () => openProject(it.id);
          const del = document.createElement("button");
          del.type = "button";
          del.className = "secondary";
          del.textContent = "حذف";
          del.onclick = () => deleteProject(it);
          row.append(open, del);
        }
        list.append(row);
      }
      if (!items.length) list.textContent = "لا توجد مشاريع محفوظة بعد.";
      renderVersions();
    }
    async function renderVersions() {
      const box = $("nmVersionList");
      if (!box) return;
      const s = core.getState();
      let vs = [];
      try {
        vs = await lib.versions(s.projectId);
      } catch (e) {}
      vs.sort((a, b) => b.at - a.at);
      box.replaceChildren();
      for (const v of vs) {
        const row = document.createElement("div");
        row.className = "nm-version";
        const label = document.createElement("span");
        let n = 0;
        try {
          n = JSON.parse(v.data).scenes.length;
        } catch (e) {}
        label.textContent = `${fmtDate(v.at)} · ${n} مشاهد`;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "secondary";
        b.textContent = "استعادة";
        b.onclick = () => {
          if (busyGuard()) return;
          if (!confirm("استعادة هذه النسخة؟ يمكنك التراجع (↶) إن غيّرت رأيك.")) return;
          commit();
          hist.undo.push(hist.committed);
          hist.redo = [];
          hist.committed = v.data;
          core.restore(v.data);
          say("تمت استعادة نسخة " + fmtDate(v.at));
          syncUndoButtons();
        };
        row.append(label, b);
        box.append(row);
      }
      if (!vs.length) box.textContent = "تُنشأ نسخة احتياطية تلقائياً كل 3 دقائق من التعديل.";
    }
    panel?.addEventListener("toggle", () => panel.open && renderLibrary());
    $("nmVersions")?.addEventListener("toggle", (e) => e.target.open && renderVersions());

    async function openProject(id) {
      if (busyGuard()) return;
      await flush();
      const rec = await lib.get(id);
      if (!rec) return say("المشروع غير موجود");
      window.NM.loadProject(JSON.parse(rec.data), "تم فتح المشروع: " + rec.name);
      await persist();
      renderLibrary();
    }
    async function deleteProject(it) {
      if (!confirm(`حذف المشروع «${it.name}» مع أصواته ونسخه الاحتياطية نهائياً؟`)) return;
      try {
        await lib.remove(it.id);
        await clips.removeKeys(await clips.keys("project:" + it.id + ":"));
        say("تم حذف المشروع");
      } catch (e) {
        say("تعذر الحذف: " + e.message);
      }
      renderLibrary();
    }
    $("nmNewProject")?.addEventListener("click", async () => {
      if (busyGuard()) return;
      await flush();
      window.NM.loadProject(core.blankProject(), "تم إنشاء مشروع جديد. المشروع السابق محفوظ في «مشاريعي».");
      await persist();
      renderLibrary();
    });
    $("nmDuplicate")?.addEventListener("click", async () => {
      if (busyGuard()) return;
      await flush();
      const s = JSON.parse(JSON.stringify(core.getState()));
      const oldId = s.projectId;
      s.projectId = core.newId();
      s.name = (s.name + " (نسخة)").slice(0, 120);
      try {
        for (const [sid, blob] of core.voices()) await core.audioDB.put(core.voiceKeyFor(s.projectId, sid), blob);
        const m = core.music();
        if (m) await core.audioDB.put(core.musicKeyFor(s.projectId), m);
      } catch (e) {
        return say("تعذر نسخ الأصوات: " + e.message);
      }
      window.NM.loadProject(s, "تم إنشاء نسخة من المشروع مع أصواتها.");
      await persist();
      renderLibrary();
      void oldId;
    });

    // ---------------- .nibor package (ZIP: project.json + manifest.json + audio/*) ----------------
    $("nmPackExport")?.addEventListener("click", async () => {
      if (!window.fflate) return say("مكتبة الضغط غير محمّلة");
      try {
        await flush();
        const s = core.getState();
        const enc = new TextEncoder();
        const files = {};
        const manifest = { format: "nibor-project", formatVersion: 1, app: window.APP_VERSION, created: new Date().toISOString(), voices: {}, music: null };
        for (const [sid, blob] of core.voices()) {
          if (!s.scenes.some((x) => x.id === sid)) continue;
          const path = `audio/scene-${s.scenes.findIndex((x) => x.id === sid) + 1}-${sid.slice(0, 8)}.${extFor(blob.type)}`;
          files[path] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
          manifest.voices[sid] = { path, type: blob.type || "" };
        }
        const m = core.music();
        if (m) {
          const path = `audio/music.${extFor(m.type)}`;
          files[path] = [new Uint8Array(await m.arrayBuffer()), { level: 0 }];
          manifest.music = { path, type: m.type || "" };
        }
        files["project.json"] = [enc.encode(JSON.stringify(s, null, 1)), { level: 6 }];
        files["manifest.json"] = [enc.encode(JSON.stringify(manifest, null, 1)), { level: 6 }];
        const zipped = window.fflate.zipSync(files);
        download(new Blob([zipped], { type: "application/zip" }), `${safeName(s.name)}.nibor`);
        say(`تم حفظ حزمة المشروع مع ${Object.keys(manifest.voices).length} تعليق صوتي${m ? " والموسيقى" : ""}.`);
      } catch (e) {
        say("تعذر إنشاء الحزمة: " + e.message);
      }
    });
    $("nmPackImport")?.addEventListener("click", () => $("nmPackFile")?.click());
    $("nmPackFile")?.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      ev.target.value = "";
      if (!file) return;
      if (busyGuard()) return;
      try {
        if (!window.fflate) throw Error("مكتبة الضغط غير محمّلة");
        if (file.size > 400 * 1024 * 1024) throw Error("الملف أكبر من 400MB");
        const entries = window.fflate.unzipSync(new Uint8Array(await file.arrayBuffer()));
        const dec = new TextDecoder();
        if (!entries["project.json"]) throw Error("الحزمة لا تحتوي project.json");
        const project = JSON.parse(dec.decode(entries["project.json"]));
        const manifest = entries["manifest.json"] ? JSON.parse(dec.decode(entries["manifest.json"])) : { voices: {} };
        if (manifest.format && manifest.format !== "nibor-project") throw Error("ليست حزمة Nibor Motion");
        await flush();
        // Always open as a new library entry so an existing project is never overwritten.
        project.projectId = core.newId();
        let n = 0;
        for (const [sid, info] of Object.entries(manifest.voices || {})) {
          const bytes = entries[info?.path];
          if (!bytes || !project.scenes?.some?.((x) => x.id === sid)) continue;
          await core.audioDB.put(core.voiceKeyFor(project.projectId, sid), new Blob([bytes], { type: info.type || "" }));
          n++;
        }
        if (manifest.music?.path && entries[manifest.music.path])
          await core.audioDB.put(core.musicKeyFor(project.projectId), new Blob([entries[manifest.music.path]], { type: manifest.music.type || "" }));
        window.NM.loadProject(project, `تم فتح الحزمة مع ${n} تعليق صوتي${manifest.music ? " والموسيقى" : ""}. أُضيفت إلى «مشاريعي».`);
        await persist();
        renderLibrary();
      } catch (e) {
        say("تعذر فتح الحزمة: " + e.message);
      }
    });

    // ---------------- startup ----------------
    (async () => {
      try {
        await persist(); // make sure the open project is in the library
        // Collect voice clips of scenes deleted in earlier sessions (kept until now so undo could restore them).
        const s = core.getState();
        const prefix = "project:" + s.projectId + ":";
        const referenced = new Set(s.scenes.map((x) => x.id));
        for (const v of await lib.versions(s.projectId)) {
          try {
            JSON.parse(v.data).scenes.forEach((x) => referenced.add(x.id));
          } catch (e) {}
        }
        const orphans = (await clips.keys(prefix)).filter((k) => {
          const rest = String(k).slice(prefix.length);
          return rest !== "music" && !referenced.has(rest);
        });
        if (orphans.length) await clips.removeKeys(orphans);
      } catch (e) {
        console.warn("library startup", e);
      }
    })();
    window.NM.store = { undo, redo, flush, renderLibrary, history: hist };
  }

  if (window.NM?.core) start();
  else document.addEventListener("nm:core-ready", start, { once: true });
})();
