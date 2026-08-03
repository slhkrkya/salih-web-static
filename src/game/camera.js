/* ==========================================================================
 * game/camera.js — TAKIP, LOOKAHEAD, SINIRLAR
 * ==========================================================================
 *
 * §4.1 karari: "camX = Math.round(camX) her karede" — sub-pixel takip piksel-
 * net render ile CELISIR, o yuzden kamera KENDI ic durumunu float tutar
 * (yumusak takip icin) ama disa verdigi deger HER ZAMAN yuvarlanmis tam sayidir.
 *
 * DOM KULLANMAZ, node'dan import edilebilir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *
 *   import { createCamera } from "./camera.js";
 *
 *   const cam = createCamera(mapPxW, mapPxH);
 *   cam.follow(body, dt)     -> void   (her fixed update'te CAGRILIR)
 *   cam.snapTo(x, y)         -> void   (seviye girisi / respawn, yumusatma yok)
 *   cam.x / cam.y            -> Math.round edilmis TAM SAYI (okunur alan)
 *   cam.setBounds(w, h)      -> harita degisince (chunk birlestirme sonrasi)
 *   cam.setShake(active)     -> reduceMotion kapatir (§4.11)
 *   cam.shake(amount, frames)-> boss/iniş carpmasi (yalniz gorsel, no-op ise
 *                               setShake(false) sonrasi)
 * ========================================================================== */

import { VIEW_W, VIEW_H } from "./scale.js";

/* Lookahead: karakter ekranin merkezinden ONDE tutulur, yon degistirince
 * yavasca oteki tarafa kayar — Sonic/Mario ikisinde de standart. */
const LOOKAHEAD_MAX = 48;       /* px, tepe hizda tam bu kadar one kayar */
const LOOKAHEAD_SPEED_REF = 3.5; /* px/f — bu hizda tam LOOKAHEAD_MAX uygulanir */
const LOOKAHEAD_LERP = 0.06;    /* hedefe yaklasma orani (kritik-sonlanmamis) */
const FOLLOW_LERP_X = 0.14;
const FOLLOW_LERP_Y = 0.10;
const DEADZONE_Y = 10;          /* dusey serbest bolge: kucuk ziplamalar kamerayi oynatmaz */

export function createCamera(mapPxW, mapPxH) {
  let boundW = mapPxW || VIEW_W;
  let boundH = mapPxH || VIEW_H;

  let fx = 0, fy = 0;          /* float ic durum */
  let look = 0;                /* mevcut lookahead ofseti */
  let shakeFrames = 0;
  let shakeAmount = 0;
  let shakeEnabled = true;
  let seed = 1;

  function clampX(v) {
    const max = Math.max(0, boundW - VIEW_W);
    return v < 0 ? 0 : v > max ? max : v;
  }
  function clampY(v) {
    const max = Math.max(0, boundH - VIEW_H);
    return v < 0 ? 0 : v > max ? max : v;
  }

  function setBounds(w, h) {
    boundW = w; boundH = h;
    fx = clampX(fx);
    fy = clampY(fy);
  }

  function snapTo(x, y) {
    fx = clampX(x - (VIEW_W >> 1));
    fy = clampY(y - (VIEW_H >> 1));
    look = 0;
  }

  function follow(body, dt) {
    const cx = body.x + body.w * 0.5;
    const cy = body.y + body.h * 0.5;

    /* Lookahead hedefi: facing yonunde, hiza oranli. */
    const speed = body.vx < 0 ? -body.vx : body.vx;
    const t = speed > LOOKAHEAD_SPEED_REF ? 1 : speed / LOOKAHEAD_SPEED_REF;
    const targetLook = body.facing * LOOKAHEAD_MAX * t;
    look += (targetLook - look) * LOOKAHEAD_LERP;

    const targetX = cx + look - (VIEW_W >> 1);
    let dy = cy - (fy + (VIEW_H >> 1));
    let targetY = fy;
    if (dy > DEADZONE_Y) targetY = fy + (dy - DEADZONE_Y);
    else if (dy < -DEADZONE_Y) targetY = fy + (dy + DEADZONE_Y);

    fx += (targetX - fx) * FOLLOW_LERP_X;
    fy += (targetY - fy) * FOLLOW_LERP_Y;

    fx = clampX(fx);
    fy = clampY(fy);

    if (shakeFrames > 0) shakeFrames--;
  }

  function setShake(active) { shakeEnabled = !!active; }

  function shake(amount, frames) {
    if (!shakeEnabled) return;
    shakeAmount = amount || 2;
    shakeFrames = frames || 8;
  }

  /* Deterministik "rastgele" (seed tabanli) — sarsinti her yeniden oynamada
   * ayni gorunur; REGRESYON'un kaydiyla kiyaslanabilir kalir (§4.8). */
  function nextJitter() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return ((seed / 0x7fffffff) - 0.5) * 2;
  }

  return {
    get x() {
      let v = Math.round(fx);
      if (shakeFrames > 0) v += Math.round(nextJitter() * shakeAmount);
      return v;
    },
    get y() {
      let v = Math.round(fy);
      if (shakeFrames > 0) v += Math.round(nextJitter() * shakeAmount * 0.6);
      return v;
    },
    follow, snapTo, setBounds, setShake, shake
  };
}

export default createCamera;
