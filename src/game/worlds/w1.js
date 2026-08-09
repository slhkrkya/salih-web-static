/* ==========================================================================
 * game/worlds/w1.js — W1 "GÖMÜLÜ KANAL / EMBEDDED CHANNEL" (tepe hiz 11,21 tile/s)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §5.3. 7 segment (A1-G1), toplam 711
 * path-tile, 136 s traversal (Defter A). Boss KOKLAYICI (45 s) G1 sonunda.
 *
 * SADELESTIRME NOTU (rapor icin acikca isaretli): her segmentin ADI GECEN
 * mekanigi (buz+hassasiyet, yalan tabela+yuksek/alcak rota, token borusu+
 * dikey kule, ZIL yagmuru+sakin sayaci, hayalet kovalamasi) GERCEKTEN
 * KURULUDUR; ama segment ICI mikro-koreografi (kacinci karede hangi glif,
 * "4 input karari"nin tam dallanma agaci gibi) tasarim kitabinin
 * belirtmedigi detaylarda MAKUL bir yorumdur, satir satir degil. TILE
 * BUTCESI (asagidaki HER segment) tasarim belgesiyle BIREBIR ortusur —
 * bu, dakika butcesi hesabinin dayandigi olculebilir sozlesmedir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { buildWorld1 } from "./worlds/w1.js";
 *   const { map, labels, spawnX, spawnY, enemySpawns, pipSpawns, hazards,
 *           segments, bossTriggerX, exitX, ghostChaseStartX } = buildWorld1();
 *     pipSpawns   : [{ x, y, id: "rewrite"|"shell"|"seal" }]
 *     hazards.pushWall : F1'in HOT-RELOAD C-sinifi dalgasi (temasta REVERT —
 *                        W0'in cezasiz dalgasindan farkli, boot.js hazardHitTest
 *                        gibi ele alir, itmez)
 *     ghostChaseStartX  : REGRESYON'un (W0 sabitleriyle) kayittan tekrar
 *                        oynatilmaya baslayacagi dunya-x konumu (F1 girisi)
 *     bossTriggerX      : bu x'e ulasilinca boot.js KOKLAYICI'yi baslatir
 *     exitY             : cikis noktasindaki zemin y'si (Faz 6+: boot.js'in
 *                        cizdigi cikis kapisi gorseli icin, bkz. drawExitGate)
 * ========================================================================== */

import { TILE } from "../scale.js";
import { createLevelBuilder } from "../levelbuilder.js";

export const TOP_SPEED_TILE_PER_SEC = 11.21;   /* PHYS.w1 (§8.1) turetilmis */

function padTo(lb, segStart, target) {
  const have = lb.cursor - segStart;
  const remain = target - have;
  if (remain > 0) lb.pushFlat(remain);
  else if (remain < 0) throw new Error(`worlds/w1: segment tasti (${have} > ${target})`);
}

export function buildWorld1() {
  const lb = createLevelBuilder({ startFloorY: 8 });
  const enemySpawns = [];
  const pipSpawns = [];
  const segments = [];

  const sSpawn = lb.pushFlat(4);
  const spawnX = (sSpawn.x0 + 1) * TILE;
  const spawnY = lb.curFloorY * TILE - 20;

  /* ================================================= A1 — Yeniden Yaz odasi */
  const aStart = lb.cursor;
  lb.pushFlat(10);
  /* 1. kapakli bulmaca: REWRITE henuz yokken gecebilecegi bir ledge — DIKKAT
   * (bulunan gercek hata): pushLedge(w,up) zaten kendi genisliginde zemin
   * SEVIYESINDE hicbir tile YAZMAZ (yalniz curFloorY-up'ta yazar), yani TEK
   * BASINA "bosluk uzerinde yukselen kopru" gecerlidir. Once AYRI bir
   * pushFlat(gap:true) eklemek koprüyü boslugun USTUNE degil ARDINA koyar —
   * oyuncu gercek bir cukura duser, guvenlik agina iner, pip'e hic ulasamaz. */
  lb.pushLedge(3, 2);
  lb.pushFlat(9);
  /* 2. kapakli bulmaca */
  lb.pushLedge(3, 2);
  lb.pushFlat(9);
  const sPip1 = lb.pushFlat(4);
  pipSpawns.push({ x: (sPip1.x0 + 2) * TILE, y: lb.curFloorY * TILE - 16, id: "rewrite" });
  /* Tabela kutunun ARDINDA (oyun testi): eskiden bolumun 4. tile'indaydi, yani
   * Q kutusundan 36 tile ONCE — oyuncuya olmayan bir tusa basmasi soyleniyordu.
   * Kutunun kendi diyalogu "yeni yetenek"i duyurur, tabela da KISITI ekler:
   * yalniz YERDEYKEN calisir. Ustteki yorumun dedigi gibi A1'in ilk yarisi
   * zaten REWRITE'siz gecilecek sekilde kuruldu. */
  lb.label(lb.cursor, "Q: yerdeyken önüne zemin koyar", "Q lays ground ahead while you stand", "ground");
  padTo(lb, aStart, 50);
  segments.push({ id: "a1", tileCount: lb.cursor - aStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= B1 — GUID Buzu + Hassas Raf */
  const bStart = lb.cursor;
  lb.label(lb.cursor, "Buzda kayarsın: erken fren yap", "Ice is slippery: brake early");
  lb.pushFlat(6);
  const sIce = lb.pushFlat(24, { gap: false });
  for (let x = sIce.x0; x < sIce.x1; x++) lb.put(x, lb.curFloorY, "_");
  enemySpawns.push({ type: "instruction", x: (sIce.x0 + 18) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "STOP", face: 1 } });
  lb.pushFlat(6);

  /* BUZ -> ZIPLANAMAZ UCURUM. Zorluk revizyonu: buzun tek basina "kayiyorum"
   * dersi bir sonuc dogurmuyordu — kayan oyuncu duz zemine cikip devam
   * ediyordu. Buzun SONUNDA 7 tile'lik (112 px) bir bosluk var; W1 tepe hizi
   * 2,99 px/f ve hava suresi 33 kare oldugu icin ziplama menzili ~107 px,
   * yani bu bosluk ZIPLANAMAZ. Tek cozum: buzda ERKEN fren yapip kenarda
   * durmak ve Q ile koprü kurmak. Kontrolu birakmanin bedeli boylece
   * gorunur olur; ayni bulmaca W6'daki genis boslugun provasidir. */
  lb.label(lb.cursor, "Buz sonunda uçurum", "Drop after the ice", "hazard");
  const sIce2 = lb.pushFlat(10);
  for (let x = sIce2.x0; x < sIce2.x1; x++) lb.put(x, lb.curFloorY, "_");
  lb.label(sIce2.x1, "Q ile zemin döşe, ucundan zıpla", "Lay ground with Q, jump off its end", "ground");
  /* 8 tile = 128 px. W1 ziplama erisimi ~104 px oldugu icin bu bosluk hicbir
   * hizda ziplanamaz; tek dolu metre (5 karo yururken doşenir) + kalan 3
   * tile'lik (48 px) ziplama ile gecilir. */
  lb.pushFlat(8, { gap: true });
  lb.pushFlat(10);

  lb.label(lb.cursor, "Dar basamaklar: kısa kısa zıpla", "Narrow steps: short hops");
  for (let i = 0; i < 8; i++) {
    lb.pushLedge(1, 0);
    lb.pushFlat(2, { gap: true });
  }
  padTo(lb, bStart, 105);
  segments.push({ id: "b1", tileCount: lb.cursor - bStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= C1 — Embed Yuzeyi + Sahte Tabela */
  const cStart = lb.cursor;
  lb.label(lb.cursor, "Buradaki bazı zeminler sahte", "Some of the ground here is fake", "hazard");
  const sLow = lb.pushFlat(36);
  /* DIKKAT (bulunan gercek hata): `curFloorY -= 4` ANINDA (sifir yatay
   * mesafede) 4 tile'lik dikey ucurum uretiyordu — 64 px, DOGRULANMIS
   * maksimum ziplama yuksekliginin (55,56 px = 3,47 tile) USTUNDE, yani
   * FIZIKSEL OLARAK ATLANAMAZ. A1'deki "ardina ledge" hatasindan farkli,
   * bu kez zemin gercekten yok ve gecis imkansiz. Duzeltme: RAMPA (D1'deki
   * kule cikisiyla ayni teknik) — yuruyerek cikilan/inilen surekli egim. */
  lb.pushSteepRamp(4, true);
  const sHigh = lb.pushFlat(36);
  /* Yuksek rota: YALAN TABELA (~) tarlasi, boost pad ile giris.
   *
   * KAROLAR IKISER IKISER (bulunan gercek hata): once 5 karo TEK TEK, 4 tile
   * arayla konuyordu. Karo cokunce geriye 16 px'lik bir delik kaliyor; govde
   * 8 px genisliginde ve physics'in cikinti toleransi (§4.11-2) her iki yandan
   * 3 px oldugu icin oyuncu bu delige ancak 2 PIKSELLIK bir aralikta
   * dusebiliyordu — yani karo catliyor, cokuyor, ama oyuncu neredeyse her
   * zaman kenarda asili kaliyor ve HICBIR SEY OLMUYORDU. Ikiser karo = 32 px
   * delik: artik gercekten dusulur. Tepe hizda (2,99 px/f) 32 px ~11 karede
   * gecilir, catlak telegrafi 26 kare — yani KOSAN oyuncu hala guvende,
   * ceza yalnizca duraklayana. */
  lb.put(sHigh.x0 + 2, lb.curFloorY, ">");   /* boost pad — velocity kick physics.js EV_BOOST bildirir */
  for (let i = 0; i < 4; i++) {
    const fx = sHigh.x0 + 6 + i * 7;
    lb.put(fx, lb.curFloorY, "~");
    lb.put(fx + 1, lb.curFloorY, "~");
  }
  lb.pushSteepRamp(4, false);
  lb.pushFlat(10);
  padTo(lb, cStart, 150);
  segments.push({ id: "c1", tileCount: lb.cursor - cStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= D1 — SSE Koridoru + Dikey Kule */
  const dStart = lb.cursor;
  /* J BURADA HENUZ YOK: ATEŞ ET kutusu 427. tile'da, burasi 309. Tabela eskiden
   * "J ile vur ya da Q ile durdur" diyordu — oyuncunun deneyebilecegi tek yari
   * ikincisiydi. Oyunda pipe_mouth yalnizca burada var, yani J bu dusman icin
   * hicbir zaman cevap degil; yaniltici yari cikarildi ve nokta rengi de sahip
   * olunan fiile (Q = mavi) cevrildi. */
  lb.label(lb.cursor, "Gelen atışı Q ile durdur", "Block the incoming shot with Q", "ground");
  const sPipe = lb.pushFlat(30);
  enemySpawns.push({ type: "pipe_mouth", x: (sPipe.x0 + 4) * TILE, y: lb.curFloorY * TILE - 12, opts: { face: 1 } });
  lb.pushFlat(3, { gap: true });
  lb.pushFlat(12);
  /* DIKKAT (bulunan gercek hata): 6 kat x 3 tile = 18 tile tirmanis, haritanin
   * (H=17 satir) dikey sinirini asip curFloorY'yi NEGATIFE dusuruyordu —
   * levelbuilder.build() negatif satirlari SESSIZCE atlar, boylece E1'den
   * itibaren TUM zemin/dusman/pip konumlari gecersiz hale geliyordu (pip'ler
   * hic toplanamiyordu). Duzeltme: 3 kat x 2 tile = 6 tile tirmanis (guvenli
   * sinirlar icinde), sonra AYNI miktarda RAMPAYLA geri iner — D1 SONRASI
   * curFloorY baslangictaki degere (8) DONER, E1+ hicbir surpriz miras almaz. */
  lb.label(lb.cursor, "Basamakları kullanarak yukarı çık", "Use the ledges to climb up");
  for (let i = 0; i < 3; i++) {
    lb.pushLedge(4, 2);
    lb.curFloorY -= 2;
  }
  lb.pushFlat(6);
  lb.pushSteepRamp(6, false);
  lb.pushFlat(5);
  padTo(lb, dStart, 95);
  segments.push({ id: "d1", tileCount: lb.cursor - dStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= E1 — Kabuk Yagmuru + Donmuş Hol */
  const eStart = lb.cursor;
  /* SIRA ONEMLI (oyun testinde raporlandi): "J ile ateş et" tabelasi eskiden
   * BOLUM BASINDA, yani ATEŞ ET kutusundan 23 tile ONCE duruyordu — oyuncuya
   * henuz sahip olmadigi bir tusa basmasi soyleniyordu. Tabela artik kutunun
   * ARDINDA. Cani once susturamadan gormek KASITLI: once ihtiyac (14. tile'daki
   * can), sonra arac (kutu), sonra ne ise yaradigi (tabela). Ikinci can 675.
   * tile'da ve orada silah coktan elde. */
  const sBell = lb.pushFlat(20);
  enemySpawns.push({ type: "bell", x: (sBell.x0 + 10) * TILE, y: lb.curFloorY * TILE - 24, opts: {} });
  const sPip2 = lb.pushFlat(6);
  pipSpawns.push({ x: (sPip2.x0 + 3) * TILE, y: lb.curFloorY * TILE - 16, id: "shell" });
  lb.label(lb.cursor, "J ile ateş et: sürüyü susturur", "Press J to shoot: it silences the swarm", "shoot");
  const sHall = lb.pushFlat(30);
  const residentCounterX = sHall.x0 * TILE;
  /* Kutuya 14 tile kala: tabela ile kutu ayni ekranda (30 tile) gorunsun ama
   * ust uste binmesin diye ateş tabelasindan 18 tile ileride. */
  lb.label(sHall.x0 + 18, "İleride bir yetenek kutusu var", "There is a skill pickup ahead");
  const sPip7 = lb.pushFlat(4);
  /* Ucuncu kutu SAĞLAM ZEMİN'di (konan karonun omrunu uzatan pasif bir
   * artis); alindigi bile fark edilmiyordu. Yerine KALKAN kondu — ayni yer,
   * ayni tabela ("İleride bir yetenek kutusu var"), ama artik BASILABILIR
   * bir yetenek. SAĞLAM ZEMİN'in kodu silinmedi, sadece artik dogmuyor
   * (bkz. verbs.js sapma 4). */
  pipSpawns.push({ x: (sPip7.x0 + 2) * TILE, y: lb.curFloorY * TILE - 16, id: "seal" });
  padTo(lb, eStart, 118);
  segments.push({ id: "e1", tileCount: lb.cursor - eStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= F1 — Yayina Alma Koşusu #1 */
  const fStart = lb.cursor;
  const ghostChaseStartX = lb.cursor * TILE;
  const pushWallStartX = lb.cursor * TILE;
  lb.label(lb.cursor, "Peşinde bir gölge var. Yakalanma, koş", "A shadow is chasing you. Do not let it catch you", "hazard");
  /* Kovalamaca bosluklari 4 -> 5 tile (80 px): W1 erisimi ~104 px, yani hala
   * gecilir ama artik HIZINI KORUYARAK. Duvar arkandan gelirken fren yapmak
   * bir secenek olmaktan cikar. */
  lb.pushFlat(24);
  lb.pushFlat(5, { gap: true });
  lb.pushFlat(20);
  lb.pushFlat(5, { gap: true });
  lb.pushFlat(20);
  lb.pushFlat(5, { gap: true });
  padTo(lb, fStart, 130);
  segments.push({ id: "f1", tileCount: lb.cursor - fStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= G1 — KOKLAYICI prova odasi */
  const gStart = lb.cursor;
  /* bulunan gercek hata: pushWall (SPRINT SONU) F1 disinda hicbir yerde
   * DURMUYORDU — G1'in "cezasiz prova" odasina ve KOKLAYICI dovusune
   * (45-65s) sizip, oyuncu boss'a yakin durup beklerken kacinilmaz sekilde
   * yetisip REVERT ediyordu; bu da "cikis calismiyor" gibi gorunen asil
   * sebepti (dovus asla gercek zamaninda bitirilemiyordu). Duvar artik G1
   * girisinde KALICI olarak sonlandiriliyor — SPRINT SONU adiyla tutarli. */
  const pushWallEndX = gStart * TILE;
  lb.label(lb.cursor, "Deneme alanı: nişan almayı burada dene", "Practice area: try your aim here");
  const sNode = lb.pushFlat(30);
  enemySpawns.push({ type: "node", x: (sNode.x0 + 15) * TILE, y: lb.curFloorY * TILE - 14, opts: { face: 1 } });
  /* bulunan gercek hata: oda etiketi ve tasarim belgesi (§7.4: "G1'de,
   * boss'tan ~14 s once, 1 DUGUM + 1 ZIL yalitilmis odada cezasiz prova
   * edilir") ZIL istiyordu ama sadece DUGUM eklenmisti — KOKLAYICI Faz 2'nin
   * asil gerektirdigi "koni + yagmur AYNI ANDA" kombinasyonu hic cezasiz
   * denenemiyordu. */
  enemySpawns.push({ type: "bell", x: (sNode.x0 + 23) * TILE, y: lb.curFloorY * TILE - 24, opts: {} });
  const bossTriggerX = lb.cursor * TILE;
  padTo(lb, gStart, 63);
  segments.push({ id: "g1", tileCount: lb.cursor - gStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* bulunan gercek hata: exitX harita genisliginin TAM SINIRINA oturuyordu
   * (EP'nin finishX'inde daha once bulunanla ayni hata sinifi) — kamera max
   * clamp'teyken kapi tam ekran kenarinda merkezleniyor, direklerinin yarisi
   * ve "ÇIKIŞ" etiketi canvas disina tasip kirpiliyordu. exitX'i ONCE yakala,
   * SONRA tampon ekle. */
  const exitX = lb.cursor * TILE;
  const exitY = lb.curFloorY * TILE;
  lb.pushFlat(10);

  const { map, labels } = lb.build();

  return {
    map, labels, spawnX, spawnY, enemySpawns, pipSpawns,
    hazards: { pushWall: { startX: pushWallStartX, endX: pushWallEndX, hazardous: true } },
    residentCounterX,
    ghostChaseStartX,
    bossTriggerX,
    segments,
    exitX,
    exitY
  };
}

export default buildWorld1;
