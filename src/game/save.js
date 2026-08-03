/* ==========================================================================
 * game/save.js — KAYIT SEMASI (v1-uyumlu, migration yok)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §8.4. Anahtar ve alan sirasi DEGISMEZ;
 * v0 -> v1 gecisi migration GEREKTIRMEZ, yalniz erisilemeyen bitler (debt,
 * world 2..5) erisilebilir hale gelir.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { KEY, defaultSave, load, write, reset, migrate,
 *            assertFinish, clampDebt, VERB_BIT, PIP_BIT } from "./save.js";
 *
 *   const { save, corrupted, readOnly } = load();
 *     corrupted : bozuk JSON bulundu, reset() edildi — cagiran toast gostersin
 *     readOnly  : save.v bilinmeyen (gelecek surum) — BU OTURUMDA yazilmaz
 *
 *   write(save) -> bool (basarili mi)
 *   reset()     -> localStorage'dan siler, taze defaultSave() doner
 *   migrate(raw)-> { save, changed } — v0'da yalniz v===1 gecerli, kimlik donusumu
 *   assertFinish(save) -> save.finished && save.ratio !== 48 ise throw
 *   clampDebt(save)     -> save.debt'i 0..3 araligina kirpar (v0'da hep 0)
 * ========================================================================== */

export const KEY = "sk.override.v1";
export const CURRENT_VERSION = 1;

/* Bit sirasi kitaptan aynen (§7.1, §7.3). v0'da yalniz alt bitler dolar. */
export const VERB_BIT = Object.freeze({ REWRITE: 0, SHELL: 1 });
export const PIP_BIT = Object.freeze({ REWRITE: 0, SHELL: 1, TRAIL: 6 });

export function defaultSave() {
  return {
    v: CURRENT_VERSION,
    ts: 0,
    world: 0,
    checkpoint: 0,
    checkpointX: 0,
    checkpointY: 0,
    finished: false,
    ratio: 9519,
    verbs: 0,
    pips: 0,
    debt: 0,
    residents: 0,
    residentsMax: 20000,
    commits: 0,
    commitsSelf: 0,
    bestMs: 0,
    seen: {},
    settings: { audio: 0, touch: "auto", balanced: 0, scale: 0 }
  };
}

function hasLocalStorage() {
  try { return typeof localStorage !== "undefined"; } catch (e) { return false; }
}

export function clampDebt(save) {
  if (save.debt < 0) save.debt = 0;
  else if (save.debt > 3) save.debt = 3;
  return save;
}

/* v0'da tek gecerli surum 1'dir; ileri surum gorulurse SALT-OKUNUR isaretlenir
 * (bu oturumda uzerine yazilmaz — daha yeni verinin kaybini onler). */
export function migrate(raw) {
  if (raw && raw.v === CURRENT_VERSION) return { save: raw, changed: false, readOnly: false };
  if (raw && typeof raw.v === "number" && raw.v > CURRENT_VERSION) {
    return { save: raw, changed: false, readOnly: true };
  }
  return { save: defaultSave(), changed: true, readOnly: false };
}

export function load() {
  if (!hasLocalStorage()) return { save: defaultSave(), corrupted: false, readOnly: false };
  let raw = null;
  let corrupted = false;
  try {
    const text = localStorage.getItem(KEY);
    if (text) raw = JSON.parse(text);
  } catch (e) {
    corrupted = true;
  }
  if (raw && typeof raw !== "object") { raw = null; corrupted = true; }

  const { save, readOnly } = migrate(raw);
  clampDebt(save);
  if (corrupted) reset();
  return { save, corrupted, readOnly };
}

export function write(save) {
  if (!hasLocalStorage()) return false;
  try {
    save.ts = Date.now();
    clampDebt(save);
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    return false;
  }
}

export function reset() {
  if (!hasLocalStorage()) return defaultSave();
  try { localStorage.removeItem(KEY); } catch (e) {}
  return defaultSave();
}

export function assertFinish(save) {
  if (save.finished && save.ratio !== 48) {
    throw new Error("assertFinish: finished=true ama ratio !== 48 (" + save.ratio + ")");
  }
}

export default { KEY, defaultSave, load, write, reset, migrate, assertFinish, clampDebt, VERB_BIT, PIP_BIT };
