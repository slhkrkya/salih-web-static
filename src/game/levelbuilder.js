/* ==========================================================================
 * game/levelbuilder.js — SEGMENT-TABANLI PROSEDUREL SEVIYE INSA ARACI
 * ==========================================================================
 *
 * testroom.js'te (Faz 1) dogrulanan teknigin genellestirilmisi: bos bir
 * karakter izgarasi, segment fonksiyonlariyla doldurulur, tek bir
 * tilemap.decode() cagrisiyla haritaya cevrilir. worlds/w0.js ve worlds/w1.js
 * bunu kullanir — testroom.js KENDI kopyasini korur (zaten dogrulanmis debug
 * araci, riske atilmaz).
 *
 * 45 DERECE RAMPA NOTU (testroom.js'te bulunan gercek hata, burada da
 * gecerli): tilemap.js `fillRamp`'te tan(45)=1 oldugu icin AYNI SATIRDA
 * ust uste N '/' karakteri sawtooth uretir. pushSteepRamp bunu DIYAGONAL
 * dizerek dogru cozer; pushShallowRamp (22,5 derece) TEK SATIRDA calisir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createLevelBuilder } from "./levelbuilder.js";
 *
 *   const lb = createLevelBuilder({ startFloorY, safetyRows });
 *   lb.seg(widthTiles) -> {x0,x1}                    (cursor ilerletir)
 *   lb.label(xTiles, tr, en, kind?)                   (curFloorY-3 satirinda)
 *     kind : null | "hazard" | "ground" | "shoot" — cizim ipucu (bkz. asagi)
 *   lb.pushFlat(widthTiles, opts?)                    ({gap:true} -> zemin yok)
 *   lb.pushLedge(widthTiles, upTiles)
 *   lb.pushSteepRamp(runTiles, up) -> curFloorY GUNCELLENIR
 *   lb.pushShallowRamp(runTiles, ch)
 *   lb.pushCeiling(widthTiles, gapRows)
 *   lb.put(x, y, ch)                                  (dogrudan hucre yazimi — spawn karakterleri icin)
 *   lb.get cursor / get curFloorY (okunur, disaridan set edilebilir: lb.curFloorY = N)
 *   lb.build() -> { map, labels }                     (tilemap.decode cikisi + etiket listesi)
 * ========================================================================== */

import { CHUNK_H } from "./scale.js";
import { decode, F_HAZARD, F_MOLTEN } from "./tilemap.js";

/* build()'in en altta doldurdugu "duser agi" satir sayisi (tum dunyalarda
 * ayni H=CHUNK_H) — boot.js bunun USTUNU (yuzeyini) bir HAZARD esigi olarak
 * kullanir (respawnIfFallen), cunku bu taban hicbir zaman guvenli/yuruneblir
 * zemin olmasi amaclanmamisti (bkz. boot.js HAZARD_FLOOR_Y notu). */
export const SAFETY_ROWS = 2;

export function createLevelBuilder(opts) {
  const o = opts || {};
  const H = o.height || CHUNK_H;
  const safetyRows = o.safetyRows === undefined ? SAFETY_ROWS : o.safetyRows;
  let cursor = 0;
  let curFloorY = o.startFloorY === undefined ? 8 : o.startFloorY;
  const labels = [];
  const cells = new Map();

  /* Otomatik ucurum-kenari isaretleme: her pushFlat(w,{gap:true}) cukurun
   * GIRIS kenarini (varsa) hemen isaretler; cikis kenari ise cukurdan SONRA
   * gelen ilk zemin-ureten cagriya `pendingLip` ile aktarilir. Hicbir dunya
   * dosyasina dokunmadan TUM cukurlarda calisir (bkz. plan Faz 1). */
  const hazardLip = [];
  let pendingLip = false;

  function markLip(x, y) { hazardLip.push({ x, y }); }

  function put(x, y, ch) { cells.set(x + "," + y, ch); }

  function seg(widthTiles) {
    const s = { x0: cursor, x1: cursor + widthTiles };
    cursor += widthTiles;
    return s;
  }

  /* `kind` (opsiyonel): null | "hazard" | "ground" | "shoot" — boot.js etiketin
   * onune hangi ikonu/rengi koyacagini BUNDAN okur. Eskiden metin icinde
   * "REVERT"/"KABUK" gibi terimler ARANIYORDU; metin sadelesince o eslesme
   * sessizce kopardi. Tur artik etiketin kendi verisidir. */
  function label(xTiles, tr, en, kind) {
    labels.push({ x: xTiles * 16, y: (curFloorY - 3) * 16, tr, en, kind: kind || null });
  }

  function pushFlat(widthTiles, opts) {
    const s = seg(widthTiles);
    const gap = !!(opts && opts.gap);
    if (!gap) {
      for (let x = s.x0; x < s.x1; x++) put(x, curFloorY, "#");
      if (pendingLip) { markLip(s.x0, curFloorY); pendingLip = false; }
    } else {
      const beforeKey = (s.x0 - 1) + "," + curFloorY;
      if (cells.has(beforeKey)) markLip(s.x0 - 1, curFloorY);
      pendingLip = true;
    }
    return s;
  }

  function pushLedge(widthTiles, upTiles) {
    const s = seg(widthTiles);
    const ledgeY = curFloorY - upTiles;
    for (let x = s.x0; x < s.x1; x++) put(x, ledgeY, "#");
    if (pendingLip) { markLip(s.x0, ledgeY); pendingLip = false; }
    return s;
  }

  function pushShallowRamp(runTiles, ch) {
    const s = seg(runTiles);
    for (let x = s.x0; x < s.x1; x++) put(x, curFloorY, ch);
    if (pendingLip) { markLip(s.x0, curFloorY); pendingLip = false; }
    return s;
  }

  function pushSteepRamp(runTiles, up) {
    const s = seg(runTiles);
    const ch = up ? "/" : "\\";
    for (let i = 0; i < runTiles; i++) {
      const rowY = up ? curFloorY - i - 1 : curFloorY + i;
      put(s.x0 + i, rowY, ch);
    }
    if (pendingLip) { markLip(s.x0, up ? curFloorY - 1 : curFloorY); pendingLip = false; }
    curFloorY += up ? -runTiles : runTiles;
    return s;
  }

  function pushCeiling(widthTiles, gapRows) {
    const s = seg(widthTiles);
    const ceilY = curFloorY - gapRows;
    for (let x = s.x0; x < s.x1; x++) put(x, ceilY, "#");
    return s;
  }

  function build() {
    const width = cursor;
    const rows = new Array(H).fill(null).map(() => new Array(width).fill("."));
    cells.forEach((ch, key) => {
      const [xs, ys] = key.split(",");
      const x = +xs, y = +ys;
      if (x >= 0 && x < width && y >= 0 && y < H) rows[y][x] = ch;
    });
    for (let y = H - safetyRows; y < H; y++) {
      for (let x = 0; x < width; x++) rows[y][x] = "#";
    }
    const rowStrings = rows.map((r) => r.join(""));
    const map = decode({ w: width, h: H, rows: rowStrings, spawns: {} });
    for (const lip of hazardLip) {
      if (lip.x >= 0 && lip.x < width && lip.y >= 0 && lip.y < H) {
        map.flags[lip.y * width + lip.x] |= F_HAZARD;
      }
    }
    /* "guvenlik agi" tabani hicbir zaman yuruneblir zemin OLMASI amaclanmadi
     * (bkz. boot.js HAZARD_FLOOR_Y notu) — normal zemin gibi GORUNMESIN diye
     * F_MOLTEN ile isaretlenir (render.js bunu eritilmis/oldurucu bir yuzey
     * olarak cizer, bkz. plan). */
    for (let y = H - safetyRows; y < H; y++) {
      for (let x = 0; x < width; x++) map.flags[y * width + x] |= F_MOLTEN;
    }
    return { map, labels };
  }

  return {
    seg, label, pushFlat, pushLedge, pushShallowRamp, pushSteepRamp, pushCeiling, put, build,
    get cursor() { return cursor; },
    get curFloorY() { return curFloorY; },
    set curFloorY(v) { curFloorY = v; }
  };
}

export default createLevelBuilder;
