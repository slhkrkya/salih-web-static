/* ==========================================================================
 * game/debug.js — F1 FIZIK HUD (GO/NO-GO olcum paneli)
 * ==========================================================================
 *
 * Bu panelin amaci §4.3 dogrulanmis geometrisini (33 kare / 56 px hedefi)
 * OYNARKEN ekranda gormek. "Son ziplama" satiri EV_JUMP ile baslar,
 * EV_LAND ile kapanir; sure (kare) ve zirve yukseklik (px, ziplama
 * basladigi y'ye gore) o iki olay arasinda hesaplanir.
 *
 * DOM'a dogrudan dokunmaz: cizim var olan bir 2D ctx'e (ic tampon) yapilir,
 * boot.js render() icinde HUD acikken en son katman olarak cagirir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createDebugHud } from "./debug.js";
 *
 *   const hud = createDebugHud(font);      // font.js createFont(palette) cikisi
 *   hud.visible                             // bool, disaridan okunabilir
 *   hud.toggle()                            // F1 -> input.js onDebug burayi cagirir
 *   hud.sample(body, cfg, loop)             // HER fixed update'te (step() SONRASI)
 *   hud.draw(ctx)                           // HER render()'da, HUD GORUNURSE cizer
 * ========================================================================== */

import { TILE } from "./scale.js";
import { EV_JUMP, EV_LAND } from "./physics.js";

const PAD = 4;
const LINE_H = 11;   /* font.js FONT_H(10) + 1 px bosluk */
const SLOT_LIGHT = 11;

export function createDebugHud(font) {
  let visible = false;

  /* Son tamamlanmis ziplamanin olcumu (ekranda "hedef 33f/56px" ile birlikte
   * gosterilir ki sapma aninda goze carpsin). */
  let lastAirFrames = 0;
  let lastPeakPx = 0;

  /* Devam eden ziplamanin gecici durumu. */
  let jumpActive = false;
  let jumpStartFrame = 0;
  let jumpStartY = 0;
  let jumpMinY = 0;
  let frameCounter = 0;

  let snapshot = null;

  function toggle() { visible = !visible; }

  function sample(body, cfg, loop) {
    frameCounter++;

    if (body.events & EV_JUMP) {
      jumpActive = true;
      jumpStartFrame = frameCounter;
      jumpStartY = body.y;
      jumpMinY = body.y;
    }
    if (jumpActive && body.y < jumpMinY) jumpMinY = body.y;
    if (jumpActive && (body.events & EV_LAND)) {
      lastAirFrames = frameCounter - jumpStartFrame;
      lastPeakPx = jumpStartY - jumpMinY;
      jumpActive = false;
    }

    snapshot = {
      vxPxF: body.vx,
      vxTileS: (body.vx * 60) / TILE,
      vy: body.vy,
      grounded: body.grounded,
      coyote: body.coyote,
      jumpBuf: body.jumpBuf,
      angleDeg: (body.groundAngle * 180) / Math.PI,
      overflow: cfg ? Math.abs(body.vx) > cfg.maxSpeed + 0.001 : false,
      x: body.x, y: body.y,
      fps: loop ? loop.fps : 0,
      frameMs: loop ? loop.frameMs : 0,
      lastSteps: loop ? loop.lastSteps : 0
    };
  }

  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function fmt2(n) { return (Math.round(n * 100) / 100).toFixed(2); }

  function draw(ctx) {
    if (!visible || !snapshot) return;
    const s = snapshot;
    const rows = [
      `FPS ${s.fps}  ${fmt1(s.frameMs)}ms  steps:${s.lastSteps}`,
      `vx ${fmt2(s.vxPxF)} px/f  (${fmt1(s.vxTileS)} tile/s)`,
      `vy ${fmt2(s.vy)} px/f   grounded:${s.grounded ? 1 : 0}`,
      `coyote ${s.coyote}  buf ${s.jumpBuf}  overflow:${s.overflow ? 1 : 0}`,
      `slope ${fmt1(s.angleDeg)}deg   x ${Math.round(s.x)} y ${Math.round(s.y)}`,
      `son zipla: ${lastAirFrames}f / ${fmt1(lastPeakPx)}px (hedef 33f/56px)`
    ];

    const w = 232, h = PAD * 2 + rows.length * LINE_H;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "#000000";
    ctx.fillRect(PAD, PAD, w, h);
    ctx.globalAlpha = 1;
    ctx.restore();

    for (let i = 0; i < rows.length; i++) {
      font.draw(ctx, rows[i], PAD + 3, PAD + 2 + i * LINE_H, SLOT_LIGHT, 1);
    }
  }

  return {
    get visible() { return visible; },
    toggle,
    sample,
    draw
  };
}

export default createDebugHud;
