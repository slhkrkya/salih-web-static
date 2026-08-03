/* ==========================================================================
 * game/render.js — 16 SLOTLUK PALET, IC TAMPON, TILE CIZIMI, EKRANA BLIT
 * ==========================================================================
 *
 * §10.5 kararlari birebir:
 *   - Ic cozunurluk SABIT VIEW_W x VIEW_H. Cihaz cozunurlugune ASLA cizilmez.
 *   - Her karede TAM temizlik. Dirty rect YOK. Chunk bake YOK.
 *   - imageSmoothingEnabled = false her iki baglamda.
 *   - Cizim koordinatlari Math.round; camX/camY zaten yuvarli gelir (camera.js).
 *
 * GEOMETRI SAHIPLIGI: display canvas'inin width/height'ini LAUNCHER yazar.
 * Bu modul ASLA display.width/height'a yazmaz; launcher boyutlandirdiktan
 * sonra `setScale(s)` cagrilir (canvas resize ctx bayraklarini sifirladigi
 * icin orada yeniden kurulur).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *
 *   import { SLOT, createPalette, createRenderer } from "./render.js";
 *
 *   const pal = createPalette(colors, dark);
 *     colors : boot.js opts.getPalette() cikti sekli
 *              { bg, ink, accent, secondary, led, surface, surfaceSoft, inkSoft }
 *              (CSS renk string'leri; #rgb / #rrggbb / rgb() / rgba() kabul)
 *     dark   : boolean — eksik slotlarin turetimini etkiler
 *     ->  { u32: Uint32Array(16), css: string[16], dark }
 *         u32 NATIVE-ENDIAN RGBA'dir (ImageData'nin Uint32 goruntusuyle ayni
 *         duzen) cunku font.js dogrudan `pal.u32` ile atlas tint'liyor.
 *
 *   const r = createRenderer(displayCanvas);
 *     r.buf            : HTMLCanvasElement (VIEW_W x VIEW_H ic tampon)
 *     r.ctx            : ic tamponun 2D baglami — TUM oyun cizimi buna gider
 *     r.palette        : aktif palet (readonly kullan)
 *     r.setPalette(p)  : tema degisimi
 *     r.setScale(s)    : launcher display'i boyutladiktan SONRA
 *     r.clear(slot)    : tam temizlik (slot verilmezse SLOT.BG)
 *     r.drawMap(map,cx,cy) : gorunur tile aralIgIni cizer (heightmap dahil)
 *     r.present()      : ic tamponu ekrana tam sayi olcekle blit eder
 *     r.destroy()
 * ========================================================================== */

import { TILE, VIEW_W, VIEW_H } from "./scale.js";
import {
  F_SOLID, F_ONEWAY, F_SHAPED, F_ICE, F_TAR, F_SPRING, F_BOOST, F_FAKE,
  F_SEAL, F_HAZARD, F_TEMP, F_MOLTEN, shapeHeight
} from "./tilemap.js";

/* ---------------------------------------------------------------- slotlar */
/* 16 slot. 0-7 siteden turetilir (index.astro satir 60-75 CSS degiskenleri),
 * 8-15 sabit karakter/dunya renkleridir. font.js `slot` argumani bu tablodur. */
export const SLOT = Object.freeze({
  INK: 0,          /* kontur, kati tile govdesi */
  BG: 1,           /* gokyuzu / arka plan */
  SURFACE: 2,
  SURFACE_SOFT: 3,
  INK_SOFT: 4,     /* ikincil metin */
  ACCENT: 5,
  SECONDARY: 6,
  LED: 7,
  SKIN: 8,
  HAIR: 9,
  SHADOW: 10,
  LIGHT: 11,       /* beyaz / vurgu */
  TILE_FILL: 12,
  TILE_EDGE: 13,
  HAZARD: 14,
  BLACK: 15
});

export const SLOT_COUNT = 16;

/* -------------------------------------------------------------- renk cozme */
function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

/* CSS rengi -> [r,g,b,a] (a 0..255). Basarisizsa null. */
function parseColor(str) {
  if (typeof str !== "string") return null;
  const s = str.trim();
  if (!s) return null;
  if (s.charCodeAt(0) === 35 /* # */) {
    const hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) : 255;
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return [r, g, b, a];
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return [r, g, b, a];
    }
    return null;
  }
  /* rgb() / rgba() — site paletinde yok ama tema override'i gelirse diye */
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = clamp255(parseFloat(parts[0]));
    const g = clamp255(parseFloat(parts[1]));
    const b = clamp255(parseFloat(parts[2]));
    let a = 255;
    if (parts.length > 3) {
      const av = parseFloat(parts[3]);
      a = clamp255(av <= 1 ? av * 255 : av);
    }
    return [r, g, b, a];
  }
  return null;
}

function toCss(rgba) {
  return "#" +
    ((1 << 24) | (rgba[0] << 16) | (rgba[1] << 8) | rgba[2]).toString(16).slice(1);
}

/* Native-endian RGBA paketleme. ImageData'nin Uint32Array goruntusu platformun
 * byte sirasini kullanir; little-endian'da 0xAABBGGRR. Bir kez tespit edilir. */
const LE = (function detectLE() {
  const b = new Uint8Array(4);
  new Uint32Array(b.buffer)[0] = 0x01020304;
  return b[0] === 0x04;
})();

function packRGBA(r, g, b, a) {
  return LE
    ? (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
    : (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
}

function mix(a, b, t) {
  return [
    clamp255(a[0] + (b[0] - a[0]) * t),
    clamp255(a[1] + (b[1] - a[1]) * t),
    clamp255(a[2] + (b[2] - a[2]) * t),
    255
  ];
}

/* Yedek palet: getPalette() bos/gecersiz deger dondururse oyun renksiz kalmasin.
 * Degerler index.astro satir 62-74'teki acik/koyu tema paletlerinden alindi. */
const FALLBACK_LIGHT = {
  bg: "#FFF1E8", ink: "#1D2B53", surface: "#FFFFFF", surfaceSoft: "#F6E4D8",
  inkSoft: "#5F574F", accent: "#FF3E7A", secondary: "#0091D6", led: "#14C15A"
};
const FALLBACK_DARK = {
  bg: "#171F3D", ink: "#FDF3E9", surface: "#212a52", surfaceSoft: "#283163",
  inkSoft: "#B7B9D6", accent: "#FF6C9C", secondary: "#58C4FF", led: "#38E27C"
};

export function createPalette(colors, dark) {
  const fb = dark ? FALLBACK_DARK : FALLBACK_LIGHT;
  const c = colors || fb;
  function pick(key) {
    return parseColor(c[key]) || parseColor(fb[key]) || [255, 0, 255, 255];
  }

  const ink = pick("ink");
  const bg = pick("bg");
  const surface = pick("surface");
  const surfaceSoft = pick("surfaceSoft");
  const inkSoft = pick("inkSoft");
  const accent = pick("accent");
  const secondary = pick("secondary");
  const led = pick("led");

  /* Karakter ve dunya renkleri: hero sahnesindeki ten rengi (#E8B786) korunur,
   * geri kalan turetilir ki tema degisiminde tutarli kalsin. */
  const skin = [232, 183, 134, 255];
  const hair = dark ? [58, 63, 92, 255] : [29, 43, 83, 255];
  const shadow = mix(ink, bg, dark ? 0.72 : 0.62);
  const light = dark ? [253, 243, 233, 255] : [255, 255, 255, 255];
  /* Tile govdesi arka plandan ayrilmali ama kontur kadar sert olmamali. */
  const tileFill = dark ? mix(ink, bg, 0.80) : mix(ink, bg, 0.18);
  const tileEdge = dark ? mix(ink, bg, 0.58) : mix(ink, bg, 0.02);
  const hazard = accent;
  const black = [0, 0, 0, 255];

  const rgba = new Array(SLOT_COUNT);
  rgba[SLOT.INK] = ink;
  rgba[SLOT.BG] = bg;
  rgba[SLOT.SURFACE] = surface;
  rgba[SLOT.SURFACE_SOFT] = surfaceSoft;
  rgba[SLOT.INK_SOFT] = inkSoft;
  rgba[SLOT.ACCENT] = accent;
  rgba[SLOT.SECONDARY] = secondary;
  rgba[SLOT.LED] = led;
  rgba[SLOT.SKIN] = skin;
  rgba[SLOT.HAIR] = hair;
  rgba[SLOT.SHADOW] = shadow;
  rgba[SLOT.LIGHT] = light;
  rgba[SLOT.TILE_FILL] = tileFill;
  rgba[SLOT.TILE_EDGE] = tileEdge;
  rgba[SLOT.HAZARD] = hazard;
  rgba[SLOT.BLACK] = black;

  const u32 = new Uint32Array(SLOT_COUNT);
  const css = new Array(SLOT_COUNT);
  for (let i = 0; i < SLOT_COUNT; i++) {
    const p = rgba[i];
    u32[i] = packRGBA(p[0], p[1], p[2], p[3]);
    css[i] = toCss(p);
  }
  return { u32, css, rgba, dark: !!dark };
}

/* ------------------------------------------------------------------ cizici */
export function createRenderer(display) {
  const buf = document.createElement("canvas");
  buf.width = VIEW_W;
  buf.height = VIEW_H;
  const ctx = buf.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;

  let dctx = display.getContext("2d", { alpha: false });
  dctx.imageSmoothingEnabled = false;

  let palette = createPalette(null, false);
  let scale = 1;
  let dead = false;

  function setPalette(p) {
    if (p) palette = p;
  }

  /* Launcher display'i boyutladiktan SONRA cagrilir: canvas resize 2D durumunu
   * (imageSmoothingEnabled dahil) sifirlar, o yuzden bayrak yeniden kurulur. */
  function setScale(s) {
    scale = Math.max(1, s | 0);
    dctx = display.getContext("2d", { alpha: false });
    dctx.imageSmoothingEnabled = false;
  }

  function clear(slot) {
    ctx.fillStyle = palette.css[slot === undefined ? SLOT.BG : slot];
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /* Gorunur tile aralIgI. camX/camY dunya pikseli (yuvarlanmis gelir). */
  function drawMap(map, camX, camY) {
    if (!map) return;
    const cx = Math.round(camX) | 0;
    const cy = Math.round(camY) | 0;

    const tx0 = Math.floor(cx / TILE);
    const ty0 = Math.floor(cy / TILE);
    const tx1 = Math.floor((cx + VIEW_W - 1) / TILE);
    const ty1 = Math.floor((cy + VIEW_H - 1) / TILE);

    const cssFill = palette.css[SLOT.TILE_FILL];
    const cssEdge = palette.css[SLOT.TILE_EDGE];
    const cssOneway = palette.css[SLOT.INK_SOFT];
    const cssIce = palette.css[SLOT.SECONDARY];
    const cssTar = palette.css[SLOT.SHADOW];
    const cssSpring = palette.css[SLOT.LED];
    const cssBoost = palette.css[SLOT.ACCENT];
    const cssFake = palette.css[SLOT.SURFACE_SOFT];
    const cssSeal = palette.css[SLOT.LED];
    const cssHazard = palette.css[SLOT.HAZARD];
    const cssHazardShadow = palette.css[SLOT.SHADOW];
    const cssMoltenDeep = palette.css[SLOT.SHADOW];
    const cssMoltenBright = palette.css[SLOT.HAZARD];
    const cssMoltenGlow = palette.css[SLOT.LIGHT];
    /* Bir kez/kare: eritilmis zeminin dalga/kabarcik animasyonu icin. Tile
     * basina Date.now() cagirmak gereksiz — tek bir faz tum karoya yeter. */
    const nowSec = Date.now() / 1000;

    const w = map.w, h = map.h;
    const flags = map.flags, shapes = map.shapes;

    for (let ty = ty0; ty <= ty1; ty++) {
      if (ty < 0 || ty >= h) continue;
      const rowBase = ty * w;
      const sy = ty * TILE - cy;
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || tx >= w) continue;
        const i = rowBase + tx;
        const f = flags[i];
        if (!f) continue;
        const sx = tx * TILE - cx;

        if (f & F_MOLTEN) {
          /* "Guvenlik agi" tabani: dusup buraya deger degmez REVERT tetiklenir
           * (bkz. boot.js respawnIfFallen/HAZARD_FLOOR_Y) — normal zemin gibi
           * cizilirse oyuncu bunun oldurucu oldugunu ONCEDEN goremez. Eritilmis/
           * kaynayan bir yuzey: koyu govde + dalgali parlak "yuzey" seridi +
           * ara sira kabarcik. */
          ctx.fillStyle = cssMoltenDeep;
          ctx.fillRect(sx, sy, TILE, TILE);
          const aboveMolten = (ty > 0 ? flags[i - w] : 0) & F_MOLTEN;
          if (!aboveMolten) {
            const wave = Math.sin(nowSec * 3 + tx * 0.9) * 2;
            ctx.fillStyle = cssMoltenBright;
            ctx.fillRect(sx, Math.round(sy + 3 + wave), TILE, 3);
            if (Math.sin(nowSec * 5 + tx * 2.3) > 0.6) {
              ctx.fillStyle = cssMoltenGlow;
              ctx.fillRect(sx + 4 + ((tx * 5) % 8), Math.round(sy + 7 + wave), 2, 2);
            }
          }
        } else if (f & F_SOLID) {
          /* Govde + 2 px ust kenar: yuzeyin nerede oldugu tek bakista okunur. */
          ctx.fillStyle = cssFill;
          ctx.fillRect(sx, sy, TILE, TILE);
          const above = (ty > 0 ? flags[i - w] : 0) & F_SOLID;
          if (!above) {
            ctx.fillStyle = cssEdge;
            ctx.fillRect(sx, sy, TILE, 2);
          }
        } else if (f & F_SHAPED) {
          /* Rampa/tumsek: heightmap kolon kolon cizilir (poligon YOK). */
          const si = shapes[i];
          if (si) {
            ctx.fillStyle = cssFill;
            for (let lx = 0; lx < TILE; lx++) {
              const hh = shapeHeight(si, lx);
              if (hh >= TILE) continue;
              ctx.fillRect(sx + lx, sy + hh, 1, TILE - hh);
            }
            ctx.fillStyle = cssEdge;
            for (let lx = 0; lx < TILE; lx++) {
              const hh = shapeHeight(si, lx);
              if (hh >= TILE) continue;
              ctx.fillRect(sx + lx, sy + hh, 1, 2);
            }
          }
        } else if (f & F_ONEWAY) {
          ctx.fillStyle = cssOneway;
          ctx.fillRect(sx, sy, TILE, 3);
        }

        /* Yuzey efekti bayraklari: govdenin uzerine ince bir seritle isaretlenir.
         * physics yalnizca temasi bildirir; burada YALNIZ okunabilirlik var. */
        if (f & F_ICE) { ctx.fillStyle = cssIce; ctx.fillRect(sx, sy, TILE, 2); }
        if (f & F_TAR) { ctx.fillStyle = cssTar; ctx.fillRect(sx, sy, TILE, 3); }
        if (f & F_SPRING) { ctx.fillStyle = cssSpring; ctx.fillRect(sx + 2, sy, TILE - 4, 4); }
        if (f & F_BOOST) { ctx.fillStyle = cssBoost; ctx.fillRect(sx, sy + 5, TILE, 3); }
        if (f & F_FAKE) {
          /* YALAN TABELA (K6 3 sinyal): (1) hafif HAZARD/ACCENT yikama —
           * uzaktan hala zemine benzer ama renk tam durust degil; (2) ust+alt
           * kenarda kesikli cerceve (duz dolgu degil); (3) golge kaymasi
           * (SHADOW, 1px asagi-sag) kesikli cercevenin ARKASINDA. */
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = cssHazard;
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.restore();
          ctx.fillStyle = cssHazardShadow;
          for (let lx = 1; lx < TILE; lx += 4) {
            ctx.fillRect(sx + lx, sy + 1, 2, 1);
            ctx.fillRect(sx + lx, sy + TILE - 3, 2, 1);
          }
          ctx.fillStyle = cssFake;
          for (let lx = 0; lx < TILE; lx += 4) {
            ctx.fillRect(sx + lx, sy, 2, 1);
            ctx.fillRect(sx + lx, sy + TILE - 2, 2, 1);
          }
        }
        if (f & F_TEMP) {
          /* Gecici REWRITE (slug) tile'i: kalici zeminden AYRI okunmasi icin
           * capraz-ordu desen — "bu daha simdi yazildi, kalici degil". */
          ctx.fillStyle = palette.css[SLOT.SECONDARY];
          ctx.globalAlpha = 0.75;
          for (let ly = 2; ly < TILE; ly += 4) {
            const off = ((ly >> 2) % 2) * 4;
            ctx.fillRect(sx + off, sy + ly, 4, 2);
            ctx.fillRect(sx + off + 8, sy + ly, 4, 2);
          }
          ctx.globalAlpha = 1;
        }
        if (f & F_SEAL) {
          ctx.fillStyle = cssSeal;
          ctx.fillRect(sx + 6, sy + 4, 4, 8);
        }
        if (f & F_HAZARD) {
          /* Ucurum kenari uyari seridi (K6 3 sinyal): renk (HAZARD) + cerceve
           * stili (capraz disli desen, duz dolgu degil) + golge kaymasi
           * (SHADOW rengi 1px asagi-saga kaydirilmis ayni desen). */
          const hy = sy + 2;
          ctx.fillStyle = cssHazardShadow;
          for (let lx = 0; lx < TILE; lx += 4) ctx.fillRect(sx + lx + 1, hy + 1, 3, 2);
          ctx.fillStyle = cssHazard;
          for (let lx = 0; lx < TILE; lx += 4) ctx.fillRect(sx + lx, hy, 3, 2);
        }
      }
    }
  }

  function present() {
    if (dead) return;
    dctx.drawImage(buf, 0, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W * scale, VIEW_H * scale);
  }

  function destroy() {
    dead = true;
    buf.width = buf.height = 0;
  }

  return {
    buf,
    ctx,
    get palette() { return palette; },
    get scale() { return scale; },
    setPalette, setScale, clear, drawMap, present, destroy
  };
}

export default createRenderer;
