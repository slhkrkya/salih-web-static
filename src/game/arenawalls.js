/* ==========================================================================
 * game/arenawalls.js — PATRONUN ORDUGU GECICI DUVARLAR
 * ==========================================================================
 *
 * SON SINAV (X1) patronu AYNA'nin kimligi tek cumle: OYUNCUNUN YAPTIGINI
 * YAPAR. Oyuncu Q ile onune zemin koyar; AYNA da ayni sekilde haritaya karo
 * yazar — ama onu SIPER ve KAFES olarak kullanir. Duvar F_SOLID oldugu icin:
 *
 *   - oyuncunun MERMISI ona carpip soner (enemies.js solidAt),
 *   - oyuncunun kendisi uzerine cikabilir/arkasina saklanabilir,
 *   - patrona giden atis hattini kapatir.
 *
 * Cevabi da oyuncunun elinde: duvara ates etmek onu KIRAR (breakAt). Yani
 * "senin yetenegini bana karsi kullaniyor" ile "onu geri sokebilirim" ayni
 * dongude yasar.
 *
 * ==========================================================================
 * HARITA GERI YUKLEME (faketiles.js ve verbs.js'te bulunan AYNI hata sinifi)
 * ==========================================================================
 * Dunyalar boot'ta BIR KEZ kurulup tekrar kullaniliyor. Haritaya yazilan bir
 * karonun izi temizlenmezse bolum atlayinca / bastan baslayinca o karo
 * SONSUZA KADAR orada kalir — dovus alani her tekrar girişte biraz daha
 * dolar. Her karo orijinal tile/flags/shape degerini SAKLAR; reset(),
 * setMap() ve omur sonu AYNI restore() yolundan gecer.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createArenaWalls } from "./arenawalls.js";
 *
 *   const walls = createArenaWalls();
 *   walls.setMap(map)                 -> dunya degisince (eski haritayi ONCE onarir)
 *   walls.place(tx, ty, frames)       -> bool (hucre bossa yazar)
 *   walls.breakAt(x, y)               -> bool (dunya px; o hucredeki duvari kirar)
 *   walls.update()                    -> her sabit adimda; omru dolani geri yukler
 *   walls.draw(ctx, camX, camY, pal)  -> "birazdan gidiyor" titremesi
 *   walls.reset()                     -> hepsini haritaya geri yukler
 *   walls.count
 * ========================================================================== */

import { TILE } from "./scale.js";
import { F_SOLID, F_TEMP, T_SOLID } from "./tilemap.js";
import { SLOT } from "./render.js";

const CAP = 12;            /* ayni anda ayakta durabilecek duvar karosu */
const FADE_FRAMES = 36;    /* son 36 karede titrer: "gidiyor" bilgisi bedava */

export function createArenaWalls(opts) {
  const o = opts || {};
  const cap = o.cap === undefined ? CAP : o.cap;

  const cell = new Int32Array(cap).fill(-1);
  const life = new Int32Array(cap);
  const total = new Int32Array(cap);
  const savedTile = new Uint8Array(cap);
  const savedFlags = new Uint16Array(cap);
  const savedShape = new Uint8Array(cap);

  let map = null;
  let count = 0;

  function slotOfCell(i) {
    for (let k = 0; k < cap; k++) if (cell[k] === i) return k;
    return -1;
  }

  /* Karoyu haritaya AYNEN geri yazar. Omur sonu, kirilma, reset ve setMap
   * bu TEK yoldan gecer — "geri yukleme" tek bir yerde yasar. */
  function restore(k, targetMap) {
    const i = cell[k];
    if (i === -1) return;
    const m = targetMap || map;
    if (m) {
      m.tiles[i] = savedTile[k];
      m.flags[i] = savedFlags[k];
      m.shapes[i] = savedShape[k];
    }
    cell[k] = -1;
    life[k] = 0;
    total[k] = 0;
    count--;
  }

  function freeSlot() {
    for (let k = 0; k < cap; k++) if (cell[k] === -1) return k;
    /* Kapasite doldu: EN ESKI (omru en az kalan) duvar once haritadan silinir,
     * sonra yuvasi devralinir. verbs.js'te bulunan "ezilen karonun izi
     * kayboluyor, karo sonsuza kadar kaliyor" sizintisinin ayni onlemi. */
    let oldest = 0;
    for (let k = 1; k < cap; k++) if (life[k] < life[oldest]) oldest = k;
    restore(oldest);
    return oldest;
  }

  function place(tx, ty, frames) {
    if (!map) return false;
    if (tx < 0 || tx >= map.w || ty < 0 || ty >= map.h) return false;
    const i = ty * map.w + tx;
    if (map.flags[i] & F_SOLID) return false;   /* zaten dolu (dunya zemini ya da baska duvar) */
    const k = freeSlot();
    cell[k] = i;
    savedTile[k] = map.tiles[i];
    savedFlags[k] = map.flags[i];
    savedShape[k] = map.shapes[i];
    map.tiles[i] = T_SOLID;
    /* F_TEMP: render.js bunu "gecici zemin" dokusuyla cizer — oyuncunun Q ile
     * koydugu karoyla AYNI gorunur. Bilincli: duvarin "senin yetenegin" oldugu
     * bakisla anlasilsin. */
    map.flags[i] = F_SOLID | F_TEMP;
    map.shapes[i] = 0;
    life[k] = frames;
    total[k] = frames;
    count++;
    return true;
  }

  /* Dunya pikselinde verilen noktadaki duvari kirar. Mermi kati bir seye
   * carptiginda cagrilir; DUNYA zeminine carpan mermi burada `false` alir ve
   * hicbir sey olmaz (yalniz bu modulun yazdigi karolar kirilabilir). */
  function breakAt(x, y) {
    if (!map) return false;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || tx >= map.w || ty < 0 || ty >= map.h) return false;
    const k = slotOfCell(ty * map.w + tx);
    if (k === -1) return false;
    restore(k);
    return true;
  }

  function update() {
    if (!map) return;
    for (let k = 0; k < cap; k++) {
      if (cell[k] === -1) continue;
      life[k]--;
      if (life[k] <= 0) restore(k);
    }
  }

  function setMap(next) {
    if (next === map) return;
    for (let k = 0; k < cap; k++) restore(k, map);
    map = next || null;
  }

  function reset() {
    for (let k = 0; k < cap; k++) restore(k, map);
  }

  /* Karolarin KENDISI zaten renderer.drawMap tarafindan ciziliyor (gercek
   * tile'lar). Buraya yalnizca omur bilgisi eklenir: son yarim saniyede
   * kenarlari titrer, boylece "bekleyeyim mi, dolanayim mi" sorusu ekrandan
   * cevaplanabilir. */
  function draw(ctx, camX, camY, palette) {
    if (!map) return;
    for (let k = 0; k < cap; k++) {
      if (cell[k] === -1) continue;
      const i = cell[k];
      const tx = i % map.w, ty = (i / map.w) | 0;
      const sx = Math.round(tx * TILE - camX), sy = Math.round(ty * TILE - camY);
      if (sx < -TILE || sx > 640) continue;
      const fresh = total[k] - life[k];
      if (fresh < 8) {
        /* Dogus parlamasi: "az once burada zemin YOKTU" bilgisi. */
        ctx.save();
        ctx.globalAlpha = 0.55 * (1 - fresh / 8);
        ctx.fillStyle = palette.css[SLOT.LIGHT];
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.restore();
      }
      if (life[k] > FADE_FRAMES) continue;
      ctx.save();
      ctx.globalAlpha = 0.20 + (1 - life[k] / FADE_FRAMES) * 0.45;
      ctx.fillStyle = palette.css[SLOT.HAZARD];
      for (let d = 0; d < TILE; d += 4) {
        ctx.fillRect(sx + d, sy, 2, 1);
        ctx.fillRect(sx + d, sy + TILE - 1, 2, 1);
      }
      ctx.restore();
    }
  }

  return {
    setMap, place, breakAt, update, draw, reset,
    get count() { return count; }
  };
}

export default createArenaWalls;
