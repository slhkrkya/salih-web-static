/* ==========================================================================
 * game/pixart.js — PALET-INDEKSLI PIX SATIRLARINI ATLASA PISIRME (paylasilan)
 * ==========================================================================
 *
 * sprites.js'in (Salih) PIX->maske->atlas teknigi buraya CIKARILDI ki
 * creaturesprites.js (dusman/boss sprite'lari) AYNI kodu tekrar yazmadan
 * kullanabilsin (bkz. plan Faz 3). Davranis DEGISMEDI — sadece boyut
 * (frameCount/w/h) parametre oldu.
 *
 * PIX ALFABESI (font.js/sprites.js ile ayni): "." = seffaf, "0".."f" = 16
 * slotluk palet indeksi (render.js SLOT tablosu).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { compilePix, bakeAtlas } from "./pixart.js";
 *
 *   compilePix(framesByIndex, frameCount, w, h) -> Uint8Array
 *     framesByIndex[i] : i. kare icin h satirlik dizi, her satir TAM w
 *     karakter. Tema-bagimsiz, BIR KEZ cagrilir (modul yuklenirken).
 *
 *   bakeAtlas(mask, frameCount, w, h, palette) -> HTMLCanvasElement
 *     palette : render.js'in createPalette() cikisi (pal.u32 kullanilir).
 *     Donen atlas frameCount*w genislik, h yukseklikte; kare i, x=[i*w,(i+1)*w).
 * ========================================================================== */

const HEX = "0123456789abcdef";

function slotOf(ch) {
  if (ch === ".") return -1;
  const i = HEX.indexOf(ch);
  return i < 0 ? -1 : i;
}

export function compilePix(framesByIndex, frameCount, w, h) {
  const mask = new Uint8Array(frameCount * w * h);
  for (let p = 0; p < frameCount; p++) {
    const rows = framesByIndex[p];
    if (!rows) continue;
    for (let y = 0; y < h; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < w; x++) {
        const s = slotOf(row[x] || ".");
        if (s >= 0) mask[(p * h + y) * w + x] = s + 1;
      }
    }
  }
  return mask;
}

export function bakeAtlas(mask, frameCount, w, h, palette) {
  const cv = document.createElement("canvas");
  cv.width = w * frameCount;
  cv.height = h;
  const c = cv.getContext("2d");            /* alpha ZORUNLU */
  c.imageSmoothingEnabled = false;
  const img = c.createImageData(cv.width, cv.height);
  const out = new Uint32Array(img.data.buffer);
  const colors = palette.u32;
  for (let p = 0; p < frameCount; p++) {
    const ox = p * w;
    for (let y = 0; y < h; y++) {
      const si = (p * h + y) * w;
      const di = y * cv.width + ox;
      for (let x = 0; x < w; x++) {
        const v = mask[si + x];
        if (v) out[di + x] = colors[v - 1];
      }
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

export default { compilePix, bakeAtlas };
