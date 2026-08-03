/* ==========================================================================
 * game/scenes.js — SAHNE/DURUM YIGINI + DIYALOG BALONU ALTYAPISI
 * ==========================================================================
 *
 * Kaynak: docs/oyun-metinleri.md §15.1 Karar 3 (CUTSCENE vs CARD), §15.7
 * (WHO kumesi, balon slotu 44 karakter). Bu modul HANGI ekranin aktif
 * oldugunu (PLAY/TITLE/PAUSE) ve diyalog balonu OYNATMA mekanigini yonetir;
 * ekran ICERIGI screens.js'te, gercek SC-00/SC-01/SC-06 sekans VERISI
 * Faz 3'un cutscene.js'inde yasar. v0 Faz 2'de bu altyapi test odasinda F2
 * ile manuel tetiklenerek dogrulanir (gercek dunya tetikleyicisi yok).
 *
 * Atlama: aksiyon tuşu 0,4 s basılı tutulunca (kitaptan aynen).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createSceneManager, SCENE } from "./scenes.js";
 *
 *   const sm = createSceneManager();
 *   sm.current               -> SCENE.PLAY | SCENE.TITLE | SCENE.PAUSE
 *   sm.goto(SCENE.PAUSE)     -> onceki sahneyi yigina iter (PAUSE gameplay'in USTUNE biner)
 *   sm.back()                -> yigindan bir onceki sahneye doner
 *
 *   sm.playDialogue(beats, onDone)  -> beats: [{who,line}], sirayla balon gosterir
 *   sm.isDialogueActive()
 *   sm.clearDialogue()              -> yarim balonu DUSURUR (onDone cagrilmaz)
 *   sm.update(dt, ctrl)             -> hold-skip'i ve sonraki balona gecisi isler
 *   sm.draw(ctx, font, i18n)        -> aktif balonu cizer (VIEW_W ic tampon uzayinda)
 * ========================================================================== */

import { VIEW_W, VIEW_H } from "./scale.js";
import { SLOT } from "./render.js";

export const SCENE = Object.freeze({ PLAY: 0, TITLE: 1, PAUSE: 2, MAP: 3, END: 4, RESET: 5 });

const SKIP_HOLD_FRAMES = 24;          /* 0,4 s @ 60fps */
const AUTO_ADVANCE_FRAMES = 156;      /* ~2,6 s/balon (§6.3 SC-01 3 balon / 8s) */

const WHO_COLOR_SLOT = { S: 6, Y: 5, R: 14, N: 7 };

export function createSceneManager() {
  /* Oyun HER ZAMAN TITLE'da baslar — boot.js'in update() dalinin
   * SCENE.TITLE'i gormesi icin varsayilan bu OLMAK ZORUNDA (Faz 2
   * entegrasyonunda bu satir [SCENE.PLAY] idi ve TITLE hic tetiklenmiyordu). */
  const stack = [SCENE.TITLE];

  let dialogueBeats = null;
  let dialogueIndex = 0;
  let dialogueTimer = 0;
  let dialogueOnDone = null;
  let holdFrames = 0;

  function goto(scene) { stack.push(scene); }
  function back() { if (stack.length > 1) stack.pop(); }
  function replace(scene) { stack[stack.length - 1] = scene; }

  function playDialogue(beats, onDone) {
    dialogueBeats = beats;
    dialogueIndex = 0;
    dialogueTimer = 0;
    dialogueOnDone = onDone || null;
    holdFrames = 0;
  }

  function isDialogueActive() { return !!dialogueBeats; }

  /* Sahne/dunya DEGISIRKEN yarim kalmis balonu dusurur (onDone CAGRILMAZ —
   * anlati o dunyayla birlikte terk edildi). BÖLÜM SEÇ ile isinlanirken
   * gerekli: aksi halde yeni bolum, eski bolumun balonu otomatik ilerleyene
   * kadar (~2,6 s/balon) dondurulmus baslardi. */
  function clearDialogue() {
    dialogueBeats = null; dialogueIndex = 0; dialogueTimer = 0;
    dialogueOnDone = null; holdFrames = 0;
  }

  function advanceDialogue() {
    dialogueIndex++;
    dialogueTimer = 0;
    holdFrames = 0;
    if (dialogueIndex >= dialogueBeats.length) {
      const cb = dialogueOnDone;
      dialogueBeats = null; dialogueIndex = 0; dialogueOnDone = null;
      if (cb) cb();
    }
  }

  function update(dt, ctrl) {
    if (!dialogueBeats) return;
    dialogueTimer++;
    if (ctrl && ctrl.verbDown) {
      holdFrames++;
      if (holdFrames >= SKIP_HOLD_FRAMES) { advanceDialogue(); return; }
    } else {
      holdFrames = 0;
    }
    if (dialogueTimer >= AUTO_ADVANCE_FRAMES) advanceDialogue();
  }

  /* Konusmaci SEKLI: tek harf koduna (S/Y/R/N) ek bir ayirt edici — oyuncu
   * harfi ezberlemeden "kim konusuyor"yu bir bakista tanir (bkz. plan Faz 6,
   * metin/ses DEGISMEDI, yalniz bu kucuk glif eklendi). */
  function drawWhoShape(ctx, who, cx, cy, color) {
    ctx.save();
    ctx.fillStyle = color;
    if (who === "S") {
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
    } else if (who === "Y") {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 4, cy);
      ctx.closePath();
      ctx.fill();
    } else if (who === "R") {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, font, i18n, palette) {
    if (!dialogueBeats || !font) return;
    const beat = dialogueBeats[dialogueIndex];
    if (!beat) return;
    const w = VIEW_W - 24, h = 40;
    const x = 12, y = VIEW_H - h - 12;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette ? palette.css[SLOT.SURFACE] : "#0b0f1f";
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette ? palette.css[SLOT.INK] : "#1d2b53";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
    const slot = WHO_COLOR_SLOT[beat.who] !== undefined ? WHO_COLOR_SLOT[beat.who] : 11;
    drawWhoShape(ctx, beat.who, x + 9, y + 9, palette ? palette.css[slot] : "#ffffff");
    /* font.js'in kare seti "[" "]" tasimiyor (CHAR 10x16 dondurulmus set,
     * bkz. font.js basi) — "?" olarak duserdi. Parantez zaten desteklenen
     * bir glif (bkz. testroom.js'in "(((((" rampalari), riske deger degil. */
    font.draw(ctx, "(" + beat.who + ") " + beat.line, x + 18, y + 4, slot, 1);

    /* menu.m5 zaten butcelenmis ("Atlamak icin basili tut.") ama hicbir yerde
     * cizilmiyordu — balon aninda oyuncu neye basacagini bilmiyordu. */
    if (i18n) font.draw(ctx, i18n.t("menu.m5"), x + 4, y + 18, SLOT.INK_SOFT, 1);

    if (holdFrames > 0) {
      const pct = Math.min(1, holdFrames / SKIP_HOLD_FRAMES);
      ctx.fillStyle = "#58c4ff";
      ctx.fillRect(x, y + h - 3, Math.round(w * pct), 3);
    }
  }

  return {
    get current() { return stack[stack.length - 1]; },
    goto, back, replace,
    playDialogue, isDialogueActive, clearDialogue, update, draw
  };
}

export default createSceneManager;
