/* ==========================================================================
 * game/physics.js — YURUYUS / ZIPLAMA / EGIM / SUPURULMUS AABB
 * ==========================================================================
 *
 * BU DOSYA FIZIK HISSININ SAHIBIDIR. §4.2-§4.5'teki her sayi burada BIREBIR
 * duruyor; yuvarlanmadi, "iyilestirilmedi". DOM KULLANMAZ — node'dan import
 * edilir (Birlestirme ve Denetim ajanlari ziplamayi simulateJump ile dogrular).
 *
 * BIRIMLER: px/kare ve px/kare^2. dt HER ZAMAN 1/60 ve HICBIR YERDE CARPAN
 * DEGILDIR — sabitler dogrudan kare basina yazilmis. `step()` dt almaz ki
 * "dt ile carpalim mi" hatasi hic dogmasin.
 *
 * KOORDINAT: dunya pikseli, float. +y ASAGI. body.x/y hitbox'in SOL UST kosesi.
 * Yuvarlama YALNIZCA render'da yapilir (§4.1) — bu dosya asla round etmez.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *
 *   import { PHYS, createBody, createCtrl, makeConfig, step, simulateJump } from "./physics.js";
 *
 * cfg = makeConfig(speedTier, slopeGain, touch)
 *   { speedTier, maxSpeed, slopeGain, overflowCap, accelBreak,
 *     coyoteFrames, jumpBufferFrames, topSpeedTiles }
 *   maxSpeed = 2.60 * speedTier  (§4.4 tablosu birebir: W0 2.60, W1 2.99, ...)
 *   touch = true  -> coyote 8 / buffer 10   (§4.3)
 *   touch = false -> coyote 6 / buffer 8
 *
 * ctrl = input.js'in verdigi anlik goruntu. step() SU ALANLARI okur:
 *   moveX            : -1 | 0 | 1   (3 duruma yuvarlanmis; analog eksen YOK)
 *   jumpDown         : bool/0-1     (level — tut = yuksek zıplama)
 *   jumpPressed      : bool/0-1     (edge — tampona yazar)
 *   coyoteFrames     : optional. >0 ise cfg'yi EZER (aktif girdi kaynagina bagli
 *                      bonus, §4.10: "cihaza degil kaynaga baglanir")
 *   jumpBufferFrames : optional, ayni kural.
 *   Baska hicbir alan okunmaz. createCtrl() dogru sekli uretir.
 *
 * body = createBody(x, y, w, h)  — w/h verilmezse HIT_W/HIT_H (8x14)
 *   Konum/hiz : x, y, vx, vy
 *   Zemin     : grounded, wasGrounded, groundAngle (radyan, >0 => +x'e dusuyor),
 *               groundFlags (tilemap F_* bayraklari — F_ICE/F_SPRING/F_BOOST...)
 *   Zamanlayici: coyote, jumpBuf, apexUsed, landSquash
 *   Durum     : jumping, jumpHeld, skid, facing (-1|1), hitX (-1|0|1), hitY (-1|0|1)
 *   events    : bu karenin EV_* bit alani (asagi)
 *   Render icin: landSquash (4 kare, §4.3 — YALNIZCA gorsel),
 *               spriteAngle (rotateThreshold altinda 0, ustunde 11.25 derecelik
 *               8 kademeye YUVARLANMIS radyan — §4.5)
 *
 * step(body, ctrl, cfg, map) -> void   (body mutate edilir, allocation YOK)
 *
 * EV_* (body.events bit alani; her karede sifirlanir):
 *   EV_JUMP EV_LAND EV_HEADBUMP EV_WALL EV_SKID EV_SPRING EV_BOOST EV_FAKE EV_TAR
 *   DIKKAT: F_SPRING / F_BOOST / F_FAKE'in SAYILARI bu dosyada YOK. Tasarim
 *   kitabinda yay kuvveti ve boost hizi verilmemis; uydurmak dondurulmus
 *   sozlesmeye sahte sayi sokmak olur. physics yalnizca TEMASI bildirir;
 *   ivmeyi entities.js/scenes.js kendi yazili sayisiyla body.vx/vy'ye yazar.
 *
 * DOGRULAMA (Denetim ajani icin):
 *   simulateJump(cfg, holdFrames) -> { riseFrames, fallFrames, airFrames,
 *                                      peakPx, peakTiles }
 *   simulateJump(makeConfig(1,0,false), Infinity) => 17 / 16 / 33 / 55.56 / 3.47
 *   verifyJumpGeometry() -> { ok, rows[] }  — tek cagriyla tum tabloyu basar.
 * ========================================================================== */

import { TILE, HIT_W, HIT_H } from "./scale.js";
import {
  F_ICE, F_TAR, F_SPRING, F_BOOST, F_FAKE,
  blockedColumn, blockedRowDown, blockedRowUp, probeGround, makeFlatRoom
} from "./tilemap.js";

/* ======================================================================
 * DONDURULMUS SABITLER — §4.2 / §4.3 / §4.5 / §4.11
 * Tek bir tanesi degistirilirse dogrulanmis ziplama geometrisi (17/16/33/56)
 * bozulur. verifyJumpGeometry() bu yuzden var.
 * ====================================================================== */
export const PHYS = Object.freeze({
  /* §4.2 yuruyus */
  groundAccelLow:   0.20,
  groundAccelHigh:  0.075,
  accelBreak:       0.62,     /* |vx| < 0.62*maxSpeed -> Low, ustu -> High */
  airAccel:         0.14,
  friction:         0.18,
  airFriction:      0.06,
  skidDecel:        0.42,
  minMoveSpeed:     0.09,

  /* §4.3 ziplama */
  jumpVelocity:    -6.60,
  riseGravity:      0.42,
  apexGravity:      0.26,
  apexVy:           1.10,     /* |vy| <= 1.10 iken apeks */
  apexMaxFrames:    3,        /* EN FAZLA 3 kare */
  fallGravity:      0.52,
  maxFallSpeed:     9.00,
  jumpCutClamp:    -2.60,
  landSquashFrames: 4,        /* YALNIZCA gorsel */
  coyoteFrames:      6, coyoteFramesTouch:      8,
  jumpBufferFrames:  8, jumpBufferFramesTouch: 10,

  /* §4.5 egim ve momentum */
  slopeAccelK:      0.14,
  overflowCapMul:   1.35,
  overflowDecay:    0.05,
  groundSnap:       6,
  rotateThreshold:  3.20,
  rotateSteps:      8,        /* 8 x 11.25 derece */

  /* §7.5 yuzey */
  iceFriction:      0.06,

  /* §4.11 adalet kurallari */
  ledgeTolerance:   3,        /* zeminden <= 3 px tasarsa hala grounded */
  cornerPush:       3,        /* tavan kosesi duzeltmesi */
  sweepMaxStep:     6,        /* sozlesmenin ASGARI alt adimi; asagida 1 px kullanilir */

  /* Temel hiz merdiveni girdisi (§4.4 W0) */
  baseMaxSpeed:     2.60
});

/* Carpisma alt adimi: sozlesme "|v| > 6 px ise ceil(|v|/6)" der; biz 1 px
 * kullaniyoruz. Bu KATI bir daraltmadir (daha ince = daha dogru), kati
 * karolarda ayni sonucu verir, heightmap rampalarda ise 6 px'lik atlamanin
 * urettigi yanlis "duvara carptim" durumunu tamamen ortadan kaldirir.
 * maxFallSpeed 9 < hitbox yuksekligi 14 -> tunelleme zaten imkansiz. */
const STEP_PX = 1;

/* ------------------------------------------------------------------ events */
export const EV_JUMP     = 1 << 0;
export const EV_LAND     = 1 << 1;
export const EV_HEADBUMP = 1 << 2;
export const EV_WALL     = 1 << 3;
export const EV_SKID     = 1 << 4;
export const EV_SPRING   = 1 << 5;
export const EV_BOOST    = 1 << 6;
export const EV_FAKE     = 1 << 7;
export const EV_TAR      = 1 << 8;
export const EV_CORNER   = 1 << 9;

/* Modul-global out-param'lar: update dongusunde nesne literali YOK (§10.5). */
const GROUND = { y: 0, angle: 0, flags: 0 };
const LAND = { y: 0, angle: 0, flags: 0 };

const ROT_STEP = (Math.PI * 2) / (PHYS.rotateSteps * 4); /* 11.25 derece = 2pi/32 */

/* ======================================================================= cfg */
export function makeConfig(speedTier, slopeGain, touch) {
  const tier = speedTier === undefined ? 1 : speedTier;
  const gain = slopeGain === undefined ? 0 : slopeGain;
  const maxSpeed = PHYS.baseMaxSpeed * tier;
  return {
    speedTier: tier,
    slopeGain: gain,
    maxSpeed: maxSpeed,
    overflowCap: maxSpeed * PHYS.overflowCapMul,
    accelBreak: maxSpeed * PHYS.accelBreak,
    coyoteFrames: touch ? PHYS.coyoteFramesTouch : PHYS.coyoteFrames,
    jumpBufferFrames: touch ? PHYS.jumpBufferFramesTouch : PHYS.jumpBufferFrames,
    /* §4.4 turetilmis: topSpeed_tile/s = maxSpeed * 60 / TILE */
    topSpeedTiles: maxSpeed * 60 / TILE
  };
}
/* Girdi kaynagi degisince cagrilir (§4.10: bonus cihaza degil KAYNAGA bagli). */
export function setInputProfile(cfg, touch) {
  cfg.coyoteFrames = touch ? PHYS.coyoteFramesTouch : PHYS.coyoteFrames;
  cfg.jumpBufferFrames = touch ? PHYS.jumpBufferFramesTouch : PHYS.jumpBufferFrames;
  return cfg;
}

/* ====================================================================== body */
export function createBody(x, y, w, h) {
  return {
    x: x || 0, y: y || 0,
    w: w || HIT_W, h: h || HIT_H,
    vx: 0, vy: 0,
    grounded: false, wasGrounded: false,
    groundAngle: 0, groundFlags: 0,
    coyote: 0, jumpBuf: 0, apexUsed: 0,
    jumping: false, jumpHeld: false,
    skid: false, facing: 1,
    landSquash: 0, spriteAngle: 0,
    hitX: 0, hitY: 0,
    events: 0
  };
}

/* step() yalniz moveX, jumpDown/jumpPressed ve coyote/jumpBuffer alanlarini
 * okur. verbDown/verbPressed ve groundDown/groundPressed verbs.js icindir ama
 * sekli BURADA tanimlanir ki tek bir ctrl sozlesmesi olsun.
 * ground... = ZEMİN YAP'in KENDI tusu (Q) — aksiyon tusundan (J/Shift) AYRI. */
export function createCtrl() {
  return {
    moveX: 0,
    jumpDown: 0, jumpPressed: 0,
    verbDown: 0, verbPressed: 0,
    groundDown: 0, groundPressed: 0,
    /* KALKAN (C). step() bunu OKUMAZ — fiil alanlari gibi yalniz verbs.js'e
     * gider; burada durmasinin sebebi ctrl'in TEK bir yerden uretilmesi. */
    shieldDown: 0, shieldPressed: 0,
    coyoteFrames: 0, jumpBufferFrames: 0
  };
}

/* ================================================================= yer cekimi */
/* Saf; simulateJump ve step AYNI fonksiyonu kullanir.
 * apeks penceresi |vy| <= 1.10 iken AKTIF ve toplam 3 kare surer. Kosul
 * isaretten bagimsizdir: sozlesme oyle yaziyor. Sonuc: ledge'den yuruyup
 * dusmenin ilk 3 karesi de yumusak — bu bilincli, dokumante bir sonuc. */
export function applyGravity(b) {
  let g;
  if (Math.abs(b.vy) <= PHYS.apexVy && b.apexUsed < PHYS.apexMaxFrames) {
    g = PHYS.apexGravity; b.apexUsed++;
  } else {
    g = b.vy < 0 ? PHYS.riseGravity : PHYS.fallGravity;
  }
  b.vy += g;
  if (b.vy > PHYS.maxFallSpeed) b.vy = PHYS.maxFallSpeed;
}

/* Degisken ziplama. Ziplamanin ILK karesinde ASLA uygulanmaz: aksi halde
 * bir kareden kisa dokunus 15 px'lik taban yayi bile uretmez (§4.3 tablosu). */
export function applyJumpCut(b) {
  if (!b.jumping || b.jumpHeld) return;
  if (b.events & EV_JUMP) return;
  if (b.vy < PHYS.jumpCutClamp) b.vy = PHYS.jumpCutClamp;
}

/* =================================================================== yatay */
function horizontal(b, mx, cfg) {
  const speed = Math.abs(b.vx);
  const maxS = cfg.maxSpeed;
  b.skid = false;

  if (b.grounded) {
    const fric = (b.groundFlags & F_ICE) ? PHYS.iceFriction : PHYS.friction;
    if (mx === 0) {
      if (speed <= PHYS.minMoveSpeed) b.vx = 0;
      else b.vx -= (b.vx > 0 ? 1 : -1) * Math.min(speed, fric);
    } else if (mx * b.vx < 0) {
      b.skid = true;
      b.events |= EV_SKID;
      b.vx += mx * PHYS.skidDecel;
    } else if (speed < maxS) {
      /* Iki kademeli yer ivmesi (§4.2). Esik cfg'de onceden carpilmis. */
      const a = speed < cfg.accelBreak ? PHYS.groundAccelLow : PHYS.groundAccelHigh;
      const nv = b.vx + mx * a;
      b.vx = mx > 0 ? Math.min(nv, maxS) : Math.max(nv, -maxS);
    }
    /* |vx| >= maxSpeed iken GIRDI hiz eklemez; tasmayi yalniz egim/boost yapar. */
  } else {
    if (mx === 0) {
      if (speed <= PHYS.minMoveSpeed) b.vx = 0;
      else b.vx -= (b.vx > 0 ? 1 : -1) * Math.min(speed, PHYS.airFriction);
    } else if (speed < maxS || mx * b.vx < 0) {
      const nv = b.vx + mx * PHYS.airAccel;
      /* Kelepce yalniz girdi YONUNDE calisir; mevcut tasma kirilmaz. */
      b.vx = mx > 0 ? (nv > maxS && b.vx <= maxS ? maxS : nv)
                    : (nv < -maxS && b.vx >= -maxS ? -maxS : nv);
    }
  }
}

/* Egim ivmesi (§4.5). groundAngle isaretli: >0 => zemin +x'e duser => +x'e iter. */
function slope(b, cfg) {
  if (!b.grounded || b.groundAngle === 0 || cfg.slopeGain <= 0) return;
  b.vx += Math.sin(b.groundAngle) * PHYS.slopeAccelK * cfg.slopeGain;
}

/* Tasma bakimi (§4.5). Egimden SONRA: duzde maxSpeed'e geri iner, yokus
 * asagi ise slopeAccel decay'i asarsa tasma birikir (EP'de 5.72 -> 7.72). */
function overflow(b, cfg) {
  const maxS = cfg.maxSpeed, cap = cfg.overflowCap;
  if (b.vx > maxS) { b.vx -= PHYS.overflowDecay; if (b.vx < maxS) b.vx = maxS; }
  else if (b.vx < -maxS) { b.vx += PHYS.overflowDecay; if (b.vx > -maxS) b.vx = -maxS; }
  if (b.vx > cap) b.vx = cap; else if (b.vx < -cap) b.vx = -cap;
}

/* ============================================== supurulmus AABB — X sonra Y */
/* §4.11-4: eksen ayrıştırmalı. Hareket 1 px'lik alt adimlara bolunur ve her
 * adimda ONDEKI kolon test edilir; kesirli kalan da test edilir, dolayisiyla
 * cozum alt-piksel dogrudur. */
function sweepX(b, map) {
  b.hitX = 0;
  let rem = b.vx;
  if (rem === 0) return;
  const dir = rem > 0 ? 1 : -1;
  /* Tirmanilabilir egim toleransi: yerdeyken bir karede tirmanabilecegi kadar,
   * havada asagi inerken de dusecegi kadar. Boylece rampanin yan yuzu duvar
   * gibi davranmaz ama gercek duvarlar bloklar. */
  const stepUp = b.grounded ? Math.ceil(Math.abs(b.vx)) + 1
                            : (b.vy > 0 ? Math.ceil(b.vy) + 1 : 0);
  while (rem !== 0) {
    const s = dir > 0 ? Math.min(STEP_PX, rem) : Math.max(-STEP_PX, rem);
    const nx = b.x + s;
    const yTop = Math.floor(b.y);
    const yBot = Math.ceil(b.y + b.h) - 1;
    const lead = dir > 0 ? Math.ceil(nx + b.w) - 1 : Math.floor(nx);
    if (blockedColumn(map, lead, yTop, yBot, b.y + b.h, stepUp)) {
      b.hitX = dir; b.vx = 0; b.events |= EV_WALL;
      return;
    }
    b.x = nx; rem -= s;
  }
}

function sweepY(b, map) {
  b.hitY = 0;
  let rem = b.vy;
  if (rem === 0) return;
  const dir = rem > 0 ? 1 : -1;
  const prevFeet = b.y + b.h;
  while (rem !== 0) {
    const s = dir > 0 ? Math.min(STEP_PX, rem) : Math.max(-STEP_PX, rem);
    const ny = b.y + s;
    const xL = Math.floor(b.x);
    const xR = Math.ceil(b.x + b.w) - 1;
    if (dir > 0) {
      const py = Math.ceil(ny + b.h) - 1;
      if (blockedRowDown(map, xL, xR, py, prevFeet, LAND)) {
        b.y = LAND.y - b.h; b.vy = 0; b.hitY = 1;
        return;
      }
    } else {
      const py = Math.floor(ny);
      if (blockedRowUp(map, xL, xR, py)) {
        /* §4.11-1 kose duzeltmesi: carpma noktasi koseye <= 3 px ise yatay
         * itilir ve ZIPLAMA IPTAL EDILMEZ. */
        if (cornerPush(b, map, py)) { b.events |= EV_CORNER; continue; }
        b.y = Math.floor(py / TILE) * TILE + TILE;
        b.vy = 0; b.hitY = -1; b.events |= EV_HEADBUMP;
        return;
      }
    }
    b.y = ny; rem -= s;
  }
}

/* Yalniz TEK kenar bloklaniyorsa 3 px iter. Ittikten sonra hem tavan hem
 * yan bos olmali; degilse itme yapilmaz ve normal tavan carpmasi olur. */
function cornerPush(b, map, py) {
  const xL = Math.floor(b.x), xR = Math.ceil(b.x + b.w) - 1;
  const leftBlocked = blockedRowUp(map, xL, xL, py);
  const rightBlocked = blockedRowUp(map, xR, xR, py);
  if (leftBlocked === rightBlocked) return false;      /* iki uc de ayni -> gercek tavan */
  const d = leftBlocked ? PHYS.cornerPush : -PHYS.cornerPush;
  const nx = b.x + d;
  const nL = Math.floor(nx), nR = Math.ceil(nx + b.w) - 1;
  if (blockedRowUp(map, nL, nR, py)) return false;
  if (blockedColumn(map, d > 0 ? nR : nL, Math.floor(b.y), Math.ceil(b.y + b.h) - 1,
                    b.y + b.h, 0)) return false;
  b.x = nx;
  return true;
}

/* ============================================================ zemin cozumu */
function resolveGround(b, map) {
  b.groundAngle = 0; b.groundFlags = 0;
  if (b.vy < 0) { b.grounded = false; return; }   /* yukari giderken zemin aranmaz */

  const feet = b.y + b.h;
  /* Yerdeyken egim TAKIBI: bir karede kat edilen yatay mesafe kadar yukari VE
   * asagi bakilir. groundSnap (6 px) sozlesme geregi HAVADAN INIS yardimidir;
   * 45 derece yokusta 7.72 px/kare inen bir govdeyi yerde tutmak icin hiza
   * baglı tolerans SART, aksi halde §4.5'in momentum niyeti bozulur. */
  const stick = Math.ceil(Math.abs(b.vx)) + 1;
  const up = b.wasGrounded ? stick : 0;
  const down = b.wasGrounded ? Math.max(PHYS.groundSnap, stick)
                             : (b.vy > 0 ? PHYS.groundSnap : 0);
  /* §4.11-2 cikinti toleransi: zaten yerdeyken hitbox 3 px tasarsa hala grounded. */
  const tol = b.wasGrounded ? PHYS.ledgeTolerance : 0;

  if (!probeGround(map, b.x - tol, b.x + b.w - 1 + tol, feet, up, down, GROUND)) {
    b.grounded = false;
    return;
  }
  b.y = GROUND.y - b.h;
  b.vy = 0;
  b.grounded = true;
  b.groundAngle = GROUND.angle;
  b.groundFlags = GROUND.flags;
  if (!b.wasGrounded) {
    b.landSquash = PHYS.landSquashFrames;
    b.jumping = false;
    b.apexUsed = 0;
    b.events |= EV_LAND;
  }
  /* Yuzey temaslari: SAYI uygulanmaz, yalniz bildirilir (bkz. dosya basi). */
  if (GROUND.flags & F_SPRING) b.events |= EV_SPRING;
  if (GROUND.flags & F_BOOST) b.events |= EV_BOOST;
  if (GROUND.flags & F_FAKE) b.events |= EV_FAKE;
  if (GROUND.flags & F_TAR) b.events |= EV_TAR;
}

/* Sprite donusu (§4.5): rotateThreshold altinda DIK, ustunde 11.25 derecelik
 * 8 kademeye yuvarlanir. Salt gorsel; fizige geri beslenmez. */
function spriteRotation(b) {
  if (!b.grounded || Math.abs(b.vx) < PHYS.rotateThreshold) { b.spriteAngle = 0; return; }
  b.spriteAngle = Math.round(b.groundAngle / ROT_STEP) * ROT_STEP;
}

/* ====================================================================== step */
/* SIRA SOZLESMEDIR — dogrulanmis ziplama geometrisi (17/16/33 kare, 55.56 px)
 * bu siradan dogar. Ozellikle: yer cekimi hareketten ONCE, ziplama itkisi yer
 * cekiminden SONRA uygulanir; boylece ziplama karesi TAM -6.60 kadar hareket
 * eder ve tepe yukseklik 3.47 tile cikar. Sirayi degistiren ziplamayi bozar. */
export function step(b, ctrl, cfg, map) {
  b.events = 0;
  b.wasGrounded = b.grounded;

  const coyoteMax = ctrl.coyoteFrames > 0 ? ctrl.coyoteFrames : cfg.coyoteFrames;
  const bufMax = ctrl.jumpBufferFrames > 0 ? ctrl.jumpBufferFrames : cfg.jumpBufferFrames;

  /* 1) tamponlar */
  if (b.grounded) b.coyote = coyoteMax; else if (b.coyote > 0) b.coyote--;
  if (ctrl.jumpPressed) b.jumpBuf = bufMax; else if (b.jumpBuf > 0) b.jumpBuf--;
  b.jumpHeld = !!ctrl.jumpDown;
  if (b.landSquash > 0) b.landSquash--;

  /* 2) yatay ivme / surtunme / skid */
  const mx = ctrl.moveX | 0;
  if (mx !== 0) b.facing = mx;
  horizontal(b, mx, cfg);

  /* 3) egim, 4) tasma bakimi */
  slope(b, cfg);
  overflow(b, cfg);

  /* 5) yer cekimi (yalniz havada) */
  if (!b.grounded) applyGravity(b);

  /* 6) ziplama — coyote + tampon */
  if (b.jumpBuf > 0 && (b.grounded || b.coyote > 0)) {
    b.vy = PHYS.jumpVelocity;
    b.grounded = false;
    b.coyote = 0; b.jumpBuf = 0;
    b.jumping = true; b.apexUsed = 0;
    b.events |= EV_JUMP;
  }

  /* 7) degisken ziplama kesmesi */
  applyJumpCut(b);

  /* 8) hareket: X sonra Y (§4.11-4) */
  sweepX(b, map);
  sweepY(b, map);

  /* 9) zemin: yapisma, cikinti toleransi, egim acisi */
  resolveGround(b, map);

  /* 10) gorsel turevler */
  spriteRotation(b);
}

/* ==========================================================================
 * HEADLESS DOGRULAMA
 * ==========================================================================
 * simulateJump GERCEK step()'i kullanir — ayri bir "test fizigi" YOK.
 * holdFrames: ziplama butonunun kac kare TUTULDUGU. 1 = ilk karede birakildi
 * (kesme 2. karede isler), Infinity = hic birakilmadi. */
export function simulateJump(cfg, holdFrames, mapIn) {
  const conf = cfg || makeConfig(1, 0, false);
  const map = mapIn || makeFlatRoom();
  const hold = holdFrames === undefined ? Infinity : holdFrames;
  const b = createBody(TILE * 4, TILE * 2, HIT_W, HIT_H);
  const c = createCtrl();

  /* yere in ve dur */
  for (let i = 0; i < 240 && !b.grounded; i++) step(b, c, conf, map);
  step(b, c, conf, map);
  const groundY = b.y;

  let f = 0, rise = 0, fall = 0, minY = b.y, prevY = b.y;
  c.jumpPressed = 1; c.jumpDown = 1;
  while (f < 600) {
    if (f >= hold) c.jumpDown = 0;
    step(b, c, conf, map);
    c.jumpPressed = 0;
    f++;
    if (b.y < prevY - 1e-9) rise++;
    else if (b.y > prevY + 1e-9) fall++;
    if (b.y < minY) minY = b.y;
    prevY = b.y;
    if (b.grounded && f > 1) break;
  }
  const peak = groundY - minY;
  return {
    riseFrames: rise, fallFrames: fall, airFrames: f,
    peakPx: peak, peakTiles: peak / TILE
  };
}

/* §4.4 W0 kademesinde tepe hiza cikis suresi — hiz merdiveni denetimi icin. */
export function simulateAccel(cfg, mapIn) {
  const conf = cfg || makeConfig(1, 0, false);
  const map = mapIn || makeFlatRoom();
  const b = createBody(TILE * 2, TILE * 2, HIT_W, HIT_H);
  const c = createCtrl();
  for (let i = 0; i < 240 && !b.grounded; i++) step(b, c, conf, map);
  c.moveX = 1;
  let f = 0, breakFrame = -1;
  while (f < 600 && b.vx < conf.maxSpeed - 1e-9) {
    step(b, c, conf, map); f++;
    if (breakFrame < 0 && b.vx >= conf.accelBreak) breakFrame = f;
  }
  return { framesToTop: f, framesToBreak: breakFrame, vx: b.vx, maxSpeed: conf.maxSpeed };
}

/* Tek cagriyla §4.3'un TAMAMINI basar. ok=false ise sabitlere dokunulmus. */
export function verifyJumpGeometry() {
  const cfg = makeConfig(1, 0, false);
  const full = simulateJump(cfg, Infinity);
  const rows = [
    { name: "riseFrames", got: full.riseFrames, want: 17 },
    { name: "fallFrames", got: full.fallFrames, want: 16 },
    { name: "airFrames", got: full.airFrames, want: 33 },
    { name: "peakPx(round)", got: Math.round(full.peakPx), want: 56 },
    { name: "peakTiles(2dp)", got: Math.round(full.peakTiles * 100) / 100, want: 3.47 }
  ];
  /* §4.3 birakma karesi tablosu. Sozlesme tablosu 15/27/42/56 px veriyor;
   * gercek surekli olcum 15.98/27.92/42.68/55.56'dir (tabloda ilk uc satir
   * floor, son satir round alinmis). Bu yuzden tolerans 1 px. */
  const cut = [[1, 15], [3, 27], [6, 42], [10, 56]];
  for (let i = 0; i < cut.length; i++) {
    const r = simulateJump(cfg, cut[i][0]);
    rows.push({
      name: "cut@" + cut[i][0], got: Math.round(r.peakPx * 100) / 100,
      want: cut[i][1], tol: 1
    });
  }
  let ok = true;
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i].tol || 0;
    rows[i].ok = Math.abs(rows[i].got - rows[i].want) <= t + 1e-9;
    if (!rows[i].ok) ok = false;
  }
  return { ok: ok, rows: rows };
}

export default { PHYS, createBody, createCtrl, makeConfig, step, simulateJump, verifyJumpGeometry };
