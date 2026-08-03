/* ==========================================================================
 * game/creaturesprites.js — DUSMAN + BOSS EL-PIKSEL SPRITE'LARI
 * ==========================================================================
 *
 * Faz 3 (plan): Salih'in sprites.js'teki teknigi (palet-indeksli PIX satiri
 * -> pixart.js ile maske -> atlas) burada 4 dusman turu + 2 boss icin
 * tekrarlanir. Sadece cizim degisir — enemies.js/bosses.js'teki hitbox,
 * durum makinesi ve kare sayilari BIREBIR ayni kalir.
 *
 * Her yaratik icin TEK bir silüet SABLONU vardir (buyuk harf = yer tutucu);
 * pozlar ayni sablonu farkli renklerle "boyayarak" turetilir (paint()), ki
 * poz gecisleri sekli DEGISTIRMESIN, sadece rengini.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createCreatureSprites } from "./creaturesprites.js";
 *
 *   const cs = createCreatureSprites(palette);
 *   cs.setPalette(next)                              // tema degisimi
 *   cs.draw(ctx, key, poseIndex, x, y, facing)        // x,y = SOL-UST kose
 *   cs.SIZE[key]  -> [w, h]
 *   cs.POSE.<KEY> -> poz sabitleri (asagida)
 *   cs.destroy()
 * ========================================================================== */

import { compilePix, bakeAtlas } from "./pixart.js";

function paint(rows, map) {
  return rows.map((row) => row.replace(/[A-Z]/g, (ch) => (map[ch] !== undefined ? map[ch] : ".")));
}

function buildFrames(tpl, fills) {
  const frames = {};
  for (let i = 0; i < fills.length; i++) frames[i] = paint(tpl, fills[i]);
  return frames;
}

/* -------------------------------------------------------- TALİMAT / INSTRUCTION */
const INS_W = 12, INS_H = 12;
export const INS_POSE = Object.freeze({ IDLE: 0, TELEGRAPH: 1, STUNNED: 2 });
const INS_TPL = [
  "............",
  "..BBBBBBBB..",
  ".BBBBBBBBBB.",
  ".BBWWWWWWBB.",
  ".BBWWWWWWBB.",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  "..BBBBBBB...",
  "...BBBBB....",
  "....BBB....."
];
const INS_FILLS = [
  { B: "6", W: "4" },   /* idle: SECONDARY govde, INK_SOFT okuma penceresi */
  { B: "5", W: "b" },   /* telegraph: ACCENT govde, LIGHT parlayan pencere */
  { B: "4", W: "4" }    /* stunned: INK_SOFT, sonmus */
];

/* -------------------------------------------------------- BORU AĞZI / PIPE_MOUTH */
const PIPE_W = 14, PIPE_H = 20;
export const PIPE_POSE = Object.freeze({ IDLE: 0, EMIT: 1, STUNNED: 2 });
const PIPE_TPL = [
  "..............",
  "..............",
  "....BBBBBB....",
  "...BBBBBBBB...",
  "..BBBBBBBBBB..",
  "..BBBBBBBBBB..",
  "..BBBBBBBBBB..",
  "..BBBBBBBBBBM.",
  "..BBBBBBBBBBM.",
  "..BBBBBBBBBBM.",
  "..BBBBBBBBBBM.",
  "..BBBBBBBBBB..",
  "..BBBBBBBBBB..",
  "..BBBBBBBBBB..",
  "...BBBBBBBB...",
  "....BBBBBB....",
  "..............",
  "..............",
  "..............",
  ".............."
];
const PIPE_FILLS = [
  { B: "d", M: "d" },   /* idle: TILE_EDGE (asil koddaki idle rengiyle ayni) */
  { B: "e", M: "b" },   /* emit/telegraph: HAZARD govde, agiz ucu parliyor */
  { B: "4", M: "4" }    /* stunned: INK_SOFT */
];

/* -------------------------------------------------------------------- DÜĞÜM / NODE */
const NODE_W = 20, NODE_H = 20;
export const NODE_POSE = Object.freeze({ IDLE: 0, TELEGRAPH: 1, PULSE: 2, STUNNED: 3 });
const NODE_TPL = [
  "....BBBBBBBBBBBB....",
  "..BBBBBBBBBBBBBBBB..",
  ".BBBBBBBBBBBBBBBBBB.",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBEEEEEEEEBBBBBBB",
  "BBBBBEEEEEEEEBBBBBBB",
  "BBBBBEEEEEEEEBBBBBBB",
  "BBBBBEEEEEEEEBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBB",
  ".BBBBBBBBBBBBBBBBBB.",
  "..BBBBBBBBBBBBBBBB..",
  "....BBBBBBBBBBBB....",
  "......BBBBBBBB......"
];
const NODE_FILLS = [
  { B: "6", E: "4" },   /* idle: SECONDARY, goz kapali/donuk */
  { B: "5", E: "b" },   /* telegraph: ACCENT, goz aciliyor */
  { B: "e", E: "e" },   /* pulse/hazard: tamamen HAZARD */
  /* bulunan gercek eksik: DUGUM ve ZIL'in SUSTURULMUS pozu HIC YOKTU —
   * TALIMAT/BORU AGZI'nda vardi. Yani GİZLEN'i dort dusmanin IKISINDE
   * kullandiginda ekranda hicbir sey degismiyordu; oyuncu yetenegin ise
   * yarayip yaramadigini anlayamiyordu. INS/PIPE ile AYNI dil: INK_SOFT,
   * sonmus goz. */
  { B: "4", E: "4" }    /* stunned: INK_SOFT, tamamen sonmus */
];

/* --------------------------------------------------------------------------- ZİL / BELL */
const BELL_W = 6, BELL_H = 6;
export const BELL_POSE = Object.freeze({ IDLE: 0, RING: 1, STUNNED: 2 });
const BELL_TPL = [
  "..BB..",
  ".BBBB.",
  ".BBBB.",
  "BBBBBB",
  "..CC..",
  "..CC.."
];
const BELL_FILLS = [
  { B: "6", C: "4" },   /* idle */
  { B: "e", C: "b" },   /* ring/hazard (yagmur) */
  { B: "4", C: "4" }    /* stunned: INK_SOFT (bkz. NODE_FILLS notu) */
];

/* -------------------------------------------------------------------------- TOKEN */
const TOKEN_W = 6, TOKEN_H = 6;
export const TOKEN_POSE = Object.freeze({ DEFAULT: 0 });
const TOKEN_TPL = [
  "......",
  "B.....",
  "BBB...",
  "BBBBB.",
  "BBB...",
  "B....."
];
const TOKEN_FILLS = [
  { B: "e" }
];

/* -------------------------------------------------------------------------- MERMİ
 * Oyuncunun ATEŞ ET (J) ile firlattigi mermi. Dusman mermilerinden (KIVILCIM)
 * RENKLE ayrilir — ekranda ayni anda ikisi de ucabildigi icin, "hangisi bana
 * zarar verir" sorusu bir bakista cevaplanabilir olmali: mermi LED/parlak,
 * KIVILCIM tehlike rengi. */
const BOLT_W = 8, BOLT_H = 6;
export const BOLT_POSE = Object.freeze({ DEFAULT: 0 });
const BOLT_TPL = [
  "........",
  "..BBBB..",
  ".BCCCCB.",
  ".BCCCCB.",
  "..BBBB..",
  "........"
];
const BOLT_FILLS = [
  { B: "7", C: "b" }
];

/* -------------------------------------------------------------------------- KIVILCIM
 * Patronun attigi mermi (gokten yagan ya da yatay salvo). Oyuncunun mermisiyle
 * ayni boyutta DEGIL ve tehlike renginde — ayrica havada vurulup dusurulebilir. */
const SHARD_W = 6, SHARD_H = 6;
export const SHARD_POSE = Object.freeze({ DEFAULT: 0 });
const SHARD_TPL = [
  "..BB..",
  ".BCCB.",
  "BCCCCB",
  "BCCCCB",
  ".BCCB.",
  "..BB.."
];
const SHARD_FILLS = [
  { B: "e", C: "b" }
];

/* -------------------------------------------------------------------------- AVCI
 * Koni/radar kilitlendiginde dogan hayalet. Duvarlardan gecer, oyuncuyu
 * kovalar, temasta GERI AL. Iki poz: normal ve VURULDU (mermi yiyince kisa
 * parlama) — canini goremeyen oyuncu "vurdum mu" sorusunu boyle cevaplar. */
const HUNTER_W = 16, HUNTER_H = 16;
export const HUNTER_POSE = Object.freeze({ IDLE: 0, HIT: 1 });
const HUNTER_TPL = [
  "................",
  ".....BBBBBB.....",
  "...BBBBBBBBBB...",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBEEBBBBEEBB..",
  "..BBEEBBBBEEBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BB.BBB.BBB.B..",
  "..B...B...B...B.",
  "................"
];
const HUNTER_FILLS = [
  { B: "a", E: "e" },   /* normal: SHADOW govde, HAZARD gozler */
  { B: "b", E: "e" }    /* vuruldu: LIGHT parlama */
];

/* --------------------------------------------------------------- KOKLAYICI / SNIFFER */
const SNIFFER_W = 28, SNIFFER_H = 28;
export const SNIFFER_POSE = Object.freeze({ IDLE: 0, STAGGERED: 1 });
const SNIFFER_TPL = [
  "............................",
  "............................",
  "........BBBBBBBBBBBB........",
  "........BBBBBBBBBBBB........",
  "........BBBBBBBBBBBB........",
  "........BBBEEEEEEBBB........",
  "........BBBEEEEEEBBB........",
  "........BBBEEEEEEBBB........",
  "........BBBEEEEEEBBB........",
  "........BBBBBBBBBBBB........",
  "........BBBBBBBBBBBB........",
  "........BBBBBBBBBBBB........",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBBBBBB..."
];
const SNIFFER_FILLS = [
  { B: "5", E: "4" },   /* idle: ACCENT govde (asil kod rengiyle ayni), lens kapali */
  { B: "7", E: "b" }    /* staggered/exposed: LED govde, lens ardina kadar acik */
];

/* --------------------------------------------------------------- YOKSAY / OVERRIDE */
const OVERRIDE_W = 24, OVERRIDE_H = 32;
export const OVERRIDE_POSE = Object.freeze({ IDLE: 0, TELEGRAPH: 1, WINDOW: 2 });
const OVERRIDE_TPL = [
  "........BBBBBBBB........",
  "........BBBBBBBB........",
  "........BBBBBBBB........",
  "........BBBBBBBB........",
  ".....BBBBBBBBBBBBBB.....",
  ".....BBBBBBBBBBBBBB.....",
  ".....BBBBBBBBBBBBBB.....",
  ".....BBBBBBBBBBBBBB.....",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBEEEEEEBBBBBB...",
  "...BBBBBBEEEEEEBBBBBB...",
  "...BBBBBBEEEEEEBBBBBB...",
  "...BBBBBBEEEEEEBBBBBB...",
  "...BBBBBBEEEEEEBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB...",
  "...BBBBBBBBBBBBBBBBBB..."
];
const OVERRIDE_FILLS = [
  { B: "6", E: "4" },   /* idle: SECONDARY (asil kod rengi), cekirdek sonmus */
  { B: "6", E: "5" },   /* telegraph: govde ayni, cekirdek ACCENT ile uyanmaya basliyor */
  { B: "7", E: "b" }    /* window: LED govde (asil kod rengi), cekirdek tam parlak */
];

/* ------------------------------------------------------------------ AYNA / MIRROR
 * SON SINAV patronu. Silueti bilincli olarak IKI YARIYA bolunmustur (ortada
 * bos bir dikey dikis) ve govdede iki cekirdek tasir: "senin bir kopyan"
 * fikri sekilden okunsun, isim okunmadan da anlasilsin. Dort poz: bekleme /
 * telegraf / ates / vuruldu — YOKSAY'da vurulma pozu YOKTU ve 36 canli bir
 * dovuste "isabet ettim mi" sorusu yalniz can cubugundan cevaplaniyordu. */
const MIRROR_W = 24, MIRROR_H = 32;
export const MIRROR_POSE = Object.freeze({ IDLE: 0, TELEGRAPH: 1, WINDOW: 2, HIT: 3 });
const MIRROR_TPL = [
  "........BBBBBBBB........",
  ".......BBBBBBBBBB.......",
  "......BBBBBBBBBBBB......",
  "......BBB.EEEE.BBB......",
  "......BBB.EEEE.BBB......",
  "......BBBBBBBBBBBB......",
  ".......BBBBBBBBBB.......",
  "........BBB..BBB........",
  ".....BBBBBB..BBBBBB.....",
  "....BBBBBBB..BBBBBBB....",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBEEEB..BEEEBBBB...",
  "...BBBBEEEB..BEEEBBBB...",
  "...BBBBEEEB..BEEEBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "...BBBBBBBB..BBBBBBBB...",
  "....BBBBBBB..BBBBBBB....",
  "....BBBBBBB..BBBBBBB....",
  "....BBBBBB....BBBBBB....",
  "....BBBBB......BBBBB....",
  "....BBBB........BBBB....",
  "....BBBB........BBBB....",
  "....BBBB........BBBB....",
  "....BBB..........BBB....",
  "...BBBB..........BBBB...",
  "...BBBB..........BBBB..."
];
const MIRROR_FILLS = [
  { B: "6", E: "4" },   /* idle: SECONDARY govde, cekirdekler sonuk */
  { B: "5", E: "b" },   /* telegraph: ACCENT, cekirdekler yaniyor */
  { B: "e", E: "b" },   /* ates: tamamen HAZARD */
  { B: "7", E: "b" }    /* vuruldu: LED parlamasi */
];

const CREATURES = {
  instruction: { w: INS_W, h: INS_H, tpl: INS_TPL, fills: INS_FILLS },
  pipeMouth: { w: PIPE_W, h: PIPE_H, tpl: PIPE_TPL, fills: PIPE_FILLS },
  node: { w: NODE_W, h: NODE_H, tpl: NODE_TPL, fills: NODE_FILLS },
  bell: { w: BELL_W, h: BELL_H, tpl: BELL_TPL, fills: BELL_FILLS },
  token: { w: TOKEN_W, h: TOKEN_H, tpl: TOKEN_TPL, fills: TOKEN_FILLS },
  bolt: { w: BOLT_W, h: BOLT_H, tpl: BOLT_TPL, fills: BOLT_FILLS },
  shard: { w: SHARD_W, h: SHARD_H, tpl: SHARD_TPL, fills: SHARD_FILLS },
  hunter: { w: HUNTER_W, h: HUNTER_H, tpl: HUNTER_TPL, fills: HUNTER_FILLS },
  sniffer: { w: SNIFFER_W, h: SNIFFER_H, tpl: SNIFFER_TPL, fills: SNIFFER_FILLS },
  override: { w: OVERRIDE_W, h: OVERRIDE_H, tpl: OVERRIDE_TPL, fills: OVERRIDE_FILLS },
  mirror: { w: MIRROR_W, h: MIRROR_H, tpl: MIRROR_TPL, fills: MIRROR_FILLS }
};

/* Maskeler tema-bagimsiz: modul yuklenirken BIR KEZ derlenir. */
const MASKS = {};
for (const key in CREATURES) {
  const c = CREATURES[key];
  MASKS[key] = compilePix(buildFrames(c.tpl, c.fills), c.fills.length, c.w, c.h);
}

export function createCreatureSprites(palette) {
  let pal = palette;
  let atlases = null;
  let dead = false;

  function bakeAll() {
    const out = {};
    for (const key in CREATURES) {
      const c = CREATURES[key];
      out[key] = bakeAtlas(MASKS[key], c.fills.length, c.w, c.h, pal);
    }
    return out;
  }

  atlases = bakeAll();

  function setPalette(next) {
    if (!next || dead) return;
    pal = next;
    for (const key in atlases) { const cv = atlases[key]; cv.width = 1; cv.height = 1; }
    atlases = bakeAll();
  }

  /* x,y = SOL-UST kose (cagiran hizalamayi kendi yapar — Salih'teki OFF_X/OFF_Y
   * gibi bir hitbox-ofset sozlesmesi burada YOK, cunku bu varliklarin cizimi
   * zaten merkez-tabanli hesaplaniyordu; cagiran sx-w/2 mantigini korur). */
  function draw(ctx, key, pose, x, y, facing) {
    if (dead) return;
    const cv = atlases[key];
    const c = CREATURES[key];
    if (!cv || !c) return;
    const sx = (pose | 0) * c.w;
    if (facing < 0) {
      ctx.save();
      ctx.translate(Math.round(x) + c.w, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(cv, sx, 0, c.w, c.h, 0, 0, c.w, c.h);
      ctx.restore();
    } else {
      ctx.drawImage(cv, sx, 0, c.w, c.h, Math.round(x), Math.round(y), c.w, c.h);
    }
  }

  function destroy() {
    dead = true;
    for (const key in atlases) { const cv = atlases[key]; cv.width = 1; cv.height = 1; }
  }

  const SIZE = {};
  for (const key in CREATURES) SIZE[key] = [CREATURES[key].w, CREATURES[key].h];

  return {
    draw, setPalette, destroy, SIZE,
    POSE: {
      INSTRUCTION: INS_POSE, PIPE_MOUTH: PIPE_POSE, NODE: NODE_POSE,
      BELL: BELL_POSE, TOKEN: TOKEN_POSE, SNIFFER: SNIFFER_POSE, OVERRIDE: OVERRIDE_POSE,
      BOLT: BOLT_POSE, SHARD: SHARD_POSE, HUNTER: HUNTER_POSE, MIRROR: MIRROR_POSE
    }
  };
}

export default createCreatureSprites;
