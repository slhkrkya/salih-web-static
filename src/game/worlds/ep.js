/* ==========================================================================
 * game/worlds/ep.js — EP "SLUG OTOYOLU / SLUG HIGHWAY" (tepe hiz 15,11 tile/s)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §5.5. 2 segment (A7 "Tam Momentum Rampası",
 * C7 "Bitiş Çizgisi"), toplam 320 path-tile, 30 s traversal. Glif 0, yalan
 * karo %0, medyan revert 0 (Defter A) — bu MERGE sonrasi bir "zafer turu",
 * yeni bir sinav degil. B7 "Çok Şeritli Otoyol" v0'da KESİLDİ (§5.5 not:
 * v0'un 3 pip'i icin ayri bir sayim şeridi gerekmiyor, `f1seal` kapisi
 * C7 girisinde tek bir etikete indirgendi).
 *
 * SADELESTIRME (rapor icin acikca isaretli): "kurtarılan gri sakinler yol
 * kenarında yürür" (§6.1) — W1 E1'in 20.000 sakin sayacına gorsel karsilik —
 * tam bir NPC sürüsü/animasyon DEGIL; boot.js'in cizdigi sabit, yavas
 * kayan bir nokta dizisidir (residentDecor). Sayisal sozlesme yok, kitap
 * bir "kac NPC" saymiyor.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { buildWorldEP } from "./worlds/ep.js";
 *   const { map, labels, spawnX, spawnY, residentDecor, segments, finishX,
 *           finishY, exitX } = buildWorldEP();
 *     residentDecor : [{x,y}] — yol kenarinda sabit "kurtarilan sakin" noktalari
 *     finishX       : bu x'e ulasilinca 5 s'lik epilog kapanisi baslar
 *     finishY       : cizginin oturdugu zemin y'si (boot.js drawFinishLine)
 * ========================================================================== */

import { TILE } from "../scale.js";
import { createLevelBuilder } from "../levelbuilder.js";

export const TOP_SPEED_TILE_PER_SEC = 15.1125;   /* PHYS.ep (§8.1) turetilmis: 2.60*1.55*60/16 */

function padTo(lb, segStart, target) {
  const have = lb.cursor - segStart;
  const remain = target - have;
  if (remain > 0) lb.pushFlat(remain);
  else if (remain < 0) throw new Error(`worlds/ep: segment tasti (${have} > ${target})`);
}

export function buildWorldEP() {
  const lb = createLevelBuilder({ startFloorY: 8 });
  const segments = [];
  const residentDecor = [];

  const sSpawn = lb.pushFlat(6);
  const spawnX = (sSpawn.x0 + 1) * TILE;
  const spawnY = lb.curFloorY * TILE - 20;

  /* ================================================= A7 — Tam Momentum Rampası
   * Glif yok, yalan karo yok, cukur yok — sadece rampalarla hiz hissi. */
  const aStart = lb.cursor;
  lb.label(lb.cursor, "Hızlan ve aşağı in", "Build up speed and drop down");
  lb.pushFlat(20);
  lb.pushSteepRamp(6, false);           /* 45° inis, curFloorY +6 */
  lb.pushFlat(30);
  lb.pushShallowRamp(8, "(");           /* 22,5° gorsel doku, zemin degismez */
  lb.pushFlat(30);
  lb.pushSteepRamp(6, true);            /* 45° cikis, curFloorY -6 (basa doner) */
  lb.pushFlat(20);
  lb.pushShallowRamp(8, ")");           /* 22,5° gorsel doku, zemin degismez */
  padTo(lb, aStart, 180);
  segments.push({ id: "a7", tileCount: lb.cursor - aStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= C7 — Bitiş Çizgisi */
  const cStart = lb.cursor;
  lb.label(lb.cursor, "Son kapı", "Last gate");
  const sRes = lb.pushFlat(40);
  for (let i = 0; i < 6; i++) {
    residentDecor.push({ x: (sRes.x0 + 4 + i * 6) * TILE, y: lb.curFloorY * TILE - 10 });
  }
  padTo(lb, cStart, 140);
  segments.push({ id: "c7", tileCount: lb.cursor - cStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* MERGE'de bulunan gercek hatanin ayni sinifi: bitis tetigini harita
   * kenarina (F_SOLID) OTURTMA — govde genisligi (HIT_W=8px) yuzunden
   * oyuncu duvara kadar ~pxW-9 px'e ulasabilir. Tetigi C7 butcesinin
   * TAM sonunda sabitle. Ardina, "epilog kapanışı" (§6.1: ufka dogru
   * surekli kayma + zoom-out, 6 s) icin GENIS bir dekoratif duzluk
   * eklenir — kamera bu alana dogru kayar, oyuncu bu kismi hic
   * "oynamaz" (glif/tehlike yok, sadece sahne). */
  const finishX = lb.cursor * TILE;
  const finishY = lb.curFloorY * TILE;
  /* TABELA CIZGININ YANINDA DURMALI (oyun testiyle raporlandi: "en sonda
   * bitis cizgisi gorunmuyor"). Eskiden bu etiket `padTo`'dan ONCE, yani
   * C7'nin 40. karosunda konuyordu — gercek bitis cizgisinden 100 tile
   * (1600 px) once. Oyuncu yaziyi okuyor, hicbir sey gormuyor, sonra bombos
   * bir duzlukte oyun kendiliginden bitiyordu. Etiket artik finishX yakalandiktan
   * SONRA konur (tile butcesine girmez, padTo'dan sonradir) ve boot.js ayrica
   * gorunur bir damali cizgi cizer. */
  /* 20 tile geride: metin (36 karakter = 251 px) cizginin direğiyle YATAY
   * olarak cakismasin, ama okunacak kadar yakin dursun. */
  lb.label(lb.cursor - 20, "Bitiş çizgisi: dokun ve oyunu bitir", "Finish line: touch it to end the game");
  lb.pushFlat(60);

  const { map, labels } = lb.build();

  return {
    map, labels, spawnX, spawnY,
    enemySpawns: [],
    residentDecor,
    segments,
    finishX,
    finishY,
    exitX: finishX
  };
}

export default buildWorldEP;
