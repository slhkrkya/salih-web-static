/* ==========================================================================
 * game/entities.js — GENERIC SoA ENTITY HAVUZU
 * ==========================================================================
 *
 * Duşman/pickup/tehlike gibi "govde disi" varliklarin ortak deposu. Tur-ozel
 * mantik BURADA yok — bu modul yalniz depolama + yasam dongusu (spawn/free/
 * iterate) saglar. enemies.js, bosses.js (Faz 3) bu havuzu ISLER.
 *
 * GC BASKISI SIFIR (§10.5/§10.6 hedefi): update dongusunde `new`/nesne
 * literali YOK. Tum alanlar tipli dizi (SoA); spawn/free sabit-zaman, serbest
 * liste (free-list) ile, allocation'siz.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *
 *   import { createPool, MAX_ENTITIES, FLAG_ACTIVE, FLAG_HAZARD, FLAG_TELEGRAPH } from "./entities.js";
 *
 *   const pool = createPool();
 *   const id = pool.spawn(type, x, y);   -> index (0..MAX_ENTITIES-1) veya -1 (dolu)
 *   pool.free(id);                       -> ACTIVE bayragi kalkar, sonraki spawn'a acilir
 *   pool.forEachActive(fn);              -> fn(id) her AKTIF entity icin (allocation yok)
 *   pool.reset();                        -> tum havuzu bosaltir (sahne degisimi)
 *
 *   Alanlar (dogrudan indeksle okunur/yazilir, id ile):
 *     pool.type[id]      Uint8Array   — enemies.js'teki TYPE_* sabiti
 *     pool.state[id]     Uint8Array   — tur-ozel FSM durumu (enemies.js yorumlar)
 *     pool.timer[id]     Int16Array   — kare sayaci, tur-ozel anlamda
 *     pool.x[id],.y[id]  Float32Array — dunya pikseli, govde ile AYNI birim
 *     pool.vx[id],.vy[id] Float32Array
 *     pool.p0[id],.p1[id] Float32Array — tur-ozel genel amacli parametre (aci, faz, vb.)
 *     pool.group[id]     Uint8Array   — surumsel varliklar icin grup id (ZIL suru)
 *     pool.facing[id]    Int8Array    — -1 | 0 | 1
 *     pool.flags[id]     Uint8Array   — FLAG_* bit alani
 *
 *   pool.count           — su an aktif entity sayisi (telemetry.js icin)
 * ========================================================================== */

export const MAX_ENTITIES = 64;

export const FLAG_ACTIVE    = 1 << 0;
export const FLAG_HAZARD    = 1 << 1;   /* temasta oyuncuya revert/hasar bayragi */
export const FLAG_TELEGRAPH = 1 << 2;   /* su an bir telegraf penceresinde (render vurgusu) */
export const FLAG_STUNNED   = 1 << 3;   /* KABUK ile susturuldu (§7.1) */
export const FLAG_VULNERABLE = 1 << 4;  /* ifsa penceresinde, stomp/verb ile kirilabilir */

export function createPool() {
  const n = MAX_ENTITIES;
  const pool = {
    type: new Uint8Array(n),
    state: new Uint8Array(n),
    timer: new Int16Array(n),
    x: new Float32Array(n),
    y: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    p0: new Float32Array(n),
    p1: new Float32Array(n),
    group: new Uint8Array(n),
    facing: new Int8Array(n),
    flags: new Uint8Array(n)
  };

  /* `count` KASITLI OLARAK pool objesinin disinda, kapali bir degisken:
   * donen nesne `{...pool, ...}` yayilimiyla kuruluyor ve yayilim primitif
   * alanlari (Float32Array REFERANSLARI degil) o ANKI DEGERIYLE KOPYALAR —
   * `pool.count` gibi bir sayi alani olsaydi spawn/free'nin arttirdigi deger
   * disariya hic yansimazdi (yalniz TypedArray'ler referans oldugu icin
   * calisirdi). Getter kullanarak bu sinifin butun ornekleri icin onlenir. */
  let activeCount = 0;

  /* Serbest liste: bosta olan indeksler, LIFO. Allocation-free spawn/free. */
  const freeList = new Int16Array(n);
  for (let i = 0; i < n; i++) freeList[i] = n - 1 - i;
  let freeTop = n;

  function spawn(type, x, y) {
    if (freeTop <= 0) return -1;
    const id = freeList[--freeTop];
    pool.type[id] = type;
    pool.state[id] = 0;
    pool.timer[id] = 0;
    pool.x[id] = x; pool.y[id] = y;
    pool.vx[id] = 0; pool.vy[id] = 0;
    pool.p0[id] = 0; pool.p1[id] = 0;
    pool.group[id] = 0;
    pool.facing[id] = 1;
    pool.flags[id] = FLAG_ACTIVE;
    activeCount++;
    return id;
  }

  function free(id) {
    if (!(pool.flags[id] & FLAG_ACTIVE)) return;
    pool.flags[id] = 0;
    freeList[freeTop++] = id;
    activeCount--;
  }

  /* `fn(id)` her aktif entity icin cagrilir. Dizi tarama sirasi kararli degildir
   * (free-list LIFO) — sirali render gerekiyorsa cagiran x'e gore sıralasin. */
  function forEachActive(fn) {
    for (let id = 0; id < n; id++) {
      if (pool.flags[id] & FLAG_ACTIVE) fn(id);
    }
  }

  function reset() {
    pool.flags.fill(0);
    activeCount = 0;
    freeTop = n;
    for (let i = 0; i < n; i++) freeList[i] = n - 1 - i;
  }

  return {
    ...pool, spawn, free, forEachActive, reset,
    get count() { return activeCount; }
  };
}

export default createPool;
