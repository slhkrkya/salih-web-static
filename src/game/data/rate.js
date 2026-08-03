/* ==========================================================================
 * game/data/rate.js — IKNA ORANI ARITMETIGI (v0)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §3. `rate` TAMSAYIDIR, birimi yuzde
 * puaninin 100'de biri (9519 = %95,19). Float drift YOK — save.js de
 * bu tamsayiyi aynen saklar (§8.4).
 *
 * KITAP DUZELTMESI (§12-1, KRITIK): asil formul `rate=min(rate+OB,ceil)`
 * tavanin USTUNDEYKEN itaat edileni ODULE cevirir (oran DUSER). Asagidaki
 * `obey()` bunu KAPATIR: tavan ustunde itaat NO-OP'tur.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { obey, drain, pickOB, RATE_V0, assertRateCurveV0 } from "./rate.js";
 *
 *   obey(rate, floor, OB)   -> yeni rate. Tavan (floor+1200) ustundeyken NO-OP.
 *   drain(rate, floor, per) -> yeni rate. floor'un altina inmez (geri alma seridi).
 *   pickOB()                -> [60,120] arasi tamsayi (emergent fazla, §8.2-2).
 *   RATE_V0                 -> v0'nin 2 asamalik egri verisi (§3.6).
 *   assertRateCurveV0(R)    -> dev-mode dogrulama; invaryant kirilirsa throw.
 * ========================================================================== */

export function obey(rate, floor, OB) {
  const ceil = floor + 1200;
  if (rate >= ceil) return rate;
  return Math.min(rate + OB, ceil);
}

export function drain(rate, floor, per) {
  return Math.max(floor, rate - per);
}

export function pickOB() {
  return 60 + Math.floor(Math.random() * 61);   /* [60,120] tamsayi */
}

export const RATE_V0 = Object.freeze({
  start: 9519,
  order: ["w1", "w6"],
  floor: Object.freeze({ w1: 5200, w6: 300 }),
  drains: Object.freeze({ w1: 3, w6: 3 }),
  per: Object.freeze({ w1: 1850, w6: 2050 }),
  ceilingOffset: 1200,
  obRange: Object.freeze([60, 120]),
  visibleConsequenceAt: 800,
  merge: 48
});

/* dev-mode; prod build'de tree-shake edilir (boot.js import.meta.env.DEV ile korur) */
export function assertRateCurveV0(R) {
  let prev = R.start;
  for (const w of R.order) {
    if (R.floor[w] >= prev) throw new Error("taban monoton azalmiyor: " + w);
    const need = (prev - R.floor[w]) + R.ceilingOffset;
    if (R.drains[w] * R.per[w] < need) {
      throw new Error(`serit cekisi yetersiz: ${w} (${R.drains[w] * R.per[w]} < ${need})`);
    }
    prev = R.floor[w];
  }
  if (R.merge !== 48) throw new Error("bitis orani 48 degil");
}

export default { obey, drain, pickOB, RATE_V0, assertRateCurveV0 };
