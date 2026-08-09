/* ==========================================================================
 * game/worlds/w6.js — W6 "YOKSAY / OVERRIDE" (tepe hiz 13,16 tile/s)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §5.4. Kitapta 2 segment (A6, R1) ve 320
 * path-tile vardi; v0 buna UCUNCU bir segment ekler: X1 "SON SINAV" (200
 * tile), YOKSAY'dan SONRA gelen ve oyunun en zor kismi olan bolum (bkz.
 * asagidaki X1 basligi). Toplam 520 path-tile. Boss YOKSAY A6 sonunda, boss
 * AYNA X1 sonunda; her iki arena da kendi segmentinin PADDING'idir (W1
 * G1/KOKLAYICI ile ayni kural — boss alani ayri bir tile-butce satiri degil,
 * segmentin kalan kismidir).
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
 *           bossTriggerX, x1BossTriggerX, mergeTriggerX, exitX } = buildWorld6();
 *     hazards.hotChannels : [{x0,x1}] — 40 kare icinde x1 gecilmezse REVERT
 *     hazards.shellRain   : [{x0,x1,groundY,cols[]}] — gokten mermi seridi
 *     bossTriggerX         : bu x'e ulasilinca boot.js YOKSAY'i baslatir
 *     x1BossTriggerX       : bu x'e ulasilinca boot.js AYNA'yi baslatir
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
  /* SON SINAV'in gokten mermi yagan seridi. SICAK KANAL ile ayni desende
   * kurulur (tile bayragi DEGIL, x-araligi + boot.js sayaci — tilemap.js
   * DONDURULMUS, yeni bayrak eklenmez). */
  const shellRain = [];
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

  /* ==========================================================================
   * X1 — SON SINAV (YOKSAY'dan SONRA gelen en zor bolum)
   * ==========================================================================
   * Eskiden YOKSAY'in ardindan dogrudan R1'in duz kosuSu ve MERGE geliyordu:
   * oyunun EN ZOR ani ortasindaydi, sonu ise bir yurutme bandiydi. Bu segment
   * o bosluga oturur ve tek bir ilkeyle kurulur — YENI mekanik OGRETMEZ,
   * ogretilmis olan HER SEYI ust uste bindirir:
   *
   *   1. BUZ + SAHTE ZEMİN : buz durmayi zorlastirir, sahte karo durani cezalandirir.
   *                          Iki yuzey ayni cumleyi soyler: KOSMAYA DEVAM ET.
   *   2. ÇİFT DÜĞÜM        : iki radar, iki yandan avci. Kacmak degil VURMAK.
   *   3. KIVILCIM YAĞMURU  : gokten dusen mermi seridi (boot.js shellRain).
   *                          Ilk kez bir "patron saldirisi" parkurun ICINDE.
   *   4. SICAK ŞERIT       : ustune, durmayi tamamen yasaklayan sayac.
   *   5. AVCI + Q KÖPRÜSÜ  : ziplanmaz bosluk, ustune bir avci. Iki fiili AYNI
   *                          anda kullanmak zorunda kaldigin tek yer.
   *   6. AYNA arenasi      : segmentin PADDING'i (A6/G1 ile ayni kural).
   *
   * Her tehlike kumesinin ardinda bir commit tasi var: bedel o tehlikeyi
   * tekrar denemek, koridoru bastan yurumek degil.
   * ========================================================================== */
  const xStart = lb.cursor;
  lb.label(lb.cursor, "Son sınav: hepsi aynı anda", "Final exam: all of it at once");
  lb.pushFlat(10);

  /* --- 1. BUZ + SAHTE ZEMİN -------------------------------------------- */
  lb.label(lb.cursor, "Buzun sonunda sahte zemin var", "Fake ground waits at the end of the ice", "hazard");
  const sXIce = lb.pushFlat(12);
  for (let x = sXIce.x0; x < sXIce.x1; x++) lb.put(x, lb.curFloorY, "_");
  /* Karolar IKISER (C1'de bulunan gercek hata): tek karo cokunce kalan 16 px'lik
   * delige 8 px'lik govde 3 px cikinti toleransiyla neredeyse hic dusmuyordu.
   * Ikiser karo = 32 px gercek delik. Tepe hizda (3,51 px/f) 32 px ~9 karede
   * gecilir, catlak telegrafi 26 kare — KOSAN oyuncu guvende, ceza duranin. */
  const sXFake = lb.pushFlat(22);
  for (let i = 0; i < 3; i++) {
    const fx = sXFake.x0 + 3 + i * 7;
    lb.put(fx, lb.curFloorY, "~");
    lb.put(fx + 1, lb.curFloorY, "~");
  }
  lb.pushFlat(6, { gap: true });          /* 96 px — tepe hizda ziplanir, frende ziplanmaz */
  const sXAfterIce = lb.pushFlat(10);
  commitStones.push((sXAfterIce.x0 + 1) * TILE);

  /* --- 2. ÇİFT DÜĞÜM koridoru ------------------------------------------ */
  lb.label(lb.cursor, "İki radar: avcılar iki yandan gelir", "Two radars: hunters from both sides", "shoot");
  const sXNodes = lb.pushFlat(24);
  enemySpawns.push({ type: "node", x: (sXNodes.x0 + 6) * TILE, y: lb.curFloorY * TILE - 14, opts: { face: 1 } });
  enemySpawns.push({ type: "node", x: (sXNodes.x0 + 18) * TILE, y: lb.curFloorY * TILE - 14, opts: { face: -1 } });
  const sXAfterNodes = lb.pushFlat(8);
  commitStones.push((sXAfterNodes.x0 + 1) * TILE);

  /* --- 3. KIVILCIM YAĞMURU koridoru ------------------------------------ */
  lb.label(lb.cursor, "Gökten mermi yağıyor: işarete bak", "Shells rain down: read the marks", "hazard");
  const sXRain = lb.pushFlat(26);
  shellRain.push({
    x0: sXRain.x0 * TILE,
    x1: sXRain.x1 * TILE,
    groundY: lb.curFloorY * TILE,
    /* DOKUZ sutun, 3 tile arayla (eskiden bes sutun, 5 tile arayla — oyun
     * testi "cok kolay" buldu: her dalgada yalnizca 3 cizgi duser ve aradaki
     * guvenli seritler 160 px'ti, yani neredeyse hicbir yere BAKMADAN
     * gecilebiliyordu).
     *
     * ADALET AYNEN KORUNUR — sikilastirma yalniz seridi daraltir, kapatmaz:
     * boot.js her dalgada sutunlarin YARISI'ni donusumlu sectigi icin
     * KOMSU IKI SUTUN AYNI DALGADA ASLA birlikte dusmez. Cift dalgalarda 5
     * cizgi (1,7,13,19,25), tek dalgalarda 4 cizgi (4,10,16,22) iner ve iki
     * durumda da guvenli serit 6 tile = 96 px kalir — govde 8 px, yani
     * gecilecek yol HER ZAMAN var, ama artik gercekten NISAN ALARAK.
     * Dusen mermi havada VURULABILIR (boltHitTest "shot-down"). */
    cols: [1, 4, 7, 10, 13, 16, 19, 22, 25].map((i) => (sXRain.x0 + i) * TILE + TILE * 0.5)
  });
  const sXAfterRain = lb.pushFlat(8);
  commitStones.push((sXAfterRain.x0 + 1) * TILE);

  /* --- 4. SICAK ŞERIT (ayni 6 tile genislik kisiti) -------------------- */
  const sHot3 = lb.pushFlat(6);
  hotChannels.push({ x0: sHot3.x0 * TILE, x1: sHot3.x1 * TILE });
  lb.label(sHot3.x0, "Şerit yine sıcak", "The lane is hot again", "hazard");
  const sXAfterHot = lb.pushFlat(10);
  commitStones.push((sXAfterHot.x0 + 1) * TILE);

  /* --- 5. AVCI + Q KÖPRÜSÜ (iki fiil AYNI anda) ------------------------ */
  lb.label(lb.cursor, "Önce avcıyı vur, sonra zemin döşe", "Shoot the hunter first, then lay ground", "ground");
  /* 6 -> 8 tile (bot olcumu): radar duzlugun ortasindaysa kilit tam boslugun
   * KENARINDA tamamlaniyor ve avci, oyuncu koprüyu kurarken sirtinda beliriyor —
   * etiketin soyledigi sira ("once avciyi vur, sonra zemin dose") FIZIKSEL
   * OLARAK uygulanamiyordu. Radar duzlugun BASINA alindi ve iki tile daha
   * nefes verildi: avciyi vurmak icin bes tile'lik gercek bir pencere var.
   * Bosluk 9 tile'da KALIR — zorluk mesafeden degil sıradan geliyor. */
  const sXBridge = lb.pushFlat(8);
  enemySpawns.push({ type: "node", x: (sXBridge.x0 + 1) * TILE, y: lb.curFloorY * TILE - 14, opts: { face: 1 } });
  /* 9 tile = 144 px. Ziplama erisimi ~115 px oldugu icin ZIPLANAMAZ; tek dolu
   * metre (5 karo = 80 px) + ucundan ziplama (64 px kalan) ile gecilir. Avci
   * ise koprüyu kurarken yururken gelir: once onu vurup 90 karelik pencereyi
   * acmak, sonra kopruyu kurmak gerekir. Sirasi yanlis olan duser. */
  lb.pushFlat(9, { gap: true });
  const sXAfterBridge = lb.pushFlat(12);
  commitStones.push((sXAfterBridge.x0 + 1) * TILE);

  /* --- 6. AYNA arenasi = X1'in PADDING'i (A6/G1 ile ayni kural) -------- */
  const x1BossTriggerX = lb.cursor * TILE;
  padTo(lb, xStart, 200);
  segments.push({ id: "x1", tileCount: lb.cursor - xStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= R1 — Ara Koşu */
  const rStart = lb.cursor;
  /* AYNA arenasindan CIKAR CIKMAZ bir tas. Segment sinirlarindan turetilen
   * commit noktalari (boot.js segmentBoundaries) spawn duzlugu kadar KAYIKTIR
   * ve R1'in turetilmis siniri arenanin ICINE dusuyordu — dovus sirasinda
   * ilerleyen oyuncu kayit noktasini arenanin icine tasiyor, olunce dovusun
   * ortasinda diriliyordu. Tas artik ACIKCA arenanin disina konur; boot.js de
   * arena bandina dusen turetilmis sinirlari ayiklar. */
  commitStones.push((rStart + 1) * TILE);
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
    /* ...ve SICAK ŞERIT'in ICINDE olmasin: oraya dogan oyuncu 40 karelik
     * sayaci hep gecikmis baslatir, cikamazsa ayni tasa tekrar dogar —
     * "bosluga dogma" ile ayni sinif, sessiz bir kilitlenme. X1 uc yeni
     * serit ve dort yeni tas ekledigi icin bu kural artik bedavaya
     * dogrulanabilir hale geldi. */
    for (const z of hotChannels) {
      if (cx >= z.x0 - TILE && cx < z.x1) {
        throw new Error(`worlds/w6: commit tasi ${t}. tile SICAK ŞERIT icinde — cikilamaz dongu`);
      }
    }
  }

  return {
    map, labels, spawnX, spawnY, enemySpawns,
    hazards: { hotChannels, shellRain },
    commitStones,
    segments,
    bossTriggerX,
    x1BossTriggerX,
    mergeTriggerX,
    exitX: mergeTriggerX
  };
}

export default buildWorld6;
