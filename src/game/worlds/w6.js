/* ==========================================================================
 * game/worlds/w6.js — W6 "YOKSAY / OVERRIDE" (tepe hiz 13,16 tile/s)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §5.4. 2 segment (A6, R1), toplam 320
 * path-tile, 44 s traversal (Defter A). Boss YOKSAY Faz 1 (35 s) A6 sonunda,
 * arenanin kendisi A6'nin PADDING'idir (W1 G1/KOKLAYICI ile ayni kural —
 * boss alani ayri bir tile-butce satiri degil, segmentin kalan kismidir).
 *
 * SADELESTIRME NOTU (rapor icin acikca isaretli):
 *  - "3 dünya katman katman geri açılır" (A6 girisi) SAF GORSEL bir yankı
 *    efektidir, kitap frame-frame koreografi vermez; v0 bunu tek bir etiket
 *    metnine indirger (bkz. boot.js'in "designer's discretion" emsali,
 *    KOKLAYICI'nin koni salinim egrisi ile ayni gerekce).
 *  - SICAK KANAL bir tile bayragi DEGIL, x-araligi + kare sayaci olarak
 *    kuruludur (tilemap.js §oyun motoru DONDURULMUS, yeni bayrak eklenmez;
 *    pushWall hazard'i zaten ayni desende, boot.js-seviyesinde).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { buildWorld6 } from "./worlds/w6.js";
 *   const { map, labels, spawnX, spawnY, enemySpawns, hazards, segments,
 *           bossTriggerX, mergeTriggerX, exitX } = buildWorld6();
 *     hazards.hotChannels : [{x0,x1}] — 40 kare icinde x1 gecilmezse REVERT
 *     bossTriggerX         : bu x'e ulasilinca boot.js YOKSAY'i baslatir
 *     mergeTriggerX        : R1 sonu — MERGE burada TEKLIF edilir (== exitX)
 * ========================================================================== */

import { TILE } from "../scale.js";
import { createLevelBuilder } from "../levelbuilder.js";
import { F_STANDABLE } from "../tilemap.js";

export const TOP_SPEED_TILE_PER_SEC = 13.1625;   /* PHYS.w6 (§8.1) turetilmis: 2.60*1.35*60/16 */

function padTo(lb, segStart, target) {
  const have = lb.cursor - segStart;
  const remain = target - have;
  if (remain > 0) lb.pushFlat(remain);
  else if (remain < 0) throw new Error(`worlds/w6: segment tasti (${have} > ${target})`);
}

export function buildWorld6() {
  const lb = createLevelBuilder({ startFloorY: 8 });
  const enemySpawns = [];
  const segments = [];
  const hotChannels = [];
  /* ARA COMMIT TASLARI (bulunan gercek adalet sorunu): A6 TEK bir 220 tile'lik
   * segment ve commit taslari yalnizca SEGMENT SINIRLARINDA ilerliyordu — yani
   * bu 3520 px'lik bolumun tamaminda tek bir kayit noktasi vardi (bolumun
   * basi). Sicak seritte, buzda, avcida ya da son ucurumda yapilan HER hata
   * butun koridoru bastan yurumek demekti; bot olcumunde ilerleme tam da
   * burada tikandi. Taslar tehlike kumelerinin ARDINA konur: hata hala bir
   * bedel, ama bedel o tehlikeyi tekrar denemek — bolumu bastan yurumek degil. */
  const commitStones = [];

  const sSpawn = lb.pushFlat(6);
  const spawnX = (sSpawn.x0 + 1) * TILE;
  const spawnY = lb.curFloorY * TILE - 20;

  /* ================================================= A6 — Inis */
  const aStart = lb.cursor;
  lb.label(lb.cursor, "Son bölüm. Öğrendiğin her şeyi kullan", "Last stage. Use everything you learned");
  lb.pushFlat(14);

  lb.pushFlat(5, { gap: true });                      /* ziplama 1 */
  lb.pushFlat(14);

  lb.pushFlat(5, { gap: true });                       /* ziplama 2 */
  lb.pushFlat(14);

  /* SICAK KANAL 1: kosmayi kesme, 40 kare icinde cik. GENISLIK KISITI (bulunan
   * gercek hata): maxSpeed 3.51 px/f * 40 kare = 140,4 px (~8,8 tile) MUTLAK
   * TAVAN — hizlanma rampasi (aninda tepe hiza ulasilmaz) ve girisin TAM
   * kenardan olmayabilecegi payi dusunce 6 tile (96 px, 27,4 kare) guvenli. */
  const sHot1 = lb.pushFlat(6);
  hotChannels.push({ x0: sHot1.x0 * TILE, x1: sHot1.x1 * TILE });
  lb.label(sHot1.x0, "Bu şeritte durma, hızlıca geç", "Do not stop in this lane, get through fast", "hazard");
  /* TASLAR HIZLANMA MESAFESI OLAN yerlere konur (bulunan gercek hata): ilk
   * denemede iki tas, ardindan gelen ucurumun TAM ICINE dustu — oyuncu orada
   * bosluga dogup dusuyor, ayni yere dogup tekrar dusuyor; cikilamayan bir
   * dongu. Her tas artik korudugu tehlikeden SONRAKI duzlugun ICINE, bir
   * sonraki tehlikeye en az COMMIT_RUNWAY tile kala konur ve bu kural
   * asagida BUILD ZAMANINDA dogrulanir. */
  const sAfterHot1 = lb.pushFlat(10);
  commitStones.push((sAfterHot1.x0 + 1) * TILE);

  /* DÜĞÜM koridoru: radarin AVCI dogurma davranisini ogretir */
  lb.label(lb.cursor, "Işınına girme. Girersen avcıyı J ile vur", "Stay out of its beam. If caught, shoot the hunter", "shoot");
  const sNode = lb.pushFlat(18);
  enemySpawns.push({ type: "node", x: (sNode.x0 + 9) * TILE, y: lb.curFloorY * TILE - 14, opts: { face: 1 } });
  const sAfterNode = lb.pushFlat(10);
  commitStones.push((sAfterNode.x0 + 1) * TILE);

  /* BUZ -> GENIS UCURUM (zorluk revizyonu, W1'dekinin AYNASI). Orada dogru
   * cevap FREN YAPMAKTI (bosluk ziplanamaz, koprü kurulur); burada tam
   * tersi: 6 tile = 96 px, W6 tepe hizinda (3,51 px/f x 33 kare) ziplanabilir
   * ama ANCAK hizini koruyarak. Buzda panikle fren yapan oyuncu boslugu
   * gececek hizi bulamaz. Ayni yuzey iki farkli karar uretir. */
  lb.label(lb.cursor, "Buzda hızını kesme, boşluğu uçarak geç", "Keep your speed on the ice and clear the gap", "hazard");
  const sIce = lb.pushFlat(12);
  for (let x = sIce.x0; x < sIce.x1; x++) lb.put(x, lb.curFloorY, "_");
  lb.pushFlat(6, { gap: true });
  const sAfterIce = lb.pushFlat(10);
  commitStones.push((sAfterIce.x0 + 1) * TILE);

  lb.pushFlat(6, { gap: true });                       /* ziplama 3 (5 -> 6) */
  lb.pushFlat(12);

  /* YENİDEN YAZ bosluğu: siradan ziplamayla gecilemeyecek kadar genis */
  lb.label(lb.cursor, "Zıplanmaz. Zemin döşe, ucundan zıpla", "Too wide. Lay ground, then jump off its end", "ground");
  /* bulunan gercek hata: 10 tile = 160 px. Ziplama menzili 112 px oldugu
   * icin ziplanamiyordu (dogru, tasarim boyle istiyor) ama YENİDEN YAZ ile
   * de gecilemiyordu: konan karo koprü tamamlanmadan basi cokuyordu.
   * 8 tile (128 px) hem hala 'siradan ziplamayla gecilemez' hem de TEK bir
   * metre dolusuyla (5 karo) gecilebilir: yururken bes karo dosersin, kalan
   * 3 tile'i (48 px) ziplarsin. Metrenin yavas dolmasi bu yuzden boslugu
   * kapatmaz — sadece bosa karo harcamayi pahali yapar. Segment tile
   * butcesi padTo(aStart, 220) ile korunur. */
  lb.pushFlat(8, { gap: true });
  const sAfterBridge = lb.pushFlat(12);
  commitStones.push((sAfterBridge.x0 + 1) * TILE);

  lb.pushFlat(6, { gap: true });                       /* ziplama 4 (5 -> 6) */
  lb.pushFlat(8);

  /* SICAK KANAL 2: YOKSAY'a girmeden son uyari (ayni genislik kisiti) */
  const sHot2 = lb.pushFlat(6);
  hotChannels.push({ x0: sHot2.x0 * TILE, x1: sHot2.x1 * TILE });
  lb.label(sHot2.x0, "Son şerit. Sonrasında patron var", "Last lane. The boss is right after it", "hazard");

  const bossTriggerX = lb.cursor * TILE;
  padTo(lb, aStart, 220);
  segments.push({ id: "a6", tileCount: lb.cursor - aStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= R1 — Ara Koşu */
  const rStart = lb.cursor;
  lb.label(lb.cursor, "Düz koş, bitiş öteki uçta", "Just run, the end is at the far side");
  const sIns1 = lb.pushFlat(20);
  enemySpawns.push({ type: "instruction", x: (sIns1.x0 + 12) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "STOP", face: 1 } });
  const sIns2 = lb.pushFlat(20);
  enemySpawns.push({ type: "instruction", x: (sIns2.x0 + 12) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "DOWN", face: -1 } });
  const sIns3 = lb.pushFlat(20);
  enemySpawns.push({ type: "instruction", x: (sIns3.x0 + 12) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "STOP", face: -1 } });
  padTo(lb, rStart, 100);
  segments.push({ id: "r1", tileCount: lb.cursor - rStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* MERGE tetigi haritanin SAG KENARINA (edgeSide=F_SOLID) tam oturmasin —
   * bulunan gercek hata: govde genisligi (HIT_W=8px) yuzunden oyuncu
   * duvara kadar YALNIZ ~pxW-9 px'e ulasabilir, esik tam pxW ise ASLA
   * gecilemez. Tetigi 100 tile'lik R1 butcesinin SONUNDA sabitler, ardindan
   * durup MERGE'e basmak icin rahat bir platform ekler (butceye SAYILMAZ,
   * spawn duzlugu gibi). */
  const mergeTriggerX = lb.cursor * TILE;
  lb.pushFlat(10);

  const { map, labels } = lb.build();

  /* BUILD ZAMANI KORUMASI. Yanlis yerlestirilmis bir commit tasi SESSIZ bir
   * kilitlenmedir: oyuncu oraya varana kadar hicbir belirti vermez, sonra
   * cikamaz. padTo()'nun tile butcesini korudugu gibi bu da tas yerlesimini
   * korur — kural bozulursa oyun ACILMAZ, sessizce bozulmaz. */
  const COMMIT_RUNWAY = 8;
  const floorRow = 8;
  const standable = (tx) => tx >= 0 && tx < map.w && (map.flags[floorRow * map.w + tx] & F_STANDABLE);
  for (const cx of commitStones) {
    const t = cx / TILE;
    if (!standable(t)) {
      throw new Error(`worlds/w6: commit tasi ${t}. tile'da ZEMIN YOK — bosluga dogulur`);
    }
    let runway = 0;
    while (standable(t + runway + 1) && runway < COMMIT_RUNWAY) runway++;
    if (runway < COMMIT_RUNWAY) {
      throw new Error(`worlds/w6: commit tasi ${t}. tile'da hizlanma mesafesi ${runway} < ${COMMIT_RUNWAY} tile`);
    }
  }

  return {
    map, labels, spawnX, spawnY, enemySpawns,
    hazards: { hotChannels },
    commitStones,
    segments,
    bossTriggerX,
    mergeTriggerX,
    exitX: mergeTriggerX
  };
}

export default buildWorld6;
