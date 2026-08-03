/* ==========================================================================
 * game/verbs.js — ZEMİN YAP (Q) + ATEŞ ET (J), AYRI TUSLAR
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §7.1-§7.2.
 *
 * IKI SAPMA (ikisi de oyun testiyle geldi, acikca isaretli):
 *
 * 1) TUS AYRIMI. Kitap "TEK BUTON" diyordu ve hangi fiilin calisacagini
 *    `contextResolve()` seciyordu. Pratikte cozulemedi: ayni tus hem dovuste
 *    hem de yere karo dosemek icin isteniyor, oyuncu "bu tus simdi ne
 *    yapiyor" sorusunu hic cevaplayamiyordu. Iki fiil artik IKI AYRI GIRDI
 *    dinler ve ayni karede bagimsiz calisir:
 *        ZEMİN YAP -> ctrl.groundPressed / groundDown   (Q      / dokunmatik C)
 *        ATEŞ ET   -> ctrl.verbPressed   / verbDown     (J,Shift/ dokunmatik B)
 *
 * 2) GİZLEN -> ATEŞ ET. Ikinci fiil eskiden "KABUK"tu: aksiyon tusunu basili
 *    tutup yakindaki telegrafi SUSTURMAK. Bu edilgen kaldi — oyuncunun elinde
 *    hicbir SALDIRI yoktu, butun dovus "dogru anda bekle"ye iniyordu. Artik
 *    ayni tus MERMI firlatir; mermi temel dusmani susturur (eski KABUK ile
 *    AYNI sonuc, ama aktif bir eylemle), AVCI'nin ve patronlarin canini
 *    dusurur. Susturmanin oran (rate) sozlesmesi DEGISMEDI.
 *
 * ZEMİN YAP: YERDEYKEN onundeki TAM BIR TILE'lik hucreye (16 px) zemin
 * karosu koyar — yalnizca hucre BOSSA. Havada hicbir sey yapmaz (yoksa
 * oyuncu kendi etrafina duvar/tavan orup kapanabiliyordu). 7 karede bir,
 * basinc basina en cok 5; metre 1 birim/karo, yerdeyken 96 karede +1.
 * Karo omru 66 kare, SAĞLAM ZEMİN pip'i ile 200 — hicbir kosulda SONSUZ
 * DEGIL. Ayni anda en cok 16 karo yasar (tasarsa en eskisi silinir).
 * (Omur/yenilenme sayilari oyun testiyle ayarlandi: karo SAYISI gercek bir
 * kaynak olsun diye metre cok yavas dolar, karolar da altinda durup
 * bekleyemeyecegin kadar cabuk erir — koprüyu kurarken YURUMEK gerekir.)
 *
 * ATEŞ ET: 12 karede bir mermi (basili tutulursa otomatik tekrarlar).
 * Mermi govdenin on hizasindan cikar, oyuncunun baktigi yone gider.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createVerbSystem, VERB } from "./verbs.js";
 *
 *   const verbs = createVerbSystem();
 *   verbs.unlock(VERB.REWRITE); verbs.unlock(VERB.SHOOT);
 *   verbs.isUnlocked(VERB.REWRITE) -> bool
 *   verbs.setTrail(bool)           -> SAĞLAM ZEMİN pip'i (karo omru uzar)
 *
 *   verbs.update(dt, body, ctrl, map, pool) -> void
 *
 *   verbs.targetCell(body, map) -> {tx,ty,blocked,ok}  karonun konacagi hucre
 *                                  (boot.js onizleme isaretini BUNDAN cizer)
 *   verbs.active            -> HUD/telemetri icin "su an anlamli olan" fiil
 *   verbs.meter / meterMax  -> ZEMİN YAP metresi
 *   verbs.fireCooldown / fireCooldownMax -> ATEŞ ET beklemesi
 *   verbs.placedThisFrame   -> bu karede karo kondu mu (ses icin)
 *   verbs.firedThisFrame    -> bu karede mermi cikti mi (ses icin)
 *   verbs.wastedGround / wastedVerb    -> sonucsuz basis (HUD flasi)
 * ========================================================================== */

import { TILE } from "./scale.js";
import { F_SOLID, F_TEMP } from "./tilemap.js";
import { spawnBolt } from "./enemies.js";

export const VERB = Object.freeze({ NONE: 0, REWRITE: 1, SHOOT: 2, MERGE: 3 });

const REWRITE_HOLD_INTERVAL = 7;      /* kare basina 1 tile, basili tutulursa */
const REWRITE_MAX_TILES = 5;
const REWRITE_METER_MAX = 5;
/* METRE YENILENMESI KASITLI OLARAK YAVAS. 12 karede (0,2 s) dolarken metre
 * pratikte hic tukenmiyordu — oyuncu 5'ten 4'e dusup aninda 5'e donuyor
 * gordugu icin karo sayisi bir KAYNAK gibi hissedilmiyordu. 96 karede (1,6 s)
 * +1: bos bir metrenin tamamen dolmasi 8 saniye surer, yani nereye karo
 * koyacagin gercek bir karar olur. */
const REWRITE_METER_REGEN_FRAMES = 96;
/* Karo omru da kisaldi: 1,1 saniye. Koprüyü kurup UZERINDE DURMAK artik
 * mumkun degil — kurarken yurumek gerekir. */
const REWRITE_DECAY_FRAMES = 66;
const REWRITE_DECAY_FRAMES_TRAIL = 200;  /* SAĞLAM ZEMİN pip'i ile — SONSUZ DEGIL */
/* TAM BIR TILE onune (16 px). Eskiden 20 px'ti: govde merkezinin karo icindeki
 * konumuna gore karo bazen +1 bazen +2 tile'a dusuyordu, yani ust uste basarak
 * kurdugun koprü RASTGELE DELIK biraikiyordu ve oyuncu kendi koprüsunden
 * dusuyordu. 16 px'te hedef her zaman TAM bir sonraki karodur. */
const REWRITE_AHEAD_PX = 16;

const FIRE_COOLDOWN = 12;             /* 5 atis/sn — nisan almadan, akici */
const MUZZLE_AHEAD_PX = 7;            /* namlu agzi: govde kenarinin hemen onu */
const MUZZLE_UP_PX = 6;               /* govde merkezinden biraz yukari (gogus hizasi) */

export function createVerbSystem() {
  let unlockedMask = 0;   /* bit0 REWRITE, bit1 SHOOT — save.js ile ayni sira */

  /* REWRITE durumu */
  let rwHeld = false;
  let rwTilesThisPress = 0;
  let rwIntervalTimer = 0;
  let meter = REWRITE_METER_MAX;
  let meterRegenTimer = 0;
  /* Cari basinca doşenen tile'larin geri alinmasi icin: {cellIndex, life} listesi.
   * Sabit kapasiteli, allocation-free dairesel dizi (en fazla 5 x aktif basinç). */
  const MAX_PENDING = 16;
  const pendingCell = new Int32Array(MAX_PENDING).fill(-1);
  const pendingLife = new Int32Array(MAX_PENDING);

  /* ATES durumu */
  let fireCooldown = 0;

  let active = VERB.NONE;
  let lastUsed = VERB.NONE;
  let wastedGround = false;  /* Q'ya basildi ama karo konmadi (HUD flasi) */
  let wastedVerb = false;    /* ates tusuna basildi ama yetenek yok */
  let placedThisFrame = false;
  let firedThisFrame = false;
  let trailActive = false;   /* SAĞLAM ZEMİN pip'i acik mi (karo omru uzun) */
  /* Karolarin yazildigi harita. reset() bunu kullanarak haritayi TEMIZLER:
   * dunyalar boot'ta BIR KEZ kuruluyor ve tekrar kullaniliyor, eskiden
   * pendingCell yalnizca sifirlaniyordu — kalan karolar bolum atlayinca ve
   * hatta "bastan basla"dan sonra bile haritada duruyordu. */
  let lastMap = null;

  function unlock(v) { unlockedMask |= (1 << (v - 1)); }
  function isUnlocked(v) { return !!(unlockedMask & (1 << (v - 1))); }

  /* Iki fiil de kendi tusunu dinledigi icin bu fonksiyon ARTIK GIRDI
   * YONLENDIRMEZ; geriye yalnizca "su an hangisi one cikiyor" bilgisi kalir
   * (HUD vurgusu / telemetri). */
  function resolveActive() {
    if (fireCooldown > 0) return VERB.SHOOT;
    if (isUnlocked(VERB.REWRITE)) return VERB.REWRITE;
    if (isUnlocked(VERB.SHOOT)) return VERB.SHOOT;
    return lastUsed;
  }

  /* Karonun konacagi hucre — cizim (onizleme isareti) ve yerlestirme AYNI
   * fonksiyondan beslenir. `blocked` = orada zaten kati bir sey var. */
  const TARGET = { tx: 0, ty: 0, blocked: false, ok: false };
  function targetCell(body, map) {
    TARGET.ok = false; TARGET.blocked = false;
    if (!map || !body.grounded) return TARGET;
    const aheadX = body.x + body.facing * (body.w * 0.5 + REWRITE_AHEAD_PX);
    const tx = Math.floor(aheadX / TILE);
    const ty = Math.floor((body.y + body.h) / TILE);
    if (tx < 0 || tx >= map.w || ty < 0 || ty >= map.h) return TARGET;
    TARGET.tx = tx; TARGET.ty = ty;
    TARGET.blocked = !!(map.flags[ty * map.w + tx] & F_SOLID);
    TARGET.ok = true;
    return TARGET;
  }

  /* Konan karoyu haritadan kaldirir (erime, kapasite tasmasi ve reset ayni
   * yoldan gecer — karo tek bir yerde silinir, sizinti kalmaz). */
  function clearSlot(map, k) {
    const i = pendingCell[k];
    if (i === -1) return;
    if (map) { map.tiles[i] = 0; map.flags[i] = 0; map.shapes[i] = 0; }
    pendingCell[k] = -1;
    pendingLife[k] = 0;
  }

  function placeSlugTile(body, map) {
    /* Kural tek cumle: YERDEYKEN, onundeki BOS zemine bir karo koyar.
     * (Eskiden karo govdenin kapladigi satira gidiyordu; yerdeyken bu zeminin
     * bir ustu, havadayken bosluktaki rastgele bir satirdi — oyuncu kendi
     * etrafina duvar/tavan orup KAPANABILIYORDU. Hedef hucre artik
     * targetCell() ile TEK yerden hesaplanir ve ekranda da isaretlenir.) */
    const t = targetCell(body, map);
    if (!t.ok || t.blocked) return false;
    const i = t.ty * map.w + t.tx;
    map.tiles[i] = 1;      /* T_SOLID */
    map.flags[i] = F_SOLID | F_TEMP;   /* F_TEMP: render-only, "gecici zemin" hatch'i icin (bkz. render.js) */
    map.shapes[i] = 0;

    let slot = -1;
    for (let k = 0; k < MAX_PENDING; k++) if (pendingCell[k] === -1) { slot = k; break; }
    if (slot === -1) {
      /* bulunan gercek SIZINTI: eskiden ayni yuva tekrar tekrar eziliyordu ve
       * ezilen karonun haritadaki izi kayboluyordu — o karo SONSUZA KADAR
       * kaliyordu ("kayalar yok olmuyor" sikayetinin bir bacagi). Artik EN
       * ESKI karo (en kucuk omur) once HARITADAN SILINIR, sonra yuvasi
       * devralinir; ayni anda yasayan karo sayisina da sert bir tavan koyar. */
      let oldest = 0;
      for (let k = 1; k < MAX_PENDING; k++) if (pendingLife[k] < pendingLife[oldest]) oldest = k;
      clearSlot(map, oldest);
      slot = oldest;
    }
    pendingCell[slot] = i;
    pendingLife[slot] = trailActive ? REWRITE_DECAY_FRAMES_TRAIL : REWRITE_DECAY_FRAMES;
    lastMap = map;
    return true;
  }

  /* bulunan gercek hata: SAĞLAM ZEMİN pip'i alinca karolar HIC erimiyordu
   * (`if (permanent) continue`). Pip W1'in ana yolunda oldugu icin oyuncu
   * bunu kacinilmaz sekilde aliyor ve o andan itibaren biriktirdigi her karo
   * haritada KALICI oluyordu — hem "kayalar yok olmuyor" hem de kendini
   * cevreleyip kilitleme sikayetinin kaynagi. Pip artik omru UZATIR,
   * sonsuz yapmaz: her karo eninde sonunda gider. */
  function decayTiles(map) {
    for (let k = 0; k < MAX_PENDING; k++) {
      if (pendingCell[k] === -1) continue;
      pendingLife[k]--;
      if (pendingLife[k] <= 0) clearSlot(map, k);
    }
  }

  function updateRewrite(dt, body, ctrl, map) {
    if (body.grounded) {
      meterRegenTimer++;
      if (meterRegenTimer >= REWRITE_METER_REGEN_FRAMES) {
        meterRegenTimer = 0;
        if (meter < REWRITE_METER_MAX) meter++;
      }
    }

    /* bulunan gercek hata: metre BASARISIZ yerlestirmede de tukeniyordu.
     * placeSlugTile hedef karo ZATEN katiysa false doner (duz zeminde kosarken
     * her basis boyledir) — yani oyuncu duz zeminde birkac kez basinca metresi
     * bosaliyor, sonra gercek bir boslugun kenarina geldiginde koyacak karosu
     * kalmiyordu. Metre artik YALNIZ karo gercekten konduysa duser; bosa
     * basis `wastedGround` ile HUD'a bildirilir. */
    if (ctrl.groundPressed && meter >= 1) {
      if (placeSlugTile(body, map)) { meter--; placedThisFrame = true; } else wastedGround = true;
      rwHeld = true;
      rwTilesThisPress = 1;
      rwIntervalTimer = 0;
      lastUsed = VERB.REWRITE;
    } else if (rwHeld && ctrl.groundDown && rwTilesThisPress < REWRITE_MAX_TILES) {
      rwIntervalTimer++;
      if (rwIntervalTimer >= REWRITE_HOLD_INTERVAL && meter >= 1) {
        if (placeSlugTile(body, map)) { meter--; rwTilesThisPress++; placedThisFrame = true; }
        rwIntervalTimer = 0;
      }
    } else if (ctrl.groundPressed && meter < 1) {
      wastedGround = true;   /* metre bos — basis yine de bir sey soylemeli */
    }
    if (!ctrl.groundDown) rwHeld = false;
  }

  /* ATES: kenar VE seviye ayni sekilde ele alinir (basili tutmak otomatik
   * tekrar eder). Tek kapi bekleme sayacidir; "mermi hakki" gibi ikinci bir
   * kaynak YOK — nisan almak zaten yeterince is, ustune sayac saymak dovusu
   * yeniden bir bekleme oyununa cevirirdi. */
  function updateShoot(dt, body, ctrl, pool) {
    if (fireCooldown > 0) fireCooldown--;
    if (!pool) return;
    if (!(ctrl.verbDown || ctrl.verbPressed) || fireCooldown > 0) return;
    const dir = body.facing < 0 ? -1 : 1;
    const mx = body.x + body.w * 0.5 + dir * (body.w * 0.5 + MUZZLE_AHEAD_PX);
    const my = body.y + body.h * 0.5 - MUZZLE_UP_PX;
    if (spawnBolt(pool, mx, my, dir) === -1) return;   /* havuz dolu: bekleme baslatma */
    fireCooldown = FIRE_COOLDOWN;
    firedThisFrame = true;
    lastUsed = VERB.SHOOT;
  }

  function setTrail(on) { trailActive = !!on; }

  function update(dt, body, ctrl, map, pool) {
    lastMap = map;
    wastedGround = false;
    wastedVerb = false;
    placedThisFrame = false;
    firedThisFrame = false;

    if (isUnlocked(VERB.REWRITE)) updateRewrite(dt, body, ctrl, map);
    else if (ctrl.groundPressed) wastedGround = true;   /* henuz acilmadi */

    if (isUnlocked(VERB.SHOOT)) updateShoot(dt, body, ctrl, pool);
    else if (ctrl.verbPressed) wastedVerb = true;

    active = resolveActive();
    /* Erime her kare, HER kosulda isler — patron dovusunde de. Aksi halde
     * dovuse girerken yerde duran karolar dovus boyunca donar kalirdi. */
    decayTiles(map);
  }

  function reset() {
    rwHeld = false; rwTilesThisPress = 0; rwIntervalTimer = 0;
    meter = REWRITE_METER_MAX; meterRegenTimer = 0;
    /* Konan karolari HARITADAN da sil — yalnizca listeyi bosaltmak, dunya
     * nesneleri yeniden kullanildigi icin kalici kirlilik birakiyordu. */
    for (let k = 0; k < MAX_PENDING; k++) clearSlot(lastMap, k);
    fireCooldown = 0;
    active = VERB.NONE; lastUsed = VERB.NONE;
    wastedGround = false; wastedVerb = false;
    placedThisFrame = false; firedThisFrame = false; trailActive = false;
  }

  return {
    unlock, isUnlocked, update, reset, setTrail, targetCell,
    get active() { return active; },
    get lastUsed() { return lastUsed; },
    get meter() { return meter; },
    get meterMax() { return REWRITE_METER_MAX; },
    get fireCooldown() { return fireCooldown; },
    get fireCooldownMax() { return FIRE_COOLDOWN; },
    get wastedGround() { return wastedGround; },
    get wastedVerb() { return wastedVerb; },
    get placedThisFrame() { return placedThisFrame; },
    get firedThisFrame() { return firedThisFrame; }
  };
}

export default createVerbSystem;
