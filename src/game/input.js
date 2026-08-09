/* ==========================================================================
 * game/input.js — KLAVYE + DOKUNMATIK, edge/level ayrimi, kaynak izleyicisi
 * ==========================================================================
 *
 * §4.10 karari: coyote/jumpBuffer bonusu CIHAZA degil AKTIF GIRDI KAYNAGINA
 * baglanir. Dokunmatikle oynayan 8/10, klavyeyle oynayan 6/8 alir; ayni
 * oturumda iki kaynak birlikte kullanilabilir ve son dokunulan kazanir.
 * Bu yuzden ctrl.coyoteFrames / ctrl.jumpBufferFrames YAZILIR — physics.step
 * bu alanlar >0 ise cfg'yi ezer (bkz. physics.js arayuz sozlesmesi).
 *
 * EDGE vs LEVEL:
 *   jumpDown    : level  — basili tutuldugu surece true (degisken ziplama)
 *   jumpPressed : edge   — YALNIZCA basildigi sabit adimda true
 * Sabit adimli donguda bir rAF karesinde 0..3 update olabilir. Edge'in iki
 * kez okunmamasi icin boot her step()'ten SONRA consumeEdges() cagirir.
 * Bir karede hic update olmazsa edge KAYBOLMAZ; bir sonraki update'e tasinir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *
 *   import { createInput, SRC } from "./input.js";
 *
 *   const input = createInput({ keyTarget, touchTarget, onPause, onDebug,
 *                                onDialogueTest, onMap, onReset });
 *     keyTarget   : keydown/keyup dinlenecek eleman (default window)
 *     touchTarget : dokunmatik yuzey (default yok -> dokunmatik kapali)
 *     onPause()   : P / duraklat butonu
 *     onDebug()   : F1 (fizik HUD)
 *     onDialogueTest() : F2 (Faz 2 manuel diyalog QA'i, bkz. scenes.js)
 *     onMap()     : M (Faz 6 — PAUSE'dan HARİTA ekrani; yeni DOM butonu YOK,
 *                   §7.6'nin "3 gerçek buton" sözleşmesi bozulmaz)
 *     onReset()   : R (Faz 6 — TITLE'dan RESET onayi, sadece kayit varken anlamli)
 *     onBoard()   : L (SÜRE MODU + SKOR TABLOSU ekrani)
 *     onTouchCycle() : T (Faz 6 — PAUSE'dan touch.js'in auto/on/off dönüşümü)
 *     onPointerTap(bx, by) -> bool : HER pointerdown'da (FARE DAHIL) ic-tampon
 *                   (480x272) koordinatiyla cagrilir. `true` donerse olay
 *                   TUKETILMIS sayilir: oynanis dokunmatik bolgeleri
 *                   ISLEMEZ ve girdi kaynagi TOUCH'a cevrilmez. Menu/HARITA
 *                   ekranlarinin tiklanabilir satirlari icin (bkz. boot.js).
 *   ESC dinlenmez: cikis LAUNCHER'in isi (odak tuzagi ve overlay sahibi o).
 *
 *   input.ctrl            -> physics.step'e verilen anlik goruntu (ayni nesne)
 *   input.consumeEdges()  -> her step()'ten SONRA
 *   input.source          -> SRC.KEY | SRC.TOUCH
 *   input.touchActive     -> aktif girdi kaynagi su an dokunmatik mi (gercek
 *                             bir dokunma/pointer olayi sonrasi true olur;
 *                             touchTarget'in var olmasi TEK BASINA yetmez —
 *                             aksi halde masaustunde de A/B ipucu kutulari
 *                             sabit gorunurdu, bkz. buttonRects/drawTouchHints)
 *                             — setTouchOverride("on"/"off") bunu ZORLAR.
 *   input.setTouchOverride(mode) -> "auto"|"on"|"off" (touch.js sahiplenir,
 *                             save.settings.touch ile kalici tutulur)
 *   input.reset()         -> tum tuslar birakilmis kabul edilir (blur/pause)
 *   input.setTextMode(on) -> isim yazarken oynanis tuslarini TAMAMEN dondurur
 *                             (tuslar boot.js'in gizli DOM input'una gider)
 *   input.destroy()
 *   input.buttonRects()    -> {jump,verb,ground} {x,y,w,h} BUFFER-SPACE (480x272),
 *                             hit-test ile AYNI kaynaktan — boot.js dokunmatik
 *                             ipucu dikdortgenlerini BUNDAN cizer (drift olmaz).
 * ========================================================================== */

import { createCtrl } from "./physics.js";
import { VIEW_W, VIEW_H } from "./scale.js";

export const SRC = Object.freeze({ KEY: 0, TOUCH: 1 });

/* §4.3 — kaynaga bagli pencereler. */
const WIN_KEY = { coyote: 6, buffer: 8 };
const WIN_TOUCH = { coyote: 8, buffer: 10 };

/* Dokunmatik buton yerlesimi (§4.9): A = ZIPLA sagda, B = FIIL sag ustte,
 * yon SOL yarida. Butun olculer CSS px ve min 44. */
const TOUCH_BTN = 64;
const TOUCH_PAD = 10;

export function createInput(opts) {
  const o = opts || {};
  const keyTarget = o.keyTarget || window;
  const touchTarget = o.touchTarget || null;

  const ctrl = createCtrl();
  let source = SRC.KEY;
  let dead = false;
  /* Faz 6 (touch.js): save.settings.touch'un ZORLAMASI. "auto" gercek
   * kaynaga (source) gore karar verir (mevcut davranis); "on"/"off" gercek
   * dokunma/kaynak algisini GORMEZDEN gelir. */
  let touchOverride = "auto";
  /* SÜRE MODU isim girisi acikken true — bkz. onKeyDown. */
  let textMode = false;

  /* Ham durum: yon tuslari ayri tutulur ki ikisi birden basiliyken
   * "son basilan kazanir" davranisi verilebilsin (Mario grameri). */
  const key = { left: false, right: false, jump: false, verb: false, ground: false, shield: false };
  let lastDir = 0;

  /* Edge latch'leri. consumeEdges() bunlari SIFIRLAR. */
  let jumpEdge = false;
  let verbEdge = false;
  let groundEdge = false;
  let shieldEdge = false;

  /* Dokunmatik: aktif pointer id'leri ve sanal tus durumlari. */
  const touch = { left: false, right: false, jump: false, verb: false, ground: false };
  const pointers = new Map();
  let touchRect = null;

  function effectiveTouch() {
    if (touchOverride === "on") return true;
    if (touchOverride === "off") return false;
    return source === SRC.TOUCH;
  }

  function applyWindows() {
    const w = effectiveTouch() ? WIN_TOUCH : WIN_KEY;
    ctrl.coyoteFrames = w.coyote;
    ctrl.jumpBufferFrames = w.buffer;
  }
  applyWindows();

  function setSource(s) {
    if (source === s) return;
    source = s;
    applyWindows();
  }

  function setTouchOverride(mode) {
    touchOverride = (mode === "on" || mode === "off") ? mode : "auto";
    applyWindows();
  }

  function recompute() {
    const left = key.left || touch.left;
    const right = key.right || touch.right;
    let mx = 0;
    if (left && right) mx = lastDir || 0;   /* ikisi birden: son basilan */
    else if (left) mx = -1;
    else if (right) mx = 1;

    ctrl.moveX = mx;
    ctrl.jumpDown = (key.jump || touch.jump) ? 1 : 0;
    ctrl.jumpPressed = jumpEdge ? 1 : 0;
    ctrl.verbDown = (key.verb || touch.verb) ? 1 : 0;
    ctrl.verbPressed = verbEdge ? 1 : 0;
    ctrl.groundDown = (key.ground || touch.ground) ? 1 : 0;
    ctrl.groundPressed = groundEdge ? 1 : 0;
    /* KALKAN yalniz KLAVYEDE: dokunmatik yerlesimi (§4.9) UC butonla dolu ve
     * VIEW_H'ye dorduncu bir 64 px'lik buton SIGMIYOR (10+64*4+10*3 > 272).
     * Butonlari kucultup sigdirmak "min 44 px" sozlesmesini riske atardi;
     * KALKAN ilerleme icin ZORUNLU olmadigindan (savunma araci, kapi acmaz)
     * dokunmatik oyuncu onsuz da oyunu bitirebilir. */
    ctrl.shieldDown = key.shield ? 1 : 0;
    ctrl.shieldPressed = shieldEdge ? 1 : 0;
  }

  /* ----------------------------------------------------------- klavye */
  function onKeyDown(e) {
    if (dead || e.repeat) return;
    /* METIN MODU (SÜRE MODU isim girisi): tuslar oyuna DEGIL, boot.js'in
     * odakladigi gizli DOM input'una gider. Burada erken cikmak iki isi birden
     * yapar — oynanis tuslari donar (BOŞLUK yazarken karakter ziplamaz) ve
     * asagidaki preventDefault() calismaz, yani BOŞLUK gercekten bosluk yazar. */
    if (textMode) return;
    let used = true;
    switch (e.code) {
      case "ArrowLeft": case "KeyA": key.left = true; lastDir = -1; break;
      case "ArrowRight": case "KeyD": key.right = true; lastDir = 1; break;
      case "Space": case "ArrowUp": case "KeyW":
        if (!key.jump) jumpEdge = true;
        key.jump = true;
        break;
      case "ShiftLeft": case "ShiftRight": case "KeyJ":
        if (!key.verb) verbEdge = true;
        key.verb = true;
        break;
      /* ZEMİN YAP kendi tusunda (Q). Aksiyon tusuyla AYNI tusta olmasi
       * KOKLAYICI dovusunde cakisiyordu ve oyuncu "hangi tus ne yapiyor"
       * sorusunu hic cozemiyordu (raporlandi). */
      case "KeyQ":
        if (!key.ground) groundEdge = true;
        key.ground = true;
        break;
      /* KALKAN kendi tusunda (C). Basili tutmanin anlami yok (verbs.js yalniz
       * shieldPressed'i okur) ama seviye durumu yine de tutuluyor: tus
       * birakilmadan ikinci bir kenar uretilmesin. */
      case "KeyC":
        if (!key.shield) shieldEdge = true;
        key.shield = true;
        break;
      case "KeyP":
        if (o.onPause) o.onPause();
        break;
      case "KeyM":
        if (o.onMap) o.onMap();
        break;
      case "KeyR":
        if (o.onReset) o.onReset();
        break;
      case "KeyT":
        if (o.onTouchCycle) o.onTouchCycle();
        break;
      case "KeyL":
        if (o.onBoard) o.onBoard();
        break;
      case "F1":
        if (o.onDebug) o.onDebug();
        break;
      case "F2":
        if (o.onDialogueTest) o.onDialogueTest();
        break;
      default: used = false;
    }
    if (used) {
      setSource(SRC.KEY);
      recompute();
      /* Space ve oklar sayfayi kaydirir; overlay acikken bu istenmez.
       * Launcher scroll'u zaten kilitliyor, bu ikinci emniyet kemeri. */
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" ||
          e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "F1" || e.code === "F2") {
        e.preventDefault();
      }
    }
  }

  function onKeyUp(e) {
    if (dead || textMode) return;
    switch (e.code) {
      case "ArrowLeft": case "KeyA": key.left = false; if (key.right) lastDir = 1; break;
      case "ArrowRight": case "KeyD": key.right = false; if (key.left) lastDir = -1; break;
      case "Space": case "ArrowUp": case "KeyW": key.jump = false; break;
      case "ShiftLeft": case "ShiftRight": case "KeyJ": key.verb = false; break;
      case "KeyQ": key.ground = false; break;
      case "KeyC": key.shield = false; break;
      default: return;
    }
    recompute();
  }

  function onBlur() { reset(); }

  /* ------------------------------------------------------ dokunmatik */
  /* Bolgeler BUFFER-SPACE (480x272) cinsinden — CSS clientX/Y once ORANLA
   * bu uzaya cevrilir, boylece dpr/olcekten bagimsiz, render.js'in ciziciyle
   * AYNI referans kullanilir:
   *   sol yarim  -> yon (dokunulan noktanin merkeze gore yani)
   *   sag alt    -> A (ZIPLA)
   *   sag ust    -> B (FIIL) */
  function toBuffer(cx, cy) {
    const x = ((cx - touchRect.left) / touchRect.width) * VIEW_W;
    const y = ((cy - touchRect.top) / touchRect.height) * VIEW_H;
    return { x, y };
  }

  function zoneOf(cx, cy) {
    if (!touchRect) return 0;
    const p = toBuffer(cx, cy);
    if (p.x > VIEW_W * 0.5) {
      const byA = VIEW_H - TOUCH_PAD - TOUCH_BTN;
      const byB = byA - TOUCH_PAD - TOUCH_BTN;
      const byC = byB - TOUCH_PAD - TOUCH_BTN;
      if (p.y >= byA) return 2;                 /* A: ZIPLA */
      if (p.y >= byB) return 3;                 /* B: GİZLEN (aksiyon) */
      if (p.y >= byC) return 4;                 /* C: ZEMİN YAP */
      return 2;                                 /* sag bosluk da ziplama sayilir */
    }
    return p.x < VIEW_W * 0.25 ? -1 : 1;        /* sol ceyrek = sol, sonrasi = sag */
  }

  function syncTouch() {
    touch.left = touch.right = touch.jump = touch.verb = touch.ground = false;
    let dir = 0;
    pointers.forEach((z) => {
      if (z === -1) { touch.left = true; dir = -1; }
      else if (z === 1) { touch.right = true; dir = 1; }
      else if (z === 2) touch.jump = true;
      else if (z === 3) touch.verb = true;
      else if (z === 4) touch.ground = true;
    });
    if (dir) lastDir = dir;
    recompute();
  }

  function onPointerDown(e) {
    if (dead || !touchTarget) return;
    touchRect = touchTarget.getBoundingClientRect();
    /* Ekran UI'si (HARITA satirlari, onay kutusu) ONCE bakar — fare de dahil,
     * cunku bir menu satirini FAREYLE tiklamak "dokunmatik oynuyorum" demek
     * degildir; tuketilirse kaynak/edge durumlarina hic dokunulmaz. */
    if (o.onPointerTap) {
      const p = toBuffer(e.clientX, e.clientY);
      if (o.onPointerTap(p.x, p.y)) { e.preventDefault(); return; }
    }
    if (e.pointerType === "mouse") return;      /* fare klavye kaynagini bozmasin */
    const z = zoneOf(e.clientX, e.clientY);
    pointers.set(e.pointerId, z);
    if (z === 2 && !touch.jump) jumpEdge = true;
    if (z === 3 && !touch.verb) verbEdge = true;
    if (z === 4 && !touch.ground) groundEdge = true;
    setSource(SRC.TOUCH);
    syncTouch();
    if (touchTarget.setPointerCapture) {
      try { touchTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (dead || !pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const z = zoneOf(e.clientX, e.clientY);
    if (z !== prev) {
      pointers.set(e.pointerId, z);
      if (z === 2 && !touch.jump) jumpEdge = true;
      if (z === 3 && !touch.verb) verbEdge = true;
      if (z === 4 && !touch.ground) groundEdge = true;
      syncTouch();
    }
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (dead || !pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    syncTouch();
    e.preventDefault();
  }

  /* ------------------------------------------------------------- kurulum */
  keyTarget.addEventListener("keydown", onKeyDown);
  keyTarget.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  if (touchTarget) {
    touchTarget.addEventListener("pointerdown", onPointerDown, { passive: false });
    touchTarget.addEventListener("pointermove", onPointerMove, { passive: false });
    touchTarget.addEventListener("pointerup", onPointerUp, { passive: false });
    touchTarget.addEventListener("pointercancel", onPointerUp, { passive: false });
  }

  function consumeEdges() {
    jumpEdge = false;
    verbEdge = false;
    groundEdge = false;
    shieldEdge = false;
    ctrl.jumpPressed = 0;
    ctrl.verbPressed = 0;
    ctrl.groundPressed = 0;
    ctrl.shieldPressed = 0;
  }

  function reset() {
    key.left = key.right = key.jump = key.verb = key.ground = key.shield = false;
    touch.left = touch.right = touch.jump = touch.verb = touch.ground = false;
    pointers.clear();
    jumpEdge = verbEdge = groundEdge = shieldEdge = false;
    lastDir = 0;
    recompute();
  }

  function destroy() {
    dead = true;
    keyTarget.removeEventListener("keydown", onKeyDown);
    keyTarget.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    if (touchTarget) {
      touchTarget.removeEventListener("pointerdown", onPointerDown);
      touchTarget.removeEventListener("pointermove", onPointerMove);
      touchTarget.removeEventListener("pointerup", onPointerUp);
      touchTarget.removeEventListener("pointercancel", onPointerUp);
    }
    pointers.clear();
  }

  /* boot.js hit-test ile AYNI dikdortgenleri cizsin diye TEK bir yerden
   * turetiliyor — coordinate drift riski olmaz. Buffer-space (480x272) px. */
  function buttonRects() {
    const byA = VIEW_H - TOUCH_PAD - TOUCH_BTN;
    const byB = byA - TOUCH_PAD - TOUCH_BTN;
    const byC = byB - TOUCH_PAD - TOUCH_BTN;
    const bx = VIEW_W - TOUCH_PAD - TOUCH_BTN;
    return {
      jump: { x: bx, y: byA, w: TOUCH_BTN, h: TOUCH_BTN },
      verb: { x: bx, y: byB, w: TOUCH_BTN, h: TOUCH_BTN },
      ground: { x: bx, y: byC, w: TOUCH_BTN, h: TOUCH_BTN }
    };
  }

  /* Metin moduna GECERKEN tum tuslar birakilmis sayilir: aksi halde isim
   * ekranina saga basili girip cikan oyuncu, donduginde hala kosuyor olurdu. */
  function setTextMode(on) {
    const next = !!on;
    if (textMode === next) return;
    textMode = next;
    reset();
  }

  return {
    ctrl,
    get source() { return source; },
    get touchActive() { return effectiveTouch(); },
    get textMode() { return textMode; },
    consumeEdges, reset, destroy, buttonRects, setTouchOverride, setTextMode,
    touchLayout: { size: TOUCH_BTN, pad: TOUCH_PAD }
  };
}

export default createInput;
