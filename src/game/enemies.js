/* ==========================================================================
 * game/enemies.js — DUSMANLAR + ATIS SISTEMI (MERMI / KIVILCIM / AVCI)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §4.1. Dort temel turun (TALIMAT, BORU AGZI,
 * DUGUM, ZIL) durum makineleri ve kare sayilari korunur; kitabin SUSTURMA
 * fiili (KABUK/gizlenme) yerini ATESE birakti — bkz. asagidaki not.
 *
 * ==========================================================================
 * DOVUS REVIZYONU (oyun testiyle geldi, kitaptan SAPMA — acikca isaretli)
 * ==========================================================================
 * Eski tasarimda dusmanla bas etmenin yolu "gizlenmek"ti: aksiyon tusunu
 * basili tutup telegrafi SUSTURMAK. Oyun testinde bu edilgen kaldi —
 * oyuncunun elinde bir SALDIRI fiili hic yoktu, dovus "dogru anda bekle"ye
 * indirgeniyordu. Yeni sozlesme:
 *
 *   ATES (oyuncu, J)  -> pool'a TYPE.BOLT dogar. Temel dusmana carparsa onu
 *                        SUSTURUR (FLAG_STUNNED, 90 kare — eski KABUK ile
 *                        AYNI sonuc, artik AKTIF bir eylemle kazanilir).
 *                        AVCI'nin canini dusurur, KIVILCIM/TOKEN'i havada
 *                        dusurur, patronun canini azaltir (bkz. bosses.js).
 *   KONI/RADAR kilidi -> DUGUM ve KOKLAYICI'nin konileri artik yerinde bir
 *                        "darbe" uretmez; kilitlenince bir AVCI (hayalet)
 *                        DOGURUR. Avci duvarlardan gecer, oyuncuyu kovalar,
 *                        temasta GERI AL. Kurtulmanin yolu ONA ATES ETMEK.
 *   KIVILCIM          -> patronlarin mermisi (gokten yagmur / yatay salvo).
 *                        Kati karoya carpinca soner: oyuncunun Q ile koydugu
 *                        gecici zemin de KALKAN olarak kullanilabilir.
 *
 * D-2 ("para birimi olum degil ikna") KORUNUR: hicbir temel dusman turu
 * oldurmez, temas GERI AL'dir; oran yalnizca SUSTURULMAMIS bir telegraf
 * penceresi dolunca yukselir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { TYPE, spawn, update, draw, hazardHitTest, boltHitTest,
 *            spawnBolt, spawnHunter, spawnShard, countHunters, clearHunters }
 *     from "./enemies.js";
 *
 *   spawn(pool, type, x, y, opts) -> id
 *     opts: { cmd, face } TALIMAT icin (§8.3 spawn semasi ile ayni alanlar)
 *
 *   spawnBolt(pool, x, y, dirX)          -> oyuncu mermisi (zararsiz, hedef arar)
 *   spawnShard(pool, x, y, vx, vy, grav) -> dusman mermisi (FLAG_HAZARD)
 *   spawnHunter(pool, x, y)              -> AVCI (FLAG_HAZARD, 2 can)
 *   countHunters(pool) / clearHunters(pool)
 *
 *   update(pool, dt, playerBody, map, onObey, onSpawnToken) -> void
 *     - onObey() : telegraf susturulmadan bitince (rate.obey icin)
 *
 *   boltHitTest(pool, onEvent) -> void
 *     - Oyuncu mermilerini TUM hedeflere karsi cozer. onEvent(kind, x, y):
 *       "stun" | "hunter-hit" | "hunter-down" | "shot-down"
 *
 *   hazardHitTest(pool, body) -> id | -1   (oyuncuya degen FLAG_HAZARD varlik)
 *
 *   draw(ctx, pool, camX, camY, palette, font, sprites) -> void
 * ========================================================================== */

import { TILE } from "./scale.js";
import { F_SOLID, F_TEMP } from "./tilemap.js";
import { FLAG_ACTIVE, FLAG_HAZARD, FLAG_TELEGRAPH, FLAG_STUNNED, FLAG_VULNERABLE } from "./entities.js";
import { SLOT } from "./render.js";

export const TYPE = Object.freeze({
  INSTRUCTION: 1, PIPE_MOUTH: 2, NODE: 3, BELL: 4, TOKEN: 5,
  BOLT: 6,      /* oyuncunun mermisi */
  HUNTER: 7,    /* koni kilidinin dogurdugu hayalet */
  SHARD: 8      /* patron mermisi */
});

/* --- kare sayilari (SOZLESME, §4.1) ------------------------------------- */
const INS_IDLE = 60, INS_TELEGRAPH = 36, INS_WINDOW = 24, INS_COOLDOWN = 90;
const PIPE_PERIOD = 48, PIPE_JAM = 90;
const NODE_SWEEP_PERIOD = 120 /* 2 s */, NODE_LOCK = 36, NODE_PULSE = 18;
const BELL_CHARGE = 42, BELL_RAIN = 36, BELL_REGROUP = 120;

/* --- tasarim takdiri (kitapta sayi verilmemis, acikca isaretli) --------- */
const NODE_CONE_DEG = 60;          /* "koni 60 derece" — genislik verili, menzil degil */
const NODE_RANGE_PX = 96;          /* takdir */
const NODE_COOLDOWN = 150;         /* avci dogurduktan sonraki sessizlik (takdir) */
const NODE_HUNTER_CAP = 2;         /* ayni anda en fazla 2 avci — ekran okunur kalsin */
const TOKEN_SPEED = 2.0;           /* px/f, takdir */
const TOKEN_LIFE = 90;             /* kare, takdir */
const BELL_MEMBER_COUNT = 11;      /* "9-14'luk suru" araligindan orta deger */
const BELL_RAIN_RADIUS = 40;       /* takdir */

/* --- ATIS SISTEMI (dovus revizyonu, hepsi tasarim takdiri) -------------- */
export const BOLT_SPEED = 4.6;     /* px/f — oyuncunun tepe hizinin (3,51) belirgin ustunde */
const BOLT_LIFE = 80;              /* kare -> ~368 px menzil, ekran genisliginin ~%77'si */
const BOLT_R = 5;                  /* carpisma yaricapi */
export const SHOT_STUN_FRAMES = 90; /* vurulan temel dusmanin susma suresi (eski KABUK ile ayni) */

export const HUNTER_HP = 2;
const HUNTER_LIFE = 480;           /* 8 s sonra kendiliginden dagilir — sonsuz kovalamaca yok */
const HUNTER_ACCEL = 0.14;
const HUNTER_MAX_SPEED = 2.35;     /* W1 tepe hizinin (2,99) ALTINDA: kacmak MUMKUN, ama pahali */
const HUNTER_FLASH = 8;
const HUNTER_R = 8;

const SHARD_LIFE = 150;
const SHARD_R = 4;

const S_IDLE = 0, S_TELEGRAPH = 1, S_WINDOW = 2, S_COOLDOWN = 3, S_PULSE = 4, S_HOLD = 5;

/* Verilen dunya noktasi kati mi (harita disi yanlar KATI, gokyuzu BOS sayilir).
 * Mermi/kivilcim omrunu bu belirler; oyuncunun Q ile koydugu karo da F_SOLID
 * tasidigi icin dogal olarak KALKAN gorevi gorur. */
function solidAt(map, x, y) {
  if (!map) return false;
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || tx >= map.w) return true;
  if (ty < 0) return false;
  if (ty >= map.h) return true;
  return !!(map.flags[ty * map.w + tx] & F_SOLID);
}

export function spawn(pool, type, x, y, opts) {
  const id = pool.spawn(type, x, y);
  if (id === -1) return -1;
  const o = opts || {};
  pool.facing[id] = o.face || 1;
  if (type === TYPE.INSTRUCTION) {
    pool.state[id] = S_IDLE;
    pool.timer[id] = INS_IDLE;
    pool.p1[id] = 0;   /* cmd string index, draw() bakar (opts.cmdCode uzerinden dahi degil, basit tutuluyor) */
  } else if (type === TYPE.PIPE_MOUTH) {
    pool.state[id] = S_IDLE;
    pool.timer[id] = PIPE_PERIOD;
  } else if (type === TYPE.NODE) {
    pool.state[id] = S_IDLE;
    pool.timer[id] = 0;
    pool.p0[id] = 0;   /* koni acisi (radyan), taban facing yonunde salinir */
  } else if (type === TYPE.BELL) {
    pool.state[id] = S_IDLE;
    pool.timer[id] = BELL_CHARGE + ((id * 37) % 30);   /* fazlar arasi hafif ofset, senkron gorunmesin */
  }
  return id;
}

/* ==========================================================================
 * ATIS SISTEMI — dogurma
 * ==========================================================================
 * MERMI (BOLT) FLAG_HAZARD TASIMAZ: hazardHitTest yalniz o bayragi tarar,
 * yani oyuncunun kendi mermisi ona asla zarar veremez. Ayrim tur degil BAYRAK
 * uzerinden kuruludur ki yeni bir tur eklendiginde "kimin mermisi" sorusu
 * tekrar sorulmasin. */
export function spawnBolt(pool, x, y, dirX) {
  const id = pool.spawn(TYPE.BOLT, x, y);
  if (id === -1) return -1;
  const d = dirX < 0 ? -1 : 1;
  pool.vx[id] = BOLT_SPEED * d;
  pool.vy[id] = 0;
  pool.timer[id] = BOLT_LIFE;
  pool.facing[id] = d;
  return id;
}

/* grav: 0 = duz ucus (salvo), >0 = hizlanarak duser (gokten yagmur). */
export function spawnShard(pool, x, y, vx, vy, grav) {
  const id = pool.spawn(TYPE.SHARD, x, y);
  if (id === -1) return -1;
  pool.vx[id] = vx; pool.vy[id] = vy;
  pool.p0[id] = grav || 0;
  pool.timer[id] = SHARD_LIFE;
  pool.flags[id] |= FLAG_HAZARD;
  return id;
}

export function spawnHunter(pool, x, y) {
  const id = pool.spawn(TYPE.HUNTER, x, y);
  if (id === -1) return -1;
  pool.timer[id] = HUNTER_LIFE;
  pool.p0[id] = HUNTER_HP;   /* p0 = kalan can */
  pool.p1[id] = 0;           /* p1 = vurulma parlamasi */
  pool.flags[id] |= FLAG_HAZARD;
  return id;
}

export function countHunters(pool) {
  let n = 0;
  for (let id = 0; id < pool.flags.length; id++) {
    if ((pool.flags[id] & FLAG_ACTIVE) && pool.type[id] === TYPE.HUNTER) n++;
  }
  return n;
}

/* Patron yenilince/dovus bitince cagrilir: sahipsiz kalan avcilar cikis
 * yolunda oyuncuyu kovalamaya devam etmesin (ZIL suruSunun daha once bulunan
 * "yenilen patron hala yagmur yagdiriyor" hatasiyla ayni sinif). */
export function clearHunters(pool) {
  for (let id = 0; id < pool.flags.length; id++) {
    if ((pool.flags[id] & FLAG_ACTIVE) && pool.type[id] === TYPE.HUNTER) pool.free(id);
  }
}

function dist2(x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0; return dx * dx + dy * dy; }

/* Oyuncu bu yaricapin disindaysa telegrafi SUSTURMAK imkansizdir (SHELL menzili
 * SHELL_TAP_RANGE=56 / SHELL_HOLD_RANGE=72). D-2 "para birimi olum degil ikna"
 * ilkesi acikca "her deger degisikligi karsilanabilir olmali" der — oyuncu
 * uzaktaysa/gectiyse cevrim IDLE'da BEKLER, arkadan sessizce oran sisirmez. */
const ENGAGE_RANGE = 96;

function updateInstruction(pool, id, body, onObey) {
  const s = pool.state[id];
  if (pool.flags[id] & FLAG_STUNNED) {
    pool.timer[id]--;
    pool.flags[id] &= ~FLAG_TELEGRAPH;
    if (pool.timer[id] <= 0) { pool.state[id] = S_COOLDOWN; pool.timer[id] = INS_COOLDOWN; pool.flags[id] &= ~FLAG_STUNNED; }
    return;
  }
  if (s === S_IDLE) {
    const inRange = body && dist2(pool.x[id], pool.y[id], body.x + body.w * 0.5, body.y + body.h * 0.5) <= ENGAGE_RANGE * ENGAGE_RANGE;
    if (!inRange) return;         /* oyuncu yokken sayac ISLEMEZ — arkadan sessiz ceza yok */
    pool.timer[id]--;
    if (pool.timer[id] <= 0) {
      pool.state[id] = S_TELEGRAPH; pool.timer[id] = INS_TELEGRAPH;
      pool.flags[id] |= FLAG_TELEGRAPH;
    }
    return;
  }
  pool.timer[id]--;
  if (s === S_TELEGRAPH && pool.timer[id] <= 0) {
    pool.state[id] = S_WINDOW; pool.timer[id] = INS_WINDOW;
  } else if (s === S_WINDOW && pool.timer[id] <= 0) {
    pool.flags[id] &= ~FLAG_TELEGRAPH;
    if (onObey) onObey();
    pool.state[id] = S_COOLDOWN; pool.timer[id] = INS_COOLDOWN;
  } else if (s === S_COOLDOWN && pool.timer[id] <= 0) {
    pool.state[id] = S_IDLE; pool.timer[id] = INS_IDLE;
  }
}

function updatePipeMouth(pool, id, onHazardSpawn) {
  const s = pool.state[id];
  pool.timer[id]--;
  if (s === S_IDLE) {
    if (pool.flags[id] & FLAG_STUNNED) { pool.flags[id] &= ~(FLAG_STUNNED | FLAG_TELEGRAPH); return; }
    if (pool.timer[id] === 8) pool.flags[id] |= FLAG_TELEGRAPH;   /* emisyondan 8f once uyari */
    if (pool.timer[id] <= 0) {
      pool.flags[id] &= ~FLAG_TELEGRAPH;
      if (onHazardSpawn) onHazardSpawn(id);
      pool.state[id] = S_COOLDOWN; pool.timer[id] = PIPE_JAM;
    }
  } else if (s === S_COOLDOWN && pool.timer[id] <= 0) {
    pool.state[id] = S_IDLE; pool.timer[id] = PIPE_PERIOD;
  }
}

function updateToken(pool, id, map) {
  pool.x[id] += pool.vx[id];
  pool.timer[id]--;
  const tx = Math.floor(pool.x[id] / TILE), ty = Math.floor(pool.y[id] / TILE);
  const flagsAt = (y) => (map && tx >= 0 && tx < map.w && y >= 0 && y < map.h) ? map.flags[y * map.w + tx] : F_SOLID;
  /* Token KENDI satirindaki kati karoda durur (degismedi). EK OLARAK: bir alt
   * satirda OYUNCUNUN KOYDUGU (F_TEMP) bir karo varsa da durur — YENİDEN YAZ
   * karosu artik oyuncunun bastigi zemin satirina konuyor (bkz. verbs.js
   * placeSlugTile notu), token ise govde satirinda ucuyor; "önüne bir levha
   * at, atış ona çarpsın" etkilesimi baska turlu hic gerceklesemezdi.
   * DIKKAT: alt satir kontrolu YALNIZ F_TEMP icindir — dunyanin normal zemini
   * de sayilsaydi token dogar dogmaz yok olurdu (boru agzi hic ates etmezdi). */
  const blocked = (flagsAt(ty) & F_SOLID) || ((flagsAt(ty + 1) & F_TEMP) && (flagsAt(ty + 1) & F_SOLID));
  if (pool.timer[id] <= 0 || blocked) pool.free(id);
}

function updateNode(pool, id, body, onObey) {
  const s = pool.state[id];
  const baseAngle = pool.facing[id] > 0 ? 0 : Math.PI;

  if (pool.flags[id] & FLAG_STUNNED) {
    pool.flags[id] &= ~(FLAG_TELEGRAPH);
    pool.timer[id]--;
    if (pool.timer[id] <= 0) { pool.state[id] = S_IDLE; pool.flags[id] &= ~FLAG_STUNNED; }
    return;
  }

  if (s === S_IDLE) {
    pool.p0[id] = baseAngle + Math.sin(pool.timer[id] / NODE_SWEEP_PERIOD * Math.PI * 2) * (NODE_CONE_DEG * 0.5 * Math.PI / 180);
    pool.timer[id]++;
    if (body) {
      const cx = body.x + body.w * 0.5, cy = body.y + body.h * 0.5;
      const ex = pool.x[id], ey = pool.y[id];
      const toPlayer = Math.atan2(cy - ey, cx - ex);
      let da = Math.abs(toPlayer - pool.p0[id]);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da <= (NODE_CONE_DEG * 0.5 * Math.PI / 180) && dist2(ex, ey, cx, cy) <= NODE_RANGE_PX * NODE_RANGE_PX) {
        pool.state[id] = S_TELEGRAPH; pool.timer[id] = NODE_LOCK;
        pool.flags[id] |= FLAG_TELEGRAPH;
      }
    }
  } else if (s === S_TELEGRAPH) {
    pool.timer[id]--;
    if (pool.timer[id] <= 0) {
      pool.flags[id] &= ~FLAG_TELEGRAPH;
      /* DOVUS REVIZYONU: koni artik yerinde bir "darbe" (S_PULSE + FLAG_HAZARD)
       * uretmiyor. Kilit tamamlaninca bir AVCI dogar ve oyuncuyu kovalar —
       * tehdit sabit bir noktadan cikip HAREKETLI hale gelir, cevabi da
       * edilgen beklemek degil ATES ETMEK olur. Oran cezasi ayni yerde
       * (kilidin tamamlanmasi) kalir: DUGUM'u vaktinde vurup susturan oyuncu
       * hem avciyi hem oran artisini onlemis olur. */
      if (countHunters(pool) < NODE_HUNTER_CAP) spawnHunter(pool, pool.x[id], pool.y[id] - 6);
      if (onObey) onObey();
      pool.state[id] = S_COOLDOWN; pool.timer[id] = NODE_COOLDOWN;
    }
  } else if (s === S_COOLDOWN) {
    pool.timer[id]--;
    if (pool.timer[id] <= 0) { pool.state[id] = S_IDLE; pool.timer[id] = 0; }
  }
}

/* --------------------------------------------------- ATIS SISTEMI: guncelleme */
function updateBolt(pool, id, map) {
  pool.x[id] += pool.vx[id];
  pool.y[id] += pool.vy[id];
  pool.timer[id]--;
  if (pool.timer[id] <= 0 || solidAt(map, pool.x[id], pool.y[id])) pool.free(id);
}

function updateShard(pool, id, map) {
  pool.vy[id] += pool.p0[id];
  pool.x[id] += pool.vx[id];
  pool.y[id] += pool.vy[id];
  pool.timer[id]--;
  if (pool.timer[id] <= 0 || solidAt(map, pool.x[id], pool.y[id])) pool.free(id);
}

/* AVCI duvarlardan GECER (hayalet). Bu bilincli: yol bulma yok, tehdit her
 * zaman okunabilir bir duz cizgide gelir ve oyuncu "arkasindaki duvarin
 * ardina saklandim ama yine de yedim" surprizini yasamaz — gorunen sey
 * gercekten geliyor. Buna karsilik hizi oyuncunun tepe hizinin ALTINDA
 * kalir: kacmak her zaman bir secenektir, sadece ilerlemeyi yavaslatir. */
function updateHunter(pool, id, body) {
  pool.timer[id]--;
  if (pool.p1[id] > 0) pool.p1[id]--;
  if (pool.timer[id] <= 0) { pool.free(id); return; }
  if (!body) return;
  const cx = body.x + body.w * 0.5, cy = body.y + body.h * 0.5;
  const dx = cx - pool.x[id], dy = cy - pool.y[id];
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  pool.vx[id] += (dx / d) * HUNTER_ACCEL;
  pool.vy[id] += (dy / d) * HUNTER_ACCEL;
  const sp = Math.sqrt(pool.vx[id] * pool.vx[id] + pool.vy[id] * pool.vy[id]);
  if (sp > HUNTER_MAX_SPEED) {
    pool.vx[id] = pool.vx[id] / sp * HUNTER_MAX_SPEED;
    pool.vy[id] = pool.vy[id] / sp * HUNTER_MAX_SPEED;
  }
  pool.x[id] += pool.vx[id];
  pool.y[id] += pool.vy[id];
  pool.facing[id] = pool.vx[id] < 0 ? -1 : 1;
}

function updateBell(pool, id) {
  const s = pool.state[id];
  pool.timer[id]--;
  if (pool.flags[id] & FLAG_STUNNED) {
    pool.flags[id] &= ~(FLAG_TELEGRAPH | FLAG_HAZARD);
    if (pool.timer[id] <= 0) { pool.state[id] = S_HOLD /* REGROUP */; pool.timer[id] = BELL_REGROUP; pool.flags[id] &= ~FLAG_STUNNED; }
    return;
  }
  if (s === S_IDLE) {
    if (pool.timer[id] <= 0) { pool.state[id] = S_TELEGRAPH; pool.timer[id] = BELL_CHARGE; pool.flags[id] |= FLAG_TELEGRAPH; }
  } else if (s === S_TELEGRAPH) {
    if (pool.timer[id] <= 0) {
      pool.flags[id] &= ~FLAG_TELEGRAPH;
      pool.state[id] = S_PULSE /* RAIN */; pool.timer[id] = BELL_RAIN;
      pool.flags[id] |= FLAG_HAZARD;
    }
  } else if (s === S_PULSE) {
    if (pool.timer[id] <= 0) { pool.flags[id] &= ~FLAG_HAZARD; pool.state[id] = S_HOLD; pool.timer[id] = BELL_REGROUP; }
  } else if (s === S_HOLD) {
    if (pool.timer[id] <= 0) { pool.state[id] = S_IDLE; pool.timer[id] = INS_IDLE; }
  }
}

/* Ana giris noktasi. onObey(amount) rate.obey icin cagrilir (amount = OB,
 * rate.pickOB() cagirani boot.js'te secilir); onHazardHit(id) oyuncu-varlik
 * cakismasi TESTININ boot.js'te yapilmasini bekler (bu modul temas testi
 * yapmaz — govde/tilemap koordinatlarina bakmaz, yalniz durum makinesi). */
export function update(pool, dt, body, map, onObey, onSpawnToken) {
  pool.forEachActive((id) => {
    const t = pool.type[id];
    if (t === TYPE.INSTRUCTION) updateInstruction(pool, id, body, onObey);
    else if (t === TYPE.PIPE_MOUTH) updatePipeMouth(pool, id, (pid) => {
      const spawnX = pool.x[pid] + pool.facing[pid] * 10;
      const tokenId = pool.spawn(TYPE.TOKEN, spawnX, pool.y[pid]);
      if (tokenId !== -1) {
        pool.vx[tokenId] = TOKEN_SPEED * pool.facing[pid];
        pool.timer[tokenId] = TOKEN_LIFE;
        pool.flags[tokenId] |= FLAG_HAZARD;
        pool.facing[tokenId] = pool.facing[pid];
      }
      if (onSpawnToken) onSpawnToken(tokenId);
    });
    else if (t === TYPE.NODE) updateNode(pool, id, body, onObey);
    else if (t === TYPE.BELL) updateBell(pool, id);
    else if (t === TYPE.TOKEN) updateToken(pool, id, map);
    else if (t === TYPE.BOLT) updateBolt(pool, id, map);
    else if (t === TYPE.SHARD) updateShard(pool, id, map);
    else if (t === TYPE.HUNTER) updateHunter(pool, id, body);
  });
}

/* ==========================================================================
 * boltHitTest — oyuncunun mermilerini TUM hedeflere karsi cozer
 * ==========================================================================
 * forEachActive DEGIL duz indeks dongusu kullanilir: bu fonksiyon iterasyon
 * sirasinda pool.free() cagirir ve serbest liste LIFO oldugu icin ayni karede
 * bir sonraki spawn o indeksi geri verebilir — forEachActive'in tek gecisli
 * taramasinda bu "yeni dogan seyi ayni karede tekrar isle" hatasini uretirdi.
 *
 * onEvent(kind, x, y):
 *   "stun"        temel dusman susturuldu (eski KABUK sonucu)
 *   "hunter-hit"  avci vuruldu ama hala ayakta
 *   "hunter-down" avci dagildi
 *   "shot-down"   dusman mermisi (TOKEN/KIVILCIM) havada dusuruldu
 * Patronlar bu havuzda DEGIL — onlarin vurus testi boot.js'te, boss.hitTest
 * ile yapilir (bkz. bosses.js). */
export function boltHitTest(pool, onEvent) {
  const n = pool.flags.length;
  for (let b = 0; b < n; b++) {
    if (!(pool.flags[b] & FLAG_ACTIVE) || pool.type[b] !== TYPE.BOLT) continue;
    const bx = pool.x[b], by = pool.y[b];
    for (let e = 0; e < n; e++) {
      if (e === b || !(pool.flags[e] & FLAG_ACTIVE)) continue;
      const t = pool.type[e];
      if (t === TYPE.BOLT) continue;
      const r = t === TYPE.HUNTER ? HUNTER_R : (t === TYPE.SHARD || t === TYPE.TOKEN ? SHARD_R : 10);
      const ry = t === TYPE.HUNTER ? HUNTER_R : (t === TYPE.SHARD || t === TYPE.TOKEN ? SHARD_R : 12);
      if (Math.abs(bx - pool.x[e]) > r + BOLT_R || Math.abs(by - pool.y[e]) > ry + BOLT_R) continue;

      const ex = pool.x[e], ey = pool.y[e];
      if (t === TYPE.HUNTER) {
        pool.p0[e] -= 1;
        pool.p1[e] = HUNTER_FLASH;
        if (pool.p0[e] <= 0) { pool.free(e); if (onEvent) onEvent("hunter-down", ex, ey); }
        else if (onEvent) onEvent("hunter-hit", ex, ey);
      } else if (t === TYPE.SHARD || t === TYPE.TOKEN) {
        /* Gelen atisi havada vurup dusurmek: hem odul hem de "gokten mermi
         * yagmuru"nun tek cevabinin kacmak olmadigini ogreten an. */
        pool.free(e);
        if (onEvent) onEvent("shot-down", ex, ey);
      } else {
        if (pool.flags[e] & FLAG_STUNNED) continue;   /* zaten susmus: mermi bosa gitmesin */
        pool.flags[e] |= FLAG_STUNNED;
        pool.flags[e] &= ~FLAG_TELEGRAPH;
        pool.timer[e] = SHOT_STUN_FRAMES;
        if (onEvent) onEvent("stun", ex, ey);
      }
      pool.free(b);
      break;
    }
  }
}

/* ZIL suru uyesinin surunun MERKEZINE gore ofseti. Cizim ve carpisma testi
 * BU TEK KAYNAKTAN beslenir — ikisi ayri formul kullandigi surece "gorunmeyen
 * bir seye carpma" hatasi kacinilmazdi. */
const BELL_POS = { dx: 0, dy: 0 };
function bellMemberPos(pool, id, m, raining) {
  const ang = (m / BELL_MEMBER_COUNT) * Math.PI * 2 + pool.timer[id] * 0.02;
  const r = raining ? BELL_RAIN_RADIUS : 14;
  BELL_POS.dx = Math.cos(ang) * r;
  BELL_POS.dy = Math.sin(ang) * r * 0.5 + (raining ? (BELL_RAIN - pool.timer[id]) * 1.5 : 0);
  return BELL_POS;
}

/* Oyuncu govdesiyle AABB kesisimi olan ve su an FLAG_HAZARD tasiyan tum
 * varliklarin id'sini dondurur (ZIL RAIN icin surunun etrafina saçilmis
 * sanal noktalar kontrol edilir). Cagiran (boot.js) revert baslatir. */
export function hazardHitTest(pool, body) {
  const bx0 = body.x, by0 = body.y, bx1 = body.x + body.w, by1 = body.y + body.h;
  let hit = -1;
  pool.forEachActive((id) => {
    if (hit !== -1) return;
    if (!(pool.flags[id] & FLAG_HAZARD)) return;
    const t = pool.type[id];
    if (t === TYPE.BELL) {
      for (let m = 0; m < BELL_MEMBER_COUNT; m++) {
        const p = bellMemberPos(pool, id, m, true);
        const mx = pool.x[id] + p.dx, my = pool.y[id] + p.dy;
        if (mx >= bx0 - 4 && mx <= bx1 + 4 && my >= by0 - 4 && my <= by1 + 4) { hit = id; break; }
      }
    } else {
      const ex0 = pool.x[id] - 8, ey0 = pool.y[id] - 10, ex1 = pool.x[id] + 8, ey1 = pool.y[id] + 10;
      if (bx0 < ex1 && bx1 > ex0 && by0 < ey1 && by1 > ey0) hit = id;
    }
  });
  return hit;
}

const CMD_LABEL = { STOP: "DUR", JUMP: "ZIPLA", DOWN: "ASAGI ATLA" };

/* `sprites` : creaturesprites.js'in createCreatureSprites() cikisi. El-piksel
 * govde cizimi ORAYA devredildi (bkz. plan Faz 3); koni/menzil gibi surekli
 * geometrik ipuclari (NODE'un okuma konisi) BURADA, procedural kalir —
 * onlarin "sekli" degil suan neyi taradigi onemli, sprite'a sigmaz. */
export function draw(ctx, pool, camX, camY, palette, font, sprites) {
  pool.forEachActive((id) => {
    const t = pool.type[id];
    const sx = Math.round(pool.x[id] - camX), sy = Math.round(pool.y[id] - camY);
    const telegraph = !!(pool.flags[id] & FLAG_TELEGRAPH);
    const hazard = !!(pool.flags[id] & FLAG_HAZARD);
    const stunned = !!(pool.flags[id] & FLAG_STUNNED);
    const facing = pool.facing[id];

    if (t === TYPE.INSTRUCTION) {
      const P = sprites.POSE.INSTRUCTION;
      const pose = stunned ? P.STUNNED : (telegraph ? P.TELEGRAPH : P.IDLE);
      const [w, h] = sprites.SIZE.instruction;
      sprites.draw(ctx, "instruction", pose, sx - w / 2, sy - h / 2, facing);
      if (telegraph && font) font.drawCentered(ctx, "!", sx, sy - 20, SLOT.BLACK, 1);
    } else if (t === TYPE.PIPE_MOUTH) {
      const P = sprites.POSE.PIPE_MOUTH;
      const pose = stunned ? P.STUNNED : (telegraph ? P.EMIT : P.IDLE);
      const [w, h] = sprites.SIZE.pipeMouth;
      sprites.draw(ctx, "pipeMouth", pose, sx - w / 2, sy - h / 2, facing);
    } else if (t === TYPE.NODE) {
      const P = sprites.POSE.NODE;
      /* Avci dogurduktan sonraki ilk 12 kare "ates etti" pozu — koni artik
       * bir hazard uretmedigi icin eski `hazard ? PULSE` dali hic
       * calismiyordu ve dugum hicbir zaman "az once bir sey yapti" gibi
       * gorunmuyordu. */
      const firing = pool.state[id] === S_COOLDOWN && pool.timer[id] > NODE_COOLDOWN - 12;
      const pose = stunned ? P.STUNNED : (firing ? P.PULSE : (telegraph ? P.TELEGRAPH : P.IDLE));
      const [w, h] = sprites.SIZE.node;
      sprites.draw(ctx, "node", pose, sx - w / 2, sy - h / 2, facing);
      if (!firing && !stunned) {
        const a0 = pool.p0[id] - (NODE_CONE_DEG * 0.5 * Math.PI / 180);
        const a1 = pool.p0[id] + (NODE_CONE_DEG * 0.5 * Math.PI / 180);
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = palette.css[SLOT.ACCENT];
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, NODE_RANGE_PX, a0, a1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (t === TYPE.BELL) {
      const P = sprites.POSE.BELL;
      const pose = stunned ? P.STUNNED : ((hazard || telegraph) ? P.RING : P.IDLE);
      const [w, h] = sprites.SIZE.bell;
      for (let m = 0; m < BELL_MEMBER_COUNT; m++) {
        /* bulunan gercek ADALET hatasi: yagmur uyeleri hazardHitTest'te
         * `+ (BELL_RAIN - timer) * 1.5` ile ASAGI DOGRU DUSUYORDU ama cizimde
         * bu terim YOKTU — yani vurus kutulari ekranda gorunen noktalardan
         * 0..54 px asagida geziyordu. Oyuncu hicbir seye degmeden REVERT
         * yiyordu. Konum artik TEK yerden (bellMemberPos) turetiliyor. */
        const p = bellMemberPos(pool, id, m, hazard);
        sprites.draw(ctx, "bell", pose, Math.round(sx + p.dx) - w / 2, Math.round(sy + p.dy) - h / 2, 1);
      }
    } else if (t === TYPE.TOKEN) {
      const [w, h] = sprites.SIZE.token;
      sprites.draw(ctx, "token", sprites.POSE.TOKEN.DEFAULT, sx - w / 2, sy - h / 2, facing);
    } else if (t === TYPE.BOLT) {
      const [w, h] = sprites.SIZE.bolt;
      sprites.draw(ctx, "bolt", sprites.POSE.BOLT.DEFAULT, sx - w / 2, sy - h / 2, facing);
    } else if (t === TYPE.SHARD) {
      const [w, h] = sprites.SIZE.shard;
      sprites.draw(ctx, "shard", sprites.POSE.SHARD.DEFAULT, sx - w / 2, sy - h / 2, facing);
    } else if (t === TYPE.HUNTER) {
      const P = sprites.POSE.HUNTER;
      const [w, h] = sprites.SIZE.hunter;
      sprites.draw(ctx, "hunter", pool.p1[id] > 0 ? P.HIT : P.IDLE, sx - w / 2, sy - h / 2, facing);
      /* Kalan can, govdenin ustunde nokta olarak. Iki canli bir dusmanin
       * "vurdum ama olmedi" durumu aksi halde okunmuyordu. */
      const hp = pool.p0[id] | 0;
      for (let k = 0; k < HUNTER_HP; k++) {
        ctx.fillStyle = palette.css[k < hp ? SLOT.HAZARD : SLOT.INK_SOFT];
        ctx.fillRect(sx - 5 + k * 6, sy - h / 2 - 5, 4, 3);
      }
      /* Omrunun son saniyesinde solar: "dagilmak uzere" bilgisi bedava. */
      if (pool.timer[id] < 60) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = palette.css[SLOT.BG];
        ctx.fillRect(sx - w / 2, sy - h / 2, w, h);
        ctx.restore();
      }
    }
  });
}

export default {
  TYPE, spawn, update, draw, hazardHitTest, boltHitTest,
  spawnBolt, spawnShard, spawnHunter, countHunters, clearHunters
};
