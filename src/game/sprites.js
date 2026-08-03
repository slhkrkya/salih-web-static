/* ==========================================================================
 * game/sprites.js — SALIH: PIX verisi, atlas pisirme, poz secimi, egim donusu
 * ==========================================================================
 *
 * §9 "Prosedurel veya kesilmis" direktifi: elle 200 sprite cizilmez. Faz 1'de
 * TEK varlik gerekiyor (Salih), o yuzden sema PIX: palet-indeksli satir
 * string'i. Kosu iskeleti 4 kare; geri kalan pozlar ayni govdenin bacak/kol
 * katmani degistirilerek turetilir — 8 poz, 8 x 10 x 16 = 1.280 piksel veri.
 *
 * PIX ALFABESI (font.js ile ayni): "." = seffaf, "0".."f" = 16 slotluk palet
 * indeksi (render.js SLOT tablosu). Satir uzunlugu TAM CHAR_W.
 *
 * OLCU SOZLESMESI (§4.1): sprite CHAR_W x CHAR_H = 10 x 16.
 * Hitbox HIT_W x HIT_H = 8 x 14, sprite icinde 1 px yan / 2 px ust bosluk.
 * Yani cizim noktasi:  sx = body.x - OFF_X,  sy = body.y - OFF_Y.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *
 *   import { createSalih, POSE, OFF_X, OFF_Y } from "./sprites.js";
 *
 *   const salih = createSalih(palette);        // render.js paleti
 *   salih.setPalette(palette)                  // tema degisimi -> atlas yeniden pisirilir
 *   salih.poseFor(body)          -> POSE.*     // fizik durumundan poz secer (allocation YOK)
 *   salih.draw(ctx, body, camX, camY, tick)    // yuvarlama + facing + egim donusu burada
 *   salih.drawPose(ctx, pose, x, y, facing, angle)   // dogrudan poz (menu/HUD icin)
 *   salih.atlas                  -> HTMLCanvasElement (dev/debug)
 *   salih.destroy()
 *
 * DONUS (§4.5): body.spriteAngle physics tarafindan 11,25 derecelik 8 kademeye
 * YUVARLANMIS gelir ve rotateThreshold (3.20 px/f) altinda 0'dir. Bu modul
 * aciyi yeniden yuvarlamaz — oldugu gibi uygular. Aci 0 iken transform hic
 * kurulmaz (hizli yol).
 * ========================================================================== */

import { CHAR_W, CHAR_H, HIT_W, HIT_H } from "./scale.js";
import { compilePix, bakeAtlas } from "./pixart.js";

export const OFF_X = ((CHAR_W - HIT_W) / 2) | 0;   /* 1 */
export const OFF_Y = (CHAR_H - HIT_H) | 0;         /* 2 */

export const POSE = Object.freeze({
  IDLE: 0,
  RUN0: 1,
  RUN1: 2,
  RUN2: 3,
  RUN3: 4,
  JUMP: 5,
  FALL: 6,
  SKID: 7,
  SQUASH: 8
});
export const POSE_COUNT = 9;

/* Slot kisaltmalari (render.js SLOT ile birebir):
 *   0 INK  5 ACCENT (kapusonlu ust)  8 SKIN  9 HAIR/pantolon  b LIGHT (goz akı)
 * Kontur ayri bir slot yerine INK ile ciziliyor — 10x16'da 1 px kontur govdeyi yer. */
const P = {};

P[POSE.IDLE] = [
  "..........",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "...8888...",
  "..555555..",
  ".55555555.",
  ".58555585.",
  ".55555555.",
  "..555555..",
  "..99..99..",
  "..99..99..",
  "..99..99..",
  ".011..110."
];

/* Kosu: 4 kare. Govde sabit, bacak ve kol fazi degisiyor; 2. ve 4. kare
 * "gecis" (bacaklar bir arada), 1. ve 3. kare tam acilma. */
P[POSE.RUN0] = [
  "..........",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "...8888...",
  "..555555..",
  "855555558.",
  ".55555555.",
  ".55555555.",
  "..555555..",
  ".999..999.",
  ".99....99.",
  ".99....99.",
  "011....110"
];
P[POSE.RUN1] = [
  "..........",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "...8888...",
  "..555555..",
  ".55555555.",
  ".85555558.",
  ".55555555.",
  "..555555..",
  "..999999..",
  "..99..99..",
  "..99..99..",
  ".011..110."
];
P[POSE.RUN2] = [
  "..........",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "...8888...",
  "..555555..",
  ".55555558.",
  ".55555555.",
  ".85555555.",
  "..555555..",
  "..999.999.",
  "..99...99.",
  ".99....99.",
  "011....110"
];
P[POSE.RUN3] = [
  "..........",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "...8888...",
  "..555555..",
  ".55555555.",
  ".85555558.",
  ".55555555.",
  "..555555..",
  "..999999..",
  "..99..99..",
  "..99..99..",
  ".011..110."
];

/* Ziplama: kollar yukarida, bacaklar toplu. */
P[POSE.JUMP] = [
  "...8..8...",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "..888888..",
  "..555555..",
  ".55555555.",
  ".55555555.",
  "..555555..",
  "..555555..",
  "..999999..",
  "..999999..",
  "...9999...",
  "..011110.."
];

/* Dusme: bacaklar acik, kollar yana. */
P[POSE.FALL] = [
  "..........",
  "...9999...",
  "..999999..",
  "..988889..",
  "..981189..",
  "..988889..",
  "...8888...",
  "8.555555.8",
  "855555558.",
  ".55555555.",
  ".55555555.",
  "..555555..",
  ".999..999.",
  ".99....99.",
  "011....110",
  ".........."
];

/* Fren: govde geriye yatik, on ayak ileri. */
P[POSE.SKID] = [
  "..........",
  "....9999..",
  "...999999.",
  "...988889.",
  "...981189.",
  "...988889.",
  "....8888..",
  "..555555..",
  ".855555555",
  ".555555558",
  ".55555555.",
  "..555555..",
  "..99..999.",
  ".99....99.",
  "099....11.",
  "11........"
];

/* Inis ezilmesi (landSquashFrames = 4, YALNIZCA gorsel — §4.3):
 * govde 2 px kisalir, omuzlar genisler. */
P[POSE.SQUASH] = [
  "..........",
  "..........",
  "..........",
  "...9999...",
  "..999999..",
  "..981189..",
  "..988889..",
  "...8888...",
  ".55555555.",
  "8555555558",
  ".55555555.",
  ".55555555.",
  ".99....99.",
  ".99....99.",
  "099....990",
  "011....110"
];

/* PIX satirlarini Uint8Array maskesine cevirir (0 = seffaf, 1..16 = slot+1).
 * Modul yuklenirken BIR KEZ; update dongusunde asla. Teknik pixart.js'te
 * (paylasilan) — bkz. o dosyanin basligi. */
const MASK = compilePix(P, POSE_COUNT, CHAR_W, CHAR_H);

/* Kosu animasyon hizi: tepe hizda ~8 kare/dongu, yavas kosuda ~16.
 * Kare secimi mesafeye baglanir (hiza degil) — ayak kaymasi olmaz. */
const RUN_CYCLE = [POSE.RUN0, POSE.RUN1, POSE.RUN2, POSE.RUN3];
const RUN_PX_PER_FRAME = 7;   /* her 7 px yol -> bir animasyon karesi */

export function createSalih(palette) {
  let pal = palette;
  let atlas = null;
  let dead = false;
  let runPhase = 0;    /* birikmis yol (px) */

  function bake() {
    return bakeAtlas(MASK, POSE_COUNT, CHAR_W, CHAR_H, pal);
  }

  atlas = bake();

  function setPalette(next) {
    if (!next || dead) return;
    pal = next;
    if (atlas) { atlas.width = 0; atlas.height = 0; }
    atlas = bake();
  }

  /* Fizik durumundan poz. Allocation yok, dallanma sirasi onem sirasidir. */
  function poseFor(body) {
    if (body.landSquash > 0) return POSE.SQUASH;
    if (!body.grounded) return body.vy < 0 ? POSE.JUMP : POSE.FALL;
    if (body.skid) return POSE.SKID;
    const speed = body.vx < 0 ? -body.vx : body.vx;
    if (speed < 0.12) return POSE.IDLE;
    const idx = ((runPhase / RUN_PX_PER_FRAME) | 0) & 3;
    return RUN_CYCLE[idx];
  }

  /* Animasyon fazi: kat edilen YOL ile ilerler (hizla degil). */
  function advance(body) {
    if (!body.grounded) return;
    const d = body.vx < 0 ? -body.vx : body.vx;
    runPhase += d;
    if (runPhase > 1e6) runPhase = runPhase % (RUN_PX_PER_FRAME * 4);
  }

  function drawPose(ctx, pose, x, y, facing, angle) {
    if (dead || !atlas) return;
    const sx = (pose | 0) * CHAR_W;
    const flip = facing < 0;
    const rot = angle || 0;

    if (!flip && rot === 0) {
      ctx.drawImage(atlas, sx, 0, CHAR_W, CHAR_H, x, y, CHAR_W, CHAR_H);
      return;
    }

    /* Donus/aynalama: pivot ayak ortasi (piksel-net kalmasi icin tam sayi). */
    const px = x + (CHAR_W >> 1);
    const py = y + CHAR_H;
    ctx.save();
    ctx.translate(px, py);
    if (rot !== 0) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(atlas, sx, 0, CHAR_W, CHAR_H, -(CHAR_W >> 1), -CHAR_H, CHAR_W, CHAR_H);
    ctx.restore();
  }

  function draw(ctx, body, camX, camY) {
    advance(body);
    const pose = poseFor(body);
    const x = Math.round(body.x - OFF_X - camX);
    const y = Math.round(body.y - OFF_Y - camY);
    drawPose(ctx, pose, x, y, body.facing, body.spriteAngle);
  }

  function destroy() {
    dead = true;
    if (atlas) { atlas.width = 0; atlas.height = 0; atlas = null; }
  }

  return {
    get atlas() { return atlas; },
    setPalette, poseFor, draw, drawPose, destroy
  };
}

export default createSalih;
