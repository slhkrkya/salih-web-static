/* ==========================================================================
 * game/bosses.js — KOKLAYICI / SNIFFER + YOKSAY / OVERRIDE (CAN + SALDIRI)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §7.4.
 *
 * ==========================================================================
 * DOVUS REVIZYONU (kitaptan SAPMA, oyun testiyle geldi — acikca isaretli)
 * ==========================================================================
 * Eski iki patron da AYNI gramerle kuruluydu: bir telegraf penceresi acilir,
 * oyuncu o pencerede DOGRU GIRDI SEKLINI (basili tut / bir kez bas) uretir,
 * yeterince tekrar edilince patron duser. Oyun testinde bu "dovus" gibi
 * gelmedi — oyuncunun yaptigi sey nisan almak ya da saldirmak degil, bir
 * ritim testini gecmekti; patron da hicbir zaman GERCEKTEN saldirmiyordu.
 *
 * Yeni gramer:
 *   - Her patronun CANI vardir; oyuncunun mermisi (ATEŞ ET / J) onu azaltir.
 *   - Patron KALKANLI oldugu anlarda mermi seker (gorunur "engellendi"
 *     kivilcimi). Kalkanin ne zaman kalktigi patronun kendi cevriminden
 *     okunur, yani "ne zaman ates edeyim" sorusunun ekranda bir cevabi var.
 *   - Patronlar SALDIRIR: KOKLAYICI konileriyle AVCI (hayalet) dogurur;
 *     YOKSAY gokten mermi yagdirir, yatay salvo atar ve avci cagirir.
 *
 * D-2 KORUNUR: patron oyuncuyu "oldurmez", temas GERI AL'dir ve dovus
 * kaybedilemez — sadece uzar. YOKSAY'in tamamlanan her saldirisi IKNA
 * oranini yukseltir (eski "kacan her emir orani yukseltir" kuralinin ayni
 * ruhta karsiligi): hizli bitiren az ceza oder.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI (iki patron da AYNI sekli tasir)
 * ==========================================================================
 *   import { createSniffer, createOverride, SNIFFER_PHASE } from "./bosses.js";
 *
 *   const boss = createSniffer(x, y, pool, balanced);
 *   const boss = createOverride(x, y, pool, balanced, arena);
 *     arena : { x0, x1, groundY } — gokten yagmurun hangi bant uzerine
 *             dusecegi ve yer isaretlerinin cizilecegi satir
 *
 *   boss.update(dt, body, onEvent)
 *     onEvent(kind) : "lock" | "spawn" | "attack"  (ses/oran icin)
 *   boss.hitTest(x, y) -> bool          oyuncu mermisi govdeye degdi mi
 *   boss.damage(n)     -> "block" | "hit" | "phase" | "defeat"
 *   boss.draw(ctx, camX, camY, palette, font, sprites, labels, extra)
 *     labels : { name, shoot, blocked } — i18n bu module SIZMAZ
 *   boss.isDefeated / .hp / .hpMax / .phase / .shielded / .elapsedMs
 * ========================================================================== */

import { TILE } from "./scale.js";
import { TYPE, spawn as spawnEnemy, spawnHunter, spawnShard, countHunters, clearHunters } from "./enemies.js";
import { SLOT } from "./render.js";
import { balancedTelegraph } from "./a11y.js";

export const SNIFFER_PHASE = Object.freeze({ ONE: 1, TWO: 2, DONE: 4 });

/* Kalkan sekmesinin gorsel omru — "vurdum ama gecmedi" sinyali. */
const BLOCK_FLASH = 10;
const HIT_FLASH = 6;

/* Ortak can cubugu. Segment sayisi CAN sayisidir: oyuncu "kac mermi kaldi"
 * sorusunu sayarak cevaplayabilsin (yuzde cubugu bunu gizliyordu).
 * `segWidth`: 36 canli AYNA'da 4 px'lik segment 179 px'lik bir cubuk yapiyor
 * ve ekranin ucte birini kapliyordu — genis canlarda 2 px verilir, sayilabilir
 * kalir ama patronu ezmez. */
function drawHealthBar(ctx, palette, sx, sy, hp, hpMax, shielded, segWidth) {
  const segW = segWidth === undefined ? 4 : segWidth, gap = 1;
  const totalW = hpMax * segW + (hpMax - 1) * gap;
  const x0 = Math.round(sx - totalW / 2);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x0 - 2, sy - 2, totalW + 4, 9);
  for (let i = 0; i < hpMax; i++) {
    ctx.fillStyle = i < hp ? palette.css[shielded ? SLOT.INK_SOFT : SLOT.HAZARD] : "#3a3f5c";
    ctx.fillRect(x0 + i * (segW + gap), sy, segW, 5);
  }
  if (shielded) {   /* kalkan: cubugun etrafinda kapali bir cerceve */
    ctx.strokeStyle = palette.css[SLOT.SECONDARY];
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 2.5, sy - 2.5, totalW + 5, 10);
  }
  ctx.restore();
}

/* ==========================================================================
 * KOKLAYICI / SNIFFER — "radar" patronu
 * ==========================================================================
 * Konileri artik oyuncuyu OKUMAZ, AVLAR: bir koni kilitlenince (telegraf)
 * o koniden bir AVCI dogar ve oyuncuyu kovalar. Koni KILITLIYKEN patron
 * KALKANLIDIR — yani "seni okurken ona zarar veremezsin". Oyuncunun isi
 * boylece net bir dongu olur: konilerden cik, avciyi vur, patrona ates et.
 *
 * Faz 2 (can yariya inince): tarama HIZLANIR, kilit suresi KISALIR ve ZIL
 * suru yagmuru eklenir. (Koni sayisi eskiden burada 3'ten 2'ye duserdi; oyun
 * testi 3 radari "okunamayacak kadar kalabalik" buldugu icin iki faz da 2
 * koniyle oynanir — bkz. makeConeSet.)
 * ========================================================================== */

const SN_HP_MAX = 20;
const SN_PHASE2_AT = 10;
const SN_HW = 15, SN_HH = 15;          /* vurus kutusu yari-olculeri (govde 28x28) */
/* KONI MENZILI = MERMI MENZILI (bot testinde bulunan gercek denge hatasi):
 * koni 130 px'ken oyuncunun mermisi 368 px gidiyordu, yani "200 px uzakta dur
 * ve tusu basili tut" dovusun TAMAMINI atliyordu — patron hicbir zaman
 * kalkan kaldiramiyor, hicbir zaman avci doguramiyordu (olculdu: 3,5 saniyede
 * bitiyordu). Radarin gorus alani artik ates edebildigin her yeri kapsar:
 * ates etmek icin taranmayi GOZE ALMAK gerekir. */
const SN_CONE_RANGE = 360;   /* mermi erisimi ~379 px — kenardan bedava vurus penceresi kalmasin */
const SN_CONE_DEG = 50;
const SN_LOCK_P1 = 48, SN_LOCK_P2 = 36;
const SN_CONE_COOLDOWN = 120;
const SN_HUNTER_CAP = 2;   /* 3 avci ayni anda okunamiyordu (bot testi) */
/* 4200/3000 -> 6000/4200: oyun testi — tarama gozle takip edilemeyecek kadar
 * hizli donuyordu; oyuncu koninin NEREDEN gelecegini onceden okuyamiyor,
 * yalnizca tepki verebiliyordu. Yavas donus radari bir TEHDIT SAATINE
 * cevirir: nereye kacacagina koni sana varmadan karar verirsin. */
const SN_ROT_MS_P1 = 6000, SN_ROT_MS_P2 = 4200;

const CONE_IDLE = 0, CONE_LOCK = 1;

function makeCone(offsetAngle) {
  return { offsetAngle, state: CONE_IDLE, timer: 60 + ((offsetAngle * 137) % 40 | 0), lockTotal: SN_LOCK_P1 };
}

/* IKI KONI, TEK YERDEN (oyun testi: "3 radar cok"). Koni takimi daha once UC
 * ayri satirda kuruluyordu (kurulus, faz 2, reset) — sayi degistirmek uc yeri
 * birden tutturmayi gerektiriyordu ve biri unutulursa dovus faza gore SESSIZCE
 * baska bir sayiyla oynanirdi. Tek kaynak: 2 koni, 180 derece karsilikli.
 * Tam donus (bkz. rotPeriod notu) sayidan bagimsiz her aciyi tarar, yani 2
 * koni "kor bolge" YARATMAZ — sadece ayni acinin taranma sikligini dusurur. */
function makeConeSet() { return [makeCone(0), makeCone(Math.PI)]; }

export function createSniffer(x, y, pool, balanced) {
  const cx = x, cy = y;
  let phase = SNIFFER_PHASE.ONE;
  let cones = makeConeSet();
  let hp = SN_HP_MAX;
  let elapsedMs = 0;
  let bellId = -1;
  let defeated = false;
  let blockFlash = 0, hitFlash = 0;

  /* TAM 360 DERECE DONEN TARAMA (radar). Kucuk bir salinim, 2 koniyle
   * CEMBERIN YARISINI HIC TARAMAZ ve oyuncu o "kor bolge"de kalirsa patron
   * hicbir zaman saldirmaz (node testiyle yakalanan gercek bir kilitlenme
   * riski). Sabit hizli tam donus, kac koni olursa olsun eninde sonunda HER
   * aciyi tarar — konileri 2'ye dusurmek bu yuzden guvenli. */
  function rotPeriod() { return phase === SNIFFER_PHASE.TWO ? SN_ROT_MS_P2 : SN_ROT_MS_P1; }
  let rotAngle = 0;
  function coneAngle(cone) { return cone.offsetAngle + rotAngle; }

  /* Iki acinin isaretli en kisa farki, [-pi,pi]'ye sarilir. coneAngle sinirsiz
   * buyudugu icin (surekli donus) tek-sarma varsayan bir formul dakikalar
   * sonra YANLIS sonuc verirdi. */
  function angleDiff(a, b) {
    let d = a - b;
    d -= Math.PI * 2 * Math.round(d / (Math.PI * 2));
    return Math.abs(d);
  }

  function lockFrames() {
    return balancedTelegraph(phase === SNIFFER_PHASE.TWO ? SN_LOCK_P2 : SN_LOCK_P1, balanced);
  }

  function shielded() {
    if (defeated) return false;
    for (const c of cones) if (c.state === CONE_LOCK) return true;
    return false;
  }

  function updateCone(cone, body, onEvent) {
    if (cone.state === CONE_IDLE) {
      cone.timer--;
      if (cone.timer > 0 || !body) return;
      /* AYNI ANDA EN FAZLA BIR KILIT (bot testinde bulunan gercek denge
       * hatasi): koni menzili mermi menziline cikarilinca uc koni birbirinden
       * bagimsiz kilitlenmeye basladi ve kalkan sureSinin toplami cevrimin
       * ~%86'sina ciktı — patron pratikte vurulamaz oldu (240 saniyede
       * inmedi). Tek kilit kurali cevrimi okunur bir ritme oturtur:
       * 48 kare kalkan / 120 kare acik. Oyuncu bekledigi pencerenin ne zaman
       * gelecegini konilerin ucundaki geri sayimdan gorur. */
      for (const other of cones) if (other.state === CONE_LOCK) return;
      const dx = body.x + body.w * 0.5 - cx, dy = body.y + body.h * 0.5 - cy;
      const dist2 = dx * dx + dy * dy;
      const toPlayer = Math.atan2(dy, dx);
      const da = angleDiff(toPlayer, coneAngle(cone));
      if (dist2 <= SN_CONE_RANGE * SN_CONE_RANGE && da <= (SN_CONE_DEG * 0.5 * Math.PI / 180)) {
        cone.state = CONE_LOCK;
        cone.lockTotal = lockFrames();
        cone.timer = cone.lockTotal;
        if (onEvent) onEvent("lock");
      }
      return;
    }
    /* CONE_LOCK */
    cone.timer--;
    if (cone.timer > 0) return;
    if (countHunters(pool) < SN_HUNTER_CAP) {
      spawnHunter(pool, cx, cy);
      if (onEvent) onEvent("spawn");
    }
    cone.state = CONE_IDLE;
    cone.timer = SN_CONE_COOLDOWN;
  }

  function update(dt, body, onEvent) {
    if (defeated) return;
    elapsedMs += 1000 / 60;
    rotAngle += (Math.PI * 2) * (1000 / 60) / rotPeriod();
    if (blockFlash > 0) blockFlash--;
    if (hitFlash > 0) hitFlash--;
    for (const cone of cones) updateCone(cone, body, onEvent);
  }

  function hitTest(px, py) {
    if (defeated) return false;
    return Math.abs(px - cx) <= SN_HW && Math.abs(py - cy) <= SN_HH;
  }

  function damage(n) {
    if (defeated) return "block";
    if (shielded()) { blockFlash = BLOCK_FLASH; return "block"; }
    hp -= (n || 1);
    hitFlash = HIT_FLASH;
    if (hp <= 0) {
      hp = 0;
      defeated = true;
      phase = SNIFFER_PHASE.DONE;
      /* bulunan gercek hata (korunuyor): Faz 2'de dogan ZIL suru havuzda
       * KALIYORDU ve patron yenildikten sonra bile cikis yolunda yagmur
       * yagdiriyordu. Avcilar da ayni sinif — ikisi de burada temizlenir. */
      if (pool && bellId !== -1) { pool.free(bellId); bellId = -1; }
      if (pool) clearHunters(pool);
      return "defeat";
    }
    if (phase === SNIFFER_PHASE.ONE && hp <= SN_PHASE2_AT) {
      phase = SNIFFER_PHASE.TWO;
      /* Koni SAYISI artik iki fazda da ayni (bkz. makeConeSet). Bu satir yine
       * de duruyor cunku isi sayiyi degistirmek DEGIL, faz esiginde koni
       * durumunu SIFIRLAMAK: devam eden bir kilit iptal olur, oyuncu yeni
       * faza temiz bir sayfayla girer. Faz 2'nin farki artik hizli donus +
       * kisa kilit + ZİL suru yagmuru. */
      cones = makeConeSet();
      if (pool) bellId = spawnEnemy(pool, TYPE.BELL, cx, cy - 20, {});
      return "phase";
    }
    return "hit";
  }

  /* `labels` (cagirandan, i18n boss'a sizmasin diye): { name, shoot, blocked }. */
  function draw(ctx, camX, camY, palette, font, sprites, labels) {
    const sx = Math.round(cx - camX), sy = Math.round(cy - camY);
    const [bw, bh] = sprites.SIZE.sniffer;

    /* Yenilen patron sonuk bir enkazdir: koni yok, can cubugu yok, okuma yok. */
    if (defeated) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      sprites.draw(ctx, "sniffer", sprites.POSE.SNIFFER.STAGGERED, sx - bw / 2, sy - bh / 2, 1);
      ctx.restore();
      return;
    }

    const sh = shielded();
    const pose = hitFlash > 0 ? sprites.POSE.SNIFFER.STAGGERED : sprites.POSE.SNIFFER.IDLE;
    sprites.draw(ctx, "sniffer", pose, sx - bw / 2, sy - bh / 2, 1);

    for (const cone of cones) {
      const a = coneAngle(cone);
      const locking = cone.state === CONE_LOCK;
      ctx.save();
      ctx.globalAlpha = locking ? 0.42 : 0.14;
      ctx.fillStyle = locking ? palette.css[SLOT.HAZARD] : palette.css[SLOT.SECONDARY];
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, SN_CONE_RANGE, a - (SN_CONE_DEG * 0.5 * Math.PI / 180), a + (SN_CONE_DEG * 0.5 * Math.PI / 180));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      /* Kilit geri sayimi koninin UCUNDA: avcinin ne zaman dogacagi
       * gorunmezse "birden bire ustume geldi" hissi kaciniLmaz olurdu. */
      if (locking && cone.lockTotal > 0) {
        const t = 1 - cone.timer / cone.lockTotal;
        const mx = sx + Math.cos(a) * SN_CONE_RANGE * 0.82;
        const my = sy + Math.sin(a) * SN_CONE_RANGE * 0.82;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(Math.round(mx) - 11, Math.round(my) - 2, 22, 5);
        ctx.fillStyle = palette.css[SLOT.HAZARD];
        ctx.fillRect(Math.round(mx) - 10, Math.round(my) - 1, Math.round(20 * t), 3);
        ctx.restore();
      }
    }

    if (!font) return;
    drawHealthBar(ctx, palette, sx, sy - 38, hp, SN_HP_MAX, sh);
    if (!labels) return;

    const phaseNo = phase === SNIFFER_PHASE.TWO ? 2 : 1;
    font.drawCentered(ctx, labels.name + " " + phaseNo + "/2", sx, sy - 50, SLOT.HAZARD, 1);

    /* "Su an ne yapmaliyim" satiri HER ZAMAN yazilir (kalkanliyken solgun) —
     * dovusun buyuk kismi bekleme oldugu icin, eskiden ekranda saniyelerce
     * hicbir talimat kalmiyor ve oyuncu bakakaliyordu. */
    const line = sh ? labels.blocked : labels.shoot;
    ctx.save();
    if (sh) ctx.globalAlpha = 0.75;
    font.drawCentered(ctx, line, sx, sy - 64, sh ? SLOT.INK_SOFT : SLOT.LED, 1);
    ctx.restore();

    if (blockFlash > 0) {
      ctx.save();
      ctx.globalAlpha = blockFlash / BLOCK_FLASH;
      ctx.strokeStyle = palette.css[SLOT.SECONDARY];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, SN_HW + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* DOVUS BASTAN BASLAR (oyun testiyle geldi — bkz. dosya sonundaki not).
   * Yenilmis bir patron DIRILMEZ: `defeated` iken no-op. */
  function reset() {
    if (defeated) return;
    hp = SN_HP_MAX;
    phase = SNIFFER_PHASE.ONE;
    cones = makeConeSet();
    rotAngle = 0;
    blockFlash = 0; hitFlash = 0;
    elapsedMs = 0;
    if (pool && bellId !== -1) { pool.free(bellId); bellId = -1; }
    if (pool) clearHunters(pool);
  }

  return {
    update, draw, hitTest, damage, reset,
    get isDefeated() { return defeated; },
    get hp() { return hp; },
    get hpMax() { return SN_HP_MAX; },
    get phase() { return phase; },
    get shielded() { return shielded(); },
    get elapsedMs() { return elapsedMs; }
  };
}

/* ==========================================================================
 * YOKSAY / OVERRIDE — "saldiri kaliplari" patronu
 * ==========================================================================
 * Cevrim: BEKLE (savunmasiz) -> TELEGRAF (kalkanli, saldiri ISARETLENIR) ->
 * ATES (kalkanli) -> TOPARLANMA (savunmasiz) -> BEKLE...
 * Oyuncunun ates penceresi cevrimin savunmasiz yarisidir; kalkanli yariyi
 * kacmakla gecirir. Uc kalip donusumlu gelir:
 *
 *   YAĞMUR : gokten mermi yagar. Telegrafta yere DUSME SUTUNLARI cizilir ve
 *            aralarinda TEK bir guvenli bosluk birakilir — kalip okunabilir,
 *            ezber gerektirmez. Mermiler havada vurulup dusurulebilir.
 *   SALVO  : oyuncuya dogru ust uste yatay mermiler. Ziplayarak ya da Q ile
 *            onune bir karo koyup SIPER alarak gecilir (karo F_SOLID'dir,
 *            mermi ona carpip soner — iki yetenek burada birbirine baglanir).
 *   ÇAĞRI  : iki AVCI dogar. Patrona ates etmekle avciyi vurmak arasinda
 *            secim yapmak zorunda kalirsin.
 *
 * Faz 2 (can yariya inince) cevrim kisalir ve yagmur/salvo bir mermi buyur.
 * ========================================================================== */

export const OVERRIDE_PHASE = Object.freeze({ ONE: 1, TWO: 2, DONE: 3 });
export const OV_PATTERN = Object.freeze({ RAIN: 0, VOLLEY: 1, SUMMON: 2 });

const OV_HP_MAX = 30;
const OV_PHASE2_AT = 15;
const OV_HW = 13, OV_HH = 17;          /* govde 24x32 */
const OV_IDLE_P1 = 70, OV_IDLE_P2 = 48;
const OV_TELEGRAPH = 40;
const OV_RECOVER = 45;
const OV_ENGAGE_RANGE = 300;
const OV_RAIN_COLS_P1 = 7, OV_RAIN_COLS_P2 = 9;
const OV_RAIN_STEP = 5;                /* iki damla arasi kare */
/* DUSUS HIZI: boot.js'in RAIN_VY/RAIN_GRAV'i ile AYNI deger (1,2/0,10 ->
 * 3,0/0,26). Uc "isaretli yere mermi" sistemi de (bu, AYNA'nin GÖKTEN AĞ'i,
 * W6 koridoru) ayni fizigi paylasir — oyuncu bir kez ogrendigi dusus hizini
 * her ucunde ayni okur. 210 px artik ~30 karede (0,50 s) iniliyor. */
const OV_RAIN_VY = 3.0, OV_RAIN_GRAV = 0.26, OV_RAIN_HEIGHT = 210;
const OV_VOLLEY_P1 = 3, OV_VOLLEY_P2 = 4;
const OV_VOLLEY_SPEED = 3.0;
const OV_VOLLEY_DY = [-34, -18, -2, 10];
const OV_SUMMON_COUNT = 2;
const OV_HUNTER_CAP = 3;

const OV_IDLE = 0, OV_TELE = 1, OV_FIRE = 2, OV_RECOVER_ST = 3;

export function createOverride(x, y, pool, balanced, arena) {
  const cx = x, cy = y;
  const ar = arena || {};
  const arenaX0 = ar.x0 === undefined ? x - 200 : ar.x0;
  const arenaX1 = ar.x1 === undefined ? x + 60 : ar.x1;
  const groundY = ar.groundY === undefined ? y + 20 : ar.groundY;

  let phase = OVERRIDE_PHASE.ONE;
  let hp = OV_HP_MAX;
  let state = OV_IDLE;
  let timer = OV_IDLE_P1;
  let stateTotal = OV_IDLE_P1;
  let pattern = OV_PATTERN.RAIN;
  let cycle = 0;
  let defeated = false;
  let blockFlash = 0, hitFlash = 0;
  let fireStep = 0;

  /* Yagmur sutunlari: kare basina yeniden ayrilmaz (§10.5). */
  const rainX = new Float32Array(OV_RAIN_COLS_P2);
  let rainCount = 0, rainSafe = 0;

  function idleFrames() { return phase === OVERRIDE_PHASE.TWO ? OV_IDLE_P2 : OV_IDLE_P1; }
  function shielded() { return !defeated && (state === OV_TELE || state === OV_FIRE); }

  function planRain() {
    rainCount = phase === OVERRIDE_PHASE.TWO ? OV_RAIN_COLS_P2 : OV_RAIN_COLS_P1;
    const span = Math.max(64, arenaX1 - arenaX0 - 32);
    for (let i = 0; i < rainCount; i++) rainX[i] = arenaX0 + 16 + (span * i) / (rainCount - 1);
    /* Guvenli bosluk deterministik olarak kayar: her cevrimde baska bir yere
     * kacmak gerekir ama zar atilmaz (ayni oturum tekrar oynanabilir olsun). */
    rainSafe = (cycle * 3 + 1) % rainCount;
  }

  function fireFrames() {
    if (pattern === OV_PATTERN.RAIN) return rainCount * OV_RAIN_STEP + 4;
    if (pattern === OV_PATTERN.VOLLEY) return 12;
    return 20;
  }

  function beginTelegraph() {
    state = OV_TELE;
    timer = balancedTelegraph(OV_TELEGRAPH, balanced);
    stateTotal = timer;
    if (pattern === OV_PATTERN.RAIN) planRain();
  }

  function doVolley(body) {
    const dir = body && (body.x + body.w * 0.5) < cx ? -1 : 1;
    const n = phase === OVERRIDE_PHASE.TWO ? OV_VOLLEY_P2 : OV_VOLLEY_P1;
    for (let i = 0; i < n; i++) {
      spawnShard(pool, cx + dir * 14, cy + OV_VOLLEY_DY[i], OV_VOLLEY_SPEED * dir, 0, 0);
    }
  }

  function updateFire(body) {
    if (pattern === OV_PATTERN.RAIN) {
      if (fireStep % OV_RAIN_STEP === 0) {
        const i = (fireStep / OV_RAIN_STEP) | 0;
        if (i < rainCount && i !== rainSafe) {
          spawnShard(pool, rainX[i], groundY - OV_RAIN_HEIGHT, 0, OV_RAIN_VY, OV_RAIN_GRAV);
        }
      }
    } else if (pattern === OV_PATTERN.VOLLEY) {
      if (fireStep === 0) doVolley(body);
    } else {
      if (fireStep === 0) {
        for (let i = 0; i < OV_SUMMON_COUNT; i++) {
          if (countHunters(pool) >= OV_HUNTER_CAP) break;
          spawnHunter(pool, cx + (i === 0 ? -18 : 18), cy - 10);
        }
      }
    }
    fireStep++;
  }

  function update(dt, body, onEvent) {
    if (defeated) return;
    if (blockFlash > 0) blockFlash--;
    if (hitFlash > 0) hitFlash--;

    /* Oyuncu arenadan uzaklastiysa patron BEKLER. bulunan gercek adalet
     * hatasi (korunuyor): cevrim oyuncunun konumundan BAGIMSIZ isliyordu —
     * patronu goremeyecegin bir yerde dururken bile saldirilar gidiyor,
     * her biri IKNA oranini yukseltiyordu. */
    if (body && Math.abs((body.x + body.w * 0.5) - cx) > OV_ENGAGE_RANGE) {
      if (state !== OV_IDLE) { state = OV_IDLE; timer = idleFrames(); stateTotal = timer; }
      return;
    }

    timer--;
    if (state === OV_IDLE) {
      if (timer <= 0) beginTelegraph();
      return;
    }
    if (state === OV_TELE) {
      if (timer <= 0) {
        state = OV_FIRE;
        timer = fireFrames();
        stateTotal = timer;
        fireStep = 0;
        if (onEvent) onEvent("attack");
      }
      return;
    }
    if (state === OV_FIRE) {
      updateFire(body);
      if (timer <= 0) {
        state = OV_RECOVER_ST;
        timer = OV_RECOVER;
        stateTotal = timer;
        cycle++;
        pattern = cycle % 3;
      }
      return;
    }
    /* OV_RECOVER_ST */
    if (timer <= 0) { state = OV_IDLE; timer = idleFrames(); stateTotal = timer; }
  }

  function hitTest(px, py) {
    if (defeated) return false;
    return Math.abs(px - cx) <= OV_HW && Math.abs(py - cy) <= OV_HH;
  }

  function damage(n) {
    if (defeated) return "block";
    if (shielded()) { blockFlash = BLOCK_FLASH; return "block"; }
    hp -= (n || 1);
    hitFlash = HIT_FLASH;
    if (hp <= 0) {
      hp = 0;
      defeated = true;
      phase = OVERRIDE_PHASE.DONE;
      state = OV_IDLE;
      if (pool) clearHunters(pool);
      return "defeat";
    }
    if (phase === OVERRIDE_PHASE.ONE && hp <= OV_PHASE2_AT) {
      phase = OVERRIDE_PHASE.TWO;
      return "phase";
    }
    return "hit";
  }

  /* `labels` : { name, shoot, blocked, patterns: [yagmur, salvo, cagri] } */
  function draw(ctx, camX, camY, palette, font, sprites, band, labels) {
    const sx = Math.round(cx - camX), sy = Math.round(cy - camY);
    const [bw, bh] = sprites.SIZE.override;

    if (band && band.length > 1) {
      const last = band[band.length - 1];
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = palette.css[SLOT.SHADOW];
      for (let i = 0; i < band.length; i += 6) {
        const s = band[i];
        const dx = Math.round(sx + (s.x - last.x) * 0.3);
        const dy = Math.round(sy + (s.y - last.y) * 0.3);
        ctx.fillRect(dx - 4, dy - 4, 8, 8);
      }
      ctx.restore();
    }

    if (defeated) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      sprites.draw(ctx, "override", sprites.POSE.OVERRIDE.IDLE, sx - bw / 2, sy - bh / 2, 1);
      ctx.restore();
      return;
    }

    /* TELEGRAF: yagmurun DUSECEGI sutunlar yere isaretlenir; guvenli bosluk
     * isaretsiz kalir. Kalip boylece ezberlenecek bir sey degil, OKUNACAK bir
     * sey olur. */
    if (state === OV_TELE && pattern === OV_PATTERN.RAIN) {
      const gy = Math.round(groundY - camY);
      const pulse = 1 - timer / stateTotal;
      ctx.save();
      for (let i = 0; i < rainCount; i++) {
        if (i === rainSafe) continue;
        const rx = Math.round(rainX[i] - camX);
        ctx.globalAlpha = 0.18 + pulse * 0.35;
        ctx.fillStyle = palette.css[SLOT.HAZARD];
        ctx.fillRect(rx - 3, gy - OV_RAIN_HEIGHT, 6, OV_RAIN_HEIGHT);
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.fillRect(rx - 7, gy - 3, 14, 3);
      }
      ctx.restore();
    }

    const P = sprites.POSE.OVERRIDE;
    const pose = state === OV_FIRE ? P.WINDOW : (state === OV_TELE ? P.TELEGRAPH : P.IDLE);
    sprites.draw(ctx, "override", pose, sx - bw / 2, sy - bh / 2, 1);

    if (blockFlash > 0) {
      ctx.save();
      ctx.globalAlpha = blockFlash / BLOCK_FLASH;
      ctx.strokeStyle = palette.css[SLOT.SECONDARY];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, OV_HH + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!font) return;
    drawHealthBar(ctx, palette, sx, sy - 42, hp, OV_HP_MAX, shielded());
    if (!labels) return;

    font.drawCentered(ctx, labels.name, sx, sy - 54, SLOT.HAZARD, 1);

    /* Bir sonraki saldirinin ADI + geri sayim cubugu. Oyuncu "simdi ne
     * geliyor" ve "ne kadar vaktim var" sorularini ayni yerden okur. */
    const barW = 52, barX = sx - barW / 2, barY = sy - 32;
    let pct = 0, barSlot = SLOT.INK_SOFT;
    if (state === OV_TELE) { pct = 1 - timer / stateTotal; barSlot = SLOT.HAZARD; }
    else if (state === OV_IDLE) { pct = 1 - timer / stateTotal; barSlot = SLOT.SECONDARY; }
    else if (state === OV_RECOVER_ST) { pct = timer / stateTotal; barSlot = SLOT.LED; }
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
    ctx.fillStyle = palette.css[barSlot];
    ctx.fillRect(barX, barY, Math.round(barW * pct), 3);
    ctx.restore();

    const sh = shielded();
    const name = labels.patterns && labels.patterns[pattern] ? labels.patterns[pattern] : "";
    const line = sh ? (name || labels.blocked) : labels.shoot;
    ctx.save();
    if (sh) ctx.globalAlpha = 0.85;
    font.drawCentered(ctx, line, sx, sy - 68, sh ? SLOT.HAZARD : SLOT.LED, 1);
    ctx.restore();
  }

  function reset() {
    if (defeated) return;
    hp = OV_HP_MAX;
    phase = OVERRIDE_PHASE.ONE;
    state = OV_IDLE;
    timer = OV_IDLE_P1; stateTotal = timer;
    pattern = OV_PATTERN.RAIN;
    cycle = 0; fireStep = 0;
    rainCount = 0; rainSafe = 0;
    blockFlash = 0; hitFlash = 0;
    if (pool) clearHunters(pool);
  }

  return {
    update, draw, hitTest, damage, reset,
    get isDefeated() { return defeated; },
    get hp() { return hp; },
    get hpMax() { return OV_HP_MAX; },
    get phase() { return phase; },
    get pattern() { return pattern; },
    get shielded() { return shielded(); },
    get cycles() { return cycle; }
  };
}

/* ==========================================================================
 * AYNA / MIRROR — SON SINAV patronu (X1)
 * ==========================================================================
 * "Patrondan sonra daha guclu, karmasik, sofistike saldirilari olan en zor
 * asama" istegi. YOKSAY yenildikten sonra gelir ve oyunun SON dovusudur.
 *
 * KIMLIK — tek cumle: SENIN YAPTIGINI YAPAR.
 * Oyuncunun elinde iki fiil var: ATEŞ ET (J) ve ZEMİN YAP (Q). AYNA ikisini de
 * kullanir: sana nisan alip ates eder, onune duvar orer, ustune kosar. Bu
 * yuzden dovusun cevabi ezber degil OKUMA: her saldirinin ekranda adi, yeri
 * ve geri sayimi var.
 *
 * BES KALIP
 *   NİŞAN ALIYOR  : oyuncunun HIZINI hesaba katan, ust uste 3-4 takip atisi.
 *                   Cevap: hareket et, havada vur (mermi mermiyi dusurur) ya
 *                   da Q ile onune siper koy.
 *   DUVAR ÖRÜYOR  : haritaya 2 karo yuksekliginde gecici duvarlar YAZAR
 *                   (arenawalls.js). Duvar mermiyi keser ve seni kafesler.
 *                   Cevap: duvarI VUR — kirilir. Kendi yetenegin geri alinir.
 *   ÜSTÜNE KOŞUYOR: zeminde bir kosu. Telegrafta yere cizgi cizilir, temas
 *                   GERI AL'dir. Cevap: ZIPLA (kutu zeminden 36 px yukarida
 *                   biter, dogrulanmis ziplama yuksekligi 55,56 px).
 *   GÖKTEN AĞ     : IKI dalgali yagmur. Birinci dalganin guvenli bosLugu ile
 *                   ikincininki FARKLI sutunda — bir kez okuyup durmak
 *                   yetmez, iki kez okumak gerekir.
 *   AVCI ÇAĞIRIYOR: iki avci. Patrona mi avciya mi ates edecegin secimi.
 *
 * UC FAZ
 *   1 (36->24) : uc kalip (nisan / duvar / kosu) — ogrenme fazi.
 *   2 (24->12) : bes kalibin tamami, cevrim kisalir.
 *   3 (12->0)  : ayni takim + HER saldirinin yaninda ikinci bir saldiri.
 *
 * D-2 KORUNUR: temas oldurmez, GERI AL'dir; dovus kaybedilemez, yalniz uzar.
 * Tamamlanan her saldiri IKNA oranini yukseltir (YOKSAY ile ayni kural).
 *
 * ARENA: iki yani da KAPALIDIR (boot.js). YOKSAY'da yalniz sag kenar tutuluyor
 * ve oyuncu geri cekilip menzil disindan bedava ates edebiliyordu (KOKLAYICI'da
 * olculmus gercek denge hatasinin ayni sinifi). Son dovuste kapi arkanda
 * kapanir: mermi menzili (368 px) ile arena genisligi (420 px) artik ayni
 * mertebede, "guvenli kose" yok.
 *
 *   createMirror(x, y, pool, balanced, arena)
 *     arena : { x0, x1, groundY, walls }  walls = arenawalls.js ornegi
 * ========================================================================== */

export const MIRROR_PHASE = Object.freeze({ ONE: 1, TWO: 2, THREE: 3, DONE: 4 });
export const MR_PATTERN = Object.freeze({ AIMED: 0, WALL: 1, DASH: 2, NET: 3, SUMMON: 4 });

/* 44 can, ucte bir sinirlari 30 ve 15. YOKSAY 30 canli; son dovus belirgin
 * sekilde daha uzun olmali ama can SUNGERI de olmamali — asil uzunluk
 * candan degil, oyuncunun ates edebilecegi PENCERELERIN darligindan gelir
 * (kalkan cevrimin ~%45'i) ve saldirilardan kacarken nisan alamamasindan. */
const MR_HP_MAX = 44;
const MR_PHASE2_AT = 30, MR_PHASE3_AT = 15;
const MR_HW = 12, MR_HH = 16;          /* govde 24x32 */
const MR_BODY_UP = 16;                 /* merkezin zeminden yuksekligi = govdenin yarisi:
                                        * sprite (24x32) TAM zemine oturur */
const MR_ENGAGE = 460;                 /* arena 420 px — bu yalniz emniyet kemeri */

/* Cevrim: faz basina [1,2,3] */
const MR_IDLE_F = [64, 50, 38];
const MR_TELE_F = [42, 36, 30];
const MR_RECOVER_F = [46, 38, 30];

/* NİŞAN */
const MR_AIM_SHOTS = [3, 3, 4];
const MR_AIM_STEP = 10;                /* iki atis arasi kare */
const MR_AIM_SPEED = 3.1;              /* oyuncunun mermisi 4,6 — kacilabilir ve vurulabilir */
const MR_AIM_LEAD = 13;                /* kac kare ilerisine nisan alinir */

/* DUVAR */
const MR_WALL_COUNT = [2, 3, 4];
const MR_WALL_LIFE = [170, 170, 200];
const MR_WALL_OFFSETS = [-3, 3, -6, 6]; /* oyuncudan tile cinsinden uzaklik */
const MR_WALL_CLEAR_PX = 20;            /* oyuncunun UZERINE duvar orulmez */

/* KOŞU */
const MR_DASH_SPEED = 4.4;
const MR_DASH_MAX = 110;                /* kare — 420 px arenayi kapsar */
const MR_DASH_MIN_TRAVEL = 90;          /* bu kadar yol yoksa karsi tarafa kosar */

/* GÖKTEN AĞ */
const MR_NET_COLS = [0, 6, 7];          /* faz 1'de bu kalip yok */
const MR_NET_STEP = 4;
const MR_NET_WAVE_B = 46;
/* Dusus hizi OV_RAIN ile ayni (bkz. oradaki not) — 180 px ~27 karede iner.
 * NOT: A dalgasi artik B dalgasi baslamadan (46. kare) yere varir; eskiden
 * ikisi havada bir an ust uste biniyordu. Kalibin ozu DEGISMEDI — iki dalga
 * FARKLI sutunlari bos birakir, yani hala iki kez okuma gerektirir. */
const MR_NET_HEIGHT = 180, MR_NET_VY = 3.0, MR_NET_GRAV = 0.26;

/* ÇAĞRI */
const MR_SUMMON_COUNT = 2;
const MR_HUNTER_CAP = 3;

/* Faz basina kalip dizisi. Faz 3 ayni takimi kullanir ama SIRASI farklidir ve
 * her saldirinin yaninda ikinci bir saldiri gelir (bkz. updateFire). */
const P = MR_PATTERN;
/* SIRA ONEMLI (olculdu): dovus faz basina ancak 2-3 cevrim suruyor, yani bir
 * fazin dizisinin SONUNDAKI kalip hic gorulmeyebilir. Her faz kendi YENI
 * kalibiyla BASLAR — oyuncu her faz gecisinde gercekten yeni bir sey gorur,
 * "faz 2 = ayni sey biraz daha hizli" hissi olusmaz. */
const MR_SETS = [
  [P.AIMED, P.DASH, P.WALL],                    /* faz 1: uc kalip, okunacak kadar seyrek */
  [P.NET, P.SUMMON, P.AIMED, P.DASH, P.WALL],   /* faz 2: iki YENI kalip basta */
  [P.DASH, P.NET, P.WALL, P.AIMED, P.SUMMON]    /* faz 3: ayni takim + ikinci saldiri */
];

const MR_IDLE = 0, MR_TELE = 1, MR_FIRE = 2, MR_REC = 3;

export function createMirror(x, y, pool, balanced, arena) {
  const ar = arena || {};
  const arenaX0 = ar.x0 === undefined ? x - 280 : ar.x0;
  const arenaX1 = ar.x1 === undefined ? x + 140 : ar.x1;
  const groundY = ar.groundY === undefined ? y + MR_BODY_UP : ar.groundY;
  const walls = ar.walls || null;

  let bx = x;
  const by = groundY - MR_BODY_UP;

  let phase = MIRROR_PHASE.ONE;
  let phaseIdx = 0;                     /* 0,1,2 — tablo indeksi */
  let hp = MR_HP_MAX;
  let state = MR_IDLE;
  let timer = MR_IDLE_F[0];
  let stateTotal = timer;
  let pattern = P.AIMED;
  let cycle = 0;
  let fireStep = 0;
  let defeated = false;
  let blockFlash = 0, hitFlash = 0;
  let facing = -1;
  let dashTarget = 0, dashing = false;
  let elapsedMs = 0;

  /* Yagmur sutunlari kare basina yeniden AYRILMAZ (§10.5). */
  const netX = new Float32Array(8);
  let netCount = 0, netSafeA = 0, netSafeB = 0;

  function idleFrames() { return MR_IDLE_F[phaseIdx]; }
  function teleFrames() { return balancedTelegraph(MR_TELE_F[phaseIdx], balanced); }
  function shielded() { return !defeated && (state === MR_TELE || state === MR_FIRE); }

  /* ------------------------------------------------------------ planlama */
  function planNet() {
    netCount = MR_NET_COLS[phaseIdx] || 6;
    const span = Math.max(64, arenaX1 - arenaX0 - 40);
    for (let i = 0; i < netCount; i++) netX[i] = arenaX0 + 20 + (span * i) / (netCount - 1);
    /* Deterministik (zar YOK — ayni oturum tekrar oynanabilir olsun) ama
     * IKI dalga IKI FARKLI sutunu bos birakir: birinciyi okuyup orada
     * durmak yetmez, ikinciyi de okumak gerekir. */
    netSafeA = (cycle * 3 + 1) % netCount;
    netSafeB = (netSafeA + ((netCount >> 1) || 1)) % netCount;
    if (netSafeB === netSafeA) netSafeB = (netSafeA + 1) % netCount;
  }

  function planDash(body) {
    const px = body ? body.x + body.w * 0.5 : bx;
    let t = Math.max(arenaX0 + 24, Math.min(arenaX1 - 24, px));
    /* Hedef cok yakinsa kosu "kosu" olmaz — karsi kenara gecer. Aksi halde
     * oyuncu patronun dibinde durarak butun kalibi etkisiz birakabilirdi. */
    if (Math.abs(t - bx) < MR_DASH_MIN_TRAVEL) {
      t = (bx - arenaX0) > (arenaX1 - bx) ? arenaX0 + 24 : arenaX1 - 24;
    }
    dashTarget = t;
  }

  function fireFrames() {
    if (pattern === P.AIMED) return MR_AIM_SHOTS[phaseIdx] * MR_AIM_STEP + 6;
    if (pattern === P.WALL) return 20;
    if (pattern === P.DASH) return MR_DASH_MAX;
    if (pattern === P.NET) return MR_NET_WAVE_B + netCount * MR_NET_STEP + 12;
    return 26;   /* ÇAĞRI */
  }

  function beginTelegraph(body) {
    state = MR_TELE;
    timer = teleFrames();
    stateTotal = timer;
    if (pattern === P.NET) planNet();
    else if (pattern === P.DASH) planDash(body);
  }

  /* ------------------------------------------------------------ saldirilar */
  function aimedShot(body) {
    if (!body) return;
    const px = body.x + body.w * 0.5, py = body.y + body.h * 0.5;
    /* Oyuncunun HIZINI hesaba katar: duran hedefe degil, gidecegi yere atar.
     * Bu, "sag-sol gidip gel" ile bedava atlatilmayi engelleyen tek sey. */
    const tx = px + body.vx * MR_AIM_LEAD;
    const ty = py + body.vy * MR_AIM_LEAD * 0.5;
    let dx = tx - bx, dy = ty - by;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= d; dy /= d;
    spawnShard(pool, bx + dx * 16, by + dy * 16, dx * MR_AIM_SPEED, dy * MR_AIM_SPEED, 0);
  }

  function buildWalls(body) {
    if (!walls || !body) return 0;
    const floorRow = Math.floor(groundY / TILE);
    const px = body.x + body.w * 0.5;
    const ptx = Math.floor(px / TILE);
    const want = MR_WALL_COUNT[phaseIdx];
    const life = MR_WALL_LIFE[phaseIdx];
    let placed = 0;
    for (let i = 0; i < MR_WALL_OFFSETS.length && placed < want; i++) {
      const tx = ptx + MR_WALL_OFFSETS[i];
      const wx = tx * TILE + TILE * 0.5;
      if (wx < arenaX0 + 8 || wx > arenaX1 - 8) continue;
      /* Oyuncunun ICINE karo yazmak fizigi kilitler (govde kati bir hucrenin
       * icinde kalir). Bu yuzden onun kolonu ve komsulari HER ZAMAN atlanir —
       * hem adalet hem de fizik guvenligi. */
      if (Math.abs(wx - px) < MR_WALL_CLEAR_PX) continue;
      let any = false;
      for (let r = 1; r <= 2; r++) if (walls.place(tx, floorRow - r, life)) any = true;
      if (any) placed++;
    }
    return placed;
  }

  function summon() {
    let n = 0;
    for (let i = 0; i < MR_SUMMON_COUNT; i++) {
      if (countHunters(pool) >= MR_HUNTER_CAP) break;
      spawnHunter(pool, bx + (i === 0 ? -20 : 20), by - 8);
      n++;
    }
    return n;
  }

  function runPattern(kind, body, onEvent) {
    if (kind === P.AIMED) {
      if (fireStep % MR_AIM_STEP === 0 && (fireStep / MR_AIM_STEP) < MR_AIM_SHOTS[phaseIdx]) aimedShot(body);
    } else if (kind === P.WALL) {
      if (fireStep === 0 && buildWalls(body) > 0 && onEvent) onEvent("wall");
    } else if (kind === P.DASH) {
      if (fireStep === 0 && onEvent) onEvent("dash");
      dashing = true;
      const dir = dashTarget > bx ? 1 : -1;
      facing = dir;
      bx += MR_DASH_SPEED * dir;
      if ((dir > 0 && bx >= dashTarget) || (dir < 0 && bx <= dashTarget)) {
        bx = dashTarget;
        dashing = false;
        timer = 0;   /* hedefe vardi: kalibi erken bitir */
      }
    } else if (kind === P.NET) {
      if (fireStep % MR_NET_STEP === 0) {
        const i = (fireStep / MR_NET_STEP) | 0;
        if (i < netCount && i !== netSafeA) {
          spawnShard(pool, netX[i], groundY - MR_NET_HEIGHT, 0, MR_NET_VY, MR_NET_GRAV);
        }
      }
      const b = fireStep - MR_NET_WAVE_B;
      if (b >= 0 && b % MR_NET_STEP === 0) {
        const i = (b / MR_NET_STEP) | 0;
        if (i < netCount && i !== netSafeB) {
          spawnShard(pool, netX[i], groundY - MR_NET_HEIGHT, 0, MR_NET_VY, MR_NET_GRAV);
        }
      }
    } else {
      if (fireStep === 0 && summon() > 0 && onEvent) onEvent("spawn");
    }
  }

  function updateFire(body, onEvent) {
    runPattern(pattern, body, onEvent);
    /* FAZ 3: her saldirinin YANINDA ikinci bir saldiri. Kalibin kendisi
     * degismez (oyuncu ogrendigini kullanmaya devam eder) ama artik tek
     * seferde iki soruya birden cevap vermek gerekir. */
    if (phaseIdx === 2 && fireStep === 0) {
      if (pattern === P.AIMED) summon();
      else aimedShot(body);
    }
    fireStep++;
  }

  /* --------------------------------------------------------------- cevrim */
  function update(dt, body, onEvent) {
    if (defeated) return;
    elapsedMs += 1000 / 60;
    if (blockFlash > 0) blockFlash--;
    if (hitFlash > 0) hitFlash--;
    if (body && !dashing) facing = (body.x + body.w * 0.5) < bx ? -1 : 1;

    /* Emniyet kemeri: oyuncu her nasilsa arenanin cok disindaysa cevrim
     * BEKLER — goremeyecegi bir saldiri orani sessizce sisirmesin (YOKSAY'da
     * bulunan ayni adalet hatasi). */
    if (body && Math.abs((body.x + body.w * 0.5) - bx) > MR_ENGAGE) {
      if (state !== MR_IDLE) { state = MR_IDLE; timer = idleFrames(); stateTotal = timer; dashing = false; }
      return;
    }

    timer--;
    if (state === MR_IDLE) {
      if (timer <= 0) beginTelegraph(body);
      return;
    }
    if (state === MR_TELE) {
      if (timer <= 0) {
        state = MR_FIRE;
        timer = fireFrames();
        stateTotal = timer;
        fireStep = 0;
        if (onEvent) onEvent("attack");
      }
      return;
    }
    if (state === MR_FIRE) {
      updateFire(body, onEvent);
      if (timer <= 0) {
        dashing = false;
        state = MR_REC;
        timer = MR_RECOVER_F[phaseIdx];
        stateTotal = timer;
        cycle++;
        const set = MR_SETS[phaseIdx];
        pattern = set[cycle % set.length];
      }
      return;
    }
    if (timer <= 0) { state = MR_IDLE; timer = idleFrames(); stateTotal = timer; }
  }

  function hitTest(px, py) {
    if (defeated) return false;
    return Math.abs(px - bx) <= MR_HW && Math.abs(py - by) <= MR_HH;
  }

  /* Govde teması YALNIZ kosu sirasinda tehlikelidir — duran patronun icinden
   * gecilemez zaten (oyuncu onu itemez), ama duruyorken temas CEZA DEGILDIR.
   * Kutu zeminden 36 px yukarida biter: dogrulanmis ziplama yuksekligi
   * 55,56 px oldugu icin USTUNDEN atlamak her zaman mumkundur. */
  function contactTest(b) {
    if (defeated || !dashing || !b) return false;
    const x0 = bx - (MR_HW - 1), x1 = bx + (MR_HW - 1);
    const y0 = by - (MR_HH + 2), y1 = by + (MR_HH - 4);
    return b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0;
  }

  function damage(n) {
    if (defeated) return "block";
    if (shielded()) { blockFlash = BLOCK_FLASH; return "block"; }
    hp -= (n || 1);
    hitFlash = HIT_FLASH;
    if (hp <= 0) {
      hp = 0;
      defeated = true;
      phase = MIRROR_PHASE.DONE;
      state = MR_IDLE;
      dashing = false;
      /* Sahipsiz kalan avcilar ve orulu duvarlar cikis yolunu kapatmasin
       * (KOKLAYICI'nin ZIL suruSunde bulunan hatanin ayni sinifi). */
      if (pool) clearHunters(pool);
      if (walls) walls.reset();
      return "defeat";
    }
    if (phase === MIRROR_PHASE.ONE && hp <= MR_PHASE2_AT) {
      phase = MIRROR_PHASE.TWO; phaseIdx = 1; cycle = 0;
      pattern = MR_SETS[1][0];
      return "phase";
    }
    if (phase === MIRROR_PHASE.TWO && hp <= MR_PHASE3_AT) {
      phase = MIRROR_PHASE.THREE; phaseIdx = 2; cycle = 0;
      pattern = MR_SETS[2][0];
      return "phase";
    }
    return "hit";
  }

  /* `labels` : { name, shoot, blocked, patterns: [nisan, duvar, kosu, ag, cagri] } */
  function draw(ctx, camX, camY, palette, font, sprites, labels) {
    const sx = Math.round(bx - camX), sy = Math.round(by - camY);
    const [bw, bh] = sprites.SIZE.mirror;

    if (defeated) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      sprites.draw(ctx, "mirror", sprites.POSE.MIRROR.IDLE, sx - bw / 2, sy - bh / 2, facing);
      ctx.restore();
      return;
    }

    const gy = Math.round(groundY - camY);

    /* KOŞU telegrafi: yere, gidecegi yola kadar bir cizgi. "Nereden gecerse
     * gecsin ziplarim" degil, TAM OLARAK nereye kosacagi gorunur. */
    if (state === MR_TELE && pattern === P.DASH) {
      const t = 1 - timer / stateTotal;
      const tx0 = Math.round(Math.min(bx, dashTarget) - camX);
      const tx1 = Math.round(Math.max(bx, dashTarget) - camX);
      ctx.save();
      ctx.globalAlpha = 0.2 + t * 0.5;
      ctx.fillStyle = palette.css[SLOT.HAZARD];
      ctx.fillRect(tx0, gy - 6, tx1 - tx0, 4);
      for (let px2 = tx0; px2 < tx1; px2 += 12) ctx.fillRect(px2, gy - 26, 3, 20);
      ctx.restore();
    }

    /* GÖKTEN AĞ telegrafi: birinci dalganin sutunlari. Ikinci dalga ATES
     * sirasinda ayrica isaretlenir (bkz. asagi) — iki dalganin bos birakacagi
     * sutunlar FARKLI oldugu icin ikisi de gorunmek zorunda. */
    if (pattern === P.NET && (state === MR_TELE || state === MR_FIRE)) {
      const waveB = state === MR_FIRE && fireStep >= MR_NET_WAVE_B - 26;
      const safe = waveB ? netSafeB : netSafeA;
      const pulse = state === MR_TELE ? 1 - timer / stateTotal : 1;
      ctx.save();
      for (let i = 0; i < netCount; i++) {
        if (i === safe) continue;
        const rx = Math.round(netX[i] - camX);
        ctx.globalAlpha = 0.16 + pulse * 0.3;
        ctx.fillStyle = palette.css[waveB ? SLOT.ACCENT : SLOT.HAZARD];
        ctx.fillRect(rx - 3, gy - MR_NET_HEIGHT, 6, MR_NET_HEIGHT);
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.fillRect(rx - 7, gy - 3, 14, 3);
      }
      ctx.restore();
    }

    const PO = sprites.POSE.MIRROR;
    const pose = hitFlash > 0 ? PO.HIT
      : state === MR_FIRE ? PO.WINDOW
      : state === MR_TELE ? PO.TELEGRAPH : PO.IDLE;
    sprites.draw(ctx, "mirror", pose, sx - bw / 2, sy - bh / 2, facing);

    if (blockFlash > 0) {
      ctx.save();
      ctx.globalAlpha = blockFlash / BLOCK_FLASH;
      ctx.strokeStyle = palette.css[SLOT.SECONDARY];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, MR_HH + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!font) return;
    /* 36 can 2 px'lik segmentle cizilir — sayilabilir kalir, ekrani kaplamaz. */
    drawHealthBar(ctx, palette, sx, sy - 40, hp, MR_HP_MAX, shielded(), 2);
    if (!labels) return;

    font.drawCentered(ctx, labels.name + " " + phase + "/3", sx, sy - 52, SLOT.HAZARD, 1);

    const barW = 52, barX = sx - barW / 2, barY = sy - 30;
    let pct = 0, barSlot = SLOT.INK_SOFT;
    if (state === MR_TELE) { pct = 1 - timer / stateTotal; barSlot = SLOT.HAZARD; }
    else if (state === MR_IDLE) { pct = 1 - timer / stateTotal; barSlot = SLOT.SECONDARY; }
    else if (state === MR_REC) { pct = timer / stateTotal; barSlot = SLOT.LED; }
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
    ctx.fillStyle = palette.css[barSlot];
    ctx.fillRect(barX, barY, Math.round(barW * pct), 3);
    ctx.restore();

    const sh = shielded();
    const name = labels.patterns && labels.patterns[pattern] ? labels.patterns[pattern] : "";
    const line = sh ? (name || labels.blocked) : labels.shoot;
    ctx.save();
    if (sh) ctx.globalAlpha = 0.85;
    font.drawCentered(ctx, line, sx, sy - 66, sh ? SLOT.HAZARD : SLOT.LED, 1);
    ctx.restore();
  }

  /* Duvarlar ve avcilar da temizlenir, patron BASLANGIC KONUMUNA doner —
   * arenanin ortasinda birakilmis yarim bir kosunun izi kalmasin. */
  function reset() {
    if (defeated) return;
    hp = MR_HP_MAX;
    phase = MIRROR_PHASE.ONE; phaseIdx = 0;
    state = MR_IDLE;
    timer = MR_IDLE_F[0]; stateTotal = timer;
    pattern = MR_SETS[0][0];
    cycle = 0; fireStep = 0;
    dashing = false; dashTarget = 0;
    netCount = 0; netSafeA = 0; netSafeB = 0;
    blockFlash = 0; hitFlash = 0;
    elapsedMs = 0;
    bx = x;
    facing = -1;
    if (pool) clearHunters(pool);
    if (walls) walls.reset();
  }

  return {
    update, draw, hitTest, damage, contactTest, reset,
    get isDefeated() { return defeated; },
    get hp() { return hp; },
    get hpMax() { return MR_HP_MAX; },
    get phase() { return phase; },
    get pattern() { return pattern; },
    get shielded() { return shielded(); },
    get dashing() { return dashing; },
    get x() { return bx; },
    get cycles() { return cycle; },
    get elapsedMs() { return elapsedMs; }
  };
}

export default createSniffer;
