/* ==========================================================================
 * game/tilemap.js — tile verisi, HEIGHTMAP uretimi, AABB+heightmap geometrisi
 * ==========================================================================
 *
 * KOORDINAT SISTEMI (butun motorda ayni):
 *   Dunya birimi = PIKSEL, float. +x saga, +y ASAGI. Orijin haritanin sol ust kosesi.
 *   Tile koordinati: tx = Math.floor(x / TILE), ty = Math.floor(y / TILE).
 *   groundY = ty * TILE + heightmap[localX]        (§4.5 — dondurulmus formul)
 *   heightmap 16 (= TILE) girisli, deger 0..TILE. 0 = yuzey karonun tepesinde,
 *   TILE = bu karo icinde YUZEY YOK (kati madde yok).
 *
 * DOM KULLANMAZ. node'dan import edilebilir (headless test icin sart).
 *
 * ARAYUZ SOZLESMESI
 * -----------------
 * Bayraklar (Uint16 bit alani, per-CELL):
 *   F_SOLID  F_ONEWAY  F_SHAPED  F_ICE  F_TAR  F_SPRING  F_BOOST  F_FAKE
 *   F_SEAL   F_HAZARD
 *   F_SOLID  : her yonden bloklar, heightmap sorgulanmaz.
 *   F_ONEWAY : YALNIZ yukaridan asagi bloklar (`=`).
 *   F_SHAPED : heightmap tasir; yuzeyin ALTI kati. Rampa/tumsek boyle ifade edilir.
 *   Digerleri yuzey EFEKTI bayragidir; physics.js F_ICE'i kendisi uygular,
 *   F_SPRING/F_BOOST/F_FAKE/F_SEAL yalnizca `body.groundFlags` + event olarak
 *   RAPOR EDILIR — sayilari entities/scenes sahiplenir (bkz. physics.js EV_*).
 *
 * `map` veri sekli (POJO, decode/createMap uretir):
 *   {
 *     w, h        : tile cinsinden genislik/yukseklik
 *     pxW, pxH    : piksel cinsinden (w*TILE, h*TILE)
 *     tiles       : Uint8Array(w*h)   — tile id (T_*)
 *     flags       : Uint16Array(w*h)  — per-cell bayrak (hizli sorgu icin kopya)
 *     shapes      : Uint8Array(w*h)   — SHAPE havuzu indeksi (0 = yuzey yok)
 *     edgeSide    : Uint16 — tx < 0 veya tx >= w icin dondurulen bayrak (default F_SOLID)
 *     edgeBottom  : Uint16 — ty >= h icin (default 0 = cukur/olum)
 *     ents        : Array  — decode zamani uretilen spawn tanimlari (bkz. decode)
 *   }
 *   ty < 0 (gokyuzu) HER ZAMAN 0 doner — tavan yoktur.
 *
 * SHAPE HAVUZU: modul-global, dedupe'lu, decode zamani buyur. Update dongusunde
 * ASLA buyumez (allocation yok). shapeHeight()/shapeAngle() ile okunur.
 *
 * Sorgu fonksiyonlari (hepsi allocation-free, out-param'li):
 *   flagsAt(map,tx,ty) -> Uint16
 *   tileAt(map,tx,ty)  -> Uint8
 *   heightAt(map,tx,ty,px) -> 0..TILE   (px = DUNYA pikseli, tile icine kirpilir)
 *   surfaceYAt(map,tx,ty,px) -> dunya y | -1 (yuzey yok)
 *   angleAt(map,tx,ty) -> radyan, ISARETLI: >0 => zemin +x yonunde DUSER
 *   solidPoint(map,x,y) -> bool   (F_ONEWAY sayilmaz)
 *   blockedColumn(map,px,yTop,yBot,feetY,stepUpTol) -> bool   (yatay supurme)
 *   blockedRowDown(map,xL,xR,py,prevFeetY,out) -> bool        (asagi supurme)
 *   blockedRowUp(map,xL,xR,py) -> bool                        (yukari supurme)
 *   probeGround(map,xL,xR,feetY,up,down,out) -> bool           (zemin arama)
 *
 * Uretim fonksiyonlari:
 *   decode(chunk) -> map          (§10.3 formati, rampalar VERI olarak uretilir)
 *   createMap(w,h) -> map
 *   blitChunk(dst, chunkOrMap, tx, ty, mirror) -> dst
 *   joinChunks([chunk...]) -> map (yatay birlestirme, seviye kurulumu)
 *   makeFlatRoom(w,h,floorTy) -> map     (headless test icin)
 *   makeTestRoom() -> map                (W0 test odasi: duz + 45 + 22.5 + bosluk)
 * ========================================================================== */

import { TILE, CHUNK_W, CHUNK_H } from "./scale.js";

/* ---------------------------------------------------------------- bayraklar */
export const F_SOLID  = 1 << 0;
export const F_ONEWAY = 1 << 1;
export const F_SHAPED = 1 << 2;
export const F_ICE    = 1 << 3;
export const F_TAR    = 1 << 4;
export const F_SPRING = 1 << 5;
export const F_BOOST  = 1 << 6;
export const F_FAKE   = 1 << 7;
export const F_SEAL   = 1 << 8;
export const F_HAZARD = 1 << 9;
export const F_TEMP   = 1 << 10;  /* render-only: verbs.js'in gecici REWRITE tile'i (bkz. plan Faz 4) */
export const F_MOLTEN = 1 << 11;  /* render-only: levelbuilder.js'in "guvenlik agi" tabani — dusup revert
                                    * tetikledigin zemin artik normal zemin gibi GORUNMESIN diye isaretli. */

/* Ustunde yuruyebilecegin her sey */
export const F_STANDABLE = F_SOLID | F_ONEWAY | F_SHAPED;

/* ------------------------------------------------------------------ tile id */
export const T_EMPTY   = 0;
export const T_SOLID   = 1;
export const T_ONEWAY  = 2;
export const T_S45U    = 3;   /* `/` 45 derece, +x yonunde YUKSELIR */
export const T_S45D    = 4;   /* `\` 45 derece, +x yonunde DUSER */
export const T_S22U    = 5;   /* `(` 22.5 derece yukselen */
export const T_S22D    = 6;   /* `)` 22.5 derece dusen */
export const T_FAKE    = 7;   /* `~` yalan karo */
export const T_SEAL    = 8;   /* `^` muhur karosu */
export const T_ICE     = 9;   /* `_` kaygan GUID */
export const T_TAR     = 10;  /* `T` katran */
export const T_SPRING  = 11;  /* `%` yay */
export const T_BOOST   = 12;  /* `>` boost pad */
export const TILE_COUNT = 13;

export const TILE_FLAGS = new Uint16Array(TILE_COUNT);
TILE_FLAGS[T_EMPTY]  = 0;
TILE_FLAGS[T_SOLID]  = F_SOLID;
TILE_FLAGS[T_ONEWAY] = F_ONEWAY;
TILE_FLAGS[T_S45U]   = F_SHAPED;
TILE_FLAGS[T_S45D]   = F_SHAPED;
TILE_FLAGS[T_S22U]   = F_SHAPED;
TILE_FLAGS[T_S22D]   = F_SHAPED;
TILE_FLAGS[T_FAKE]   = F_SOLID | F_FAKE;   /* dokununca entities cozer */
TILE_FLAGS[T_SEAL]   = F_SEAL;             /* muhurlenene kadar KATI DEGIL */
TILE_FLAGS[T_ICE]    = F_SOLID | F_ICE;
TILE_FLAGS[T_TAR]    = F_SOLID | F_TAR;
TILE_FLAGS[T_SPRING] = F_SOLID | F_SPRING;
TILE_FLAGS[T_BOOST]  = F_SOLID | F_BOOST;

/* Rampa tanimi: [aciDerece, yukseliyorMu] */
const RAMP_DEF = Object.create(null);
RAMP_DEF[T_S45U] = [45,   true];
RAMP_DEF[T_S45D] = [45,   false];
RAMP_DEF[T_S22U] = [22.5, true];
RAMP_DEF[T_S22D] = [22.5, false];

/* -------------------------------------------------------- karakter -> tile */
/* §5.3'un 18 tile sinifindan GEOMETRIK olanlar. Entity isaretcileri
 * (`o * ! A H F C @`) tile degil SPAWN'dir; DEFAULT_SPAWNS'a bak. */
export const CHAR_TILE = new Uint8Array(128);
function bindChar(ch, id) { CHAR_TILE[ch.charCodeAt(0)] = id; }
bindChar(".", T_EMPTY);  bindChar(" ", T_EMPTY);
bindChar("#", T_SOLID);
bindChar("=", T_ONEWAY);
bindChar("/", T_S45U);   bindChar("\\", T_S45D);
bindChar("(", T_S22U);   bindChar(")", T_S22D);
bindChar("~", T_FAKE);
bindChar("^", T_SEAL);
bindChar("_", T_ICE);
bindChar("T", T_TAR);
bindChar("%", T_SPRING);
bindChar(">", T_BOOST);

/* chunk.spawns yazmayan yazarlar icin standart isaretciler (§5.3).
 * chunk.spawns AYNI karakteri tanimliyorsa O kazanir (§10.3 onceligi). */
export const DEFAULT_SPAWNS = {
  "o": { t: "commit" },
  "*": { t: "pip" },
  "!": { t: "spawner" },
  "A": { t: "anchor" },
  "H": { t: "hook" },
  "F": { t: "fork" },
  "C": { t: "calm" },
  "@": { t: "exit" }
};

/* ====================================================== SHAPE (heightmap) havuzu */
export const SHAPE_NONE = 0;   /* yuzey yok: heightmap tamami TILE */
export const SHAPE_FLAT = 1;   /* duz tepe: heightmap tamami 0, aci 0 */

let shapeCap = 64;
let shapeH = new Int16Array(shapeCap * TILE);
let shapeA = new Float32Array(shapeCap);
let shapeCount = 0;

const scratch = new Int16Array(TILE);

function growShapes() {
  shapeCap *= 2;
  const h = new Int16Array(shapeCap * TILE); h.set(shapeH); shapeH = h;
  const a = new Float32Array(shapeCap);      a.set(shapeA); shapeA = a;
}

/* Icerige gore dedupe eder. YALNIZ decode/uretim zamani cagrilir. */
function internShape(buf, angle) {
  for (let s = 0; s < shapeCount; s++) {
    if (shapeA[s] !== angle) continue;
    const base = s * TILE;
    let same = true;
    for (let i = 0; i < TILE; i++) { if (shapeH[base + i] !== buf[i]) { same = false; break; } }
    if (same) return s;
  }
  if (shapeCount >= shapeCap) growShapes();
  const s = shapeCount++;
  const base = s * TILE;
  for (let i = 0; i < TILE; i++) shapeH[base + i] = buf[i];
  shapeA[s] = angle;
  return s;
}

/* 0 = SHAPE_NONE, 1 = SHAPE_FLAT — sabit sira, kod bunlara isimle guveniyor. */
(function seedShapes() {
  for (let i = 0; i < TILE; i++) scratch[i] = TILE;
  internShape(scratch, 0);                 /* -> 0 */
  for (let i = 0; i < TILE; i++) scratch[i] = 0;
  internShape(scratch, 0);                 /* -> 1 */
})();

export function shapeHeight(si, lx) { return shapeH[si * TILE + lx]; }
export function shapeAngle(si) { return shapeA[si]; }
export function shapePoolSize() { return shapeCount; }

/* ------------------------------------------------------- RAMPA URETIMI (veri) */
/* §4.5: "22,5 ve 45 derece rampalar VERI olarak uretilir, elle cizilmez."
 *
 * ANKRAJ KURALI (mimari karar; sozlesme yalniz "veri olarak uretilir" der):
 *   tan(aci) >= 1  -> ankraj TILE BASINA. 45 derece boylece tek karoda 15..0
 *      gider; yazar `/` karolarini kosegen dizerek merdiven kurar ve `///`
 *      yazmasi da tutarli kalir.
 *   tan(aci) <  1  -> ankraj KOSU BASINA. Yukselen kosunun SAG ucunda heightmap 0,
 *      dusen kosunun SOL ucunda heightmap 0 olur; ara degerler GERCEK aciyla
 *      dogrusaldir. 22.5 derece tam sayi tile'a oturmadigi icin komsu satir
 *      kosulari arasinda en fazla 3 px dikis kalir — ledgeTolerance (3 px) ve
 *      groundSnap (6 px) bunu yutar, gorunmez.
 *
 * ONEMLI: physics.js egim ivmesini ROUNDLANMIS heightmap turevinden DEGIL,
 * shape'in BILDIRILEN acisindan hesaplar. Boylece 22.5 derece fizikte tam
 * 22.5 derecedir; yuvarlama yalniz carpisma yuzeyini etkiler (<= 0.5 px). */
function fillRamp(out, angleDeg, up, runTiles, tileIdx) {
  const t = Math.tan(angleDeg * Math.PI / 180);
  const perTile = t >= 1;
  const runPx = (perTile ? 1 : runTiles) * TILE;
  const off = perTile ? 0 : tileIdx * TILE;
  for (let i = 0; i < TILE; i++) {
    const p = off + i;
    let h = Math.round(up ? (runPx - 1 - p) * t : p * t);
    if (h < 0) h = 0; else if (h > TILE) h = TILE;
    out[i] = h;
  }
  /* Isaretli aci: zemin +x yonunde DUSUYORSA pozitif (slopeAccel +x'e iter). */
  return (up ? -1 : 1) * angleDeg * Math.PI / 180;
}

/* Dis kullanim (editor.js / dogrulayici): tek karonun heightmap'ini uretir. */
export function makeRampShape(angleDeg, up, runTiles, tileIdx) {
  const a = fillRamp(scratch, angleDeg, up, runTiles || 1, tileIdx || 0);
  return internShape(scratch, a);
}

/* Aynalanmis shape (tekrar kurali eksen (a): yatay aynalama). */
function mirrorShape(si) {
  const base = si * TILE;
  for (let i = 0; i < TILE; i++) scratch[i] = shapeH[base + TILE - 1 - i];
  return internShape(scratch, -shapeA[si]);
}

const MIRROR_TILE = new Uint8Array(TILE_COUNT);
(function seedMirror() {
  for (let i = 0; i < TILE_COUNT; i++) MIRROR_TILE[i] = i;
  MIRROR_TILE[T_S45U] = T_S45D; MIRROR_TILE[T_S45D] = T_S45U;
  MIRROR_TILE[T_S22U] = T_S22D; MIRROR_TILE[T_S22D] = T_S22U;
})();

/* ===================================================================== harita */
export function createMap(w, h) {
  const n = w * h;
  return {
    w: w, h: h, pxW: w * TILE, pxH: h * TILE,
    tiles: new Uint8Array(n),
    flags: new Uint16Array(n),
    shapes: new Uint8Array(n),
    edgeSide: F_SOLID,     /* seviye kenari duvar — oyuncu haritadan cikamaz */
    edgeBottom: 0,         /* alt kenar cukur; olum scenes.js'in isi */
    ents: []
  };
}

/* §10.3 decode. Rampalar satir icindeki KOSU'lardan uretilir. */
export function decode(chunk) {
  const w = chunk.w || CHUNK_W, h = chunk.h || CHUNK_H;
  const rows = chunk.rows;
  const map = createMap(w, h);
  const spawns = chunk.spawns || null;

  for (let y = 0; y < h; y++) {
    const row = rows[y] || "";
    for (let x = 0; x < w; x++) {
      const ch = x < row.length ? row.charAt(x) : ".";
      const sp = (spawns && spawns[ch]) || DEFAULT_SPAWNS[ch] || null;
      const i = y * w + x;
      if (sp) {
        /* §10.3: spawn karakteri tile'i BOSALTIR. */
        map.tiles[i] = T_EMPTY; map.flags[i] = 0; map.shapes[i] = SHAPE_NONE;
        map.ents.push({ t: sp.t, cmd: sp.cmd, face: sp.face, key: sp.key,
                        x: x * TILE, y: y * TILE, tx: x, ty: y, ch: ch });
        continue;
      }
      const id = CHAR_TILE[ch.charCodeAt(0) & 127];
      map.tiles[i] = id;
      map.flags[i] = TILE_FLAGS[id];
      map.shapes[i] = (TILE_FLAGS[id] & F_SHAPED) ? SHAPE_FLAT : defaultShape(id);
    }
  }
  bakeRamps(map);
  return map;
}

function defaultShape(id) {
  const f = TILE_FLAGS[id];
  if (f & F_SOLID) return SHAPE_FLAT;
  if (f & F_ONEWAY) return SHAPE_FLAT;
  return SHAPE_NONE;
}

/* Satir satir rampa kosularini bulur ve heightmap'lerini URETIR. */
function bakeRamps(map) {
  const w = map.w, h = map.h;
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const id = map.tiles[y * w + x];
      const def = RAMP_DEF[id];
      if (!def) { x++; continue; }
      let run = 1;
      while (x + run < w && map.tiles[y * w + x + run] === id) run++;
      for (let k = 0; k < run; k++) {
        const a = fillRamp(scratch, def[0], def[1], run, k);
        map.shapes[y * w + x + k] = internShape(scratch, a);
      }
      x += run;
    }
  }
}

/* Kaynak (chunk veya map) hedefe kopyalanir. mirror = yatay aynalama. */
export function blitChunk(dst, src, tx, ty, mirror) {
  const m = src.tiles ? src : decode(src);
  for (let y = 0; y < m.h; y++) {
    const dy = ty + y;
    if (dy < 0 || dy >= dst.h) continue;
    for (let x = 0; x < m.w; x++) {
      const sx = mirror ? (m.w - 1 - x) : x;
      const dx = tx + x;
      if (dx < 0 || dx >= dst.w) continue;
      const si = y * m.w + sx, di = dy * dst.w + dx;
      const id = mirror ? MIRROR_TILE[m.tiles[si]] : m.tiles[si];
      dst.tiles[di] = id;
      dst.flags[di] = TILE_FLAGS[id] | (m.flags[si] & ~(F_SOLID | F_ONEWAY | F_SHAPED));
      let sh = m.shapes[si];
      if (mirror && sh > SHAPE_FLAT) sh = mirrorShape(sh);
      dst.shapes[di] = sh;
    }
  }
  for (let e = 0; e < m.ents.length; e++) {
    const s = m.ents[e];
    const ex = mirror ? (m.w - 1 - s.tx) : s.tx;
    dst.ents.push({ t: s.t, cmd: s.cmd, face: mirror && s.face ? -s.face : s.face, key: s.key,
                    x: (tx + ex) * TILE, y: (ty + s.ty) * TILE,
                    tx: tx + ex, ty: ty + s.ty, ch: s.ch });
  }
  return dst;
}

/* Chunk listesini yatay birlestirir (scenes.js seviye kurar). */
export function joinChunks(list, mirrorFlags) {
  let w = 0, h = 0;
  for (let i = 0; i < list.length; i++) {
    w += list[i].w || CHUNK_W;
    const ch = list[i].h || CHUNK_H;
    if (ch > h) h = ch;
  }
  const map = createMap(w, h);
  let cx = 0;
  for (let i = 0; i < list.length; i++) {
    blitChunk(map, list[i], cx, 0, mirrorFlags ? !!mirrorFlags[i] : false);
    cx += list[i].w || CHUNK_W;
  }
  return map;
}

/* ================================================================== sorgular */
export function flagsAt(map, tx, ty) {
  if (ty < 0) return 0;                       /* gokyuzu: tavan YOK */
  if (ty >= map.h) return map.edgeBottom;
  if (tx < 0 || tx >= map.w) return map.edgeSide;
  return map.flags[ty * map.w + tx];
}
export function tileAt(map, tx, ty) {
  if (ty < 0 || ty >= map.h || tx < 0 || tx >= map.w) return T_EMPTY;
  return map.tiles[ty * map.w + tx];
}
function shapeIdxAt(map, tx, ty) {
  if (ty < 0 || ty >= map.h || tx < 0 || tx >= map.w) return SHAPE_FLAT;
  return map.shapes[ty * map.w + tx];
}
/* px = DUNYA pikseli. Karo icine kirpilir; sinir dışı cagri guvenlidir. */
export function heightAt(map, tx, ty, px) {
  const si = shapeIdxAt(map, tx, ty);
  if (si === SHAPE_NONE) return TILE;
  let lx = Math.floor(px) - tx * TILE;
  if (lx < 0) lx = 0; else if (lx >= TILE) lx = TILE - 1;
  return shapeH[si * TILE + lx];
}
export function surfaceYAt(map, tx, ty, px) {
  const f = flagsAt(map, tx, ty);
  if (!(f & F_STANDABLE)) return -1;
  if (f & (F_SOLID | F_ONEWAY)) return ty * TILE;
  const hh = heightAt(map, tx, ty, px);
  if (hh >= TILE) return -1;
  return ty * TILE + hh;
}
export function angleAt(map, tx, ty) {
  const f = flagsAt(map, tx, ty);
  if (!(f & F_SHAPED)) return 0;
  return shapeA[shapeIdxAt(map, tx, ty)];
}

/* Tek nokta kati mi? F_ONEWAY SAYILMAZ (yalniz asagi supurmede is gorur). */
export function solidPoint(map, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const f = flagsAt(map, tx, ty);
  if (f & F_SOLID) return true;
  if (!(f & F_SHAPED)) return false;
  const hh = heightAt(map, tx, ty, x);
  if (hh >= TILE) return false;
  return y >= ty * TILE + hh;
}

/* --- YATAY SUPURME ------------------------------------------------------ */
/* Onde giden KOLON'u [yTop, yBot] dikey aralikta test eder.
 * stepUpTol: yuzeyi feetY'nin bu kadar USTUNDE olan F_SHAPED karo TIRMANILABILIR
 * sayilir ve bloklamaz — physics.js sonra probeGround ile ustune kaldirir.
 * Bu, 45 derece rampaya kosarken duvara carpma hissini onleyen tek mekanizma. */
export function blockedColumn(map, px, yTop, yBot, feetY, stepUpTol) {
  const tx = Math.floor(px / TILE);
  const ty0 = Math.floor(yTop / TILE), ty1 = Math.floor(yBot / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    const f = flagsAt(map, tx, ty);
    if (f & F_SOLID) return true;
    if (!(f & F_SHAPED)) continue;             /* F_ONEWAY yatayda bloklamaz */
    const hh = heightAt(map, tx, ty, px);
    if (hh >= TILE) continue;
    const top = ty * TILE + hh, bot = (ty + 1) * TILE - 1;
    if (yBot < top || yTop > bot) continue;    /* ortusme yok */
    if (top >= feetY - stepUpTol) continue;    /* tirmanilabilir egim */
    return true;
  }
  return false;
}

/* --- ASAGI SUPURME ------------------------------------------------------ */
/* py = kutunun YENI alt kenar pikseli. prevFeetY = harekete BASLARKEN alt kenar
 * (F_ONEWAY yalniz yukaridan gecilebilir kuralinin tek dayanagi).
 * out.y = oturulacak yuzeyin dunya y'si, out.angle, out.flags. */
export function blockedRowDown(map, xL, xR, py, prevFeetY, out) {
  const ty = Math.floor(py / TILE);
  let best = -1, bestA = 0, bestF = 0;
  const x0 = Math.floor(xL), x1 = Math.floor(xR);
  for (let tx = Math.floor(xL / TILE); tx <= Math.floor(xR / TILE); tx++) {
    const f = flagsAt(map, tx, ty);
    if (!(f & F_STANDABLE)) continue;
    let sy = -1;
    if (f & (F_SOLID | F_ONEWAY)) {
      sy = ty * TILE;
    } else {
      /* Sekilli karo: kutunun ORTUSEN piksel aralıginda EN YUKSEK yuzey. */
      let cL = tx * TILE; if (cL < x0) cL = x0;
      let cR = tx * TILE + TILE - 1; if (cR > x1) cR = x1;
      for (let cx = cL; cx <= cR; cx++) {
        const hh = heightAt(map, tx, ty, cx);
        if (hh >= TILE) continue;
        const s = ty * TILE + hh;
        if (sy < 0 || s < sy) sy = s;
      }
    }
    if (sy < 0) continue;
    if (py < sy) continue;                       /* daha ustundeyiz */
    if ((f & F_ONEWAY) && prevFeetY > sy) continue;  /* alttan geciyoruz */
    if (best < 0 || sy < best) { best = sy; bestA = angleAt(map, tx, ty); bestF = f; }
  }
  if (best < 0) return false;
  if (out) { out.y = best; out.angle = bestA; out.flags = bestF; }
  return true;
}

/* --- YUKARI SUPURME ---------------------------------------------------- */
/* py = kutunun YENI ust kenar pikseli. F_ONEWAY tavan yapmaz. */
export function blockedRowUp(map, xL, xR, py) {
  const ty = Math.floor(py / TILE);
  const x0 = Math.floor(xL), x1 = Math.floor(xR);
  for (let tx = Math.floor(xL / TILE); tx <= Math.floor(xR / TILE); tx++) {
    const f = flagsAt(map, tx, ty);
    if (f & F_SOLID) return true;
    if (!(f & F_SHAPED)) continue;
    let cL = tx * TILE; if (cL < x0) cL = x0;
    let cR = tx * TILE + TILE - 1; if (cR > x1) cR = x1;
    for (let cx = cL; cx <= cR; cx++) {
      const hh = heightAt(map, tx, ty, cx);
      if (hh >= TILE) continue;
      if (py >= ty * TILE + hh) return true;     /* sekilli karonun ALTI kati */
    }
  }
  return false;
}

/* --- ZEMIN ARAMA ------------------------------------------------------- */
/* [feetY - up, feetY + down] penceresinde EN YUKSEK gecerli yuzeyi bulur.
 * Satirlar yukaridan asagi taranir; ilk bulunan en yuksek olandir (ortulme
 * boylece kendiliginden cozulur). xL..xR piksel-piksel ornekler: HIT_W 8 px
 * oldugu icin en fazla ~15 ornek, butce icinde.
 * out.y / out.angle / out.flags doldurulur. */
export function probeGround(map, xL, xR, feetY, up, down, out) {
  const yMin = feetY - up, yMax = feetY + down;
  const ty0 = Math.floor(yMin / TILE), ty1 = Math.floor(yMax / TILE);
  let best = -1, bestA = 0, bestF = 0;
  const x0 = Math.floor(xL), x1 = Math.floor(xR);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let cx = x0; cx <= x1; cx++) {
      const tx = Math.floor(cx / TILE);
      const f = flagsAt(map, tx, ty);
      if (!(f & F_STANDABLE)) continue;
      let sy;
      if (f & (F_SOLID | F_ONEWAY)) sy = ty * TILE;
      else {
        const hh = heightAt(map, tx, ty, cx);
        if (hh >= TILE) continue;
        sy = ty * TILE + hh;
      }
      if (sy < yMin || sy > yMax) continue;
      if (best < 0 || sy < best) { best = sy; bestA = angleAt(map, tx, ty); bestF = f; }
    }
    if (best >= 0) break;             /* ust satirda bulduysak alttakiler ortuludur */
  }
  if (best < 0) return false;
  if (out) { out.y = best; out.angle = bestA; out.flags = bestF; }
  return true;
}

/* ============================================== headless test haritalari */
/* Duz oda: taban floorTy satirinda kati. simulateJump() bunu kullanir. */
export function makeFlatRoom(w, h, floorTy) {
  const W = w || CHUNK_W, H = h || CHUNK_H;
  const fy = floorTy === undefined ? H - 2 : floorTy;
  const map = createMap(W, H);
  for (let y = fy; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      map.tiles[i] = T_SOLID; map.flags[i] = F_SOLID; map.shapes[i] = SHAPE_FLAT;
    }
  }
  return map;
}

/* W0 test odasi: duz kosu + 45 derece rampa + 22.5 derece rampa + bosluk +
 * tek yon platform + tavan. Denetim ajani ziplama/egim olcumlerini burada yapar. */
export function makeTestRoom() {
  const rows = [
    "########################################",
    "#......................................#",
    "#......................................#",
    "#......................................#",
    "#..........====........................#",
    "#......................................#",
    "#.................................../..#",
    "#................................../##.#",
    "#.........................(((((../###..#",
    "#.....................(((((#####/####..#",
    "#..........._____.....#################",
    "#####################.##################",
    "#####################.##################",
    "#####################.##################",
    "########################################",
    "########################################",
    "########################################"
  ];
  return decode({ w: CHUNK_W, h: CHUNK_H, rows: rows, spawns: {} });
}

export default { decode, createMap, joinChunks, blitChunk, makeFlatRoom, makeTestRoom };
