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

import { TYPE, spawn as spawnEnemy, spawnHunter, spawnShard, countHunters, clearHunters } from "./enemies.js";
import { SLOT } from "./render.js";
import { balancedTelegraph } from "./a11y.js";

export const SNIFFER_PHASE = Object.freeze({ ONE: 1, TWO: 2, DONE: 4 });

/* Kalkan sekmesinin gorsel omru — "vurdum ama gecmedi" sinyali. */
const BLOCK_FLASH = 10;
const HIT_FLASH = 6;

/* Ortak can cubugu. Segment sayisi CAN sayisidir: oyuncu "kac mermi kaldi"
 * sorusunu sayarak cevaplayabilsin (yuzde cubugu bunu gizliyordu). */
function drawHealthBar(ctx, palette, sx, sy, hp, hpMax, shielded) {
  const segW = 4, gap = 1;
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
 * Faz 2 (can yariya inince): koni sayisi 3'ten 2'ye duser ama tarama
 * HIZLANIR ve ZIL suru yagmuru eklenir (eski Faz 2 ile ayni bilesenler).
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
const SN_ROT_MS_P1 = 4200, SN_ROT_MS_P2 = 3000;

const CONE_IDLE = 0, CONE_LOCK = 1;

function makeCone(offsetAngle) {
  return { offsetAngle, state: CONE_IDLE, timer: 60 + ((offsetAngle * 137) % 40 | 0), lockTotal: SN_LOCK_P1 };
}

export function createSniffer(x, y, pool, balanced) {
  const cx = x, cy = y;
  let phase = SNIFFER_PHASE.ONE;
  let cones = [makeCone(0), makeCone(2.09), makeCone(4.19)];
  let hp = SN_HP_MAX;
  let elapsedMs = 0;
  let bellId = -1;
  let defeated = false;
  let blockFlash = 0, hitFlash = 0;

  /* TAM 360 DERECE DONEN TARAMA (radar). Kucuk bir salinim, koni sayisi
   * 3'ten 2'ye dustugunde CEMBERIN YARISINI HIC TARAMAZ ve oyuncu o "kor
   * bolge"de kalirsa patron hicbir zaman saldirmaz (node testiyle yakalanan
   * gercek bir kilitlenme riski). Sabit hizli tam donus, kac koni olursa
   * olsun eninde sonunda HER aciyi tarar. */
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
      cones = [makeCone(0), makeCone(3.14)];
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

  return {
    update, draw, hitTest, damage,
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
const OV_RAIN_VY = 1.2, OV_RAIN_GRAV = 0.10, OV_RAIN_HEIGHT = 210;
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

  return {
    update, draw, hitTest, damage,
    get isDefeated() { return defeated; },
    get hp() { return hp; },
    get hpMax() { return OV_HP_MAX; },
    get phase() { return phase; },
    get pattern() { return pattern; },
    get shielded() { return shielded(); },
    get cycles() { return cycle; }
  };
}

export default createSniffer;
