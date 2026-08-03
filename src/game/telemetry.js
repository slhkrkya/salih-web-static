/* ==========================================================================
 * game/telemetry.js — OLCUM (FROZEN, ~140 satir)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §10.4/§8.6. "6-8 dk iddiasi olculmeden
 * savunulamaz" — bu modul Faz 4'un dis oyun testi kapisinda okunacak alti
 * sayiyi toplar: segment duvar saati, olculen verim, revert sayisi+konumu,
 * boss deneme sayisi, Defter B toplami, kare suresi.
 *
 * Faz 2'de gercek segment/boss YOK (Faz 3'un isi); bu modul altyapiyi kurar
 * ve test odasinda revert/kare orneklemesiyle dogrulanir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createTelemetry } from "./telemetry.js";
 *
 *   const tm = createTelemetry();
 *   tm.startSegment(id, tileCount, topSpeedTilePerSec)
 *   tm.endSegment(id)                    -> { id, wallMs, measuredTilePerSec, deviationPct }
 *   tm.recordRevert(x, y)                -> sayaç + 32x18 hucrelik konum histogrami
 *   tm.recordBossAttempt(bossId, won)
 *   tm.sampleFrame(frameMs)              -> rolling ortalama (son 300 kare)
 *   tm.summary()                         -> localStorage'a yazilabilir JSON-uyumlu obje
 *   tm.copyJSON()                        -> Promise<bool> (clipboard, PAUSE ekrani "JSON kopyala")
 *   tm.reset()
 * ========================================================================== */

const KEY = "sk.telemetry.v1";
const HIST_W = 32, HIST_H = 18;   /* dunya boyutundan bagimsiz, oranli hucre */
const FRAME_WINDOW = 300;

export function createTelemetry() {
  const segments = {};      /* id -> { tileCount, topSpeed, startedAt, samples: [] } */
  let reverts = 0;
  const revertHist = new Uint16Array(HIST_W * HIST_H);
  const bossAttempts = {};  /* bossId -> { attempts, won } */

  const frameTimes = new Float32Array(FRAME_WINDOW);
  let frameHead = 0, frameCount = 0;

  function now() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function startSegment(id, tileCount, topSpeedTilePerSec) {
    segments[id] = segments[id] || { tileCount, topSpeed: topSpeedTilePerSec, runs: [] };
    segments[id]._start = now();
  }

  function endSegment(id) {
    const s = segments[id];
    if (!s || s._start === undefined) return null;
    const wallMs = now() - s._start;
    delete s._start;
    const wallSec = wallMs / 1000;
    const measuredTilePerSec = wallSec > 0 ? s.tileCount / wallSec : 0;
    const designSec = s.topSpeed > 0 ? s.tileCount / s.topSpeed : 0;
    const deviationPct = designSec > 0 ? ((wallSec - designSec) / designSec) * 100 : 0;
    const rec = { id, wallMs: Math.round(wallMs), measuredTilePerSec: Math.round(measuredTilePerSec * 100) / 100, deviationPct: Math.round(deviationPct * 10) / 10 };
    s.runs.push(rec);
    return rec;
  }

  function recordRevert(worldPxX, worldPxY, mapPxW, mapPxH) {
    reverts++;
    if (mapPxW > 0 && mapPxH > 0) {
      const hx = Math.min(HIST_W - 1, Math.max(0, Math.floor((worldPxX / mapPxW) * HIST_W)));
      const hy = Math.min(HIST_H - 1, Math.max(0, Math.floor((worldPxY / mapPxH) * HIST_H)));
      revertHist[hy * HIST_W + hx]++;
    }
  }

  function recordBossAttempt(bossId, won) {
    const b = bossAttempts[bossId] || (bossAttempts[bossId] = { attempts: 0, wins: 0 });
    b.attempts++;
    if (won) b.wins++;
  }

  function sampleFrame(frameMs) {
    frameTimes[frameHead] = frameMs;
    frameHead = (frameHead + 1) % FRAME_WINDOW;
    if (frameCount < FRAME_WINDOW) frameCount++;
  }

  function frameStats() {
    if (frameCount === 0) return { avgMs: 0, maxMs: 0, samples: 0 };
    let sum = 0, max = 0;
    for (let i = 0; i < frameCount; i++) { sum += frameTimes[i]; if (frameTimes[i] > max) max = frameTimes[i]; }
    return { avgMs: Math.round((sum / frameCount) * 100) / 100, maxMs: Math.round(max * 100) / 100, samples: frameCount };
  }

  function summary() {
    const segOut = {};
    for (const id in segments) {
      const s = segments[id];
      segOut[id] = { tileCount: s.tileCount, topSpeed: s.topSpeed, runs: s.runs };
    }
    return {
      v: 1,
      segments: segOut,
      reverts,
      revertHist: Array.from(revertHist),
      histSize: { w: HIST_W, h: HIST_H },
      bossAttempts,
      frame: frameStats()
    };
  }

  function persist() {
    try {
      if (typeof localStorage === "undefined") return false;
      localStorage.setItem(KEY, JSON.stringify(summary()));
      return true;
    } catch (e) { return false; }
  }

  async function copyJSON() {
    const text = JSON.stringify(summary(), null, 2);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function reset() {
    for (const id in segments) delete segments[id];
    reverts = 0;
    revertHist.fill(0);
    for (const id in bossAttempts) delete bossAttempts[id];
    frameTimes.fill(0); frameHead = 0; frameCount = 0;
  }

  return {
    startSegment, endSegment, recordRevert, recordBossAttempt,
    sampleFrame, frameStats, summary, persist, copyJSON, reset,
    get revertCount() { return reverts; }
  };
}

export default createTelemetry;
