/* ==========================================================================
 * game/touch.js — DOKUNMATIK AYARI (auto/on/off), save.settings.touch
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §10.3 (Faz 6, `touch.js` portre yerlesimi).
 * Portre kapisi (launcher.js), dokunmatik girdi hit-test'i (input.js:
 * buttonRects/zoneOf/pointer olaylari) ve buton CIZIMI (boot.js:
 * drawTouchHints) ZATEN kurulu ve calisiyor — bu modulun eklemesi SADECE
 * `save.settings.touch` semasinin (v0'da tanimli ama hic okunmayan alan)
 * gercek bir auto/on/off ZORLAMASINA baglanmasidir. Yeni DOM butonu YOK
 * (§7.6'nin "3 gerçek buton" sözleşmesi); PAUSE'dan T tusuyla dönüşümlü.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createTouchSettings, TOUCH_MODE } from "./touch.js";
 *
 *   const touch = createTouchSettings(save.settings.touch);
 *   touch.mode          -> "auto" | "on" | "off"
 *   touch.cycle()       -> siradaki modu DONER ve icerde GUNCELLER
 *   touch.set(mode)      -> dogrudan yaz (gecersiz deger yoksayilir)
 *
 *   Cagiran (boot.js) her degisiklikte input.setTouchOverride(touch.mode)
 *   ve save.settings.touch = touch.mode cagirmalidir — bu modul input.js'e
 *   veya save.js'e DOGRUDAN dokunmaz, yalniz durumu tutar.
 * ========================================================================== */

export const TOUCH_MODE = Object.freeze({ AUTO: "auto", ON: "on", OFF: "off" });
const ORDER = [TOUCH_MODE.AUTO, TOUCH_MODE.ON, TOUCH_MODE.OFF];

export function createTouchSettings(initialMode) {
  let mode = ORDER.indexOf(initialMode) >= 0 ? initialMode : TOUCH_MODE.AUTO;

  function cycle() {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    return mode;
  }

  function set(m) {
    if (ORDER.indexOf(m) >= 0) mode = m;
  }

  return {
    get mode() { return mode; },
    cycle,
    set
  };
}

export default createTouchSettings;
