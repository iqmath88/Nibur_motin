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

  /**
   * @param {object} o
   * @param {HTMLCanvasElement} o.canvas
   * @param {number} o.fps
   * @param {number} o.totalSeconds
   * @param {(t:number)=>void} o.renderFrame  draws the frame for time t (seconds) on the canvas
   * @param {AudioBuffer|null} o.audioBuffer
   * @param {{video:VideoEncoderConfig, audio:?{config:AudioEncoderConfig,mux:string}}} o.support from probe()
   * @param {(done:number,total:number)=>void} [o.onProgress]
   * @param {()=>boolean} [o.isCancelled]
   * @returns {Promise<Blob>} MP4
   */
  async function run(o) {
    const { canvas, fps, totalSeconds, renderFrame, audioBuffer, support } = o;
    const isCancelled = o.isCancelled || (() => false);
    const frames = Math.max(1, Math.round(totalSeconds * fps));
    const frameUs = 1e6 / fps;
    const useAudio = !!(audioBuffer && support.audio);
    const target = new Mp4Muxer.ArrayBufferTarget();
    const muxer = new Mp4Muxer.Muxer({
      target,
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
      video: { codec: "avc", width: canvas.width, height: canvas.height, frameRate: fps },
      ...(useAudio
        ? { audio: { codec: support.audio.mux, numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate } }
        : {}),
    });
    let failure = null;
    const fail = (e) => {
      failure = failure || e || Error("خطأ في الترميز");
    };
    const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: fail });
    venc.configure(support.video);
    let aenc = null;
    try {
      // ---- audio: encode the pre-rendered mix in 0.1 s blocks ----
      if (useAudio) {
        aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: fail });
        aenc.configure({ ...support.audio.config, numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate });
        const ch = audioBuffer.numberOfChannels,
          len = audioBuffer.length,
          rate = audioBuffer.sampleRate,
          block = Math.round(rate / 10);
        const planes = Array.from({ length: ch }, (_, c) => audioBuffer.getChannelData(c));
        for (let start = 0; start < len; start += block) {
          const n = Math.min(block, len - start);
          const data = new Float32Array(n * ch);
          for (let c = 0; c < ch; c++) data.set(planes[c].subarray(start, start + n), c * n);
          const ad = new AudioData({
            format: "f32-planar",
            sampleRate: rate,
            numberOfFrames: n,
            numberOfChannels: ch,
            timestamp: Math.round((start * 1e6) / rate),
            data,
          });
          aenc.encode(ad);
          ad.close();
          if (failure) throw failure;
        }
        await aenc.flush();
      }
      // ---- video: one exact frame at a time ----
      const keyEvery = fps * 2;
      for (let f = 0; f < frames; f++) {
        if (isCancelled()) throw Object.assign(Error("cancelled"), { cancelled: true });
        if (failure) throw failure;
        renderFrame(f / fps);
        const frame = new VideoFrame(canvas, { timestamp: Math.round(f * frameUs), duration: Math.round(frameUs) });
        venc.encode(frame, { keyFrame: f % keyEvery === 0 });
        frame.close();
        while (venc.encodeQueueSize > 4) await yieldNow();
        if (f % 3 === 0) {
          o.onProgress?.(f + 1, frames);
          await yieldNow();
        }
      }
      await venc.flush();
      if (failure) throw failure;
      muxer.finalize();
      o.onProgress?.(frames, frames);
      return new Blob([target.buffer], { type: "video/mp4" });
    } finally {
      try {
        if (venc.state !== "closed") venc.close();
      } catch (e) {}
      try {
        if (aenc && aenc.state !== "closed") aenc.close();
      } catch (e) {}
    }
  }

  NM.webExport = { available, probe, renderAudio, run, AUDIO_RATE };
})(window.NM);
