/* game/scale.js — TEK olcek kaynagi (§4.1, K2, K7).
 * Bu dosyanin disinda hicbir modulde ciplak 16/272/480/40/17 olcek literal'i BULUNMAZ.
 * Sayilar DONDURULMUS sozlesmedir: degistirilemez, yuvarlanamaz, "iyilestirilemez". */
export const TILE   = 16;
export const VIEW_W = 480;          // 30 tile
export const VIEW_H = 272;          // 17 tile
export const CHAR_W = 10, CHAR_H = 16;
export const HIT_W  = 8,  HIT_H  = 14;
export const CHUNK_W = 40, CHUNK_H = 17;
export function pickScale(cssW, cssH, dpr) {
  return Math.max(1, Math.floor(Math.min(cssW * dpr / VIEW_W, cssH * dpr / VIEW_H)));
}
