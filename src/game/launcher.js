/* game/launcher.js — HER SAYFADA yuklenen tek modul (§10.1 karar C).
 *
 * Sorumluluk: monitor hotspot dinleyicisi, portre kapisi, overlay mount/unmount,
 * FLIP zoom, scroll kilidi, inert yonetimi, odak tuzagi, ESC ile cikis, FPS
 * sayaci ve `await import("./boot.js")` ile motorun TEMBEL yuklenmesi.
 * Hicbir oyun kodu monitore tiklanmadan inmez.
 *
 * ==========================================================================
 * KRITIK TUZAK (§10.7 / O9) — okumadan overlay'e dokunma:
 * `.hero-scene-wrap.pixel-frame` hem `clip-path` hem `filter: drop-shadow`
 * icerir. `filter` iceren bir ata, `position: fixed` torunlari icin CONTAINING
 * BLOCK olur ve `clip-path` onlari kirpar. Overlay hero'nun icinde yaratilirsa
 * "tam ekran" 490x280'lik bir kutuda kalir, notch poligonuyla kirpilir ve hata
 * SESSIZDIR. Bu yuzden overlay HER ZAMAN document.body'ye eklenir ve ASLA
 * re-parent edilmez. Dev-mode'da console.assert ile dogrulanir.
 * ==========================================================================
 */

import { VIEW_W, VIEW_H, pickScale } from "./scale.js";

const DEBUG = !!import.meta.env.DEV || /[?&](fps|debug)\b/.test(location.search);
/* Sadece DEBUG'da: ?startWorld=6 ile W0-W1'i tekrar oynamadan W6/YOKSAY/MERGE
 * QA'i. Oyuncuya gorunur hicbir tetikleyicisi yok (bkz. boot.js debugStartWorld). */
const DEBUG_START_WORLD = DEBUG ? (() => {
  const m = /[?&]startWorld=(\d)\b/.exec(location.search);
  return m ? Number(m[1]) : undefined;
})() : undefined;

const MAX_SCALE = 6;            /* §10.9 cok buyuk ekran: 2880x1632, kalani letterbox */
const OVERLAY_Z = 900;          /* #toast 200, nav 50, skip-link 500 — hepsinin ustunde */
const CONNECTING_DELAY = 250;   /* §10.7-5: bu esigi gecerse BAGLANIYOR yazisi */
const FLIP_IN_MS = 320, FLIP_OUT_MS = 220, CROSSFADE_MS = 80;
const FLIP_EASE = "cubic-bezier(.22,.61,.36,1)";

/* Launcher'in kendi metni. Oyun metinleri `content` objesine GIRMEZ (o senkron
 * parse edilir); site tarafinda yalniz `game.hotspotAriaLabel` + caption'lar var. */
const TEXT = {
  tr: {
    overlayLabel: "Gizli oyun",
    connecting: "BAĞLANIYOR",
    rotate: "Cihazı yatay çevir. Ya da böyle oyna.",
    playAnyway: "YİNE DE OYNA",
    pause: "DURAKLAT", resume: "DEVAM", exit: "ÇIKIŞ",
    soundOn: "SES AÇIK", soundOff: "SES KAPALI",
    paused: "DURAKLATILDI — çıkmak için Esc'e bir daha bas.",
    failed: "Oyun yüklenemedi. Bağlantını kontrol edip tekrar dene."
  },
  en: {
    overlayLabel: "Hidden game",
    connecting: "CONNECTING",
    rotate: "Turn the device sideways. Or play like this.",
    playAnyway: "PLAY ANYWAY",
    pause: "PAUSE", resume: "RESUME", exit: "EXIT",
    soundOn: "SOUND ON", soundOff: "SOUND OFF",
    paused: "PAUSED — press Esc again to exit.",
    failed: "The game failed to load. Check your connection and try again."
  }
};

const OVERLAY_CSS = `
#game-overlay{position:fixed;inset:0;z-index:${OVERLAY_Z};background:var(--bg);color:var(--ink);
 display:flex;align-items:center;justify-content:center;overscroll-behavior:none;
 transform-origin:0 0;will-change:transform,opacity;}
#game-overlay:focus{outline:none;}
#game-overlay .gs-stage{position:relative;display:flex;align-items:center;justify-content:center;
 touch-action:none;}
#game-overlay canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;}
#game-overlay .gs-chrome{position:absolute;top:0;right:0;display:flex;gap:6px;padding:8px;}
#game-overlay .gs-chrome button{font-family:var(--font-mono);font-size:.7rem;line-height:1;
 min-width:44px;min-height:44px;padding:4px 8px;background:var(--surface);color:var(--ink);
 border:2px solid var(--ink);cursor:pointer;}
#game-overlay .gs-chrome button:hover{background:var(--surface-soft);}
#game-overlay .gs-fps{position:absolute;left:8px;top:8px;font-family:var(--font-mono);font-size:.7rem;
 padding:3px 6px;background:var(--surface);color:var(--ink-soft);border:2px solid var(--ink);
 font-variant-numeric:tabular-nums;}
#game-overlay .gs-status{position:absolute;left:0;right:0;bottom:0;padding:10px 14px;text-align:center;
 font-family:var(--font-mono);font-size:.78rem;background:var(--surface);color:var(--ink);
 border-top:2px solid var(--ink);}
#game-overlay .gs-gate{max-width:34ch;padding:20px;text-align:center;font-family:var(--font-mono);
 font-size:.9rem;display:flex;flex-direction:column;gap:16px;align-items:center;}
#game-overlay .gs-gate button{font-family:var(--font-mono);font-size:.8rem;min-height:44px;
 padding:10px 16px;background:var(--surface);color:var(--ink);border:2px solid var(--ink);
 cursor:pointer;}
#game-overlay .gs-gate-icon{font-size:2rem;line-height:1;}
@media (prefers-reduced-motion: reduce){#game-overlay{will-change:auto;}}
`;

/* ---------------- kopru (§10.8) ---------------- */
let bridge = null;
function grabBridge() {
  bridge = window.HeroBridge || null;
  return bridge;
}
/* Klasik inline script deferred modulden ONCE calisir; yine de savunmali olunur. */
if (!grabBridge()) {
  document.addEventListener("hero:ready", grabBridge, { once: true });
}

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
function reduceMotion() {
  return bridge && typeof bridge.reduceMotion === "function" ? bridge.reduceMotion() : rmMQ.matches;
}
function lang() {
  const l = bridge && typeof bridge.getLang === "function" ? bridge.getLang() : "tr";
  return l === "en" ? "en" : "tr";
}
function t(key) { return TEXT[lang()][key]; }
function paletteFromSite() {
  const read = (n, fb) => {
    if (bridge && typeof bridge.cssVar === "function") return bridge.cssVar(n) || fb;
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;
  };
  return {
    bg: read("--bg", "#171F3D"), surface: read("--surface", "#212a52"),
    surfaceSoft: read("--surface-soft", "#283163"), ink: read("--ink", "#FDF3E9"),
    inkSoft: read("--ink-soft", "#B7B9D6"), accent: read("--accent", "#FF6C9C"),
    secondary: read("--secondary", "#58C4FF"), led: read("--led", "#38E27C")
  };
}
function isDark() {
  if (bridge && typeof bridge.isDark === "function") return bridge.isDark();
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/* ---------------- durum ---------------- */
let overlay = null, stageEl = null, canvasEl = null, fpsEl = null, statusEl = null, gateEl = null;
let pauseBtn = null, soundBtn = null, exitBtn = null;
let engine = null, bootPromise = null;
let state = "closed";           /* closed | opening | gate | running | closing */
let savedScrollY = 0;
let inertRecords = [];
let currentAnim = null;
let connectingTimer = 0;
let escArmed = false;           /* 1. Escape duraklatir, 2. Escape cikar */
let audioOn = true;
let pausedUi = false;           /* chrome'un GOSTERDIGI duraklama durumu */
let styleInjected = false;
let lastState = null;           /* boot'un bildirdigi kalici iz */
let hotspot = null;

const portraitMQ = window.matchMedia("(orientation: portrait) and (max-width: 820px)");
const fineMQ = window.matchMedia("(pointer: fine)");

/* §10.7-8: preventDefault YALNIZ sahiplenilen tuslarda. Tab ve F-tuslari asla yutulmaz. */
const OWNED_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar",
  "w", "a", "d", "W", "A", "D", "j", "k", "J", "K", "Shift",
  "Escape", "r", "R", "m", "M", "l", "L", "q", "Q"
]);

/* ---------------- olcek ---------------- */
function currentDpr() { return Math.max(1, Math.min(window.devicePixelRatio || 1, 3)); }
function currentScale() {
  const dpr = currentDpr();
  return Math.min(MAX_SCALE, pickScale(window.innerWidth, window.innerHeight, dpr));
}
/* Geometrinin TEK sahibi launcher'dir; boot canvas.width/height'a asla yazmaz. */
function sizeCanvas() {
  const dpr = currentDpr(), s = currentScale();
  canvasEl.width = VIEW_W * s;
  canvasEl.height = VIEW_H * s;
  canvasEl.style.width = (VIEW_W * s / dpr) + "px";
  canvasEl.style.height = (VIEW_H * s / dpr) + "px";
  return s;
}

/* ---------------- overlay insasi ---------------- */
function injectStyle() {
  if (styleInjected) return;
  const st = document.createElement("style");
  st.id = "game-overlay-css";
  st.textContent = OVERLAY_CSS;
  document.head.appendChild(st);
  styleInjected = true;
}

function chromeButton(label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function buildOverlay() {
  injectStyle();
  overlay = document.createElement("div");
  overlay.id = "game-overlay";
  overlay.setAttribute("role", "application");
  overlay.setAttribute("aria-label", t("overlayLabel"));
  overlay.tabIndex = -1;

  stageEl = document.createElement("div");
  stageEl.className = "gs-stage";
  canvasEl = document.createElement("canvas");
  canvasEl.setAttribute("aria-hidden", "true");   /* §10.10: durum #a11y-announcer'dan */
  stageEl.appendChild(canvasEl);
  overlay.appendChild(stageEl);

  /* Uc GERCEK <button> — klavye ve ekran okuyucu kullanicisi her an cikabilir. */
  const chrome = document.createElement("div");
  chrome.className = "gs-chrome";
  pauseBtn = chromeButton(t("pause"), togglePause);
  soundBtn = chromeButton(audioOn ? t("soundOn") : t("soundOff"), toggleSound);
  exitBtn = chromeButton(t("exit"), () => close());
  chrome.appendChild(pauseBtn);
  chrome.appendChild(soundBtn);
  chrome.appendChild(exitBtn);
  overlay.appendChild(chrome);

  if (DEBUG) {
    fpsEl = document.createElement("div");
    fpsEl.className = "gs-fps";
    fpsEl.textContent = "-- fps";
    overlay.appendChild(fpsEl);
  }

  statusEl = document.createElement("p");
  statusEl.className = "gs-status";
  statusEl.hidden = true;
  statusEl.style.margin = "0";
  overlay.appendChild(statusEl);

  /* HER ZAMAN body — asla re-parent edilmez (yukaridaki KRITIK TUZAK). */
  document.body.appendChild(overlay);
  if (DEBUG) console.assert(overlay.parentElement === document.body, "[game] overlay body'nin cocugu olmali");
}

function setStatus(msg) {
  if (!statusEl) return;
  if (!msg) { statusEl.hidden = true; statusEl.textContent = ""; return; }
  statusEl.textContent = msg;
  statusEl.hidden = false;
}

/* ---------------- portre kapisi (§10.9 ROTATE) ---------------- */
function needsGate(viaKeyboard) {
  if (viaKeyboard || fineMQ.matches) return false;           /* klavye/fine pointer -> bypass */
  if (portraitMQ.matches) return true;
  return currentScale() === 1 && window.innerWidth < VIEW_W;  /* cok kucuk ekran */
}
function showGate() {
  state = "gate";
  stageEl.hidden = true;
  gateEl = document.createElement("div");
  gateEl.className = "gs-gate";
  const icon = document.createElement("div");
  icon.className = "gs-gate-icon";
  icon.textContent = "⟲";
  icon.setAttribute("aria-hidden", "true");
  const msg = document.createElement("p");
  msg.style.margin = "0";
  msg.textContent = t("rotate");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = t("playAnyway");
  btn.addEventListener("click", dismissGate);
  gateEl.appendChild(icon);
  gateEl.appendChild(msg);
  gateEl.appendChild(btn);
  overlay.insertBefore(gateEl, stageEl);
  btn.focus();
  try {
    const lock = screen.orientation && screen.orientation.lock;
    if (lock) { const p = screen.orientation.lock("landscape"); if (p && p.catch) p.catch(() => {}); }
  } catch (e) { /* iOS desteklemiyor — sessizce yutulur */ }
  portraitMQ.addEventListener("change", onPortraitChange);
}
function onPortraitChange(e) {
  if (!e.matches && state === "gate") dismissGate();
}
function dismissGate() {
  portraitMQ.removeEventListener("change", onPortraitChange);
  if (gateEl) { gateEl.remove(); gateEl = null; }
  stageEl.hidden = false;
  state = "running";
  startEngine();
}

/* ---------------- scroll kilidi + inert (§10.7-6, 10.7-7) ---------------- */
function lockScroll() {
  savedScrollY = window.scrollY || window.pageYOffset || 0;
  /* body'ye position:fixed VERILMEZ — iOS'ta scroll konumunu kaybettiriyor. */
  document.documentElement.style.overflow = "hidden";
}
function unlockScroll() {
  document.documentElement.style.overflow = "";
  window.scrollTo(0, savedScrollY);              /* emniyet kemeri */
}
function applyInert() {
  inertRecords = [];
  const kids = Array.prototype.slice.call(document.body.children);
  for (const el of kids) {
    if (el === overlay) continue;
    /* #a11y-announcer inert EDILMEZ: §10.10 oyun durumunu MEVCUT live region
     * uzerinden duyuruyor; inert onu erisilebilirlik agacindan cikarir ve ikinci
     * bir live region yaratmak O23 ile yasak. Odaklanabilir icerigi yok. */
    if (el.id === "a11y-announcer") continue;
    if (el.tagName === "SCRIPT" || el.tagName === "NOSCRIPT" || el.tagName === "STYLE") continue;
    inertRecords.push({ el, inert: el.inert, aria: el.getAttribute("aria-hidden") });
    el.inert = true;
    el.setAttribute("aria-hidden", "true");
  }
}
function releaseInert() {
  for (const r of inertRecords) {
    r.el.inert = !!r.inert;
    if (r.aria === null) r.el.removeAttribute("aria-hidden");
    else r.el.setAttribute("aria-hidden", r.aria);
  }
  inertRecords = [];
}

/* ---------------- FLIP (§10.7-4) ---------------- */
function flip(rect, dir) {
  if (!overlay.animate) return null;
  const from = {
    transform: "translate(" + rect.left + "px," + rect.top + "px) scale(" +
      (rect.width / Math.max(1, window.innerWidth)) + "," +
      (rect.height / Math.max(1, window.innerHeight)) + ")",
    opacity: 0.55
  };
  const to = { transform: "translate(0px,0px) scale(1,1)", opacity: 1 };
  if (reduceMotion()) {
    /* zoom -> crossfade, transform YOK */
    return overlay.animate(
      dir === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: CROSSFADE_MS, easing: "linear", fill: "both" }
    );
  }
  return overlay.animate(dir === "in" ? [from, to] : [to, from],
    { duration: dir === "in" ? FLIP_IN_MS : FLIP_OUT_MS, easing: FLIP_EASE, fill: "both" });
}

/* ---------------- klavye + odak tuzagi ---------------- */
/* Odaklanabilirler DOM sirasindan turetilir: portre kapisi acikken "yine de oyna"
 * da listeye kendiliginden girer, kapandiginda kendiliginden cikar. */
function focusables() {
  if (!overlay) return [];
  return Array.prototype.slice.call(overlay.querySelectorAll("button:not([disabled])"))
    .filter((b) => b.offsetParent !== null || b.isConnected);
}
function onKeyDown(e) {
  if (state !== "running" && state !== "gate") return;
  if (e.key === "Tab") {                        /* §10.10: Tab chrome butonlari arasinda doner */
    const btns = focusables();
    if (!btns.length) return;
    const idx = btns.indexOf(document.activeElement);
    e.preventDefault();
    const next = e.shiftKey
      ? (idx <= 0 ? btns.length - 1 : idx - 1)
      : (idx === -1 || idx === btns.length - 1 ? 0 : idx + 1);
    btns[next].focus();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    if (escArmed) close();                      /* 2. Escape -> cikis */
    else pause(true);                           /* 1. Escape -> duraklat (ofke-cikisi engeli) */
    return;
  }
  if (OWNED_KEYS.has(e.key)) e.preventDefault();
  /* Not: stopPropagation YOK — Faz 1'de input.js kendi listener'lariyla ayni
   * olayi gormeye devam eder. Launcher yalnizca sayfa kaydirmasini bastirir. */
}

/* ---------------- duraklat / ses ---------------- */
function pause(armEscape) {
  if (!engine) return;
  engine.pause();
  escArmed = !!armEscape;
  pausedUi = true;
  if (pauseBtn) pauseBtn.textContent = t("resume");
  setStatus(t("paused"));
}
function unpause() {
  if (!engine) return;
  engine.resume();
  escArmed = false;
  pausedUi = false;
  if (pauseBtn) pauseBtn.textContent = t("pause");
  setStatus("");
}
function togglePause() {
  if (!engine) return;
  if (engine.isPaused()) unpause(); else pause(true);
}
/* Motor kendi ic ekranlarinda (HARITA / BÖLÜM SEÇ) duraklama durumunu
 * launcher'a sormadan degistirebilir — o ekrandan bir bolume atlayinca oyun
 * KOSMAYA baslar ama chrome "DEVAM" + "DURAKLATILDI" yazisinda takili
 * kalirdi. Dongu kostugu surece (~4 Hz onFps) tek yonlu senkron. */
function syncPauseChrome() {
  if (!engine || state !== "running") return;
  const p = engine.isPaused();
  if (p === pausedUi) return;
  pausedUi = p;
  if (pauseBtn) pauseBtn.textContent = p ? t("resume") : t("pause");
  if (p) setStatus(t("paused"));
  else { escArmed = false; setStatus(""); }
}
function toggleSound() {
  audioOn = !audioOn;
  if (soundBtn) soundBtn.textContent = audioOn ? t("soundOn") : t("soundOff");
  if (engine) engine.setAudio(audioOn);
}

/* ---------------- sayfa olaylari ---------------- */
let resizeRaf = 0;
function onResize() {
  if (state !== "running" || !engine) return;
  if (currentAnim) { try { currentAnim.finish(); } catch (e) {} }  /* FLIP'i son duruma atla */
  const wasPaused = engine.isPaused();
  engine.pause();
  const s = sizeCanvas();
  engine.resize(s);
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {                        /* 1 kare sonra devam */
    resizeRaf = 0;
    if (!wasPaused && state === "running") engine.resume();
  });
}
function onVisibility() {
  if (state !== "running" || !engine) return;
  if (document.hidden) pause(false);
}
function onWindowBlur() {
  if (state !== "running" || !engine) return;
  pause(false);
}
function bindPageEvents() {
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onWindowBlur);
}
function unbindPageEvents() {
  window.removeEventListener("keydown", onKeyDown, { capture: true });
  window.removeEventListener("resize", onResize);
  window.removeEventListener("orientationchange", onResize);
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("blur", onWindowBlur);
}

/* ---------------- motor ---------------- */
function startEngine() {
  if (!engine || state !== "running") return;
  const s = sizeCanvas();
  engine.resize(s);
  engine.start();
  overlay.focus();
}

async function loadBoot() {
  if (bootPromise) return bootPromise;
  bootPromise = import("./boot.js").catch((err) => { bootPromise = null; throw err; });
  return bootPromise;
}

/* ---------------- ac / kapa ---------------- */
async function open(viaKeyboard) {
  if (state !== "closed") return;
  state = "opening";
  const rect = hotspot ? hotspot.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };

  buildOverlay();
  lockScroll();
  applyInert();
  bindPageEvents();
  if (bridge) {
    if (typeof bridge.stopScene === "function") bridge.stopScene();     /* hero rAF GERCEKTEN iptal */
    if (typeof bridge.parkListeners === "function") bridge.parkListeners();  /* §11.6 */
    if (typeof bridge.setHotspotHover === "function") bridge.setHotspotHover(false);
  }
  overlay.focus();

  currentAnim = flip(rect, "in");
  if (currentAnim) currentAnim.addEventListener("finish", () => { currentAnim = null; }, { once: true });

  connectingTimer = window.setTimeout(() => setStatus(t("connecting")), CONNECTING_DELAY);

  let mod;
  try {
    mod = await loadBoot();
  } catch (err) {
    window.clearTimeout(connectingTimer);
    setStatus(t("failed"));
    if (DEBUG) console.error("[game] boot.js yuklenemedi", err);
    return;
  }
  window.clearTimeout(connectingTimer);
  setStatus("");
  if (state === "closed" || state === "closing") return;   /* kullanici yukleme sirasinda cikti */

  engine = mod.boot(canvasEl, {
    scale: currentScale(),
    dpr: currentDpr(),
    lang: lang(),
    dark: isDark(),
    reduceMotion: reduceMotion(),
    audio: audioOn,
    getPalette: paletteFromSite,
    onFps: (fps) => { if (fpsEl) fpsEl.textContent = fps + " fps"; syncPauseChrome(); },
    onExit: () => close(),
    onState: (st) => { lastState = st; },
    bridge: bridge,
    debugStartWorld: DEBUG_START_WORLD
  });

  if (needsGate(viaKeyboard)) showGate();
  else { state = "running"; startEngine(); }
}

function close() {
  if (state === "closed" || state === "closing") return;
  state = "closing";
  window.clearTimeout(connectingTimer);
  portraitMQ.removeEventListener("change", onPortraitChange);
  unbindPageEvents();
  if (resizeRaf) { cancelAnimationFrame(resizeRaf); resizeRaf = 0; }

  const rect = hotspot ? hotspot.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
  if (currentAnim) { try { currentAnim.cancel(); } catch (e) {} currentAnim = null; }

  const finish = () => {
    if (engine) { engine.destroy(); engine = null; }
    if (overlay) { overlay.remove(); overlay = null; }
    stageEl = canvasEl = fpsEl = statusEl = gateEl = null;
    pauseBtn = soundBtn = exitBtn = null;
    releaseInert();
    unlockScroll();
    escArmed = false;
    pausedUi = false;
    state = "closed";
    if (hotspot) hotspot.focus();
    if (bridge) {
      if (typeof bridge.startScene === "function") bridge.startScene();
      if (typeof bridge.resumeListeners === "function") bridge.resumeListeners();
      if (typeof bridge.setMonitorState === "function") bridge.setMonitorState(lastState);
    }
  };

  if (engine) engine.pause();
  const anim = flip(rect, "out");
  if (anim) {
    currentAnim = anim;
    anim.addEventListener("finish", () => { currentAnim = null; finish(); }, { once: true });
    anim.addEventListener("cancel", () => { currentAnim = null; finish(); }, { once: true });
  } else finish();
}

/* ---------------- hotspot ---------------- */
function bindHotspot() {
  hotspot = document.getElementById("monitor-hotspot");
  if (!hotspot) { if (DEBUG) console.warn("[game] #monitor-hotspot bulunamadi"); return; }

  hotspot.addEventListener("click", (e) => {
    /* detail === 0 -> klavye ile tetiklendi (Enter/Space) => portre kapisi bypass */
    open(e.detail === 0);
  });
  const hover = (v) => { if (bridge && typeof bridge.setHotspotHover === "function") bridge.setHotspotHover(v); };
  hotspot.addEventListener("pointerenter", () => hover(true));
  hotspot.addEventListener("pointerleave", () => hover(false));
  hotspot.addEventListener("focus", () => hover(true));
  hotspot.addEventListener("blur", () => hover(false));
}

/* ---------------- site olaylarina abone ol ---------------- */
function bindBridgeListeners() {
  if (!bridge) return;
  if (typeof bridge.onLangChange === "function") {
    bridge.onLangChange(() => {
      if (overlay) {
        overlay.setAttribute("aria-label", t("overlayLabel"));
        if (pauseBtn) pauseBtn.textContent = (engine && engine.isPaused()) ? t("resume") : t("pause");
        if (soundBtn) soundBtn.textContent = audioOn ? t("soundOn") : t("soundOff");
        if (exitBtn) exitBtn.textContent = t("exit");
        if (statusEl && !statusEl.hidden && engine && engine.isPaused()) setStatus(t("paused"));
      }
      if (engine) engine.setLang(lang());
    });
  }
  if (typeof bridge.onThemeChange === "function") {
    bridge.onThemeChange(() => { if (engine) engine.setTheme(isDark()); });
  }
  if (typeof bridge.onReduceMotionChange === "function") {
    bridge.onReduceMotionChange((v) => { if (engine) engine.setReduceMotion(v); });
  }
}

function init() {
  bindHotspot();
  if (bridge) bindBridgeListeners();
  else document.addEventListener("hero:ready", () => { grabBridge(); bindBridgeListeners(); }, { once: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

/* dev-mode elle test icin */
if (DEBUG) window.__game = { open, close, get state() { return state; }, get engine() { return engine; } };
