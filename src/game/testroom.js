/* ==========================================================================
 * game/testroom.js — W0 FIZIK TEST ODASI (GO/NO-GO KAPISI)
 * ==========================================================================
 *
 * Bu odanin tek amaci: fizik hissini ELDE olculebilir kilmak. Kitabin §4.3
 * dogrulanmis geometrisine gore olculmus bosluklar icerir. TEK sabit W0
 * kademesi kullanilir: maxSpeed 2.60 px/f, slopeGain 0.00 (§4.4).
 *
 * OLCUM NOTU (Birlestirme/Denetim ajaninin node simulasyonuyla dogrulanan
 * GERCEK deger, kitabin turetilmis tablosundan 1 kare farkli):
 *   simulateJump(makeConfig(1,0,false), Infinity) -> airFrames=32 (kitap: 33),
 *   peakPx=55.56 (kitap: 56, ayni yuvarlanmis deger). Tam-basili yatay menzil
 *   = maxSpeed * airFrames = 2.60 * 32 = 83.2 px = 5.20 tile — kitabin yazdigi
 *   5.4 tile DEGIL. Bu dosya GERCEK motor sayisini kullanir (kod otoritedir,
 *   iddia degil).
 *
 * RAMPA INSA TEKNIGI (tilemap.js `fillRamp` okunarak dogrulandi):
 *   tan(aci) >= 1 (45 derece) -> `perTile` dali: HER ramp tile'i kendi 16 px
 *   genisliginde BAGIMSIZ 0->16 yukselir (tileIdx yok sayilir). Ayni SATIRDA
 *   ust uste N tane '/' koymak N kez TEKRARLANAN bir sicrama (sawtooth)
 *   uretir, tek bir egim DEGIL. Dogru insa: HER tile bir satir yukari/asagi
 *   KAYDIRILARAK diyagonal dizilir (klasik tile-engine 45 derece merdiveni).
 *   tan(aci) < 1  (22,5 derece) -> off = tileIdx*TILE, yani ayni SATIRDA ard
 *   arda dizilen N ayni-karakter tek bir surekli egim uretir (dogru varsayim).
 *   Bu dosya iki durumu AYRI fonksiyonlarla ele alir: pushShallowRamp (22,5)
 *   tek satir, pushSteepRamp (45) diyagonal.
 *
 * `curFloorY` degiskeni zemin satirinin dunya boyunca yukselip alcaldigini
 * takip eder; her segment fonksiyonu ondan okur/yazar. Haritanin ALT IKI
 * satiri (H-2, H-1) her zaman ve kosulsuz katidir — kacirilan her bosluk
 * veya rampa oradan yakalanir, olum/respawn sistemi gerekmez (bu bir debug
 * odasidir, oyun-ici bir seviye degil).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { buildTestRoom } from "./testroom.js";
 *   const { map, labels, spawnX, spawnY, enemySpawns } = buildTestRoom();
 *     map         : tilemap.js map nesnesi (decode ciktisi)
 *     labels      : [{ x, y, tr, en }]  dunya pikseli konumunda, boot.js/debug.js
 *                   font.js ile cizer (bu dosya DOM/font'a dokunmaz)
 *     spawnX/Y    : baslangic konumu (dunya pikseli, body.x/y icin)
 *     enemySpawns : [{ type: "instruction"|"pipe_mouth"|"node"|"bell", x, y, opts }]
 *                   — boot.js enemies.TYPE'a cevirip pool.spawn eder (Faz 2)
 * ========================================================================== */

import { TILE, CHUNK_H } from "./scale.js";
import { decode } from "./tilemap.js";

const H = CHUNK_H;              /* 17 — VIEW_H ile ayni, dusey kaydirma gerekmez */
const START_FLOOR_Y = 8;        /* rampalarla yukari/asagi oynayacagi icin ortaya yakin baslar */
const SAFETY_ROWS = 2;          /* haritanin en alt SAFETY_ROWS satiri kosulsuz kati */

/* -------------------------------------------------------------- olcum sabitleri */
const AIR_FRAMES_FULL = 32;                              /* bkz. dosya basi not */
const MAX_SPEED_PXF = 2.60;
const FULL_RANGE_PX = MAX_SPEED_PXF * AIR_FRAMES_FULL;    /* 83.2 */

function tilesFor(px) { return Math.max(1, Math.round(px / TILE)); }

const GAP_PASS_TILES = tilesFor(FULL_RANGE_PX * 0.90);    /* ~5 tile, gecilir */
const GAP_FAIL_TILES = tilesFor(FULL_RANGE_PX * 1.15);    /* ~6 tile, gecilmez */
const STEP_TILES = 3;                                     /* 48 px < 55,56 px tepe — ulasilir */

export function buildTestRoom() {
  let cursor = 0;
  let curFloorY = START_FLOOR_Y;
  const labels = [];
  const enemySpawns = [];      /* Faz 2: enemies.js turlerini dogrulama galerisi */
  const cells = new Map();     /* "x,y" -> char, sonda grid'e uygulanir */

  function put(x, y, ch) { cells.set(x + "," + y, ch); }

  function seg(widthTiles) {
    const s = { x0: cursor, x1: cursor + widthTiles };
    cursor += widthTiles;
    return s;
  }

  function label(xTiles, tr, en) {
    labels.push({ x: xTiles * TILE, y: (curFloorY - 3) * TILE, tr, en });
  }

  function pushFlat(widthTiles, opts) {
    const s = seg(widthTiles);
    const o = opts || {};
    if (!o.gap) {
      for (let x = s.x0; x < s.x1; x++) put(x, curFloorY, "#");
    }
    return s;
  }

  /* Kisa yukseklikte bir platform (esik/ledge testi). Zemin seviyesi
   * DEGISMEZ — bu bir "sicrayip donulen" tumsek, kalici seviye degil. */
  function pushLedge(widthTiles, upTiles) {
    const s = seg(widthTiles);
    const ledgeY = curFloorY - upTiles;
    for (let x = s.x0; x < s.x1; x++) put(x, ledgeY, "#");
    return s;
  }

  /* 22,5 derece — TEK SATIRDA ard arda ayni karakter (off=tileIdx*TILE dali,
   * tilemap.js fillRamp). Zemin seviyesi bu ramp icin degismez (tek satirdaki
   * heightmap zaten 0..16 araliginda kalir); bir sonraki duz segment yeni bir
   * curFloorY-1 satirinda devam etmez, GORSEL egim ayni satirda bitip biter. */
  function pushShallowRamp(runTiles, ch) {
    const s = seg(runTiles);
    for (let x = s.x0; x < s.x1; x++) put(x, curFloorY, ch);
    return s;
  }

  /* 45 derece — DIYAGONAL merdiven: her tile bir onceki tile'dan 1 satir
   * yukari (up=true) ya da asagi (up=false) kaydirilir. `runTiles` sonunda
   * curFloorY tam `runTiles` satir degisir (her tile net 1 tile/1 tile). */
  function pushSteepRamp(runTiles, up) {
    const s = seg(runTiles);
    const ch = up ? "/" : "\\";
    for (let i = 0; i < runTiles; i++) {
      const rowY = up ? curFloorY - i - 1 : curFloorY + i;
      put(s.x0 + i, rowY, ch);
    }
    curFloorY += up ? -runTiles : runTiles;
    return s;
  }

  /* Alcak tunel: mevcut zeminin `gapRows` satir ustune tavan koyar.
   * comelme YOK (§4.3 kapali karar) — gecis yalniz yururken mumkun olsun
   * diye tavan araligi HIT_H'ten (14 px = 0,875 tile) az fazla tutulur. */
  function pushCeiling(widthTiles, gapRows) {
    const s = seg(widthTiles);
    const ceilY = curFloorY - gapRows;
    for (let x = s.x0; x < s.x1; x++) put(x, ceilY, "#");
    return s;
  }

  /* ============================================================ SEGMENTLER */

  const sSpawn = pushFlat(6);
  const spawnX = (sSpawn.x0 + 1) * TILE;
  const spawnY = curFloorY * TILE - 20;
  label(sSpawn.x0, "YURUYUS: A/D ya da ok tuslari", "WALK: A/D or arrow keys");

  /* 1) Uzun duz kosu seridi — tepe hiza ulasmayi hissettirir. */
  pushFlat(18);
  label(sSpawn.x1 + 2, "TEPE HIZA ULAS (kosarak)", "REACH TOP SPEED (run)");

  /* 2) Coyote-time testi. */
  const sCoyote = pushFlat(4);
  label(sCoyote.x0, "COYOTE: kenardan ayrilinca hemen zipla", "COYOTE: jump right after leaving edge");
  pushFlat(2, { gap: true });
  pushFlat(6);

  /* 3) Jump-buffer testi: kisa ledge'e inis, hemen zipla. */
  const sBuf = pushLedge(4, 2);
  label(sBuf.x0, "JUMP BUFFER: inmeden hemen once zipla bas", "JUMP BUFFER: press jump just before landing");
  curFloorY -= 2;                              /* ledge yeni zemin seviyesi olur */
  pushFlat(3, { gap: true });
  pushFlat(4);
  curFloorY += 2;                              /* sonraki esik testi icin eski seviyeye don */
  pushFlat(2, { gap: true });
  pushFlat(2);

  /* 4) 3 tile yukseklikte esik: 48 px < tepe yukseklik 55,56 px -> ulasilir,
   *    tam basili tutma gerektirir (bosaltma egrisi ~7-8 kare basili). */
  const sStep = pushLedge(6, STEP_TILES);
  label(sStep.x0, "ESIK: yukseklik 3 tile (basili tut)", "STEP: 3 tiles high (hold jump)");
  pushFlat(2);

  /* 5) 45 derece rampa yukari (diyagonal), sonra asagi — orijinal seviyeye doner. */
  const sUp45 = pushSteepRamp(3, true);
  label(sUp45.x0, "45 derece RAMPA yukari", "45deg RAMP up");
  pushFlat(3);
  pushSteepRamp(3, false);
  label(cursor - 3, "45 derece RAMPA asagi (overflow hissi)", "45deg RAMP down (overflow feel)");
  pushFlat(3);

  /* 6) 22,5 derece rampa yukari/asagi (tek satir, dogal run ~3 tile). */
  pushShallowRamp(3, "(");
  label(cursor - 3, "22,5 derece RAMPA yukari", "22.5deg RAMP up");
  pushFlat(2);
  pushShallowRamp(3, ")");
  label(cursor - 3, "22,5 derece RAMPA asagi", "22.5deg RAMP down");
  pushFlat(3);

  /* 7) Bosluk cifti: biri gecilir (~%90 menzil), biri gecilmez (~%115 menzil).
   *    Ikisi de kosulsuz alt guvenlik katmanina duser — bedelsiz deneme. */
  const sGapPass = pushFlat(3);
  label(sGapPass.x0, `GECER: bosluk ${GAP_PASS_TILES} tile (yaklasik %90 menzil)`, `PASSES: ${GAP_PASS_TILES}-tile gap (about 90% range)`);
  pushFlat(GAP_PASS_TILES, { gap: true });
  pushFlat(3);

  pushFlat(3);
  const sGapFail = pushFlat(3);
  label(sGapFail.x0, `GECMEZ: bosluk ${GAP_FAIL_TILES} tile (yaklasik %115 menzil)`, `FAILS: ${GAP_FAIL_TILES}-tile gap (about 115% range)`);
  pushFlat(GAP_FAIL_TILES, { gap: true });
  pushFlat(4);

  /* 8) Tavan/kose sikismasi testi: comelme yok, sadece yururek gecilir. */
  pushCeiling(6, 2);
  label(cursor - 6, "TAVAN: zipla degil, yalnizca yuru", "CEILING: walk through, don't jump");
  pushFlat(0);

  /* 9) Kapanis duz alani + F1 hatirlatmasi. */
  pushFlat(10);
  label(cursor - 10, "F1: fizik HUD'unu ac/kapat", "F1: toggle physics HUD");

  /* 10) DUSMAN GALERISI (Faz 2) — enemies.js'in 4 turunu ayri ayri, sakin
   *     bir koridorda dogrulamak icin. Fizik gauntlet'inden bilincli ayri
   *     tutulur: burada test edilen sey coyote/rampa degil, telegraf/rate. */
  pushFlat(4);
  const sIns = pushFlat(10);
  label(sIns.x0, "TALIMAT: telegraf okunur, itaat SART DEGIL", "INSTRUCTION: read the telegraph, obeying optional");
  enemySpawns.push({ type: "instruction", x: (sIns.x0 + 5) * TILE, y: curFloorY * TILE - 4, opts: { cmd: "STOP", face: 1 } });
  pushFlat(3);

  const sPipe = pushFlat(10);
  label(sPipe.x0, "BORU AGZI: token'i YENIDEN YAZ ile engelle", "PIPE MOUTH: block the token with REWRITE");
  enemySpawns.push({ type: "pipe_mouth", x: (sPipe.x0 + 1) * TILE, y: curFloorY * TILE - 12, opts: { face: 1 } });
  pushFlat(3);

  const sNode = pushFlat(10);
  label(sNode.x0, "DUGUM: koniye girme, ya da KABUK ile sustur", "NODE: avoid the cone, or silence with SHELL");
  enemySpawns.push({ type: "node", x: (sNode.x0 + 5) * TILE, y: curFloorY * TILE - 14, opts: { face: -1 } });
  pushFlat(3);

  const sBell = pushFlat(10);
  label(sBell.x0, "ZIL: suru YAGMURUNU KABUK ile durdur", "BELL: stop the swarm RAIN with SHELL");
  enemySpawns.push({ type: "bell", x: (sBell.x0 + 5) * TILE, y: curFloorY * TILE - 24, opts: {} });
  pushFlat(4);

  /* ------------------------------------------------------------ birlestirme */
  const width = cursor;
  const rows = new Array(H).fill(null).map(() => new Array(width).fill("."));
  cells.forEach((ch, key) => {
    const [xs, ys] = key.split(",");
    const x = +xs, y = +ys;
    if (x >= 0 && x < width && y >= 0 && y < H) rows[y][x] = ch;
  });
  /* Kosulsuz alt guvenlik katmani: her segmentin ustune yazdigi HERSEYIN
   * SONRASINDA uygulanir, boylece hicbir bosluk/rampa gercek bir cukur
   * birakamaz. */
  for (let y = H - SAFETY_ROWS; y < H; y++) {
    for (let x = 0; x < width; x++) rows[y][x] = "#";
  }
  const rowStrings = rows.map((r) => r.join(""));

  const map = decode({ w: width, h: H, rows: rowStrings, spawns: {} });

  return { map, labels, spawnX, spawnY, enemySpawns };
}

export default buildTestRoom;
