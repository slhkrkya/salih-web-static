/* ==========================================================================
 * game/leaderboard.js — SKOR TABLOSU (yerel + ortak liste)
 * ==========================================================================
 *
 * IKI KATMAN, BAGIMSIZ CALISIR:
 *
 *   YEREL  : localStorage. Sunucu olmasa da, internet olmasa da HER ZAMAN
 *            calisir. Kendi rekorunu burada gorursun.
 *   ORTAK  : /api/leaderboard (Cloudflare Worker + KV). Arkadas cevresinin
 *            ortak listesi.
 *
 * Bu ayrim bilincli: ortak liste bir EK'tir, bagimlilik degil. KV binding'i
 * kurulmamissa, endpoint kapaliysa ya da ag yoksa oyun HICBIR sekilde
 * bozulmaz — ekran yerel listeyi gosterir ve durumu tek satirda soyler.
 * (Ayni disiplin oyunun kendi kayit sisteminde de var: localStorage yoksa
 * save.js sessizce bellekte devam eder.)
 *
 * KISISEL VERI: yalnizca oyuncunun KENDI yazdigi takma ad tutulur. IP, cerez,
 * parmak izi yok; sunucu tarafi da IP'yi saklamaz (bkz. api/leaderboard.js).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createLeaderboard, sanitizeName, NAME_MAX } from "./leaderboard.js";
 *
 *   const board = createLeaderboard();
 *   board.localList()            -> [{name, ms, balanced, at}] artan sirada
 *   board.localAdd(entry)        -> sira (1 tabanli) | -1
 *   board.bestMs()               -> en iyi yerel sure | 0
 *   board.load()                 -> ortak listeyi getirir (idempotent, async)
 *   board.submit(entry)          -> ortak listeye gonderir (async)
 *   board.globalList / .status / .note
 *     status: "idle" | "loading" | "ok" | "off" | "error"
 * ========================================================================== */

const BOARD_KEY = "sk.override.board.v1";
const API = "/api/leaderboard";
const LOCAL_MAX = 20;
const TIMEOUT_MS = 6000;

export const NAME_MAX = 12;
/* font.js'in gercekten cizebildigi kume (bkz. GLYPHS): iki kasa harf + Turkce
 * harfler + rakam + bosluk + nokta/tire. Ekranda "?" gorunen bir isim kimsenin
 * isine yaramaz, bu yuzden kisit CIZIM kumesinden turetilir.
 *
 * BUYUK HARFE CEVIRMIYORUZ (test bunu yakaladi): `toLocaleUpperCase("tr-TR")`
 * Ingilizce bir "mike"i "MİKE" yapiyordu, locale'siz `toUpperCase()` ise
 * "işıl"i "IŞIL" yapardi. Iki dilli bir oyunda hangi kurali secersek digerinin
 * ismini bozuyoruz — ve font zaten KUCUK harfleri de cizebildigi icin secmek
 * gereksiz. Oyuncu adini nasil yazdiysa oyle gorunur. */
const NAME_OK = /[A-Za-zÇĞİÖŞÜçğıöşü0-9 .-]/;

export function sanitizeName(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw);
  let out = "";
  for (const ch of s) {
    if (out.length >= NAME_MAX) break;
    if (NAME_OK.test(ch)) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

function hasLocalStorage() {
  try { return typeof localStorage !== "undefined"; } catch (e) { return false; }
}

function readLocal() {
  if (!hasLocalStorage()) return [];
  try {
    const text = localStorage.getItem(BOARD_KEY);
    if (!text) return [];
    const raw = JSON.parse(text);
    if (!Array.isArray(raw)) return [];
    return raw.filter((e) => e && typeof e.ms === "number" && e.ms > 0)
      .map((e) => ({
        name: sanitizeName(e.name) || "?",
        ms: Math.round(e.ms),
        balanced: !!e.balanced,
        at: typeof e.at === "number" ? e.at : 0
      }))
      .sort((a, b) => a.ms - b.ms)
      .slice(0, LOCAL_MAX);
  } catch (e) {
    return [];
  }
}

function writeLocal(list) {
  if (!hasLocalStorage()) return false;
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

/* Sunucu yanitlarina ASLA guvenmeden ciz: uzunluk, tur ve karakter kumesi
 * burada da uygulanir. Ortak liste baska insanlarin yazdigi metin tasir. */
function normalizeEntries(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const e of raw) {
    if (!e || typeof e.ms !== "number" || !(e.ms > 0)) continue;
    const name = sanitizeName(e.name);
    if (!name) continue;
    out.push({ name, ms: Math.round(e.ms), balanced: !!e.balanced, at: typeof e.at === "number" ? e.at : 0 });
    if (out.length >= 50) break;
  }
  out.sort((a, b) => a.ms - b.ms);
  return out;
}

function withTimeout(promise, ms, controller) {
  let timer = null;
  const guard = new Promise((resolve) => {
    timer = setTimeout(() => {
      if (controller) { try { controller.abort(); } catch (e) {} }
      resolve({ __timeout: true });
    }, ms);
  });
  return Promise.race([promise, guard]).then((v) => {
    if (timer) clearTimeout(timer);
    return v;
  });
}

export function createLeaderboard(opts) {
  const o = opts || {};
  const api = o.api || API;
  const fetchImpl = o.fetch || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

  let globalList = [];
  let status = "idle";     /* idle | loading | ok | off | error */
  let note = "";
  let inflight = false;

  function localList() { return readLocal(); }

  function bestMs() {
    const list = readLocal();
    return list.length ? list[0].ms : 0;
  }

  function localAdd(entry) {
    const clean = {
      name: sanitizeName(entry && entry.name) || "?",
      ms: Math.round((entry && entry.ms) || 0),
      balanced: !!(entry && entry.balanced),
      at: (entry && entry.at) || 0
    };
    if (!(clean.ms > 0)) return -1;
    const list = readLocal();
    list.push(clean);
    list.sort((a, b) => a.ms - b.ms);
    const trimmed = list.slice(0, LOCAL_MAX);
    writeLocal(trimmed);
    const rank = trimmed.findIndex((e) => e.ms === clean.ms && e.name === clean.name && e.at === clean.at);
    return rank === -1 ? -1 : rank + 1;
  }

  async function load() {
    if (!fetchImpl || inflight) return status;
    inflight = true;
    status = "loading";
    note = "";
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    try {
      const res = await withTimeout(
        fetchImpl(api, { method: "GET", headers: { accept: "application/json" }, signal: controller ? controller.signal : undefined }),
        TIMEOUT_MS, controller);
      if (res && res.__timeout) { status = "error"; note = "timeout"; return status; }
      if (!res || !res.ok) { status = "error"; note = res ? "http " + res.status : "no-response"; return status; }
      const data = await res.json();
      if (data && data.disabled) { status = "off"; globalList = []; return status; }
      /* SOZLESMEYE UYMAYAN YANIT = HATA, bos liste DEGIL (test yakaladi).
       * Statik bir sunucu ya da araya giren bir vekil 200 ile alakasiz bir
       * govde dondurebilir; bunu "ok" sayarsak ekran "Henüz kimse bitirmedi."
       * der ve oyuncu listenin gercekten bos oldugunu sanir. Sessiz yanlis
       * bilgi vermektense "ulasilamadi" demek dogru. */
      if (!data || data.ok !== true || !Array.isArray(data.entries)) {
        status = "error"; note = "bad-shape"; globalList = [];
        return status;
      }
      globalList = normalizeEntries(data.entries);
      status = "ok";
    } catch (e) {
      status = "error";
      note = "network";
    } finally {
      inflight = false;
    }
    return status;
  }

  /* Gonderim BASARISIZ OLSA DA kosu kaybolmaz: yerel listeye her halukarda
   * yazilir (cagiran once localAdd'i cagirir). Buranin dondurdugu sey yalnizca
   * "ortak listeye islendi mi" sorusunun cevabidir. */
  async function submit(entry) {
    if (!fetchImpl) return { ok: false, reason: "off" };
    const body = {
      name: sanitizeName(entry && entry.name),
      ms: Math.round((entry && entry.ms) || 0),
      balanced: !!(entry && entry.balanced),
      splits: (entry && entry.splits) || null
    };
    if (!body.name || !(body.ms > 0)) return { ok: false, reason: "invalid" };
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    try {
      const res = await withTimeout(
        fetchImpl(api, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller ? controller.signal : undefined
        }), TIMEOUT_MS, controller);
      if (res && res.__timeout) return { ok: false, reason: "timeout" };
      if (!res) return { ok: false, reason: "no-response" };
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) {
        return { ok: false, reason: (data && data.error) || ("http " + res.status) };
      }
      if (data.entries) { globalList = normalizeEntries(data.entries); status = "ok"; }
      return { ok: true, rank: data.rank || 0 };
    } catch (e) {
      return { ok: false, reason: "network" };
    }
  }

  return {
    localList, localAdd, bestMs, load, submit,
    get globalList() { return globalList; },
    get status() { return status; },
    get note() { return note; }
  };
}

export default createLeaderboard;
