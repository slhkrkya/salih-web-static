/* ==========================================================================
 * game/speedrun.js — SÜRE MODU kronometresi
 * ==========================================================================
 *
 * Istenen davranis (oyun testi talebi):
 *   - Bu moda giren HER ZAMAN bastan baslar. Bolumleri daha once bitirmis
 *     olmak bir sey degistirmez — herkes ayni yerden koser, adil olsun.
 *   - Kronometre "klasik" calisir: OLUMDE DURMAZ. Geri al, isinlanma ve
 *     patron dovusleri sayilir; olmek sureye mal olur.
 *   - Oyunun kontrolu ANLATI icin elinden aldigi anlar SAYILMAZ. Bu modda
 *     ipucu balonlari zaten tamamen susturulur (scenes.js setMuted), geriye
 *     kalan MERGE sahnesi ve epilog kapanisi da sayaca girmez — ucunde de
 *     oyuncu hicbir sey yapamaz ve sure herkes icin aynidir.
 *     Kararin uygulandigi yer: boot.js'in ana dongusundeki tek kosul.
 *
 * ==========================================================================
 * NEDEN KARE SAYIYORUZ, DUVAR SAATI DEGIL
 * ==========================================================================
 * Oyun SABIT ADIMLI (60 Hz) bir dongu. Duvar saati (Date.now) saymak sureyi
 * makinenin hizina ve sekmenin arka plana atilmasina baglardi: takilan bir
 * kare oyuncuyu cezalandirir, sekme degistiren kisi ise dakikalarca "kosmus"
 * sayilirdi. Kare saymak ikisini de cozer ve ayni girdi dizisi ayni sureyi
 * verir — yani sure OYUNUN kendi zamanidir, tarayicininki degil.
 *
 * Bunun dogal sonucu: dongu duraklatildiginda (DURAKLAT, HARITA, sekme
 * arkaplana alinmasi -> loop.onAutoPause) sayac da durur. Bu bir istisna
 * DEGIL, ayni kuralin devami: oyun ilerlemiyorsa sure de ilerlemez.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createSpeedrun, formatTime } from "./speedrun.js";
 *
 *   const run = createSpeedrun();
 *   run.start()                 -> sayaci sifirlar, active = true
 *   run.tick()                  -> her SABIT adimda, oynanis isliyorken
 *   run.split(worldKey)         -> bolum gecisinde ara sure (telemetri/dogrulama)
 *   run.finish()                -> sureyi dondurur, active kalir (bitmis kosu)
 *   run.abort()                 -> kosuyu iptal eder (sure kaydedilmez)
 *   run.active / .finished / .frames / .ms / .splits
 *
 *   formatTime(ms) -> "M:SS.cc"  (bir saati asarsa "H:MM:SS.cc")
 * ========================================================================== */

export const FPS = 60;

/* Bir kosunun MAKUL alt siniri. Sunucuya gonderilen sureler bunun altindaysa
 * kabul edilmez — hile korumasi degil (gerek yok), sadece bozuk/kazara sifir
 * kayitlarin listeyi ele gecirmesini engelleyen bir taban. W0+W1+W6+EP'nin
 * salt yol uzunlugu tepe hizda bile bunun cok ustunde. */
export const MIN_RUN_MS = 60 * 1000;
/* Ust sinir: 6 saat. Bunun ustu "sekmeyi acik unutmus" demektir. */
export const MAX_RUN_MS = 6 * 60 * 60 * 1000;

export function framesToMs(frames) {
  return Math.round((frames * 1000) / FPS);
}

export function formatTime(ms) {
  const t = Math.max(0, Math.round(ms || 0));
  const cs = Math.floor((t % 1000) / 10);
  const totalSec = Math.floor(t / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const two = (n) => (n < 10 ? "0" + n : "" + n);
  const base = two(s) + "." + two(cs);
  return h > 0 ? h + ":" + two(m) + ":" + base : m + ":" + base;
}

export function createSpeedrun() {
  let active = false;
  let finished = false;
  let frames = 0;
  /* Ara sureler kare basina nesne URETMEZ: dunya basina tek sayi. */
  const splits = { w0: 0, w1: 0, w6: 0, ep: 0 };

  function clearSplits() { splits.w0 = 0; splits.w1 = 0; splits.w6 = 0; splits.ep = 0; }

  function start() {
    active = true;
    finished = false;
    frames = 0;
    clearSplits();
  }

  /* Bitmis bir kosuda sayac ISLEMEZ — bitis cizgisine dokunduktan sonraki
   * epilog kapanisi (6 s) ve isim ekrani sureye eklenmemeli. */
  function tick() {
    if (!active || finished) return;
    frames++;
  }

  function split(worldKey) {
    if (!active || finished) return;
    if (splits[worldKey] === 0) splits[worldKey] = frames;
  }

  function finish() {
    if (!active || finished) return 0;
    finished = true;
    return framesToMs(frames);
  }

  function abort() {
    active = false;
    finished = false;
    frames = 0;
    clearSplits();
  }

  return {
    start, tick, split, finish, abort,
    get active() { return active; },
    get finished() { return finished; },
    get frames() { return frames; },
    get ms() { return framesToMs(frames); },
    get splits() { return splits; }
  };
}

export default createSpeedrun;
