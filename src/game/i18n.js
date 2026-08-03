/* ==========================================================================
 * game/i18n.js — GAME_TEXT erisimi + assertGameText (v0: 55 prose satiri)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-metinleri.md §15.17-§15.18, docs/oyun-v0-kapsam.md §6.5/
 * §8.5. Metinler `content` objesine GIRMEZ (o senkron parse edilir, oyun
 * monitore tiklanmadan hic inmez) — ayri GAME_TEXT modulu, site `lang`
 * durumunu `bridge.getLang()` ile okur.
 *
 * v0 FARKI (kitaptan): kural 2 `n !== 84` degil `n !== 55` olur (§12-5,
 * kesilen bloklar + `lies`'in artik sayilmasi). Diger 6 kural AYNEN.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createI18n, assertGameText, PROSE_TARGET_V0 } from "./i18n.js";
 *
 *   const i18n = createI18n(bridge);   // bridge: window.HeroBridge (getLang okur)
 *   i18n.t("menu.m2")                  -> aktif dilde string ("Hedef: ...")
 *   i18n.lex("verb.rewrite")           -> LEXICON girisi
 *   i18n.setLang(next)                 -> HeroBridge'den bagimsiz da cagrilabilir
 *   i18n.data                          -> aktif dilin TAM GAME_TEXT objesi
 *
 *   assertGameText(tr, en) -> dev-mode; ihlalde throw. Prod'da boot.js
 *   `import.meta.env.DEV` ile bu cagriyi tree-shake eder.
 * ========================================================================== */

import TR from "./text/tr.js";
import EN from "./text/en.js";

export const PROSE_TARGET_V0 = 55;

function flatten(obj, prefix, out) {
  out = out || {};
  prefix = prefix || "";
  for (const k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = obj[k];
    const path = prefix ? prefix + "." + k : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const ip = path + "[" + i + "]";
        if (v[i] !== null && typeof v[i] === "object") flatten(v[i], ip, out);
        else if (typeof v[i] === "string") out[ip] = v[i];
      }
    } else if (typeof v === "object") {
      flatten(v, path, out);
    } else if (typeof v === "string") {
      out[path] = v;
    }
  }
  return out;
}

/* v0 prose butcesi: EXPLICIT blok toplami (heuristik kelime sayimi degil —
 * "kaç kelime" tahmini kirilgandir, budget'in kendi yapisindan saymak
 * saglamdir). §6.5 tablosundaki blok/sayi birebir. */
function countProse(t) {
  let n = 0;
  n += Object.keys(t.menu).length;                                   /* 12 */
  n += t.hints.length;                                                /* 5 */
  n += t.worlds.length;                                                /* 4 sub */
  n += t.worlds.filter((w) => w.teaser).length + (t.midTeaser ? 1 : 0); /* 4 teaser */
  for (const key in t.scenes) n += t.scenes[key].length;               /* 7 */
  for (const key in t.bosses) if (t.bosses[key].line) n++;             /* 2 */
  n += t.revert.length;                                                /* 3 */
  n += Object.keys(t.verbHints).length;                                /* 2 */
  n += t.pips.filter((p) => p.seal).length;                            /* 3 */
  n += t.final.length;                                                 /* 4 */
  n += Object.keys(t.a11y).length;                                     /* 2 */
  n += Object.keys(t.gate).length;                                     /* 2 */
  n += t.lies.length;                                                  /* 5 */
  return n;
}

const SLOT_CAP = [
  { test: (p) => /^scenes\./.test(p), cap: 44 },
  { test: (p) => /^worlds\[\d+\]\.(sub)$/.test(p) || p === "midTeaser" || /^worlds\[\d+\]\.teaser$/.test(p), cap: 52 },
  { test: (p) => /^(hints\[\d+\]|verbHints\.)/.test(p), cap: 38 },
  { test: (p) => /^bosses\..*\.line$/.test(p), cap: 46 },
  { test: (p) => /^revert\[/.test(p), cap: 26 },
  { test: (p) => /^pips\[\d+\]\.seal$/.test(p), cap: 40 },
  { test: (p) => /^final\[/.test(p), cap: 48 },
  { test: (p) => /^(menu\.|a11y\.|gate\.)/.test(p), cap: 46 }
];
function capFor(path) {
  for (const rule of SLOT_CAP) if (rule.test(path)) return rule.cap;
  return null;
}

/* Unicode-farkinda sinir: JS'in ASCII-only \b'si Turkce harfleri (ş,ı,ö,ü,ğ,ç)
 * "kelime karakteri" saymaz, bu yuzden \bmay\b gibi bir desen "Koşmayı"
 * icindeki "may" alt dizisiyle YANLIS eslesir (ş/ı non-word sayildigi icin
 * sinir orada da olusur). \p{L}/\p{N} tabanli lookaround bunu onler. */
const BANNED = /(?<![\p{L}\p{N}])(20\d\d|Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık|January|February|March|April|May|June|July|August|September|October|November|December|ARCA|YODER|Planora|TNC|SCA|Gazi|AYS|RandevuCore|Lunara|WeTrackX|Salih|Karakaya|benim|yaptım|kurdum|I built|I made|my)(?![\p{L}\p{N}])/iu;
const DECIMAL = /\d+[.,]\d+/;
const WHO_SET = new Set(["S", "Y", "R", "N"]);

export function assertGameText(tr, en) {
  const flatTr = flatten(tr);
  const flatEn = flatten(en);
  const keysTr = Object.keys(flatTr).sort().join("|");
  const keysEn = Object.keys(flatEn).sort().join("|");
  if (keysTr !== keysEn) throw new Error("GAME_TEXT: anahtar kumeleri esit degil (tr!=en)");

  for (const [lang, t] of [["tr", tr], ["en", en]]) {
    const n = countProse(t);
    if (n !== PROSE_TARGET_V0) throw new Error(`GAME_TEXT[${lang}]: prose ${n}, ${PROSE_TARGET_V0} olmali`);
  }

  const all = Object.assign({}, ...Object.keys(flatTr).map((k) => ({ ["tr:" + k]: flatTr[k] })),
                                  ...Object.keys(flatEn).map((k) => ({ ["en:" + k]: flatEn[k] })));
  for (const key in all) {
    const s = all[key];
    const path = key.slice(3);
    if (s.length > 60) throw new Error(`GAME_TEXT ${key}: ${s.length} > 60`);
    const cap = capFor(path);
    if (cap && s.length > cap) throw new Error(`GAME_TEXT ${key}: ${s.length} > slot ${cap}`);
    if (BANNED.test(s)) throw new Error(`GAME_TEXT ${key}: yasak ifade — "${s}"`);
    /* Ondalik istisnasi: menu.m2 + lexicon.f1seal — metnin kendisinin ustunde
     * belirttigi "ondalik ucuncu anlati ani" f1seal'dir (§15.13); kitabin kod
     * ornegi bunu atlamis, duzeltildi (ayni v0 belgesinin §12 yontemiyle). */
    if (DECIMAL.test(s) && path !== "menu.m2" && path !== "lexicon.f1seal") {
      throw new Error(`GAME_TEXT ${key}: ondalik yalniz menu.m2 ve lexicon.f1seal'de — "${s}"`);
    }
  }

  tr.lies.forEach((l, i) => {
    if (l === en.lies[i]) throw new Error(`GAME_TEXT lies[${i}]: TR ve EN ayni, dil basina ayri yazilmali`);
  });

  for (const sceneKey in tr.scenes) {
    for (const beat of tr.scenes[sceneKey]) {
      if (beat.who && !WHO_SET.has(beat.who)) {
        throw new Error(`GAME_TEXT scenes.${sceneKey}: bilinmeyen konusan "${beat.who}"`);
      }
    }
  }
}

export function createI18n(bridge) {
  let lang = (bridge && typeof bridge.getLang === "function" && bridge.getLang() === "en") ? "en" : "tr";

  function data() { return lang === "en" ? EN : TR; }

  function get(path) {
    const parts = path.split(".");
    let cur = data();
    for (let i = 0; i < parts.length; i++) {
      if (cur == null) return "";
      cur = cur[parts[i]];
    }
    return cur == null ? "" : cur;
  }

  function setLang(next) { lang = next === "en" ? "en" : "tr"; }

  return {
    t: get,
    lex: (path) => get("lexicon." + path),
    setLang,
    get lang() { return lang; },
    get data() { return data(); }
  };
}

export default { createI18n, assertGameText, PROSE_TARGET_V0 };
