/* Nibor Motion — frame-accurate offline export (WebCodecs + mp4-muxer).
 *
 * Every frame is rendered at an exact timestamp and encoded, instead of recording the
 * canvas in real time. Results: constant frame rate, sample-accurate audio, export speed
 * limited only by the device (often faster than real time), and no corrupted output if
 * the screen turns off — work simply pauses and resumes.
 */
"use strict";
window.NM = window.NM || {};
(function (NM) {
  const AUDIO_RATE = 48000;

  // Yield to the event loop without timer throttling (setTimeout is clamped in hidden tabs).
  const channel = new MessageChannel();
  const queue = [];
  channel.port1.onmessage = () => queue.shift()?.();
  const yieldNow = () =>
    new Promise((resolve) => {
      queue.push(resolve);
      channel.port2.postMessage(0);
    });

  const available = () =>
    typeof window.VideoEncoder === "function" &&
    typeof window.VideoFrame === "function" &&
    typeof window.Mp4Muxer?.Muxer === "function";

  async function pickVideo(width, height, fps, bitrate) {
    // High → Main → Baseline, level 5.1 then 4.0 (1080×1920 needs ≥ level 4.0).
    const codecs = ["avc1.640033", "avc1.640028", "avc1.4d0033", "avc1.4d0028", "avc1.420033", "avc1.420028"];
    for (const codec of codecs) {
      for (const hardwareAcceleration of ["prefer-hardware", "no-preference"]) {
        const config = { codec, width, height, bitrate, framerate: fps, hardwareAcceleration, avc: { format: "avc" } };
        try {
          const r = await VideoEncoder.isConfigSupported(config);
          if (r.supported) return r.config || config;
        } catch (e) {
          /* try next */
        }
      }
    }
    return null;
  }

  async function pickAudio(channels) {
    if (typeof window.AudioEncoder !== "function") return null;
    for (const [codec, mux] of [
      ["mp4a.40.2", "aac"],
      ["opus", "opus"],
    ]) {
      const config = { codec, sampleRate: AUDIO_RATE, numberOfChannels: channels, bitrate: 160000 };
      try {
        const r = await AudioEncoder.isConfigSupported(config);
        if (r.supported) return { config: r.config || config, mux };
      } catch (e) {
        /* try next */
      }
    }
    return null;
  }

  /** Capability check. Returns {ok, reason?, video, audio}. */
  async function probe({ width, height, fps, bitrate = 8_000_000, needsAudio }) {
    if (!available()) return { ok: false, reason: "WebCodecs غير متاح في هذا المتصفح" };
    const video = await pickVideo(width, height, fps, bitrate);
    if (!video) return { ok: false, reason: "المتصفح لا يدعم ترميز H.264 بهذه الدقة" };
    let audio = null;
    if (needsAudio) {
      audio = await pickAudio(2);
      if (!audio) return { ok: false, reason: "المتصفح لا يدعم ترميز الصوت عبر WebCodecs" };
    }
    return { ok: true, video, audio };
  }

  /** Render the project's audio mix offline (sample-accurate, not real time). */
  async function renderAudio(totalSeconds, schedule) {
    const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(totalSeconds * AUDIO_RATE)), AUDIO_RATE);
    await schedule(ctx, ctx.destination);
    return ctx.startRendering();
  }

  /** Disk-backed output (Origin Private File System) so a long lesson does not have to fit in memory. */
  async function openDiskTarget(name) {
    try {
      if (!navigator.storage?.getDirectory) return null;
      const dir = await navigator.storage.getDirectory();
      const handle = await dir.getFileHandle(name, { create: true });
      if (typeof handle.createWritable !== "function") return null;
      const writable = await handle.createWritable();
      let chain = Promise.resolve(), pending = 0, error = null;
      const write = (data, position) => {
        pending += data.byteLength;
        const copy = data.slice ? data.slice() : new Uint8Array(data);
        chain = chain.then(() => writable.write({ type: "write", position, data: copy })).then(() => { pending -= copy.byteLength; }, (e) => { error = error || e; });
      };
      return {
        write,
        backlog: () => pending,
        settle: async () => { await chain; if (error) throw error; },
        finish: async () => { await chain; if (error) throw error; await writable.close(); return handle.getFile(); },
        abort: async () => { try { await chain; await writable.abort?.(); } catch (e) {} try { await dir.removeEntry(name); } catch (e) {} },
      };
    } catch (e) {
      return null;
    }
  }
  async function diskAvailable() {
    const t = await openDiskTarget("nm-probe.tmp");
    if (!t) return false;
    try { t.write(new Uint8Array([1]), 0); await t.finish(); } catch (e) { return false; } finally { try { (await navigator.storage.getDirectory()).removeEntry("nm-probe.tmp"); } catch (e) {} }
    return true;
  }

  /**
   * Encode [startTime, startTime + totalSeconds) of the project into one MP4.
   * @param {object} o
   * @param {HTMLCanvasElement} o.canvas
   * @param {number} o.fps
   * @param {number} [o.startTime=0] absolute time of the first frame (parts of a long lesson)
   * @param {number} o.totalSeconds  duration of this file
   * @param {(t:number)=>void} o.renderFrame  draws the frame for absolute time t (seconds)
   * @param {AudioBuffer|null} [o.audioBuffer] whole mix (short videos)
   * @param {(from:number,to:number)=>Promise<AudioBuffer|null>} [o.audioWindow] mix of [from,to) (long videos)
   * @param {boolean} [o.disk] stream to disk instead of memory
   * @returns {Promise<Blob>} MP4 (a File backed by disk when o.disk)
   */
  async function run(o) {
    const { canvas, fps, totalSeconds, renderFrame, support } = o;
    const startTime = o.startTime || 0;
    const isCancelled = o.isCancelled || (() => false);
    const frames = Math.max(1, Math.round(totalSeconds * fps));
    const frameUs = 1e6 / fps;
    const useAudio = !!((o.audioBuffer || o.audioWindow) && support.audio);
    const disk = o.disk ? await openDiskTarget("nm-export-" + Date.now() + ".mp4") : null;
    if (o.disk && !disk) throw Error("الكتابة إلى التخزين غير متاحة");
    const target = disk ? new Mp4Muxer.StreamTarget({ onData: (data, position) => disk.write(data, position), chunked: true, chunkSize: 4 * 1024 * 1024 }) : new Mp4Muxer.ArrayBufferTarget();
    const muxer = new Mp4Muxer.Muxer({
      target,
      fastStart: disk ? false : "in-memory",
      firstTimestampBehavior: "offset",
      video: { codec: "avc", width: canvas.width, height: canvas.height, frameRate: fps },
      ...(useAudio ? { audio: { codec: support.audio.mux, numberOfChannels: 2, sampleRate: AUDIO_RATE } } : {}),
    });
    let failure = null;
    const fail = (e) => { failure = failure || e || Error("خطأ في الترميز"); };
    const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: fail });
    venc.configure(support.video);
    let aenc = null, ok = false;
    const encodeBuffer = (buf, offsetSeconds) => {
      const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate, block = Math.round(rate / 10);
      const planes = Array.from({ length: 2 }, (_, c) => buf.getChannelData(Math.min(c, ch - 1)));
      for (let start = 0; start < len; start += block) {
        const n = Math.min(block, len - start), data = new Float32Array(n * 2);
        for (let c = 0; c < 2; c++) data.set(planes[c].subarray(start, start + n), c * n);
        const ad = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(offsetSeconds * 1e6 + (start * 1e6) / rate), data });
        aenc.encode(ad); ad.close();
        if (failure) throw failure;
      }
    };
    try {
      // ---- audio: whole mix, or window by window (bounded memory) ----
      if (useAudio) {
        aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: fail });
        aenc.configure({ ...support.audio.config, numberOfChannels: 2, sampleRate: AUDIO_RATE });
        if (o.audioBuffer) encodeBuffer(o.audioBuffer, 0);
        else {
          const W = 30;
          for (let from = 0; from < totalSeconds; from += W) {
            if (isCancelled()) throw Object.assign(Error("cancelled"), { cancelled: true });
            const to = Math.min(totalSeconds, from + W);
            const buf = await o.audioWindow(startTime + from, startTime + to);
            if (buf) encodeBuffer(buf, from);
            o.onAudioProgress?.(to, totalSeconds);
            while (aenc.encodeQueueSize > 8) await yieldNow();
            if (disk && disk.backlog() > 24e6) await disk.settle();
          }
        }
        await aenc.flush();
      }
      // ---- video: one exact frame at a time ----
      const keyEvery = fps * 2;
      for (let f = 0; f < frames; f++) {
        if (isCancelled()) throw Object.assign(Error("cancelled"), { cancelled: true });
        if (failure) throw failure;
        renderFrame(startTime + f / fps);
        const frame = new VideoFrame(canvas, { timestamp: Math.round(f * frameUs), duration: Math.round(frameUs) });
        venc.encode(frame, { keyFrame: f % keyEvery === 0 });
        frame.close();
        while (venc.encodeQueueSize > 4) await yieldNow();
        if (disk && disk.backlog() > 24e6) await disk.settle();
        if (f % 3 === 0) {
          o.onProgress?.(f + 1, frames);
          await yieldNow();
        }
      }
      await venc.flush();
      if (failure) throw failure;
      muxer.finalize();
      o.onProgress?.(frames, frames);
      ok = true;
      if (disk) return await disk.finish();
      return new Blob([target.buffer], { type: "video/mp4" });
    } finally {
      try { if (venc.state !== "closed") venc.close(); } catch (e) {}
      try { if (aenc && aenc.state !== "closed") aenc.close(); } catch (e) {}
      if (disk && !ok) await disk.abort();
    }
  }

  NM.webExport = { available, probe, renderAudio, run, diskAvailable, AUDIO_RATE };
})(window.NM);
