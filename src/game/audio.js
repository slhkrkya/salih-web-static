/* ==========================================================================
 * game/audio.js — PROSEDUREL SES (WebAudio, dosya YOK)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §7.5 (11 SFX), §3.7 (channelDetune formulu,
 * "merge" akoru). Hicbir ses DOSYASI yok — hepsi OscillatorNode/GainNode ile
 * anlik uretilir. Tarayicinin otomatik-oynatma politikasi geregi AudioContext
 * yalniz kullanici jestinden SONRA (launcher'in "SES AÇIK" tiki zaten bunu
 * saglar) `resume()` edilir; bu modul kendi basina asla ses BASLATMAZ.
 *
 * DETUNE BAGLANTISI (§3.7): surekli, alcak sesli bir "drone" (iki osilator)
 * gameplay boyunca calar; ikinci osilatorun detune degeri rate.js'in
 * degerinden turer (rate/100)*0.8 cent — oran bozuldukca kulaga "yanlis"
 * gelir. MERGE'in kendi SFX'i her zaman SIFIR detune'dur (temiz akor),
 * boylece MERGE'e kadar hic duyulmayan tek sey budur.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createAudio } from "./audio.js";
 *
 *   const audio = createAudio();
 *   audio.setEnabled(bool)         -> ilk true'da AudioContext resume() dener
 *   audio.play(name)               -> "jump"|"land"|"revert"|"commit"|
 *                                     "telegraph"|"window"|"obey"|"drain"|
 *                                     "verb-rewrite"|"merge"|"shoot"|
 *                                     "hit"|"block"|"hunter"|
 *                                     "crack"|"collapse"|"dash"|"wall"
 *   audio.startDrone()             -> surekli alcak drone baslar (idempotent)
 *   audio.stopDrone()
 *   audio.setDroneRate(rateInt)    -> HER karede degil, rate degistiginde cagir
 *   audio.destroy()
 * ========================================================================== */

function hasAudioContext() {
  return typeof window !== "undefined" &&
    (typeof window.AudioContext === "function" || typeof window.webkitAudioContext === "function");
}

export function createAudio() {
  let enabled = false;
  let ctx = null;
  let master = null;
  let droneOsc1 = null, droneOsc2 = null, droneGain = null;
  let destroyed = false;

  function ensureCtx() {
    if (ctx || destroyed || !hasAudioContext()) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }

  function setEnabled(v) {
    enabled = !!v;
    if (enabled) {
      ensureCtx();
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    }
  }

  function beep(freq, durationMs, opts) {
    if (!enabled) return;
    ensureCtx();
    if (!ctx) return;
    const o = opts || {};
    const wave = o.wave || "square";
    const gainPeak = o.gain === undefined ? 0.28 : o.gain;
    const t0 = ctx.currentTime;
    const dur = durationMs / 1000;

    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.linearRampToValueAtTime(o.slideTo, t0 + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainPeak, t0 + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function chord(freqs, durationMs, gainPeak) {
    if (!enabled) return;
    ensureCtx();
    if (!ctx) return;
    for (const f of freqs) beep(f, durationMs, { wave: "triangle", gain: (gainPeak === undefined ? 0.16 : gainPeak) });
  }

  /* --------------------------------------------------------- 11 SFX (§7.5) */
  const SFX = {
    "jump": () => beep(520, 90, { wave: "square", slideTo: 720 }),
    "land": () => beep(160, 70, { wave: "square", slideTo: 90 }),
    "revert": () => beep(300, 140, { wave: "sawtooth", slideTo: 120, gain: 0.22 }),
    "commit": () => beep(880, 60, { wave: "square", gain: 0.2 }),
    "telegraph": () => beep(440, 220, { wave: "triangle", gain: 0.14 }),
    "window": () => beep(660, 40, { wave: "square", gain: 0.22 }),
    "obey": () => beep(220, 160, { wave: "sawtooth", slideTo: 160, gain: 0.2 }),
    "drain": () => beep(500, 160, { wave: "triangle", slideTo: 700, gain: 0.16 }),
    "verb-rewrite": () => beep(700, 70, { wave: "square", slideTo: 900, gain: 0.2 }),
    /* DOVUS REVIZYONU: KABUK'un yerini ATES aldi. Dort yeni ses, ustteki 11'in
     * ayni gramerinde (tek osilator, kisa zarf): atis / isabet / kalkanda
     * sekme / avcinin dagilmasi. Ayrimin ISITILEBILIR olmasi sart — oyuncu
     * ekrana bakmadan da "vurdum mu, sekti mi" sorusunu cevaplayabilmeli. */
    "shoot": () => beep(880, 45, { wave: "square", slideTo: 1180, gain: 0.13 }),
    "hit": () => beep(240, 60, { wave: "square", slideTo: 180, gain: 0.2 }),
    "block": () => beep(180, 70, { wave: "sawtooth", slideTo: 140, gain: 0.14 }),
    "hunter": () => beep(420, 160, { wave: "sawtooth", slideTo: 90, gain: 0.2 }),
    /* YALAN TABELA: catlama kuru ve KISA (bir uyari), cokme ise ASAGI kayan
     * uzun bir ses — kulak "daha zamanim var" ile "gitti"yi ayirt edebilmeli. */
    "crack": () => beep(1200, 45, { wave: "square", slideTo: 950, gain: 0.12 }),
    "collapse": () => beep(360, 200, { wave: "sawtooth", slideTo: 70, gain: 0.2 }),
    /* SON SINAV / AYNA: uzerine kosu YUKSELEN ve uzun (geliyor), duvar orme
     * ise KISA ve alcak bir tok ses (bir sey KONDU). Ikisi de kulakla
     * ayirt edilebilmeli — kalip adini okumaya vakit olmayabilir. */
    "dash": () => beep(150, 240, { wave: "sawtooth", slideTo: 560, gain: 0.18 }),
    "wall": () => beep(320, 90, { wave: "square", slideTo: 190, gain: 0.16 }),
    "merge": () => chord([392, 493.88, 587.33], 900, 0.18)   /* G-B-D temiz akor, SIFIR detune */
  };

  function play(name) {
    const fn = SFX[name];
    if (fn) fn();
  }

  function startDrone() {
    if (!enabled || droneOsc1) return;
    ensureCtx();
    if (!ctx) return;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    droneGain.connect(master);

    droneOsc1 = ctx.createOscillator();
    droneOsc1.type = "sine";
    droneOsc1.frequency.value = 110;
    droneOsc1.connect(droneGain);
    droneOsc1.start();

    droneOsc2 = ctx.createOscillator();
    droneOsc2.type = "sine";
    droneOsc2.frequency.value = 110;
    droneOsc2.detune.value = 0;
    droneOsc2.connect(droneGain);
    droneOsc2.start();
  }

  function stopDrone() {
    if (droneOsc1) { try { droneOsc1.stop(); } catch (e) {} droneOsc1.disconnect(); droneOsc1 = null; }
    if (droneOsc2) { try { droneOsc2.stop(); } catch (e) {} droneOsc2.disconnect(); droneOsc2 = null; }
    if (droneGain) { droneGain.disconnect(); droneGain = null; }
  }

  /* §3.7: channelDetune = (rate/100)*0.8 cent. */
  function setDroneRate(rateInt) {
    if (!droneOsc2) return;
    const cents = (rateInt / 100) * 0.8;
    droneOsc2.detune.setTargetAtTime(cents, ctx.currentTime, 0.2);
  }

  function destroy() {
    destroyed = true;
    stopDrone();
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
  }

  return { setEnabled, play, startDrone, stopDrone, setDroneRate, destroy, get enabled() { return enabled; } };
}

export default createAudio;
