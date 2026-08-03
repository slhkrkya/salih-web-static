/* ==========================================================================
 * game/loop.js — SABIT ADIMLI DONGU (§10.5) + hitstop + perf governor
 * ==========================================================================
 *
 * ARAYUZ SOZLESMESI (Birlestirme ajani bunu okur):
 *
 *   import { createLoop, STEP_DT, STEP_MS } from "./loop.js";
 *
 *   const loop = createLoop({
 *     update(dt)      : REQUIRED. dt HER ZAMAN STEP_DT (1/60). Kare basina 0..3 kez.
 *     render()        : REQUIRED. Kare basina TAM 1 kez, update'lerden SONRA.
 *                       Argumansiz cagrilir (§10.5 yapisi birebir korunur).
 *     onFps(fps)      : optional. ~4 Hz (250 ms pencere). Tamsayi.
 *     onAutoPause(r)  : optional. Dongu KENDI KENDINE duraklattiginda. r = "hidden".
 *                       Launcher zaten visibilitychange dinliyor; bu ikinci emniyet
 *                       kemeri. boot bunu UI'ya (DURAKLATILDI yazisi) yansitmali.
 *     onPerf(level)   : optional. 0 = tam, 1 = kisilmis. Yalniz DEGISTIGINDE.
 *     autoPauseHidden : optional, default true. document.hidden -> pause().
 *   });
 *
 * Donen `loop`:
 *   start()        — rAF kurar. Zaten kosuyorsa no-op. reduceMotion'DAN BAGIMSIZ.
 *   pause()        — rAF iptal, paused = true. Idempotent.
 *   resume()       — accumulator SIFIRLANIR, last = now. Telafi kosusu OLMAZ.
 *   stop()         — rAF iptal, paused = false (kapali durum). destroy oncesi.
 *   destroy()      — stop + tum listener'lar birakilir. Tekrar kullanilamaz.
 *   isPaused() / isRunning()
 *   renderOnce()   — duraklamis haldeyken tek kare cizdirir (resize yolu icin).
 *   hitstop(n)     — sonraki n sabit adimda update() CAGRILMAZ, render() calisir.
 *                    Duvar saati akmaya devam eder (determinizm: adim sayaci artar).
 *   reset()        — accumulator + hitstop + perf penceresi sifirlanir.
 *
 * Okunur alanlar (her kare guncellenir, kopyalanmaz):
 *   loop.frames     — kurulustan beri gecen SABIT ADIM sayisi (hitstop dahil).
 *                     Determinizmin saati. REGRESYON kaydi buna baglanir.
 *   loop.simFrames  — update()'in GERCEKTEN calistigi adim sayisi.
 *   loop.lastSteps  — bu karede atilan adim sayisi (0..3).
 *   loop.fps        — son olculen fps.
 *   loop.perfLevel  — 0 | 1.
 *   loop.frameMs    — son karenin duvar saati suresi (ms).
 *
 * VARSAYIMLAR:
 *   - rAF'in TEK sahibi bu modul. boot/launcher kendi rAF'ini kurmaz.
 *   - update() icinde nesne literali / new YOK (cagiran sorumlu).
 *   - Donguyu reduceMotion durdurmaz (§4.12 / §11.2).
 * ========================================================================== */

/* §10.5 sozlesmesi — sayilar degistirilemez. */
export const STEP_MS = 16.667;
export const STEP_DT = 1 / 60;
export const MAX_CATCHUP_STEPS = 3;
export const SPIKE_CLAMP_MS = 100;

/* FPS penceresi: boot.js Faz 0'da 250 ms kullaniyordu, ayni kaliyor. */
export const FPS_WINDOW_MS = 250;

/* Perf governor (§10.5): 30 karelik ortalama > 20 ms -> kis, < 14 ms -> ac. */
export const PERF_WINDOW = 30;
export const PERF_BAD_MS = 20;
export const PERF_GOOD_MS = 14;

const hasPerf = typeof performance !== "undefined" && typeof performance.now === "function";
function now() { return hasPerf ? performance.now() : Date.now(); }

export function createLoop(opts) {
  const o = opts || {};
  const onUpdate = o.update;
  const onRender = o.render;
  const onFps = typeof o.onFps === "function" ? o.onFps : null;
  const onAutoPause = typeof o.onAutoPause === "function" ? o.onAutoPause : null;
  const onPerf = typeof o.onPerf === "function" ? o.onPerf : null;
  const autoPauseHidden = o.autoPauseHidden !== false;

  let rafId = 0;
  let paused = false;
  let destroyed = false;

  let acc = 0;
  let last = 0;
  let hitstopLeft = 0;

  let fpsFrames = 0, fpsSince = 0;
  let perfSum = 0, perfCount = 0, perfLevelPending = 0;

  const loop = {
    frames: 0,
    simFrames: 0,
    lastSteps: 0,
    fps: 0,
    perfLevel: 0,
    frameMs: 0,
    start: start,
    pause: pause,
    resume: resume,
    stop: stop,
    destroy: destroy,
    isPaused: isPaused,
    isRunning: isRunning,
    renderOnce: renderOnce,
    hitstop: hitstop,
    reset: reset
  };

  /* --- hitstop'lu update kapisi ------------------------------------------
   * §10.5 yapisi `update(1/60)` cagrisini bekler; hitstop bu kapinin ICINDE
   * cozulur, boylece asagidaki `frame` govdesi sozlesmeyle birebir kalir. */
  function update(dt) {
    loop.frames++;
    if (hitstopLeft > 0) { hitstopLeft--; return; }
    loop.simFrames++;
    onUpdate(dt);
  }

  /* --- §10.5 FIXED TIMESTEP — YAPI BIREBIR -------------------------------- */
  function frame(t) {
    const delta = t - last;
    acc += Math.min(delta, SPIKE_CLAMP_MS); last = t;
    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_CATCHUP_STEPS) { update(STEP_DT); acc -= STEP_MS; steps++; }
    if (steps === MAX_CATCHUP_STEPS) acc = 0;
    render();

    loop.lastSteps = steps;
    loop.frameMs = delta;
    measure(t, delta);

    rafId = requestAnimationFrame(frame);
  }

  function render() { onRender(); }

  /* --- fps + perf governor ------------------------------------------------ */
  function measure(t, delta) {
    fpsFrames++;
    if (t - fpsSince >= FPS_WINDOW_MS) {
      loop.fps = Math.round(fpsFrames * 1000 / (t - fpsSince));
      fpsFrames = 0; fpsSince = t;
      if (onFps) onFps(loop.fps);
    }

    /* Ilk kareyi (delta cok buyuk olabilir) ve spike'lari pencereye sokmuyoruz. */
    if (delta > 0 && delta < SPIKE_CLAMP_MS) { perfSum += delta; perfCount++; }
    if (perfCount < PERF_WINDOW) return;
    const avg = perfSum / perfCount;
    perfSum = 0; perfCount = 0;
    /* Histerezis: karar ARKA ARKAYA iki pencerede ayni yonu gostermeli. */
    const want = loop.perfLevel === 0 ? (avg > PERF_BAD_MS ? 1 : 0)
                                      : (avg < PERF_GOOD_MS ? 0 : 1);
    if (want !== loop.perfLevel) {
      if (perfLevelPending === want) {
        loop.perfLevel = want; perfLevelPending = loop.perfLevel;
        if (onPerf) onPerf(want);
      } else perfLevelPending = want;
    } else perfLevelPending = want;
  }

  /* --- yasam dongusu ------------------------------------------------------ */
  function start() {
    if (destroyed || rafId) return;
    paused = false;
    last = now(); fpsSince = last; fpsFrames = 0;
    acc = 0;
    perfSum = 0; perfCount = 0;
    rafId = requestAnimationFrame(frame);
  }
  function pause() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    paused = true;
  }
  function resume() {
    if (destroyed || rafId) return;
    paused = false;
    last = now();
    acc = 0;                     /* birikmis borc ATILIR — telafi kosusu olmaz */
    fpsSince = last; fpsFrames = 0;
    perfSum = 0; perfCount = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    paused = false;
  }
  function isPaused() { return paused; }
  function isRunning() { return !!rafId; }
  function renderOnce() { if (!destroyed) render(); }
  function hitstop(n) { const v = n | 0; if (v > hitstopLeft) hitstopLeft = v; }
  function reset() {
    acc = 0; hitstopLeft = 0;
    perfSum = 0; perfCount = 0;
    last = now(); fpsSince = last; fpsFrames = 0;
  }

  /* --- sekme gizlenince otomatik duraklatma ------------------------------- */
  /* Launcher da visibilitychange dinliyor (§10.7). Iki kez pause() zararsiz:
   * idempotent. Motorun KENDI emniyet kemeri olmasi gerekiyor cunku boot
   * launcher'siz (dev harness, test) da kosabilir. Otomatik RESUME YOK:
   * geri donunce oyuncu bilincli olarak devam etmeli (§Ö25). */
  const doc = typeof document !== "undefined" ? document : null;
  function onVisibility() {
    if (!doc || !doc.hidden) return;
    if (rafId) { pause(); if (onAutoPause) onAutoPause("hidden"); }
  }
  if (doc && autoPauseHidden) doc.addEventListener("visibilitychange", onVisibility);

  function destroy() {
    destroyed = true;
    stop();
    if (doc && autoPauseHidden) doc.removeEventListener("visibilitychange", onVisibility);
  }

  return loop;
}

export default createLoop;
