/* ==========================================================================
 * game/faketiles.js — YALAN TABELA: catlayan ve cöken sahte zemin
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §5.3 (C1 "Embed Yuzeyi + Sahte Tabela"),
 * tilemap.js T_FAKE (`~`, F_SOLID | F_FAKE).
 *
 * ==========================================================================
 * BULUNAN GERCEK EKSIK (oyun testiyle raporlandi: "sahte denilen zeminlerde
 * bir durum olusmuyor, ne hasar ne degisik bir sey")
 * ==========================================================================
 * Karo tipi, tile bayragi (F_FAKE), ayirt edici cizimi (render.js'in hazard
 * yikamasi + kesikli cerceve + golge kaymasi), fizik olayi (EV_FAKE) ve hatta
 * UYARI METINLERI (GAME_TEXT `lies`, 5 satir) HEPSI vardi — ama zincirin son
 * halkasi yoktu: EV_FAKE'i okuyan tek yer 6 parcacik patlatiyor, karo ise
 * SONSUZA KADAR KATI kaliyordu. Yani oyunun "sahte" dedigi zemin, gercek
 * zeminden hicbir bakimdan farkli degildi; `lies` satirlarini da hicbir modul
 * okumuyordu (assertGameText onlari dogruluyor ve prose butcesine sayiyor —
 * yazilmis ama baglanmamis metin).
 *
 * Bu modul son halkayi kurar:
 *
 *   1. TEMAS   — ustune basildigi an karo CATLAMAYA baslar (telegraf).
 *   2. CATLAK  — sabit sayida kare; ekranda titreyen/buyuyen catlak deseni.
 *                Sayac oyuncu KARODAN AYRILSA DA durmaz: karar verilmistir.
 *   3. COKME   — karo katiligini kaybeder (tiles/flags/shapes sifirlanir),
 *                ustunde duran duser.
 *   4. GERI GELME — sabit sayida kare sonra karo AYNEN geri yuklenir.
 *
 * ADALET (D-1/D-4 "haksiz ceza yok"): karo zaten UZAKTAN ayirt edilebilir
 * ciziliyor, parkur tabelasi uyariyor, catlak bir telegraf ve KOLAY MOD onu
 * uzatir. Tepe hizda uzerinden gecen oyuncu (16 px'i ~5 karede kat eder)
 * hicbir zaman icine dusmez — cokme onun ARKASINDA olur. Ceza yalnizca
 * DURAN ya da GERI DONEN oyuncuyadir, ve o da GERI AL'dir (kalici kayip yok).
 *
 * HARITA GERI YUKLEME (verbs.js'te bulunan ayni hata sinifi): dunyalar boot'ta
 * BIR KEZ kurulup tekrar kullanildigi icin, cokmus bir karonun izi
 * temizlenmezse bolum atlayinca/bastan baslayinca haritada KALICI DELIK
 * birakirdi. Her cokme orijinal tile/flags/shape degerini SAKLAR; reset() ve
 * setMap() bunlari geri yazar.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createFakeTiles } from "./faketiles.js";
 *
 *   const fake = createFakeTiles();
 *   fake.setMap(map)          -> dunya degisince (eski haritayi ONCE onarir)
 *   fake.setBalanced(bool)    -> KOLAY MOD: catlak telegrafi uzar
 *   fake.update(body)         -> her sabit adimda, step()'ten SONRA
 *   fake.crackedThisFrame     -> null | {x, y}  yeni catlayan karonun MERKEZI
 *   fake.collapsedThisFrame   -> null | {x, y}  bu karede coken karonun merkezi
 *   fake.draw(ctx, camX, camY, palette)   -> catlak deseni + geri gelme izi
 *   fake.reset()              -> tum karolari haritaya geri yukler
 *   fake.activeCount          -> telemetri/test icin
 * ========================================================================== */

import { TILE } from "./scale.js";
import { F_FAKE } from "./tilemap.js";
import { SLOT } from "./render.js";
import { balancedTelegraph } from "./a11y.js";

const CRACK_FRAMES = 26;        /* ~0,43 s telegraf (KOLAY MOD'da uzar) */
const RESPAWN_FRAMES = 240;     /* 4 s sonra karo geri gelir */
const CAP = 16;                 /* ayni anda izlenen karo (C1'de 5 tane var) */

const PH_CRACK = 1, PH_GONE = 2;

export function createFakeTiles(opts) {
  const o = opts || {};
  const crackBase = o.crackFrames === undefined ? CRACK_FRAMES : o.crackFrames;
  const respawnFrames = o.respawnFrames === undefined ? RESPAWN_FRAMES : o.respawnFrames;

  const cell = new Int32Array(CAP).fill(-1);
  const timer = new Int32Array(CAP);
  const total = new Int32Array(CAP);
  const phase = new Uint8Array(CAP);
  const savedTile = new Uint8Array(CAP);
  const savedFlags = new Uint16Array(CAP);
  const savedShape = new Uint8Array(CAP);

  let map = null;
  let balanced = false;
  let activeCount = 0;

  /* Kare basina nesne uretilmez (§10.5): iki sabit cikti tamponu. */
  const CRACKED = { x: 0, y: 0 };
  const COLLAPSED = { x: 0, y: 0 };
  let crackedThisFrame = null;
  let collapsedThisFrame = null;

  function crackFrames() { return balancedTelegraph(crackBase, balanced); }

  function slotOf(i) {
    for (let k = 0; k < CAP; k++) if (cell[k] === i) return k;
    return -1;
  }
  function freeSlot() {
    for (let k = 0; k < CAP; k++) if (cell[k] === -1) return k;
    return -1;
  }

  /* Karoyu haritaya AYNEN geri yazar ve yuvayi bosaltir. Cokme, reset ve
   * setMap ayni yoldan gecer — "geri yukleme" tek bir yerde yasar. */
  function restore(k, targetMap) {
    const i = cell[k];
    if (i === -1) return;
    const m = targetMap || map;
    if (m && phase[k] === PH_GONE) {
      m.tiles[i] = savedTile[k];
      m.flags[i] = savedFlags[k];
      m.shapes[i] = savedShape[k];
    }
    cell[k] = -1;
    timer[k] = 0;
    total[k] = 0;
    phase[k] = 0;
    activeCount--;
  }

  function collapse(k) {
    const i = cell[k];
    savedTile[k] = map.tiles[i];
    savedFlags[k] = map.flags[i];
    savedShape[k] = map.shapes[i];
    map.tiles[i] = 0;
    map.flags[i] = 0;
    map.shapes[i] = 0;
    phase[k] = PH_GONE;
    timer[k] = respawnFrames;
    total[k] = respawnFrames;
  }

  function startCrack(i, tx, ty) {
    if (slotOf(i) !== -1) return false;      /* zaten catliyor ya da cokmus */
    const k = freeSlot();
    if (k === -1) return false;              /* kapasite doldu: sessizce yok say */
    cell[k] = i;
    phase[k] = PH_CRACK;
    timer[k] = crackFrames();
    total[k] = timer[k];
    activeCount++;
    CRACKED.x = tx * TILE + TILE * 0.5;
    CRACKED.y = ty * TILE;
    crackedThisFrame = CRACKED;
    return true;
  }

  /* Govde 8 px genisliginde, yani IKI kolona birden basabilir; ikisi de
   * sahteyse ikisi de catlar (oyuncu gercekten ikisinin ustunde duruyor). */
  function touch(body) {
    if (!map || !(body.groundFlags & F_FAKE)) return;
    const ty = Math.floor((body.y + body.h) / TILE);
    if (ty < 0 || ty >= map.h) return;
    const tx0 = Math.floor(body.x / TILE);
    const tx1 = Math.floor((body.x + body.w - 1) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= map.w) continue;
      const i = ty * map.w + tx;
      if (!(map.flags[i] & F_FAKE)) continue;
      startCrack(i, tx, ty);
    }
  }

  function update(body) {
    crackedThisFrame = null;
    collapsedThisFrame = null;
    if (!map) return;

    touch(body);

    for (let k = 0; k < CAP; k++) {
      if (cell[k] === -1) continue;
      timer[k]--;
      if (timer[k] > 0) continue;
      if (phase[k] === PH_CRACK) {
        const i = cell[k];
        const tx = i % map.w, ty = (i / map.w) | 0;
        collapse(k);
        COLLAPSED.x = tx * TILE + TILE * 0.5;
        COLLAPSED.y = ty * TILE;
        collapsedThisFrame = COLLAPSED;
      } else {
        restore(k);
      }
    }
  }

  /* Dunya degisiminde ONCE eski haritayi onarir — yoksa cokmus karolar o
   * dunyaya donuldugunde kalici delik olarak durur. */
  function setMap(next) {
    if (next === map) return;
    for (let k = 0; k < CAP; k++) restore(k, map);
    map = next || null;
  }

  function reset() {
    for (let k = 0; k < CAP; k++) restore(k, map);
  }

  function setBalanced(v) { balanced = !!v; }

  function draw(ctx, camX, camY, palette) {
    if (!map) return;
    for (let k = 0; k < CAP; k++) {
      if (cell[k] === -1) continue;
      const i = cell[k];
      const tx = i % map.w, ty = (i / map.w) | 0;
      const sx = Math.round(tx * TILE - camX);
      const sy = Math.round(ty * TILE - camY);
      if (sx < -TILE || sx > 640) continue;

      if (phase[k] === PH_CRACK) {
        /* Ilerleme 0 -> 1 arttikca hem catlak KOLLARI uzar hem de karo
         * titrer: "bu daha ne kadar dayanir" sorusu gozle olculebilsin. */
        const t = total[k] > 0 ? 1 - timer[k] / total[k] : 1;
        const jitter = t > 0.55 ? ((timer[k] & 1) ? 1 : -1) : 0;
        const cx = sx + TILE * 0.5 + jitter, cy = sy + TILE * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25 + t * 0.55;
        ctx.fillStyle = palette.css[SLOT.HAZARD];
        const arm = Math.round(2 + t * 6);
        ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - arm, 2, arm * 2);
        ctx.fillRect(Math.round(cx) - arm, Math.round(cy) - 1, arm * 2, 2);
        ctx.fillRect(Math.round(cx) - arm, Math.round(cy) - arm, 2, 2);
        ctx.fillRect(Math.round(cx) + arm - 2, Math.round(cy) + arm - 2, 2, 2);
        ctx.restore();
      } else {
        /* Cokmus karo: sonuk kesikli cerceve. "Burada zemin VARDI ve geri
         * gelecek" bilgisi bedava olmali, yoksa geri donen oyuncu neyin
         * degistigini anlamaz. */
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = palette.css[SLOT.INK_SOFT];
        for (let d = 0; d < TILE; d += 4) {
          ctx.fillRect(sx + d, sy, 2, 1);
          ctx.fillRect(sx + d, sy + TILE - 1, 2, 1);
          ctx.fillRect(sx, sy + d, 1, 2);
          ctx.fillRect(sx + TILE - 1, sy + d, 1, 2);
        }
        ctx.restore();
      }
    }
  }

  return {
    setMap, setBalanced, update, draw, reset,
    get crackedThisFrame() { return crackedThisFrame; },
    get collapsedThisFrame() { return collapsedThisFrame; },
    get activeCount() { return activeCount; }
  };
}

export default createFakeTiles;
