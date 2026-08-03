/* ==========================================================================
 * /api/leaderboard — SÜRE MODU ortak skor tablosu (Cloudflare Worker + KV)
 * ==========================================================================
 *
 * GET  -> { ok: true, entries: [{ name, ms, balanced, at }] }
 *         KV binding kuruluysa en iyi BOARD_MAX sure, artan sirada.
 *         Binding YOKSA  -> { ok: true, entries: [], disabled: true }
 * POST -> { name, ms, balanced, splits? }
 *         { ok: true, rank, entries } | { ok: false, error }
 *
 * ==========================================================================
 * TASARIM KARARI: BINDING YOKSA SITE BOZULMAZ
 * ==========================================================================
 * KV namespace'i olusturulmadan da bu uc nokta 200 doner ve `disabled: true`
 * der; oyun bunu gorup yalnizca YEREL listeyi cizer (bkz. game/leaderboard.js).
 * Yani ozellik, altyapi kurulana kadar "kirik" degil "kapali"dir — portfolyo
 * sitesinin geri kalani hicbir sekilde etkilenmez.
 *
 * ==========================================================================
 * KISISEL VERI
 * ==========================================================================
 * Saklanan tek sey oyuncunun KENDI yazdigi takma addir. IP SAKLANMAZ; yalniz
 * ard arda gonderimi yavaslatmak icin kisa omurlu (RATE_TTL) bir sayacin
 * ANAHTARINDA, geri cevrilemeyecek bicimde hash'lenmis olarak gecer ve suresi
 * dolunca kendiliginden silinir. Cerez, oturum, parmak izi yok.
 *
 * ==========================================================================
 * DOGRULAMA SEVIYESI (bilincli olarak HAFIF)
 * ==========================================================================
 * Sure istemciden gelir, yani teknik olarak uydurulabilir. Bu liste bir
 * arkadas cevresi icin; kriptografik bir kanit zinciri kurmak (kosu jetonu,
 * imzali bolum araligi, sunucu tarafi simulasyon) buradaki degerin kat kat
 * ustunde bir is olurdu. Yapilan sey, KAZARA ya da savruk bir istegin listeyi
 * ele gecirmesini engellemek: tur/uzunluk/karakter kumesi, makul sure araligi,
 * ara surelerin artan olmasi ve IP basina kisa bir bekleme.
 * ========================================================================== */

import { MIN_RUN_MS, MAX_RUN_MS } from "../../game/speedrun.js";

export const prerender = false;

const KV_BINDING = "LEADERBOARD";
const BOARD_KEY = "board:v1";
const BOARD_MAX = 50;          /* KV'de tutulan kayit sayisi */
const NAME_MAX = 12;
const RATE_TTL = 20;           /* saniye — ayni IP'den ard arda gonderim beklemesi */

/* game/leaderboard.js'teki NAME_OK ile AYNI kume: font.js'in cizebildigi
 * harfler. Sunucu istemciye GUVENMEZ, ayni kisiti burada tekrar uygular.
 * Buyuk harfe cevirme YOK — gerekcesi icin bkz. game/leaderboard.js. */
const NAME_OK = /[A-Za-zÇĞİÖŞÜçğıöşü0-9 .-]/;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function sanitizeName(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw);
  let out = "";
  for (const ch of s) {
    if (out.length >= NAME_MAX) break;
    if (NAME_OK.test(ch)) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

function kvOf(context) {
  const env = context && context.locals && context.locals.runtime && context.locals.runtime.env;
  return (env && env[KV_BINDING]) || null;
}

async function readBoard(kv) {
  try {
    const raw = await kv.get(BOARD_KEY, "json");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && typeof e.ms === "number" && e.ms > 0 && typeof e.name === "string")
      .slice(0, BOARD_MAX);
  } catch (e) {
    return [];
  }
}

/* IP'yi SAKLAMAK icin degil, yalniz kisa omurlu bir bekleme anahtari uretmek
 * icin: FNV-1a, geri cevrilemez ve zaten TTL ile silinir. */
function ipKey(request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return "rl:" + h.toString(36);
}

/* Ara sureler ARTAN olmali (w0 <= w1 <= w6 <= ep <= toplam). Bir kosunun
 * kendi ic tutarliligi — hile yakalamaz ama bozuk/uydurma bir govdeyi eler. */
function splitsPlausible(splits, ms) {
  if (!splits || typeof splits !== "object") return true;   /* zorunlu degil */
  const order = ["w0", "w1", "w6", "ep"];
  let prev = 0;
  for (const k of order) {
    const v = splits[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== "number" || !isFinite(v) || v < 0) return false;
    const asMs = Math.round((v * 1000) / 60);
    if (asMs < prev) return false;
    prev = asMs;
  }
  return prev <= ms + 1000;
}

export async function GET(context) {
  const kv = kvOf(context);
  if (!kv) return json({ ok: true, entries: [], disabled: true });
  const entries = await readBoard(kv);
  return json({ ok: true, entries });
}

export async function POST(context) {
  const kv = kvOf(context);
  if (!kv) return json({ ok: false, error: "disabled", disabled: true }, 200);

  let body = null;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ ok: false, error: "bad-json" }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "bad-body" }, 400);

  const name = sanitizeName(body.name);
  if (!name) return json({ ok: false, error: "bad-name" }, 400);

  const ms = Math.round(Number(body.ms));
  if (!isFinite(ms) || ms < MIN_RUN_MS || ms > MAX_RUN_MS) {
    return json({ ok: false, error: "bad-time" }, 400);
  }
  if (!splitsPlausible(body.splits, ms)) return json({ ok: false, error: "bad-splits" }, 400);

  const balanced = !!body.balanced;

  /* Hafif bekleme: ayni IP RATE_TTL saniye icinde ikinci kez gonderemez.
   * Anahtar TTL ile kendiliginden silinir, kalici bir iz birakmaz. */
  const rl = ipKey(context.request);
  try {
    if (await kv.get(rl)) return json({ ok: false, error: "slow-down" }, 429);
    await kv.put(rl, "1", { expirationTtl: RATE_TTL });
  } catch (e) { /* bekleme kontrolu calismazsa gonderimi ENGELLEME */ }

  const entry = { name, ms, balanced, at: Date.now() };
  const list = await readBoard(kv);
  list.push(entry);
  list.sort((a, b) => a.ms - b.ms);
  const trimmed = list.slice(0, BOARD_MAX);
  try {
    await kv.put(BOARD_KEY, JSON.stringify(trimmed));
  } catch (e) {
    return json({ ok: false, error: "store" }, 500);
  }

  const rank = trimmed.findIndex((e) => e.at === entry.at && e.ms === entry.ms && e.name === entry.name);
  return json({ ok: true, rank: rank === -1 ? 0 : rank + 1, entries: trimmed });
}
