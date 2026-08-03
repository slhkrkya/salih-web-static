/* ==========================================================================
 * game/screens.js — TITLE/PAUSE/MAP/END/RESET EKRAN ICERIGI (Faz 2+6 kapsami)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-metinleri.md §15.3 (M1-M12), docs/oyun-v0-kapsam.md
 * §9 (MAP/END/RESET/ROTATE; ROTATE zaten launcher.js'te var), §6.7 (12 pip,
 * 3 dolu/9 kilitli gercek teknoloji adiyla). Bu modul yalniz bu ekranlarin
 * IC TAMPONA cizilen icerigini tutar — launcher.js'in DOM chrome'u
 * (DURAKLAT/SES/ÇIKIŞ, a11y §7.6'nin "3 gerçek buton" sözleşmesi) AYRI ve
 * degismez; MAP/RESET buraya klavye ile (PAUSE'dan M, TITLE'dan R) girilir,
 * yeni DOM butonu EKLENMEZ.
 *
 * "3 tarih çubuğu" (§10.3 modul tablosu) YERINE 4 SATIRLIK BÖLÜM SEÇ listesi:
 * ayni ULASILDI/ULASILMADI bilgisini tasir (artik W0 prologu da dahil) ama
 * satirin kendisi SECILEBILIR — §9'un END tablosundaki "Bölüm seç" maddesinin
 * v0'da hic uygulanmamis olan karsiligi buraya, HARITA ekranina yerlesti
 * (yeni DOM butonu YOK; satirlar ic tampona cizilir, tiklama/dokunma
 * launcher'in canvas pointer'indan input.js uzerinden gelir).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { drawTitle, drawPause, drawMap, drawStageConfirm,
 *            drawEnd, drawReset, drawControls,
 *            stageRowRect, confirmRects, hitRect, STAGE_COUNT } from "./screens.js";
 *
 *   drawTitle(ctx, font, i18n, { hasSave })
 *   drawPause(ctx, font, i18n, { rate, world, checkpoint, balanced })
 *   drawMap(ctx, font, i18n, { pips, stages, stageIndex })
 *   drawStageConfirm(ctx, font, i18n, { name })
 *   drawEnd(ctx, font, i18n, { rate })
 *   drawReset(ctx, font, i18n, {})
 *
 *   stageRowRect(i)  -> {x,y,w,h}  BÖLÜM SEÇ satirinin ic-tampon dikdortgeni
 *   confirmRects()   -> {panel, approve, cancel}
 *     Geometri TEK yerde: boot.js hem cizim hem de isaret/dokunma hit-test'i
 *     icin AYNI fonksiyonlari cagirir (koordinat kaymasi imkansiz).
 * ========================================================================== */

import { VIEW_W, VIEW_H } from "./scale.js";

const SLOT_INK = 0, SLOT_LIGHT = 11, SLOT_ACCENT = 5, SLOT_INK_SOFT = 4, SLOT_LED = 7;

/* ---------------------------------------------------------------- geometri */
export const STAGE_COUNT = 4;
const STAGE_ROW_W = 300, STAGE_ROW_H = 13, STAGE_ROW_TOP = 46, STAGE_ROW_STEP = 15;

export function stageRowRect(i) {
  return {
    x: Math.round(VIEW_W / 2 - STAGE_ROW_W / 2),
    y: STAGE_ROW_TOP + i * STAGE_ROW_STEP,
    w: STAGE_ROW_W,
    h: STAGE_ROW_H
  };
}

const CONFIRM_W = 300, CONFIRM_H = 92;

export function confirmRects() {
  const x = Math.round(VIEW_W / 2 - CONFIRM_W / 2);
  const y = Math.round(VIEW_H / 2 - CONFIRM_H / 2);
  const bw = 110, bh = 20, by = y + CONFIRM_H - 30;
  return {
    panel: { x, y, w: CONFIRM_W, h: CONFIRM_H },
    approve: { x: x + 20, y: by, w: bw, h: bh },
    cancel: { x: x + CONFIRM_W - 20 - bw, y: by, w: bw, h: bh }
  };
}

export function hitRect(r, px, py) {
  return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
}

/* Tus efsanesi — TITLE, DURAKLAT ve W0 giris ipucu AYNI listeden beslenir
 * (i18n.data.controls). `count` verilirse yalniz ilk n satir cizilir. */
export function drawControls(ctx, font, i18n, x, y, count, centered, headerSlot) {
  const lines = i18n.data.controls || [];
  const n = count === undefined || count === null ? lines.length : Math.min(count, lines.length);
  let ty = y;
  if (headerSlot !== null) {
    if (centered) font.drawCentered(ctx, i18n.lex("controls"), x, ty, headerSlot === undefined ? SLOT_LED : headerSlot, 1);
    else font.draw(ctx, i18n.lex("controls"), x, ty, headerSlot === undefined ? SLOT_LED : headerSlot, 1);
    ty += 12;
  }
  for (let i = 0; i < n; i++) {
    if (centered) font.drawCentered(ctx, lines[i], x, ty, SLOT_INK_SOFT, 1);
    else font.draw(ctx, lines[i], x, ty, SLOT_INK_SOFT, 1);
    ty += 11;
  }
  return ty;
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 0.55 : alpha;
  ctx.fillStyle = "#0b0f1f";
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#1d2b53";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

export function drawTitle(ctx, font, i18n, opts) {
  const o = opts || {};
  ctx.fillStyle = "#0b0f1f";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const cx = VIEW_W / 2;
  font.drawCentered(ctx, "YOKSAY / OVERRIDE", cx, 60, SLOT_ACCENT, 2);
  font.drawCentered(ctx, i18n.t("menu.m1"), cx, 90, SLOT_LIGHT, 1);
  font.drawCentered(ctx, i18n.t("menu.m2"), cx, 106, SLOT_LIGHT, 1);

  if (o.hasSave) font.drawCentered(ctx, i18n.t("menu.m3"), cx, 140, SLOT_INK_SOFT, 1);
  font.drawCentered(ctx, i18n.t("menu.m4"), cx, 156, SLOT_INK_SOFT, 1);

  /* A2 (§7.6/§15.14): azaltilmis-hareket notu, YALNIZ prefers-reduced-motion
   * eslesirse, TITLE'da SABIT (yanip sonmeyen) tek satir. */
  if (o.reduceMotion) font.drawCentered(ctx, i18n.t("a11y.a2"), cx, 172, SLOT_INK_SOFT, 1);

  /* bulunan gercek eksik: hicbir ekran hangi tusun ne yaptigini SOYLEMIYORDU
   * (kitabin TITLE tablosu "Yön tuşlarıyla gezinir, A onaylar" der ama kod
   * yalniz yanip sonen tek satiri ciziyordu). Ilk uc satir — yuru / zipla /
   * fiil — baslikta sabit durur; TAMAMI DURAKLAT ekranindadir. */
  drawControls(ctx, font, i18n, cx, 186, 3, true, SLOT_LED);

  const blink = (Math.floor(Date.now() / 500) % 2 === 0);
  if (blink) font.drawCentered(ctx, i18n.lex("jump") + " / " + i18n.lex("approve"), cx, VIEW_H - 26, SLOT_LIGHT, 1);
}

export function drawPause(ctx, font, i18n, opts) {
  const o = opts || {};
  /* Panel yuksekligi artik TUS EFSANESINI de tasiyor (bkz. drawControls) —
   * §7.6'nin "3 gerçek buton" sozlesmesi bozulmaz, yeni DOM elemani yok. */
  const w = VIEW_W - 40, h = 196;
  const x = 20, y = Math.round((VIEW_H - h) / 2);
  panel(ctx, x, y, w, h, 0.8);

  const cx = VIEW_W / 2;
  let ty = y + 8;
  font.drawCentered(ctx, i18n.lex("pause"), cx, ty, SLOT_ACCENT, 1); ty += 14;
  font.drawCentered(ctx, i18n.t("menu.m6"), cx, ty, SLOT_LIGHT, 1); ty += 11;
  if (o.balanced) { font.drawCentered(ctx, i18n.t("menu.m7"), cx, ty, SLOT_INK_SOFT, 1); ty += 11; }

  ty += 4;
  const pct = (o.rate || 0) / 100;
  font.drawCentered(ctx, i18n.lex("rate") + " " + pct.toFixed(0) + "%", cx, ty, SLOT_LIGHT, 1); ty += 11;
  font.drawCentered(ctx, i18n.lex("phase") + " " + (o.world || "-"), cx, ty, SLOT_LIGHT, 1); ty += 11;
  if (o.touchMode) {
    font.drawCentered(ctx, i18n.lex("touch") + ": " + i18n.lex(o.touchMode) + " (T)", cx, ty, SLOT_INK_SOFT, 1); ty += 11;
  }
  font.drawCentered(ctx, i18n.lex("map") + " + " + i18n.lex("pickStage") + " (M)", cx, ty, SLOT_LED, 1); ty += 14;

  drawControls(ctx, font, i18n, cx, ty, null, true, SLOT_ACCENT);
}

/* BÖLÜM SEÇ satiri. Eski "3 tarih çubuğu" ULASILDI/ULASILMADI bilgisini
 * tasiyordu ama TIKLANAMIYORDU; ayni bilgi artik 4 SATIRLIK bir listede
 * (W0 dahil) durur ve satirin kendisi secim hedefidir — kitabin §9 "END:
 * Bölüm seç" maddesinin v0'da hic uygulanmamis olan karsiligi. */
function stageRow(ctx, font, i18n, i, st, selected) {
  const r = stageRowRect(i);
  if (selected) {
    ctx.fillStyle = "#283163";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    font.draw(ctx, "→", r.x - 12, r.y + 2, SLOT_ACCENT, 1);
  }
  ctx.strokeStyle = st.unlocked ? "#38e27c" : "#3a3f5c";
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  if (st.current) {
    ctx.fillStyle = "#38e27c";
    ctx.fillRect(r.x + 5, r.y + 5, 4, 4);
  }
  font.draw(ctx, st.name, r.x + 14, r.y + 2, st.unlocked ? SLOT_LIGHT : SLOT_INK_SOFT, 1);
  if (!st.unlocked) {
    const tag = i18n.lex("locked");
    font.draw(ctx, tag, r.x + r.w - 6 - font.measure(tag, 1), r.y + 2, SLOT_INK_SOFT, 1);
  }
}

export function drawMap(ctx, font, i18n, opts) {
  const o = opts || {};
  ctx.fillStyle = "#0b0f1f";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2;

  font.drawCentered(ctx, i18n.lex("map"), cx, 4, SLOT_ACCENT, 1);
  font.drawCentered(ctx, i18n.t("menu.m8"), cx, 16, SLOT_INK_SOFT, 1);
  font.drawCentered(ctx, i18n.lex("pickStage"), cx, 32, SLOT_LED, 1);

  const stages = o.stages || [];
  for (let i = 0; i < stages.length && i < STAGE_COUNT; i++) {
    stageRow(ctx, font, i18n, i, stages[i], o.stageIndex === i);
  }

  const pipsMask = o.pips || 0;
  const cols = 4, rows = 3, cellW = 100, cellH = 34, gridW = cols * cellW;
  const gx0 = cx - gridW / 2, gy0 = 116;
  for (let i = 0; i < 12; i++) {
    const col = i % cols, row = (i / cols) | 0;
    const x = gx0 + col * cellW, y = gy0 + row * cellH;
    const entry = i18n.data.pips[i];
    const unlocked = !!(pipsMask & (1 << i));
    ctx.strokeStyle = unlocked ? "#38e27c" : "#3a3f5c";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, cellW - 8, cellH - 10);
    const label = unlocked ? entry.name : entry.locked;
    font.drawCentered(ctx, label, x + (cellW - 8) / 2 + 2, y + cellH / 2 - 7, unlocked ? SLOT_LIGHT : SLOT_INK_SOFT, 1);
  }
  font.drawCentered(ctx, i18n.t("menu.m9"), cx, gy0 + rows * cellH + 4, SLOT_INK_SOFT, 1);
  font.drawCentered(ctx, i18n.lex("mapKeys"), cx, VIEW_H - 18, SLOT_INK_SOFT, 1);
}

/* Satir tiklandiginda ustune binen ONAY kutusu (§9 RESET ile ayni gramer:
 * FIIL onaylar, ZIPLA iptal eder). Iki dikdortgen GERCEK tiklama hedefidir —
 * geometri confirmRects()'ten gelir, boot.js hit-test'i ayni fonksiyonu okur. */
export function drawStageConfirm(ctx, font, i18n, opts) {
  const o = opts || {};
  const R = confirmRects();
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = "#0b0f1f";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();

  panel(ctx, R.panel.x, R.panel.y, R.panel.w, R.panel.h, 0.95);
  const cx = VIEW_W / 2;
  font.drawCentered(ctx, i18n.lex("pickStage"), cx, R.panel.y + 8, SLOT_ACCENT, 1);
  font.drawCentered(ctx, o.name || "", cx, R.panel.y + 22, SLOT_LIGHT, 1);
  font.drawCentered(ctx, i18n.lex("stageJumpNote"), cx, R.panel.y + 34, SLOT_INK_SOFT, 1);
  font.drawCentered(ctx, i18n.lex("confirmKeys"), cx, R.panel.y + 46, SLOT_INK_SOFT, 1);

  const button = (rect, label, slot) => {
    ctx.fillStyle = "#283163";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = slot === SLOT_LED ? "#38e27c" : "#5f574f";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    font.drawCentered(ctx, label, rect.x + rect.w / 2, rect.y + 5, slot, 1);
  };
  button(R.approve, i18n.lex("approve"), SLOT_LED);
  button(R.cancel, i18n.lex("cancel"), SLOT_INK_SOFT);
}

export function drawEnd(ctx, font, i18n, opts) {
  const o = opts || {};
  ctx.fillStyle = "#0b0f1f";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2;

  font.drawCentered(ctx, i18n.lex("merge").toUpperCase(), cx, 70, SLOT_ACCENT, 2);
  font.drawCentered(ctx, i18n.data.final[3], cx, 106, SLOT_LIGHT, 1);
  font.drawCentered(ctx, i18n.t("menu.m12"), cx, 126, SLOT_INK_SOFT, 1);
  const pct = (o.rate || 0) / 100;
  font.drawCentered(ctx, i18n.lex("rate") + " " + pct.toFixed(2) + "%", cx, 150, SLOT_LIGHT, 1);

  /* bulunan gercek eksik: burada yanip sonen "BAŞTAN" satirinin ARDINDA
   * hicbir girdi dali yoktu — END ekrani sifir cikisli bir cikmazdi. Kitabin
   * §9 END tablosu "Bölüm seç"i zaten burada istiyor; satir artik GERCEKTEN
   * calisan tek yolu gosterir (M -> BÖLÜM SEÇ, oradan W0 dahil her bolum). */
  const blink = (Math.floor(Date.now() / 500) % 2 === 0);
  if (blink) font.drawCentered(ctx, i18n.lex("pickStage") + " (M)", cx, VIEW_H - 30, SLOT_LED, 1);
}

export function drawReset(ctx, font, i18n) {
  ctx.save();
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = "#0b0f1f";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  const cx = VIEW_W / 2;
  font.drawCentered(ctx, i18n.t("menu.m10"), cx, VIEW_H / 2 - 16, SLOT_LED, 1);
  font.drawCentered(ctx, i18n.lex("approve"), cx, VIEW_H / 2 + 6, SLOT_LIGHT, 1);
  font.drawCentered(ctx, i18n.lex("jump") + " = " + i18n.lex("exit"), cx, VIEW_H / 2 + 20, SLOT_INK_SOFT, 1);
}

export default {
  drawTitle, drawPause, drawMap, drawStageConfirm, drawEnd, drawReset,
  drawControls, stageRowRect, confirmRects, hitRect, STAGE_COUNT
};
