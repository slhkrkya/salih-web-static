/* ==========================================================================
 * game/perf.js — GOVERNOR + HISTEREZIS (Faz 6)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §8.6 (kare butcesi 16,67 ms, %25+ slack
 * beklentisi), §10.4 (Faz 4 olcum tablosu). `telemetry.js` (Faz 2) SADECE
 * OLCER — hicbir uyarlama davranisi yoktur (bkz. telemetry.js). Bu modul
 * telemetry'nin `frameStats()` cikisini okuyup HISTEREZISLI bir kalite
 * kademesi (governor) uretir: dusurmek (downgrade) YUKSELTMEKTEN (upgrade)
 * çok daha CIMRI davranir ki tek bir yavas kare dalgası kademe "cirpinmasina"
 * (flapping) yol acmasin.
 *
 * SADELESTIRME (rapor icin acikca isaretli): motor zaten cok hafif (SoA
 * havuzlar, dirty-rect yok, ~40 aktif entity ustune hic cikmiyor, parallax
 * katmani HIC KURULU DEGIL) — pratikte bu governor'in gercekten devreye
 * girmesi beklenmez; yine de §8.6'nin "beklenti, hedef degil" cumlesi
 * geregi somut bir tuketici GEREKIR: su an TEK gercek kaldiraç parcacik
 * patlama SAYISIDIR (particles.js'in havuz boyutu SABIT kalir, yalniz
 * `burst()`'e verilen `count` bu kademeye gore kirpilir). Entity/parallax
 * alanlari ILERIDE gercek bir tuketici bulursa diye BILGI amacli tutulur.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createPerfGovernor } from "./perf.js";
 *
 *   const perf = createPerfGovernor(telemetry, opts?);
 *     opts.budgetMs (varsayilan 16.67), opts.slack (varsayilan 0.25)
 *   perf.update()          -> her karede BIR KEZ cagir (kendi ic sayaclarini ilerletir)
 *   perf.tier              -> "full" | "reduced" | "minimal"
 *   perf.particleBudget    -> o kademede bir burst() cagrisina izin verilen ust sinir
 *   perf.entityBudget      -> bilgi amacli, su an TUKETILMIYOR
 * ========================================================================== */

const TIERS = ["full", "reduced", "minimal"];
const PARTICLE_BUDGET = { full: 192, reduced: 96, minimal: 48 };
const ENTITY_BUDGET = { full: 40, reduced: 24, minimal: 12 };

const DOWNGRADE_AFTER = 30;   /* ~0,5 s @ 60fps ustune-butce oncesi kademe duser */
const UPGRADE_AFTER = 180;    /* ~3 s rahat calisma sonrasi kademe yukselir (cimri) */
const MIN_SAMPLES = 10;

export function createPerfGovernor(telemetry, opts) {
  const o = opts || {};
  const budgetMs = o.budgetMs || 16.67;
  const slack = o.slack === undefined ? 0.25 : o.slack;

  let tierIdx = 0;
  let overCount = 0, underCount = 0;

  function update() {
    const stats = telemetry.frameStats();
    if (stats.samples < MIN_SAMPLES) return;

    const overBudget = stats.avgMs > budgetMs * (1 + slack);
    const comfortablyUnder = stats.avgMs < budgetMs * (1 - slack * 0.5);

    if (overBudget) {
      underCount = 0;
      overCount++;
      if (overCount >= DOWNGRADE_AFTER && tierIdx < TIERS.length - 1) { tierIdx++; overCount = 0; }
    } else if (comfortablyUnder) {
      overCount = 0;
      underCount++;
      if (underCount >= UPGRADE_AFTER && tierIdx > 0) { tierIdx--; underCount = 0; }
    } else {
      overCount = 0; underCount = 0;
    }
  }

  function reset() { tierIdx = 0; overCount = 0; underCount = 0; }

  return {
    update, reset,
    get tier() { return TIERS[tierIdx]; },
    get particleBudget() { return PARTICLE_BUDGET[TIERS[tierIdx]]; },
    get entityBudget() { return ENTITY_BUDGET[TIERS[tierIdx]]; }
  };
}

export default createPerfGovernor;
