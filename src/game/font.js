/* game/font.js — 6x10 hucreli piksel font, TR + EN. (Tasarim kitabi §9.6)
 *
 * ============================================================================
 * ARAYUZ SOZLESMESI — bu imza degismez.
 * ============================================================================
 *
 *   import { createFont, FONT_W, FONT_H, PITCH, MAX_CHARS_PER_LINE,
 *            maxCharsForWidth, CHARS, GLYPH_COUNT } from "./font.js";
 *
 *   const font = createFont(palette);          // palette: render.js Palette nesnesi
 *
 *   font.draw(ctx, str, x, y, slot, scale)     -> cizilen ilerleme genisligi (px)
 *   font.drawCentered(ctx, str, cx, y, slot, scale) -> ayni, cx MERKEZ
 *   font.measure(str, scale)                   -> px  (allocation YOK)
 *   font.has(ch)                               -> bool
 *   font.wrapInto(str, maxChars, out)          -> satir sayisi; out DIZISI DOLDURULUR
 *                                                 (allocation var — update dongusunde CAGIRMA)
 *   font.setPalette(palette)                   -> tema degisimi: tint onbellegi atilir
 *   font.destroy()                             -> tum tint canvas'lari birakilir
 *   font.atlasFor(slot)                        -> HTMLCanvasElement (dev/debug)
 *
 * `slot`  : 0..15 palet slotu (render.js SLOT tablosu). -1 verilirse glif VERISINDEKI
 *           slot rakami kullanilir (cok renkli glif imkani; su an tum glifler slot 0).
 * `scale` : TAM SAYI (1, 2, 3...). Kesirli deger |0 ile kirpilir.
 *
 * ---------------------------------------------------------------------------
 * VERI SEMASI — palet-indeksli satir string'i (§9.2 ile ayni alfabe)
 * ---------------------------------------------------------------------------
 * Her glif tek bir string: "<baslangicSatiri>:<satir>/<satir>/..."
 *   - satir = TAM 6 karakter. "." = seffaf, "0".."f" = 16 slotluk palet indeksi.
 *   - baslangicSatiri = ilk satirin 10 satirlik hucredeki indeksi (0..9).
 *   - eksik ust/alt satirlar seffaf sayilir; bos string = tamamen bos glif (bosluk).
 * 10 satirlik hucre: 1 ascender/aksan satiri + 7 cap-height satiri + 2 descender.
 *   satir 0      : BUYUK harf aksani (Ö Ü İ diaeresis/nokta)
 *   satir 0-1    : iki satirlik BUYUK harf aksani (Ğ breve) — taban harf 2-7'ye sikisir
 *   satir 1-7    : cap-height (baseline = satir 7)
 *   satir 1-2    : kucuk harf aksani (i j nokta, ö ü diaeresis, ğ breve)
 *   satir 3-7    : x-height
 *   satir 8-9    : descender (g j p q y) ve sedilla (ç ş Ç Ş)
 *
 * `ı` ve `İ` AYRI taban formudur; nokta glifin parcasi, kombine edilmez (§9.6).
 *
 * ---------------------------------------------------------------------------
 * SATIR BASINA MAKSIMUM KARAKTER HESABI (§9.6 tavanlarinin turetimi)
 * ---------------------------------------------------------------------------
 * advance = 6 px, kerning (tracking) = 1 px  =>  PITCH = 7 px/karakter.
 * n karakterlik satirin genisligi:  n*ADVANCE + (n-1)*TRACKING = 7n - 1  px.
 * Kullanilabilir metin alani: VIEW_W - 2*TILE = 480 - 32 = 448 px (SAFE_W).
 *   7n - 1 <= 448  =>  n <= 64,14  =>  n = 64 karakter/satir  (1x olcekte)
 *   2x olcekte: 7n - 1 <= 224 (px/2) => n = 32 karakter/satir
 * Genel hal: maxCharsForWidth(px, scale) = floor((px/scale + TRACKING) / PITCH).
 * §9.6'nin baglayici slot tavanlari (balon 44, kart basligi 2x/30, teaser 52,
 * tutorial 38, boss 22/46, revert 26, pip 40, final 48, menu 46) bu tavanin
 * ALTINDA kalir; dogrulama i18n.js'in isi, font.js yalnizca geometriyi verir.
 */

import { VIEW_W, TILE } from "./scale.js";

export const FONT_W = 6;                 /* hucre genisligi (px) */
export const FONT_H = 10;                /* hucre yuksekligi (px) */
export const ADVANCE = FONT_W;           /* 6 px advance */
export const TRACKING = 1;               /* 1 px kerning */
export const PITCH = ADVANCE + TRACKING; /* 7 px/karakter */

export const ROW_ACCENT = 0;             /* buyuk harf aksan satiri */
export const ROW_CAP_TOP = 1;            /* cap-height ust satiri */
export const ROW_X_TOP = 3;              /* x-height ust satiri */
export const ROW_BASELINE = 7;           /* baseline satiri */
export const ROW_DESC_END = 9;           /* descender son satiri */

export const SAFE_W = VIEW_W - 2 * TILE; /* 448 px — kenar payi bir tile */

/** Verilen px genisligine (1x degil, `scale`x olcekte) sigan karakter sayisi. */
export function maxCharsForWidth(px, scale) {
  const s = (scale | 0) || 1;
  const n = Math.floor((px / s + TRACKING) / PITCH);
  return n < 0 ? 0 : n;
}

export const MAX_CHARS_PER_LINE = maxCharsForWidth(SAFE_W, 1);   /* === 64 */

/* ==========================================================================
 * GLIF VERISI — 98 glif. TR 29+29 harf (Q W X q w x EN icin eklendi),
 * 10 rakam, 23 isaret (bosluk dahil).
 * Turkce aksanli harfler ZORUNLU ve tam: Ç ç Ğ ğ ı İ Ö ö Ş ş Ü ü.
 * ========================================================================== */
const GLYPHS = {
  " ": "",

  /* --- BUYUK HARFLER (TR 29 + Q W X) --- */
  "A": "1:.000../0...0./0...0./00000./0...0./0...0./0...0.",
  "B": "1:0000../0...0./0...0./0000../0...0./0...0./0000..",
  "C": "1:.000../0...0./0...../0...../0...../0...0./.000..",
  "Ç": "1:.000../0...0./0...../0...../0...../0...0./.000../..0.../.00...",
  "D": "1:0000../0...0./0...0./0...0./0...0./0...0./0000..",
  "E": "1:00000./0...../0...../0000../0...../0...../00000.",
  "F": "1:00000./0...../0...../0000../0...../0...../0.....",
  "G": "1:.000../0...0./0...../0..00./0...0./0...0./.000..",
  "Ğ": "0:0...0./.000../.000../0...0./0...../0..00./0...0./.000..",
  "H": "1:0...0./0...0./0...0./00000./0...0./0...0./0...0.",
  "I": "1:00000./..0.../..0.../..0.../..0.../..0.../00000.",
  "İ": "0:..0.../00000./..0.../..0.../..0.../..0.../..0.../00000.",
  "J": "1:..000./...0../...0../...0../...0../0..0../.00...",
  "K": "1:0...0./0..0../0.0.../00..../0.0.../0..0../0...0.",
  "L": "1:0...../0...../0...../0...../0...../0...../00000.",
  "M": "1:0...0./00.00./0.0.0./0.0.0./0...0./0...0./0...0.",
  "N": "1:0...0./00..0./00..0./0.0.0./0..00./0..00./0...0.",
  "O": "1:.000../0...0./0...0./0...0./0...0./0...0./.000..",
  "Ö": "0:.0.0../.000../0...0./0...0./0...0./0...0./0...0./.000..",
  "P": "1:0000../0...0./0...0./0000../0...../0...../0.....",
  "Q": "1:.000../0...0./0...0./0...0./0.0.0./.000../...00.",
  "R": "1:0000../0...0./0...0./0000../0.0.../0..0../0...0.",
  "S": "1:.000../0...0./0...../.000../....0./0...0./.000..",
  "Ş": "1:.000../0...0./0...../.000../....0./0...0./.000../..0.../.00...",
  "T": "1:00000./..0.../..0.../..0.../..0.../..0.../..0...",
  "U": "1:0...0./0...0./0...0./0...0./0...0./0...0./.000..",
  "Ü": "0:.0.0../0...0./0...0./0...0./0...0./0...0./0...0./.000..",
  "V": "1:0...0./0...0./0...0./0...0./0...0./.0.0../..0...",
  "W": "1:0...0./0...0./0...0./0.0.0./0.0.0./00.00./0...0.",
  "X": "1:0...0./0...0./.0.0../..0.../.0.0../0...0./0...0.",
  "Y": "1:0...0./0...0./.0.0../..0.../..0.../..0.../..0...",
  "Z": "1:00000./....0./...0../..0.../.0..../0...../00000.",

  /* --- KUCUK HARFLER (TR 29 + q w x) --- */
  "a": "3:.000../....0./.0000./0...0./.0000.",
  "b": "1:0...../0...../0000../0...0./0...0./0...0./0000..",
  "c": "3:.000../0...0./0...../0...0./.000..",
  "ç": "3:.000../0...0./0...../0...0./.000../..0.../.00...",
  "d": "1:....0./....0./.0000./0...0./0...0./0...0./.0000.",
  "e": "3:.000../0...0./00000./0...../.000..",
  "f": "1:..000./.0..../0000../.0..../.0..../.0..../.0....",
  "g": "3:.0000./0...0./0...0./.0000./....0./0...0./.000..",
  "ğ": "1:0...0./.000../.0000./0...0./0...0./.0000./....0./0...0./.000..",
  "h": "1:0...../0...../0000../0...0./0...0./0...0./0...0.",
  "ı": "3:.00.../..0.../..0.../..0.../.000..",
  "i": "1:..0.../....../.00.../..0.../..0.../..0.../.000..",
  "j": "1:...0../....../...0../...0../...0../...0../...0../0..0../.00...",
  "k": "1:0...../0...../0..0../0.0.../00..../0.0.../0..0..",
  "l": "1:.00.../..0.../..0.../..0.../..0.../..0.../.000..",
  "m": "3:00.0../0.0.0./0.0.0./0.0.0./0.0.0.",
  "n": "3:0000../0...0./0...0./0...0./0...0.",
  "o": "3:.000../0...0./0...0./0...0./.000..",
  "ö": "1:.0.0../....../.000../0...0./0...0./0...0./.000..",
  "p": "3:0000../0...0./0...0./0...0./0000../0...../0.....",
  "q": "3:.0000./0...0./0...0./0...0./.0000./....0./....0.",
  "r": "3:0.00../00..../0...../0...../0.....",
  "s": "3:.000../0...../.000../....0./.000..",
  "ş": "3:.000../0...../.000../....0./.000../..0.../.00...",
  "t": "1:.0..../.0..../0000../.0..../.0..../.0..../..00..",
  "u": "3:0...0./0...0./0...0./0...0./.0000.",
  "ü": "1:.0.0../....../0...0./0...0./0...0./0...0./.0000.",
  "v": "3:0...0./0...0./0...0./.0.0../..0...",
  "w": "3:0...0./0...0./0.0.0./0.0.0./.0.0..",
  "x": "3:0...0./.0.0../..0.../.0.0../0...0.",
  "y": "3:0...0./0...0./0...0./.0000./....0./....0./.000..",
  "z": "3:00000./...0../..0.../.0..../00000.",

  /* --- RAKAMLAR --- */
  "0": "1:.000../0...0./0..00./0.0.0./00..0./0...0./.000..",
  "1": "1:..0.../.00.../..0.../..0.../..0.../..0.../.000..",
  "2": "1:.000../0...0./....0./...0../..0.../.0..../00000.",
  "3": "1:00000./...0../..0.../...0../....0./0...0./.000..",
  "4": "1:...0../..00../.0.0../0..0../00000./...0../...0..",
  "5": "1:00000./0...../0000../....0./....0./0...0./.000..",
  "6": "1:..00../.0..../0...../0000../0...0./0...0./.000..",
  "7": "1:00000./....0./...0../..0.../..0.../..0.../..0...",
  "8": "1:.000../0...0./0...0./.000../0...0./0...0./.000..",
  "9": "1:.000../0...0./0...0./.0000./....0./...0../.00...",

  /* --- ISARETLER (§9.6 kumesi + EN icin gerekli ekler) --- */
  ".": "7:..0...",
  ",": "7:..0.../.0....",
  ":": "4:..0.../....../....../..0...",
  ";": "4:..0.../....../....../..0.../.0....",
  "%": "3:0...0./...0../..0.../.0..../0...0.",
  "/": "1:....0./...0../...0../..0.../.0..../.0..../0.....",
  "?": "1:.000../0...0./....0./...0../..0.../....../..0...",
  "!": "1:..0.../..0.../..0.../..0.../..0.../....../..0...",
  "-": "5:.000..",
  "(": "1:...0../..0.../..0.../..0.../..0.../..0.../...0..",
  ")": "1:.0..../..0.../..0.../..0.../..0.../..0.../.0....",
  "→": "4:...0../00000./...0..",
  "'": "1:..0.../..0...",
  "\"": "1:.0.0../.0.0..",
  "+": "4:..0.../00000./..0...",
  "=": "4:00000./....../00000.",
  "×": "4:.0.0../..0.../.0.0..",
  "…": "7:0.0.0.",
  "—": "5:000000",
  "&": "1:.00.../0..0../0.0.../.0..../0.0.0./0..0../.00.0.",
  "@": "1:.000../0...0./0.000./0.0.0./0.000./0...../.000..",
  "#": "1:.0.0../.0.0../00000./.0.0../00000./.0.0../.0.0..",
  "*": "1:..0.../0.0.0./.000../0.0.0./..0..."
};

/** Ciziminde bulunan tum karakterler, DATA sirasinda. */
export const CHARS = Object.keys(GLYPHS).join("");
export const GLYPH_COUNT = CHARS.length;                 /* === 98 */

const ATLAS_COLS = 16;
const ATLAS_ROWS = Math.ceil(GLYPH_COUNT / ATLAS_COLS);  /* === 7 */
const ATLAS_W = ATLAS_COLS * FONT_W;                     /* === 96 */
const ATLAS_H = ATLAS_ROWS * FONT_H;                     /* === 70 */

/* Kume disi karakterler icin sessiz ikame. Anlam kaybi olmayan tipografik
 * varyantlar ve TR/EN metinlerinde kazara gecen aksanlar. */
const NORMALIZE = {
  " ": " ", " ": " ", " ": " ", " ": " ", "­": "-",
  "‘": "'", "’": "'", "‚": ",", "′": "'",
  "“": "\"", "”": "\"", "„": "\"", "″": "\"",
  "–": "-", "−": "-", "•": ".", "·": ".",
  "⁄": "/", "‐": "-", "‑": "-",
  "â": "a", "Â": "A", "ê": "e", "Ê": "E", "î": "i", "Î": "İ",
  "ô": "o", "Ô": "O", "û": "u", "Û": "U", "é": "e", "É": "E",
  "à": "a", "è": "e", "ñ": "n", "ß": "s", "ı̇": "i"
};

/* ---------------- maske: tema BAGIMSIZ, bir kez kurulur ---------------- */
/* MASK[g*FONT_W*FONT_H + y*FONT_W + x] = slotIndex + 1  (0 = seffaf) */
let MASK = null;
let BLANK = null;      /* Uint8Array — glif tamamen bos mu (bosluk atlanir) */
let INDEX = null;      /* Map<char, glyphIndex> */
let FALLBACK = 0;

function buildMask() {
  if (MASK) return;
  MASK = new Uint8Array(GLYPH_COUNT * FONT_W * FONT_H);
  BLANK = new Uint8Array(GLYPH_COUNT);
  INDEX = new Map();
  for (let g = 0; g < GLYPH_COUNT; g++) {
    const ch = CHARS.charAt(g);
    INDEX.set(ch, g);
    const spec = GLYPHS[ch];
    const colon = spec.indexOf(":");
    if (colon < 0) { BLANK[g] = 1; continue; }          /* "" => bos glif */
    const start = parseInt(spec.slice(0, colon), 10) | 0;
    const rows = spec.slice(colon + 1).split("/");
    const base = g * FONT_W * FONT_H;
    let any = 0;
    for (let r = 0; r < rows.length; r++) {
      const y = start + r;
      if (y < 0 || y >= FONT_H) continue;
      const row = rows[r];
      for (let x = 0; x < FONT_W && x < row.length; x++) {
        const c = row.charAt(x);
        if (c === ".") continue;
        const slot = parseInt(c, 16);
        if (!(slot >= 0 && slot <= 15)) continue;
        MASK[base + y * FONT_W + x] = slot + 1;
        any = 1;
      }
    }
    if (!any) BLANK[g] = 1;
  }
  const q = INDEX.get("?");
  FALLBACK = q === undefined ? 0 : q;
}

/* ---------------- font ornegi ---------------- */
export function createFont(palette) {
  buildMask();

  let pal = palette;
  /* slot -> tint'lenmis atlas canvas. Tema degisiminde tamami atilir. */
  const tints = new Map();
  const MAX_TINTS = 10;
  let dead = false;

  function bake(slot) {
    const cv = document.createElement("canvas");
    cv.width = ATLAS_W;
    cv.height = ATLAS_H;
    const c = cv.getContext("2d");                       /* alpha ZORUNLU */
    c.imageSmoothingEnabled = false;
    const img = c.createImageData(ATLAS_W, ATLAS_H);
    const out = new Uint32Array(img.data.buffer);
    const colors = pal.u32;                              /* Uint32Array(16) */
    for (let g = 0; g < GLYPH_COUNT; g++) {
      if (BLANK[g]) continue;
      const gx = (g % ATLAS_COLS) * FONT_W;
      const gy = ((g / ATLAS_COLS) | 0) * FONT_H;
      const base = g * FONT_W * FONT_H;
      for (let y = 0; y < FONT_H; y++) {
        const si = base + y * FONT_W;
        const di = (gy + y) * ATLAS_W + gx;
        for (let x = 0; x < FONT_W; x++) {
          const v = MASK[si + x];
          if (v) out[di + x] = colors[slot < 0 ? v - 1 : slot];
        }
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

  function atlasFor(slot) {
    const key = slot < 0 ? -1 : (slot | 0) & 15;
    let cv = tints.get(key);
    if (cv) return cv;
    if (tints.size >= MAX_TINTS) {                       /* en eskiyi birak */
      const first = tints.keys().next();
      if (!first.done) {
        const old = tints.get(first.value);
        if (old) { old.width = 1; old.height = 1; }
        tints.delete(first.value);
      }
    }
    cv = bake(key);
    tints.set(key, cv);
    return cv;
  }

  function glyphIndex(ch) {
    let g = INDEX.get(ch);
    if (g !== undefined) return g;
    const n = NORMALIZE[ch];
    if (n !== undefined) {
      g = INDEX.get(n);
      if (g !== undefined) return g;
    }
    return FALLBACK;
  }

  function measure(str, scale) {
    const s = (scale | 0) || 1;
    const n = str.length;
    return n === 0 ? 0 : (n * PITCH - TRACKING) * s;
  }

  function draw(ctx, str, x, y, slot, scale) {
    if (dead) return 0;
    const s = (scale | 0) || 1;
    const cv = atlasFor(slot === undefined ? 0 : slot);
    const step = PITCH * s;
    const dw = FONT_W * s, dh = FONT_H * s;
    let dx = Math.round(x);
    const dy = Math.round(y);
    for (let i = 0; i < str.length; i++) {
      const g = glyphIndex(str.charAt(i));
      if (!BLANK[g]) {
        ctx.drawImage(cv,
          (g % ATLAS_COLS) * FONT_W, ((g / ATLAS_COLS) | 0) * FONT_H, FONT_W, FONT_H,
          dx, dy, dw, dh);
      }
      dx += step;
    }
    return str.length === 0 ? 0 : (str.length * PITCH - TRACKING) * s;
  }

  function drawCentered(ctx, str, cx, y, slot, scale) {
    const w = measure(str, scale);
    return draw(ctx, str, Math.round(cx - w / 2), y, slot, scale);
  }

  /** Kelime kaydirma. `out` dizisi TEMIZLENIR ve satirlarla doldurulur.
   *  String allocation yapar — sahne kurulumunda cagir, update dongusunde ASLA. */
  function wrapInto(str, maxChars, out) {
    out.length = 0;
    const lim = maxChars | 0;
    if (lim <= 0) { out.push(str); return 1; }
    let line = "";
    let i = 0;
    while (i <= str.length) {
      const sp = str.indexOf(" ", i);
      const end = sp < 0 ? str.length : sp;
      const word = str.slice(i, end);
      if (word.length) {
        if (!line.length) {
          line = word.length <= lim ? word : word.slice(0, lim);
          if (word.length > lim) { out.push(line); line = word.slice(lim); }
        } else if (line.length + 1 + word.length <= lim) {
          line += " " + word;
        } else {
          out.push(line);
          line = word.length <= lim ? word : word.slice(0, lim);
        }
      }
      if (sp < 0) break;
      i = sp + 1;
    }
    if (line.length) out.push(line);
    if (!out.length) out.push("");
    return out.length;
  }

  return {
    FONT_W, FONT_H, PITCH, ADVANCE, TRACKING,
    ROW_BASELINE, ROW_CAP_TOP, ROW_X_TOP,
    draw, drawCentered, measure, wrapInto, atlasFor,
    has(ch) { return INDEX.has(ch); },
    maxCharsForWidth,
    setPalette(next) {
      pal = next;
      for (const cv of tints.values()) { cv.width = 1; cv.height = 1; }
      tints.clear();
    },
    destroy() {
      dead = true;
      for (const cv of tints.values()) { cv.width = 1; cv.height = 1; }
      tints.clear();
    }
  };
}

export default createFont;
